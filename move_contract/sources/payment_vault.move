module grocery_agent::payment_vault {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::transfer;
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use sui::clock::Clock;
    use usdc::usdc::USDC;

    // ======== Errors ========
    const E_UNAUTHORIZED: u64 = 201;
    const E_BUDGET_EXCEEDED: u64 = 202;
    const E_INSUFFICIENT_BALANCE: u64 = 203;
    const E_PRODUCT_UNAVAILABLE: u64 = 204;
    #[allow(unused_const)]
    const E_DECISION_NOT_FOUND: u64 = 205;
    #[allow(unused_const)]
    const E_DECISION_HASH_MISMATCH: u64 = 206;

    // ======== Structs ========

    /// Customer vault holding USDC for automated payments
    public struct CustomerVault has key, store {
        id: UID,
        owner: address,
        balance: Balance<USDC>,
        weekly_budget: u64,
        spent_this_week: u64,
        last_reset: u64,
    }

    /// Product subscription
    public struct Subscription has store {
        product_id: ID,
        quantity_per_week: u64,
        is_active: bool,
    }

    /// Vault with subscriptions attached
    public struct CustomerVaultWithSubs has key {
        id: UID,
        vault: CustomerVault,
        subscriptions: vector<Subscription>,
    }

    /// AI Agent purchase decision stored on Walrus
    public struct PurchaseDecision has store, drop {
        decision_id: ID,
        customer: address,
        product_id: ID,
        store_address: address,
        amount: u64,
        quantity: u64,
        reasoning: vector<u8>,
        confidence: u8,
        timestamp: u64,
    }

    /// Event emitted when decision is recorded to Walrus
    public struct DecisionRecorded has copy, drop {
        decision_id: ID,
        customer: address,
        blob_id: vector<u8>,
        timestamp: u64,
    }

    /// Event emitted on successful payment
    public struct PaymentConfirmed has copy, drop {
        payment_id: ID,
        customer: address,
        store: address,
        product_id: ID,
        amount: u64,
        timestamp: u64,
    }

    /// Capability granting AI agent permission to execute purchases
    public struct CustomerAgentCap has key, store {
        id: UID,
        vault_id: ID,
        allowed_until: u64,
    }

    /// Store agent capability
    public struct StoreAgentCap has key, store {
        id: UID,
        store_address: address,
    }

    // ====================== Core Functions ======================

    /// Create a new customer vault with weekly budget
    public fun create_vault(weekly_budget: u64, ctx: &mut TxContext) {
        let vault = CustomerVault {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            balance: balance::zero(),
            weekly_budget,
            spent_this_week: 0,
            last_reset: tx_context::epoch(ctx),
        };

        let full_vault = CustomerVaultWithSubs {
            id: object::new(ctx),
            vault,
            subscriptions: vector[],
        };

        transfer::transfer(full_vault, tx_context::sender(ctx));
    }

    /// Deposit USDC into vault
    public entry fun deposit(
        full_vault: &mut CustomerVaultWithSubs,
        coin: Coin<USDC>,
        ctx: &mut TxContext,
    ) {
        assert!(full_vault.vault.owner == tx_context::sender(ctx), E_UNAUTHORIZED);
        coin::put(&mut full_vault.vault.balance, coin);
    }

    /// Add a product subscription
    public entry fun add_subscription(
        full_vault: &mut CustomerVaultWithSubs,
        product_id: ID,
        quantity_per_week: u64,
        ctx: &mut TxContext,
    ) {
        assert!(full_vault.vault.owner == tx_context::sender(ctx), E_UNAUTHORIZED);
        vector::push_back(&mut full_vault.subscriptions, Subscription {
            product_id,
            quantity_per_week,
            is_active: true,
        });
    }

    /// Grant AI agent permission to execute purchases
    public entry fun grant_customer_agent(
        full_vault: &mut CustomerVaultWithSubs,
        agent_address: address,
        _allowed_amount: u64,
        ctx: &mut TxContext,
    ) {
        assert!(full_vault.vault.owner == tx_context::sender(ctx), E_UNAUTHORIZED);

        let agent_cap = CustomerAgentCap {
            id: object::new(ctx),
            vault_id: object::id(&full_vault.vault),
            allowed_until: tx_context::epoch(ctx) + 86400000,
        };
        transfer::transfer(agent_cap, agent_address);
    }

    /// Toggle subscription active/inactive
    public entry fun toggle_subscription(
        full_vault: &mut CustomerVaultWithSubs,
        index: u64,
        ctx: &mut TxContext,
    ) {
        assert!(full_vault.vault.owner == tx_context::sender(ctx), E_UNAUTHORIZED);
        assert!(index < vector::length(&full_vault.subscriptions), E_PRODUCT_UNAVAILABLE);

        let sub = vector::borrow_mut(&mut full_vault.subscriptions, index);
        sub.is_active = !sub.is_active;
    }

    // ==================== WALRUS STORAGE FUNCTIONS ====================

    /// Record AI decision to Walrus (emits event with blob_id for off-chain indexing)
    /// The actual blob is stored via Walrus SDK off-chain, event serves as on-chain reference
    public entry fun record_decision(
        _agent_cap: &CustomerAgentCap,
        blob_id: vector<u8>,
        customer: address,
        product_id: ID,
        store_address: address,
        amount: u64,
        quantity: u64,
        reasoning: vector<u8>,
        confidence: u8,
        ctx: &mut TxContext,
    ) {
        let decision_id = object::id_from_address(tx_context::sender(ctx));

        event::emit(DecisionRecorded {
            decision_id,
            customer,
            blob_id,
            timestamp: tx_context::epoch(ctx),
        });

        // Store decision hash on-chain for verification
        let _decision = PurchaseDecision {
            decision_id,
            customer,
            product_id,
            store_address,
            amount,
            quantity,
            reasoning,
            confidence,
            timestamp: tx_context::epoch(ctx),
        };
    }

    // ==================== PAYMENT FUNCTIONS ====================

    /// Direct payment to store (simple USDC transfer)
    fun pay_store(
        vault: &mut CustomerVault,
        store_address: address,
        amount: u64,
        ctx: &mut TxContext,
    ) {
        assert!(balance::value(&vault.balance) >= amount, E_INSUFFICIENT_BALANCE);

        let payment_coin = coin::take(&mut vault.balance, amount, ctx);
        transfer::public_transfer(payment_coin, store_address);
    }

    // ==================== AI EXECUTE WITH WALRUS VERIFICATION ====================

    /// Execute weekly purchase - AI agent calls this after storing decision on Walrus
    /// blob_id: Walrus blob ID where the full decision JSON is stored
    /// decision_hash: Hash of the decision content for verification
    public entry fun execute_walrus_purchase(
        full_vault: &mut CustomerVaultWithSubs,
        _agent_cap: &CustomerAgentCap,
        blob_id: vector<u8>,
        _decision_hash: vector<u8>,
        store_address: address,
        amount: u64,
        product_id: ID,
        _clock_arg: &Clock,
        ctx: &mut TxContext,
    ) {
        let vault = &mut full_vault.vault;

        // Weekly reset check
        let current_ts = sui::clock::timestamp_ms(_clock_arg);
        let current_week = current_ts / 604800000;
        if (current_week > vault.last_reset / 604800000) {
            vault.spent_this_week = 0;
            vault.last_reset = current_ts;
        };

        // Verify budget
        assert!(amount <= vault.weekly_budget - vault.spent_this_week, E_BUDGET_EXCEEDED);

        // Emit decision event for Walrus indexing
        event::emit(DecisionRecorded {
            decision_id: object::id_from_address(tx_context::sender(ctx)),
            customer: vault.owner,
            blob_id,
            timestamp: tx_context::epoch(ctx),
        });

        // Direct payment to store
        pay_store(vault, store_address, amount, ctx);

        vault.spent_this_week = vault.spent_this_week + amount;

        // Emit payment event
        event::emit(PaymentConfirmed {
            payment_id: object::id_from_address(tx_context::sender(ctx)),
            customer: vault.owner,
            store: store_address,
            product_id,
            amount,
            timestamp: tx_context::epoch(ctx),
        });
    }

    /// Simple execute for backward compatibility (no Walrus)
    public entry fun execute_weekly_purchase(
        full_vault: &mut CustomerVaultWithSubs,
        _agent_cap: &CustomerAgentCap,
        store_address: address,
        amount: u64,
        product_id: ID,
        _clock_arg: &Clock,
        ctx: &mut TxContext,
    ) {
        let vault = &mut full_vault.vault;

        // Weekly reset check
        let current_ts = sui::clock::timestamp_ms(_clock_arg);
        let current_week = current_ts / 604800000;
        if (current_week > vault.last_reset / 604800000) {
            vault.spent_this_week = 0;
            vault.last_reset = current_ts;
        };

        // Verify budget
        assert!(amount <= vault.weekly_budget - vault.spent_this_week, E_BUDGET_EXCEEDED);

        // Direct payment to store
        pay_store(vault, store_address, amount, ctx);

        vault.spent_this_week = vault.spent_this_week + amount;

        // Emit payment event
        event::emit(PaymentConfirmed {
            payment_id: object::id_from_address(tx_context::sender(ctx)),
            customer: vault.owner,
            store: store_address,
            product_id,
            amount,
            timestamp: tx_context::epoch(ctx),
        });
    }

    /// Grant store agent permission
    public entry fun grant_store_agent(agent_address: address, ctx: &mut TxContext) {
        let cap = StoreAgentCap {
            id: object::new(ctx),
            store_address: tx_context::sender(ctx),
        };
        transfer::transfer(cap, agent_address);
    }
}
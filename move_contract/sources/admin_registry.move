module grocery_agent::admin_registry {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::table::{Self, Table};
    use sui::event;
    use std::string::String;
    use std::option::{Self, Option};

    // ======== Errors ========
    const E_NOT_ADMIN: u64 = 1;
    const E_ALREADY_WHITELISTED: u64 = 2;

    // ======== Structs ========
    public struct AdminCap has key, store {
        id: UID,
    }

    public struct WhitelistedStore has key, store {
        id: UID,
        owner_address: address,
        store_name: String,
        location: String,
        is_active: bool,
        registered_at: u64,
        ai_agent_address: address,
    }

    public struct StoreRegistry has key {
        id: UID,
        admin: address,
        stores: Table<address, ID>,
        store_list: vector<ID>,
    }

    // ======== Events ========
    public struct StoreWhitelisted has copy, drop {
        store_id: ID,
        owner: address,
        store_name: String,
    }

    public struct StoreRemoved has copy, drop {
        store_id: ID,
        owner: address,
    }

    // ======== Init ========
    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap { id: object::new(ctx) };
        transfer::transfer(admin_cap, tx_context::sender(ctx));

        let registry = StoreRegistry {
            id: object::new(ctx),
            admin: tx_context::sender(ctx),
            stores: table::new(ctx),
            store_list: vector[],
        };
        transfer::share_object(registry);
    }

    // ======== Admin Functions ========
    public entry fun whitelist_store(
        _admin: &AdminCap,
        registry: &mut StoreRegistry,
        owner_address: address,
        store_name: String,
        location: String,
        ai_agent_address: address,
        ctx: &mut TxContext,
    ) {
        assert!(!table::contains(&registry.stores, owner_address), E_ALREADY_WHITELISTED);

        let store = WhitelistedStore {
            id: object::new(ctx),
            owner_address,
            store_name,
            location,
            is_active: true,
            registered_at: tx_context::epoch(ctx),
            ai_agent_address,
        };

        let store_id = object::id(&store);
        transfer::transfer(store, owner_address);

        table::add(&mut registry.stores, owner_address, store_id);
        vector::push_back(&mut registry.store_list, store_id);

        event::emit(StoreWhitelisted {
            store_id,
            owner: owner_address,
            store_name,
        });
    }

    public entry fun remove_store(
        _admin: &AdminCap,
        registry: &mut StoreRegistry,
        store_owner: address,
    ) {
        assert!(table::contains(&registry.stores, store_owner), E_NOT_ADMIN);
        let store_id = table::remove(&mut registry.stores, store_owner);
        
        event::emit(StoreRemoved { store_id, owner: store_owner });
    }

    public fun is_whitelisted(registry: &StoreRegistry, owner: address): bool {
        table::contains(&registry.stores, owner)
    }
}
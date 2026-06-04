module grocery_agent::product_listing {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use std::string::String;
    use grocery_agent::admin_registry::{Self, StoreRegistry};

    const E_UNAUTHORIZED_STORE: u64 = 101;

    public struct Product has key, store {
        id: UID,
        store_owner: address,
        product_sku: String,
        name: String,
        description: String,
        price: u64,
        tag: String,
        photo_url: String,
        location: String,
        available_quantity: u64,
        is_active: bool,
        created_at: u64,
    }

    public struct ProductCatalog has key {
        id: UID,
        products: vector<ID>,
    }

    public struct ProductListed has copy, drop {
        product_id: ID,
        store_owner: address,
        name: String,
        price: u64,
    }

    fun init(ctx: &mut TxContext) {
        let catalog = ProductCatalog {
            id: object::new(ctx),
            products: vector[],
        };
        transfer::share_object(catalog);
    }

    public entry fun list_product(
        catalog: &mut ProductCatalog,
        registry: &StoreRegistry,
        product_sku: String,
        name: String,
        description: String,
        price: u64,
        tag: String,
        photo_url: String,
        location: String,
        quantity: u64,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(admin_registry::is_whitelisted(registry, sender), E_UNAUTHORIZED_STORE);

        let product = Product {
            id: object::new(ctx),
            store_owner: sender,
            product_sku,
            name,
            description,
            price,
            tag,
            photo_url,
            location,
            available_quantity: quantity,
            is_active: true,
            created_at: tx_context::epoch(ctx),
        };

        let product_id = object::id(&product);
        transfer::transfer(product, sender);

        vector::push_back(&mut catalog.products, product_id);

        event::emit(ProductListed {
            product_id,
            store_owner: sender,
            name,
            price,
        });
    }

    public entry fun update_inventory(
        product: &mut Product,
        new_quantity: u64,
        ctx: &mut TxContext,
    ) {
        assert!(product.store_owner == tx_context::sender(ctx), E_UNAUTHORIZED_STORE);
        product.available_quantity = new_quantity;
    }
}
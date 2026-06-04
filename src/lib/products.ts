import { SuiClient } from '@mysten/sui.js/client';

export interface OnChainProduct {
  id: string;
  storeOwner: string;
  productSku: string;
  name: string;
  description: string;
  price: number; // in USDC atomic units (1 USDC = 1e6)
  tag: string;
  photoUrl: string;
  location: string;
  availableQuantity: number;
  isActive: boolean;
  createdAt: number;
}

export interface OnChainStore {
  id: string;
  ownerAddress: string;
  storeName: string;
  location: string;
  isActive: boolean;
  aiAgentAddress: string;
}

const PACKAGE_ID = '0xe314fec6438ab3d9cc449c4406fa8dd3701c09ad14418963f998166ffc06a68c';
const STORE_REGISTRY_ID = '0xe86d83e5c05ecc000e009d6b9316864234d9d189d9a30e7860eab637308c5f87';

export function parseProductFromContent(content: any, objectId: string): OnChainProduct | null {
  if (!content || content.dataType !== 'moveObject') return null;

  const fields = content.fields;
  return {
    id: objectId,
    storeOwner: fields.store_owner || '',
    productSku: fields.product_sku || '',
    name: fields.name || '',
    description: fields.description || '',
    price: Number(fields.price) || 0,
    tag: fields.tag || '',
    photoUrl: fields.photo_url || '',
    location: fields.location || '',
    availableQuantity: Number(fields.available_quantity) || 0,
    isActive: fields.is_active || false,
    createdAt: Number(fields.created_at) || 0,
  };
}

export function parseStoreFromContent(content: any, objectId: string): OnChainStore | null {
  if (!content || content.dataType !== 'moveObject') return null;

  const fields = content.fields;
  return {
    id: objectId,
    ownerAddress: fields.owner_address || '',
    storeName: fields.store_name || '',
    location: fields.location || '',
    isActive: fields.is_active || false,
    aiAgentAddress: fields.ai_agent_address || '',
  };
}

export async function getProductCatalogId(client: SuiClient): Promise<string | null> {
  // Return hardcoded ProductCatalog ID
  return '0x1480beada01d70140b8d02a6bec6e516a9f3e26cb8d4fa83d6511a0c41b8e3a9';
}

export async function getAllProducts(client: SuiClient): Promise<OnChainProduct[]> {
  const products: OnChainProduct[] = [];

  try {
    // Get ProductCatalog shared object
    const catalogId = await getProductCatalogId(client);
    if (!catalogId) {
      console.error('ProductCatalog not found');
      return products;
    }

    const catalog = await client.getObject({
      id: catalogId,
      options: { showContent: true, showType: true },
    });

    if (!catalog.data || !catalog.data.content) return products;

    const fields = (catalog.data.content as any).fields;  
    const productIds = fields.products || [];

    // Fetch each product
    for (const id of productIds) {
      try {
        const productId = id.fields?.id || id;
        const productObj = await client.getObject({
          id: productId,
          options: { showContent: true, showType: true },
        });

        if (productObj.data) {
          const product = parseProductFromContent(productObj.data.content, productObj.data.objectId);
          if (product && product.isActive) {
            products.push(product);
          }
        }
      } catch (e) {
        console.error(`Error fetching product ${id}:`, e);
      }
    }
  } catch (e) {
    console.error('Error fetching products:', e);
  }

  return products;
}

export async function getWhitelistedStores(client: SuiClient): Promise<OnChainStore[]> {
  const stores: OnChainStore[] = [];

  try {
    const registry = await client.getObject({
      id: STORE_REGISTRY_ID,
      options: { showContent: true, showType: true },
    });

    if (!registry.data || !registry.data.content) return stores;

    const fields = (registry.data.content as any).fields; 
    const storeList = fields.store_list || [];

    for (const storeId of storeList) {
      try {
        const storeObj = await client.getObject({
          id: storeId,
          options: { showContent: true, showType: true },
        });

        if (storeObj.data) {
          const store = parseStoreFromContent(storeObj.data.content, storeObj.data.objectId);
          if (store && store.isActive) {
            stores.push(store);
          }
        }
      } catch (e) {
        console.error(`Error fetching store:`, e);
      }
    }
  } catch (e) {
    console.error('Error fetching stores:', e);
  }

  return stores;
}

export function formatPrice(priceMIST: number): string {
  return (priceMIST / 1e9).toFixed(2);
}

export function parsePriceToMIST(priceSUI: number): number {
  return Math.round(priceSUI * 1e9);
}

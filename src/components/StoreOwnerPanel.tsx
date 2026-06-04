'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { PACKAGE_ID } from '@/lib/sui';

// Hardcoded shared object IDs from on-chain discovery
const STORE_REGISTRY_ID = '0xe86d83e5c05ecc000e009d6b9316864234d9d189d9a30e7860eab637308c5f87';
const PRODUCT_CATALOG_ID = '0x1480beada01d70140b8d02a6bec6e516a9f3e26cb8d4fa83d6511a0c41b8e3a9';

export function StoreOwnerPanel() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();

  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>(['🏪 Store Owner Panel Loaded', `📦 Registry: ${STORE_REGISTRY_ID.slice(0, 10)}...`]);

  // Form fields
  const [productSku, setProductSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [tag, setTag] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [location, setLocation] = useState('');
  const [quantity, setQuantity] = useState('');
  const [isListing, setIsListing] = useState(false);

  // Query for whitelisted store status
  useEffect(() => {
    async function fetchStoreData() {
      if (!account) {
        setLogs(['❌ No wallet connected']);
        setIsWhitelisted(false);
        return;
      }

      try {
        const objects = await client.getOwnedObjects({
          owner: account.address,
          options: { showContent: true, showType: true },
        });

        let foundStoreName: string | null = null;
        const debugLogs: string[] = [];

        for (const obj of objects.data || []) {
          const data = obj.data;
          if (!data) continue;

          debugLogs.push(`Found: ${data.type?.slice(0, 60) || 'unknown type'}`);

          if (data.type?.includes('WhitelistedStore')) {
            if (data.content?.dataType === 'moveObject') {
              const fields = data.content.fields;
              foundStoreName = fields.store_name || fields.storeName || 'Unknown Store';
            }
          }
        }

        setStoreName(foundStoreName);
        setLogs(prev => [...prev, ...debugLogs]);

        if (foundStoreName) {
          setIsWhitelisted(true);
          setLogs(prev => [
            ...prev,
            `✅ Store found: ${foundStoreName}`,
            `✅ Can now list products`,
          ]);
        } else {
          setIsWhitelisted(false);
          setLogs(prev => [...prev, '⚠️ Not a whitelisted store owner']);
        }
      } catch (err: any) {
        setLogs([`❌ Error: ${err.message}`]);
        setIsWhitelisted(false);
      }
    }

    fetchStoreData();
  }, [account?.address, client]);

  const listProduct = async () => {
    if (!account || !isWhitelisted) {
      setLogs(prev => [...prev, '❌ Not authorized']);
      return;
    }

    setIsListing(true);
    setLogs(prev => [...prev, `🔄 Listing product: ${name}...`]);

    try {
      const priceInUsdc = Math.round(parseFloat(price) * 1_000_000); // USDC has 6 decimals
      const qty = parseInt(quantity);

      const tx = new TransactionBlock();

      tx.moveCall({
        target: `${PACKAGE_ID}::product_listing::list_product`,
        arguments: [
          tx.object(PRODUCT_CATALOG_ID),
          tx.object(STORE_REGISTRY_ID),
          tx.pure(productSku, 'string'),
          tx.pure(name, 'string'),
          tx.pure(description, 'string'),
          tx.pure(priceInUsdc, 'u64'),
          tx.pure(tag, 'string'),
          tx.pure(photoUrl, 'string'),
          tx.pure(location, 'string'),
          tx.pure(qty, 'u64'),
        ],
      });

      signAndExecute(
        { transactionBlock: tx, chain: 'sui:testnet' },
        {
          onSuccess: (result) => {
            setLogs(prev => [
              ...prev,
              `✅ Product listed successfully!`,
              `🔗 TX: ${result.digest.slice(0, 12)}...`,
            ]);
            setProductSku('');
            setName('');
            setDescription('');
            setPrice('');
            setTag('');
            setPhotoUrl('');
            setLocation('');
            setQuantity('');
            setIsListing(false);
          },
          onError: (error) => {
            setLogs(prev => [...prev, `⚠️ ${error.message}`]);
            setIsListing(false);
          },
        }
      );
    } catch (err: any) {
      setLogs(prev => [...prev, `❌ ${err.message}`]);
      setIsListing(false);
    }
  };

  if (!account) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-white/60">Connect wallet to access store owner panel</p>
      </div>
    );
  }

  if (!isWhitelisted) {
    return (
      <div className="glass-card p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🏪</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Store Owner Panel</h2>
        <p className="text-amber-400">⚠️ Access denied - not a whitelisted store owner</p>
        <p className="text-white/50 text-sm mt-2">Your address: {account.address.slice(0, 10)}...</p>
        <p className="text-white/40 text-xs mt-1">Request whitelist from admin to list products</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
            <span className="text-2xl">🏪</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Store Owner Panel</h2>
            <p className="text-sm text-green-400">List Products (Store: {storeName})</p>
          </div>
        </div>

        {/* Status */}
        <div className="mb-6 p-3 rounded-xl bg-white/5 border border-green-500/20">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">Store Name</span>
              <span className="text-green-400 font-medium">{storeName || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Catalog ID</span>
              <span className="text-cyan-400 font-mono text-xs">
                {PRODUCT_CATALOG_ID ? `${PRODUCT_CATALOG_ID.slice(0, 10)}...` : 'Not Found'}
              </span>
            </div>
          </div>
        </div>

        {/* Product Form */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/60 mb-1 block">Product SKU</label>
              <input
                type="text"
                value={productSku}
                onChange={(e) => setProductSku(e.target.value)}
                placeholder="SKU-001"
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-white/60 mb-1 block">Product Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Fresh Apples"
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-white/60 mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Fresh organic apples from local farm..."
              rows={2}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/60 mb-1 block">Price (in USDC)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="5.00"
                step="0.01"
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-white/60 mb-1 block">Tag</label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="organic, fruit"
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-white/60 mb-1 block">Photo URL</label>
            <input
              type="text"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://example.com/apples.jpg"
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/60 mb-1 block">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Downtown Market"
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-white/60 mb-1 block">Quantity Available</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="100"
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
              />
            </div>
          </div>
        </div>

        {/* List Product Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={listProduct}
          disabled={!PRODUCT_CATALOG_ID || isListing}
          className={`w-full py-3 rounded-xl font-medium ${
            !PRODUCT_CATALOG_ID
              ? 'bg-white/5 text-white/30 cursor-not-allowed'
              : isListing
              ? 'bg-green-500/20 text-green-400 cursor-wait'
              : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
          }`}
        >
          {isListing ? '◈ Listing Product...' : '✅ List Product'}
        </motion.button>

        {/* Log */}
        <div className="mt-6 bg-black/40 rounded-xl p-4 h-48 overflow-y-auto">
          <h3 className="text-sm font-medium text-white/60 mb-3">Product Listing Log</h3>
          <div className="space-y-2 font-mono text-sm">
            {logs.map((log, i) => (
              <motion.p key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-white/80">
                {log}
              </motion.p>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <div className="glass-card p-6 border border-green-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Store Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Connected</span>
              <span className="text-green-400 font-mono text-xs">
                {account.address.slice(0, 8)}...
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Role</span>
              <span className="text-green-400">Store Owner</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Store</span>
              <span className="text-green-400">{storeName || 'Unknown'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Catalog</span>
              <span className={PRODUCT_CATALOG_ID ? 'text-green-400' : 'text-red-400'}>
                {PRODUCT_CATALOG_ID ? 'Found' : 'Missing'}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-3">How It Works</h3>
          <div className="text-sm text-white/60 space-y-2">
            <p>1. Admin whitelists your store</p>
            <p>2. You receive WhitelistedStore object</p>
            <p>3. Fill product details and list</p>
            <p>4. Products appear in ProductGrid</p>
            <p>5. Customers can subscribe</p>
          </div>
        </div>

        <div className="glass-card p-6 border border-purple-500/20">
          <h3 className="text-lg font-semibold text-white mb-3">💡 Product Tips</h3>
          <div className="space-y-3 text-sm text-white/70">
            <div className="flex items-start gap-2">
              <span className="text-purple-400">📷</span>
              <p>Use valid photo URLs for better visibility</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-400">🏷️</span>
              <p>Add relevant tags (organic, fresh, etc.)</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-400">📍</span>
              <p>Location helps customers find you</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-400">💰</span>
              <p>Price is in SUI (1 SUI = 1e9 MIST)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
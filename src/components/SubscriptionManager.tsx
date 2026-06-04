'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { PACKAGE_ID } from '@/lib/sui';
import { OnChainProduct, getAllProducts } from '@/lib/products';

function formatUsdc(amount: number): string {
  return (amount / 1_000_000).toFixed(2);
}

interface SubscriptionOnChain {
  product_id: string;
  quantity_per_week: number;
  is_active: boolean;
}

export function SubscriptionManager() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();

  const [vaultId, setVaultId] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionOnChain[]>([]);
  const [productDetails, setProductDetails] = useState<Map<string, OnChainProduct>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);

  // Fetch vault and subscriptions from chain
  useEffect(() => {
    async function fetchData() {
      if (!account) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const objects = await client.getOwnedObjects({
          owner: account.address,
          options: {
            showContent: true,
            showType: true,
          },
        });

        let foundVaultId: string | null = null;
        let foundSubs: SubscriptionOnChain[] = [];

        for (const obj of objects.data || []) {
          const data = obj.data;
          if (!data) continue;

          const typeStr = data.type || '';
          if (typeStr.includes('CustomerVaultWithSubs')) {
            foundVaultId = data.objectId;
            if (data.content && data.content.dataType === 'moveObject') {
              const fields = data.content.fields as any;
              const subs = fields.subscriptions || [];
              if (Array.isArray(subs)) {
                foundSubs = subs.map((s: any) => ({
                  product_id: s.fields?.product_id || s.product_id || '',
                  quantity_per_week: Number(s.fields?.quantity_per_week || s.quantity_per_week || 0),
                  is_active: s.fields?.is_active || s.is_active || false,
                }));
              }
            }
          }
        }

        setVaultId(foundVaultId);
        setSubscriptions(foundSubs);

        // Fetch product details for each subscription
        const allProducts = await getAllProducts(client);
        const productMap = new Map<string, OnChainProduct>();
        allProducts.forEach(p => productMap.set(p.id, p));
        setProductDetails(productMap);

        setLogs([
          `📦 Found vault: ${foundVaultId ? foundVaultId.slice(0, 8) + '...' : 'None'}`,
          `📋 Subscriptions: ${foundSubs.length}`,
          `📦 Products loaded: ${allProducts.length}`,
        ]);
      } catch (err: any) {
        setLogs([`❌ Error: ${err.message}`]);
      }
      setIsLoading(false);
    }

    fetchData();
  }, [account?.address, client]);

  const toggleSubscription = async (index: number) => {
    if (!account || !vaultId) {
      setLogs(prev => [...prev, '❌ No vault found']);
      return;
    }

    setLogs(prev => [...prev, `🔄 Toggling subscription ${index}...`]);

    try {
      const tx = new TransactionBlock();
      tx.moveCall({
        target: `${PACKAGE_ID}::payment_vault::toggle_subscription`,
        arguments: [
          tx.object(vaultId),
          tx.pure(index, 'u64'),
        ],
      });

      signAndExecute(
        { transactionBlock: tx, chain: 'sui:testnet' },
        {
          onSuccess: (result) => {
            setLogs(prev => [
              ...prev,
              `✅ Subscription toggled!`,
              `🔗 TX: ${result.digest.slice(0, 12)}...`,
            ]);
            // Refresh subscriptions
            setSubscriptions(prev => prev.map((s, i) =>
              i === index ? { ...s, is_active: !s.is_active } : s
            ));
          },
          onError: (error) => {
            setLogs(prev => [...prev, `⚠️ ${error.message}`]);
          },
        }
      );
    } catch (err: any) {
      setLogs(prev => [...prev, `❌ ${err.message}`]);
    }
  };

  const totalActive = subscriptions.filter(s => s.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <p className="text-sm text-white/60 mb-1">Active Subscriptions</p>
          <p className="text-3xl font-bold text-cyan-400">{totalActive}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <p className="text-sm text-white/60 mb-1">Total Subscriptions</p>
          <p className="text-3xl font-bold text-purple-400">{subscriptions.length}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <p className="text-sm text-white/60 mb-1">Vault ID</p>
          <p className="text-lg font-bold text-green-400 font-mono">
            {vaultId ? `${vaultId.slice(0, 6)}...${vaultId.slice(-4)}` : 'None'}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <p className="text-sm text-white/60 mb-1">Status</p>
          <p className="text-lg font-semibold text-white">
            {isLoading ? 'Loading...' : vaultId ? 'Connected' : 'No Vault'}
          </p>
        </motion.div>
      </div>

      {/* Subscription List */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-white mb-6">On-Chain Subscriptions</h2>

        {/* Logs */}
        <div className="bg-black/40 rounded-xl p-3 mb-6 h-32 overflow-y-auto">
          <div className="space-y-1 font-mono text-xs text-white/70">
            {logs.map((log, i) => (
              <p key={i}>{log}</p>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {subscriptions.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              {isLoading ? 'Loading subscriptions...' : 'No subscriptions found. Create vault and subscribe to products first.'}
            </div>
          ) : (
            subscriptions.map((sub, i) => {
              const product = productDetails.get(sub.product_id);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`p-5 rounded-xl border transition-all ${
                    sub.is_active
                      ? 'bg-white/5 border-white/10 hover:border-cyan-500/30'
                      : 'bg-white/2 border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        sub.is_active ? 'bg-cyan-500/20' : 'bg-white/10'
                      }`}>
                        <span className="text-2xl">📦</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {product?.name || `Product ${i + 1}`}
                        </h3>
                        <p className="text-sm text-white/50">
                          {product ? `Store: ${product.storeOwner.slice(0, 8)}...` : `ID: ${sub.product_id.slice(0, 10)}...`}
                        </p>
                        {product && (
                          <p className="text-xs text-white/40">
                            📍 {product.location} | 📷 {product.availableQuantity} available
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xl font-bold text-white">
                          {product ? `$${formatUsdc(product.price)}` : sub.quantity_per_week}
                        </p>
                        <p className="text-xs text-white/40">
                          {product ? 'USDC' : 'qty/week'}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className={`text-sm ${
                          sub.is_active ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                          {sub.is_active ? '✓ Active' : '⏸ Inactive'}
                        </p>
                      </div>

                      <motion.button
                        initial={{ scale: 1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleSubscription(i)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          sub.is_active
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30'
                            : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                        }`}
                      >
                        {sub.is_active ? 'Pause' : 'Resume'}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
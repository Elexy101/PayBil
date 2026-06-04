'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { PACKAGE_ID } from '@/lib/sui';
import { OnChainProduct } from '@/lib/products';

export interface ProductCardProps {
  product: OnChainProduct;
  priceUsdc?: number; // Price in USDC (atomic units - 6 decimals)
}

export function formatProductPrice(priceUsdc: number): string {
  return (priceUsdc / 1_000_000).toFixed(2);
}

export function ProductCard({ product, priceUsdc }: ProductCardProps) {  
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();

  const handleSubscribe = async () => {
    if (!account) {
      setLogs(['❌ Connect wallet first']);
      return;
    }

    if (isSubscribed || !product.isActive) return;

    setIsSubscribing(true);
    setLogs(['🔄 Finding your vault...']);

    try {
      // Find user's vault from chain
      const objects = await client.getOwnedObjects({
        owner: account.address,
        options: { showContent: true, showType: true },
      });

      let vaultId = null;
      for (const obj of objects.data || []) {
        const data = obj.data;
        if (!data) continue;
        if (data.type?.includes('CustomerVaultWithSubs')) {
          vaultId = data.objectId;
          break;
        }
      }

      if (!vaultId) {
        setLogs(['❌ No vault found - create one first in My Vault tab']);
        setIsSubscribing(false);
        return;
      }

      setLogs([`📦 Subscribing to ${product.name}...`]);

      const tx = new TransactionBlock();

      tx.moveCall({
        target: `${PACKAGE_ID}::payment_vault::add_subscription`,
        arguments: [
          tx.object(vaultId),
          tx.pure(product.id, 'address'),
          tx.pure(product.availableQuantity, 'u64'),
        ],
      });

      signAndExecute(
        { transactionBlock: tx, chain: 'sui:testnet' },
        {
          onSuccess: (result) => {
            setLogs([
              `✅ Subscribed to ${product.name}!`,
              `💰 ${formatProductPrice(product.price)} USDC/week`,
              `🔗 TX: ${result.digest.slice(0, 12)}...`,
            ]);
            setIsSubscribed(true);
            setIsSubscribing(false);
          },
          onError: (error) => {
            setLogs([`⚠️ ${error.message || 'Failed'}`]);
            setIsSubscribing(false);
          },
        }
      );
    } catch (err: any) {
      setLogs([`❌ ${err.message}`]);
      setIsSubscribing(false);
    }
  };

  const defaultImage = 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=300&fit=crop';

  return (
    <div className="group glass-card overflow-hidden hover:border-cyan-500/30 transition-all duration-300">
      <div className="relative h-48 overflow-hidden">
        <img
          src={product.photoUrl || defaultImage}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => { (e.target as HTMLImageElement).src = defaultImage; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
        <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-xs text-cyan-400">
          {product.tag || 'General'}
        </div>
        {!product.isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm">Out of Stock</span>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">{product.name}</h3>
            <p className="text-sm text-white/50">Store: {product.storeOwner.slice(0, 8)}...</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-white">${formatProductPrice(product.price)}</p>
            <p className="text-xs text-white/40">USDC</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/40 mb-4">
          <span>📍</span>
          <span>{product.location || 'No location'}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/40 mb-4">
          <span>📦</span>
          <span>Qty: {product.availableQuantity} available</span>
        </div>

        <div className="mb-3 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <p className="text-xs text-purple-300">💡 Subscribe for weekly auto-purchase</p>
        </div>

        {logs.length > 0 && (
          <div className="mb-3 p-2 rounded-lg bg-black/30 text-xs font-mono text-white/60">
            {logs.map((log, i) => <div key={i}>{log}</div>)}
          </div>
        )}

        <motion.button
          initial={{ scale: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubscribe}
          disabled={!product.isActive || isSubscribing || isSubscribed}
          className={`w-full py-3 rounded-xl font-medium transition-all ${
            isSubscribed
              ? 'bg-green-500/20 border border-green-500/30 text-green-400'
              : !account
              ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white cursor-pointer'
              : product.isActive && !isSubscribing
              ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
              : 'bg-white/5 text-white/30 cursor-not-allowed'
          }`}
        >
          {isSubscribing ? '◈ Subscribing...' : isSubscribed ? '✓ Subscribed' : !account ? 'Connect to Subscribe' : product.isActive ? 'Subscribe' : 'Unavailable'}
        </motion.button>
      </div>

      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10" />
      </div>
    </div>
  );
}

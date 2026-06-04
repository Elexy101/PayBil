'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { PACKAGE_ID, ADMIN_ADDRESS, isAdmin } from '@/lib/sui';

// Hardcoded StoreRegistry ID from on-chain discovery
const STORE_REGISTRY_ID = '0xe86d83e5c05ecc000e009d6b9316864234d9d189d9a30e7860eab637308c5f87';

export function AdminPanel() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();

  const [adminCapId, setAdminCapId] = useState<string | null>(null);
  const [storeOwner, setStoreOwner] = useState('');
  const [storeName, setStoreName] = useState('');
  const [location, setLocation] = useState('');
  const [agentAddress, setAgentAddress] = useState('');
  const [isWhitelisting, setIsWhitelisting] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    '🔐 Admin Panel Loaded',
    '📦 Package: ' + PACKAGE_ID.slice(0, 10) + '...',
    '📦 StoreRegistry: ' + STORE_REGISTRY_ID.slice(0, 10) + '...',
  ]);

  const isAdminUser = account && isAdmin(account.address);

  // Query admin cap from wallet, verify StoreRegistry exists on-chain
  useEffect(() => {
    async function fetchAdminData() {
      if (!account) {
        setLogs(['❌ No wallet connected']);
        return;
      }

      if (!isAdminUser) {
        setLogs(['⚠️ Not authorized as admin', `Admin: ${ADMIN_ADDRESS.slice(0, 10)}...`]);
        return;
      }

      try {
        // Query all objects in admin wallet
        const objects = await client.getOwnedObjects({
          owner: account.address,
          options: { showContent: true, showType: true },
        });

        let foundAdminCapId: string | null = null;

        for (const obj of objects.data || []) {
          const data = obj.data;
          if (!data) continue;
          const typeStr = data.type || '';

          if (typeStr.includes('AdminCap')) {
            foundAdminCapId = data.objectId;
          }
        }

        setAdminCapId(foundAdminCapId);

        // Verify StoreRegistry exists by querying it directly
        try {
          const registryObj = await client.getObject({
            id: STORE_REGISTRY_ID,
            options: { showContent: true, showType: true },
          });
          if (registryObj.data && registryObj.data.type?.includes('StoreRegistry')) {
            setLogs(prev => [
              ...prev,
              `✅ AdminCap found: ${foundAdminCapId?.slice(0, 8) || 'none'}...`,
              `✅ StoreRegistry verified on-chain`,
            ]);
          }
        } catch {
          setLogs(prev => [
            ...prev,
            `✅ AdminCap found: ${foundAdminCapId?.slice(0, 8) || 'none'}...`,
            `⚠️ StoreRegistry not found at expected ID`,
          ]);
        }
      } catch (err: any) {
        setLogs([`❌ Error: ${err.message}`]);
      }
    }

    fetchAdminData();
  }, [account?.address, client, isAdminUser]);

  const whitelistStore = async () => {
    if (!account || !adminCapId) {
      setLogs(prev => [...prev, '❌ AdminCap not found']);
      return;
    }

    setIsWhitelisting(true);
    setLogs(prev => [...prev, `🔄 Whitelisting ${storeName}...`]);

    try {
      const tx = new TransactionBlock();

      tx.moveCall({
        target: `${PACKAGE_ID}::admin_registry::whitelist_store`,
        arguments: [
          tx.object(adminCapId),
          tx.object(STORE_REGISTRY_ID),
          tx.pure(storeOwner, 'address'),
          tx.pure(storeName, 'string'),
          tx.pure(location, 'string'),
          tx.pure(agentAddress, 'address'),
        ],
      });

      signAndExecute(
        { transactionBlock: tx, chain: 'sui:testnet' },
        {
          onSuccess: (result) => {
            setLogs(prev => [
              ...prev,
              '✅ Store whitelisted successfully!',
              `🔗 TX: ${result.digest.slice(0, 12)}...`,
              `🏪 ${storeName} at ${location}`,
            ]);
            setStoreOwner('');
            setStoreName('');
            setLocation('');
            setAgentAddress('');
            setIsWhitelisting(false);
          },
          onError: (error) => {
            setLogs(prev => [...prev, `⚠️ ${error.message}`]);
            setIsWhitelisting(false);
          },
        }
      );
    } catch (err: any) {
      setLogs(prev => [...prev, `❌ ${err.message}`]);
      setIsWhitelisting(false);
    }
  };

  if (!account) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-white/60">Connect wallet to access admin panel</p>
      </div>
    );
  }

  if (!isAdminUser) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-red-400">⚠️ Access denied - not admin</p>
        <p className="text-white/50 text-sm mt-2">Your address: {account.address.slice(0, 10)}...</p>
        <p className="text-white/50 text-sm">Required admin: {ADMIN_ADDRESS.slice(0, 10)}...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <span className="text-2xl">👑</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Admin Panel</h2>
            <p className="text-sm text-amber-400">Store Management (Whitelist Stores)</p>
          </div>
        </div>

        {/* Status */}
        <div className="mb-6 p-3 rounded-xl bg-white/5 border border-amber-500/20">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">AdminCap ID</span>
              <span className="text-cyan-400 font-mono text-xs">
                {adminCapId ? `${adminCapId.slice(0, 10)}...` : 'Not Found'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Registry ID</span>
              <span className="text-cyan-400 font-mono text-xs">
                {STORE_REGISTRY_ID ? STORE_REGISTRY_ID.slice(0, 10) + '...' : 'Not Found'}
              </span>
            </div>
          </div>
        </div>

        {/* Store Form */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm text-white/60 mb-1 block">Store Owner Address</label>
            <input
              type="text"
              value={storeOwner}
              onChange={(e) => setStoreOwner(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1 block">Store Name</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="FreshMart"
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1 block">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Downtown"
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1 block">AI Agent Address</label>
            <input
              type="text"
              value={agentAddress}
              onChange={(e) => setAgentAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
            />
          </div>
        </div>

        {/* Whitelist Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={whitelistStore}
          disabled={!adminCapId || isWhitelisting}
          className={`w-full py-3 rounded-xl font-medium ${
            !adminCapId
              ? 'bg-white/5 text-white/30 cursor-not-allowed'
              : isWhitelisting
              ? 'bg-amber-500/20 text-amber-400 cursor-wait'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
          }`}
        >
          {isWhitelisting ? '◈ Whitelisting...' : '✅ Whitelist Store'}
        </motion.button>

        {/* Log */}
        <div className="mt-6 bg-black/40 rounded-xl p-4 h-48 overflow-y-auto">
          <h3 className="text-sm font-medium text-white/60 mb-3">Admin Log</h3>
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
        <div className="glass-card p-6 border border-amber-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Admin Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Connected</span>
              <span className="text-amber-400 font-mono text-xs">
                {account.address.slice(0, 8)}...
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Role</span>
              <span className="text-green-400">Admin</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">AdminCap</span>
              <span className={adminCapId ? 'text-green-400' : 'text-red-400'}>
                {adminCapId ? 'Found' : 'Missing'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Registry</span>
              <span className="text-green-400">OK</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-3">How It Works</h3>
          <div className="text-sm text-white/60 space-y-2">
            <p>1. AdminCap is in your wallet</p>
            <p>2. StoreRegistry is shared object</p>
            <p>3. Only you (admin) can whitelist stores</p>
            <p>4. Whitelisted stores can list products</p>
          </div>
        </div>

        <div className="glass-card p-6 border border-purple-500/20">
          <h3 className="text-lg font-semibold text-white mb-3">🗺️ Admin Flow</h3>
          <div className="space-y-3 text-sm text-white/70">
            <div className="flex items-start gap-2">
              <span className="text-amber-400">1.</span>
              <p>Admin whitelists a store owner with their AI agent address</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-400">2.</span>
              <p>Store owner can now list products</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-400">3.</span>
              <p>Customers subscribe to products</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-400">4.</span>
              <p>AI agent executes purchases via DeepBook</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
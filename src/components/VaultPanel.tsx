'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { PACKAGE_ID } from '@/lib/sui';

export function VaultPanel() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();
  const [isCreating, setIsCreating] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [budget, setBudget] = useState('100');
  const [depositAmount, setDepositAmount] = useState('50');
  const [logs, setLogs] = useState<string[]>([
    '💎 Vault Panel Loaded',
    '👤 Connected: ' + (account?.address?.slice(0, 10) || 'None') + '...',
  ]);

  const createVault = async () => {
    if (!account) {
      setLogs(prev => [...prev, '❌ No wallet connected']);
      return;
    }

    setIsCreating(true);
    setLogs(prev => [...prev, '🔄 Creating your vault...']);

    try {
      const tx = new TransactionBlock();

      // create_vault(weekly_budget: u64, ctx: &mut TxContext)
      // Budget is in USDC (6 decimals) - so 100 USDC = 100_000_000
      const budgetUsdc = parseFloat(budget) * 1_000_000;

      tx.moveCall({
        target: `${PACKAGE_ID}::payment_vault::create_vault`,
        arguments: [
          tx.pure(budgetUsdc),
        ],
      });

      signAndExecute(
        { transactionBlock: tx, chain: 'sui:testnet' },
        {
          onSuccess: (result) => {
            setLogs(prev => [
              ...prev,
              '✅ Your vault created successfully!',
              '💰 You can now use AI Agent',
              `🔗 TX: ${result.digest.slice(0, 12)}...`,
            ]);
            setIsCreating(false);
          },
          onError: (error) => {
            setLogs(prev => [
              ...prev,
              `⚠️ Failed: ${error.message || 'Error'}`,
              '💡 Tip: Vault might already exist',
            ]);
            setIsCreating(false);
          },
        }
      );
    } catch (error: any) {
      setLogs(prev => [...prev, `⚠️ Error: ${error.message}`]);
      setIsCreating(false);
    }
  };

  const depositToVault = async () => {
    if (!account) {
      setLogs(prev => [...prev, '❌ No wallet connected']);
      return;
    }

    setIsDepositing(true);
    setLogs(prev => [...prev, '🔄 Finding your vault and USDC...']);

    try {
      // Find user's vault and USDC coins
      const objects = await client.getOwnedObjects({
        owner: account.address,
        options: { showContent: true, showType: true },
      });

      let vaultId: string | null = null;
      let usdcCoinId: string | null = null;

      for (const obj of objects.data || []) {
        const data = obj.data;
        if (!data) continue;
        const typeStr = data.type || '';

        if (typeStr.includes('CustomerVaultWithSubs')) {
          vaultId = data.objectId;
        }
        // Look for USDC - could be Coin<USDC> or just USDC depending on the package
        if (typeStr.includes('USDC') && !typeStr.includes('Vault')) {
          usdcCoinId = data.objectId;
          setLogs(prev => [...prev, `Found USDC: ${typeStr}`]);
          break;
        }
      }

      if (!vaultId) {
        setLogs(prev => [...prev, '❌ No vault found - create one first']);
        setIsDepositing(false);
        return;
      }

      if (!usdcCoinId) {
        setLogs(prev => [...prev, '❌ No USDC coin found. Get USDC first.']);
        setIsDepositing(false);
        return;
      }

      setLogs(prev => [...prev, `🔄 Depositing ${depositAmount} USDC...`]);
      setLogs(prev => [...prev, `Vault: ${vaultId?.slice(0, 8)}... Coin: ${usdcCoinId?.slice(0, 8)}...`]);

      const tx = new TransactionBlock();

      tx.moveCall({
        target: `${PACKAGE_ID}::payment_vault::deposit`,
        arguments: [
          tx.object(vaultId!),
          tx.object(usdcCoinId!),
        ],
      });

      signAndExecute(
        { transactionBlock: tx, chain: 'sui:testnet' },
        {
          onSuccess: (result) => {
            setLogs(prev => [
              ...prev,
              `✅ Deposited ${depositAmount} USDC to vault!`,
              `🔗 TX: ${result.digest.slice(0, 12)}...`,
            ]);
            setIsDepositing(false);
          },
          onError: (error) => {
            setLogs(prev => [...prev, `⚠️ Deposit failed: ${error.message}`]);
            setIsDepositing(false);
          },
        }
      );
    } catch (error: any) {
      setLogs(prev => [...prev, `⚠️ Error: ${error.message}`]);
      setIsDepositing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Vault Control Panel */}
      <div className="lg:col-span-2 glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                <span className="text-2xl">💎</span>
              </div>
              {isCreating && (
                <motion.div
                  className="absolute -inset-1 rounded-xl border-2 border-cyan-500"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">My Vault</h2>
              <p className="text-sm text-cyan-400">Create & Manage Your Vault</p>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            💎 USDC Vault
          </div>
        </div>

        {/* Budget Input */}
        <div className="mb-4">
          <label className="text-sm text-white/60 mb-2 block">Weekly Budget (USDC)</label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-cyan-500/30 text-white text-lg focus:outline-none focus:border-cyan-500"
            placeholder="100"
            min="1"
            max="10000"
          />
          <p className="text-xs text-white/40 mt-2">Set your weekly spending limit in USDC</p>
        </div>

        {/* Create Vault Button */}
        <motion.button
          initial={{ scale: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={createVault}
          disabled={!account || isCreating}
          className={`w-full py-4 rounded-xl font-semibold text-lg mb-6 relative overflow-hidden ${
            !account
              ? 'bg-white/5 text-white/30 cursor-not-allowed'
              : isCreating
              ? 'bg-cyan-500/20 text-cyan-400 cursor-wait'
              : 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
          }`}
        >
          {isCreating ? (
            <span className="flex items-center justify-center gap-2">
              <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                ◈
              </motion.span>
              Creating Vault...
            </span>
          ) : (
            '▶ Create My Vault'
          )}
        </motion.button>

        {/* Deposit Section */}
        <div className="mb-4 p-4 rounded-xl bg-white/5 border border-cyan-500/20">
          <h3 className="text-white font-semibold mb-3">💰 Deposit USDC</h3>
          <div className="flex gap-3">
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
              placeholder="50"
              min="1"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={depositToVault}
              disabled={!account || isDepositing}
              className={`px-6 py-2 rounded-xl text-sm font-medium ${
                !account || isDepositing
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
              }`}
            >
              {isDepositing ? '◈ Depositing...' : 'Deposit'}
            </motion.button>
          </div>
        </div>

        {/* Vault Logs */}
        <div className="bg-black/40 rounded-xl p-4 h-64 overflow-y-auto">
          <h3 className="text-sm font-medium text-white/60 mb-3">Activity Log</h3>
          <div className="space-y-2 font-mono text-sm">
            {logs.map((log, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-white/80"
              >
                {log}
              </motion.p>
            ))}
            {isCreating && (
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="text-cyan-400"
              >
                ▊
              </motion.span>
            )}
          </div>
        </div>
      </div>

      {/* Vault Info */}
      <div className="space-y-6">
        <div className="glass-card p-6 border border-cyan-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">How It Works</h3>
          <div className="space-y-3 text-sm text-white/60">
            <p>1. <span className="text-cyan-400">Create your vault</span> with a weekly budget</p>
            <p>2. <span className="text-cyan-400">Deposit USDC</span> into your vault</p>
            <p>3. <span className="text-cyan-400">AI Agent</span> executes purchases automatically</p>
            <p>4. Track spending in <span className="text-purple-400">real-time</span></p>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Wallet Info</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Address</span>
              <span className="text-cyan-400 font-mono text-xs">
                {account?.address ? `${account.address.slice(0, 8)}...${account.address.slice(-6)}` : 'Not Connected'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Status</span>
              <span className={account ? 'text-green-400' : 'text-red-400'}>
                {account ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { motion } from 'framer-motion';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useSuiClient } from '@mysten/dapp-kit';
import { useEffect, useState } from 'react';

interface VaultData {
  balance: number;
  weeklyBudget: number;
  spentThisWeek: number;
  hasVault: boolean;
}

export function VaultCard() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const [vaultData, setVaultData] = useState<VaultData>({
    balance: 0,
    weeklyBudget: 100,
    spentThisWeek: 0,
    hasVault: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchVaultData() {
      if (!account) {
        setVaultData({
          balance: 0,
          weeklyBudget: 100,
          spentThisWeek: 0,
          hasVault: false,
        });
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

        let found = false;
        for (const obj of objects.data || []) {
          const data = obj.data;
          if (!data) continue;

          const typeStr = data.type || '';
          if (typeStr.includes('CustomerVaultWithSubs')) {
            if (data.content && data.content.dataType === 'moveObject') {
              const fields = data.content.fields as any;
              const vault = fields.vault?.fields || fields.vault || {};
              const balance = vault.balance?.value || vault.balance || 0;
              const weeklyBudget = vault.weekly_budget || vault.weeklyBudget || 100_000_000;
              const spentThisWeek = vault.spent_this_week || vault.spentThisWeek || 0;

              setVaultData({
                balance: Number(balance) / 1_000_000,
                weeklyBudget: Number(weeklyBudget) / 1_000_000,
                spentThisWeek: Number(spentThisWeek) / 1_000_000,
                hasVault: true,
              });
              found = true;
              break;
            }
          }
        }

        if (!found) {
          setVaultData({
            balance: 0,
            weeklyBudget: 100,
            spentThisWeek: 0,
            hasVault: false,
          });
        }
      } catch (err) {
        console.error('Error fetching vault:', err);
        setVaultData({
          balance: 0,
          weeklyBudget: 100,
          spentThisWeek: 0,
          hasVault: false,
        });
      }
      setIsLoading(false);
    }

    fetchVaultData();
  }, [account?.address, client]);

  const { balance, weeklyBudget, spentThisWeek, hasVault } = vaultData;
  const budgetPercent = Math.min((spentThisWeek / weeklyBudget) * 100, 100);
  const healthScore = hasVault ? Math.max(0, 100 - budgetPercent) : 0;

  return (
    <div className="glass-card p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-full blur-3xl" />

      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
              <span className="text-2xl">💎</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Your Vault</h2>
              <p className="text-xs text-cyan-400/60">USDC Balance</p>
            </div>
          </div>
          <div className="text-right">
            {isLoading ? (
              <motion.p className="text-3xl font-bold text-white animate-pulse">
                ...
              </motion.p>
            ) : (
              <motion.p
                className="text-3xl font-bold text-white"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
              >
                {balance.toFixed(2)}
              </motion.p>
            )}
            <p className="text-sm text-cyan-400">USDC</p>
          </div>
        </div>

        {/* Weekly Budget Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/60">Weekly Budget</span>
            <span className="text-white">
              {spentThisWeek.toFixed(2)} / {weeklyBudget.toFixed(2)} USDC
            </span>
          </div>
          <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${budgetPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
            <div className="absolute inset-0 shimmer" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/5 text-center">
            <p className="text-2xl font-bold text-cyan-400">{hasVault ? '1' : '0'}</p>
            <p className="text-xs text-white/60">Active Vault</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 text-center">
            <p className="text-2xl font-bold text-purple-400">
              {(weeklyBudget - spentThisWeek).toFixed(2)}
            </p>
            <p className="text-xs text-white/60">Remaining</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 text-center">
            <p className="text-2xl font-bold text-green-400">{hasVault ? healthScore.toFixed(0) : '0'}%</p>
            <p className="text-xs text-white/60">Health Score</p>
          </div>
        </div>

        {/* Sync Info */}
        <div className="mt-4 flex items-center justify-between text-xs text-white/40">
          <span>{hasVault ? 'Live on-chain data' : 'No vault found - create one'}</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Synced
          </span>
        </div>

        {!account && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]/80 rounded-2xl">
            <p className="text-white/60">Connect wallet to view vault</p>
          </div>
        )}
      </div>
    </div>
  );
}
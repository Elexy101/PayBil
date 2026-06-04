'use client';

import { motion } from 'framer-motion';
import { WalletButton } from './WalletButton';
import { VaultCard } from './VaultCard';
import { VaultPanel } from './VaultPanel';
import { ProductGrid } from './ProductGrid';
import { AIPanel } from './AIPanel';
import { SubscriptionManager } from './SubscriptionManager';
import { AdminPanel } from './AdminPanel';
import { StoreOwnerPanel } from './StoreOwnerPanel';
import { AboutPanel } from './AboutPanel';
import { HelpPanel } from './HelpPanel';
import { useState, useEffect } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { isAdmin, PACKAGE_ID } from '@/lib/sui';

type Tab = 'dashboard' | 'vault' | 'products' | 'store-owner' | 'ai-agent' | 'subscriptions' | 'admin' | 'about' | 'help';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const account = useCurrentAccount();

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '⬡' },
    { id: 'vault', label: 'My Vault', icon: '💎' },
    { id: 'products', label: 'Products', icon: '◇' },
    { id: 'store-owner', label: 'My Store', icon: '🏪' },
    { id: 'ai-agent', label: 'AI Agent', icon: '◈' },
    { id: 'subscriptions', label: 'Subscriptions', icon: '⬟' },
    { id: 'about', label: 'About', icon: 'ℹ️' },
    { id: 'help', label: 'Help', icon: '❓' },
  ];

  if (account && isAdmin(account.address)) {
    tabs.push({ id: 'admin', label: 'Admin', icon: '👑' });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-cyan-500/20 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                <span className="text-xl">◈</span>
              </div>
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 blur opacity-40" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">PayBil</h1>
              <p className="text-xs text-cyan-400/60">Sui Testnet</p>
            </div>
          </div>
          <WalletButton />
        </div>
      </header>

      <nav className="border-b border-white/5 bg-[#0a0a0f]/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-6 py-4 text-sm font-medium transition-all ${
                  activeTab === tab.id ? 'text-cyan-400' : 'text-white/50 hover:text-white/80'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'dashboard' && <DashboardContent />}
        {activeTab === 'vault' && <VaultPanel />}
        {activeTab === 'products' && <ProductGrid />}
        {activeTab === 'ai-agent' && <AIPanel />}
        {activeTab === 'subscriptions' && <SubscriptionManager />}
        {activeTab === 'admin' && <AdminPanel />}
        {activeTab === 'store-owner' && <StoreOwnerPanel />}
        {activeTab === 'about' && <AboutPanel />}
        {activeTab === 'help' && <HelpPanel />}
      </main>
    </div>
  );
}

function DashboardContent() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <VaultCard />
        <OnChainActivity />
      </div>
      <div className="space-y-6">
        <LiveStats />
        <AIBrief />
      </div>
    </div>
  );
}

function OnChainActivity() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      if (!account) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Get owned objects to show recent activity
        const objects = await client.getOwnedObjects({
          owner: account.address,
          options: { showContent: true, showType: true },
        });

        // Use objects as activity for now (recent on-chain interactions)
        setActivities(objects.data || []);
      } catch (err) {
        console.error('Error fetching activities:', err);
      }
      setIsLoading(false);
    }

    fetchActivities();
  }, [account?.address, client]);

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-white mb-4">On-Chain Objects</h3>
      {isLoading ? (
        <div className="text-center py-4 text-white/50">Loading...</div>
      ) : activities.length === 0 ? (
        <div className="text-center py-4 text-white/50">No objects found. Create a vault first.</div>
      ) : (
        <div className="space-y-4">
          {activities.slice(0, 5).map((obj: any, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-4 p-3 rounded-xl bg-white/5"
            >
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">📦</div>
              <div className="flex-1">
                <p className="text-sm text-white">{obj.data?.type?.split('::').pop() || 'Object'}</p>
                <p className="text-xs text-white/40">{obj.data?.objectId?.slice(0, 12)}...</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-green-400">On-Chain</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function LiveStats() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const [vaultData, setVaultData] = useState<any>(null);

  useEffect(() => {
    async function fetchVault() {
      if (!account) return;

      try {
        const objects = await client.getOwnedObjects({
          owner: account.address,
          options: { showContent: true, showType: true },
        });

        for (const obj of objects.data || []) {
          const data = obj.data;
          if (!data) continue;
          if (data.type?.includes('CustomerVaultWithSubs')) {
            if (data.content?.dataType === 'moveObject') {
              const fields = data.content.fields as any;
              const vault = fields.vault?.fields || fields.vault || {};
              setVaultData({
                balance: (vault.balance?.value || vault.balance || 0) / 1_000_000,
                spent: (vault.spent_this_week || vault.spentThisWeek || 0) / 1_000_000,
                budget: (vault.weekly_budget || vault.weeklyBudget || 100_000_000) / 1_000_000,
              });
              return;
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    fetchVault();
  }, [account?.address, client]);

  const balance = vaultData?.balance || 0;
  const spent = vaultData?.spent || 0;
  const budget = vaultData?.budget || 100;

  return (
    <div className="glass-card p-6 space-y-4">
      <h3 className="text-lg font-semibold text-white">Live Stats</h3>
      <div className="flex justify-between">
        <span className="text-sm text-white/60">Vault Balance</span>
        <span className="text-sm font-medium text-white">{balance.toFixed(2)} USDC</span>
      </div>
      <div className="flex justify-between">
        <span className="text-sm text-white/60">Weekly Spent</span>
        <span className="text-sm font-medium text-white">{spent.toFixed(2)} USDC</span>
      </div>
      <div className="flex justify-between">
        <span className="text-sm text-white/60">Remaining</span>
        <span className="text-sm font-medium text-cyan-400">{(budget - spent).toFixed(2)} USDC</span>
      </div>
    </div>
  );
}

function AIBrief() {
  const account = useCurrentAccount();

  return (
    <div className="glass-card p-6 border border-purple-500/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <span className="text-xl">🤖</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">AI Agent</h3>
          <p className="text-xs text-purple-400">{account ? 'Active & Monitoring' : 'Connect wallet to start'}</p>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-white/60">Tasks Today</span>
          <span className="text-white">0</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/60">Budget Used</span>
          <span className="text-cyan-400">0%</span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full w-[0%] bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" />
        </div>
        <div className="pt-3 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-cyan-400">
            <span className="text-lg">🗄️</span>
            <span>Walrus Storage Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { motion } from 'framer-motion';
import { PACKAGE_ID } from '@/lib/sui';

export function AboutPanel() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
            <span className="text-3xl">◈</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">PayBil</h1>
            <p className="text-cyan-400">AI-Powered Payment System on Sui</p>
          </div>
        </div>

        <div className="space-y-6 text-white/80">
          <div>
            <h3 className="text-xl font-semibold text-white mb-3">What is PayBil?</h3>
            <p>
              PayBil is a next-generation AI agent payment system built on Sui blockchain.
              It enables automated recurring payments and subscriptions with smart budget management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl bg-white/5">
              <h4 className="text-lg font-semibold text-cyan-400 mb-2">💎 Automated Vault</h4>
              <p className="text-sm text-white/60">
                Create a vault with weekly budget limits. The AI agent manages your spending automatically.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/5">
              <h4 className="text-lg font-semibold text-purple-400 mb-2">🤖 AI Agent</h4>
              <p className="text-sm text-white/60">
                The AI agent executes weekly purchases on your behalf based on your subscriptions.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/5">
              <h4 className="text-lg font-semibold text-green-400 mb-2">📦 Subscriptions</h4>
              <p className="text-sm text-white/60">
                Subscribe to products and the AI agent ensures timely recurring purchases.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/5">
              <h4 className="text-lg font-semibold text-amber-400 mb-2">🔐 Secure</h4>
              <p className="text-sm text-white/60">
                Built on Sui blockchain with smart contract security and wallet-based authentication.
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="text-lg font-semibold text-white mb-3">Contract Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Package ID</span>
                <span className="text-purple-400 font-mono text-xs">{PACKAGE_ID}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Network</span>
                <span className="text-cyan-400">Sui Testnet</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Framework</span>
                <span className="text-cyan-400">Move Language</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
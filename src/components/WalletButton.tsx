'use client';

import { ConnectButton, useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import { formatAddress } from '@/lib/sui';
import { motion } from 'framer-motion';

export function WalletButton() {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();

  if (!account) {
    return (
      <div className="relative group">
        <ConnectButton className="martian-connect-button" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-3"
    >
      <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30">
        <span className="text-xs text-cyan-400 mr-2">🟠 Martian</span>
        <span className="font-mono text-sm text-white">{formatAddress(account.address)}</span>
      </div>
      <button
        onClick={() => disconnect()}
        className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-all"
      >
        Disconnect
      </button>
    </motion.div>
  );
}
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { PACKAGE_ID, CLOCK_ADDRESS, WALRUS_PUBLISHER_URL } from '@/lib/sui';
import { OnChainProduct, getAllProducts } from '@/lib/products';

function formatUsdc(amount: number): string {
  return (amount / 1_000_000).toFixed(2);
}

interface AIRecommendation {
  id: string;
  product: OnChainProduct;
  quantity: number;
  reasoning: string;
  confidence: number;
  status: 'pending' | 'confirmed' | 'executed';
  timestamp: Date;
  blobId?: string;
  estimatedCost: number;
}

export function AIPanel() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();

  const [vaultId, setVaultId] = useState<string | null>(null);
  const [agentCapId, setAgentCapId] = useState<string | null>(null);
  const [agentAddress, setAgentAddress] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isStoring, setIsStoring] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    '🤖 AI Agent initialized',
    '📦 Package: ' + PACKAGE_ID.slice(0, 10) + '...',
    '🗄️ Using Walrus for decision storage',
  ]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<AIRecommendation | null>(null);
  const [availableProducts, setAvailableProducts] = useState<OnChainProduct[]>([]);

  // Query all required objects from chain
  useEffect(() => {
    async function fetchObjects() {
      if (!account) {
        setLogs(['❌ No wallet connected']);
        return;
      }

      setLogs(prev => [...prev, '🔄 Querying on-chain objects...']);

      try {
        const objects = await client.getOwnedObjects({
          owner: account.address,
          options: { showContent: true, showType: true },
        });

        let foundVaultId: string | null = null;
        let foundAgentCapId: string | null = null;

        for (const obj of objects.data || []) {
          const data = obj.data;
          if (!data) continue;
          const typeStr = data.type || '';

          if (typeStr.includes('CustomerVaultWithSubs')) {
            foundVaultId = data.objectId;
          }
          if (typeStr.includes('CustomerAgentCap')) {
            foundAgentCapId = data.objectId;
          }
        }

        setVaultId(foundVaultId);
        setAgentCapId(foundAgentCapId);

        const newLogs: string[] = [];

        if (foundVaultId) {
          newLogs.push(`✅ Vault found: ${foundVaultId.slice(0, 8)}...`);
        } else {
          newLogs.push('⚠️ No vault found - create one first');
        }

        if (foundAgentCapId) {
          newLogs.push(`✅ AgentCap found: ${foundAgentCapId.slice(0, 8)}...`);
        } else {
          newLogs.push('⚠️ No AgentCap - grant one to AI agent');
        }

        newLogs.push('🗄️ Walrus: Ready for decision storage');
        setLogs(newLogs);
      } catch (err: any) {
        setLogs([`❌ Error: ${err.message}`]);
      }
    }

    fetchObjects();
  }, [account?.address, client]);

  // Fetch on-chain products for AI analysis
  useEffect(() => {
    async function fetchOnChainProducts() {
      try {
        const products = await getAllProducts(client);
        setAvailableProducts(products);
        if (products.length > 0) {
          setLogs(prev => [...prev, `📦 Found ${products.length} products on-chain`]);
        }
      } catch (e) {
        console.error('Error fetching products:', e);
      }
    }

    fetchOnChainProducts();
  }, [client]);

  const grantAgentCapability = async () => {
    if (!account || !vaultId) {
      setLogs(prev => [...prev, '❌ No vault found']);
      return;
    }

    if (!agentAddress) {
      setLogs(prev => [...prev, '❌ Enter AI agent address']);
      return;
    }

    setIsGranting(true);
    setLogs(prev => [...prev, '🔄 Granting agent capability...']);

    try {
      const tx = new TransactionBlock();

      tx.moveCall({
        target: `${PACKAGE_ID}::payment_vault::grant_customer_agent`,
        arguments: [
          tx.object(vaultId),
          tx.pure(agentAddress, 'address'),
          tx.pure(1_000_000_000, 'u64'), // 1 USDC allowed
        ],
      });

      signAndExecute(
        { transactionBlock: tx, chain: 'sui:testnet' },
        {
          onSuccess: (result) => {
            setLogs(prev => [
              ...prev,
              '✅ Agent capability granted!',
              `🔗 TX: ${result.digest.slice(0, 12)}...`,
              `🤖 AI Agent: ${agentAddress.slice(0, 8)}...`,
            ]);
            setIsGranting(false);
          },
          onError: (error) => {
            setLogs(prev => [...prev, `⚠️ TX Failed: ${error.message}`]);
            setIsGranting(false);
          },
        }
      );
    } catch (error: any) {
      setLogs(prev => [...prev, `⚠️ Error: ${error.message}`]);
      setIsGranting(false);
    }
  };

  const storeDecisionOnWalrus = async (rec: AIRecommendation): Promise<string> => {
    setIsStoring(true);
    setLogs(prev => [...prev, '🔄 Storing decision on Walrus...']);

    try {
      const decisionData = {
        recommendation_id: rec.id,
        customer: account?.address,
        product_id: rec.product.id,
        product_name: rec.product.name,
        store_owner: rec.product.storeOwner,
        price: rec.product.price,
        quantity: rec.quantity,
        reasoning: rec.reasoning,
        confidence: rec.confidence,
        estimated_cost: rec.estimatedCost,
        timestamp: rec.timestamp.toISOString(),
        status: 'pending',
      };

      const jsonString = JSON.stringify(decisionData);
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(jsonString);

      setLogs(prev => [...prev, `📝 Uploading ${dataBytes.length} bytes to Walrus...`]);

      // Try multiple Walrus endpoints
      const endpoints = [
        'https://walrus-testnet.publisher.walrus.org/v1/store',
        'https://walrus-testnet.aggregator.walrus.org/v1/store',
        'https://publisher.walrus-testnet.walrus.io/v1/store',
      ];

      let blobId: string | null = null;
      let lastError: string = '';

      for (const endpoint of endpoints) {
        setLogs(prev => [...prev, `🔄 Trying: ${endpoint.slice(0, 40)}...`]);
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: jsonString,
          });

          if (response.ok) {
            const blobInfo = await response.json();
            blobId = blobInfo.blobId || blobInfo.blob_id || blobInfo.id || blobInfo.newlyCreated?.blob?.id;
            if (blobId) {
              setLogs(prev => [...prev, `✅ Stored on Walrus!`]);
              break;
            }
          } else {
            lastError = `${response.status}: ${response.statusText}`;
          }
        } catch (e: any) {
          lastError = e.message;
        }
      }

      if (!blobId) {
        // If Walrus fails, continue without blob storage - use local tracking
        setLogs(prev => [...prev, `⚠️ Walrus unavailable (${lastError}), continuing without blob storage`]);
        setIsStoring(false);
        return `local_${rec.id}`; // Return local ID as fallback
      }

      setLogs(prev => [
        ...prev,
        `✅ Decision stored on Walrus!`,
        `🆔 Blob ID: ${blobId.slice(0, 16)}...`,
      ]);

      setIsStoring(false);
      return blobId;
    } catch (error: any) {
      setLogs(prev => [...prev, `⚠️ Walrus error: ${error.message}`]);
      setIsStoring(false);
      throw error;
    }
  };

  const executePurchase = async (rec: AIRecommendation, blobId: string) => {
    if (!account || !vaultId || !agentCapId) {
      setLogs(prev => [...prev, `❌ Missing: vault=${!!vaultId}, cap=${!!agentCapId}`]);
      return;
    }

    if (!rec.product.storeOwner || rec.product.storeOwner.length < 10) {
      setLogs(prev => [...prev, '❌ Invalid store owner address']);
      return;
    }

    if (!rec.product.id || rec.product.id.length < 10) {
      setLogs(prev => [...prev, '❌ Invalid product ID']);
      return;
    }

    if (rec.estimatedCost <= 0) {
      setLogs(prev => [...prev, '❌ Invalid amount']);
      return;
    }

    setIsExecuting(true);
    setLogs(prev => [
      ...prev,
      `🔄 Executing purchase for ${rec.product.name}...`,
      `💰 Amount: ${rec.estimatedCost} USDC (${formatUsdc(rec.estimatedCost)})`,
      `🏪 Store: ${rec.product.storeOwner.slice(0, 10)}...`,
      `📦 Product: ${rec.product.id.slice(0, 10)}...`,
    ]);

    try {
      const tx = new TransactionBlock();

      // Clean addresses - ensure they start with 0x
      const storeAddr = rec.product.storeOwner.startsWith('0x')
        ? rec.product.storeOwner
        : `0x${rec.product.storeOwner}`;
      const productAddr = rec.product.id.startsWith('0x')
        ? rec.product.id
        : `0x${rec.product.id}`;

      tx.moveCall({
        target: `${PACKAGE_ID}::payment_vault::execute_weekly_purchase`,
        arguments: [
          tx.object(vaultId),
          tx.object(agentCapId),
          tx.pure(storeAddr, 'address'),
          tx.pure(rec.estimatedCost, 'u64'),
          tx.pure(productAddr, 'address'),
          tx.object(CLOCK_ADDRESS),
        ],
      });

      signAndExecute(
        { transactionBlock: tx, chain: 'sui:testnet' },
        {
          onSuccess: (result) => {
            setLogs(prev => [
              ...prev,
              '💰 Payment executed!',
              `✅ ${rec.product.name} purchased`,
              `🔗 TX: ${result.digest.slice(0, 12)}...`,
            ]);
            setIsExecuting(false);

            setRecommendations(prev =>
              prev.map(r =>
                r.id === rec.id ? { ...r, status: 'executed', blobId } : r
              )
            );
          },
          onError: (error) => {
            setLogs(prev => [
              ...prev,
              `⚠️ TX Failed: ${error.message}`,
              '💡 Check: vault balance, AgentCap, product exists',
            ]);
            setIsExecuting(false);
          },
        }
      );
    } catch (error: any) {
      setLogs(prev => [...prev, `⚠️ Error: ${error.message}`]);
      setIsExecuting(false);
    }
  };

  const generateAIRecommendations = async () => {
    if (availableProducts.length === 0) {
      setLogs(prev => [...prev, '⚠️ No products available for recommendation']);
      return;
    }

    setIsGenerating(true);
    setLogs(prev => [...prev, '🤖 AI analyzing products...']);

    try {
      // Simulate AI analysis - in production this would call an AI API
      const selectedProducts = availableProducts
        .filter(p => p.isActive && p.availableQuantity > 0)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      const newRecommendations: AIRecommendation[] = selectedProducts.map(product => {
        const quantity = Math.min(
          Math.floor(Math.random() * 3) + 1,
          product.availableQuantity
        );
        const estimatedCost = product.price * quantity;

        return {
          id: `rec_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          product,
          quantity,
          reasoning: `Based on your subscription preferences, ${product.name} from ${
            product.storeOwner.slice(0, 8)
          } is recommended. Price: ${formatUsdc(product.price)} USDC, Location: ${
            product.location
          }. Confidence: ${Math.floor(Math.random() * 20) + 80}%`,
          confidence: Math.floor(Math.random() * 20) + 80,
          status: 'pending',
          timestamp: new Date(),
          estimatedCost,
        };
      });

      setRecommendations(prev => [...prev, ...newRecommendations]);
      setLogs(prev => [
        ...prev,
        `✅ Generated ${newRecommendations.length} recommendations`,
        ...newRecommendations.map(r => `📦 ${r.product.name} - ${formatUsdc(r.estimatedCost)} USDC`),
      ]);
    } catch (error: any) {
      setLogs(prev => [...prev, `⚠️ Error: ${error.message}`]);
    }

    setIsGenerating(false);
  };

  const openRecommendationModal = (rec: AIRecommendation) => {
    setSelectedRecommendation(rec);
    setShowDecisionModal(true);
  };

  const confirmAndExecute = async () => {
    if (!selectedRecommendation) return;

    setShowDecisionModal(false);

    try {
      const blobId = await storeDecisionOnWalrus(selectedRecommendation);
      await executePurchase(selectedRecommendation, blobId);
    } catch (error) {
      setLogs(prev => [...prev, `❌ Failed: ${error}`]);
    }
  };

  const pendingCount = recommendations.filter(r => r.status === 'pending').length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
              {isExecuting && (
                <motion.div
                  className="absolute -inset-1 rounded-xl border-2 border-purple-500"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AI Agent Control</h2>
              <p className="text-sm text-purple-400">Daily Purchase Recommendations</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            isExecuting
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              : vaultId
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {isExecuting ? '⚡ Executing...' : vaultId ? '✅ Ready' : '⚠️ Missing Objects'}
          </div>
        </div>

        {/* Grant Agent Capability Section */}
        <div className="mb-6 p-4 rounded-xl bg-white/5 border border-purple-500/20">
          <h3 className="text-white font-semibold mb-3">🔐 Grant AI Agent Capability</h3>
          <p className="text-sm text-white/50 mb-3">
            Authorize an AI agent to execute purchases on your behalf.
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={agentAddress}
              onChange={(e) => setAgentAddress(e.target.value)}
              placeholder="0xAI Agent Address..."
              className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={grantAgentCapability}
              disabled={!account || !vaultId || !agentAddress || isGranting}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${
                !account || !vaultId || !agentAddress
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : isGranting
                  ? 'bg-purple-500/20 text-purple-400 cursor-wait'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              }`}
            >
              {isGranting ? '◈ Granting...' : '✅ Grant'}
            </motion.button>
          </div>
        </div>

        {/* Walrus Decision Panel */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🗄️</span>
            <div>
              <h3 className="text-white font-semibold">Recommendation Stats</h3>
              <p className="text-sm text-white/50">AI decisions stored on Walrus</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center p-3 rounded-lg bg-white/5">
              <p className="text-2xl font-bold text-cyan-400">{recommendations.length}</p>
              <p className="text-xs text-white/50">Total</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5">
              <p className="text-2xl font-bold text-green-400">
                {recommendations.filter(r => r.status === 'executed').length}
              </p>
              <p className="text-xs text-white/50">Executed</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5">
              <p className="text-2xl font-bold text-purple-400">{pendingCount}</p>
              <p className="text-xs text-white/50">Pending</p>
            </div>
          </div>
        </div>

        {/* Run AI Agent Button - Daily Recommendations */}
        <motion.button
          initial={{ scale: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={generateAIRecommendations}
          disabled={!account || !vaultId || availableProducts.length === 0 || isGenerating}
          className={`w-full py-4 rounded-xl font-semibold text-lg mb-6 relative overflow-hidden ${
            !vaultId || availableProducts.length === 0
              ? 'bg-white/5 text-white/30 cursor-not-allowed'
              : isGenerating
              ? 'bg-purple-500/20 text-purple-400 cursor-wait'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
          }`}
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                ◈
              </motion.span>
              Analyzing Products...
            </span>
          ) : (
            <>
              <span className="mr-2">🤖</span>
              Generate Daily Recommendations
            </>
          )}
        </motion.button>

        {/* Pending Recommendations List */}
        {pendingCount > 0 && (
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-3">📋 Pending Recommendations</h3>
            <div className="space-y-3">
              {recommendations
                .filter(r => r.status === 'pending')
                .map(rec => (
                  <motion.div
                    key={rec.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 rounded-xl bg-white/5 border border-purple-500/20"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{rec.product.name}</p>
                        <p className="text-sm text-white/50">
                          {formatUsdc(rec.product.price)} USDC x {rec.quantity} = {formatUsdc(rec.estimatedCost)} USDC
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-purple-400">{rec.confidence}% confidence</span>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => openRecommendationModal(rec)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium"
                        >
                          Review & Sign
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>
          </div>
        )}

        {/* Activity Log */}
        <div className="bg-black/40 rounded-xl p-4 h-64 overflow-y-auto">
          <h3 className="text-sm font-medium text-white/60 mb-3">Activity Log</h3>
          <div className="space-y-2 font-mono text-sm">
            {logs.map((log, i) => (
              <motion.p key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-white/80">
                {log}
              </motion.p>
            ))}
            {(isExecuting || isStoring) && (
              <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.5, repeat: Infinity }} className="text-cyan-400">
                ▊
              </motion.span>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Object Status */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Object Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Vault</span>
              <span className={vaultId ? 'text-green-400' : 'text-red-400'}>
                {vaultId ? 'Found' : 'Missing'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">AgentCap</span>
              <span className={agentCapId ? 'text-green-400' : 'text-yellow-400'}>
                {agentCapId ? 'Granted' : 'Not Granted'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Products</span>
              <span className="text-cyan-400">{availableProducts.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Pending</span>
              <span className="text-purple-400">{pendingCount}</span>
            </div>
          </div>
        </div>

        {/* Daily Flow Info */}
        <div className="glass-card p-6 border border-cyan-500/20">
          <h3 className="text-lg font-semibold text-white mb-3">📅 Daily AI Flow</h3>
          <div className="space-y-2 text-sm text-white/70">
            <p>1. AI analyzes your subscriptions</p>
            <p>2. Generates purchase recommendations</p>
            <p>3. You review and sign each</p>
            <p>4. Transaction executes on-chain</p>
          </div>
        </div>

        {/* Recent Decisions */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Decisions</h3>
          <div className="space-y-3">
            {recommendations.slice(-3).reverse().map((rec) => (
              <div key={rec.id} className="p-3 rounded-lg bg-white/5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-white font-medium">{rec.product.name}</p>
                    <p className="text-xs text-white/50">x{rec.quantity}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    rec.status === 'executed'
                      ? 'bg-green-500/20 text-green-400'
                      : rec.status === 'confirmed'
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {rec.status}
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-xs">
                  <span className="text-white/40">{formatUsdc(rec.estimatedCost)} USDC</span>
                  <span className="text-cyan-400">{rec.confidence}%</span>
                </div>
              </div>
            ))}
            {recommendations.length === 0 && (
              <p className="text-sm text-white/40 text-center py-4">No recommendations yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Decision Modal */}
      <AnimatePresence>
        {showDecisionModal && selectedRecommendation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDecisionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 max-w-lg w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-2xl">🤖</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">AI Recommendation</h3>
                  <p className="text-sm text-purple-400">Review before signing</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center p-4 rounded-xl bg-white/5">
                  <div>
                    <p className="text-lg font-semibold text-white">{selectedRecommendation.product.name}</p>
                    <p className="text-sm text-white/50">Store: {selectedRecommendation.product.storeOwner.slice(0, 10)}...</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-cyan-400">{formatUsdc(selectedRecommendation.product.price)} USDC</p>
                    <p className="text-xs text-white/50">x{selectedRecommendation.quantity}</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <p className="text-xs text-purple-400 mb-2">AI Reasoning</p>
                  <p className="text-sm text-white/80">{selectedRecommendation.reasoning}</p>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 text-center p-3 rounded-xl bg-white/5">
                    <p className="text-2xl font-bold text-green-400">{selectedRecommendation.confidence}%</p>
                    <p className="text-xs text-white/50">Confidence</p>
                  </div>
                  <div className="flex-1 text-center p-3 rounded-xl bg-white/5">
                    <p className="text-2xl font-bold text-cyan-400">
                      {formatUsdc(selectedRecommendation.estimatedCost)} USDC
                    </p>
                    <p className="text-xs text-white/50">Total Cost</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <p className="text-xs text-cyan-400 mb-1">🗄️ Walrus Storage</p>
                  <p className="text-xs text-white/60">
                    Decision will be stored on Walrus before on-chain execution
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDecisionModal(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium bg-white/5 text-white/70 hover:bg-white/10"
                >
                  Reject
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={confirmAndExecute}
                  disabled={isStoring || isExecuting}
                  className="flex-1 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                >
                  {isStoring ? 'Storing...' : isExecuting ? 'Signing...' : '✅ Sign & Execute'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
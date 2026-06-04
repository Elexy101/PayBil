'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface TooltipProps {
  title: string;
  content: string;
}

function Tooltip({ title, content }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs hover:bg-cyan-500/30 transition-all"
      >
        ?
      </button>
      {show && (
        <div className="absolute left-0 top-full mt-2 w-64 p-3 rounded-xl bg-[#1a1a2e] border border-cyan-500/30 z-50 shadow-xl">
          <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
          <p className="text-xs text-white/60">{content}</p>
        </div>
      )}
    </div>
  );
}

const CLI_COMMANDS = {
  // Step 1: Publish Package
  publish: `sui client publish --path . --gas-budget 10000000`,

  // Step 2: Whitelist Store (Admin Only)
  whitelistStore: `sui client call \\
  --package $PACKAGE_ID \\
  --module admin_registry \\
  --function whitelist_store \\
  --args \\
    "0xStoreOwnerAddress" \\
    "\\"FreshMart\\"" \\
    "\\"Downtown\\"" \\
    "0xStoreAIAgentAddress" \\
  --gas-budget 10000000`,

  // Step 3: List Product
  listProduct: `sui client call \\
  --package $PACKAGE_ID \\
  --module product_listing \\
  --function list_product \\
  --args \\
    "0xProductCatalogID" \\
    "0xStoreRegistryID" \\
    "\\"SKU123\\"" \\
    "\\"Organic Milk\\"" \\
    "\\"Fresh organic milk\\"" \\
    499 \\
    "\\"dairy\\"" \\
    "\\"🥛\\"" \\
    "\\"Downtown\\"" \\
    100 \\
  --gas-budget 10000000`,

  // Step 4: Create Customer Vault
  createVault: `sui client call \\
  --package $PACKAGE_ID \\
  --module payment_vault \\
  --function create_vault \\
  --args 5000000 \\
  --gas-budget 10000000`,

  // Step 5: Deposit USDC
  deposit: `sui client call \\
  --package $PACKAGE_ID \\
  --module payment_vault \\
  --function deposit \\
  --args "0xYourVaultID" "0xUSCCoinID" \\
  --type-args "0x2::usdc::USDC" \\
  --gas-budget 10000000`,

  // Step 6: Add Subscription
  addSubscription: `sui client call \\
  --package $PACKAGE_ID \\
  --module payment_vault \\
  --function add_subscription \\
  --args "0xYourVaultID" "0xProductID" 2 \\
  --gas-budget 10000000`,

  // Step 7: Grant Agent Capability
  grantAgent: `sui client call \\
  --package $PACKAGE_ID \\
  --module payment_vault \\
  --function grant_customer_agent \\
  --args "0xYourVaultID" "0xAIAgentAddress" 1000000 \\
  --gas-budget 10000000`,

  // Step 8: Execute Weekly Purchase (AI Agent)
  executePurchase: `sui client call \\
  --package $PACKAGE_ID \\
  --module payment_vault \\
  --function execute_weekly_purchase \\
  --args \\
    "0xYourVaultID" \\
    "0xCustomerAgentCapID" \\
    "0xDeepBookPoolID" \\
    "0x6" \\
  --type-args "0x2::usdc::USDC" \\
  --gas-budget 10000000`,
};

export function HelpPanel() {
  const [activeSection, setActiveSection] = useState<'guide' | 'cli' | 'faq'>('guide');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Section Tabs */}
      <div className="flex gap-2">
        {(['guide', 'cli', 'faq'] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeSection === section
                ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {section === 'guide' ? '📖 User Guide' : section === 'cli' ? '💻 CLI Commands' : '❓ FAQ'}
          </button>
        ))}
      </div>

      {/* User Guide */}
      {activeSection === 'guide' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8"
        >
          <h2 className="text-2xl font-bold text-white mb-6">PayBil User Guide</h2>

          <div className="space-y-8">
            {/* Getting Started */}
            <div>
              <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                🚀 Getting Started
              </h3>
              <div className="space-y-4">
                <HelpStep
                  number="1"
                  title="Connect Your Wallet"
                  content="Click 'Connect Wallet' button and select Martian Wallet. Make sure you have some SUI tokens on testnet."
                  tooltip="You need SUI tokens on testnet for gas fees. Get them from the Sui testnet faucet."
                />
                <HelpStep
                  number="2"
                  title="Create Your Vault"
                  content="Go to 'My Vault' tab and create a vault with your weekly budget limit."
                  tooltip="The vault holds your USDC and tracks your weekly spending. You can deposit more anytime."
                />
                <HelpStep
                  number="3"
                  title="Deposit USDC"
                  content="Deposit USDC tokens into your vault for automated payments."
                  tooltip="Without USDC in your vault, the AI agent cannot execute purchases."
                />
              </div>
            </div>

            {/* AI Agent */}
            <div>
              <h3 className="text-lg font-semibold text-purple-400 mb-4 flex items-center gap-2">
                🤖 AI Agent Setup
              </h3>
              <div className="space-y-4">
                <HelpStep
                  number="4"
                  title="Grant AI Agent Permission"
                  content="Go to AI Agent tab and grant permission to an AI agent address to execute purchases on your behalf."
                  tooltip="The CustomerAgentCap is a capability object that authorizes a specific AI agent address to execute purchases. Without this, the AI cannot spend your funds."
                />
                <HelpStep
                  number="5"
                  title="Execute Weekly Purchase"
                  content="Click 'Fetch DeepBook Pool' first, then execute the weekly purchase."
                  tooltip="The AI needs the DeepBook pool ID to route payments through for MEV protection."
                />
              </div>
            </div>

            {/* DeepBook Pools */}
            <div>
              <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                🏊 DeepBook Pools (Testnet)
              </h3>
              <div className="p-4 rounded-xl bg-white/5 border border-green-500/20">
                <div className="space-y-2 font-mono text-sm">
                  <p className="text-white/60">DEEP_SUI Pool:</p>
                  <p className="text-green-400 text-xs break-all">0x48c95963e9eac37a316b7ae04a0deb761bcdcc2b67912374d6036e7f0e9bae9f</p>
                  <p className="text-white/60 mt-4">SUI_DBUSDC Pool:</p>
                  <p className="text-green-400 text-xs break-all">0x1c19362ca52b8ffd7a33cee805a67d40f31e6ba303753fd3a4cfdfacea7163a5</p>
                  <p className="text-white/60 mt-4">DBUSDT_DBUSDC Pool:</p>
                  <p className="text-green-400 text-xs break-all">0x83970bb02e3636efdff8c141ab06af5e3c9a22e2f74d7f02a9c3430d0d10c1ca</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* CLI Commands */}
      {activeSection === 'cli' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8"
        >
          <h2 className="text-2xl font-bold text-white mb-6">Complete Flow CLI Commands</h2>
          <p className="text-white/60 mb-6">
            Use these commands after publishing the package. Replace variables like <span className="text-cyan-400">$PACKAGE_ID</span> with actual values.
          </p>

          <div className="space-y-8">
            <CLICommand
              title="📦 Step 1: Publish Package"
              command={CLI_COMMANDS.publish}
              description="Publish the Move package to testnet"
            />

            <CLICommand
              title="👑 Step 2: Whitelist Store (Admin Only)"
              command={CLI_COMMANDS.whitelistStore}
              description="Admin whitelists a store so it can list products. Requires AdminCap."
            />

            <CLICommand
              title="📋 Step 3: List a Product"
              command={CLI_COMMANDS.listProduct}
              description="Whitelisted store lists a product in the catalog"
            />

            <CLICommand
              title="💎 Step 4: Create Customer Vault"
              command={CLI_COMMANDS.createVault}
              description="Customer creates a vault with weekly budget (5000000 = 5 USDC with 6 decimals)"
            />

            <CLICommand
              title="💰 Step 5: Deposit USDC into Vault"
              command={CLI_COMMANDS.deposit}
              description="Deposit USDC coins into your vault. Get USDC coin ID from: sui client gas"
            />

            <CLICommand
              title="📨 Step 6: Add Subscription"
              command={CLI_COMMANDS.addSubscription}
              description="Add a product subscription to your vault (quantity_per_week = 2)"
            />

            <CLICommand
              title="🔐 Step 7: Grant AI Agent Capability"
              command={CLI_COMMANDS.grantAgent}
              description="Grant an AI agent permission to spend up to allowed_amount from your vault"
            />

            <CLICommand
              title="⚡ Step 8: Execute Weekly Purchase (AI Agent)"
              command={CLI_COMMANDS.executePurchase}
              description="AI agent executes the weekly purchase using CustomerAgentCap"
            />
          </div>

          <div className="mt-8 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
            <h4 className="text-yellow-400 font-semibold mb-2">⚠️ Important Notes</h4>
            <ul className="text-sm text-white/70 space-y-1">
              <li>• The Clock object is at: 0x0000000000000000000000000000000000000000000000000000000000000006</li>
              <li>• USDC type args: 0x2::usdc::USDC (official Sui USDC)</li>
              <li>• Get your objects: sui client objects --owner $ADDRESS</li>
              <li>• Get package ID from publish output</li>
            </ul>
          </div>
        </motion.div>
      )}

      {/* FAQ */}
      {activeSection === 'faq' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8"
        >
          <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            <FAQItem
              question="What is CustomerAgentCap?"
              answer="The CustomerAgentCap is an object that authorizes a specific AI agent address to execute execute_weekly_purchase on the customer's vault. Without this capability, the AI cannot spend the customer's funds."
            />
            <FAQItem
              question="Why do I need Martian Wallet?"
              answer="Martian Wallet is a Sui-native wallet that supports testnet and the @mysten/dapp-kit standard used by this dApp."
            />
            <FAQItem
              question="What happens if my vault runs out of balance?"
              answer="The AI agent will fail to execute purchases until you deposit more USDC."
            />
            <FAQItem
              question="What DeepBook pools are available on testnet?"
              answer="DEEP_SUI, SUI_DBUSDC, DBUSDT_DBUSDC, WAL_SUI, WAL_DBUSDC, DBTC_DBUSDC are available. Check the DeepBook Pools section for pool IDs."
            />
            <FAQItem
              question="Is this on mainnet?"
              answer="No, PayBil is currently running on Sui testnet for testing purposes."
            />
            <FAQItem
              question="How do I get testnet SUI?"
              answer="Use the Sui testnet faucet at https://faucet.testnet.sui.io/"
            />
            <FAQItem
              question="How do I get testnet USDC?"
              answer="You can get USDC from the Sui testnet faucet or swap SUI to USDC via DeepBook."
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}

function CLICommand({ title, command, description }: { title: string; command: string; description: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h4 className="text-white font-semibold">{title}</h4>
      </div>
      <p className="text-sm text-white/50">{description}</p>
      <div className="relative">
        <pre className="bg-black/60 rounded-xl p-4 overflow-x-auto text-sm">
          <code className="text-cyan-400 whitespace-pre-wrap">{command}</code>
        </pre>
        <button
          onClick={copyToClipboard}
          className="absolute top-2 right-2 px-3 py-1 rounded-lg bg-white/10 text-white/60 text-xs hover:bg-white/20 transition-all"
        >
          {copied ? '✅ Copied' : '📋 Copy'}
        </button>
      </div>
    </div>
  );
}

function HelpStep({ number, title, content, tooltip }: { number: string; title: string; content: string; tooltip: string }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5">
      <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold flex-shrink-0">
        {number}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="text-white font-medium">{title}</h4>
          <Tooltip title="Tip" content={tooltip} />
        </div>
        <p className="text-sm text-white/60 mt-1">{content}</p>
      </div>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-all"
      >
        <span className="text-white font-medium">{question}</span>
        <span className="text-cyan-400">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-4 py-3 bg-white/5 border-t border-white/10">
          <p className="text-sm text-white/60">{answer}</p>
        </div>
      )}
    </div>
  );
}
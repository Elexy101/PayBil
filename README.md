# PayBil - AI-Powered Grocery Shopping on Sui

![Sui](https://img.shields.io/badge/Sui-Network-purple?style=for-the-badge)
![Walrus](https://img.shields.io/badge/Walrus-Storage-cyan?style=for-the-badge)

> Decentralized grocery shopping with AI agents that buy for you automatically every week.

## Overview

PayBil is a dApp that lets you:
- **Subscribe** to your favorite products from whitelisted stores
- **Deposit USDC** into your vault with weekly spending limits
- **AI Agent** monitors prices and executes weekly purchases
- **All decisions** stored immutably on Walrus blob storage

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Store Owner   │     │    Customer     │     │    AI Agent    │
│  Lists Products │────▶│  Subscribes     │────▶│ Analyzes Daily │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                        │
                               ▼                        ▼
                    ┌─────────────────┐     ┌─────────────────┐
                    │  Payment Vault  │     │  Executes on    │
                    │   (USDC)        │◀────│  Walrus TX      │
                    └─────────────────┘     └─────────────────┘
```

## Smart Contracts

| Contract | Purpose |
|----------|---------|
| `admin_registry` | Whitelist stores, admin capabilities |
| `product_listing` | Product catalog, creation, management |
| `payment_vault` | Customer vault, subscriptions, AI execution |

## Tech Stack

- **Frontend:** Next.js 14 + TypeScript + TailwindCSS
- **Web3:** @mysten/dapp-kit + Sui.js
- **Storage:** Walrus blob storage for AI decisions
- **Network:** Sui Testnet

## Getting Started

### Prerequisites

- Node.js 18+
- npm/pnpm
- Sui wallet (testnet)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/paybil.git
cd paybil

# Install dependencies
npm install

# Run development server
npm run dev
```

### Environment

The app connects to Sui testnet by default. No .env file required.

## Package ID

**Testnet:** `0xe314fec6438ab3d9cc449c4406fa8dd3701c09ad14418963f998166ffc06a68c`

## Key Features

### 1. Store Management (Admin)
- Whitelist new stores with AI agent addresses
- Admin-only access via `AdminCap`

### 2. Product Listing (Store Owners)
- List products with name, description, price, photo URL
- Price in USDC (6 decimals)
- Track inventory and availability

### 3. Customer Vault
- Deposit USDC
- Set weekly budget limits
- View spending and remaining budget

### 4. Subscriptions
- Subscribe to products for weekly auto-purchase
- Pause/resume anytime
- All preferences stored on-chain

### 5. AI Agent
- Generates daily purchase recommendations
- Stores decisions on Walrus for transparency
- **Customer signs each transaction** - no auto-deduction
- Full audit trail via blob storage

## Screenshots

```
💎 Vault Dashboard        │  🤖 AI Agent         │  🏪 Store Owner
─────────────────────────│─────────────────────────│─────────────────────────
USDC Balance: 20.00      │ Daily Analysis        │ List New Product
Weekly Budget: 0/90      │ 3 Recommendations    │ SKU: _____
Health Score: 100%       │ Confidence: 85%       │ Price: _____
```

## Project Structure

```
sources/
├── src/
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   │   ├── AdminPanel.tsx
│   │   ├── AIPanel.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── StoreOwnerPanel.tsx
│   │   └── ...
│   └── lib/
│       ├── products.ts   # Product fetching utilities
│       └── sui.ts       # Sui configuration
├── product_listing.move  # Product contract
├── admin_registry.move   # Admin contract
└── payment_vault.move    # Payment contract
```



## Smart Contract Addresses (Testnet)

| Object | ID |
|--------|-----|
| Package ID | `0xe314fec6438ab3d9cc449c4406fa8dd3701c09ad14418963f998166ffc06a68c` |
| StoreRegistry | `0xe86d83e5c05ecc000e009d6b9316864234d9d189d9a30e7860eab637308c5f87` |
| ProductCatalog | `0x1480beada01d70140b8d02a6bec6e516a9f3e26cb8d4fa83d6511a0c41b8e3a9` |

## How It Works

### Weekly Flow

1. **Customer subscribes** to products they want
2. **AI Agent runs daily** - analyzes products, generates recommendations
3. **Customer receives notification** - reviews recommendations in dApp
4. **Customer signs transaction** - approves purchase (full control, no auto-deduct)
5. **USDC transfers** from vault to store owner
6. **All decisions recorded** on Walrus for transparency

### Security

- AI agent requires explicit `CustomerAgentCap` capability
- Each purchase requires customer signature
- Weekly budget caps spending
- All AI decisions stored immutably

## Known Issues

- **Walrus endpoints** sometimes may be unavailable - fallback to local tracking enabled
- **Images** require direct URLs (~ no redirects)

## Future Roadmap

- [ ] Mainnet deployment
- [ ] Multi-token vault support (SUI, USDC)
- [ ] Real AI integration (OpenAI/Anthropic)
- [ ] Telegram/Discord notifications
- [ ] Product image upload to IPFS/Walrus
- [ ] Store ratings and reviews



## Connect

Built with ❤️ on Sui Overflow 2026

---

*Last updated: June 2026*

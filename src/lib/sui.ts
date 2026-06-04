export const NETWORK = 'testnet';
export const SUI_RPC_URL = 'https://rpc.testnet.sui.io';

export const PACKAGE_ID = '0xe314fec6438ab3d9cc449c4406fa8dd3701c09ad14418963f998166ffc06a68c';

export const ADMIN_ADDRESS = '0x48c7d3b0b47c4e8a4a15d0d26c0390297e0ba6b41507a5bc10bfc35fbe190268';

// Walrus Aggregator endpoints (Sui testnet)
export const WALRUS_RPC_URL = 'https://walrus-testnet.aggregator.walrus.org';
export const WALRUS_PUBLISHER_URL = 'https://walrus-testnet.publisher.walrus.org';
export const WALRUS_PUBLISHER_URL_ALT = 'https://publisher.walrus-testnet.walrus.io';

// Sui System objects
export const CLOCK_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000006';

export const USDC_DECIMALS = 6;
export const SUI_DECIMALS = 9;

export function formatSUI(amount: number | bigint): string {
  const value = typeof amount === 'bigint' ? Number(amount) : amount;
  return (value / 1e9).toFixed(4);
}

export function formatUSDC(amount: number | bigint): string {
  const value = typeof amount === 'bigint' ? Number(amount) : amount;
  return (value / 1e6).toFixed(2);
}

export function formatAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function isAdmin(address: string): boolean {
  return address.toLowerCase() === ADMIN_ADDRESS.toLowerCase();
}

// Walrus blob storage helper
export interface WalrusBlob {
  blobId: string;
  size: number;
  timestamp: number;
}

export function walrusBlobIdToBytes(blobId: string): Uint8Array {
  // Convert blob ID string to bytes for on-chain storage
  return new TextEncoder().encode(blobId);
}

export function bytesToWalrusBlobId(bytes: Uint8Array): string {
  // Convert bytes back to blob ID string
  return new TextDecoder().decode(bytes);
}
import { type ReactNode } from 'react'
import './globals.css'
import '@mysten/dapp-kit/dist/index.css';

export const metadata = {
  title: 'PayBil - AI Agent Payment on Sui',
  description: 'Next-gen AI agent payment system for automated subscriptions on Sui Testnet',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-[#0a0a0f]">
        {children}
      </body>
    </html>
  )
}
'use client';

import { motion } from 'framer-motion';
import { ProductCard } from './ProductCard';
import { useState, useEffect } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import { getAllProducts, OnChainProduct } from '@/lib/products';

const TAGS = ['All', 'Food', 'Electronics', 'Pets', 'Fitness'];

export function ProductGrid() {
  const client = useSuiClient();
  const [products, setProducts] = useState<OnChainProduct[]>([]);
  const [selectedTag, setSelectedTag] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true);
      setError(null);
      try {
        const onChainProducts = await getAllProducts(client);
        setProducts(onChainProducts);
      } catch (e: any) {
        setError(e.message);
        console.error('Error fetching products:', e);
      }
      setIsLoading(false);
    }

    fetchProducts();
  }, [client]);

  const filteredProducts = products.filter(p => {
    const matchesTag = selectedTag === 'All' || p.tag.toLowerCase() === selectedTag.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.storeOwner.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTag && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Product Catalog</h2>
          <p className="text-sm text-white/60">Browse and subscribe to products from whitelisted stores</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm w-48 focus:outline-none focus:border-cyan-500/50"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
          </div>
          {TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedTag === tag
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Walrus Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🗄️</span>
          <div>
            <p className="text-sm font-semibold text-white">Walrus-Powered AI Decisions</p>
            <p className="text-xs text-white/50">All AI purchase decisions are stored immutably on Walrus blob storage</p>
          </div>
        </div>
      </motion.div>

      {/* Loading/Error State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin text-4xl mb-4">◈</div>
          <p className="text-white/50">Loading products from chain...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <span className="text-4xl mb-4 block">⚠️</span>
          <p className="text-red-400">Error: {error}</p>
          <p className="text-white/50 text-sm mt-2">Make sure products have been listed by store owners</p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
      )}

      {!isLoading && !error && filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <span className="text-4xl mb-4 block">📦</span>
          <p className="text-white/50">No products found</p>
          <p className="text-white/40 text-sm mt-2">Store owners can list products from the "My Store" tab</p>
        </div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { ReelItem, DomainCategory, DOMAIN_CATEGORIES } from '../types';
import { X, Database, AlertTriangle, ShieldCheck, Tag, Eye } from 'lucide-react';

interface CuratedBankModalProps {
  bank: ReelItem[];
  isOpen: boolean;
  onClose: () => void;
}

export const CuratedBankModal: React.FC<CuratedBankModalProps> = ({ bank, isOpen, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filterType, setFilterType] = useState<'all' | 'high_signal' | 'hype_traps'>('all');

  if (!isOpen) return null;

  const filteredItems = bank.filter((item) => {
    if (selectedCategory !== 'All' && item.category !== selectedCategory) {
      return false;
    }
    if (filterType === 'high_signal' && item.is_hype_trap) return false;
    if (filterType === 'hype_traps' && !item.is_hype_trap) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#1E2333]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#4F46E5]/10 text-[#4F46E5]">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1E2333] tracking-tight">
                Curated Content Bank ({bank.length} Reels)
              </h2>
              <p className="text-xs text-[#6B7280]">
                Balanced repository: High-signal technical deep dives + calibrated hype traps
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#1E2333] hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="px-6 py-3 border-b border-[#E5E7EB] bg-[#F8FAFC]/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedCategory('All')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedCategory === 'All'
                  ? 'bg-[#4F46E5] text-white font-bold'
                  : 'text-[#6B7280] hover:text-[#1E2333] bg-white border border-[#E5E7EB]'
              }`}
            >
              All
            </button>
            {DOMAIN_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#4F46E5] text-white font-bold'
                    : 'text-[#6B7280] hover:text-[#1E2333] bg-white border border-[#E5E7EB]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                filterType === 'all'
                  ? 'bg-[#1E2333] border-[#1E2333] text-white font-medium'
                  : 'text-[#6B7280] border-[#E5E7EB] bg-white'
              }`}
            >
              All ({bank.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('high_signal')}
              className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-colors cursor-pointer ${
                filterType === 'high_signal'
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-medium'
                  : 'text-[#6B7280] border-[#E5E7EB] bg-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>High Signal</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('hype_traps')}
              className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-colors cursor-pointer ${
                filterType === 'hype_traps'
                  ? 'bg-rose-100 border-rose-300 text-rose-800 font-medium'
                  : 'text-[#6B7280] border-[#E5E7EB] bg-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Hype Traps</span>
            </button>
          </div>
        </div>

        {/* List of Reels */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all shadow-xs ${
                item.is_hype_trap
                  ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                  : 'bg-white border-[#E5E7EB] hover:border-[#CBD5E1]'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-[#1E2333] border border-[#E5E7EB]">
                    {item.category}
                  </span>
                  {item.is_hype_trap ? (
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-rose-100 text-rose-700 border border-rose-200 rounded-md">
                      Hype Trap
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md">
                      High Signal
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-[#1E2333] line-clamp-2 leading-snug">
                  {item.title}
                </h4>

                <p className="text-xs text-[#6B7280] line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-[#6B7280] pt-2 border-t border-[#E5E7EB]">
                <span className="font-medium text-[#1E2333]">@{item.creator}</span>
                <span className="font-mono">{item.duration_sec || item.duration_seconds}s • {item.views || '120k'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import {
  BrainCircuit,
  RotateCcw,
  Sparkles,
  Database,
  PlayCircle,
  Radio,
  Calculator,
  ToggleLeft,
  ToggleRight,
  SlidersHorizontal,
} from 'lucide-react';
import { ConfidenceLevel } from '../types';

interface HeaderProps {
  confidence: ConfidenceLevel;
  totalWatched: number;
  onReset: () => void;
  onOpenBank: () => void;
  isProcessing: boolean;
  onRunAutoTrapDemo: () => void;
  showMath: boolean;
  onToggleShowMath: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  confidence,
  totalWatched,
  onReset,
  onOpenBank,
  isProcessing,
  onRunAutoTrapDemo,
  showMath,
  onToggleShowMath,
}) => {
  // Visual confidence indicator (3 dots)
  const renderConfidenceDots = () => {
    const filledCount = confidence === 'High' ? 3 : confidence === 'Medium' ? 2 : 1;
    const dotColor =
      confidence === 'High'
        ? 'bg-[#0D9488]'
        : confidence === 'Medium'
        ? 'bg-amber-500'
        : 'bg-[#94A3B8]';

    return (
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i < filledCount ? dotColor : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] px-4 lg:px-6 py-3 select-none">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center shadow-sm">
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-[#1E2333]">
                  Scroll<span className="text-[#0D9488]">Smart</span>
                </span>
                <span className="px-1.5 py-0.2 text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#4F46E5]/10 text-[#4F46E5] border border-[#4F46E5]/20 rounded">
                  AI Agent
                </span>
              </div>
              <p className="text-xs text-[#6B7280] hidden sm:block">
                {showMath
                  ? 'Latent Interest Discovery & Non-Hype Tech Recommender'
                  : 'We watch what you watch, and find you tech content actually worth your time.'}
              </p>
            </div>
          </div>

          {/* Mobile Confidence Badge */}
          <div className="flex md:hidden items-center gap-2 px-2.5 py-1 bg-slate-100 rounded-lg border border-[#E5E7EB]">
            {renderConfidenceDots()}
            <span className="text-xs font-semibold text-[#1E2333]">{confidence}</span>
          </div>
        </div>

        {/* Global Controls & Master Toggle */}
        <div className="flex items-center flex-wrap justify-center md:justify-end gap-2.5 w-full md:w-auto">
          {/* Simple Watch & Confidence Indicator */}
          <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-[#E5E7EB] text-xs text-[#6B7280]">
            <Radio className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>
              Watched: <strong className="text-[#1E2333] font-semibold">{totalWatched}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5">
              <span>Confidence:</span>
              <div className="flex items-center gap-1.5">
                {renderConfidenceDots()}
                <span className="font-semibold text-[#1E2333]">{confidence}</span>
              </div>
            </div>
          </div>

          {/* MASTER PROGRESSIVE DISCLOSURE TOGGLE: "Show the math" */}
          <button
            type="button"
            id="toggle-show-math"
            onClick={onToggleShowMath}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer shadow-sm ${
              showMath
                ? 'bg-[#1E2333] text-white border-[#1E2333]'
                : 'bg-white text-[#1E2333] border-[#E5E7EB] hover:bg-slate-50'
            }`}
            title="Toggle advanced mathematical proofs, entropy calculation, and MMR formulas"
          >
            <SlidersHorizontal className={`w-3.5 h-3.5 ${showMath ? 'text-[#22D3EE]' : 'text-[#0D9488]'}`} />
            <span>Show the math</span>
            <span
              className={`px-1.5 py-0.2 text-[10px] font-mono font-bold uppercase rounded ${
                showMath ? 'bg-[#0D9488] text-white' : 'bg-slate-100 text-[#6B7280]'
              }`}
            >
              {showMath ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Auto Trap Case Demo Button */}
          <button
            type="button"
            id="btn-auto-trap-demo"
            onClick={onRunAutoTrapDemo}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white transition-all shadow-sm cursor-pointer disabled:opacity-50"
            title="Auto-run the 4-reel trap case sequence to watch interest convergence"
          >
            <PlayCircle className="w-3.5 h-3.5 text-indigo-200" />
            <span>Demo Trap Sequence</span>
          </button>

          {/* Curated Bank Modal Trigger */}
          <button
            type="button"
            onClick={onOpenBank}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white hover:bg-slate-50 text-[#1E2333] border border-[#E5E7EB] transition-colors cursor-pointer shadow-sm"
            title="Explore Curated Video Bank"
          >
            <Database className="w-3.5 h-3.5 text-[#0D9488]" />
            <span className="hidden sm:inline">Bank (24)</span>
          </button>

          {/* Reset State */}
          <button
            type="button"
            id="btn-reset-session"
            onClick={onReset}
            disabled={isProcessing}
            className="p-2 rounded-lg bg-white hover:bg-rose-50 text-[#6B7280] hover:text-rose-600 border border-[#E5E7EB] hover:border-rose-200 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
            title="Reset Session & Prior"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};

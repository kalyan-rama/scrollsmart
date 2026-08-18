import React from 'react';
import { X, Sparkles, ArrowRight, CheckCircle2, XCircle, BrainCircuit } from 'lucide-react';

interface TrapCaseWalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunDemo: () => void;
}

export const TrapCaseWalkthroughModal: React.FC<TrapCaseWalkthroughModalProps> = ({
  isOpen,
  onClose,
  onRunDemo,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono">
                The "Trap Case": Why Bayesian Inference Solves It
              </h2>
              <p className="text-xs text-zinc-400">
                Solving the "No Repeated Keyword" trap through joint probability convergence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs font-sans">
          {/* Trap Sequence */}
          <div className="space-y-3 bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl">
            <h3 className="font-bold text-white font-mono text-sm">
              The 4 Watched Reels in the Trap Sequence:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-[10px] font-mono text-amber-400 font-bold">1. Java Compiler Meme</span>
                <p className="text-zinc-200 font-medium">"static typed languages be like ☕😭"</p>
                <p className="text-[11px] text-zinc-400">Surface: Java • Latent Signal: Developer humor & language trade-offs</p>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-[10px] font-mono text-emerald-400 font-bold">2. SWE Lifestyle</span>
                <p className="text-zinc-200 font-medium">"Day in my life as a SWE at a startup 💻🥑"</p>
                <p className="text-[11px] text-zinc-400">Surface: Lifestyle • Latent Signal: Software engineering career culture</p>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-[10px] font-mono text-blue-400 font-bold">3. Interview Humor</span>
                <p className="text-zinc-200 font-medium">"Interviewer: reverse a linked list. Me: 😐"</p>
                <p className="text-[11px] text-zinc-400">Surface: DSA • Latent Signal: Tech interview preparation & anxieties</p>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 font-bold">4. Developer Hardware</span>
                <p className="text-zinc-200 font-medium">"MacBook Pro vs ThinkPad for coding"</p>
                <p className="text-[11px] text-zinc-400">Surface: Hardware • Latent Signal: Professional developer workstation</p>
              </div>
            </div>
          </div>

          {/* Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Naive Recommender */}
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-600/30 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-rose-300 font-mono">
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>Naive / Keyword Recommender</span>
              </div>
              <ul className="space-y-1.5 text-zinc-300 list-disc list-inside text-[11px] leading-relaxed">
                <li>Looks for exact repeated keywords (finds zero overlap).</li>
                <li>Jumps wildly between Java syntax, fitness vlog, LeetCode, and laptop reviews.</li>
                <li>Cannot infer that all 4 reels represent a student aspiring to a Software Engineering career.</li>
              </ul>
            </div>

            {/* ScrollSmart Bayesian */}
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-emerald-300 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>ScrollSmart Bayesian Posterior</span>
              </div>
              <ul className="space-y-1.5 text-zinc-300 list-disc list-inside text-[11px] leading-relaxed">
                <li>Stage 1 extracts the viewer psychology signal behind each watch.</li>
                <li>Stage 2 multiplies likelihoods across the 8-domain taxonomy.</li>
                <li>Probability mass concentrates decisively on <strong>Career / SWE</strong> (&gt;55%) despite distinct surface domains!</li>
              </ul>
            </div>
          </div>

          {/* Control items */}
          <div className="bg-zinc-900/40 border border-zinc-800 p-3 rounded-lg text-[11px] text-zinc-400">
            <strong className="text-white">Control Item Invariance:</strong> Watching an unrelated reel like <em>"Cristiano Ronaldo goals"</em> yields a flat likelihood vector, leaving the existing session posterior unchanged.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3.5 border-t border-zinc-800 bg-zinc-900/50">
          <button
            onClick={() => {
              onClose();
              onRunDemo();
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <span>Run Trap Case Demo Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

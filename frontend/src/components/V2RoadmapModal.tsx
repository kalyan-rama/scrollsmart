import React from 'react';
import { X, Cpu, GitFork, Compass, Sparkles, Sliders } from 'lucide-react';

interface V2RoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const V2RoadmapModal: React.FC<V2RoadmapModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono">
                ScrollSmart v2 Architecture Roadmap
              </h2>
              <p className="text-xs text-zinc-400">
                Advanced machine learning extensions beyond the hackathon scope
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
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-sans">
          {/* Pillar 1 */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
            <div className="flex items-center gap-2 font-mono font-bold text-sm text-cyan-300">
              <GitFork className="w-4 h-4 text-cyan-400" />
              <span>1. Identity Vector vs. Transient Curiosity Vector Separation</span>
            </div>
            <p className="text-zinc-300 leading-relaxed">
              In v2, the agent maintains a dual-state representation:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
                <strong className="text-indigo-300 block mb-1">Long-term Identity Vector (Slow decay)</strong>
                Captures core engineering stack (eg: Java backend engineer, 3+ years experience).
              </div>
              <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
                <strong className="text-purple-300 block mb-1">Session Curiosity Vector (Fast decay)</strong>
                Captures immediate temporary exploration (eg: GPU architecture deep dive this evening).
              </div>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
            <div className="flex items-center gap-2 font-mono font-bold text-sm text-emerald-300">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>2. Zone of Proximal Development (ZPD) Difficulty Sequencing</span>
            </div>
            <p className="text-zinc-300 leading-relaxed">
              Dynamically sequences technical depth based on real-time cognitive load signals:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-300">
              <li><strong>High Skip Rate (&lt;30% watched)</strong>: Temporarily de-escalates difficulty from <em>Advanced</em> to <em>Intermediate/Beginner</em> to prevent cognitive burnout.</li>
              <li><strong>High Retention (&gt;90% watched + bookmarked)</strong>: Progressively elevates complexity (eg: from high-level system diagrams to kernel memory internals).</li>
            </ul>
          </div>

          {/* Pillar 3 */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
            <div className="flex items-center gap-2 font-mono font-bold text-sm text-amber-300">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>3. Thompson-Sampling Multi-Armed Bandit Exploration</span>
            </div>
            <p className="text-zinc-300 leading-relaxed">
              Replaces static $\lambda$-MMR with a Bayesian Beta-Bernoulli multi-armed bandit across the 8 domains.
              Balances <em>exploitation</em> of high-confidence interests (eg: Career/SWE) with calibrated <em>exploration</em> (eg: sampling a 15% probability Cybersecurity breakthrough) to prevent filter bubbles.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-zinc-800 bg-zinc-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

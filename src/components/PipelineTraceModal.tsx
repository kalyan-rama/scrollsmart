import React, { useState } from 'react';
import { PipelineTrace } from '../types';
import {
  X,
  Terminal,
  BrainCircuit,
  BarChart3,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Copy,
  Check,
  Cpu,
} from 'lucide-react';

interface PipelineTraceModalProps {
  trace: PipelineTrace | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PipelineTraceModal: React.FC<PipelineTraceModalProps> = ({
  trace,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'stage1' | 'stage2' | 'stage3' | 'stage4' | 'stage5'>('all');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !trace) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(trace, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#1E2333]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#4F46E5]/10 text-[#4F46E5]">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1E2333] tracking-tight font-mono">
                Pipeline Execution Trace
              </h2>
              <p className="text-xs text-[#6B7280]">
                Runtime telemetry for: <strong className="text-[#1E2333]">&quot;{trace.reel_title}&quot;</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyJson}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg bg-white hover:bg-slate-100 text-[#1E2333] border border-[#E5E7EB] transition-colors cursor-pointer shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#6B7280]" />}
              <span>{copied ? 'Copied JSON' : 'Copy JSON'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#1E2333] hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Functional Stage Filter Tabs */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 bg-[#F8FAFC]/60 border-b border-[#E5E7EB] overflow-x-auto text-xs font-mono">
          {[
            { id: 'all', label: 'All Stages' },
            { id: 'stage1', label: '1. Signal Extraction' },
            { id: 'stage2', label: '2. Bayesian Update' },
            { id: 'stage3', label: '3. Vector Retrieval & MMR' },
            { id: 'stage4', label: '4. Adversarial Critic' },
            { id: 'stage5', label: '5. Calibrated Output' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#4F46E5] text-white font-bold'
                  : 'text-[#6B7280] hover:text-[#1E2333] bg-white border border-[#E5E7EB]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Trace Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-xs">
          {/* Provider telemetry banner */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-[#E5E7EB] text-xs text-[#6B7280]">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#0D9488]" />
              <span>LLM Engine: <strong className="text-[#1E2333]">{trace.provider_info?.model || 'gemini-3.7-flash / groq fallback'}</strong></span>
            </div>
            <span className="text-[#0D9488] font-bold">Latency: {trace.execution_time_ms}ms</span>
          </div>

          {/* STAGE 1 TRACE */}
          {(activeTab === 'all' || activeTab === 'stage1') && trace.stage1 && (
            <div className="p-4 bg-slate-50 border border-[#E5E7EB] rounded-xl space-y-2.5">
              <div className="flex items-center justify-between text-xs text-[#1E2333] font-bold">
                <span className="text-[#4F46E5]">Stage 1: Reel Signal Understanding</span>
                <span className="text-xs text-[#6B7280] font-normal">{trace.stage1.format} format</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-white rounded-lg border border-[#E5E7EB]">
                  <span className="text-[#6B7280] block text-[10px] uppercase font-bold">Surface Topic</span>
                  <span className="text-[#1E2333] font-medium">{trace.stage1.surface_topic}</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-[#E5E7EB]">
                  <span className="text-[#0D9488] block text-[10px] uppercase font-bold">Underlying Signal</span>
                  <span className="text-[#0D9488] font-medium">{trace.stage1.underlying_signal}</span>
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-[#E5E7EB]">
                <span className="text-[#6B7280] block text-[10px] uppercase font-bold mb-1.5">Domain Likelihood Weights</span>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {Object.entries(trace.stage1.domain_likelihoods).map(([k, v]) => (
                    <div key={k} className="flex justify-between px-2 py-1 bg-slate-50 rounded border border-slate-200/80">
                      <span className="text-[#6B7280]">{k}</span>
                      <span className="text-[#0D9488] font-bold">{(Number(v) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2 TRACE */}
          {(activeTab === 'all' || activeTab === 'stage2') && trace.stage2 && (
            <div className="p-4 bg-slate-50 border border-[#E5E7EB] rounded-xl space-y-2.5">
              <div className="flex items-center justify-between text-xs text-[#1E2333] font-bold">
                <span className="text-[#4F46E5]">Stage 2: Bayesian Posterior Update</span>
                <span className="text-xs text-[#6B7280]">Entropy: {trace.stage2.entropy.toFixed(2)} bits</span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-[#E5E7EB] text-xs">
                <div className="grid grid-cols-4 gap-1.5">
                  {Object.entries(trace.stage2.posterior).map(([k, v]) => (
                    <div key={k} className="flex justify-between px-2 py-1 bg-slate-50 rounded border border-slate-200/80">
                      <span className="text-[#6B7280]">{k}</span>
                      <span className="text-[#4F46E5] font-bold">{(Number(v) * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STAGE 3 TRACE */}
          {(activeTab === 'all' || activeTab === 'stage3') && trace.stage3 && (
            <div className="p-4 bg-slate-50 border border-[#E5E7EB] rounded-xl space-y-2.5">
              <div className="flex items-center justify-between text-xs text-[#1E2333] font-bold">
                <span className="text-[#4F46E5]">Stage 3: Vector Retrieval & MMR Diversity (lambda=0.75)</span>
                <span className="text-xs text-[#6B7280]">Top candidates retrieved</span>
              </div>
              <div className="space-y-2 text-xs">
                {trace.stage3.top_candidates.map((c, i) => (
                  <div key={i} className="p-3 bg-white rounded-lg border border-[#E5E7EB] flex items-center justify-between">
                    <div>
                      <span className="text-[#1E2333] font-bold">#{i + 1} {c.reel.title}</span>
                      <span className="text-[#6B7280] text-xs block">[{c.reel.category}] • {c.reel.creator}</span>
                    </div>
                    <div className="text-right text-xs">
                      <span className="text-[#0D9488] block font-bold">MMR: {c.mmr_score.toFixed(3)}</span>
                      <span className="text-[#6B7280]">Sim: {c.similarity_score.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STAGE 4 TRACE */}
          {(activeTab === 'all' || activeTab === 'stage4') && trace.stage4 && (
            <div className="p-4 bg-slate-50 border border-[#E5E7EB] rounded-xl space-y-2.5">
              <div className="flex items-center justify-between text-xs text-[#1E2333] font-bold">
                <span className="text-[#4F46E5]">Stage 4: CS Student Adversarial Critic</span>
                <span className="text-xs text-[#6B7280]">{trace.stage4.reviews.length} candidate(s) reviewed</span>
              </div>
              <div className="space-y-2 text-xs">
                {trace.stage4.reviews.map((r, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border ${
                      r.approved ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={r.approved ? 'text-emerald-800' : 'text-rose-800'}>
                        {r.approved ? '✓ APPROVED: ' : '✕ REJECTED: '} {r.candidate_title}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">&quot;{r.reason}&quot;</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STAGE 5 TRACE */}
          {(activeTab === 'all' || activeTab === 'stage5') && trace.stage5 && (
            <div className="p-4 bg-slate-50 border border-[#E5E7EB] rounded-xl space-y-2.5">
              <div className="flex items-center justify-between text-xs text-[#1E2333] font-bold">
                <span className="text-[#4F46E5]">Stage 5: Final Calibrated Output JSON</span>
              </div>
              <pre className="p-3.5 bg-[#0B0E14] text-[#22D3EE] rounded-lg border border-slate-800 overflow-x-auto text-[11px] leading-relaxed">
                {JSON.stringify(trace.stage5, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { PipelineTrace, Stage5StructuredOutput } from '../types';
import { X, CheckCircle2, Sparkles, BrainCircuit, ShieldCheck, ArrowRight, Video } from 'lucide-react';

interface SimplifiedDecisionModalProps {
  trace: PipelineTrace | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenAdvancedTrace?: () => void;
}

export const SimplifiedDecisionModal: React.FC<SimplifiedDecisionModalProps> = ({
  trace,
  isOpen,
  onClose,
  onOpenAdvancedTrace,
}) => {
  if (!isOpen || !trace) return null;

  const stage5 = trace.stage5;
  const stage1 = trace.stage1;
  const stage4 = trace.stage4;
  const rejectedReviews = stage4?.reviews?.filter((r) => !r.approved) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#1E2333]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1E2333] tracking-tight">
                How ScrollSmart Decided
              </h2>
              <p className="text-xs text-[#6B7280]">
                A simple 3-step breakdown of your latest recommendation
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

        {/* 3 Step Story Flow */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Step 1: What you watched */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-[#0D9488]/10 text-[#0D9488] font-bold text-xs flex items-center justify-center border border-[#0D9488]/20">
                1
              </div>
              <div className="w-0.5 h-12 bg-slate-200 my-1" />
            </div>
            <div className="flex-1 space-y-1 pt-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                What you watched
              </span>
              <h3 className="text-sm font-bold text-[#1E2333]">
                &quot;{trace.reel_title}&quot;
              </h3>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                You spent time watching this short video ({stage1?.format || 'coding demo'}).
              </p>
            </div>
          </div>

          {/* Step 2: What the AI learned */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-[#4F46E5]/10 text-[#4F46E5] font-bold text-xs flex items-center justify-center border border-[#4F46E5]/20">
                2
              </div>
              <div className="w-0.5 h-12 bg-slate-200 my-1" />
            </div>
            <div className="flex-1 space-y-1.5 pt-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                What we picked up
              </span>
              <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
                <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-md bg-[#4F46E5]/10 text-[#4F46E5]">
                  Interest in {stage5?.category || 'Tech'}
                </span>
                <p className="text-xs text-[#1E2333] font-medium leading-relaxed">
                  {stage5?.why || 'Decoded latent curiosity for real-world engineering concepts rather than surface syntax.'}
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: Quality checked and picked */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center border border-emerald-300">
                3
              </div>
            </div>
            <div className="flex-1 space-y-2 pt-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                What we recommended for you
              </span>
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Checked for filler and clickbait — this one passed.</span>
                </div>
                <h4 className="text-sm font-bold text-[#1E2333]">
                  {stage5?.recommended_tech_reel}
                </h4>
                <p className="text-xs text-[#6B7280] leading-relaxed">
                  {stage5?.why_this_recommendation}
                </p>
              </div>

              {rejectedReviews.length > 0 && (
                <p className="text-[11px] text-[#6B7280] italic">
                  Note: Filtered out {rejectedReviews.length} sensationalized post(s) before picking this.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between">
          {onOpenAdvancedTrace ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAdvancedTrace();
              }}
              className="text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] flex items-center gap-1 cursor-pointer"
            >
              <span>View full technical formula trace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#1E2333] hover:bg-black text-white transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

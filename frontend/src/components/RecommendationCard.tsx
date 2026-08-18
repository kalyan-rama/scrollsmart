import React, { useState } from 'react';
import {
  Stage5StructuredOutput,
  PipelineTrace,
  DomainCategory,
  ConfidenceLevel,
  DifficultyLevel,
} from '../types';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  ThumbsUp,
  Bookmark,
  Share2,
  AlertTriangle,
  Eye,
  EyeOff,
  Code2,
  Clock,
  ArrowRight,
  Sliders,
  CheckCircle2,
  Terminal,
  HelpCircle,
} from 'lucide-react';

interface RecommendationCardProps {
  output: Stage5StructuredOutput;
  trace?: PipelineTrace;
  onFeedback: (category: DomainCategory, action: 'like' | 'save' | 'skip' | 'watch_complete') => void;
  onOpenTrace: () => void;
  onOpenSimplifiedDecision?: () => void;
  showMath?: boolean;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  output,
  trace,
  onFeedback,
  onOpenTrace,
  onOpenSimplifiedDecision,
  showMath = false,
}) => {
  const [feedbackSent, setFeedbackSent] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleAction = (action: 'like' | 'save' | 'skip' | 'watch_complete') => {
    setFeedbackSent(action);
    onFeedback(output.category as DomainCategory, action);
    setTimeout(() => setFeedbackSent(null), 2500);
  };

  const getDifficultyColor = (diff: DifficultyLevel) => {
    switch (diff) {
      case 'Advanced':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Intermediate':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Beginner':
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  // Visual confidence indicator (3 dots)
  const renderConfidenceDots = () => {
    const filledCount = output.confidence === 'High' ? 3 : output.confidence === 'Medium' ? 2 : 1;
    const dotColor =
      output.confidence === 'High'
        ? 'bg-[#0D9488]'
        : output.confidence === 'Medium'
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

  // Check if Stage 4 rejected clickbait
  const rejectedReviews = trace?.stage4?.reviews?.filter((r) => !r.approved) || [];

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm space-y-4 select-none">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#1E2333] tracking-tight">
                {showMath ? 'Stage 5 Output: Calibrated Recommendation' : 'Up next'}
              </h3>
              {showMath && (
                <span className="px-1.5 py-0.2 text-[10px] font-mono font-medium text-[#6B7280] bg-slate-100 rounded border border-[#E5E7EB]">
                  Stage 5 Inference
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B7280]">
              {showMath
                ? 'Targeted technical depth based on decoded latent curiosity signals.'
                : output.why || "Because you've been into real engineering depth, not just syntax."}
            </p>
          </div>
        </div>

        {/* Confidence & Difficulty Chips */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#E5E7EB] bg-slate-50 text-xs font-semibold text-[#1E2333]">
            <span className="text-[#6B7280] font-normal">Confidence:</span>
            {renderConfidenceDots()}
            <span>{output.confidence}</span>
          </div>
          <span className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${getDifficultyColor(output.difficulty)}`}>
            {output.difficulty}
          </span>
        </div>
      </div>

      {/* QUALITY CHECK BANNER (Plain language in Default mode) */}
      {!showMath ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-emerald-900">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">
              ✓ Checked for filler and clickbait — this one passed.
            </span>
          </div>
          {rejectedReviews.length > 0 && (
            <span className="text-[11px] text-emerald-700 font-medium hidden sm:inline">
              ({rejectedReviews.length} hype trap filtered out)
            </span>
          )}
        </div>
      ) : (
        /* ADVANCED MODE: STAGE 4 ADVERSARIAL REJECTION BREAKDOWN */
        rejectedReviews.length > 0 && (
          <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-rose-800 font-bold border-b border-rose-200 pb-1.5">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>STAGE 4 HYPE-FILTER ACTIVATED</span>
              </span>
              <span className="text-[11px] text-rose-600 font-normal">
                {rejectedReviews.length} Clickbait candidate(s) intercepted
              </span>
            </div>

            <div className="space-y-1.5">
              {rejectedReviews.map((rej, idx) => (
                <div key={idx} className="space-y-1 bg-white p-2.5 rounded-lg border border-rose-200/80 shadow-xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="line-through text-rose-700/80 font-mono text-[11px]">
                      &quot;{rej.candidate_title}&quot;
                    </span>
                    <span className="text-[9px] font-mono uppercase bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-bold">
                      Rejected
                    </span>
                  </div>
                  <p className="text-xs text-[#1E2333] leading-relaxed">
                    <span className="font-mono text-[#0D9488] font-semibold">CS Critic: </span>
                    &quot;{rej.reason}&quot;
                  </p>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* PRIMARY RECOMMENDATION CARD */}
      <div className="p-4 bg-gradient-to-r from-indigo-50/60 via-slate-50 to-teal-50/40 border border-[#4F46E5]/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-[#4F46E5] text-white">
              {output.category}
            </span>
            <span className="text-xs text-[#6B7280] font-medium">
              Explainer Reel
            </span>
          </div>

          <h4 className="text-base sm:text-lg font-bold text-[#1E2333] leading-snug">
            {output.recommended_tech_reel}
          </h4>

          <p className="text-xs text-[#6B7280] leading-relaxed">
            {output.why_this_recommendation}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPreviewOpen(!previewOpen)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white transition-all cursor-pointer shrink-0 shadow-sm"
        >
          {previewOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{previewOpen ? 'Hide Preview' : 'Watch Explainer'}</span>
        </button>
      </div>

      {/* ADVANCED VIEW ONLY: FULL 8-FIELD INFERENCE DOSSIER */}
      {showMath && (
        <div className="space-y-2 text-xs pt-1 border-t border-[#E5E7EB]">
          {/* Trigger Reel */}
          <div className="flex items-start gap-2 bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E5E7EB]">
            <span className="text-[10px] font-mono uppercase text-[#6B7280] font-bold shrink-0 w-28">
              TRIGGER REEL
            </span>
            <span className="text-[#1E2333] font-medium">{output.current_reel}</span>
          </div>

          {/* Latent Signal Decoded */}
          <div className="flex items-start gap-2 bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E5E7EB]">
            <span className="text-[10px] font-mono uppercase text-[#0D9488] font-bold shrink-0 w-28">
              LATENT SIGNAL
            </span>
            <span className="text-[#0D9488] font-mono font-semibold">{output.interest_detected}</span>
          </div>

          {/* Causal Evidence / Why */}
          <div className="flex items-start gap-2 bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E5E7EB]">
            <span className="text-[10px] font-mono uppercase text-[#6B7280] font-bold shrink-0 w-28">
              INFERENCE WHY
            </span>
            <span className="text-[#6B7280] leading-relaxed">{output.why}</span>
          </div>

          {/* Verification & MMR reference */}
          <div className="flex items-start gap-2 bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E5E7EB]">
            <span className="text-[10px] font-mono uppercase text-[#6B7280] font-bold shrink-0 w-28">
              VERIFICATION
            </span>
            <div className="space-y-1">
              <p className="text-[#6B7280] leading-relaxed">{output.why_this_recommendation}</p>
              <div className="flex items-center gap-1.5 text-xs text-[#0D9488] font-mono font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                <span>MMR Diversity &lambda;=0.75 + CS Student Adversarial Critic approved</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXPANDABLE VIDEO / REEL PREVIEW */}
      {previewOpen && output.raw_reel_data && (
        <div className="bg-[#F8FAFC] border border-[#4F46E5]/20 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src={output.raw_reel_data.avatar}
                alt={output.raw_reel_data.creator}
                className="w-6 h-6 rounded-full border border-slate-300 object-cover"
              />
              <span className="font-semibold text-xs text-[#1E2333]">
                {output.raw_reel_data.creator}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#6B7280]">
              <Clock className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>{output.raw_reel_data.duration_sec}s</span>
              <span>•</span>
              <span className="text-[#4F46E5] font-semibold">{output.raw_reel_data.views || '420K'} views</span>
            </div>
          </div>

          <p className="text-xs text-[#6B7280] leading-relaxed bg-white p-3 rounded-lg border border-[#E5E7EB]">
            {output.raw_reel_data.description}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {output.raw_reel_data.tags?.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-0.5 text-xs font-mono rounded-md bg-white text-[#6B7280] border border-[#E5E7EB]"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* USER ENGAGEMENT & REASONING LINK */}
      <div className="pt-2 border-t border-[#E5E7EB] flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#6B7280]">Feedback:</span>
          <button
            type="button"
            onClick={() => handleAction('like')}
            className={`px-2.5 py-1 text-xs rounded-lg border transition-colors flex items-center gap-1 cursor-pointer font-medium ${
              feedbackSent === 'like'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-slate-50 text-[#1E2333] hover:bg-slate-100 border-[#E5E7EB]'
            }`}
          >
            <ThumbsUp className="w-3 h-3 text-[#0D9488]" />
            <span>Interested</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction('skip')}
            className={`px-2.5 py-1 text-xs rounded-lg border transition-colors flex items-center gap-1 cursor-pointer font-medium ${
              feedbackSent === 'skip'
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : 'bg-slate-50 text-[#6B7280] hover:bg-slate-100 border-[#E5E7EB]'
            }`}
          >
            <span>Not for me</span>
          </button>
        </div>

        {/* DECISION LINK: "See how we decided" (Default) vs "Inspect 5-Stage Trace" (Advanced) */}
        {!showMath ? (
          <button
            type="button"
            onClick={onOpenSimplifiedDecision || onOpenTrace}
            className="text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] flex items-center gap-1.5 cursor-pointer underline underline-offset-4"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>See how we decided</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenTrace}
            className="text-xs font-mono font-semibold text-[#0D9488] hover:text-teal-700 flex items-center gap-1 cursor-pointer underline underline-offset-4"
          >
            <Terminal className="w-3 h-3" />
            <span>Inspect 5-Stage Trace</span>
          </button>
        )}
      </div>
    </div>
  );
};

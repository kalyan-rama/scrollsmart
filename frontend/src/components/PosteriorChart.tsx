import React, { useMemo } from 'react';
import {
  DomainCategory,
  DOMAIN_CATEGORIES,
  PosteriorDistribution,
  ConfidenceLevel,
  Stage2Output,
} from '../types';
import { Radio, Activity, Sparkles, TrendingUp, Info } from 'lucide-react';

interface PosteriorChartProps {
  posterior: PosteriorDistribution;
  confidence: ConfidenceLevel;
  stage2Data?: Stage2Output;
  showMath?: boolean;
}

const TOTAL_LED_SEGMENTS = 14;

export const PosteriorChart: React.FC<PosteriorChartProps> = ({
  posterior,
  confidence,
  stage2Data,
  showMath = false,
}) => {
  // Sort categories by current posterior mass descending
  const sortedCategories = useMemo(() => {
    return [...DOMAIN_CATEGORIES].sort(
      (a, b) => (posterior[b] || 0) - (posterior[a] || 0)
    );
  }, [posterior]);

  const maxCategory = sortedCategories[0];
  const maxProbability = posterior[maxCategory] || 0.125;

  // Calculate Shannon entropy: H = - sum(p * log2(p))
  const entropy = useMemo(() => {
    let sum = 0;
    for (const cat of DOMAIN_CATEGORIES) {
      const p = posterior[cat] || 0;
      if (p > 0) sum -= p * Math.log2(p);
    }
    return Number(sum.toFixed(3));
  }, [posterior]);

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
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm space-y-4 select-none">
      {/* HEADER: PROGRESSIVE DISCLOSURE */}
      <div className="flex items-start justify-between gap-3 border-b border-[#E5E7EB] pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488] animate-pulse" />
            <h3 className="font-bold text-[#1E2333] text-base tracking-tight">
              {showMath ? 'Latent State: Bayesian Posterior' : "What you're into"}
            </h3>
            {showMath && (
              <span
                className="px-2 py-0.5 text-[10px] font-mono font-medium text-[#4F46E5] bg-[#4F46E5]/10 rounded border border-[#4F46E5]/20"
                title="Dirichlet distribution over 8 latent technology categories"
              >
                Dirichlet update
              </span>
            )}
          </div>
          <p className="text-xs text-[#6B7280] mt-1">
            {showMath
              ? 'Real-time probability mass across 8 latent domains updated via likelihood product.'
              : 'Real-time interest levels decoded from your watch behavior.'}
          </p>
        </div>

        {/* Live Confidence Chips */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-50 border border-[#E5E7EB] text-[#1E2333]">
            <span className="text-[#6B7280] font-normal">Confidence:</span>
            {renderConfidenceDots()}
            <span>{confidence}</span>
          </div>

          {/* Entropy calculation visible ONLY in Advanced / Show the math mode */}
          {showMath && (
            <div className="text-[11px] font-mono text-[#6B7280]">
              Entropy <strong className="text-[#1E2333] font-semibold">{entropy.toFixed(2)}</strong> / 3.00 bits
            </div>
          )}
        </div>
      </div>

      {/* SIGNATURE ELEMENT: 8-DOMAIN VERTICAL EQUALIZER BARS (LIGHT THEME OPTIMIZED) */}
      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-medium text-[#6B7280] px-1">
          <span className="flex items-center gap-1.5 font-semibold text-[#1E2333]">
            <Activity className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>{showMath ? 'TELEMETRY EQUALIZER WAVEFORM' : 'Interest Spectrum'}</span>
          </span>
          <span className="text-xs">
            Top focus: <strong className="text-[#4F46E5] font-bold">{maxCategory}</strong> (
            {(maxProbability * 100).toFixed(0)}%)
          </span>
        </div>

        {/* Equalizer Grid (8 Vertical Columns) */}
        <div className="grid grid-cols-8 gap-2 sm:gap-3 pt-1 pb-1">
          {sortedCategories.map((category) => {
            const prob = posterior[category] || 0;
            const pct = prob * 100;
            const isLeading = category === maxCategory && prob > 0.22;
            const activeSegments = Math.round((prob / 1.0) * TOTAL_LED_SEGMENTS * 1.8);
            const clampedActive = Math.min(TOTAL_LED_SEGMENTS, Math.max(1, activeSegments));

            return (
              <div
                key={category}
                className="flex flex-col items-center gap-1.5 group transition-transform duration-300"
              >
                {/* Percentage readout in JetBrains Mono 500 weight for crisp contrast on light background */}
                <span
                  className={`text-xs font-mono font-medium transition-colors duration-300 ${
                    isLeading ? 'text-[#4F46E5] font-bold' : 'text-[#6B7280]'
                  }`}
                >
                  {pct.toFixed(0)}%
                </span>

                {/* Vertical LED Meter Column */}
                <div
                  className={`w-full max-w-[32px] h-32 bg-[#EDF2F7] rounded-md p-1 flex flex-col-reverse justify-start gap-[2.5px] border transition-all duration-300 ${
                    isLeading
                      ? 'border-[#4F46E5]/40 shadow-sm bg-indigo-50/50'
                      : 'border-[#E2E8F0]'
                  }`}
                >
                  {Array.from({ length: TOTAL_LED_SEGMENTS }).map((_, index) => {
                    const isLit = index < clampedActive;
                    const isPeak = index === clampedActive - 1 && isLit;

                    // On light background, near-zero segments have visible outline so they never disappear into canvas
                    let segmentStyle = 'bg-white border border-[#CBD5E1]/70';

                    if (isLit) {
                      if (isLeading) {
                        segmentStyle = isPeak
                          ? 'bg-[#4F46E5] border border-[#4338CA] shadow-sm'
                          : index > 8
                          ? 'bg-[#0D9488] border border-[#0F766E]'
                          : 'bg-[#0D9488]/90 border border-[#0D9488]';
                      } else {
                        segmentStyle =
                          index > 8
                            ? 'bg-[#0D9488] border border-[#0F766E]'
                            : 'bg-[#0D9488]/80 border border-[#0D9488]/90';
                      }
                    }

                    return (
                      <div
                        key={index}
                        className={`w-full h-1.5 rounded-[1.5px] transition-colors duration-300 ${segmentStyle}`}
                      />
                    );
                  })}
                </div>

                {/* Domain Category Label */}
                <span
                  className={`text-[11px] font-mono tracking-tight transition-colors duration-300 truncate max-w-full text-center ${
                    isLeading ? 'text-[#1E2333] font-bold' : 'text-[#6B7280]'
                  }`}
                  title={category}
                >
                  {category}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* HUMAN-READABLE ENGAGEMENT & INTEREST STATUS BANNER */}
      {(stage2Data?.human_summary || stage2Data?.engagement?.human_summary) && (
        <div className="flex items-center justify-between p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-lg text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0D9488] shrink-0" />
            <span className="font-semibold text-slate-800">{stage2Data?.human_summary || stage2Data?.engagement?.human_summary}</span>
          </div>
          {(stage2Data?.signals || stage2Data?.engagement) && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600">
              <span>{Math.round(((stage2Data?.signals || stage2Data?.engagement)?.watch_pct || 1.0) * 100)}% watched</span>
              {(stage2Data?.signals || stage2Data?.engagement)?.liked && <span className="text-rose-500 font-semibold">• Liked</span>}
              {(stage2Data?.signals || stage2Data?.engagement)?.saved && <span className="text-[#0D9488] font-semibold">• Saved</span>}
              {(stage2Data?.signals || stage2Data?.engagement)?.commented && <span className="text-indigo-600 font-semibold">• Commented</span>}
              {(stage2Data?.signals || stage2Data?.engagement)?.shared && <span className="text-teal-600 font-semibold">• Shared</span>}
              {(stage2Data?.signals || stage2Data?.engagement)?.replayed && <span className="text-amber-600 font-semibold">• Replayed</span>}
              {(stage2Data?.signals || stage2Data?.engagement)?.skipped && <span className="text-rose-400 font-semibold">• Skipped</span>}
            </div>
          )}
        </div>
      )}

      {/* ADVANCED VIEW ONLY: FULL PRIOR -> LIKELIHOOD -> POSTERIOR TABLE */}
      {showMath && (
        <div className="space-y-3 pt-2 border-t border-[#E5E7EB] animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs font-mono text-[#6B7280] px-2 py-1">
            <div className="flex items-center gap-2">
              <span>DOMAIN RANK</span>
              {(stage2Data?.engagement_score !== undefined || stage2Data?.engagement?.engagement_score !== undefined) && (
                <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-[#4F46E5] font-semibold text-[10px] border border-indigo-200">
                  Engagement Score: {((stage2Data?.engagement_score ?? stage2Data?.engagement?.engagement_score ?? 0) > 0 ? `+${(stage2Data?.engagement_score ?? stage2Data?.engagement?.engagement_score ?? 0).toFixed(2)}` : (stage2Data?.engagement_score ?? stage2Data?.engagement?.engagement_score ?? 0).toFixed(2))} (Mult: {(1.0 + (stage2Data?.engagement_score ?? stage2Data?.engagement?.engagement_score ?? 0) * 1.2).toFixed(2)}x)
                </span>
              )}
            </div>
            <span>PRIOR → LIKELIHOOD → POSTERIOR</span>
          </div>

          <div className="divide-y divide-[#E5E7EB] bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] overflow-hidden">
            {sortedCategories.slice(0, 5).map((category, idx) => {
              const currentPost = posterior[category] || 0;
              const priorVal = stage2Data?.prior?.[category] ?? 0.125;
              const likVal = stage2Data?.likelihood?.[category] ?? 0.125;
              const adjLikVal = stage2Data?.adjusted_likelihood?.[category] ?? likVal;

              return (
                <div
                  key={category}
                  className="flex items-center justify-between p-2.5 hover:bg-white text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-[#1E2333] font-mono text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-[#1E2333] font-mono">{category}</span>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-[#6B7280]" title="Prior P(d)">
                      P: {(priorVal * 100).toFixed(0)}%
                    </span>
                    <span className="text-slate-300">→</span>
                    <span className="text-[#0D9488]" title="Semantic Likelihood L(d)">
                      L: {(likVal * 100).toFixed(0)}%
                    </span>
                    {adjLikVal !== likVal && (
                      <>
                        <span className="text-slate-300">→</span>
                        <span className="text-teal-600 font-medium" title="Adjusted Likelihood after engagement weighting">
                          Adj: {(adjLikVal * 100).toFixed(0)}%
                        </span>
                      </>
                    )}
                    <span className="text-slate-300">→</span>
                    <span className="text-[#4F46E5] font-bold" title="Posterior P(d|E)">
                      Post: {(currentPost * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

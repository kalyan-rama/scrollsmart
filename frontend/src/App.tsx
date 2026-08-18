import React, { useState, useEffect } from 'react';
import {
  SessionState,
  ReelItem,
  PipelineTrace,
  DomainCategory,
  PosteriorDistribution,
  ConfidenceLevel,
} from './types';
import { Header } from './components/Header';
import { ReelPlayer } from './components/ReelPlayer';
import { PosteriorChart } from './components/PosteriorChart';
import { RecommendationCard } from './components/RecommendationCard';
import { PipelineTraceModal } from './components/PipelineTraceModal';
import { SimplifiedDecisionModal } from './components/SimplifiedDecisionModal';
import { CuratedBankModal } from './components/CuratedBankModal';
import { api } from './lib/api';
import {
  Sparkles,
  History,
  Terminal,
  RotateCcw,
  ShieldCheck,
  Radio,
  Clock,
  Compass,
  Cpu,
  Layers,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';

const LOADING_THOUGHTS = [
  'Reading between the memes...',
  'Extracting latent curiosity signals...',
  'Updating Dirichlet posterior distribution...',
  'Running vector retrieval with MMR diversity...',
  'Filtering out 10x developer hype with adversarial critic...',
  'Calibrating confidence score...',
];

export default function App() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [feedReels, setFeedReels] = useState<ReelItem[]>([]);
  const [curatedBank, setCuratedBank] = useState<ReelItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [loadingThoughtIndex, setLoadingThoughtIndex] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Progressive Disclosure Master Toggle: "Show the math"
  const [showMath, setShowMath] = useState<boolean>(false);

  // Modals
  const [isTraceModalOpen, setIsTraceModalOpen] = useState(false);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [selectedTrace, setSelectedTrace] = useState<PipelineTrace | null>(null);
  const [isBankOpen, setIsBankOpen] = useState(false);

  // Auto Trap Demo state
  const [isAutoDemoRunning, setIsAutoDemoRunning] = useState(false);

  // Cycle loading thoughts while processing
  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => {
      setLoadingThoughtIndex((prev) => (prev + 1) % LOADING_THOUGHTS.length);
    }, 1100);
    return () => clearInterval(interval);
  }, [isProcessing]);

  // Initialize Session and Fetch Data
  useEffect(() => {
    async function init() {
      try {
        // 1. Create Session
        const newSession = await api.createSession();
        if (newSession) {
          setSession(newSession);
        }

        // 2. Fetch Feed Reels
        const reels = await api.fetchFeedReels();
        if (reels) {
          setFeedReels(reels);
        }

        // 3. Fetch Curated Bank
        const bank = await api.fetchCuratedBank();
        if (bank) {
          setCuratedBank(bank);
        }
      } catch (err: any) {
        console.error('Initialization error:', err);
        setErrorMsg('Failed to connect to backend server. Retrying...');
      }
    }

    init();
  }, []);

  // Handle Reel Watch & Pipeline Execution
  const handleWatchReel = async (
    reel: ReelItem,
    engagement: number | {
      watch_pct?: number;
      watchPct?: number;
      completed?: boolean;
      liked?: boolean;
      commented?: boolean;
      shared?: boolean;
      saved?: boolean;
      skipped?: boolean;
      replayed?: boolean;
      watch_duration?: number;
      watchDuration?: number;
    } = 1.0
  ): Promise<boolean> => {
    const metrics =
      typeof engagement === 'number'
        ? { watch_pct: engagement }
        : engagement;

    let activeSession = session;
    if (!activeSession) {
      try {
        activeSession = await api.createSession();
        if (activeSession) setSession(activeSession);
      } catch (err) {
        console.error('Failed to create session on the fly:', err);
      }
    }

    if (!activeSession) return false;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const data = await api.watchReel(activeSession.id, {
        reelId: reel.id,
        reel,
        watch_pct: metrics.watch_pct ?? metrics.watchPct ?? 1.0,
        completed: metrics.completed ?? false,
        liked: metrics.liked ?? false,
        commented: metrics.commented ?? false,
        shared: metrics.shared ?? false,
        saved: metrics.saved ?? false,
        skipped: metrics.skipped ?? false,
        replayed: metrics.replayed ?? false,
        watch_duration: metrics.watch_duration ?? metrics.watchDuration ?? 0,
      });

      if (data.session && data.trace) {
        setSession(data.session);
        setSelectedTrace(data.trace);
      }
      return true;
    } catch (err: any) {
      console.error('Pipeline execution error:', err);
      setErrorMsg(err.message || 'Pipeline execution failed.');
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle User Feedback on Recommendation
  const handleFeedback = async (
    category: DomainCategory,
    action: 'like' | 'save' | 'skip' | 'watch_complete'
  ) => {
    if (!session) return;
    try {
      const data = await api.sendFeedback(session.id, category, action);
      if (data.session) {
        setSession(data.session);
      }
    } catch (err) {
      console.error('Feedback error:', err);
    }
  };

  // Reset Session
  const handleReset = async () => {
    try {
      const newSession = await api.createSession();
      if (newSession) {
        setSession(newSession);
        setSelectedTrace(null);
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error('Reset error:', err);
    }
  };

  // Auto Trap Demo: Sequentially runs the 4 demo trap reels
  const runAutoTrapDemo = async () => {
    if (isAutoDemoRunning || isProcessing) return;
    setIsAutoDemoRunning(true);

    let activeSession = session;
    try {
      activeSession = await api.createSession();
      if (activeSession) {
        setSession(activeSession);
      }
    } catch (e) {
      console.error('Reset error:', e);
    }

    const trapIndices = [0, 1, 2, 3, 4, 5];

    for (let i = 0; i < trapIndices.length; i++) {
      const targetIdx = trapIndices[i];
      setCurrentIndex(targetIdx);
      const targetReel = feedReels[targetIdx];

      if (targetReel && activeSession) {
        setIsProcessing(true);
        try {
          const data = await api.watchReel(activeSession.id, {
            reelId: targetReel.id,
            reel: targetReel,
            watch_pct: 1.0,
          });

          if (data.session && data.trace) {
            activeSession = data.session;
            setSession(data.session);
            setSelectedTrace(data.trace);
          }
        } catch (e) {
          console.error('Auto demo step error:', e);
        } finally {
          setIsProcessing(false);
        }
      }

      if (i < trapIndices.length - 1) {
        await new Promise((r) => setTimeout(r, 2200));
      }
    }

    setIsAutoDemoRunning(false);
  };

  const defaultPosterior: PosteriorDistribution = {
    AI: 0.125,
    DSA: 0.125,
    Java: 0.125,
    HLD: 0.125,
    Cybersecurity: 0.125,
    Cloud: 0.125,
    Hardware: 0.125,
    Career: 0.125,
  };

  const currentPosterior = session?.posterior || defaultPosterior;
  const currentConfidence: ConfidenceLevel = session?.confidence || 'Low';
  const latestTrace = session?.history[0] || selectedTrace;

  return (
    <div className="min-h-screen bg-[#F7F8FB] text-[#1E2333] flex flex-col font-sans selection:bg-[#4F46E5]/10 selection:text-[#4F46E5]">
      {/* Top App Bar */}
      <Header
        confidence={currentConfidence}
        totalWatched={session?.total_reels_watched || 0}
        onReset={handleReset}
        onOpenBank={() => setIsBankOpen(true)}
        isProcessing={isProcessing || isAutoDemoRunning}
        onRunAutoTrapDemo={runAutoTrapDemo}
        showMath={showMath}
        onToggleShowMath={() => setShowMath((prev) => !prev)}
      />

      {/* Main Layout: Native 9:16 Video Feed Pane + Telemetry & Recommendation Pane */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6 items-start">
        {/* NARROW FEED PANE (Max 380px) */}
        <div className="w-full lg:w-[380px] shrink-0 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold tracking-wider uppercase text-[#6B7280] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0D9488] animate-pulse" />
              <span>Native 9:16 Feed</span>
            </h2>
            {isAutoDemoRunning && (
              <span className="text-xs font-semibold text-[#4F46E5] animate-pulse">
                Auto Trap Run...
              </span>
            )}
          </div>

          <ReelPlayer
            reels={feedReels}
            currentIndex={currentIndex}
            onSelectReel={(idx) => setCurrentIndex(idx)}
            onWatchReel={handleWatchReel}
            isProcessing={isProcessing}
          />
        </div>

        {/* WIDE TELEMETRY & RECOMMENDATION PANE */}
        <div className="flex-1 w-full space-y-5">
          {/* Signature LED Equalizer Telemetry Chart */}
          <PosteriorChart
            posterior={currentPosterior}
            confidence={currentConfidence}
            stage2Data={latestTrace?.stage2}
            showMath={showMath}
          />

          {/* Processing / Reasoning State Banner */}
          {isProcessing && (
            <div className="p-4 bg-white border border-[#4F46E5]/30 rounded-xl shadow-sm flex items-center gap-3 animate-in fade-in duration-200">
              <div className="w-5 h-5 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin shrink-0" />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-[#4F46E5]">
                  AI Reasoning:
                </span>
                <p className="text-xs text-[#6B7280] font-medium">
                  {LOADING_THOUGHTS[loadingThoughtIndex]}
                </p>
              </div>
            </div>
          )}

          {/* Stage 5: Recommendation Card */}
          {latestTrace ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#6B7280] px-1">
                <span className="text-xs font-bold text-[#1E2333] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>Recommendation Result</span>
                </span>
                <span className="text-xs text-[#6B7280]">
                  From Watch Event #{session?.total_reels_watched || 1}
                </span>
              </div>

              <RecommendationCard
                output={latestTrace.stage5}
                trace={latestTrace}
                onFeedback={handleFeedback}
                onOpenTrace={() => {
                  setSelectedTrace(latestTrace);
                  setIsTraceModalOpen(true);
                }}
                onOpenSimplifiedDecision={() => {
                  setSelectedTrace(latestTrace);
                  setIsDecisionModalOpen(true);
                }}
                showMath={showMath}
              />
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-white border border-[#E5E7EB] text-center space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#4F46E5] border border-indigo-100 mx-auto flex items-center justify-center">
                <Radio className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#1E2333]">
                  Ready to discover your latent tech interests
                </h3>
                <p className="text-xs text-[#6B7280] max-w-md mx-auto leading-relaxed">
                  Click <strong>&quot;Watch next Reel&quot;</strong> on the left or launch the <strong>&quot;Demo Trap Sequence&quot;</strong> in the header to watch the AI filter hype and discover real curiosity.
                </p>
              </div>
            </div>
          )}

          {/* Session History */}
          {session && session.history.length > 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-3.5 shadow-sm select-none">
              <div className="flex items-center justify-between text-xs border-b border-[#E5E7EB] pb-2.5">
                <div className="flex items-center gap-2 font-bold text-[#1E2333]">
                  <History className="w-4 h-4 text-[#0D9488]" />
                  <span>Session History ({session.history.length} Watched)</span>
                </div>
                <span className="text-xs text-[#6B7280]">
                  Click any entry to see why it was chosen
                </span>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {session.history.map((t, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedTrace(t);
                      if (showMath) {
                        setIsTraceModalOpen(true);
                      } else {
                        setIsDecisionModalOpen(true);
                      }
                    }}
                    className="p-3 rounded-lg bg-[#F8FAFC] hover:bg-white border border-[#E5E7EB] hover:border-[#CBD5E1] flex items-center justify-between text-xs cursor-pointer transition-all shadow-2xs group"
                  >
                    <div className="space-y-1 max-w-md truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#0D9488]">
                          #{session.history.length - idx}
                        </span>
                        <span className="text-[#1E2333] font-semibold truncate group-hover:text-[#4F46E5] transition-colors">
                          {t.reel_title}
                        </span>
                      </div>

                      {/* Detail only in showMath mode or expanded */}
                      {showMath && (
                        <div className="flex items-center gap-2 text-[11px] font-mono text-[#6B7280]">
                          <span>Format: {t.stage1?.format || 'reel'}</span>
                          <span>•</span>
                          <span className="text-[#0D9488]">
                            Signal: {t.stage1?.underlying_signal || 'unknown'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-white border border-[#E5E7EB] text-[#4F46E5]">
                        {t.stage5?.category || 'Tech'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#4F46E5] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Simplified 3-Step Decision Modal */}
      <SimplifiedDecisionModal
        trace={selectedTrace}
        isOpen={isDecisionModalOpen}
        onClose={() => setIsDecisionModalOpen(false)}
        onOpenAdvancedTrace={() => setIsTraceModalOpen(true)}
      />

      {/* Advanced 5-Stage Pipeline Trace Modal */}
      <PipelineTraceModal
        trace={selectedTrace}
        isOpen={isTraceModalOpen}
        onClose={() => setIsTraceModalOpen(false)}
      />

      {/* Curated Bank Modal */}
      <CuratedBankModal
        bank={curatedBank}
        isOpen={isBankOpen}
        onClose={() => setIsBankOpen(false)}
      />
    </div>
  );
}

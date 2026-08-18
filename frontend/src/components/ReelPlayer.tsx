import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ReelItem, ReelFormat } from '../types';
import {
  ChevronDown,
  ChevronUp,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  CheckCircle2,
  Radio,
  Sliders,
  ExternalLink,
  Loader2,
  Flame,
  Search,
} from 'lucide-react';

export interface WatchEngagementPayload {
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
}

interface ReelPlayerProps {
  reels: ReelItem[];
  currentIndex: number;
  onSelectReel: (index: number) => void;
  onWatchReel: (reel: ReelItem, engagement: WatchEngagementPayload) => Promise<boolean> | void;
  isProcessing: boolean;
}

const SPEED_OPTIONS = [0.5, 1.0, 1.5, 2.0];

export const ReelPlayer: React.FC<ReelPlayerProps> = ({
  reels,
  currentIndex,
  onSelectReel,
  onWatchReel,
  isProcessing,
}) => {
  const currentReel = reels[currentIndex] || reels[0];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrubBarRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(currentReel?.duration_seconds || currentReel?.duration_sec || 15);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState<boolean>(false);
  const [isDraggingScrub, setIsDraggingScrub] = useState<boolean>(false);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [hasCommented, setHasCommented] = useState<boolean>(false);
  const [hasShared, setHasShared] = useState<boolean>(false);
  const [showPlayFeedback, setShowPlayFeedback] = useState<'play' | 'pause' | null>(null);
  const [showHeartBurst, setShowHeartBurst] = useState<boolean>(false);
  const [isCommentDrawerOpen, setIsCommentDrawerOpen] = useState<boolean>(false);
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState<string>('');
  const [userComments, setUserComments] = useState<string[]>([]);

  // Auto-analysis pipeline state per reel: 'idle' | 'analyzing' | 'finding' | 'ready'
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'analyzing' | 'finding' | 'ready'>('idle');
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<boolean>(false);

  // Track analyzed reel IDs to prevent duplicate calls per watch session
  const analyzedReelsRef = useRef<Record<number, boolean>>({});
  const replayCountRef = useRef<number>(0);
  const isLikedRef = useRef<boolean>(false);
  const isSavedRef = useRef<boolean>(false);
  const hasCommentedRef = useRef<boolean>(false);
  const hasSharedRef = useRef<boolean>(false);
  const watchStartTimeRef = useRef<number>(Date.now());
  const touchStartYRef = useRef<number>(0);

  // Keep refs in sync with state for instantaneous event closures
  useEffect(() => {
    isLikedRef.current = isLiked;
  }, [isLiked]);
  useEffect(() => {
    isSavedRef.current = isBookmarked;
  }, [isBookmarked]);
  useEffect(() => {
    hasCommentedRef.current = hasCommented;
  }, [hasCommented]);
  useEffect(() => {
    hasSharedRef.current = hasShared;
  }, [hasShared]);

  // Derive Cloudinary or direct video URL
  const videoSrc = currentReel?.video_url || 'https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-41484-large.mp4';
  const posterSrc = currentReel?.thumbnail_url;

  // Next 1-2 preloaded video URLs
  const nextReelsToPreload = reels.slice(currentIndex + 1, currentIndex + 3);

  // Sync playback rate to video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Handle current index change: load new video, reset states
  useEffect(() => {
    setCurrentTime(0);
    setIsLiked(false);
    setIsBookmarked(false);
    setHasCommented(false);
    setHasShared(false);
    setUserComments([]);
    setCommentInput('');
    setIsSpeedMenuOpen(false);
    setAutoAdvanceCountdown(false);
    setShareToast(null);
    replayCountRef.current = 0;
    watchStartTimeRef.current = Date.now();

    // Check if this reel was already analyzed in this session
    if (analyzedReelsRef.current[currentReel?.id]) {
      setAnalysisStatus('ready');
    } else {
      setAnalysisStatus('idle');
    }

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.playbackRate = playbackRate;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            if (videoRef.current) {
              videoRef.current.muted = true;
              setIsMuted(true);
              videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
            }
          });
      }
    }
  }, [currentIndex, videoSrc]);

  // Autoplay on scroll into view & auto-pause on scroll out (Intersection Observer)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!videoRef.current) return;
          if (entry.isIntersecting) {
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          } else {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.6 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // Safe Trigger Auto-Pipeline (guaranteed only once per reel)
  const triggerAutoPipeline = useCallback(
    async (
      reel: ReelItem,
      watchPct: number,
      options: { completed?: boolean; isSkip?: boolean } = {}
    ) => {
      if (analyzedReelsRef.current[reel.id]) {
        return; // Avoid duplicate call
      }

      analyzedReelsRef.current[reel.id] = true;

      if (!options.isSkip) {
        setAnalysisStatus('analyzing');
      }

      try {
        const payload: WatchEngagementPayload = {
          watch_pct: Math.max(0.05, Math.min(1.0, watchPct)),
          completed: options.completed || watchPct >= 0.95,
          liked: isLikedRef.current,
          saved: isSavedRef.current,
          commented: hasCommentedRef.current,
          shared: hasSharedRef.current,
          skipped: Boolean(options.isSkip),
          replayed: replayCountRef.current > 0,
          watch_duration: videoRef.current?.currentTime || 0,
        };

        const result = await onWatchReel(reel, payload);

        if (!options.isSkip) {
          setAnalysisStatus('finding');
          setTimeout(() => {
            setAnalysisStatus('ready');
          }, 700);
        }
      } catch (err) {
        console.error('Auto watch pipeline trigger error:', err);
        if (!options.isSkip) {
          setAnalysisStatus('ready');
        }
      }
    },
    [onWatchReel]
  );

  // Time update listener: monitors progress & 70% threshold
  const handleTimeUpdate = () => {
    if (!videoRef.current || isDraggingScrub) return;
    const curTime = videoRef.current.currentTime;
    const dur = videoRef.current.duration || duration || 15;
    setCurrentTime(curTime);

    const pct = dur > 0 ? curTime / dur : 0;

    // Automatic trigger at 70% threshold
    if (pct >= 0.70 && !analyzedReelsRef.current[currentReel?.id] && analysisStatus === 'idle' && !isProcessing) {
      triggerAutoPipeline(currentReel, pct, { completed: false });
    }
  };

  // Metadata loaded (duration)
  const handleLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.duration) {
      setDuration(videoRef.current.duration);
    }
  };

  // Video ended -> Full completion engagement & smooth auto-advance to next Reel
  const handleVideoEnded = () => {
    replayCountRef.current += 1;

    // If not analyzed yet, send full watch completion
    if (!analyzedReelsRef.current[currentReel?.id] && currentReel) {
      triggerAutoPipeline(currentReel, 1.0, { completed: true });
    }

    // Auto-advance to the next Reel seamlessly
    setAutoAdvanceCountdown(true);
    setTimeout(() => {
      setAutoAdvanceCountdown(false);
      handleNext(false); // Advance to next
    }, 1100);
  };

  // Safe Navigation with Skip Detection
  const handleNext = (isUserManual = true) => {
    // If user manually moves before 70% and wasn't analyzed yet, record skip
    if (isUserManual && !analyzedReelsRef.current[currentReel?.id] && currentReel) {
      const cur = videoRef.current?.currentTime || 0;
      const dur = duration || 15;
      const pct = cur / dur;
      if (cur > 1.2) {
        triggerAutoPipeline(currentReel, pct, { isSkip: true });
      }
    }

    if (currentIndex < reels.length - 1) {
      onSelectReel(currentIndex + 1);
    } else {
      onSelectReel(0);
    }
  };

  const handlePrev = () => {
    // If user manually skips backwards before 70%
    if (!analyzedReelsRef.current[currentReel?.id] && currentReel) {
      const cur = videoRef.current?.currentTime || 0;
      const dur = duration || 15;
      const pct = cur / dur;
      if (cur > 1.2) {
        triggerAutoPipeline(currentReel, pct, { isSkip: true });
      }
    }

    if (currentIndex > 0) {
      onSelectReel(currentIndex - 1);
    } else {
      onSelectReel(reels.length - 1);
    }
  };

  // Keyboard navigation (ArrowUp, ArrowDown, Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        handleNext(true);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, currentReel, isLiked, isBookmarked]);

  // Touch Swipe Gesture Handlers (Vertical Instagram Swipe)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchStartYRef.current - touchEndY;

    if (deltaY > 50) {
      // Swiped Up -> Next Reel
      handleNext(true);
    } else if (deltaY < -50) {
      // Swiped Down -> Prev Reel
      handlePrev();
    }
  };

  // Native Tap-to-play/pause on the video itself with Double-Tap Like support
  const handleVideoClick = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTapTime < 300) {
      // Double tap detected -> trigger heart burst & like
      setIsLiked(true);
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 900);
      setLastTapTime(0);
      return;
    }
    setLastTapTime(now);

    togglePlayPause();
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        triggerPlayFeedback('play');
      }).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      triggerPlayFeedback('pause');
    }
  };

  const triggerPlayFeedback = (action: 'play' | 'pause') => {
    setShowPlayFeedback(action);
    setTimeout(() => {
      setShowPlayFeedback(null);
    }, 450);
  };

  // Toggle mute
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const newMuted = !videoRef.current.muted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  // Real Seek Scrubber calculations
  const calculateScrubPosition = useCallback(
    (clientX: number) => {
      if (!scrubBarRef.current || !videoRef.current) return;
      const rect = scrubBarRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = clickX / rect.width;
      const targetTime = percentage * (duration || 1);
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    },
    [duration]
  );

  const handleScrubMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDraggingScrub(true);
    calculateScrubPosition(e.clientX);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      calculateScrubPosition(moveEvent.clientX);
    };

    const handleMouseUp = () => {
      setIsDraggingScrub(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleScrubTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDraggingScrub(true);
    calculateScrubPosition(e.touches[0].clientX);

    const handleTouchMove = (moveEvent: TouchEvent) => {
      calculateScrubPosition(moveEvent.touches[0].clientX);
    };

    const handleTouchEnd = () => {
      setIsDraggingScrub(false);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };

    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatSeconds = (sec: number) => {
    const total = Math.floor(sec);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getFormatBadgeStyle = (format: ReelFormat) => {
    switch (format) {
      case 'meme':
        return 'text-amber-300 border-amber-500/40 bg-amber-950/40';
      case 'lifestyle':
        return 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40';
      case 'interview_humor':
        return 'text-blue-300 border-blue-500/40 bg-blue-950/40';
      case 'news':
        return 'text-cyan-300 border-cyan-500/40 bg-cyan-950/40';
      case 'tutorial':
      case 'explainer':
        return 'text-indigo-300 border-indigo-500/40 bg-indigo-950/40';
      default:
        return 'text-slate-300 border-slate-700 bg-slate-900/60';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 9:16 Vertical Phone Player Shell */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative w-full aspect-[9/16] max-h-[660px] rounded-[12px] overflow-hidden bg-[#0B0E14] border border-[#151B26] shadow-2xl flex flex-col justify-between select-none group"
      >
        {/* Native 9:16 HTML5 Video Element with Cloudinary delivery */}
        <video
          ref={videoRef}
          src={videoSrc}
          poster={posterSrc}
          playsInline
          muted={isMuted}
          loop
          preload="auto"
          onClick={handleVideoClick}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleVideoEnded}
          className="absolute inset-0 w-full h-full object-cover cursor-pointer z-0"
        />

        {/* Fallback ambient video gradient layer if loading */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${
            currentReel?.thumbnail_gradient || 'from-zinc-900 to-black'
          } opacity-30 pointer-events-none -z-10`}
        />

        {/* Subtle Top & Bottom Vignettes for High-Contrast Text Legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 pointer-events-none z-10" />

        {/* Double-Tap Like Heart Burst Animation */}
        {showHeartBurst && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
            <div className="animate-in zoom-in-50 fade-in duration-200 animate-out zoom-out-150 fade-out duration-500 fill-rose-500 text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.8)]">
              <Heart className="w-24 h-24 fill-rose-500 text-rose-500" />
            </div>
          </div>
        )}

        {/* Play/Pause Haptic Visual Feedback Icon */}
        {showPlayFeedback && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white scale-100 animate-out fade-out zoom-out duration-300">
              <span className="font-mono text-xs uppercase tracking-widest font-bold">
                {showPlayFeedback === 'play' ? 'PLAYING' : 'PAUSED'}
              </span>
            </div>
          </div>
        )}

        {/* Auto-Advance Visual Toast on Video Completion */}
        {autoAdvanceCountdown && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-4 py-2 rounded-full bg-black/80 backdrop-blur-md border border-[#0D9488]/50 text-white flex items-center gap-2 shadow-2xl">
              <CheckCircle2 className="w-4 h-4 text-[#0D9488] animate-pulse" />
              <span className="text-xs font-semibold">Video complete • Next Reel loading...</span>
            </div>
          </div>
        )}

        {/* TOP OVERLAY: Header Bar, Telemetry Tag & Audio/Speed Controls */}
        <div className="relative z-20 p-3.5 flex items-center justify-between gap-2">
          {/* Reel Sequence Marker & Content Format Chip */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[11px] font-mono font-medium text-white/90 bg-[#151B26]/80 backdrop-blur-md rounded-[4px] border border-white/10">
              #{currentIndex + 1} of {reels.length}
            </span>
            <span
              className={`px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider rounded-[4px] border backdrop-blur-md ${getFormatBadgeStyle(
                currentReel?.format as ReelFormat
              )}`}
            >
              {currentReel?.format}
            </span>
          </div>

          {/* Controls: Audio Mute & Expandable Speed Pill */}
          <div className="flex items-center gap-2">
            {/* Speed Toggle Pill (0.5x / 1x / 1.5x / 2x) */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSpeedMenuOpen(!isSpeedMenuOpen);
                }}
                className="px-2 py-0.5 text-[11px] font-mono font-bold text-[#22D3EE] bg-[#151B26]/90 hover:bg-[#151B26] backdrop-blur-md rounded-[4px] border border-[#22D3EE]/30 transition-colors flex items-center gap-1 cursor-pointer"
                title="Playback Speed"
              >
                <span>{playbackRate}x</span>
              </button>

              {/* Speed Menu Drawer */}
              {isSpeedMenuOpen && (
                <div className="absolute right-0 top-7 mt-1 bg-[#151B26] border border-white/10 rounded-[4px] shadow-xl p-1 z-40 flex flex-col gap-0.5 min-w-[64px]">
                  {SPEED_OPTIONS.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlaybackRate(rate);
                        setIsSpeedMenuOpen(false);
                      }}
                      className={`px-2 py-1 text-[11px] font-mono rounded-[3px] text-left transition-colors ${
                        playbackRate === rate
                          ? 'bg-[#6366F1] text-white font-bold'
                          : 'text-[#9CA6B8] hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tap-to-Unmute Icon */}
            <button
              type="button"
              onClick={toggleMute}
              className="p-1.5 rounded-[4px] bg-[#151B26]/90 hover:bg-[#151B26] text-white/90 border border-white/10 backdrop-blur-md transition-colors cursor-pointer"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-[#22D3EE]" />}
            </button>
          </div>
        </div>

        {/* RIGHT SIDE FLOATING SOCIAL ACTION PILLS */}
        <div className="absolute right-3.5 bottom-28 z-20 flex flex-col items-center gap-3">
          {/* Like Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsLiked(!isLiked);
            }}
            className="flex flex-col items-center gap-0.5 group/btn cursor-pointer"
          >
            <div
              className={`w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
                isLiked ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 scale-110' : 'bg-[#151B26]/80 text-white/80 border border-white/10'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </div>
            <span className="text-[10px] font-mono text-white/80">{currentReel?.likes || '42K'}</span>
          </button>

          {/* Comment Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsCommentDrawerOpen(!isCommentDrawerOpen);
            }}
            className="flex flex-col items-center gap-0.5 cursor-pointer"
          >
            <div
              className={`w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
                isCommentDrawerOpen ? 'bg-[#6366F1]/20 text-[#6366F1] border border-[#6366F1]/50 scale-110' : 'bg-[#151B26]/80 text-white/80 border border-white/10'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono text-white/80">1.8K</span>
          </button>

          {/* Save / Bookmark Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsBookmarked(!isBookmarked);
            }}
            className="flex flex-col items-center gap-0.5 cursor-pointer"
          >
            <div
              className={`w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
                isBookmarked ? 'bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/50 scale-110' : 'bg-[#151B26]/80 text-white/80 border border-white/10'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </div>
            <span className="text-[10px] font-mono text-white/80">Save</span>
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setHasShared(true);
              hasSharedRef.current = true;
              if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href).catch(() => {});
              }
              if (navigator.share) {
                navigator.share({ title: currentReel?.title, url: window.location.href }).catch(() => {});
              }
              setShareToast('Reel shared! Signal boosted');
              setTimeout(() => setShareToast(null), 2500);
            }}
            className="flex flex-col items-center gap-0.5 cursor-pointer"
          >
            <div
              className={`w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
                hasShared ? 'bg-[#0D9488]/20 text-[#22D3EE] border border-[#0D9488]/50 scale-110' : 'bg-[#151B26]/80 text-white/80 border border-white/10 hover:bg-white/10'
              }`}
            >
              <Share2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono text-white/80">Share</span>
          </button>
        </div>

        {/* Share Feedback Toast */}
        {shareToast && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 rounded-full bg-slate-900/90 border border-[#0D9488]/50 text-white text-[11px] font-medium flex items-center gap-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span>{shareToast}</span>
          </div>
        )}

        {/* BOTTOM METADATA & SCRUB BAR */}
        <div className="relative z-20 p-3.5 space-y-2.5">
          {/* Creator & Caption Info */}
          <div className="space-y-1 pr-14">
            <div className="flex items-center gap-2">
              <img
                src={currentReel?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces'}
                alt={currentReel?.creator}
                className="w-6 h-6 rounded-full border border-white/20 object-cover"
              />
              <span className="text-xs font-semibold text-white tracking-tight">{currentReel?.creator}</span>
              {currentReel?.is_hype_trap && (
                <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-[2px]">
                  Bait Trap
                </span>
              )}
            </div>

            <p className="text-xs text-white/95 line-clamp-2 leading-relaxed font-normal">
              {currentReel?.title}
            </p>

            {/* Descriptive Content Tags */}
            <div className="flex flex-wrap gap-1 pt-0.5">
              {currentReel?.tags?.slice(0, 3).map((tag, i) => (
                <span key={i} className="text-[10px] font-mono text-[#9CA6B8] hover:text-[#22D3EE] transition-colors">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* REAL DRAGGABLE SEEK SCRUBBER */}
          <div className="space-y-1">
            <div
              ref={scrubBarRef}
              onMouseDown={handleScrubMouseDown}
              onTouchStart={handleScrubTouchStart}
              className="group/scrub relative w-full h-3 flex items-center cursor-pointer py-1"
            >
              {/* Background Track */}
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden transition-all group-hover/scrub:h-1.5">
                {/* Real-time Progress Fill in --signal-cyan */}
                <div
                  className="h-full bg-[#22D3EE] transition-[width] duration-75 ease-out rounded-full shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Scrubber Handle */}
              <div
                className="absolute w-3 h-3 bg-white rounded-full shadow-md -ml-1.5 opacity-0 group-hover/scrub:opacity-100 transition-opacity pointer-events-none"
                style={{ left: `${progressPercent}%` }}
              />
            </div>

            {/* Live Timestamp Readout & 70% threshold marker indicator */}
            <div className="flex items-center justify-between text-[10px] font-mono text-[#9CA6B8]">
              <span>{formatSeconds(currentTime)}</span>
              <span className="text-[9px] opacity-70">70% target: {formatSeconds(duration * 0.7)}</span>
              <span>{formatSeconds(duration)}</span>
            </div>
          </div>
        </div>

        {/* Comments Drawer Modal */}
        {isCommentDrawerOpen && (
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-md z-50 flex flex-col justify-end animate-in fade-in duration-200"
            onClick={(e) => {
              e.stopPropagation();
              setIsCommentDrawerOpen(false);
            }}
          >
            <div
              className="bg-[#111827] border-t border-[#1F2937] rounded-t-2xl p-4 flex flex-col max-h-[75%] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-250"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-[#6366F1]" />
                  <span className="text-xs font-semibold text-white">Comments (1,842)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCommentDrawerOpen(false)}
                  className="text-[#9CA3AF] hover:text-white text-xs font-mono px-2 py-0.5 rounded-md hover:bg-white/10"
                >
                  Close
                </button>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-xs">
                <div className="flex gap-2.5">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces"
                    className="w-7 h-7 rounded-full object-cover border border-white/10"
                    alt="avatar"
                  />
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white/90">@dev_priya</span>
                      <span className="text-[10px] text-[#6B7280]">2h ago</span>
                    </div>
                    <p className="text-[#D1D5DB] leading-relaxed">
                      {currentReel?.category === 'Entertainment'
                        ? 'GOAT energy right here! ⚽🐐'
                        : currentReel?.category === 'Java'
                        ? 'Semicolon missing at line 427 hits too close to home 😂'
                        : currentReel?.category === 'DSA'
                        ? 'Pointers always make sense until the interviewer asks you to code it live without a debugger 😭'
                        : currentReel?.category === 'Hardware'
                        ? 'M3 Max battery life is insane, but ThinkPad keyboard tactile feedback is unmatched.'
                        : 'Moving fast and shipping is the actual cheat code for early stage startups!'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=faces"
                    className="w-7 h-7 rounded-full object-cover border border-white/10"
                    alt="avatar"
                  />
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white/90">@alex_eng</span>
                      <span className="text-[10px] text-[#6B7280]">5h ago</span>
                    </div>
                    <p className="text-[#D1D5DB] leading-relaxed">
                      {currentReel?.category === 'Entertainment'
                        ? 'That bicycle kick will forever be legendary.'
                        : 'Saving this for my team standup tomorrow. 100% accurate.'}
                    </p>
                  </div>
                </div>
                {userComments.map((comment, idx) => (
                  <div key={idx} className="flex gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="w-7 h-7 rounded-full bg-[#6366F1] text-white font-bold flex items-center justify-center text-xs shrink-0">
                      U
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#22D3EE]">@you (viewer)</span>
                        <span className="text-[10px] text-[#6B7280]">Just now</span>
                      </div>
                      <p className="text-[#F3F4F6] leading-relaxed font-medium">{comment}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Comment Input */}
              <div className="pt-2 border-t border-[#1F2937] flex items-center gap-2">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && commentInput.trim()) {
                      e.preventDefault();
                      setUserComments((prev) => [...prev, commentInput.trim()]);
                      setCommentInput('');
                      setHasCommented(true);
                      hasCommentedRef.current = true;
                    }
                  }}
                  placeholder="Add a comment..."
                  className="flex-1 bg-[#1F2937] border border-[#374151] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#6366F1]"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  type="button"
                  disabled={!commentInput.trim()}
                  className="px-3 py-1.5 bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-40 disabled:hover:bg-[#6366F1] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (commentInput.trim()) {
                      setUserComments((prev) => [...prev, commentInput.trim()]);
                      setCommentInput('');
                      setHasCommented(true);
                      hasCommentedRef.current = true;
                    }
                  }}
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden Preload Elements for Next 1-2 Videos in Sequence */}
        <div className="hidden">
          {nextReelsToPreload.map((r) => (
            <video key={r.id} src={r.video_url} preload="metadata" muted playsInline />
          ))}
        </div>
      </div>

      {/* AUTOMATIC RECOMMENDATION ENGINE STATUS STRIP & VERTICAL SCROLL CONTROLS */}
      <div className="flex items-center justify-between gap-2">
        {/* Previous / Next Vertical Scroll Chevrons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrev}
            className="p-2.5 rounded-lg bg-white hover:bg-slate-50 text-[#1E2333] border border-[#E5E7EB] transition-colors cursor-pointer shadow-xs"
            title="Previous Reel (or Swipe Down / Up Arrow)"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleNext(true)}
            className="p-2.5 rounded-lg bg-white hover:bg-slate-50 text-[#1E2333] border border-[#E5E7EB] transition-colors cursor-pointer shadow-xs"
            title="Next Reel (or Swipe Up / Down Arrow)"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* REPLACED MANUAL BUTTON: SLEEK LIVE ENGINE STATUS INDICATOR */}
        <div className="flex-1 py-2 px-3 rounded-lg bg-white border border-[#E5E7EB] shadow-xs flex items-center justify-between gap-2 select-none">
          {analysisStatus === 'analyzing' || (isProcessing && analysisStatus !== 'ready') ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-[#4F46E5] animate-in fade-in duration-200">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4F46E5] shrink-0" />
              <span className="truncate">Analyzing your interest...</span>
            </div>
          ) : analysisStatus === 'finding' ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0D9488] animate-in fade-in duration-200">
              <Search className="w-3.5 h-3.5 animate-pulse text-[#0D9488] shrink-0" />
              <span className="truncate">Finding something useful...</span>
            </div>
          ) : analysisStatus === 'ready' ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#059669]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                <span className="truncate">Ready for you</span>
              </div>
              <button
                type="button"
                onClick={() => handleNext(false)}
                className="text-[11px] font-semibold text-[#4F46E5] hover:text-[#3730A3] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full text-xs">
              <div className="flex items-center gap-1.5 text-[#6B7280]">
                <span className="w-2 h-2 rounded-full bg-[#22D3EE] animate-pulse" />
                <span className="truncate font-medium">Tracking engagement</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-[#9CA3AF]">
                <span>{Math.round(progressPercent)}%</span>
                <span>/ 70%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


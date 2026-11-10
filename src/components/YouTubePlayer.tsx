import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { ExternalLink, AlertTriangle } from 'lucide-react';
import { VIDEO_ID, YOUTUBE_FALLBACK_URL, EDUCATIONAL_CREDIT_LINE, VIDEO_START_BOUND, VIDEO_END_BOUND } from '../constants/initialData';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

export interface YouTubePlayerHandle {
  playSegment: (start: number, end: number, loop?: boolean, onEnd?: () => void) => void;
  stopSegment: () => void;
  pause: () => void;
  play: () => void;
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  setPlaybackRate: (rate: number) => void;
  setLoop: (loop: boolean) => void;
  isReady: () => boolean;
}

interface YouTubePlayerProps {
  playbackRate?: number;
  onTimeUpdate?: (currentTime: number) => void;
  onPlayerReady?: () => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  showCredit?: boolean;
  className?: string;
}

export const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
  (
    {
      playbackRate = 1.0,
      onTimeUpdate,
      onPlayerReady,
      onPlayingChange,
      showCredit = true,
      className = '',
    },
    ref
  ) => {
    const containerId = useRef(`yt-player-${Math.random().toString(36).substring(2, 9)}`);
    const playerRef = useRef<any>(null);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(24.0);

    const activeSegmentRef = useRef<{
      start: number;
      end: number;
      loop: boolean;
      onEnd?: () => void;
    } | null>(null);

    const isWaitingLoopRef = useRef(false);
    const pollTimerRef = useRef<number | null>(null);
    const loopTimeoutRef = useRef<number | null>(null);

    // Stop active playback and cancel timers
    const stopSegment = useCallback(() => {
      activeSegmentRef.current = null;
      isWaitingLoopRef.current = false;
      if (loopTimeoutRef.current) {
        window.clearTimeout(loopTimeoutRef.current);
        loopTimeoutRef.current = null;
      }
      if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
        try {
          playerRef.current.pauseVideo();
        } catch (e) {
          // ignore
        }
      }
      setIsPlaying(false);
      if (onPlayingChange) onPlayingChange(false);
    }, [onPlayingChange]);

    // Update loop setting dynamically while running
    const setLoop = useCallback(
      (loop: boolean) => {
        if (activeSegmentRef.current) {
          activeSegmentRef.current.loop = loop;
        }
        if (!loop && isWaitingLoopRef.current) {
          // If currently waiting for loop to repeat and user turns loop off, cancel replay
          if (loopTimeoutRef.current) {
            window.clearTimeout(loopTimeoutRef.current);
            loopTimeoutRef.current = null;
          }
          isWaitingLoopRef.current = false;
          activeSegmentRef.current = null;
          setIsPlaying(false);
          if (onPlayingChange) onPlayingChange(false);
        }
      },
      [onPlayingChange]
    );

    // Play a specific segment with optional loop
    const playSegment = useCallback(
      (start: number, end: number, loop = false, onEnd?: () => void) => {
        if (!playerRef.current || typeof playerRef.current.seekTo !== 'function') {
          return;
        }

        if (loopTimeoutRef.current) {
          window.clearTimeout(loopTimeoutRef.current);
          loopTimeoutRef.current = null;
        }

        isWaitingLoopRef.current = false;
        activeSegmentRef.current = { start, end, loop, onEnd };

        try {
          playerRef.current.seekTo(start, true);
          playerRef.current.playVideo();
          setIsPlaying(true);
          if (onPlayingChange) onPlayingChange(true);
        } catch (err) {
          console.warn('Error starting segment:', err);
        }
      },
      [onPlayingChange]
    );

    // Imperative API exposed to parent components
    useImperativeHandle(
      ref,
      () => ({
        playSegment,
        stopSegment,
        setLoop,
        pause: () => {
          stopSegment();
        },
        play: () => {
          if (playerRef.current?.playVideo) {
            playerRef.current.playVideo();
            setIsPlaying(true);
            if (onPlayingChange) onPlayingChange(true);
          }
        },
        seekTo: (seconds: number) => {
          if (playerRef.current?.seekTo) {
            playerRef.current.seekTo(seconds, true);
          }
        },
        getCurrentTime: () => {
          if (playerRef.current?.getCurrentTime) {
            try {
              return playerRef.current.getCurrentTime();
            } catch (e) {
              return currentTime;
            }
          }
          return currentTime;
        },
        setPlaybackRate: (rate: number) => {
          if (playerRef.current?.setPlaybackRate) {
            try {
              playerRef.current.setPlaybackRate(rate);
            } catch (e) {
              console.warn('Failed to set playback rate:', e);
            }
          }
        },
        isReady: () => isPlayerReady,
      }),
      [playSegment, stopSegment, setLoop, currentTime, isPlayerReady, onPlayingChange]
    );

    // Apply playback rate changes
    useEffect(() => {
      if (isPlayerReady && playerRef.current?.setPlaybackRate) {
        try {
          playerRef.current.setPlaybackRate(playbackRate);
        } catch (e) {
          // Ignore
        }
      }
    }, [playbackRate, isPlayerReady]);

    // Initialize YouTube IFrame API
    useEffect(() => {
      let isSubscribed = true;

      const initPlayer = () => {
        if (!window.YT || !window.YT.Player) return;

        // Clean up previous instance if any
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
          try {
            playerRef.current.destroy();
          } catch (e) {
            // ignore
          }
        }

        try {
          playerRef.current = new window.YT.Player(containerId.current, {
            videoId: VIDEO_ID,
            width: '100%',
            height: '100%',
            playerVars: {
              start: Math.floor(VIDEO_START_BOUND),
              end: Math.ceil(VIDEO_END_BOUND),
              playsinline: 1,
              rel: 0,
              modestbranding: 1,
              controls: 1,
              cc_load_policy: 0,
              disablekb: 0,
              fs: 1,
              origin: window.location.origin,
            },
            events: {
              onReady: () => {
                if (!isSubscribed) return;
                setIsPlayerReady(true);
                setHasError(false);
                if (onPlayerReady) onPlayerReady();
                if (playerRef.current?.setPlaybackRate) {
                  playerRef.current.setPlaybackRate(playbackRate);
                }
              },
              onStateChange: (event: any) => {
                if (!isSubscribed) return;
                // YT.PlayerState.PLAYING = 1, PAUSED = 2, ENDED = 0
                if (event.data === 1) {
                  setIsPlaying(true);
                  if (onPlayingChange) onPlayingChange(true);
                } else if (event.data === 2 || event.data === 0) {
                  // Only set false if not currently in a loop wait pause
                  if (!isWaitingLoopRef.current) {
                    setIsPlaying(false);
                    if (onPlayingChange) onPlayingChange(false);
                  }
                }
              },
              onError: (event: any) => {
                console.warn('YouTube Player error code:', event.data);
                if (isSubscribed) {
                  setHasError(true);
                }
              },
            },
          });
        } catch (err) {
          console.warn('Could not instantiate YT.Player:', err);
          if (isSubscribed) setHasError(true);
        }
      };

      if (!window.YT || !window.YT.Player) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

        const prevReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (prevReady) prevReady();
          if (isSubscribed) initPlayer();
        };
      } else {
        initPlayer();
      }

      return () => {
        isSubscribed = false;
        if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
        if (loopTimeoutRef.current) window.clearTimeout(loopTimeoutRef.current);
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
          try {
            playerRef.current.destroy();
          } catch (e) {
            // ignore
          }
        }
      };
    }, []);

    // Polling loop (every 100ms) to check segment end and handle loop repetitions reliably
    useEffect(() => {
      pollTimerRef.current = window.setInterval(() => {
        if (!playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') {
          return;
        }

        let time = 0;
        try {
          time = playerRef.current.getCurrentTime();
          setCurrentTime(time);
          if (onTimeUpdate) {
            onTimeUpdate(time);
          }
        } catch (e) {
          return;
        }

        // Check active segment boundary
        const segment = activeSegmentRef.current;
        if (segment) {
          // If we are currently in the 1.5s pause between loops, do not re-trigger
          if (isWaitingLoopRef.current) {
            return;
          }

          if (time >= segment.end) {
            // Segment ended
            try {
              playerRef.current.pauseVideo();
            } catch (e) {
              // ignore
            }

            if (segment.onEnd) {
              segment.onEnd();
            }

            if (segment.loop) {
              // Mark that we are waiting for loop pause (1.5s)
              isWaitingLoopRef.current = true;
              if (loopTimeoutRef.current) window.clearTimeout(loopTimeoutRef.current);

              loopTimeoutRef.current = window.setTimeout(() => {
                isWaitingLoopRef.current = false;
                // Double check if loop is still active
                if (activeSegmentRef.current && activeSegmentRef.current.loop) {
                  try {
                    playerRef.current.seekTo(activeSegmentRef.current.start, true);
                    playerRef.current.playVideo();
                    setIsPlaying(true);
                    if (onPlayingChange) onPlayingChange(true);
                  } catch (e) {
                    console.warn('Failed to replay loop:', e);
                  }
                }
              }, 1500);
            } else {
              // Non-loop playback finished
              activeSegmentRef.current = null;
              isWaitingLoopRef.current = false;
              setIsPlaying(false);
              if (onPlayingChange) onPlayingChange(false);
            }
          }
        }
      }, 100);

      return () => {
        if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
      };
    }, [onTimeUpdate, onPlayingChange]);

    return (
      <div className={`w-full overflow-hidden ${className}`}>
        {/* 16:9 Video Aspect Ratio Container */}
        <div className="relative w-full aspect-video bg-stone-900 rounded-xl overflow-hidden shadow-sm border border-stone-200/80">
          {hasError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-stone-900 text-stone-100">
              <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
              <p className="text-sm font-medium mb-1">This video can&apos;t play inside the app.</p>
              <p className="text-xs text-stone-400 mb-4">
                유튜브 보안 정책으로 앱 내 임베드가 제한되었습니다. 브라우저 새 탭에서 영상을 확인하실 수 있습니다.
              </p>
              <a
                href={YOUTUBE_FALLBACK_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors"
              >
                <span>Open on YouTube (0:24)</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              <p className="text-[11px] text-stone-400 mt-3">
                문장 자막, 녹음, 발음 검사 기능은 정상 작동합니다.
              </p>
            </div>
          ) : (
            <div id={containerId.current} className="w-full h-full" />
          )}

          {/* Initial loading / tap affordance indicator if player not yet ready */}
          {!isPlayerReady && !hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-900/90 text-stone-200 text-xs gap-2">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading Notting Hill clip (0:24 - 1:15)...</span>
            </div>
          )}
        </div>

        {/* Mandatory Educational Credit line under video player */}
        {showCredit && (
          <p className="mt-2 text-[13px] text-stone-500 text-center leading-relaxed select-text font-normal">
            {EDUCATIONAL_CREDIT_LINE}
          </p>
        )}
      </div>
    );
  }
);

YouTubePlayer.displayName = 'YouTubePlayer';

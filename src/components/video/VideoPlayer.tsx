'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';
import { WatchedSegment } from '@/types/progress';
import { mergeSegments, getMaxWatchedPosition } from '@/lib/services/progress';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  initialSegments?: WatchedSegment[];
  initialPosition?: number;
  duration: number;
  onProgress?: (segments: WatchedSegment[], currentPosition: number) => void;
  onComplete?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  className?: string;
}

export function VideoPlayer({
  src,
  poster,
  initialSegments = [],
  initialPosition = 0,
  duration,
  onProgress,
  onComplete,
  onTimeUpdate,
  className = '',
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [watchedSegments, setWatchedSegments] = useState<WatchedSegment[]>(initialSegments);
  const [currentSegmentStart, setCurrentSegmentStart] = useState<number | null>(null);
  const [maxWatchedPosition, setMaxWatchedPosition] = useState<number>(
    getMaxWatchedPosition(initialSegments)
  );
  const [isReady, setIsReady] = useState(false);
  const [displayPosition, setDisplayPosition] = useState(0);
  const lastReportedPosition = useRef<number>(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Use refs to always have access to latest values in event handlers
  const watchedSegmentsRef = useRef<WatchedSegment[]>(watchedSegments);
  const currentSegmentStartRef = useRef<number | null>(currentSegmentStart);
  const maxWatchedPositionRef = useRef<number>(maxWatchedPosition);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  const onTimeUpdateRef = useRef(onTimeUpdate);

  // Keep refs updated
  useEffect(() => {
    watchedSegmentsRef.current = watchedSegments;
  }, [watchedSegments]);

  useEffect(() => {
    currentSegmentStartRef.current = currentSegmentStart;
  }, [currentSegmentStart]);

  useEffect(() => {
    maxWatchedPositionRef.current = maxWatchedPosition;
  }, [maxWatchedPosition]);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  // Track if chapter is completed (95%+ watched)
  const isChapterCompleted = useCallback(() => {
    const mergedSegments = mergeSegments(watchedSegmentsRef.current);
    const totalWatched = mergedSegments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
    return duration > 0 && (totalWatched / duration) >= 0.95;
  }, [duration]);

  // Handle seek attempts - NO skipping allowed until video is completed
  const handleSeek = useCallback(
    (player: Player, previousTime: number) => {
      const requestedTime = player.currentTime() || 0;
      
      // If chapter is completed, allow free seeking (rewatching)
      if (isChapterCompleted()) {
        return;
      }

      // Only allow seeking backwards (rewatching earlier parts)
      // Cannot skip forward past the max watched position
      if (requestedTime > maxWatchedPositionRef.current + 1) {
        // User tried to skip ahead - prevent it
        player.currentTime(maxWatchedPositionRef.current);
      }
    },
    [isChapterCompleted]
  );

  // Track previous time for seek detection
  const previousTimeRef = useRef<number>(0);

  // Update progress tracking - uses refs to always have latest values
  const updateProgress = useCallback(() => {
    const player = playerRef.current;
    if (!player || !isReady) return;

    const currentTime = player.currentTime() || 0;
    setDisplayPosition(currentTime);

    // Update current segment using refs for latest values
    if (currentSegmentStartRef.current !== null) {
      const newSegment: WatchedSegment = {
        start: currentSegmentStartRef.current,
        end: currentTime,
      };

      // Create updated segments list
      const updatedSegments = mergeSegments([...watchedSegmentsRef.current, newSegment]);
      setWatchedSegments(updatedSegments);
      watchedSegmentsRef.current = updatedSegments;

      // Update max watched position
      const newMaxPosition = Math.max(maxWatchedPositionRef.current, currentTime);
      setMaxWatchedPosition(newMaxPosition);
      maxWatchedPositionRef.current = newMaxPosition;

      // Report progress periodically (every 5 seconds of playback)
      if (currentTime - lastReportedPosition.current >= 5) {
        lastReportedPosition.current = currentTime;
        onProgressRef.current?.(updatedSegments, currentTime);
      }
    }

    onTimeUpdateRef.current?.(currentTime);
  }, [isReady]);

  // Initialize video.js player
  useEffect(() => {
    if (!videoRef.current) return;

    // Create video element
    const videoElement = document.createElement('video-js');
    videoElement.classList.add('vjs-big-play-centered');
    videoRef.current.appendChild(videoElement);

    // Initialize player
    const player = videojs(videoElement, {
      autoplay: false,
      controls: true,
      responsive: true,
      fluid: true,
      poster,
      sources: [{ src, type: 'video/mp4' }],
      controlBar: {
        playToggle: true,
        volumePanel: true,
        currentTimeDisplay: true,
        timeDivider: true,
        durationDisplay: true,
        progressControl: true,
        remainingTimeDisplay: false,
        fullscreenToggle: true,
      },
    });

    playerRef.current = player;

    // Handle player ready
    player.ready(() => {
      setIsReady(true);

      // Start at initial position if provided
      if (initialPosition > 0) {
        player.currentTime(initialPosition);
      }
    });

    // Handle play - start tracking segment
    player.on('play', () => {
      const currentTime = player.currentTime() || 0;
      setCurrentSegmentStart(currentTime);
      currentSegmentStartRef.current = currentTime;

      // Start progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      progressIntervalRef.current = setInterval(updateProgress, 1000);
    });

    // Handle pause - end current segment (uses refs for latest values)
    player.on('pause', () => {
      if (currentSegmentStartRef.current !== null) {
        const currentTime = player.currentTime() || 0;
        const newSegment: WatchedSegment = {
          start: currentSegmentStartRef.current,
          end: currentTime,
        };

        const updatedSegments = mergeSegments([...watchedSegmentsRef.current, newSegment]);
        setWatchedSegments(updatedSegments);
        watchedSegmentsRef.current = updatedSegments;
        onProgressRef.current?.(updatedSegments, currentTime);
        setCurrentSegmentStart(null);
        currentSegmentStartRef.current = null;
      }

      // Clear progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    });

    // Handle seeking - prevent skipping ahead
    player.on('seeking', () => {
      handleSeek(player, previousTimeRef.current);
    });

    // Track time for seek detection
    player.on('timeupdate', () => {
      previousTimeRef.current = player.currentTime() || 0;
    });

    // Handle video end (uses refs for latest values)
    player.on('ended', () => {
      // Final segment update
      if (currentSegmentStartRef.current !== null) {
        const finalSegment: WatchedSegment = {
          start: currentSegmentStartRef.current,
          end: duration,
        };

        const finalSegments = mergeSegments([...watchedSegmentsRef.current, finalSegment]);
        setWatchedSegments(finalSegments);
        watchedSegmentsRef.current = finalSegments;
        onProgressRef.current?.(finalSegments, duration);
        setCurrentSegmentStart(null);
        currentSegmentStartRef.current = null;
      }

      onCompleteRef.current?.();
    });

    // Cleanup
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [src]); // Only re-initialize when src changes

  // Update event handlers when dependencies change
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    // Remove old handlers and add new ones
    player.off('seeking');
    player.on('seeking', () => handleSeek(player, previousTimeRef.current));
  }, [handleSeek]);

  return (
    <div className={`video-player-wrapper ${className}`}>
      <div ref={videoRef} data-vjs-player className="w-full" />

      {/* Progress indicator showing watched segments */}
      <div className="mt-2">
        <SegmentProgress
          segments={watchedSegments}
          duration={duration}
          currentPosition={displayPosition}
        />
      </div>
    </div>
  );
}

// Visual representation of watched segments
function SegmentProgress({
  segments,
  duration,
  currentPosition,
}: {
  segments: WatchedSegment[];
  duration: number;
  currentPosition: number;
}) {
  if (duration <= 0) return null;

  const mergedSegments = mergeSegments(segments);
  const totalWatched = mergedSegments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
  const percentage = Math.min((totalWatched / duration) * 100, 100);

  return (
    <div className="space-y-1">
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        {/* Watched segments */}
        {mergedSegments.map((segment, index) => {
          const left = (segment.start / duration) * 100;
          const width = ((segment.end - segment.start) / duration) * 100;
          return (
            <div
              key={index}
              className="absolute h-full bg-green-500"
              style={{
                left: `${left}%`,
                width: `${width}%`,
              }}
            />
          );
        })}

        {/* Current position indicator */}
        <div
          className="absolute top-0 w-1 h-full bg-blue-600 z-10"
          style={{
            left: `${(currentPosition / duration) * 100}%`,
          }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>{percentage.toFixed(0)}% watched</span>
        <span>
          {formatTime(totalWatched)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}

// Format seconds to MM:SS or HH:MM:SS
function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

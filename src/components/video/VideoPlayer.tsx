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
  const lastReportedPosition = useRef<number>(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Calculate allowed seek position (can't skip ahead of watched content)
  const getAllowedSeekPosition = useCallback(
    (requestedTime: number): number => {
      // Allow seeking anywhere that has been watched
      const mergedSegments = mergeSegments(watchedSegments);

      // Check if the requested position is within any watched segment
      for (const segment of mergedSegments) {
        if (requestedTime >= segment.start && requestedTime <= segment.end) {
          return requestedTime;
        }
      }

      // If not in a watched segment, find the closest allowed position
      // Can seek to any position up to maxWatchedPosition
      if (requestedTime <= maxWatchedPosition) {
        return requestedTime;
      }

      // Otherwise, clamp to max watched position
      return maxWatchedPosition;
    },
    [watchedSegments, maxWatchedPosition]
  );

  // Handle seek attempts
  const handleSeek = useCallback(
    (player: Player) => {
      const currentTime = player.currentTime() || 0;
      const allowedTime = getAllowedSeekPosition(currentTime);

      if (Math.abs(currentTime - allowedTime) > 0.5) {
        // User tried to seek beyond allowed position
        player.currentTime(allowedTime);
      }
    },
    [getAllowedSeekPosition]
  );

  // Update progress tracking
  const updateProgress = useCallback(() => {
    const player = playerRef.current;
    if (!player || !isReady) return;

    const currentTime = player.currentTime() || 0;

    // Update current segment
    if (currentSegmentStart !== null) {
      const newSegment: WatchedSegment = {
        start: currentSegmentStart,
        end: currentTime,
      };

      // Create updated segments list
      const updatedSegments = mergeSegments([...watchedSegments, newSegment]);
      setWatchedSegments(updatedSegments);

      // Update max watched position
      const newMaxPosition = Math.max(maxWatchedPosition, currentTime);
      setMaxWatchedPosition(newMaxPosition);

      // Report progress periodically (every 5 seconds of playback)
      if (currentTime - lastReportedPosition.current >= 5) {
        lastReportedPosition.current = currentTime;
        onProgress?.(updatedSegments, currentTime);
      }
    }

    onTimeUpdate?.(currentTime);
  }, [
    currentSegmentStart,
    watchedSegments,
    maxWatchedPosition,
    onProgress,
    onTimeUpdate,
    isReady,
  ]);

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

      // Start progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      progressIntervalRef.current = setInterval(updateProgress, 1000);
    });

    // Handle pause - end current segment
    player.on('pause', () => {
      if (currentSegmentStart !== null) {
        const currentTime = player.currentTime() || 0;
        const newSegment: WatchedSegment = {
          start: currentSegmentStart,
          end: currentTime,
        };

        const updatedSegments = mergeSegments([...watchedSegments, newSegment]);
        setWatchedSegments(updatedSegments);
        onProgress?.(updatedSegments, currentTime);
        setCurrentSegmentStart(null);
      }

      // Clear progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    });

    // Handle seeking
    player.on('seeking', () => {
      handleSeek(player);
    });

    // Handle video end
    player.on('ended', () => {
      // Final segment update
      if (currentSegmentStart !== null) {
        const finalSegment: WatchedSegment = {
          start: currentSegmentStart,
          end: duration,
        };

        const finalSegments = mergeSegments([...watchedSegments, finalSegment]);
        setWatchedSegments(finalSegments);
        onProgress?.(finalSegments, duration);
        setCurrentSegmentStart(null);
      }

      onComplete?.();
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
    player.on('seeking', () => handleSeek(player));
  }, [handleSeek]);

  return (
    <div className={`video-player-wrapper ${className}`}>
      <div ref={videoRef} data-vjs-player className="w-full" />

      {/* Progress indicator showing watched segments */}
      <div className="mt-2">
        <SegmentProgress
          segments={watchedSegments}
          duration={duration}
          currentPosition={playerRef.current?.currentTime() || 0}
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

'use client';

import { useRef, useEffect, useState } from 'react';
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
  isCompleted?: boolean;
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
  isCompleted: initiallyCompleted = false,
  onProgress,
  onComplete,
  onTimeUpdate,
  className = '',
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [watchedSegments, setWatchedSegments] = useState<WatchedSegment[]>(initialSegments);
  const [currentSegmentStart, setCurrentSegmentStart] = useState<number | null>(null);
  
  // maxWatched: the furthest point the user has watched
  // If already completed, set to full duration so they can seek anywhere
  const [maxWatched, setMaxWatched] = useState<number>(
    initiallyCompleted ? duration : getMaxWatchedPosition(initialSegments)
  );
  const [displayPosition, setDisplayPosition] = useState(0);
  const lastReportedPosition = useRef<number>(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refs for latest values in event handlers (closures capture stale values otherwise)
  const watchedSegmentsRef = useRef<WatchedSegment[]>(watchedSegments);
  const currentSegmentStartRef = useRef<number | null>(currentSegmentStart);
  const maxWatchedRef = useRef<number>(maxWatched);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const durationRef = useRef(duration);

  // Keep refs in sync with state
  useEffect(() => { watchedSegmentsRef.current = watchedSegments; }, [watchedSegments]);
  useEffect(() => { currentSegmentStartRef.current = currentSegmentStart; }, [currentSegmentStart]);
  useEffect(() => { maxWatchedRef.current = maxWatched; }, [maxWatched]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate; }, [onTimeUpdate]);
  useEffect(() => { durationRef.current = duration; }, [duration]);

  // Track the last known time to detect seeks vs natural playback
  const lastTimeRef = useRef<number>(0);

  // Check if video is completed (maxWatched >= 98% of duration)
  const isVideoCompleted = () => {
    return maxWatchedRef.current >= durationRef.current * 0.98;
  };

  // Initialize video.js player
  useEffect(() => {
    if (!videoRef.current) return;

    const videoElement = document.createElement('video-js');
    videoElement.classList.add('vjs-big-play-centered');
    videoRef.current.appendChild(videoElement);

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

    player.ready(() => {
      if (initialPosition > 0) {
        player.currentTime(initialPosition);
      }
    });

    // PLAY: Start tracking a new segment
    player.on('play', () => {
      const time = player.currentTime() || 0;
      setCurrentSegmentStart(time);
      currentSegmentStartRef.current = time;
      lastTimeRef.current = time; // Initialize lastTime when play starts

      // Start interval to update progress every second
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = setInterval(() => {
        const currentTime = player.currentTime() || 0;
        setDisplayPosition(currentTime);

        // Only update maxWatched if this is natural playback (small increment, not a seek)
        // Natural playback: currentTime is within ~2 seconds of lastTime
        const timeDelta = currentTime - lastTimeRef.current;
        const isNaturalPlayback = timeDelta >= 0 && timeDelta <= 2;

        if (isNaturalPlayback && currentTime > maxWatchedRef.current) {
          maxWatchedRef.current = currentTime;
          setMaxWatched(currentTime);
        }

        // Update lastTime for next check
        lastTimeRef.current = currentTime;

        // Update segments (only for natural playback)
        if (isNaturalPlayback && currentSegmentStartRef.current !== null && currentTime > currentSegmentStartRef.current) {
          const newSegment: WatchedSegment = {
            start: currentSegmentStartRef.current,
            end: currentTime,
          };
          const updated = mergeSegments([...watchedSegmentsRef.current, newSegment]);
          setWatchedSegments(updated);
          watchedSegmentsRef.current = updated;

          // Report every 5 seconds
          if (currentTime - lastReportedPosition.current >= 5) {
            lastReportedPosition.current = currentTime;
            onProgressRef.current?.(updated, currentTime);
          }
        }

        onTimeUpdateRef.current?.(currentTime);
      }, 1000);
    });

    // PAUSE: Save the current segment
    player.on('pause', () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      const currentTime = player.currentTime() || 0;
      // Only save segment if within valid watched range
      if (currentSegmentStartRef.current !== null && currentTime > currentSegmentStartRef.current) {
        // Only count up to maxWatched to prevent inflating progress from seeks
        const segmentEnd = Math.min(currentTime, maxWatchedRef.current + 1);
        if (segmentEnd > currentSegmentStartRef.current) {
          const newSegment: WatchedSegment = {
            start: currentSegmentStartRef.current,
            end: segmentEnd,
          };
          const updated = mergeSegments([...watchedSegmentsRef.current, newSegment]);
          setWatchedSegments(updated);
          watchedSegmentsRef.current = updated;
          onProgressRef.current?.(updated, currentTime);
        }
      }
      setCurrentSegmentStart(null);
      currentSegmentStartRef.current = null;
    });

    // SEEKING: Block if trying to skip ahead past maxWatched (unless video is completed)
    player.on('seeking', () => {
      const requestedTime = player.currentTime() || 0;
      const currentMax = maxWatchedRef.current;

      // If video is completed, allow seeking anywhere
      if (isVideoCompleted()) {
        return;
      }

      // If trying to seek past maxWatched, snap back to maxWatched
      if (requestedTime > currentMax + 0.5) {
        player.currentTime(currentMax);
      }
    });

    // SEEKED: Double-check after seek completes and reset segment tracking
    player.on('seeked', () => {
      const currentTime = player.currentTime() || 0;
      const currentMax = maxWatchedRef.current;

      // Update lastTimeRef so the interval doesn't think this is natural playback
      lastTimeRef.current = currentTime;

      // If video is completed, allow seeking anywhere
      if (isVideoCompleted()) {
        // Start a new segment from here if playing
        if (!player.paused()) {
          setCurrentSegmentStart(currentTime);
          currentSegmentStartRef.current = currentTime;
        }
        return;
      }

      // If we ended up past maxWatched, snap back
      if (currentTime > currentMax + 0.5) {
        player.currentTime(currentMax);
      } else {
        // Valid seek within watched area - start a new segment from here if playing
        if (!player.paused()) {
          setCurrentSegmentStart(currentTime);
          currentSegmentStartRef.current = currentTime;
        }
      }
    });

    // ENDED: Video finished playing to the end
    player.on('ended', () => {
      if (currentSegmentStartRef.current !== null) {
        const finalSegment: WatchedSegment = {
          start: currentSegmentStartRef.current,
          end: durationRef.current,
        };
        const updated = mergeSegments([...watchedSegmentsRef.current, finalSegment]);
        setWatchedSegments(updated);
        watchedSegmentsRef.current = updated;
        onProgressRef.current?.(updated, durationRef.current);
      }

      // Mark as fully watched
      maxWatchedRef.current = durationRef.current;
      setMaxWatched(durationRef.current);

      setCurrentSegmentStart(null);
      currentSegmentStartRef.current = null;

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      onCompleteRef.current?.();
    });

    // TIME UPDATE: Track position for display
    player.on('timeupdate', () => {
      setDisplayPosition(player.currentTime() || 0);
    });

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [src]);

  return (
    <div className={`video-player-wrapper ${className}`}>
      <div ref={videoRef} data-vjs-player className="w-full" />
      <div className="mt-2">
        <SegmentProgress
          segments={watchedSegments}
          duration={duration}
          currentPosition={displayPosition}
          maxWatched={maxWatched}
        />
      </div>
    </div>
  );
}

function SegmentProgress({
  segments,
  duration,
  currentPosition,
  maxWatched,
}: {
  segments: WatchedSegment[];
  duration: number;
  currentPosition: number;
  maxWatched: number;
}) {
  if (duration <= 0) return null;

  const mergedSegments = mergeSegments(segments);
  const percentage = Math.min((maxWatched / duration) * 100, 100);

  return (
    <div className="space-y-1">
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        {/* Watched segments (green) */}
        {mergedSegments.map((segment, index) => {
          const left = (segment.start / duration) * 100;
          const width = ((segment.end - segment.start) / duration) * 100;
          return (
            <div
              key={index}
              className="absolute h-full bg-green-500"
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}

        {/* Current position indicator (blue) */}
        <div
          className="absolute top-0 w-1 h-full bg-blue-600 z-10"
          style={{ left: `${(currentPosition / duration) * 100}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>{percentage.toFixed(0)}% watched</span>
        <span>{formatTime(currentPosition)} / {formatTime(duration)}</span>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

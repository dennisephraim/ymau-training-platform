'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { WatchedSegment } from '@/types/progress';
import {
  getChapterProgress,
  saveChapterProgress,
  saveProgressToLocalStorage,
  loadProgressFromLocalStorage,
  clearLocalProgress,
  calculateWatchedPercentage,
  mergeSegments,
} from '@/lib/services/progress';

interface UseVideoProgressOptions {
  enrollmentId: string;
  chapterId: string;
  courseId: string;
  studentId: string;
  chapterDuration: number;
  autoSaveInterval?: number; // ms, default 30s
}

interface UseVideoProgressReturn {
  watchedSegments: WatchedSegment[];
  lastPosition: number;
  maxWatchedPosition: number;
  isCompleted: boolean;
  watchedPercentage: number;
  isLoading: boolean;
  error: Error | null;
  updateProgress: (segments: WatchedSegment[], currentPosition: number, maxWatched?: number) => void;
  saveProgress: () => Promise<void>;
  isSaving: boolean;
}

export function useVideoProgress({
  enrollmentId,
  chapterId,
  courseId,
  studentId,
  chapterDuration,
  autoSaveInterval = 30000, // Save every 30 seconds
}: UseVideoProgressOptions): UseVideoProgressReturn {
  const [watchedSegments, setWatchedSegments] = useState<WatchedSegment[]>([]);
  const [lastPosition, setLastPosition] = useState(0);
  const [maxWatchedPosition, setMaxWatchedPosition] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const pendingSegmentsRef = useRef<WatchedSegment[]>([]);
  const pendingPositionRef = useRef<number>(0);
  const pendingMaxWatchedRef = useRef<number>(0);
  const lastSavedRef = useRef<number>(Date.now());

  // Calculate watched percentage
  const watchedPercentage = calculateWatchedPercentage(watchedSegments, chapterDuration);

  // Load initial progress
  useEffect(() => {
    async function loadProgress() {
      try {
        setIsLoading(true);
        setError(null);

        // Reset state for new chapter
        setWatchedSegments([]);
        setLastPosition(0);
        setMaxWatchedPosition(0);
        setIsCompleted(false);

        // Try to load from local storage first (faster)
        const localProgress = loadProgressFromLocalStorage(chapterId);

        if (localProgress) {
          setWatchedSegments(localProgress.segments);
          setLastPosition(localProgress.lastPosition);
          setMaxWatchedPosition(localProgress.maxWatchedPosition || 0);
        }

        // Then fetch from server (more accurate)
        const serverProgress = await getChapterProgress(enrollmentId, chapterId);

        if (serverProgress) {
          // Merge local and server segments
          const mergedSegments = localProgress
            ? mergeSegments([...localProgress.segments, ...serverProgress.watchedSegments])
            : serverProgress.watchedSegments;

          setWatchedSegments(mergedSegments);
          setLastPosition(
            Math.max(serverProgress.lastPosition, localProgress?.lastPosition || 0)
          );
          // Use the maximum of server and local maxWatchedPosition
          setMaxWatchedPosition(
            Math.max(
              serverProgress.maxWatchedPosition || 0,
              localProgress?.maxWatchedPosition || 0
            )
          );
          setIsCompleted(serverProgress.isCompleted);

          // Clear local progress if server has everything
          if (!localProgress || serverProgress.lastPosition >= localProgress.lastPosition) {
            clearLocalProgress(chapterId);
          }
        }
      } catch (err) {
        console.error('Error loading progress:', err);
        setError(err instanceof Error ? err : new Error('Failed to load progress'));
      } finally {
        setIsLoading(false);
      }
    }

    if (enrollmentId && chapterId) {
      loadProgress();
    }
  }, [enrollmentId, chapterId]);

  // Update progress (called frequently during playback)
  const updateProgress = useCallback(
    (segments: WatchedSegment[], currentPosition: number, maxWatched?: number) => {
      const mergedSegments = mergeSegments([...watchedSegments, ...segments]);
      setWatchedSegments(mergedSegments);
      setLastPosition(Math.max(lastPosition, currentPosition));
      
      // Update maxWatchedPosition if provided
      if (maxWatched !== undefined) {
        const newMaxWatched = Math.max(maxWatchedPosition, maxWatched);
        setMaxWatchedPosition(newMaxWatched);
        pendingMaxWatchedRef.current = newMaxWatched;
      }

      // Store pending updates
      pendingSegmentsRef.current = mergedSegments;
      pendingPositionRef.current = currentPosition;

      // Save to local storage immediately for resilience
      saveProgressToLocalStorage(chapterId, mergedSegments, currentPosition, pendingMaxWatchedRef.current);

      // Check for completion
      const percentage = calculateWatchedPercentage(mergedSegments, chapterDuration);
      if (percentage >= 95 && !isCompleted) {
        setIsCompleted(true);
      }
    },
    [watchedSegments, lastPosition, maxWatchedPosition, chapterId, chapterDuration, isCompleted]
  );

  // Save progress to server
  const saveProgress = useCallback(async () => {
    if (pendingSegmentsRef.current.length === 0 || isSaving) return;

    try {
      setIsSaving(true);

      await saveChapterProgress(
        enrollmentId,
        chapterId,
        courseId,
        studentId,
        pendingSegmentsRef.current,
        pendingPositionRef.current,
        chapterDuration,
        pendingMaxWatchedRef.current
      );

      // Clear local storage after successful server save
      clearLocalProgress(chapterId);
      lastSavedRef.current = Date.now();
    } catch (err) {
      console.error('Error saving progress:', err);
      // Don't set error state for save failures, just log
      // Local storage backup will persist the data
    } finally {
      setIsSaving(false);
    }
  }, [enrollmentId, chapterId, courseId, studentId, chapterDuration, isSaving]);

  // Auto-save interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingSegmentsRef.current.length > 0) {
        saveProgress();
      }
    }, autoSaveInterval);

    return () => clearInterval(interval);
  }, [saveProgress, autoSaveInterval]);

  // Save on unmount or page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Can't use async here, so just ensure local storage is saved
      if (pendingSegmentsRef.current.length > 0) {
        saveProgressToLocalStorage(
          chapterId,
          pendingSegmentsRef.current,
          pendingPositionRef.current,
          pendingMaxWatchedRef.current
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Save on cleanup
      if (pendingSegmentsRef.current.length > 0) {
        saveProgress();
      }
    };
  }, [chapterId, saveProgress]);

  return {
    watchedSegments,
    lastPosition,
    maxWatchedPosition,
    isCompleted,
    watchedPercentage,
    isLoading,
    error,
    updateProgress,
    saveProgress,
    isSaving,
  };
}

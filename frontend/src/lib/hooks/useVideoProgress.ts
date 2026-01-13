'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { WatchedSegment, ChapterProgress } from '@/types/progress';
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
  isCompleted: boolean;
  watchedPercentage: number;
  isLoading: boolean;
  error: Error | null;
  updateProgress: (segments: WatchedSegment[], currentPosition: number) => void;
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
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const pendingSegmentsRef = useRef<WatchedSegment[]>([]);
  const pendingPositionRef = useRef<number>(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<number>(Date.now());

  // Calculate watched percentage
  const watchedPercentage = calculateWatchedPercentage(watchedSegments, chapterDuration);

  // Load initial progress
  useEffect(() => {
    async function loadProgress() {
      try {
        setIsLoading(true);
        setError(null);

        // Try to load from local storage first (faster)
        const localProgress = loadProgressFromLocalStorage(chapterId);

        if (localProgress) {
          setWatchedSegments(localProgress.segments);
          setLastPosition(localProgress.lastPosition);
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
    (segments: WatchedSegment[], currentPosition: number) => {
      const mergedSegments = mergeSegments([...watchedSegments, ...segments]);
      setWatchedSegments(mergedSegments);
      setLastPosition(Math.max(lastPosition, currentPosition));

      // Store pending updates
      pendingSegmentsRef.current = mergedSegments;
      pendingPositionRef.current = currentPosition;

      // Save to local storage immediately for resilience
      saveProgressToLocalStorage(chapterId, mergedSegments, currentPosition);

      // Check for completion
      const percentage = calculateWatchedPercentage(mergedSegments, chapterDuration);
      if (percentage >= 95 && !isCompleted) {
        setIsCompleted(true);
      }
    },
    [watchedSegments, lastPosition, chapterId, chapterDuration, isCompleted]
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
        chapterDuration
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
          pendingPositionRef.current
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
    isCompleted,
    watchedPercentage,
    isLoading,
    error,
    updateProgress,
    saveProgress,
    isSaving,
  };
}

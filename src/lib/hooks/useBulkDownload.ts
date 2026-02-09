import { useState, useRef, useCallback, useEffect } from 'react';
import {
  FileToDownload,
  DownloadProgress,
  downloadFilesAsZip,
  downloadBlob,
  sanitizeFileName,
} from '@/lib/utils/bulkDownload';

export type DownloadState = 'idle' | 'fetching' | 'zipping' | 'complete' | 'error' | 'cancelled';

export interface BulkDownloadState {
  state: DownloadState;
  currentFile: number;
  totalFiles: number;
  currentFileName: string;
  failedFiles: string[];
}

export interface UseBulkDownloadReturn {
  downloadState: BulkDownloadState;
  startDownload: (files: FileToDownload[], taskTitle: string) => Promise<void>;
  cancelDownload: () => void;
  resetState: () => void;
}

const initialState: BulkDownloadState = {
  state: 'idle',
  currentFile: 0,
  totalFiles: 0,
  currentFileName: '',
  failedFiles: [],
};

export function useBulkDownload(): UseBulkDownloadReturn {
  const [downloadState, setDownloadState] = useState<BulkDownloadState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleProgress = useCallback((progress: DownloadProgress) => {
    setDownloadState(prev => ({
      ...prev,
      state: progress.stage,
      currentFile: progress.currentFile,
      totalFiles: progress.totalFiles,
      currentFileName: progress.currentFileName,
    }));
  }, []);

  const startDownload = useCallback(async (files: FileToDownload[], taskTitle: string) => {
    // Abort any existing download
    abortControllerRef.current?.abort();

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setDownloadState({
      state: 'fetching',
      currentFile: 0,
      totalFiles: files.length,
      currentFileName: '',
      failedFiles: [],
    });

    try {
      const result = await downloadFilesAsZip(
        files,
        `${sanitizeFileName(taskTitle)}-submissions.zip`,
        handleProgress,
        abortControllerRef.current.signal
      );

      // Check if cancelled
      if (abortControllerRef.current.signal.aborted) {
        setDownloadState(prev => ({
          ...prev,
          state: 'cancelled',
        }));
        return;
      }

      if (result.success && result.blob) {
        // Trigger download
        downloadBlob(result.blob, `${sanitizeFileName(taskTitle)}-submissions.zip`);

        setDownloadState(prev => ({
          ...prev,
          state: 'complete',
          failedFiles: result.failedFiles,
        }));
      } else {
        setDownloadState(prev => ({
          ...prev,
          state: 'error',
          failedFiles: result.failedFiles,
        }));
      }
    } catch (error) {
      console.error('Bulk download error:', error);

      if (abortControllerRef.current.signal.aborted) {
        setDownloadState(prev => ({
          ...prev,
          state: 'cancelled',
        }));
      } else {
        setDownloadState(prev => ({
          ...prev,
          state: 'error',
        }));
      }
    }
  }, [handleProgress]);

  const cancelDownload = useCallback(() => {
    abortControllerRef.current?.abort();
    setDownloadState(prev => ({
      ...prev,
      state: 'cancelled',
    }));
  }, []);

  const resetState = useCallback(() => {
    setDownloadState(initialState);
  }, []);

  return {
    downloadState,
    startDownload,
    cancelDownload,
    resetState,
  };
}

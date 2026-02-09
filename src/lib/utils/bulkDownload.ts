export interface FileToDownload {
  url: string;
  fileName: string;
  studentName: string;
}

export interface DownloadProgress {
  currentFile: number;
  totalFiles: number;
  currentFileName: string;
  stage: 'fetching' | 'zipping';
}

export interface DownloadResult {
  success: boolean;
  failedFiles: string[];
  blob?: Blob;
}

/**
 * Sanitize a filename by removing special characters and handling duplicates
 */
export function sanitizeFileName(name: string): string {
  // Remove or replace special characters that are problematic in filenames
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim();
}

/**
 * Download multiple files and create a ZIP archive via server-side API
 *
 * Uses a Next.js API route to bypass CORS restrictions with Firebase Storage.
 * The server fetches files using signed download URLs and creates the ZIP.
 */
export async function downloadFilesAsZip(
  files: FileToDownload[],
  zipFileName: string,
  onProgress?: (progress: DownloadProgress) => void,
  abortSignal?: AbortSignal
): Promise<DownloadResult> {
  onProgress?.({
    currentFile: 0,
    totalFiles: files.length,
    currentFileName: 'Preparing download...',
    stage: 'fetching',
  });

  try {
    const response = await fetch('/api/bulk-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files, zipFileName: sanitizeFileName(zipFileName) }),
      signal: abortSignal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        failedFiles: errorData.failedFiles || ['Server error'],
      };
    }

    onProgress?.({
      currentFile: files.length,
      totalFiles: files.length,
      currentFileName: 'Creating ZIP file...',
      stage: 'zipping',
    });

    // Get failed files from header
    const failedFilesHeader = response.headers.get('X-Failed-Files');
    const failedFiles: string[] = failedFilesHeader
      ? JSON.parse(failedFilesHeader)
      : [];

    const blob = await response.blob();

    return {
      success: true,
      failedFiles,
      blob,
    };
  } catch (error) {
    // Handle abort
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, failedFiles: [] };
    }

    console.error('Bulk download error:', error);
    return {
      success: false,
      failedFiles: ['Network error - please try again'],
    };
  }
}

/**
 * Trigger download of a blob as a file
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

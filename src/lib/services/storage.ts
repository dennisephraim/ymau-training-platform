import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';

export interface UploadProgress {
  progress: number; // 0-100
  state: 'running' | 'paused' | 'success' | 'error';
  downloadUrl?: string;
  error?: string;
}

export type UploadProgressCallback = (progress: UploadProgress) => void;

/**
 * Upload a video file to Firebase Storage
 */
export async function uploadVideo(
  courseId: string,
  chapterId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<string> {
  if (!storage) {
    throw new Error('Firebase Storage not initialized');
  }

  // Create storage path: videos/{courseId}/{chapterId}/{filename}
  const extension = file.name.split('.').pop();
  const storagePath = `videos/${courseId}/${chapterId}/video.${extension}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.({
          progress,
          state: snapshot.state as 'running' | 'paused',
        });
      },
      (error) => {
        console.error('Upload error:', error);
        onProgress?.({
          progress: 0,
          state: 'error',
          error: error.message,
        });
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          onProgress?.({
            progress: 100,
            state: 'success',
            downloadUrl,
          });
          resolve(downloadUrl);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

/**
 * Upload a thumbnail image to Firebase Storage
 */
export async function uploadThumbnail(
  courseId: string,
  chapterId: string | null,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<string> {
  if (!storage) {
    throw new Error('Firebase Storage not initialized');
  }

  const extension = file.name.split('.').pop();
  const storagePath = chapterId
    ? `thumbnails/${courseId}/${chapterId}/thumb.${extension}`
    : `thumbnails/${courseId}/thumb.${extension}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.({
          progress,
          state: snapshot.state as 'running' | 'paused',
        });
      },
      (error) => {
        console.error('Upload error:', error);
        onProgress?.({
          progress: 0,
          state: 'error',
          error: error.message,
        });
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          onProgress?.({
            progress: 100,
            state: 'success',
            downloadUrl,
          });
          resolve(downloadUrl);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

/**
 * Delete a file from Firebase Storage
 */
export async function deleteFile(storagePath: string): Promise<void> {
  if (!storage) {
    throw new Error('Firebase Storage not initialized');
  }

  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
}

/**
 * Get the storage path from a download URL
 */
export function getStoragePathFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    // Firebase Storage URLs have path like /v0/b/{bucket}/o/{encoded-path}
    const match = path.match(/\/o\/(.+)$/);
    if (match) {
      return decodeURIComponent(match[1].split('?')[0]);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Upload a profile picture to Firebase Storage
 */
export async function uploadProfilePicture(
  userId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<string> {
  if (!storage) {
    throw new Error('Firebase Storage not initialized');
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image must be less than 5MB');
  }

  const extension = file.name.split('.').pop();
  const storagePath = `profile-pictures/${userId}/avatar.${extension}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.({
          progress,
          state: snapshot.state as 'running' | 'paused',
        });
      },
      (error) => {
        console.error('Upload error:', error);
        onProgress?.({
          progress: 0,
          state: 'error',
          error: error.message,
        });
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          onProgress?.({
            progress: 100,
            state: 'success',
            downloadUrl,
          });
          resolve(downloadUrl);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

/**
 * Upload a task response file to Firebase Storage
 */
export async function uploadTaskResponseFile(
  taskId: string,
  userId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<string> {
  if (!storage) {
    throw new Error('Firebase Storage not initialized');
  }

  // Validate file size (max 50MB)
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('File must be less than 50MB');
  }

  const extension = file.name.split('.').pop();
  const timestamp = Date.now();
  const storagePath = `task-responses/${taskId}/${userId}/${timestamp}.${extension}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.({
          progress,
          state: snapshot.state as 'running' | 'paused',
        });
      },
      (error) => {
        console.error('Upload error:', error);
        onProgress?.({
          progress: 0,
          state: 'error',
          error: error.message,
        });
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          onProgress?.({
            progress: 100,
            state: 'success',
            downloadUrl,
          });
          resolve(downloadUrl);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

/**
 * Upload a resource file to Firebase Storage
 */
export async function uploadResourceFile(
  resourceId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<string> {
  if (!storage) {
    throw new Error('Firebase Storage not initialized');
  }

  // Validate file size (max 100MB)
  if (file.size > 100 * 1024 * 1024) {
    throw new Error('File must be less than 100MB');
  }

  const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `resources/${resourceId}/${safeFileName}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.({
          progress,
          state: snapshot.state as 'running' | 'paused',
        });
      },
      (error) => {
        console.error('Upload error:', error);
        onProgress?.({
          progress: 0,
          state: 'error',
          error: error.message,
        });
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          onProgress?.({
            progress: 100,
            state: 'success',
            downloadUrl,
          });
          resolve(downloadUrl);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

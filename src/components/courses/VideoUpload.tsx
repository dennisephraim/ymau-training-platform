'use client';

import { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Video } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { uploadVideo, UploadProgress } from '@/lib/services/storage';
import * as courseService from '@/lib/services/courses';

interface VideoUploadProps {
  courseId: string;
  chapterId: string;
  currentVideoUrl?: string | null;
  onUploadComplete: (videoUrl: string) => void;
}

export function VideoUpload({
  courseId,
  chapterId,
  currentVideoUrl,
  onUploadComplete,
}: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }

    // Validate file size (max 2GB)
    const maxSize = 2 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 2GB');
      return;
    }

    setUploading(true);
    setError(null);
    setProgress({ progress: 0, state: 'running' });

    try {
      // Get video duration before upload
      const duration = await getVideoDuration(file);

      // Upload video
      const videoUrl = await uploadVideo(courseId, chapterId, file, (p) => {
        setProgress(p);
      });

      // Update chapter with video URL and duration
      await courseService.updateChapter(courseId, chapterId, {
        videoUrl,
        videoPath: `videos/${courseId}/${chapterId}/video.${file.name.split('.').pop()}`,
        durationSeconds: Math.round(duration),
      });

      onUploadComplete(videoUrl);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload video. Please try again.');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };

      video.onerror = () => {
        resolve(0);
      };

      video.src = URL.createObjectURL(file);
    });
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      {currentVideoUrl ? (
        <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">Video uploaded</p>
            <p className="text-xs text-green-600">Click below to replace the current video</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center space-x-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <Video className="h-5 w-5 text-gray-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">No video uploaded</p>
            <p className="text-xs text-gray-500">Upload a video file for this chapter</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {uploading && progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Uploading...</span>
            <span className="font-medium">{Math.round(progress.progress)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full"
      >
        <Upload className="h-4 w-4 mr-2" />
        {uploading ? 'Uploading...' : currentVideoUrl ? 'Replace Video' : 'Upload Video'}
      </Button>

      <p className="text-xs text-gray-500 text-center">
        Supported formats: MP4, WebM, MOV. Max size: 2GB
      </p>
    </div>
  );
}

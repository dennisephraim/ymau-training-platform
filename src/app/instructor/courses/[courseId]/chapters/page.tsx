'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, GripVertical, Edit, Trash2, Video, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { VideoUpload } from '@/components/courses/VideoUpload';
import { useCourse } from '@/lib/hooks/useCourses';
import { Chapter } from '@/types/course';
import * as courseService from '@/lib/services/courses';
import { formatTime } from '@/lib/utils/formatters';

export default function ChaptersPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const { course, loading, error, refetch } = useCourse(courseId);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-48 mt-2 animate-pulse"></div>
        </div>
        <Card className="animate-pulse">
          <CardContent className="py-8">
            <div className="h-20 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/instructor/courses"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Courses
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Course Not Found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/instructor/courses"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Courses
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{course.title}</h1>
        <p className="text-gray-600 mt-1">Manage course chapters and videos</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {course.chapters.length} {course.chapters.length === 1 ? 'chapter' : 'chapters'}
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Chapter
        </Button>
      </div>

      {showAddForm && (
        <ChapterForm
          courseId={courseId}
          order={course.chapters.length}
          onClose={() => setShowAddForm(false)}
          onSaved={() => {
            setShowAddForm(false);
            refetch();
          }}
        />
      )}

      {editingChapter && (
        <ChapterForm
          courseId={courseId}
          chapter={editingChapter}
          onClose={() => setEditingChapter(null)}
          onSaved={() => {
            setEditingChapter(null);
            refetch();
          }}
        />
      )}

      {course.chapters.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Video className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No chapters yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Add chapters to your course to get started.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {course.chapters.map((chapter, index) => (
            <ChapterItem
              key={chapter.id}
              chapter={chapter}
              index={index}
              onEdit={() => setEditingChapter(chapter)}
              onDelete={async () => {
                if (confirm('Are you sure you want to delete this chapter?')) {
                  await courseService.deleteChapter(courseId, chapter.id);
                  refetch();
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChapterItem({
  chapter,
  index,
  onEdit,
  onDelete,
}: {
  chapter: Chapter;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-gray-400 cursor-move">
            <GripVertical className="h-5 w-5" />
          </div>
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-medium text-gray-600">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{chapter.title}</h3>
            <p className="text-sm text-gray-500 truncate">
              {chapter.description || 'No description'}
            </p>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {formatTime(chapter.durationSeconds)}
            </div>
            {chapter.videoUrl ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Video uploaded
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                No video
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onEdit}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg hover:bg-gray-100 text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChapterForm({
  courseId,
  chapter,
  order,
  onClose,
  onSaved,
}: {
  courseId: string;
  chapter?: Chapter;
  order?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(chapter?.title || '');
  const [description, setDescription] = useState(chapter?.description || '');
  const [durationMinutes, setDurationMinutes] = useState(
    chapter ? Math.floor(chapter.durationSeconds / 60) : 0
  );
  const [durationSeconds, setDurationSeconds] = useState(
    chapter ? chapter.durationSeconds % 60 : 0
  );
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(chapter?.videoUrl || null);
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [pendingVideoPreview, setPendingVideoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // For new chapters - store video file to upload after chapter creation
  const [newChapterId, setNewChapterId] = useState<string | null>(null);

  const handleVideoUploadComplete = async (videoUrl: string) => {
    setCurrentVideoUrl(videoUrl);
    setPendingVideoFile(null);
    setPendingVideoPreview(null);
    // Fetch updated chapter to get the auto-extracted duration
    try {
      const updatedCourse = await courseService.getCourseWithChapters(courseId);
      const chapterId = chapter?.id || newChapterId;
      const updatedChapter = updatedCourse?.chapters.find((c: Chapter) => c.id === chapterId);
      if (updatedChapter) {
        setDurationMinutes(Math.floor(updatedChapter.durationSeconds / 60));
        setDurationSeconds(updatedChapter.durationSeconds % 60);
      }
    } catch (err) {
      console.error('Error fetching updated chapter:', err);
    }
  };

  // Handle video file selection for new chapters
  const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        setError('Please select a valid video file');
        return;
      }
      // Validate file size (500MB max)
      if (file.size > 500 * 1024 * 1024) {
        setError('Video file must be less than 500MB');
        return;
      }
      setPendingVideoFile(file);
      setPendingVideoPreview(URL.createObjectURL(file));
      
      // Try to get video duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        const duration = Math.round(video.duration);
        setDurationMinutes(Math.floor(duration / 60));
        setDurationSeconds(duration % 60);
      };
      video.src = URL.createObjectURL(file);
    }
  };

  const clearPendingVideo = () => {
    setPendingVideoFile(null);
    if (pendingVideoPreview) {
      URL.revokeObjectURL(pendingVideoPreview);
      setPendingVideoPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    setError(null);

    const totalSeconds = durationMinutes * 60 + durationSeconds;

    try {
      if (chapter) {
        await courseService.updateChapter(courseId, chapter.id, {
          title: title.trim(),
          description: description.trim(),
          durationSeconds: totalSeconds,
        });
        onSaved();
      } else {
        // Create the chapter first
        const createdChapterId = await courseService.createChapter(courseId, {
          title: title.trim(),
          description: description.trim(),
          order: order ?? 0,
          videoUrl: null,
          videoPath: null,
          durationSeconds: totalSeconds,
          thumbnailUrl: null,
        });
        
        // If there's a pending video, upload it now
        if (pendingVideoFile && createdChapterId) {
          setNewChapterId(createdChapterId);
          setUploadingVideo(true);
          try {
            const { uploadVideo } = await import('@/lib/services/storage');
            const videoUrl = await uploadVideo(courseId, createdChapterId, pendingVideoFile);
            await courseService.updateChapter(courseId, createdChapterId, {
              videoUrl,
              durationSeconds: totalSeconds,
            });
          } catch (uploadErr) {
            console.error('Error uploading video:', uploadErr);
            // Chapter was created, but video upload failed - still consider it a success
            // User can edit and re-upload
          }
          setUploadingVideo(false);
        }
        onSaved();
      }
    } catch (err) {
      console.error('Error saving chapter:', err);
      setError('Failed to save chapter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{chapter ? 'Edit Chapter' : 'Add New Chapter'}</CardTitle>
        <CardDescription>
          {chapter ? 'Update chapter details' : 'Create a new chapter for this course'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <Input
            label="Chapter Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Introduction to the African Union"
            required
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this chapter..."
              rows={2}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Video Duration</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-gray-500">min</span>
              <input
                type="number"
                min="0"
                max="59"
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(parseInt(e.target.value) || 0)}
                className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-gray-500">sec</span>
            </div>
            <p className="text-xs text-gray-500">
              Enter the expected duration. This will be updated automatically when you upload a video.
            </p>
          </div>

          {/* Video Upload Section - Only show when editing existing chapter */}
          {chapter && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Chapter Video</label>
              <VideoUpload
                courseId={courseId}
                chapterId={chapter.id}
                currentVideoUrl={currentVideoUrl}
                onUploadComplete={handleVideoUploadComplete}
              />
            </div>
          )}

          {/* Video Selection for New Chapters */}
          {!chapter && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Chapter Video (Optional)</label>
              {pendingVideoPreview ? (
                <div className="space-y-2">
                  <div className="relative rounded-lg overflow-hidden bg-gray-900 aspect-video">
                    <video
                      src={pendingVideoPreview}
                      className="w-full h-full object-contain"
                      controls
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 truncate flex-1">
                      {pendingVideoFile?.name}
                    </span>
                    <button
                      type="button"
                      onClick={clearPendingVideo}
                      className="ml-2 text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-ymau-dark-red/50 transition-colors">
                  <Video className="mx-auto h-10 w-10 text-gray-400" />
                  <div className="mt-2">
                    <label
                      htmlFor="video-upload-new"
                      className="cursor-pointer text-ymau-dark-red hover:text-ymau-dark-red/80 font-medium"
                    >
                      Select a video file
                      <input
                        id="video-upload-new"
                        type="file"
                        accept="video/*"
                        onChange={handleVideoFileSelect}
                        className="sr-only"
                      />
                    </label>
                    <p className="mt-1 text-xs text-gray-500">
                      MP4, WebM, or MOV up to 500MB
                    </p>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500">
                You can also add or change the video later by editing the chapter.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading || uploadingVideo}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading || uploadingVideo}>
              {uploadingVideo ? 'Uploading Video...' : chapter ? 'Save Changes' : pendingVideoFile ? 'Create & Upload' : 'Add Chapter'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

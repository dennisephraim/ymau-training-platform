'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, GripVertical, Edit, Trash2, Video, Clock, HelpCircle, CheckCircle, ChevronUp, Loader2, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { VideoUpload } from '@/components/courses/VideoUpload';
import { useCourse } from '@/lib/hooks/useCourses';
import { Chapter } from '@/types/course';
import { ChapterQuiz } from '@/types/quiz';
import * as courseService from '@/lib/services/courses';
import * as quizService from '@/lib/services/quizzes';
import { formatTime } from '@/lib/utils/formatters';

export default function ChaptersPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const { course, loading, error, refetch } = useCourse(courseId);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [chapterQuizzes, setChapterQuizzes] = useState<Map<string, ChapterQuiz>>(new Map());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // Fetch quizzes for all chapters
  useEffect(() => {
    const fetchQuizzes = async () => {
      if (!course) return;
      const quizzes = await quizService.getCourseQuizzes(courseId);
      const quizMap = new Map<string, ChapterQuiz>();
      quizzes.forEach((quiz) => quizMap.set(quiz.chapterId, quiz));
      setChapterQuizzes(quizMap);
    };
    fetchQuizzes();
  }, [courseId, course]);

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
        <div className="flex items-center gap-4">
          <Link href="/instructor/courses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Course Not Found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Link href="/instructor/courses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
          <p className="text-gray-600 mt-1">Manage course chapters and videos</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {course.chapters.length} {course.chapters.length === 1 ? 'chapter' : 'chapters'}
        </div>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Chapter
          </Button>
        )}
      </div>

      {/* Collapsible Add Chapter Form */}
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

      {course.chapters.length === 0 && !showAddForm ? (
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
      ) : course.chapters.length > 0 ? (
        <div className="space-y-2">
          {course.chapters.map((chapter, index) => (
            editingChapterId === chapter.id ? (
              <ChapterForm
                key={chapter.id}
                courseId={courseId}
                chapter={chapter}
                onClose={() => setEditingChapterId(null)}
                onSaved={() => {
                  setEditingChapterId(null);
                  refetch();
                }}
              />
            ) : (
              <ChapterItem
                key={chapter.id}
                chapter={chapter}
                courseId={courseId}
                quiz={chapterQuizzes.get(chapter.id)}
                index={index}
                isDragging={draggedIndex === index}
                isDragOver={dragOverIndex === index}
                isReordering={isReordering}
                onDragStart={() => setDraggedIndex(index)}
                onDragEnd={async () => {
                  if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
                    setIsReordering(true);
                    try {
                      // Create new order of chapter IDs
                      const chapterIds = [...course.chapters.map(ch => ch.id)];
                      const [movedId] = chapterIds.splice(draggedIndex, 1);
                      chapterIds.splice(dragOverIndex, 0, movedId);
                      await courseService.reorderChapters(courseId, chapterIds);
                      await refetch();
                    } catch (err) {
                      console.error('Failed to reorder chapters:', err);
                    }
                    setIsReordering(false);
                  }
                  setDraggedIndex(null);
                  setDragOverIndex(null);
                }}
                onDragOver={() => setDragOverIndex(index)}
                onEdit={() => setEditingChapterId(chapter.id)}
                onDelete={async () => {
                  if (confirm('Are you sure you want to delete this chapter?')) {
                    await courseService.deleteChapter(courseId, chapter.id);
                    refetch();
                  }
                }}
              />
            )
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ChapterItem({
  chapter,
  courseId,
  quiz,
  index,
  isDragging,
  isDragOver,
  isReordering,
  onDragStart,
  onDragEnd,
  onDragOver,
  onEdit,
  onDelete,
}: {
  chapter: Chapter;
  courseId: string;
  quiz?: ChapterQuiz;
  index: number;
  isDragging: boolean;
  isDragOver: boolean;
  isReordering: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card 
      className={`transition-all ${isDragging ? 'opacity-50 scale-[0.98]' : ''} ${isDragOver ? 'border-ymau-dark-red border-2' : ''} ${isReordering ? 'pointer-events-none' : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
    >
      <CardContent className="py-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-gray-400 cursor-grab active:cursor-grabbing">
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
            {chapter.contentType === 'text' ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <FileText className="h-3 w-3 mr-1" />
                Text content
              </span>
            ) : chapter.videoUrl ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Video uploaded
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                No video
              </span>
            )}
            {quiz ? (
              <Badge variant="info" size="sm" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {quiz.questions.length} quiz questions
              </Badge>
            ) : (
              <Badge variant="default" size="sm" className="flex items-center gap-1 text-gray-500">
                <HelpCircle className="h-3 w-3" />
                No quiz
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Link href={`/instructor/courses/${courseId}/chapters/${chapter.id}/quiz`}>
              <button
                className="p-2 rounded-lg hover:bg-gray-100 text-purple-600"
                title="Edit Quiz"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </Link>
            <button
              onClick={onEdit}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              title="Edit Chapter"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg hover:bg-gray-100 text-red-500"
              title="Delete Chapter"
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
  onSaved: (chapterId?: string) => void;
}) {
  const [title, setTitle] = useState(chapter?.title || '');
  const [description, setDescription] = useState(chapter?.description || '');
  const [contentType, setContentType] = useState<'video' | 'text'>(chapter?.contentType || 'video');
  const [textContent, setTextContent] = useState(chapter?.textContent || '');
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
      // Validate file size (2GB max)
      if (file.size > 2 * 1024 * 1024 * 1024) {
        setError('Video file must be less than 2GB');
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
          contentType,
          textContent: contentType === 'text' ? textContent : null,
          durationSeconds: totalSeconds,
        });
        onSaved(chapter.id);
      } else {
        // Create the chapter first
        const createdChapterId = await courseService.createChapter(courseId, {
          title: title.trim(),
          description: description.trim(),
          order: order ?? 0,
          contentType,
          videoUrl: null,
          videoPath: null,
          textContent: contentType === 'text' ? textContent : null,
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
        onSaved(createdChapterId);
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
      <CardHeader
        className="cursor-pointer"
        onClick={!loading && !uploadingVideo ? onClose : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-gray-500" />
            <CardTitle className="text-lg">{chapter ? 'Edit Chapter' : 'Add New Chapter'}</CardTitle>
          </div>
          <ChevronUp className="h-5 w-5 text-gray-500" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Upload Progress Overlay */}
          {uploadingVideo && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Uploading video...</p>
                  <p className="text-xs text-blue-600">This may take a moment depending on the file size</p>
                </div>
              </div>
            </div>
          )}

          <Input
            label="Chapter Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Introduction to the African Union"
            required
            disabled={uploadingVideo}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this chapter..."
              rows={2}
              disabled={uploadingVideo}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          {/* Content Type Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Content Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="contentType"
                  value="video"
                  checked={contentType === 'video'}
                  onChange={() => setContentType('video')}
                  disabled={uploadingVideo}
                  className="h-4 w-4 text-ymau-dark-red focus:ring-ymau-dark-red border-gray-300"
                />
                <span className="flex items-center gap-1 text-sm text-gray-700">
                  <Video className="h-4 w-4" />
                  Video
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="contentType"
                  value="text"
                  checked={contentType === 'text'}
                  onChange={() => setContentType('text')}
                  disabled={uploadingVideo}
                  className="h-4 w-4 text-ymau-dark-red focus:ring-ymau-dark-red border-gray-300"
                />
                <span className="flex items-center gap-1 text-sm text-gray-700">
                  <FileText className="h-4 w-4" />
                  Text
                </span>
              </label>
            </div>
          </div>

          {/* Text Content Section */}
          {contentType === 'text' && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Chapter Content</label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Enter the chapter content here. You can use this for reading materials, instructions, or any text-based learning content..."
                rows={10}
                disabled={uploadingVideo}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 font-mono text-sm"
              />
              <p className="text-xs text-gray-500">
                Tip: Students will need to scroll through and read this content before proceeding. Make it informative!
              </p>
            </div>
          )}

          {/* Video Upload Section - Only show when editing existing chapter */}
          {chapter && contentType === 'video' && (
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
          {!chapter && contentType === 'video' && (
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
                      MP4, WebM, or MOV up to 2GB
                    </p>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500">
                You can also add or change the video later by editing the chapter.
              </p>
            </div>
          )}

          {/* Quiz Section - Only show when editing existing chapter */}
          {chapter && (
            <div className="space-y-2 pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700">Chapter Quiz</label>
              <div className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <HelpCircle className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Quiz Questions</p>
                    <p className="text-xs text-gray-500">
                      Add questions students must answer to complete this chapter
                    </p>
                  </div>
                </div>
                <Link href={`/instructor/courses/${courseId}/chapters/${chapter.id}/quiz`}>
                  <Button type="button" variant="outline" size="sm" className="border-purple-300 text-purple-700 hover:bg-purple-100">
                    <HelpCircle className="h-4 w-4 mr-1" />
                    Edit Quiz
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Quiz info for new chapters */}
          {!chapter && (
            <div className="space-y-2 pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700">Chapter Quiz</label>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <HelpCircle className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Quiz Available After Creation</p>
                    <p className="text-xs text-gray-500">
                      Save this chapter first, then you can add quiz questions by clicking &quot;Edit Quiz&quot;
                    </p>
                  </div>
                </div>
              </div>
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

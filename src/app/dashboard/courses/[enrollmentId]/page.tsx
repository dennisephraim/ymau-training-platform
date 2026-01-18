'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Play,
  CheckCircle,
  Lock,
  Clock,
  ChevronRight,
  Award,
  PartyPopper,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/components/auth/AuthContext';
import { VideoPlayer } from '@/components/video';
import { useVideoProgress } from '@/lib/hooks/useVideoProgress';
import { Enrollment } from '@/types/enrollment';
import { Course, Chapter } from '@/types/course';
import { ChapterProgress, CourseProgress } from '@/types/progress';
import { Certificate } from '@/types/certificate';
import * as enrollmentService from '@/lib/services/enrollments';
import * as courseService from '@/lib/services/courses';
import * as progressService from '@/lib/services/progress';
import * as certificateService from '@/lib/services/certificates';
import { formatDuration } from '@/lib/utils/formatters';

export default function CourseViewerPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const { enrollmentId } = use(params);
  const { user } = useAuth();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);

  // Fetch course data
  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch enrollment
      const enrollmentData = await enrollmentService.getEnrollment(enrollmentId);
      if (!enrollmentData) {
        setError('Enrollment not found');
        return;
      }

      // Verify user owns this enrollment
      if (enrollmentData.studentId !== user.id) {
        setError('You do not have access to this course');
        return;
      }

      setEnrollment(enrollmentData);

      // Fetch course and chapters
      const courseData = await courseService.getCourse(enrollmentData.courseId);
      if (!courseData) {
        setError('Course not found');
        return;
      }
      setCourse(courseData);

      const chaptersData = await courseService.getChapters(enrollmentData.courseId);
      setChapters(chaptersData);

      // Fetch progress
      const progress = await progressService.getCourseProgress(
        enrollmentId,
        enrollmentData.courseId
      );
      setCourseProgress(progress);

      // Check for existing certificate
      const existingCert = await certificateService.getCertificateByEnrollment(enrollmentId);
      setCertificate(existingCert);

      // Set initial active chapter (first incomplete or first chapter)
      if (chaptersData.length > 0) {
        const incompleteChapter = chaptersData.find((ch) => {
          const chapterProgress = progress.chapterProgress.find(
            (p) => p.chapterId === ch.id
          );
          return !chapterProgress?.isCompleted;
        });
        setActiveChapterId(incompleteChapter?.id || chaptersData[0].id);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load course');
    } finally {
      setLoading(false);
    }
  }, [enrollmentId, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh progress after video updates
  const handleProgressUpdate = useCallback(async () => {
    if (!enrollment || !course || !user) return;

    const progress = await progressService.getCourseProgress(
      enrollmentId,
      enrollment.courseId
    );
    setCourseProgress(progress);

    // Check if course is now complete and no certificate exists yet
    const isComplete = await progressService.isCourseCompleted(enrollmentId, enrollment.courseId);

    if (isComplete && !certificate) {
      setShowCompletionModal(true);
    }
  }, [enrollmentId, enrollment, course, user, certificate]);

  // Generate certificate when course is completed
  const handleGenerateCertificate = useCallback(async () => {
    if (!enrollment || !course || !user || certificate) return;

    try {
      setIsGeneratingCertificate(true);

      // Create certificate
      const newCert = await certificateService.createCertificate(
        enrollment.id,
        enrollment.courseId,
        user.id,
        user.displayName || user.email || 'Student',
        course.title,
        'system', // Auto-issued
        'YMAU Training Platform'
      );

      // Mark enrollment as completed
      await enrollmentService.markEnrollmentCompleted(enrollment.id, newCert.id);

      setCertificate(newCert);
      setShowCompletionModal(false);
    } catch (error) {
      console.error('Error generating certificate:', error);
    } finally {
      setIsGeneratingCertificate(false);
    }
  }, [enrollment, course, user, certificate]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
        <div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-gray-200 rounded animate-pulse" />
          <div className="h-96 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !enrollment || !course) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/courses"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to My Courses
        </Link>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-red-600">{error || 'Something went wrong'}</p>
              <Link href="/dashboard/courses">
                <Button className="mt-4">Go to My Courses</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeChapter = chapters.find((ch) => ch.id === activeChapterId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/courses"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to My Courses
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{course.title}</h1>
        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
          <span>{chapters.length} chapters</span>
          <span>|</span>
          <span>{formatDuration(course.totalDurationSeconds)} total</span>
          <span>|</span>
          <span className="text-blue-600 font-medium">
            {(courseProgress?.overallPercentage || 0).toFixed(0)}% complete
          </span>
        </div>
      </div>

      {/* Course progress bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${courseProgress?.overallPercentage || 0}%` }}
        />
      </div>

      {/* Certificate Banner - shown when certificate exists */}
      {certificate && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <Award className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-green-800">
                    Course Completed!
                  </h3>
                  <p className="text-sm text-green-600">
                    Your certificate is ready to download
                  </p>
                </div>
              </div>
              <Link href="/dashboard/certificates">
                <Button className="bg-green-600 hover:bg-green-700">
                  View Certificate
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowCompletionModal(false)}
          />
          <Card className="relative z-10 w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-6 text-center">
              <PartyPopper className="h-16 w-16 mx-auto text-white mb-2" />
              <h2 className="text-2xl font-bold text-white">
                Congratulations!
              </h2>
            </div>
            <CardContent className="p-6 text-center space-y-4">
              <p className="text-gray-600">
                You have successfully completed all chapters of
              </p>
              <p className="text-xl font-bold text-gray-900">{course.title}</p>
              <p className="text-sm text-gray-500">
                Click below to generate your certificate of completion.
              </p>
              <div className="pt-4 space-y-2">
                <Button
                  onClick={handleGenerateCertificate}
                  disabled={isGeneratingCertificate}
                  className="w-full"
                  isLoading={isGeneratingCertificate}
                >
                  <Award className="h-4 w-4 mr-2" />
                  {isGeneratingCertificate
                    ? 'Generating Certificate...'
                    : 'Generate My Certificate'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCompletionModal(false)}
                  className="w-full"
                >
                  Maybe Later
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video player */}
        <div className="lg:col-span-2">
          {activeChapter ? (
            <ChapterVideoPlayer
              chapter={activeChapter}
              enrollmentId={enrollmentId}
              courseId={course.id}
              studentId={user!.id}
              progress={courseProgress?.chapterProgress.find(
                (p) => p.chapterId === activeChapter.id
              )}
              onProgressUpdate={handleProgressUpdate}
              onComplete={() => {
                // Move to next chapter
                const currentIndex = chapters.findIndex(
                  (ch) => ch.id === activeChapter.id
                );
                if (currentIndex < chapters.length - 1) {
                  setActiveChapterId(chapters[currentIndex + 1].id);
                }
              }}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">Select a chapter to begin</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Chapter list */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Chapters</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {chapters.map((chapter, index) => {
                  const chapterProgress = courseProgress?.chapterProgress.find(
                    (p) => p.chapterId === chapter.id
                  );
                  const isCompleted = chapterProgress?.isCompleted || false;
                  const isActive = chapter.id === activeChapterId;
                  const percentage = chapterProgress
                    ? progressService.calculateWatchedPercentage(
                        chapterProgress.watchedSegments,
                        chapter.durationSeconds
                      )
                    : 0;

                  // Check if previous chapter is completed (for locking)
                  const previousChapter = index > 0 ? chapters[index - 1] : null;
                  const previousProgress = previousChapter
                    ? courseProgress?.chapterProgress.find(
                        (p) => p.chapterId === previousChapter.id
                      )
                    : null;
                  const isLocked =
                    index > 0 && !previousProgress?.isCompleted && !isCompleted;

                  return (
                    <button
                      key={chapter.id}
                      onClick={() => !isLocked && setActiveChapterId(chapter.id)}
                      disabled={isLocked}
                      className={`w-full p-4 text-left transition-colors ${
                        isActive
                          ? 'bg-blue-50 border-l-4 border-blue-600'
                          : isLocked
                          ? 'bg-gray-50 cursor-not-allowed'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                              isCompleted
                                ? 'bg-green-100'
                                : isLocked
                                ? 'bg-gray-200'
                                : 'bg-gray-100'
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : isLocked ? (
                              <Lock className="h-4 w-4 text-gray-400" />
                            ) : (
                              <span className="text-sm font-medium text-gray-600">
                                {index + 1}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm font-medium ${
                                isActive ? 'text-blue-700' : 'text-gray-900'
                              } ${isLocked ? 'text-gray-400' : ''} truncate`}
                            >
                              {chapter.title}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {formatDuration(chapter.durationSeconds)}
                              </span>
                              {!isCompleted && percentage > 0 && (
                                <>
                                  <span className="text-gray-400">|</span>
                                  <span className="text-xs text-blue-600">
                                    {percentage.toFixed(0)}%
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {!isLocked && (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </div>

                      {/* Chapter progress bar */}
                      {!isCompleted && percentage > 0 && (
                        <div className="mt-2 ml-11 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Chapter video player component
function ChapterVideoPlayer({
  chapter,
  enrollmentId,
  courseId,
  studentId,
  progress,
  onProgressUpdate,
  onComplete,
}: {
  chapter: Chapter;
  enrollmentId: string;
  courseId: string;
  studentId: string;
  progress?: ChapterProgress;
  onProgressUpdate: () => void;
  onComplete: () => void;
}) {
  const {
    watchedSegments,
    lastPosition,
    isCompleted,
    watchedPercentage,
    updateProgress,
    saveProgress,
    isSaving,
  } = useVideoProgress({
    enrollmentId,
    chapterId: chapter.id,
    courseId,
    studentId,
    chapterDuration: chapter.durationSeconds,
  });

  const handleProgress = useCallback(
    (segments: any, position: number) => {
      updateProgress(segments, position);
    },
    [updateProgress]
  );

  const handleComplete = useCallback(async () => {
    await saveProgress();
    onProgressUpdate();
    onComplete();
  }, [saveProgress, onProgressUpdate, onComplete]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{chapter.title}</CardTitle>
          {isCompleted && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </span>
          )}
        </div>
        {chapter.description && (
          <p className="text-sm text-gray-500 mt-1">{chapter.description}</p>
        )}
      </CardHeader>
      <CardContent>
        {chapter.videoUrl ? (
          <VideoPlayer
            src={chapter.videoUrl}
            duration={chapter.durationSeconds}
            initialSegments={watchedSegments}
            initialPosition={lastPosition}
            onProgress={handleProgress}
            onComplete={handleComplete}
          />
        ) : (
          <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Video not available</p>
          </div>
        )}

        {/* Chapter info */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4 text-gray-500">
            <span>Duration: {formatDuration(chapter.durationSeconds)}</span>
            <span>|</span>
            <span>{watchedPercentage.toFixed(0)}% watched</span>
          </div>
          {isSaving && (
            <span className="text-blue-600 text-xs">Saving progress...</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

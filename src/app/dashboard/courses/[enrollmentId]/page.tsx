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
  HelpCircle,
  FileText,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/components/auth/AuthContext';
import { VideoPlayer } from '@/components/video';
import { ChapterQuizPlayer } from '@/components/quiz';
import { useVideoProgress } from '@/lib/hooks/useVideoProgress';
import { Enrollment } from '@/types/enrollment';
import { Course, Chapter } from '@/types/course';
import { ChapterProgress, CourseProgress } from '@/types/progress';
import { Certificate } from '@/types/certificate';
import { ChapterQuiz, QuizProgress } from '@/types/quiz';
import * as enrollmentService from '@/lib/services/enrollments';
import * as courseService from '@/lib/services/courses';
import * as progressService from '@/lib/services/progress';
import * as certificateService from '@/lib/services/certificates';
import * as quizService from '@/lib/services/quizzes';
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
  
  // Quiz state
  const [chapterQuizzes, setChapterQuizzes] = useState<Map<string, ChapterQuiz>>(new Map());
  const [quizProgress, setQuizProgress] = useState<Map<string, QuizProgress>>(new Map());

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

      // Fetch quizzes for all chapters
      const quizzes = await quizService.getCourseQuizzes(enrollmentData.courseId);
      const quizMap = new Map<string, ChapterQuiz>();
      quizzes.forEach((quiz) => quizMap.set(quiz.chapterId, quiz));
      setChapterQuizzes(quizMap);

      // Fetch quiz progress for all chapters with quizzes
      const quizProgressMap = new Map<string, QuizProgress>();
      for (const quiz of quizzes) {
        const qProgress = await quizService.getQuizProgress(enrollmentId, quiz.chapterId);
        quizProgressMap.set(quiz.chapterId, qProgress);
      }
      setQuizProgress(quizProgressMap);

      // Check for existing certificate
      const existingCert = await certificateService.getCertificateByEnrollment(enrollmentId);
      setCertificate(existingCert);

      // Set initial active chapter (first incomplete or first chapter)
      if (chaptersData.length > 0) {
        const incompleteChapter = chaptersData.find((ch) => {
          const chapterProgress = progress.chapterProgress.find(
            (p) => p.chapterId === ch.id
          );
          // Chapter is incomplete if video not done OR quiz not passed
          const videoComplete = chapterProgress?.isCompleted || false;
          const quiz = quizMap.get(ch.id);
          const qProgress = quizProgressMap.get(ch.id);
          const quizComplete = !quiz || !quiz.settings.enabled || qProgress?.passed;
          return !videoComplete || !quizComplete;
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

    // Check if course is now complete (including quizzes) and no certificate exists yet
    const allChaptersComplete = await checkAllChaptersComplete(progress);

    if (allChaptersComplete && !certificate) {
      setShowCompletionModal(true);
    }
  }, [enrollmentId, enrollment, course, user, certificate, chapterQuizzes, quizProgress]);

  // Check if all chapters are complete (video + quiz)
  // Optional updatedQuizProgress param allows passing freshly fetched progress
  const checkAllChaptersComplete = useCallback(async (
    progress: CourseProgress,
    updatedQuizProgress?: Map<string, QuizProgress>
  ) => {
    const currentQuizProgress = updatedQuizProgress || quizProgress;
    
    for (const chapter of chapters) {
      const chapterProgress = progress.chapterProgress.find(
        (p) => p.chapterId === chapter.id
      );
      const videoComplete = chapterProgress?.isCompleted || false;
      
      // Check quiz completion
      const quiz = chapterQuizzes.get(chapter.id);
      const qProgress = currentQuizProgress.get(chapter.id);
      const quizComplete = !quiz || !quiz.settings.enabled || qProgress?.passed;
      
      if (!videoComplete || !quizComplete) {
        return false;
      }
    }
    return chapters.length > 0;
  }, [chapters, chapterQuizzes, quizProgress]);

  // Handle quiz completion
  const handleQuizComplete = useCallback(async (chapterId: string, passed: boolean) => {
    // Refresh quiz progress
    const qProgress = await quizService.getQuizProgress(enrollmentId, chapterId);
    
    // Create updated quiz progress map with fresh data
    const updatedQuizProgressMap = new Map(quizProgress);
    updatedQuizProgressMap.set(chapterId, qProgress);
    
    // Update quiz progress state
    setQuizProgress(updatedQuizProgressMap);

    // Refresh course progress to update the percentage
    if (enrollment) {
      const updatedCourseProgress = await progressService.getCourseProgress(
        enrollmentId,
        enrollment.courseId
      );
      setCourseProgress(updatedCourseProgress);
    }

    if (passed && courseProgress) {
      // Check if course is now complete using the updated map (not stale state)
      const allComplete = await checkAllChaptersComplete(courseProgress, updatedQuizProgressMap);
      if (allComplete && !certificate) {
        setShowCompletionModal(true);
      }
    }
  }, [enrollmentId, enrollment, courseProgress, certificate, checkAllChaptersComplete, quizProgress]);

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
      <div className="space-y-0">
        {/* Skeleton Header */}
        <div className="sticky -top-6 z-10 -mx-6 -mt-6 mb-6">
          <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
                  <div>
                    <div className="h-6 bg-gray-200 rounded w-64 animate-pulse" />
                    <div className="flex items-center gap-3 mt-2">
                      <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full mt-3 animate-pulse" />
          </div>
        </div>

        {/* Skeleton Content */}
        <div className="lg:mr-[340px]">
          <div className="space-y-6">
            {/* Video player skeleton */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="aspect-video bg-gray-200 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-48 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Skeleton Chapters sidebar */}
        <div className="hidden lg:block lg:fixed lg:right-0 lg:top-[140px] lg:bottom-0 lg:w-[340px] lg:bg-gray-50 lg:border-l lg:border-gray-200">
          <div className="h-full flex flex-col p-4 pt-2">
            <div className="bg-white rounded-xl border border-gray-200 flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="h-5 bg-gray-200 rounded w-20 animate-pulse" />
              </div>
              <div className="p-2 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !enrollment || !course) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/courses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Course Not Found</h1>
        </div>
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
    <div className="space-y-0">
      {/* Sticky Header */}
      <div className="sticky -top-6 z-10 -mx-6 -mt-6 mb-6">
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <Link href="/dashboard/courses" title="Back to My Courses">
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 truncate">{course.title}</h1>
                  <div className="flex items-center space-x-3 mt-0.5 text-sm text-gray-500">
                    <span>{chapters.length} chapters</span>
                    <span>•</span>
                    <span>{formatDuration(course.totalDurationSeconds)} total</span>
                    <span>•</span>
                    <span className="text-ymau-dark-red font-medium">
                      {(courseProgress?.componentPercentage || 0).toFixed(0)}% complete
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Certificate Badge - shown when certificate exists, or Get Certificate when complete */}
            {(() => {
              // Check if all chapters with quizzes have been passed
              const allChaptersComplete = chapters.length > 0 && chapters.every((ch) => {
                const quiz = chapterQuizzes.get(ch.id);
                const qProgress = quizProgress.get(ch.id);
                // If no quiz or quiz disabled, chapter is complete
                // If quiz exists and is enabled, check if passed
                return !quiz || !quiz.settings.enabled || qProgress?.passed;
              });
              
              const showGetCertificate = !certificate && allChaptersComplete;
              
              return (
                <div className="shrink-0">
                  {certificate ? (
                    <div className="flex items-center gap-3 bg-green-50/90 backdrop-blur-sm border border-green-200 rounded-xl px-4 py-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-700">Completed</span>
                      </div>
                      <Link href="/dashboard/certificates">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <Award className="h-4 w-4 mr-1" />
                          View Certificate
                        </Button>
                      </Link>
                    </div>
                  ) : showGetCertificate ? (
                    <div className="flex items-center gap-3 bg-yellow-50/90 backdrop-blur-sm border border-yellow-200 rounded-xl px-4 py-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-700">Course Complete!</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleGenerateCertificate}
                        disabled={isGeneratingCertificate}
                        isLoading={isGeneratingCertificate}
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        <Award className="h-4 w-4 mr-1" />
                        {isGeneratingCertificate ? 'Generating...' : 'Get Certificate'}
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })()}
          </div>

          {/* Course progress bar */}
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-ymau-dark-red transition-all duration-300"
              style={{ width: `${courseProgress?.componentPercentage || 0}%` }}
            />
          </div>
        </div>
      </div>

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
      <div className="lg:mr-[340px]">
        {/* Video player and Quiz */}
        <div className="space-y-6">
          {activeChapter ? (
            <>
              <ChapterVideoPlayer
                key={activeChapter.id}
                chapter={activeChapter}
                enrollmentId={enrollmentId}
                courseId={course.id}
                studentId={user!.id}
                progress={courseProgress?.chapterProgress.find(
                  (p) => p.chapterId === activeChapter.id
                )}
                hasQuiz={chapterQuizzes.get(activeChapter.id)?.settings.enabled || false}
                quizPassed={quizProgress.get(activeChapter.id)?.passed || false}
                onProgressUpdate={handleProgressUpdate}
                onComplete={() => {
                  // Don't auto-advance if there's a quiz to complete
                  const quiz = chapterQuizzes.get(activeChapter.id);
                  const qProgress = quizProgress.get(activeChapter.id);
                  if (quiz && quiz.settings.enabled && !qProgress?.passed) {
                    // Stay on this chapter - quiz needs to be completed
                    return;
                  }
                  // Move to next chapter
                  const currentIndex = chapters.findIndex(
                    (ch) => ch.id === activeChapter.id
                  );
                  if (currentIndex < chapters.length - 1) {
                    setActiveChapterId(chapters[currentIndex + 1].id);
                  }
                }}
              />
              
              {/* Chapter Quiz - show if video is completed and quiz exists */}
              {(() => {
                const chapterProgress = courseProgress?.chapterProgress.find(
                  (p) => p.chapterId === activeChapter.id
                );
                const videoComplete = chapterProgress?.isCompleted || false;
                const quiz = chapterQuizzes.get(activeChapter.id);
                const qProgress = quizProgress.get(activeChapter.id);
                
                // Check if this is the last chapter
                const isLastChapter = chapters.indexOf(activeChapter) === chapters.length - 1;
                
                if (quiz && quiz.settings.enabled && videoComplete) {
                  return (
                    <ChapterQuizPlayer
                      quiz={quiz}
                      enrollmentId={enrollmentId}
                      studentId={user!.id}
                      quizProgress={qProgress || null}
                      isLastChapter={isLastChapter}
                      onComplete={(passed) => handleQuizComplete(activeChapter.id, passed)}
                    />
                  );
                }
                
                // Show quiz preview if exists but video not complete
                if (quiz && quiz.settings.enabled && !videoComplete) {
                  return (
                    <Card className="border-gray-200 bg-gray-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 text-gray-500">
                          <HelpCircle className="h-5 w-5" />
                          <div>
                            <p className="font-medium">Chapter Quiz Available</p>
                            <p className="text-sm">
                              {activeChapter.contentType === 'text' 
                                ? 'Complete the reading to unlock the quiz'
                                : 'Complete the video to unlock the quiz'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }
                
                return null;
              })()}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">Select a chapter to begin</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Chapter list - fixed on right side like sidebar */}
      <div className="hidden lg:block lg:fixed lg:right-8 lg:top-[180px] lg:bottom-0 lg:w-[340px]">
        <div className="h-full flex flex-col pb-6 p-4 pt-2">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="py-3 flex-shrink-0">
              <CardTitle className="text-lg">Chapters</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
              <div className="divide-y divide-gray-200">
                {chapters.map((chapter, index) => {
                  const chapterProgress = courseProgress?.chapterProgress.find(
                    (p) => p.chapterId === chapter.id
                  );
                  const videoComplete = chapterProgress?.isCompleted || false;
                  const isActive = chapter.id === activeChapterId;
                  const percentage = chapterProgress
                    ? progressService.calculateWatchedPercentage(
                        chapterProgress.watchedSegments,
                        chapter.durationSeconds
                      )
                    : 0;

                  // Check quiz status
                  const quiz = chapterQuizzes.get(chapter.id);
                  const qProgress = quizProgress.get(chapter.id);
                  const hasQuiz = quiz && quiz.settings.enabled;
                  const quizPassed = qProgress?.passed || false;
                  
                  // Chapter is fully complete only if video done AND quiz passed (if exists)
                  const isFullyComplete = videoComplete && (!hasQuiz || quizPassed);

                  // Check if previous chapter is completed (for locking)
                  const previousChapter = index > 0 ? chapters[index - 1] : null;
                  const previousProgress = previousChapter
                    ? courseProgress?.chapterProgress.find(
                        (p) => p.chapterId === previousChapter.id
                      )
                    : null;
                  const prevQuiz = previousChapter ? chapterQuizzes.get(previousChapter.id) : null;
                  const prevQProgress = previousChapter ? quizProgress.get(previousChapter.id) : null;
                  const prevHasQuiz = prevQuiz && prevQuiz.settings.enabled;
                  const prevQuizPassed = prevQProgress?.passed || false;
                  const prevFullyComplete = previousProgress?.isCompleted && (!prevHasQuiz || prevQuizPassed);
                  
                  const isLocked = index > 0 && !prevFullyComplete && !isFullyComplete;
                  const isLast = index === chapters.length - 1;

                  return (
                    <button
                      key={chapter.id}
                      onClick={() => !isLocked && setActiveChapterId(chapter.id)}
                      disabled={isLocked}
                      className={`w-full p-4 text-left transition-colors ${isLast ? 'rounded-b-xl' : ''} ${
                        isActive
                          ? 'bg-ymau-dark-red/5 border-l-4 border-ymau-dark-red'
                          : isLocked
                          ? 'bg-gray-50 cursor-not-allowed'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div
                            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                              isFullyComplete
                                ? 'bg-green-100'
                                : isLocked
                                ? 'bg-gray-200'
                                : 'bg-gray-100'
                            }`}
                          >
                            {isFullyComplete ? (
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
                                isActive ? 'text-ymau-dark-red' : 'text-gray-900'
                              } ${isLocked ? 'text-gray-400' : ''} truncate`}
                              title={chapter.title}
                            >
                              {chapter.title}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              {chapter.contentType === 'text' ? (
                                <FileText className="h-3 w-3 text-blue-500 shrink-0" />
                              ) : (
                                <Clock className="h-3 w-3 text-gray-400 shrink-0" />
                              )}
                              <span className="text-xs text-gray-500">
                                {chapter.contentType === 'text' 
                                  ? 'Reading' 
                                  : formatDuration(chapter.durationSeconds)}
                              </span>
                              {!videoComplete && percentage > 0 && (
                                <>
                                  <span className="text-gray-400">|</span>
                                  <span className="text-xs text-ymau-dark-red">
                                    {percentage.toFixed(0)}%
                                  </span>
                                </>
                              )}
                              {hasQuiz && (
                                <>
                                  <span className="text-gray-400">|</span>
                                  {quizPassed ? (
                                    <Badge variant="success" size="sm" className="text-[10px] py-0 px-1">
                                      Quiz ✓
                                    </Badge>
                                  ) : (
                                    <Badge variant="default" size="sm" className="text-[10px] py-0 px-1 text-gray-500">
                                      Quiz
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Chapter progress bar */}
                      {!videoComplete && percentage > 0 && (
                        <div className="mt-2 ml-11 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-ymau-dark-red"
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
  hasQuiz,
  quizPassed,
  onProgressUpdate,
  onComplete,
}: {
  chapter: Chapter;
  enrollmentId: string;
  courseId: string;
  studentId: string;
  progress?: ChapterProgress;
  hasQuiz: boolean;
  quizPassed: boolean;
  onProgressUpdate: () => void;
  onComplete: () => void;
}) {
  const [markingComplete, setMarkingComplete] = useState(false);
  
  const {
    watchedSegments,
    lastPosition,
    isCompleted: hookIsCompleted,
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

  // Use progress prop as source of truth (updates when parent state changes)
  // Fall back to hook state for initial render
  const isCompleted = progress?.isCompleted ?? hookIsCompleted;

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

  // Handle marking text chapter as complete
  const handleMarkTextComplete = useCallback(async () => {
    if (markingComplete) return;
    setMarkingComplete(true);
    try {
      // Mark chapter as 100% complete - use full duration as watched segment
      const fullDuration = chapter.durationSeconds || 60; // Default to 60s for text chapters
      await progressService.saveChapterProgress(
        enrollmentId,
        chapter.id,
        courseId,
        studentId,
        [{ start: 0, end: fullDuration }], // Full segment watched
        fullDuration, // Last position at end
        fullDuration // Chapter duration
      );
      onProgressUpdate();
      onComplete();
    } catch (error) {
      console.error('Error marking chapter complete:', error);
    } finally {
      setMarkingComplete(false);
    }
  }, [enrollmentId, chapter.id, courseId, studentId, chapter.durationSeconds, onProgressUpdate, onComplete, markingComplete]);

  // Determine completion status
  // Content is complete when isCompleted is true (video watched or text marked complete)
  // Chapter is fully complete when content is done AND quiz is passed (if quiz exists)
  const isChapterFullyComplete = isCompleted && (!hasQuiz || quizPassed);

  // Render text chapter content
  if (chapter.contentType === 'text') {
    return (
      <Card>
        <CardHeader className="pb-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">{chapter.title}</CardTitle>
              {chapter.description && (
                <div className="relative group">
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  <div className="absolute left-0 top-full mt-1 w-72 p-3 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <p className="text-sm text-gray-600">{chapter.description}</p>
                  </div>
                </div>
              )}
            </div>
            {isChapterFullyComplete && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Text content display area - viewport-based height that scales */}
          <div className="h-[55vh] max-h-125 bg-ymau-light-indigo/20 rounded-lg border border-gray-200 overflow-auto">
            <div className="p-4 prose prose-sm max-w-none">
              {chapter.textContent ? (
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {chapter.textContent}
                </div>
              ) : (
                <p className="text-gray-500 italic">No content available</p>
              )}
            </div>
          </div>

          {/* Mark as complete button - show appropriate state based on content and quiz completion */}
          <div className="mt-2 flex items-center justify-between">
            {!isCompleted && !quizPassed ? (
              // Content not done, quiz not done (or no quiz)
              <>
                <span className="text-sm text-gray-500">
                  {hasQuiz 
                    ? 'Read through the content above, then mark as complete to unlock the quiz.'
                    : 'Read through the content above, then mark as complete to continue.'}
                </span>
                <Button
                  onClick={handleMarkTextComplete}
                  disabled={markingComplete}
                  isLoading={markingComplete}
                  size="sm"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark as Complete
                </Button>
              </>
            ) : !isCompleted && quizPassed ? (
              // Content not done but quiz is passed (edge case - mark content to finish)
              <>
                <span className="text-sm text-gray-500">
                  Quiz passed! Mark the reading as complete to finish this chapter.
                </span>
                <Button
                  onClick={handleMarkTextComplete}
                  disabled={markingComplete}
                  isLoading={markingComplete}
                  size="sm"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark as Complete
                </Button>
              </>
            ) : isCompleted && hasQuiz && !quizPassed ? (
              // Content done but quiz not passed
              <>
                <span className="text-sm text-green-600">
                  ✓ Reading complete
                </span>
                <span className="text-sm text-gray-500">
                  Complete the quiz below to finish this chapter.
                </span>
              </>
            ) : (
              // Both content and quiz (if exists) are done
              <>
                <span className="text-sm text-green-600 font-medium">
                  ✓ You&apos;ve completed this chapter
                </span>
                <span></span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render video chapter content (default)
  return (
    <Card>
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{chapter.title}</CardTitle>
            {chapter.description && (
              <div className="relative group">
                <Info className="h-4 w-4 text-gray-400 cursor-help" />
                <div className="absolute left-0 top-full mt-1 w-72 p-3 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <p className="text-sm text-gray-600">{chapter.description}</p>
                </div>
              </div>
            )}
          </div>
          {isChapterFullyComplete && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {chapter.videoUrl ? (
          <VideoPlayer
            src={chapter.videoUrl}
            duration={chapter.durationSeconds}
            initialSegments={watchedSegments}
            initialPosition={lastPosition}
            isCompleted={isCompleted}
            onProgress={handleProgress}
            onComplete={handleComplete}
          />
        ) : (
          <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Video not available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

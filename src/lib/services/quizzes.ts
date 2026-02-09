import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  ChapterQuiz,
  ChapterQuizDocument,
  QuizQuestion,
  QuizAttempt,
  QuizAttemptDocument,
  QuizAnswer,
  QuizProgress,
  ChapterQuizSettings,
} from '@/types/quiz';

// Helper to convert Firestore timestamps to Date
function toDate(timestamp: Timestamp | Date | null): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
}

// ============ QUIZ CRUD ============

/**
 * Get quiz for a specific chapter
 */
export async function getChapterQuiz(chapterId: string): Promise<ChapterQuiz | null> {
  if (!db) throw new Error('Firestore not initialized');

  const quizzesRef = collection(db, 'quizzes');
  const q = query(quizzesRef, where('chapterId', '==', chapterId), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const docSnapshot = snapshot.docs[0];
  const data = docSnapshot.data() as ChapterQuizDocument;
  return {
    id: docSnapshot.id,
    ...data,
    createdAt: toDate(data.createdAt as Timestamp | Date),
    updatedAt: toDate(data.updatedAt as Timestamp | Date),
  };
}

/**
 * Get all quizzes for a course
 */
export async function getCourseQuizzes(courseId: string): Promise<ChapterQuiz[]> {
  if (!db) throw new Error('Firestore not initialized');

  const quizzesRef = collection(db, 'quizzes');
  const q = query(quizzesRef, where('courseId', '==', courseId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as ChapterQuizDocument;
    return {
      id: doc.id,
      ...data,
      createdAt: toDate(data.createdAt as Timestamp | Date),
      updatedAt: toDate(data.updatedAt as Timestamp | Date),
    };
  });
}

/**
 * Create or update a quiz for a chapter
 */
export async function saveChapterQuiz(
  chapterId: string,
  courseId: string,
  questions: QuizQuestion[],
  settings: ChapterQuizSettings,
  createdBy: string
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  // Check if quiz already exists for this chapter
  const existingQuiz = await getChapterQuiz(chapterId);

  if (existingQuiz) {
    // Update existing quiz
    const quizRef = doc(db, 'quizzes', existingQuiz.id);
    await updateDoc(quizRef, {
      questions,
      settings,
      updatedAt: serverTimestamp(),
    });
    return existingQuiz.id;
  } else {
    // Create new quiz
    const quizzesRef = collection(db, 'quizzes');
    const quizData: Omit<ChapterQuizDocument, 'createdAt' | 'updatedAt'> = {
      chapterId,
      courseId,
      questions,
      settings,
      createdBy,
    };

    const docRef = await addDoc(quizzesRef, {
      ...quizData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  }
}

/**
 * Delete a chapter quiz
 */
export async function deleteChapterQuiz(chapterId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const quiz = await getChapterQuiz(chapterId);
  if (quiz) {
    await deleteDoc(doc(db, 'quizzes', quiz.id));
  }
}

/**
 * Generate a unique ID for questions/options
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// ============ QUIZ ATTEMPTS ============

/**
 * Shuffle array (Fisher-Yates algorithm)
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Sample questions from the pool for a quiz attempt
 */
export function sampleQuestions(
  questions: QuizQuestion[],
  count: number,
  shuffleOptions: boolean
): QuizQuestion[] {
  // Shuffle and take the first 'count' questions
  const shuffled = shuffleArray(questions);
  const sampled = shuffled.slice(0, Math.min(count, questions.length));

  // Optionally shuffle options for each question
  if (shuffleOptions) {
    return sampled.map((q) => ({
      ...q,
      options: shuffleArray(q.options),
    }));
  }

  return sampled;
}

/**
 * Start a new quiz attempt
 */
export async function startQuizAttempt(
  quizId: string,
  chapterId: string,
  courseId: string,
  enrollmentId: string,
  studentId: string,
  questions: QuizQuestion[]
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  const attemptsRef = collection(db, 'quizAttempts');
  const attemptData: Omit<QuizAttemptDocument, 'startedAt' | 'completedAt'> = {
    quizId,
    chapterId,
    courseId,
    enrollmentId,
    studentId,
    questions,
    answers: [],
    score: 0,
    passed: false,
    timeSpentSeconds: 0,
  };

  const docRef = await addDoc(attemptsRef, {
    ...attemptData,
    startedAt: serverTimestamp(),
    completedAt: null,
  });

  return docRef.id;
}

/**
 * Get a quiz attempt by ID
 */
export async function getQuizAttempt(attemptId: string): Promise<QuizAttempt | null> {
  if (!db) throw new Error('Firestore not initialized');

  const attemptRef = doc(db, 'quizAttempts', attemptId);
  const snapshot = await getDoc(attemptRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data() as QuizAttemptDocument;
  return {
    id: snapshot.id,
    ...data,
    startedAt: toDate(data.startedAt as Timestamp | Date),
    completedAt: data.completedAt ? toDate(data.completedAt as Timestamp | Date) : null,
  };
}

/**
 * Get all attempts for a student on a specific chapter quiz
 */
export async function getStudentQuizAttempts(
  enrollmentId: string,
  chapterId: string
): Promise<QuizAttempt[]> {
  if (!db) throw new Error('Firestore not initialized');

  const attemptsRef = collection(db, 'quizAttempts');
  const q = query(
    attemptsRef,
    where('enrollmentId', '==', enrollmentId),
    where('chapterId', '==', chapterId),
    orderBy('startedAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as QuizAttemptDocument;
    return {
      id: doc.id,
      ...data,
      startedAt: toDate(data.startedAt as Timestamp | Date),
      completedAt: data.completedAt ? toDate(data.completedAt as Timestamp | Date) : null,
    };
  });
}

/**
 * Calculate score for quiz answers
 */
export function calculateScore(
  questions: QuizQuestion[],
  answers: QuizAnswer[]
): number {
  if (questions.length === 0) return 0;

  let correct = 0;
  for (const answer of answers) {
    const question = questions.find((q) => q.id === answer.questionId);
    if (question) {
      const correctOptionIds = question.options
        .filter((o) => o.isCorrect)
        .map((o) => o.id);
      
      // For multiple-select, all correct options must be selected and no incorrect ones
      const selectedSet = new Set(answer.selectedOptionIds);
      const correctSet = new Set(correctOptionIds);
      
      const isCorrect =
        selectedSet.size === correctSet.size &&
        [...selectedSet].every((id) => correctSet.has(id));
      
      if (isCorrect) correct++;
    }
  }

  return Math.round((correct / questions.length) * 100);
}

/**
 * Submit quiz attempt with answers
 */
export async function submitQuizAttempt(
  attemptId: string,
  answers: QuizAnswer[],
  timeSpentSeconds: number
): Promise<QuizAttempt> {
  if (!db) throw new Error('Firestore not initialized');

  // Get the attempt to calculate score
  const attempt = await getQuizAttempt(attemptId);
  if (!attempt) throw new Error('Quiz attempt not found');

  // Get the quiz settings
  const quiz = await getChapterQuiz(attempt.chapterId);
  if (!quiz) throw new Error('Quiz not found');

  // Calculate score
  const score = calculateScore(attempt.questions, answers);
  const passed = score >= quiz.settings.passingScore;

  // Mark answers as correct/incorrect
  const gradedAnswers = answers.map((answer) => {
    const question = attempt.questions.find((q) => q.id === answer.questionId);
    if (!question) return { ...answer, isCorrect: false };

    const correctOptionIds = question.options
      .filter((o) => o.isCorrect)
      .map((o) => o.id);
    
    const selectedSet = new Set(answer.selectedOptionIds);
    const correctSet = new Set(correctOptionIds);
    
    const isCorrect =
      selectedSet.size === correctSet.size &&
      [...selectedSet].every((id) => correctSet.has(id));

    return { ...answer, isCorrect };
  });

  // Update the attempt
  const attemptRef = doc(db, 'quizAttempts', attemptId);
  await updateDoc(attemptRef, {
    answers: gradedAnswers,
    score,
    passed,
    completedAt: serverTimestamp(),
    timeSpentSeconds,
  });

  return {
    ...attempt,
    answers: gradedAnswers,
    score,
    passed,
    completedAt: new Date(),
    timeSpentSeconds,
  };
}

/**
 * Get quiz progress for a student on a chapter
 */
export async function getQuizProgress(
  enrollmentId: string,
  chapterId: string
): Promise<QuizProgress> {
  const attempts = await getStudentQuizAttempts(enrollmentId, chapterId);
  const completedAttempts = attempts.filter((a) => a.completedAt !== null);

  return {
    chapterId,
    totalAttempts: completedAttempts.length,
    bestScore: completedAttempts.length > 0
      ? Math.max(...completedAttempts.map((a) => a.score))
      : 0,
    passed: completedAttempts.some((a) => a.passed),
    lastAttemptAt: completedAttempts.length > 0
      ? completedAttempts[0].completedAt
      : null,
  };
}

/**
 * Check if student can attempt quiz (based on max attempts)
 */
export async function canAttemptQuiz(
  enrollmentId: string,
  chapterId: string
): Promise<{ canAttempt: boolean; reason?: string; attemptsRemaining?: number }> {
  const quiz = await getChapterQuiz(chapterId);
  if (!quiz) {
    return { canAttempt: false, reason: 'Quiz not found' };
  }

  if (!quiz.settings.enabled) {
    return { canAttempt: false, reason: 'Quiz is disabled' };
  }

  const attempts = await getStudentQuizAttempts(enrollmentId, chapterId);
  const completedAttempts = attempts.filter((a) => a.completedAt !== null);

  // Check if already passed
  const hasPassed = completedAttempts.some((a) => a.passed);
  if (hasPassed) {
    return { canAttempt: true, reason: 'Already passed' }; // Can still retake for better score
  }

  // Check max attempts
  if (quiz.settings.maxAttempts !== null) {
    if (completedAttempts.length >= quiz.settings.maxAttempts) {
      return {
        canAttempt: false,
        reason: 'Maximum attempts reached',
        attemptsRemaining: 0,
      };
    }
    return {
      canAttempt: true,
      attemptsRemaining: quiz.settings.maxAttempts - completedAttempts.length,
    };
  }

  return { canAttempt: true };
}

/**
 * Get all quiz progress for a course enrollment
 */
export async function getCourseQuizProgress(
  enrollmentId: string,
  courseId: string
): Promise<Map<string, QuizProgress>> {
  if (!db) throw new Error('Firestore not initialized');

  // Get all quizzes for the course
  const quizzes = await getCourseQuizzes(courseId);
  
  // Get progress for each quiz
  const progressMap = new Map<string, QuizProgress>();
  
  for (const quiz of quizzes) {
    const progress = await getQuizProgress(enrollmentId, quiz.chapterId);
    progressMap.set(quiz.chapterId, progress);
  }

  return progressMap;
}

/**
 * Check if chapter is complete (video watched AND quiz passed if quiz exists)
 */
export async function isChapterComplete(
  enrollmentId: string,
  chapterId: string,
  videoCompleted: boolean
): Promise<boolean> {
  // Video must be completed first
  if (!videoCompleted) return false;

  // Check if quiz exists for this chapter
  const quiz = await getChapterQuiz(chapterId);
  
  // If no quiz or quiz disabled, chapter is complete when video is done
  if (!quiz || !quiz.settings.enabled) {
    return true;
  }

  // Quiz exists - check if passed
  const progress = await getQuizProgress(enrollmentId, chapterId);
  return progress.passed;
}

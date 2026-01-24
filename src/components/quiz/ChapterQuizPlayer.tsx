'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  RotateCcw,
  Trophy,
  HelpCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import {
  ChapterQuiz,
  QuizQuestion,
  QuizAttempt,
  QuizAnswer,
  QuizProgress,
} from '@/types/quiz';
import * as quizService from '@/lib/services/quizzes';

interface ChapterQuizPlayerProps {
  quiz: ChapterQuiz;
  enrollmentId: string;
  studentId: string;
  quizProgress: QuizProgress | null;
  isLastChapter?: boolean;
  onComplete: (passed: boolean) => void;
}

type QuizState = 'intro' | 'taking' | 'results';

export function ChapterQuizPlayer({
  quiz,
  enrollmentId,
  studentId,
  quizProgress,
  isLastChapter = false,
  onComplete,
}: ChapterQuizPlayerProps) {
  const [state, setState] = useState<QuizState>('intro');
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string[]>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizAttempt | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [canAttempt, setCanAttempt] = useState(true);
  const [attemptMessage, setAttemptMessage] = useState<string>('');

  // Check if student can attempt quiz
  useEffect(() => {
    const checkCanAttempt = async () => {
      const result = await quizService.canAttemptQuiz(enrollmentId, quiz.chapterId);
      setCanAttempt(result.canAttempt);
      if (!result.canAttempt) {
        setAttemptMessage(result.reason || 'Cannot attempt quiz');
      } else if (result.attemptsRemaining !== undefined) {
        setAttemptMessage(`${result.attemptsRemaining} attempts remaining`);
      }
    };
    checkCanAttempt();
  }, [enrollmentId, quiz.chapterId]);

  // Timer effect
  useEffect(() => {
    if (state !== 'taking' || !quiz.settings.timeLimit) return;

    const interval = setInterval(() => {
      if (startTime) {
        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
        const remaining = quiz.settings.timeLimit! * 60 - elapsed;
        
        if (remaining <= 0) {
          // Time's up - auto submit
          handleSubmit();
        } else {
          setTimeRemaining(remaining);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state, startTime, quiz.settings.timeLimit]);

  const startQuiz = async () => {
    // Sample questions from the pool
    const sampledQuestions = quizService.sampleQuestions(
      quiz.questions,
      quiz.settings.questionsPerAttempt,
      quiz.settings.shuffleOptions
    );

    // Create attempt in database
    const attemptId = await quizService.startQuizAttempt(
      quiz.id,
      quiz.chapterId,
      quiz.courseId,
      enrollmentId,
      studentId,
      sampledQuestions
    );

    setCurrentAttemptId(attemptId);
    setQuestions(sampledQuestions);
    setCurrentQuestionIndex(0);
    setAnswers(new Map());
    setStartTime(new Date());
    
    if (quiz.settings.timeLimit) {
      setTimeRemaining(quiz.settings.timeLimit * 60);
    }
    
    setState('taking');
  };

  const selectAnswer = (questionId: string, optionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    const newAnswers = new Map(answers);

    if (question.type === 'multiple-select') {
      // Toggle selection for multiple select
      const current = newAnswers.get(questionId) || [];
      if (current.includes(optionId)) {
        newAnswers.set(questionId, current.filter((id) => id !== optionId));
      } else {
        newAnswers.set(questionId, [...current, optionId]);
      }
    } else {
      // Single selection
      newAnswers.set(questionId, [optionId]);
    }

    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (!currentAttemptId || !startTime) return;

    setSubmitting(true);

    // Build answers array
    const quizAnswers: QuizAnswer[] = questions.map((q) => ({
      questionId: q.id,
      selectedOptionIds: answers.get(q.id) || [],
      isCorrect: false, // Will be calculated server-side
    }));

    const timeSpent = Math.floor((Date.now() - startTime.getTime()) / 1000);

    try {
      const attempt = await quizService.submitQuizAttempt(
        currentAttemptId,
        quizAnswers,
        timeSpent
      );

      setResult(attempt);
      setState('results');
      onComplete(attempt.passed);
    } catch (error) {
      console.error('Error submitting quiz:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswers = currentQuestion ? answers.get(currentQuestion.id) || [] : [];
  const allQuestionsAnswered = questions.every((q) => (answers.get(q.id) || []).length > 0);

  // Intro screen
  if (state === 'intro') {
    return (
      <Card className="border-ymau-dark-red/20 bg-ymau-dark-red/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-ymau-dark-red" />
            <CardTitle className="text-lg">Chapter Quiz</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            Answer {quiz.settings.questionsPerAttempt} question{quiz.settings.questionsPerAttempt !== 1 ? 's' : ''} to complete this chapter.
          </p>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Passing score: {quiz.settings.passingScore}%</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>
                {quiz.settings.timeLimit
                  ? `Time limit: ${quiz.settings.timeLimit} min`
                  : 'No time limit'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <RotateCcw className="h-4 w-4 text-orange-500" />
              <span>
                {quiz.settings.maxAttempts
                  ? `${quiz.settings.maxAttempts} attempts allowed`
                  : 'Unlimited attempts'}
              </span>
            </div>
          </div>

          {quizProgress && quizProgress.totalAttempts > 0 && (
            <div className="bg-white rounded-lg p-4 border border-ymau-dark-red/20">
              <h4 className="font-medium text-gray-900 mb-2">Previous Attempts</h4>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-700">
                  Best score: <span className="font-medium text-ymau-dark-red">{quizProgress.bestScore}%</span>
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600">
                  Total attempts: {quizProgress.totalAttempts}
                </span>
                {quizProgress.passed && (
                  <Badge variant="success" size="sm">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Passed
                  </Badge>
                )}
              </div>
            </div>
          )}

          {attemptMessage && (
            <p className="text-sm text-gray-500">{attemptMessage}</p>
          )}

          <div className="pt-2">
            <Button
              onClick={startQuiz}
              disabled={!canAttempt}
              className="w-full bg-ymau-dark-red hover:bg-ymau-dark-red/90"
            >
              {quizProgress?.passed ? 'Retake Quiz' : 'Start Quiz'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Taking quiz
  if (state === 'taking' && currentQuestion) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="info">
                Question {currentQuestionIndex + 1} of {questions.length}
              </Badge>
              {currentQuestion.type === 'multiple-select' && (
                <Badge variant="warning" size="sm">Select all that apply</Badge>
              )}
            </div>
            {timeRemaining !== null && (
              <div className={`flex items-center gap-1 text-sm font-medium ${
                timeRemaining < 60 ? 'text-red-600' : 'text-gray-600'
              }`}>
                <Clock className="h-4 w-4" />
                {formatTime(timeRemaining)}
              </div>
            )}
          </div>
          <Progress 
            value={(currentQuestionIndex + 1) / questions.length * 100} 
            className="h-1 mt-2" 
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg font-medium text-gray-900">
            {currentQuestion.text}
          </p>

          <div className="space-y-2">
            {currentQuestion.options.map((option, index) => {
              const isSelected = currentAnswers.includes(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => selectAnswer(currentQuestion.id, option.id)}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-ymau-dark-red bg-ymau-dark-red/5'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                      isSelected
                        ? 'bg-ymau-dark-red text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1 text-gray-900">{option.text}</span>
                    {isSelected && (
                      <CheckCircle className="h-5 w-5 text-ymau-dark-red" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>

            {currentQuestionIndex < questions.length - 1 ? (
              <Button
                onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                disabled={currentAnswers.length === 0}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!allQuestionsAnswered || submitting}
                isLoading={submitting}
                className="bg-green-600 hover:bg-green-700"
              >
                Submit Quiz
              </Button>
            )}
          </div>

          {/* Question navigation dots */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {questions.map((q, index) => {
              const isAnswered = (answers.get(q.id) || []).length > 0;
              const isCurrent = index === currentQuestionIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    isCurrent
                      ? 'bg-ymau-dark-red scale-125'
                      : isAnswered
                      ? 'bg-ymau-dark-red/40'
                      : 'bg-gray-300'
                  }`}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Results screen
  if (state === 'results' && result) {
    return (
      <Card className={result.passed ? 'border-green-200' : 'border-red-200'}>
        <CardHeader className="text-center pb-2">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-2 ${
            result.passed ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {result.passed ? (
              <Trophy className="h-8 w-8 text-green-600" />
            ) : (
              <XCircle className="h-8 w-8 text-red-600" />
            )}
          </div>
          <CardTitle className={result.passed ? 'text-green-700' : 'text-red-700'}>
            {result.passed ? 'Quiz Passed!' : 'Quiz Not Passed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-4xl font-bold text-gray-900">{result.score}%</p>
            <p className="text-sm text-gray-500">
              {result.answers.filter((a) => a.isCorrect).length} out of {result.answers.length} correct
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Time spent: {Math.floor(result.timeSpentSeconds / 60)}m {result.timeSpentSeconds % 60}s
            </p>
          </div>

          {quiz.settings.showCorrectAnswers && (
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <h4 className="font-medium text-gray-900">Review Answers</h4>
              {result.questions.map((question, index) => {
                const answer = result.answers.find((a) => a.questionId === question.id);
                const isCorrect = answer?.isCorrect;
                return (
                  <div
                    key={question.id}
                    className={`p-3 rounded-lg ${
                      isCorrect ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {index + 1}. {question.text}
                        </p>
                        <div className="mt-1 text-sm">
                          <span className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                            Your answer:{' '}
                            {answer?.selectedOptionIds
                              .map((id) => question.options.find((o) => o.id === id)?.text)
                              .join(', ') || 'No answer'}
                          </span>
                          {!isCorrect && (
                            <span className="block text-green-700 mt-1">
                              Correct answer:{' '}
                              {question.options
                                .filter((o) => o.isCorrect)
                                .map((o) => o.text)
                                .join(', ')}
                            </span>
                          )}
                        </div>
                        {question.explanation && (
                          <p className="mt-2 text-xs text-gray-600 bg-white p-2 rounded">
                            <span className="font-medium">Explanation:</span> {question.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-4">
            {!result.passed && canAttempt && (
              <Button
                onClick={() => {
                  setState('intro');
                  setResult(null);
                }}
                variant="outline"
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            {result.passed && (
              <p className="text-center text-sm text-green-600">
                {isLastChapter 
                  ? 'Congratulations on completing the course!' 
                  : 'You can now proceed to the next chapter!'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}

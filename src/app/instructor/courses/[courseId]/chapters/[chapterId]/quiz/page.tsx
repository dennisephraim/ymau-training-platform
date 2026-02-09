'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Save,
  CheckCircle,
  Circle,
  HelpCircle,
  Settings,
  ChevronDown,
  ChevronUp,
  Copy,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/components/auth/AuthContext';
import { Chapter } from '@/types/course';
import {
  ChapterQuiz,
  QuizQuestion,
  QuestionOption,
  ChapterQuizSettings,
  DEFAULT_QUIZ_SETTINGS,
  QuestionType,
} from '@/types/quiz';
import * as courseService from '@/lib/services/courses';
import * as quizService from '@/lib/services/quizzes';

export default function ChapterQuizPage({
  params,
}: {
  params: Promise<{ courseId: string; chapterId: string }>;
}) {
  const { courseId, chapterId } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [, setQuiz] = useState<ChapterQuiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [settings, setSettings] = useState<ChapterQuizSettings>(DEFAULT_QUIZ_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch chapter details
      const chapters = await courseService.getChapters(courseId);
      const foundChapter = chapters.find((c) => c.id === chapterId);
      if (!foundChapter) {
        setError('Chapter not found');
        return;
      }
      setChapter(foundChapter);

      // Fetch existing quiz if any
      const existingQuiz = await quizService.getChapterQuiz(chapterId);
      if (existingQuiz) {
        setQuiz(existingQuiz);
        setQuestions(existingQuiz.questions);
        setSettings(existingQuiz.settings);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load quiz data');
    } finally {
      setLoading(false);
    }
  }, [courseId, chapterId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!user) return;

    // Validate questions
    for (const question of questions) {
      if (!question.text.trim()) {
        setError('All questions must have text');
        return;
      }
      if (question.options.length < 2) {
        setError('Each question must have at least 2 options');
        return;
      }
      const hasCorrect = question.options.some((o) => o.isCorrect);
      if (!hasCorrect) {
        setError('Each question must have at least one correct answer');
        return;
      }
      for (const option of question.options) {
        if (!option.text.trim()) {
          setError('All options must have text');
          return;
        }
      }
    }

    // Validate settings
    if (settings.questionsPerAttempt < 1 || settings.questionsPerAttempt === 0) {
      setError('Questions per attempt is required and must be at least 1');
      return;
    }
    if (settings.questionsPerAttempt > questions.length && questions.length > 0) {
      setError(`Questions per attempt cannot exceed total questions (${questions.length})`);
      return;
    }
    if (settings.passingScore < 0 || settings.passingScore === -1) {
      setError('Passing score is required (0-100%)');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await quizService.saveChapterQuiz(
        chapterId,
        courseId,
        questions,
        settings,
        user.id
      );

      router.push(`/instructor/courses/${courseId}/chapters`);
    } catch (err) {
      console.error('Error saving quiz:', err);
      setError('Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: quizService.generateId(),
      text: '',
      type: 'multiple-choice',
      options: [
        { id: quizService.generateId(), text: '', isCorrect: false },
        { id: quizService.generateId(), text: '', isCorrect: false },
      ],
      order: questions.length,
    };
    setQuestions([...questions, newQuestion]);
    setExpandedQuestion(newQuestion.id);
  };

  const duplicateQuestion = (questionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    const newQuestion: QuizQuestion = {
      ...question,
      id: quizService.generateId(),
      text: `${question.text} (copy)`,
      options: question.options.map((o) => ({
        ...o,
        id: quizService.generateId(),
      })),
      order: questions.length,
    };
    setQuestions([...questions, newQuestion]);
    setExpandedQuestion(newQuestion.id);
  };

  const removeQuestion = (questionId: string) => {
    setQuestions(questions.filter((q) => q.id !== questionId));
    if (expandedQuestion === questionId) {
      setExpandedQuestion(null);
    }
  };

  const updateQuestion = (questionId: string, updates: Partial<QuizQuestion>) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId ? { ...q, ...updates } : q
      )
    );
  };

  const addOption = (questionId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== questionId) return q;
        return {
          ...q,
          options: [
            ...q.options,
            { id: quizService.generateId(), text: '', isCorrect: false },
          ],
        };
      })
    );
  };

  const removeOption = (questionId: string, optionId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== questionId) return q;
        return {
          ...q,
          options: q.options.filter((o) => o.id !== optionId),
        };
      })
    );
  };

  const updateOption = (
    questionId: string,
    optionId: string,
    updates: Partial<QuestionOption>
  ) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== questionId) return q;
        return {
          ...q,
          options: q.options.map((o) =>
            o.id === optionId ? { ...o, ...updates } : o
          ),
        };
      })
    );
  };

  const toggleCorrectAnswer = (questionId: string, optionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    if (question.type === 'multiple-choice' || question.type === 'true-false') {
      // Only one correct answer allowed
      setQuestions(
        questions.map((q) => {
          if (q.id !== questionId) return q;
          return {
            ...q,
            options: q.options.map((o) => ({
              ...o,
              isCorrect: o.id === optionId,
            })),
          };
        })
      );
    } else {
      // Multiple correct answers allowed
      updateOption(questionId, optionId, {
        isCorrect: !question.options.find((o) => o.id === optionId)?.isCorrect,
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
        <div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />
        <Card className="animate-pulse">
          <CardContent className="py-8">
            <div className="h-40 bg-gray-200 rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !chapter) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/instructor/courses/${courseId}/chapters`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Quiz Not Found</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href={`/instructor/courses/${courseId}/chapters`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Quiz for: {chapter?.title}
          </h1>
          <p className="text-gray-600 mt-1">
            Create questions for the chapter quiz. Students will be given a random subset.
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Quiz Settings */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setShowSettings(!showSettings)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-lg">Quiz Settings</CardTitle>
            </div>
            {showSettings ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </div>
        </CardHeader>
        {showSettings && (
          <CardContent className="pt-0">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Questions Per Attempt
                </label>
                <input
                  type="number"
                  min="1"
                  max={questions.length || 100}
                  value={settings.questionsPerAttempt === 0 ? '' : settings.questionsPerAttempt}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                    setSettings({
                      ...settings,
                      questionsPerAttempt: isNaN(value) ? 0 : value,
                    });
                  }}
                  placeholder="Required"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 bg-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500">
                  How many questions each student gets (randomly sampled from {questions.length} in pool)
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Passing Score (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.passingScore === -1 ? '' : settings.passingScore}
                  onChange={(e) => {
                    if (e.target.value === '') {
                      setSettings({ ...settings, passingScore: -1 });
                    } else {
                      const value = parseInt(e.target.value);
                      setSettings({
                        ...settings,
                        passingScore: isNaN(value) ? -1 : Math.min(100, Math.max(0, value)),
                      });
                    }
                  }}
                  placeholder="Required"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 bg-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500">
                  Minimum score to pass (0-100%)
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Maximum Attempts
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.maxAttempts ?? ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxAttempts: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="Unlimited"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 bg-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500">
                  Leave empty for unlimited attempts
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Time Limit (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.timeLimit ?? ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      timeLimit: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="No limit"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 bg-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500">
                  Leave empty for no time limit
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.shuffleOptions}
                    onChange={(e) =>
                      setSettings({ ...settings, shuffleOptions: e.target.checked })
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Shuffle answer options
                  </span>
                </label>
                <p className="text-xs text-gray-500 ml-6">
                  Randomize the order of answer choices
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.showCorrectAnswers}
                    onChange={(e) =>
                      setSettings({ ...settings, showCorrectAnswers: e.target.checked })
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Show correct answers after submission
                  </span>
                </label>
                <p className="text-xs text-gray-500 ml-6">
                  Let students see which answers were correct
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) =>
                      setSettings({ ...settings, enabled: e.target.checked })
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Quiz enabled
                  </span>
                </label>
                <p className="text-xs text-gray-500 ml-6">
                  Students must pass to complete the chapter
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Questions Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {questions.length} question{questions.length !== 1 ? 's' : ''} in pool
          {questions.length > 0 && (
            <span className="ml-2 text-gray-400">
              ({settings.questionsPerAttempt} sampled per student)
            </span>
          )}
        </div>
        <Button onClick={addQuestion}>
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>

      {/* Questions List */}
      {questions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <HelpCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No questions yet</h3>
            <p className="text-gray-500 mt-2">
              Add questions to create your quiz pool.
            </p>
            <Button onClick={addQuestion} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add First Question
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <QuestionEditor
              key={question.id}
              question={question}
              index={index}
              isExpanded={expandedQuestion === question.id}
              onToggleExpand={() =>
                setExpandedQuestion(
                  expandedQuestion === question.id ? null : question.id
                )
              }
              onUpdate={(updates) => updateQuestion(question.id, updates)}
              onAddOption={() => addOption(question.id)}
              onRemoveOption={(optionId) => removeOption(question.id, optionId)}
              onUpdateOption={(optionId, updates) =>
                updateOption(question.id, optionId, updates)
              }
              onToggleCorrect={(optionId) =>
                toggleCorrectAnswer(question.id, optionId)
              }
              onDuplicate={() => duplicateQuestion(question.id)}
              onDelete={() => removeQuestion(question.id)}
            />
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <Link href={`/instructor/courses/${courseId}/chapters`}>
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={handleSave} isLoading={saving}>
          <Save className="h-4 w-4 mr-2" />
          Save Quiz
        </Button>
      </div>
    </div>
  );
}

function QuestionEditor({
  question,
  index,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onAddOption,
  onRemoveOption,
  onUpdateOption,
  onToggleCorrect,
  onDuplicate,
  onDelete,
}: {
  question: QuizQuestion;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<QuizQuestion>) => void;
  onAddOption: () => void;
  onRemoveOption: (optionId: string) => void;
  onUpdateOption: (optionId: string, updates: Partial<QuestionOption>) => void;
  onToggleCorrect: (optionId: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const correctCount = question.options.filter((o) => o.isCorrect).length;

  return (
    <Card className={isExpanded ? 'border-ymau-dark-red/30' : ''}>
      <CardHeader
        className="cursor-pointer py-4"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center text-gray-400">
            <GripVertical className="h-5 w-5" />
          </div>
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-medium text-gray-600">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {question.text || '(No question text)'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={question.type === 'multiple-choice' ? 'info' : question.type === 'true-false' ? 'warning' : 'default'} size="sm">
                {question.type}
              </Badge>
              <span className="text-xs text-gray-500">
                {question.options.length} options • {correctCount} correct
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              title="Duplicate question"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this question?')) onDelete();
              }}
              className="p-2 rounded-lg hover:bg-gray-100 text-red-500"
              title="Delete question"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Question Type */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Question Type
            </label>
            <select
              value={question.type}
              onChange={(e) => {
                const newType = e.target.value as QuestionType;
                if (newType === 'true-false') {
                  onUpdate({
                    type: newType,
                    options: [
                      { id: quizService.generateId(), text: 'True', isCorrect: false },
                      { id: quizService.generateId(), text: 'False', isCorrect: false },
                    ],
                  });
                } else {
                  onUpdate({ type: newType });
                }
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="multiple-choice">Multiple Choice (single answer)</option>
              <option value="multiple-select">Multiple Select (multiple answers)</option>
              <option value="true-false">True/False</option>
            </select>
          </div>

          {/* Question Text */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Question Text
            </label>
            <textarea
              value={question.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="Enter your question here..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 bg-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Answer Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Answer Options
              </label>
              <span className="text-xs text-gray-500">
                {question.type === 'multiple-select'
                  ? 'Click to mark correct (multiple allowed)'
                  : 'Click to mark correct answer'}
              </span>
            </div>
            <div className="space-y-2">
              {question.options.map((option, optIndex) => (
                <div key={option.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleCorrect(option.id)}
                    className={`shrink-0 p-1 rounded ${
                      option.isCorrect
                        ? 'text-green-600'
                        : 'text-gray-300 hover:text-gray-400'
                    }`}
                  >
                    {option.isCorrect ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>
                  <span className="text-sm text-gray-500 w-6">{String.fromCharCode(65 + optIndex)}.</span>
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) =>
                      onUpdateOption(option.id, { text: e.target.value })
                    }
                    placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                    disabled={question.type === 'true-false'}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 bg-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                  {question.type !== 'true-false' && question.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => onRemoveOption(option.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {question.type !== 'true-false' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddOption}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Option
              </Button>
            )}
          </div>

          {/* Explanation (optional) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Explanation (Optional)
            </label>
            <textarea
              value={question.explanation || ''}
              onChange={(e) => onUpdate({ explanation: e.target.value })}
              placeholder="Explain why this answer is correct (shown after student answers)"
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 bg-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

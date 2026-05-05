import React, { useState, useEffect, useRef } from 'react';
import { useLanguageStore } from '@/store/languageStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, TrendingUp, Award, Target, Zap } from 'lucide-react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import type { Question } from '@/types/exam';
import { checkAnswerWithAI } from '@/services/answerChecker';
import { saveTaskSubmission, saveSheetSubmission } from '@/services/userStatistics';
import { renderMarkdownWithMath } from '@/utils/mathFormatting';

interface LocationState {
  questions: Question[];
  sheetId?: string;
}

interface TaskResult {
  totalQuestions: number;
  solutions: number;
  timeTaken: number;
  accuracy: number;
  questionResults: {
    questionId: string;
    isCorrect: boolean;
    timeTaken: number;
    userAnswer: string;
    expectedAnswer: string;
    solution: string;
    userSolution: string;
    isNumericallyEqual: boolean;
    feedback: string;
    difficulty: string;
    topic: string;
    type: string;
  }[];
  statistics: {
    byDifficulty: {
      easy: { total: number; correct: number; accuracy: number };
      medium: { total: number; correct: number; accuracy: number };
      hard: { total: number; correct: number; accuracy: number };
    };
    byTopic: Record<string, { total: number; correct: number; accuracy: number }>;
    byType: Record<string, { total: number; correct: number; accuracy: number }>;
    averageTimePerQuestion: number;
    fastestQuestion: number;
    slowestQuestion: number;
  };
}


const normalizeAnswer = (answer: string): string => {
  return answer
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ');
};

// Enhanced normalization that handles units and scientific notation
const normalizeAnswerAdvanced = (answer: string): string => {
  let normalized = answer
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    // Remove common units but preserve numbers
    .replace(/\b(cm|mm|m|km|kg|g|mg|ml|l|°c|°f|degrees?)\b/g, '')
    // Normalize scientific notation
    .replace(/×\s*10\s*\^?\s*(\d+)/g, 'e$1')
    .replace(/e\s*(\+|-)?\s*(\d+)/g, 'e$1$2')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
  
  return normalized;
};

const isNumericallyEqual = (answer1: string, answer2: string): boolean => {
  // Try to extract numbers from strings (handles units, text, etc.)
  const extractNumber = (str: string): number | null => {
    // Remove common text and extract first number
    const cleaned = str.replace(/[^\d.eE+-]/g, ' ');
    const match = cleaned.match(/-?\d+\.?\d*(?:[eE][+-]?\d+)?/);
    if (match) {
      return parseFloat(match[0]);
    }
    return null;
  };

  const num1 = extractNumber(answer1);
  const num2 = extractNumber(answer2);
  
  if (num1 === null || num2 === null) return false;
  
  // Adaptive tolerance: 0.1% for numbers > 1, 0.01 for numbers <= 1
  const tolerance = Math.abs(num2) > 1 
    ? Math.abs(num2) * 0.001 
    : 0.01;
  
  return Math.abs(num1 - num2) <= tolerance;
};

const areAnswersEquivalent = (userAnswer: string, solution: string, type: string): boolean => {
  
  if (type === 'Essay' || type === 'Short Answer') {
    try {
      const criteria = JSON.parse(solution);
      const wordCount = userAnswer.trim().split(/\s+/).length;
      
      
      if (wordCount < criteria.minWordCount || wordCount > criteria.maxWordCount) {
        console.log(`Word count (${wordCount}) outside required range (${criteria.minWordCount}-${criteria.maxWordCount})`);
      }

      
      criteria.requiredPoints.forEach((point: { point: string; weight: number }) => {
        console.log(`Check for: ${point.point} (${point.weight}%)`);
      });

      return true; 
    } catch (e) {
      console.error('Error parsing answer criteria:', e);
      return true;
    }
  }

  const normalizedUser = normalizeAnswer(userAnswer);
  const normalizedCorrect = normalizeAnswer(solution);

 
  if (normalizedUser === normalizedCorrect) return true;

  
  switch (type) {
    case 'Multiple Choice':
      
      return normalizedUser === normalizedCorrect;

    case 'True/False':
      
      return (
        normalizedUser === normalizedCorrect ||
        (normalizedUser === 'true' && normalizedCorrect === 't') ||
        (normalizedUser === 'false' && normalizedCorrect === 'f')
      );

    case 'Fill in the Blank':
    case 'Short Answer':
      
      if (isNumericallyEqual(normalizedUser, normalizedCorrect)) return true;
      
    
      const similarity = calculateStringSimilarity(normalizedUser, normalizedCorrect);
      return similarity > 0.85; 

    case 'Problem Solving':
      
      return isNumericallyEqual(normalizedUser, normalizedCorrect);

    default:
      return normalizedUser === normalizedCorrect;
  }
};


const calculateStringSimilarity = (str1: string, str2: string): number => {
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  const distance = track[str2.length][str1.length];
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
};


const checkAnswer = async (userAnswer: string, question: Question): Promise<{ isCorrect: boolean; feedback?: string }> => {
  if (!userAnswer) {
    return { isCorrect: false, feedback: 'No answer provided' };
  }

  const normalizedUserAnswer = normalizeAnswerAdvanced(userAnswer);
  const normalizedsolution = question.solution ? normalizeAnswerAdvanced(question.solution) : '';

  switch (question.type) {
    case 'Multiple Choice': {
      // Extract just the letter (A, B, C, D) from the user's answer
      const userChoice = normalizedUserAnswer.match(/^[a-d]/)?.[0]
        || normalizedUserAnswer.match(/[a-d]/)?.[0]
        || normalizedUserAnswer.charAt(0);

      // Prefer question.answer (the definitive correct letter) over parsing solution text
      const answerSource = question.answer
        ? normalizeAnswerAdvanced(question.answer)
        : normalizedsolution;
      const correctChoice = answerSource.match(/^[a-d]/)?.[0]
        || answerSource.match(/[a-d]/)?.[0]
        || answerSource.charAt(0);

      const isCorrect = userChoice === correctChoice;
      return {
        isCorrect,
        feedback: isCorrect
          ? 'Correct choice!'
          : `Expected: ${correctChoice.toUpperCase()}, Got: ${userChoice.toUpperCase()}`
      };
    }

    case 'True/False':
      const userTF = normalizedUserAnswer.includes('true') ? 'true' : normalizedUserAnswer.includes('false') ? 'false' : normalizedUserAnswer;
      const correctTF = normalizedsolution.includes('true') ? 'true' : normalizedsolution.includes('false') ? 'false' : normalizedsolution;
      const tfMatch = userTF === correctTF || 
        (userTF === 't' && correctTF === 'true') || 
        (userTF === 'f' && correctTF === 'false') ||
        (userTF === 'true' && correctTF === 't') ||
        (userTF === 'false' && correctTF === 'f');
      return { 
        isCorrect: tfMatch,
        feedback: tfMatch ? 'Correct!' : `Expected: ${correctTF}, Got: ${userTF}`
      };

    case 'Numerical': {
      const answerSource = question.answer || question.solution || '';
      const isNumEqual = isNumericallyEqual(userAnswer, answerSource);
      return { 
        isCorrect: isNumEqual,
        feedback: isNumEqual 
          ? 'Numerically correct!' 
          : `Expected: ${answerSource}, Got: ${userAnswer}`
      };
    }

    case 'Short Answer': {
      const answerSource = question.answer || question.solution || '';
      const normalizedAnswerSource = normalizeAnswerAdvanced(answerSource);

      // Check exact match first
      if (normalizedUserAnswer === normalizedAnswerSource) {
        return { isCorrect: true, feedback: 'Exact match!' };
      }
      // Check numerical equivalence
      if (isNumericallyEqual(userAnswer, answerSource)) {
        return { isCorrect: true, feedback: 'Numerically equivalent!' };
      }
      // Check string similarity
      const similarity = calculateStringSimilarity(normalizedUserAnswer, normalizedAnswerSource);
      return { 
        isCorrect: similarity > 0.85,
        feedback: similarity > 0.85 
          ? `Close match (${Math.round(similarity * 100)}% similarity)` 
          : `Expected: ${answerSource}, Got: ${userAnswer}`
      };
    }

    case 'Problem Solving': {
      const answerSource = question.answer || question.solution || '';
      const isProblemCorrect = isNumericallyEqual(userAnswer, answerSource);
      return { 
        isCorrect: isProblemCorrect,
        feedback: isProblemCorrect 
          ? 'Correct solution!' 
          : `Expected: ${answerSource}, Got: ${userAnswer}`
      };
    }

    case 'Essay':
      try {
        const result = await checkAnswerWithAI(
          userAnswer,
          question.solution,
          question.type,
          question.text
        );
        return { 
          isCorrect: result.isCorrect, 
          feedback: result.feedback 
        };
      } catch (error) {
        // Fallback to similarity check
        const similarity = calculateStringSimilarity(normalizedUserAnswer, normalizedsolution);
        return { 
          isCorrect: similarity > 0.7,
          feedback: 'AI assessment unavailable. Using similarity check.'
        };
      }

    case 'Fill in the Blank':
      // Similar to Short Answer
      if (normalizedUserAnswer === normalizedsolution) {
        return { isCorrect: true, feedback: 'Correct!' };
      }
      const fillSimilarity = calculateStringSimilarity(normalizedUserAnswer, normalizedsolution);
      return { 
        isCorrect: fillSimilarity > 0.85,
        feedback: fillSimilarity > 0.85 
          ? 'Close match!' 
          : `Expected: ${question.solution}`
      };

    default:
      const exactMatch = normalizedUserAnswer === normalizedsolution;
      return { 
        isCorrect: exactMatch,
        feedback: exactMatch ? 'Correct!' : `Expected: ${question.solution}`
      };
  }
};

export const TaskCompletion = () => {
  const { t } = useLanguageStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { questions, sheetId } = location.state as LocationState;
  
  const [showTimerModal, setShowTimerModal] = useState(true);
  const [selectedTime, setSelectedTime] = useState(30); 
  const [timeLeft, setTimeLeft] = useState(0); 
  const [isActive, setIsActive] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<TaskResult | null>(null);
  const startTime = useRef(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [solutions, setSolutions] = useState<Record<string, string>>({});
  const questionStartTimes = useRef<Record<string, number>>({});

  const timePresets = [5, 10, 15, 30, 45, 60];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            setIsActive(false);
            handleTimeUp();
          }
          return time - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleTimeUp = () => {
    handleComplete();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = () => {
    setShowTimerModal(false);
    setTimeLeft(selectedTime * 60);
    setIsActive(true);
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    if (!questionStartTimes.current[questionId]) {
      questionStartTimes.current[questionId] = Date.now();
    }
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSolutionChange = (questionId: string, solution: string) => {
    setSolutions(prev => ({
      ...prev,
      [questionId]: solution
    }));
  };

  const progress = (Object.keys(answers).length / questions.length) * 100;

  const handleComplete = async () => {
    setIsSubmitting(true);
    const totalTimeTaken = Math.floor((Date.now() - startTime.current) / 1000);
    
    try {
      const questionResults = await Promise.all(questions.map(async (question, index) => {
        const userAnswer = answers[question.id] || '';
        const userSolution = solutions[question.id] || '';
        const questionStartTime = questionStartTimes.current[question.id] || startTime.current;
        const questionTime = Math.floor((Date.now() - questionStartTime) / 1000);
        
        const checkResult = await checkAnswer(userAnswer, question);
        
        return {
          questionId: question.id,
          isCorrect: checkResult.isCorrect,
          timeTaken: questionTime,
          userAnswer,
          userSolution,
          expectedAnswer: question.answer || '',
          solution: question.solution || '',
          answer: question.answer || '',
          feedback: checkResult.feedback || '',
          isNumericallyEqual: question.type === 'Numerical' && checkResult.isCorrect,
          difficulty: question.difficulty || 'medium',
          topic: question.topic || 'unknown',
          type: question.type || 'unknown'
        };
      }));

      const correctCount = questionResults.filter(r => r.isCorrect).length;
      
      // Calculate statistics
      const byDifficulty = {
        easy: { total: 0, correct: 0, accuracy: 0 },
        medium: { total: 0, correct: 0, accuracy: 0 },
        hard: { total: 0, correct: 0, accuracy: 0 }
      };
      
      const byTopic: Record<string, { total: number; correct: number; accuracy: number }> = {};
      const byType: Record<string, { total: number; correct: number; accuracy: number }> = {};
      
      const questionTimes = questionResults.map(r => r.timeTaken).filter(t => t > 0);
      
      questionResults.forEach(result => {
        // By difficulty
        const diff = result.difficulty as 'easy' | 'medium' | 'hard';
        if (byDifficulty[diff]) {
          byDifficulty[diff].total++;
          if (result.isCorrect) byDifficulty[diff].correct++;
        }
        
        // By topic
        if (!byTopic[result.topic]) {
          byTopic[result.topic] = { total: 0, correct: 0, accuracy: 0 };
        }
        byTopic[result.topic].total++;
        if (result.isCorrect) byTopic[result.topic].correct++;
        
        // By type
        if (!byType[result.type]) {
          byType[result.type] = { total: 0, correct: 0, accuracy: 0 };
        }
        byType[result.type].total++;
        if (result.isCorrect) byType[result.type].correct++;
      });
      
      // Calculate accuracies
      Object.keys(byDifficulty).forEach(diff => {
        const d = diff as keyof typeof byDifficulty;
        if (byDifficulty[d].total > 0) {
          byDifficulty[d].accuracy = (byDifficulty[d].correct / byDifficulty[d].total) * 100;
        }
      });
      
      Object.keys(byTopic).forEach(topic => {
        if (byTopic[topic].total > 0) {
          byTopic[topic].accuracy = (byTopic[topic].correct / byTopic[topic].total) * 100;
        }
      });
      
      Object.keys(byType).forEach(type => {
        if (byType[type].total > 0) {
          byType[type].accuracy = (byType[type].correct / byType[type].total) * 100;
        }
      });
      
      const results: TaskResult = {
        totalQuestions: questions.length,
        solutions: correctCount,
        timeTaken: totalTimeTaken,
        accuracy: (correctCount / questions.length) * 100,
        questionResults,
        statistics: {
          byDifficulty,
          byTopic,
          byType,
          averageTimePerQuestion: questionTimes.length > 0 
            ? Math.round(questionTimes.reduce((a, b) => a + b, 0) / questionTimes.length) 
            : 0,
          fastestQuestion: questionTimes.length > 0 ? Math.min(...questionTimes) : 0,
          slowestQuestion: questionTimes.length > 0 ? Math.max(...questionTimes) : 0
        }
      };

      // Always show results first, even if saving fails
      setResults(results);
      setShowResults(true);
      setIsActive(false);
      // Scroll to top to ensure modal is visible
      window.scrollTo({ top: 0, behavior: 'smooth' });
      console.log('Results calculated and modal should be visible:', results);

      // Try to save individual task submissions (don't block on errors)
      try {
        await Promise.all(questionResults.map(result => {
          const question = questions.find(q => q.id === result.questionId);
          if (!question) return Promise.resolve();
          
          return saveTaskSubmission({
            taskId: result.questionId,
            sheetId: sheetId,
            isCorrect: result.isCorrect,
            score: result.isCorrect ? 100 : 0,
            timeSpent: result.timeTaken,
            userAnswer: result.userAnswer,
            userSolution: result.userSolution,
            difficulty: result.difficulty as 'easy' | 'medium' | 'hard',
            topic: result.topic,
            questionType: result.type
          });
        }));
      } catch (saveError) {
        console.error('Error saving task submissions:', saveError);
        // Continue even if saving fails
      }

      // Try to save sheet submission if this is from a sheet (don't block on errors)
      if (sheetId && questions.length > 1) {
        try {
          const averageTimePerTask = questionTimes.length > 0
            ? questionTimes.reduce((a, b) => a + b, 0) / questionTimes.length
            : 0;

          await saveSheetSubmission({
            sheetId: sheetId,
            totalTasks: questions.length,
            correctTasks: correctCount,
            accuracy: results.accuracy,
            totalTimeSpent: totalTimeTaken,
            averageTimePerTask: averageTimePerTask
          });
        } catch (saveError) {
          console.error('Error saving sheet submission:', saveError);
          // Continue even if saving fails
        }
      }
    } catch (error) {
      console.error('Error completing task:', error);
      // Even on error, try to show basic results if we have question results
      if (questions && questions.length > 0) {
        const basicResults: TaskResult = {
          totalQuestions: questions.length,
          solutions: 0,
          timeTaken: Math.floor((Date.now() - startTime.current) / 1000),
          accuracy: 0,
          questionResults: questions.map(q => ({
            questionId: q.id,
            isCorrect: false,
            timeTaken: 0,
            userAnswer: answers[q.id] || '',
            userSolution: solutions[q.id] || '',
            expectedAnswer: q.answer || '',
            solution: q.solution || '',
            answer: q.answer || '',
            feedback: 'Error processing answer',
            isNumericallyEqual: false,
            difficulty: q.difficulty || 'medium',
            topic: q.topic || 'unknown',
            type: q.type || 'unknown'
          })),
          statistics: {
            byDifficulty: {
              easy: { total: 0, correct: 0, accuracy: 0 },
              medium: { total: 0, correct: 0, accuracy: 0 },
              hard: { total: 0, correct: 0, accuracy: 0 }
            },
            byTopic: {},
            byType: {},
            averageTimePerQuestion: 0,
            fastestQuestion: 0,
            slowestQuestion: 0
          }
        };
        setResults(basicResults);
        setShowResults(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate('/task-preview');
  };

  const ResultsModal = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gray-800 rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-700"
      >
        <h2 className="text-2xl font-bold mb-6 text-white">{t('practice.results')}</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-blue-900/30 p-4 rounded-xl border border-blue-500/20">
            <div className="text-sm text-blue-400">{t('practice.accuracy')}</div>
            <div className="text-2xl font-bold text-blue-300">
              {results?.accuracy.toFixed(1)}%
            </div>
          </div>
          <div className="bg-green-900/30 p-4 rounded-xl border border-green-500/20">
            <div className="text-sm text-green-400">{t('practice.timeTaken')}</div>
            <div className="text-2xl font-bold text-green-300">
              {formatTime(results?.timeTaken || 0)}
            </div>
          </div>
          <div className="bg-purple-900/30 p-4 rounded-xl border border-purple-500/20">
            <div className="text-sm text-purple-400">{t('practice.correctAnswers')}</div>
            <div className="text-2xl font-bold text-purple-300">
              {results?.solutions} / {results?.totalQuestions}
            </div>
          </div>
          <div className="bg-orange-900/30 p-4 rounded-xl border border-orange-500/20">
            <div className="text-sm text-orange-400">{t('practice.questionsAnswered')}</div>
            <div className="text-2xl font-bold text-orange-300">
              {Object.keys(answers).length} / {questions.length}
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          {questions.map((question, index) => (
            <div key={question.id} className="border border-gray-700 rounded-lg p-4 bg-gray-700/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-white">{t('sheets.task')} {index + 1}:</span>
                {results?.questionResults[index].isCorrect ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
              </div>
              <div className="text-gray-300 mb-4">{renderMarkdownWithMath(question.text)}</div>
              <div className="grid grid-cols-1 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-300">{t('tasks.yourAnswer')}</span>
                  <div className="text-gray-400 mt-1">
                    {renderMarkdownWithMath(answers[question.id] || 'No answer')}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-300">{t('tasks.correctAnswer')}</span>
                  <div className="text-gray-400 mt-1">
                    {renderMarkdownWithMath(question.answer || '')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-4">
           <button
            onClick={() => navigate('/task-preview')}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            {t('tasks.back')}
          </button>
           <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {t('tasks.tryAgain')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 sm:py-12 px-4 sm:px-6">
      {showTimerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
             <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('practice.selectTimer')}
            </h2>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {timePresets.map(time => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`p-3 rounded-lg text-sm font-medium transition-colors
                    ${selectedTime === time
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-2 border-blue-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                  {time} min
                </button>
              ))}
            </div>
            
             <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('practice.customTime')}
              </label>
              <input
                type="number"
                min="1"
                max="180"
                value={selectedTime}
                onChange={(e) => setSelectedTime(Math.max(1, Math.min(180, parseInt(e.target.value) || 1)))}
                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                 placeholder={t('practice.enterCustomTime')}
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('practice.timeHint')}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                 onClick={() => {
                  setShowTimerModal(false);
                  setIsActive(true);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              >
                {t('practice.skipTimer')}
              </button>
              <button
                onClick={handleStartTimer}
                 disabled={selectedTime < 1}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium 
                         hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.startTimer')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
             <button
              onClick={handleBack}
              className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span className="text-sm">{t("tasks.back")}</span>
            </button>

            <div className="flex items-center gap-4">
              {timeLeft > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <Clock className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    {formatTime(timeLeft)}
                  </span>
                </div>
              )}
              {!timeLeft && (
                 <button
                  onClick={handleStartTimer}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg text-sm font-medium
                           hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  {t('common.startTimer')}
                </button>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
            <div
              className="bg-blue-600 dark:bg-blue-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
           <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{Object.keys(answers).length} {t('common.of')} {questions.length} {t('common.answered')}</span>
            <span>{Math.round(progress)}% {t('common.complete')}</span>
          </div>
        </div>

        {/* Question Navigation */}
        {questions.length > 1 && (
          <div className="mb-6 flex items-center justify-center gap-2">
            <button
              onClick={() => {
                const prevIndex = Math.max(0, currentQuestion - 1);
                setCurrentQuestion(prevIndex);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentQuestion === 0}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 
                       hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200 hover:scale-105"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex gap-1">
              {questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentQuestion(index);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-all duration-200
                    ${currentQuestion === index
                      ? 'bg-blue-600 text-white scale-110'
                      : answers[questions[index].id]
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => {
                const nextIndex = Math.min(questions.length - 1, currentQuestion + 1);
                setCurrentQuestion(nextIndex);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentQuestion === questions.length - 1}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 
                       hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200 hover:scale-105"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-8">
          {questions
            .filter((_, index) => questions.length <= 3 || index === currentQuestion)
            .map((question, filterIndex) => {
              const actualIndex = questions.length > 3 ? currentQuestion : filterIndex;
              return (
            <div
              key={question.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6"
            >
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between gap-2">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Question {actualIndex + 1} {questions.length > 1 && `of ${questions.length}`}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full 
                      ${question.difficulty === 'easy'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : question.difficulty === 'medium'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}
                    >
                      {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                      {question.topic.charAt(0).toUpperCase() + question.topic.slice(1)}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300">
                      {question.type.charAt(0).toUpperCase() + question.type.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="prose dark:prose-invert prose-sm sm:prose-base max-w-none">
                  {renderMarkdownWithMath(question.text)}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    {question.type === 'Multiple Choice' ? (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        {['A', 'B', 'C', 'D'].map((option) => (
                          <button
                            key={option}
                            onClick={() => handleAnswerChange(question.id, option)}
                            className={`p-4 rounded-lg text-left transition-all
                              ${answers[question.id] === option
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                              }
                            `}
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full border border-current">
                                {option}
                              </span>
                              <span className="text-sm">
                                {renderMarkdownWithMath(question.text.split(option + ")")[1]?.split(/[A-D]\)/)?.shift()?.trim() || '')}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : question.type === 'True/False' ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        {['True', 'False'].map((option) => (
                          <label
                            key={option}
                            className={`flex items-center p-3 rounded-lg border transition-all cursor-pointer
                              ${answers[question.id]?.toLowerCase() === option.toLowerCase()
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              }`}
                          >
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              value={option}
                              checked={answers[question.id]?.toLowerCase() === option.toLowerCase()}
                              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                              className="h-4 w-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600"
                            />
                            <span className="ml-2 text-sm">{option}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Your Answer
                          </label>
                          <textarea
                            value={answers[question.id] || ''}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            placeholder="Enter your answer here..."
                            className="w-full min-h-[100px] p-3 rounded-lg border border-gray-300 dark:border-gray-600 
                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400
                                     focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Your Solution (optional)
                          </label>
                          <textarea
                            value={solutions[question.id] || ''}
                            onChange={(e) => handleSolutionChange(question.id, e.target.value)}
                            placeholder="Explain your solution approach here..."
                            className="w-full min-h-[150px] p-3 rounded-lg border border-gray-300 dark:border-gray-600 
                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400
                                     focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        </div>

        {/* Submit/Next Button */}
        <div className="mt-8 flex justify-end">
          {currentQuestion === questions.length - 1 ? (
            // Last question - Show Submit Answers button
            <button
              onClick={handleComplete}
              disabled={isSubmitting}
              className={`rounded-full font-semibold transition-all duration-200 flex items-center justify-center gap-2
                       shadow-md hover:shadow-lg hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl transition-shadow
                       px-4 py-2
                       ${isSubmitting
                         ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed hover:scale-100'
                         : 'bg-primary text-primary-foreground hover:bg-primary/90'
                       }`}
            >
              {isSubmitting ? (
                <>Loading...</>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Submit Answers
                </>
              )}
            </button>
          ) : (
            // Not last question - Show Next button
            <button
              onClick={() => {
                const nextIndex = Math.min(questions.length - 1, currentQuestion + 1);
                setCurrentQuestion(nextIndex);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentQuestion === questions.length - 1}
              className="rounded-full font-semibold transition-all duration-200 flex items-center justify-center gap-2
                       bg-primary text-primary-foreground hover:bg-primary/90
                       shadow-md hover:shadow-lg hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl transition-shadow
                       px-4 py-2
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <ChevronRight className="w-4 h-4" />
              Next
            </button>
          )}
        </div>
      </div>

      {/* Results Modal */}
      <AnimatePresence>
        {showResults && results && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-[9999]"
            onClick={() => setShowResults(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Practice Results
                  </h2>
                  <button
                    onClick={() => setShowResults(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <AlertCircle className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Main Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5" />
                      <div className="text-sm font-medium opacity-90">{t('practice.accuracy') || 'Дәлдік'}</div>
                    </div>
                    <div className="text-3xl font-bold">
                      {Math.round(results.accuracy)}%
                    </div>
                    <div className="text-xs opacity-75 mt-1">
                      {results.solutions} / {results.totalQuestions} correct
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5" />
                      <div className="text-sm font-medium opacity-90">{t('practice.timeTaken') || 'Кеткен уақыт'}</div>
                    </div>
                    <div className="text-3xl font-bold">
                      {formatTime(results.timeTaken)}
                    </div>
                    <div className="text-xs opacity-75 mt-1">
                      {results.statistics.averageTimePerQuestion > 0 && 
                        `Avg: ${formatTime(results.statistics.averageTimePerQuestion)}/q`
                      }
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5" />
                      <div className="text-sm font-medium opacity-90">Speed</div>
                    </div>
                    <div className="text-3xl font-bold">
                      {results.statistics.fastestQuestion > 0 
                        ? formatTime(results.statistics.fastestQuestion)
                        : '--'
                      }
                    </div>
                    <div className="text-xs opacity-75 mt-1">Fastest question</div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-5 h-5" />
                      <div className="text-sm font-medium opacity-90">Score</div>
                    </div>
                    <div className="text-3xl font-bold">
                      {results.solutions}
                    </div>
                    <div className="text-xs opacity-75 mt-1">Correct answers</div>
                  </div>
                </div>

                {/* Performance by Difficulty */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Performance by Difficulty
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {(['easy', 'medium', 'hard'] as const).map(difficulty => {
                      const stats = results.statistics.byDifficulty[difficulty];
                      if (stats.total === 0) return null;
                      return (
                        <div key={difficulty} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 capitalize">
                            {difficulty}
                          </div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                            {Math.round(stats.accuracy)}%
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {stats.correct} / {stats.total} correct
                          </div>
                          <div className="mt-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                difficulty === 'easy' ? 'bg-green-500' :
                                difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${stats.accuracy}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Performance by Topic */}
                {Object.keys(results.statistics.byTopic).length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Performance by Topic
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(results.statistics.byTopic).map(([topic, stats]) => (
                        <div key={topic} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                            {topic}
                          </div>
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {Math.round(stats.accuracy)}%
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {stats.correct} / {stats.total}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Performance by Type */}
                {Object.keys(results.statistics.byType).length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Performance by Question Type
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(results.statistics.byType).map(([type, stats]) => (
                        <div key={type} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                            {type}
                          </div>
                          <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                            {Math.round(stats.accuracy)}%
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {stats.correct} / {stats.total}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detailed Question Results */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Question Details
                  </h3>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {results.questionResults.map((result, index) => {
                      const question = questions.find(q => q.id === result.questionId);
                      return (
                        <div
                          key={result.questionId}
                          className={`p-4 rounded-lg border-2 ${
                            result.isCorrect
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                              : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  Question {index + 1}
                                </span>
                                {result.isCorrect ? (
                                  <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
                                ) : (
                                  <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
                                )}
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  result.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                                  result.difficulty === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                                  'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                                }`}>
                                  {result.difficulty}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatTime(result.timeTaken)}
                                </span>
                              </div>
                              
                              {question && (
                                <div className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                                  {renderMarkdownWithMath(question.text)}
                                </div>
                              )}
                              
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="font-medium text-gray-700 dark:text-gray-300">{t('tasks.yourAnswer') || 'Сіздің жауабыңыз:'} </span>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {result.userAnswer || 'No answer provided'}
                                  </span>
                                </div>
                                
                                {result.userSolution && (
                                  <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700/50 rounded">
                                    <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Your Solution:</div>
                                    <div className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                      {result.userSolution}
                                    </div>
                                  </div>
                                )}
                                
                                <div>
                                  <span className="font-medium text-gray-700 dark:text-gray-300">{t('tasks.correctAnswer') || 'Дұрыс жауап:'} </span>
                                  <span className="text-green-700 dark:text-green-400 font-medium">
                                    {renderMarkdownWithMath(result.expectedAnswer)}
                                  </span>
                                </div>
                                
                                {!result.isCorrect && result.solution && (
                                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                                    <div className="font-medium text-blue-900 dark:text-blue-300 mb-1">Solution:</div>
                                    <div className="text-blue-800 dark:text-blue-200">
                                      {renderMarkdownWithMath(result.solution)}
                                    </div>
                                  </div>
                                )}
                                
                                {result.feedback && (
                                  <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                                    <div className="font-medium text-yellow-900 dark:text-yellow-300 mb-1">Feedback:</div>
                                    <div className="text-yellow-800 dark:text-yellow-200 whitespace-pre-wrap">
                                      {result.feedback}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => navigate(-1)}
                    className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium
                             hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      setShowResults(false);
                      window.location.reload();
                    }}
                    className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-medium
                             hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    {t('tasks.tryAgain') || 'Қайта көру'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}; 
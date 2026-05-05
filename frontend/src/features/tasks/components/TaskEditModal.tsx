import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  FileText, 
  Tag, 
  TrendingUp, 
  BookOpen, 
  Lightbulb, 
  CheckCircle2,
  AlertCircle,
  Info,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Question } from '@/types/exam';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface TaskEditModalProps {
  task: Question;
  onClose: () => void;
  onSave: (task: Question) => Promise<void>;
}

const taskTypes = [
  'Multiple Choice',
  'Problem Solving',
  'Short Answer',
  'Essay',
  'True/False',
  'Fill in the Blank',
  'Matching',
  'Coding',
  'Debugging',
  'Case Study',
  'Diagram Analysis',
  'Data Analysis',
  'Theory',
  'Practical'
];

const difficultyColors = {
  easy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700',
  hard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-700'
};

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
  task: initialTask,
  onClose,
  onSave,
}) => {
  const [task, setTask] = useState<Question>(initialTask);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['basic', 'content'])
  );
  const [newAnswer, setNewAnswer] = useState('');

  const answers = useMemo(() => {
    if (Array.isArray(task.answers)) {
      return task.answers;
    }
    return task.answers ? [task.answers] : [];
  }, [task.answers]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!task.text.trim()) {
      newErrors.text = 'Question text is required';
    }
    if (!task.type.trim()) {
      newErrors.type = 'Task type is required';
    }
    if (!task.topic.trim()) {
      newErrors.topic = 'Topic is required';
    }
    if (!task.difficulty) {
      newErrors.difficulty = 'Difficulty is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      await onSave({
        ...task,
      });
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to save task' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddAnswer = () => {
    if (newAnswer.trim()) {
      const currentAnswers = Array.isArray(task.answers) ? task.answers : (task.answers ? [task.answers] : []);
      setTask({
        ...task,
        answers: [...currentAnswers, newAnswer.trim()]
      });
      setNewAnswer('');
    }
  };

  const handleRemoveAnswer = (index: number) => {
    const currentAnswers = Array.isArray(task.answers) ? task.answers : (task.answers ? [task.answers] : []);
    const newAnswers = currentAnswers.filter((_, i) => i !== index);
    setTask({
      ...task,
      answers: newAnswers.length > 0 ? newAnswers : null
    });
  };

  const updateField = <K extends keyof Question>(field: K, value: Question[K]) => {
    setTask({ ...task, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 30 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] 
                 flex flex-col border border-gray-200/50 dark:border-gray-700/50
                 overflow-hidden"
      >
        {/* Header */}
        <div className="relative p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0
                       bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Task</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Update task details and content
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 
                       hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all
                       hover:scale-110 active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <AnimatePresence>
              {errors.submit && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 
                           rounded-lg p-4 flex items-center gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Basic Information Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleSection('basic')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h3>
                </div>
                {expandedSections.has('basic') ? (
                  <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                )}
              </button>

              <AnimatePresence>
                {expandedSections.has('basic') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 pt-0 space-y-5">
                      {/* Question Text */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <FileText className="w-4 h-4" />
                          Question Text <span className="text-red-500">*</span>
                        </label>
                        <Textarea
                          value={task.text}
                          onChange={(e) => updateField('text', e.target.value)}
                          className={`min-h-[120px] ${errors.text ? 'border-red-500 focus:ring-red-500' : ''}`}
                          placeholder="Enter the question text here..."
                          required
                        />
                        {errors.text && (
                          <p className="mt-1 text-sm text-red-500">{errors.text}</p>
                        )}
                      </div>

                      {/* Type and Difficulty */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Tag className="w-4 h-4" />
                            Task Type <span className="text-red-500">*</span>
                          </label>
                          <Select
                            value={task.type || undefined}
                            onValueChange={(value) => updateField('type', value)}
                          >
                            <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                              <SelectValue placeholder="Select task type" />
                            </SelectTrigger>
                            <SelectContent>
                              {taskTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.type && (
                            <p className="mt-1 text-sm text-red-500">{errors.type}</p>
                          )}
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <TrendingUp className="w-4 h-4" />
                            Difficulty <span className="text-red-500">*</span>
                          </label>
                          <Select
                            value={task.difficulty || undefined}
                            onValueChange={(value: 'easy' | 'medium' | 'hard') => updateField('difficulty', value)}
                          >
                            <SelectTrigger className={errors.difficulty ? 'border-red-500' : ''}>
                              <SelectValue placeholder="Select difficulty" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                          {task.difficulty && (
                            <div className="mt-2">
                              <Badge className={difficultyColors[task.difficulty]}>
                                {task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1)}
                              </Badge>
                            </div>
                          )}
                          {errors.difficulty && (
                            <p className="mt-1 text-sm text-red-500">{errors.difficulty}</p>
                          )}
                        </div>
                      </div>

                      {/* Topic */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <BookOpen className="w-4 h-4" />
                          Topic <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={task.topic}
                          onChange={(e) => updateField('topic', e.target.value)}
                          className={errors.topic ? 'border-red-500 focus:ring-red-500' : ''}
                          placeholder="Enter topic (e.g., Algebra, Mechanics, etc.)"
                          required
                        />
                        {errors.topic && (
                          <p className="mt-1 text-sm text-red-500">{errors.topic}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Content Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleSection('content')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Content & Answers</h3>
                </div>
                {expandedSections.has('content') ? (
                  <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                )}
              </button>

              <AnimatePresence>
                {expandedSections.has('content') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 pt-0 space-y-5">
                      {/* Solution */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <Lightbulb className="w-4 h-4" />
                          Solution
                        </label>
                        <Textarea
                          value={task.solution || ''}
                          onChange={(e) => updateField('solution', e.target.value)}
                          className="min-h-[100px]"
                          placeholder="Enter the correct answer or solution steps..."
                        />
                      </div>

                      {/* Answer */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Answer
                        </label>
                        <Textarea
                          value={task.answer || ''}
                          onChange={(e) => updateField('answer', e.target.value)}
                          className="min-h-[80px]"
                          placeholder="Enter the final answer (optional)..."
                        />
                      </div>

                      {/* Multiple Answers */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Multiple Choice Answers
                        </label>
                        <div className="space-y-3">
                          {answers.map((answer, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Input
                                value={answer}
                                onChange={(e) => {
                                  const newAnswers = [...answers];
                                  newAnswers[index] = e.target.value;
                                  setTask({ ...task, answers: newAnswers });
                                }}
                                placeholder={`Answer option ${index + 1}`}
                                className="flex-1"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveAnswer(index)}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <div className="flex items-center gap-2">
                            <Input
                              value={newAnswer}
                              onChange={(e) => setNewAnswer(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAnswer())}
                              placeholder="Add new answer option..."
                              className="flex-1"
                            />
                            <button
                              type="button"
                              onClick={handleAddAnswer}
                              className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 
                                       hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0
                       bg-gray-50 dark:bg-gray-800/50">
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              onClick={handleSubmit}
              disabled={saving}
              isLoading={saving}
              className="px-6 min-w-[140px] bg-gradient-to-r from-blue-600 to-indigo-600 
                       hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg
                       hover:shadow-xl"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}; 
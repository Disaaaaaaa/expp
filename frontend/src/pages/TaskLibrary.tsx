import { useState, useMemo, useEffect } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { Search, Download, Trash2, BookOpen, Share2, Plus, Filter, Grid, List, ChevronDown, ChevronUp, Edit2, FileText, Loader2, AlertTriangle, X, CheckCircle2, Save, Check, Users, SortAsc, SortDesc, LayoutGrid } from 'lucide-react';
import type { Question } from '../types/exam';
import { getTasks, deleteTasks } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/common/Button';
import { TaskEditor } from '@/features/tasks/components/TaskEditor';
import { toast } from 'react-hot-toast';
import { TaskCreator } from '@/features/tasks/components/TaskCreation';
import { supabase } from '../services/supabase';
import { SaveSheet } from '@/features/sheets/components/SaveSheet';
import { SheetDownloadModal } from '@/features/sheets/components/SheetDownloadModal';
import { Link } from 'react-router-dom';
import { TaskFilters } from '@/features/tasks/components/TaskFilters';
import { PageLayout } from '@/layouts/PageLayout';
import { TaskEditModal } from '@/features/tasks/components/TaskEditModal';
import { renderMarkdownWithMath } from '../utils/mathFormatting';
import { useLanguageStore } from '@/store/languageStore';

type SortKey = 'date' | 'topic' | 'difficulty' | 'type';
type ViewMode = 'grid' | 'list';
type DocumentFormat = 'pdf' | 'docx';

interface Filters {
  topics: Set<string>;
  difficulties: Set<string>;
  types: Set<string>;
}

interface TaskCardProps {
  task: Question;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onEdit: (task: Question) => void;
  onDelete: (taskId: string) => Promise<void>;
  showAnswer: boolean;
  onToggleAnswer: (e: React.MouseEvent) => void;
  viewMode: ViewMode;
}

const getTypeColor = (type: string) => {
  const colors: Record<string, { bg: string; text: string }> = {
    'Multiple Choice': { 
      bg: 'bg-purple-100 dark:bg-purple-900/30', 
      text: 'text-purple-700 dark:text-purple-300'
    },
    'Short Answer': { 
      bg: 'bg-purple-100 dark:bg-purple-900/30', 
      text: 'text-purple-700 dark:text-purple-300'
    },
    'Essay': { 
      bg: 'bg-purple-100 dark:bg-purple-900/30', 
      text: 'text-purple-700 dark:text-purple-300'
    },
    'Problem Solving': { 
      bg: 'bg-purple-100 dark:bg-purple-900/30', 
      text: 'text-purple-700 dark:text-purple-300'
    }
  };
  return colors[type] || { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' };
};

const getTopicColor = (topic: string) => {
  const colors: Record<string, { bg: string; text: string }> = {
    'Mathematics': { 
      bg: 'bg-blue-100 dark:bg-blue-900/30', 
      text: 'text-blue-700 dark:text-blue-300'
    },
    'Physics': { 
      bg: 'bg-blue-100 dark:bg-blue-900/30', 
      text: 'text-blue-700 dark:text-blue-300'
    },
    'Chemistry': { 
      bg: 'bg-blue-100 dark:bg-blue-900/30', 
      text: 'text-blue-700 dark:text-blue-300'
    },
    'Biology': { 
      bg: 'bg-blue-100 dark:bg-blue-900/30', 
      text: 'text-blue-700 dark:text-blue-300'
    }
  };
  return colors[topic] || { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' };
};

const getDifficultyColor = (difficulty: string) => {
  const colors: Record<string, { bg: string; text: string }> = {
    'easy': { 
      bg: 'bg-green-100 dark:bg-green-900/30', 
      text: 'text-green-700 dark:text-green-300'
    },
    'medium': { 
      bg: 'bg-yellow-100 dark:bg-yellow-900/30', 
      text: 'text-yellow-700 dark:text-yellow-300'
    },
    'hard': { 
      bg: 'bg-red-100 dark:bg-red-900/30', 
      text: 'text-red-700 dark:text-red-300'
    }
  };
  return colors[difficulty] || { bg: 'bg-muted', text: 'text-muted-foreground' };
};

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  showAnswer,
  onToggleAnswer,
  viewMode,
}) => {
  const typeColors = getTypeColor(task.type);
  const topicColors = getTopicColor(task.topic);
  const difficultyColors = getDifficultyColor(task.difficulty);

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border ${
        isSelected 
          ? 'border-blue-500 dark:border-blue-400' 
          : 'border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-500/30'
      } p-4 transition-all duration-200 hover:shadow-md cursor-pointer h-[400px] flex flex-col`}
      onClick={onSelect}
    >
      <div className="flex-shrink-0">
        <div className="flex items-center flex-wrap gap-2 mb-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${difficultyColors.bg} ${difficultyColors.text}`}>
            {task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1)}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${topicColors.bg} ${topicColors.text}`}>
            {task.topic}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeColors.bg} ${typeColors.text}`}>
            {task.type}
          </span>
        </div>
      </div>

      <div className="flex flex-col flex-grow min-h-0">
        <div className="flex flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          <div className="w-full">
            <div className="prose dark:prose-invert max-w-none">
              {renderMarkdownWithMath(task.text)}
            </div>
            {showAnswer && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="prose dark:prose-invert max-w-none">
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <h4 className="text-sm font-medium text-primary mb-2">{t('tasks.solution')}</h4>
                    <div className="text-primary/80">
                      {renderMarkdownWithMath(task.solution || t('tasks.noSolution'))}
                    </div>
                  </div>
                  {task.answer && (
                    <div className="mt-4 p-4 bg-green-500/5 rounded-lg border border-green-500/20">
                        <h4 className="text-sm font-medium text-green-600 mb-2">{t('tasks.answer')}</h4>
                      <div className="text-green-600/80">
                        {renderMarkdownWithMath(task.answer)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onToggleAnswer(e);
            }}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={`w-4 h-4 transform transition-transform ${showAnswer ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onEdit(task);
            }}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="p-2 text-red-500 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const TaskLibrary: React.FC = () => {
  const { questions, setQuestions } = useTaskStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useLanguageStore();
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [editingTask, setEditingTask] = useState<Question | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedSolutions, setExpandedSolutions] = useState<Set<string>>(new Set());
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Filters>({
    topics: new Set(),
    difficulties: new Set(),
    types: new Set()
  });
  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const subjects = useMemo(() => 
    Array.from(new Set(questions.map(q => q.topic))).sort(), 
    [questions]
  );

  const types = useMemo(() => 
    Array.from(new Set(questions.map(q => q.type))).sort(),
    [questions]
  );

  const toggleSort = (field: SortKey) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedTasks = useMemo(() => {
    return questions
      .filter(task => {
        const matchesSearch = !searchQuery || 
          task.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.type.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDifficulty = filters.difficulties.size === 0 || filters.difficulties.has(task.difficulty);
        const matchesType = filters.types.size === 0 || filters.types.has(task.type);
        const matchesSubject = filters.topics.size === 0 || filters.topics.has(task.topic);
        
        return matchesSearch && matchesDifficulty && matchesType && matchesSubject;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'topic':
            comparison = a.topic.localeCompare(b.topic);
            break;
          case 'difficulty':
            const difficultyOrder: Record<string, number> = { 'easy': 0, 'medium': 1, 'hard': 2 };
            comparison = (difficultyOrder[a.difficulty] || 0) - (difficultyOrder[b.difficulty] || 0);
            break;
          case 'type':
            comparison = a.type.localeCompare(b.type);
            break;
          case 'date':
            comparison = a.id.localeCompare(b.id);
            break;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [questions, searchQuery, filters, sortBy, sortDirection]);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedTasks: Question[] = data.map(task => ({
          id: task.id,
          text: task.text,
          type: task.type,
          topic: task.topic,
          difficulty: task.difficulty,
          solution: task.solution?.trim() || null,
          answer: task.answers?.answer || null,
          answers: Array.isArray(task.answers) ? task.answers : null,
        }));
        setQuestions(mappedTasks);
      }
    } catch (err) {
      setError('Failed to load tasks. Please try again later.');
      console.error('Error loading tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskClick = (e: React.MouseEvent, taskId: string): void => {
    e.preventDefault();
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleBulkAction = async (action: 'delete' | 'share') => {
    const selectedTasksList = filteredAndSortedTasks.filter(task => 
      selectedTasks.has(task.id)
    );

    if (selectedTasksList.length === 0) {
      toast.error('Please select tasks to perform action');
      return;
    }

    try {
      switch (action) {
        case 'delete':
          setShowDeleteConfirm(true);
          break;

        case 'share':
          
          console.log('Share functionality not implemented yet');
          break;
      }
    } catch (err) {
      console.error(`Error performing ${action}:`, err);
      toast.error(`Failed to ${action} tasks: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteTasks(Array.from(selectedTasks));
      toast.success(`${selectedTasks.size} task(s) deleted successfully`);
      await loadTasks();
      setSelectedTasks(new Set());
      setShowDeleteConfirm(false);
    } catch (error) {
      toast.error('Failed to delete tasks');
      console.error('Delete error:', error);
    }
  };

  const handleEdit = (task: Question): void => {
    setEditingTask(task);
  };

  const handleSave = async (updatedTask: Question) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found');

      const taskToSave = {
        text: updatedTask.text,
        type: updatedTask.type,
        topic: updatedTask.topic,
        difficulty: updatedTask.difficulty,
        solution: updatedTask.solution?.trim() || null,
        answers: { answer: updatedTask.answer },
        updated_at: new Date().toISOString(),
        user_id: user.id
      };

      const { error } = await supabase
        .from('tasks')
        .update(taskToSave)
        .eq('id', updatedTask.id);

      if (error) throw error;

      // Update local state
      setQuestions(questions.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      ));

      setEditingTask(null);
      toast.success('Task updated successfully');
    } catch (err) {
      console.error('Error updating task:', err);
      toast.error('Failed to update task');
    }
  };

  const handleCreateTask = async (newTask: Question) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found');

      const taskToSave = {
        id: newTask.id,
        text: newTask.text,
        type: newTask.type,
        topic: newTask.topic,
        difficulty: newTask.difficulty,
        solution: newTask.solution?.trim() || null,
        answer: newTask.answer?.trim() || null,
        user_id: user.id
      };

      const { error } = await supabase
        .from('tasks')
        .insert(taskToSave);

      if (error) throw error;

      setQuestions([...questions, newTask]);
      setIsCreating(false);
      toast.success('Task created successfully');
    } catch (err) {
      console.error('Error creating task:', err);
      toast.error('Failed to create task');
    }
  };

  const toggleSolution = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    setExpandedSolutions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const toggleAnswer = (e: React.MouseEvent, taskId: string): void => {
    e.stopPropagation();
    setExpandedAnswers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleSaveAsSheet = async (title: string, tasks: Question[], description?: string) => {
    try {
      if (tasks.length === 0) {
        toast.error('Please select tasks to save');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found');

      const { data, error } = await supabase
        .from('task_sheets')
        .insert({
          user_id: user.id,
          title,
          description,
          tasks: tasks.map(task => task.id)
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Task sheet saved successfully');
      setShowSaveSheet(false);
      setSelectedTasks(new Set());
    } catch (error) {
      console.error('Error saving task sheet:', error);
      toast.error('Failed to save task sheet');
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await deleteTasks([taskId]);
      toast.success('Task deleted successfully');
      await loadTasks();
      setSelectedTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    } catch (error) {
      console.error('Delete error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete task';
      toast.error(errorMessage);
    }
  };

  const renderTaskCard = (task: Question) => (
    <TaskCard
      key={task.id}
      task={task}
      isSelected={selectedTasks.has(task.id)}
      onSelect={(e) => handleTaskClick(e, task.id)}
      onEdit={handleEdit}
      onDelete={handleDelete}
      showAnswer={expandedAnswers.has(task.id)}
      onToggleAnswer={(e: React.MouseEvent) => toggleAnswer(e, task.id)}
      viewMode={viewMode}
    />
  );

  const renderTaskList = () => (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <input
                type="checkbox"
                checked={selectedTasks.size === filteredAndSortedTasks.length}
                onChange={() => {
                  if (selectedTasks.size === filteredAndSortedTasks.length) {
                    setSelectedTasks(new Set());
                  } else {
                    setSelectedTasks(new Set(filteredAndSortedTasks.map(t => t.id)));
                  }
                }}
                className="rounded border-border text-primary focus:ring-primary"
              />
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Task
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Type
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Subject
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Difficulty
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredAndSortedTasks.map(task => (
            <tr key={task.id}>
              {editingTask?.id === task.id ? (
                <td colSpan={6} className="px-6 py-4">
                  <TaskEditor
                    task={task}
                    onSave={handleSave}
                    onCancel={() => setEditingTask(null)}
                    mode="edit"
                  />
                </td>
              ) : (
                <>
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedTasks.has(task.id)}
                      onChange={(e) => handleTaskClick(e as unknown as React.MouseEvent, task.id)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-foreground prose dark:prose-invert prose-sm max-w-none katex-text">
                      {renderMarkdownWithMath(task.text)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-sm text-muted-foreground">{task.type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-sm text-muted-foreground">{task.topic}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium
                      ${task.difficulty === 'easy' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        task.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                      {task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Edit2 className="h-4 w-4" />}
                        onClick={() => handleEdit(task)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 className="h-4 w-4" />}
                        onClick={() => handleBulkAction('delete')}
                        className="text-red-600 hover:bg-red-50"
                      />
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <div className="text-muted-foreground mb-4">
        <FileText className="w-12 h-12 mx-auto" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
          {t('library.noTasks')}
        </h3>
       <p className="text-muted-foreground">
        {t('library.adjustSearch')}
      </p>
      <Button
            variant="primary"
        size="lg"
        icon={<Plus className="w-5 h-5" />}
        onClick={() => setIsCreating(true)}
        className="mt-4"
       >
        {t('library.createNew')}
      </Button>
        </div>
  );

  
  const getVisibleTaskIds = () => {
    return new Set(filteredAndSortedTasks.map(task => task.id));
  };

    return (
    <PageLayout maxWidth="2xl">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">

            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">{t('nav.library')}</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              icon={<BookOpen className="w-5 h-5" />}
              onClick={() => navigate('/generate-task')}
              className="shadow-lg hover:shadow-xl transition-shadow"
            >
              {t('nav.generateTask')}
            </Button>
            <Button
              variant="primary"
              icon={<Plus className="w-5 h-5" />}
              onClick={() => setIsCreating(true)}
              className="shadow-lg hover:shadow-xl transition-shadow"
            >
              {t('library.createTask')}
            </Button>
          </div>
        </div>

        {/* Search and View Controls */}
        <div className="bg-background border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 text-lg" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('library.search') || "Тапсырмаларды іздеу..."}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-border rounded-lg text-lg
                           text-foreground placeholder-muted-foreground
                           focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-background text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Grid view"
                  >
                    <LayoutGrid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list'
                        ? 'bg-background text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="List view"
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>

                <Button
                  variant={showFilters ? "primary" : "ghost"}
                  size="lg"
                  icon={<Filter className="w-5 h-5" />}
                  className={`min-w-[120px] ${
                    showFilters 
                      ? "bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
                      : "text-foreground hover:bg-accent"
                  }`}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  {t('library.filters')} {(filters.topics.size + filters.types.size + filters.difficulties.size) > 0 && (
                    <span className={`ml-1.5 px-2.5 py-0.5 rounded-full text-sm font-medium ${
                      showFilters 
                        ? "bg-blue-500/20 dark:bg-blue-400/20 text-white" 
                        : "bg-accent text-foreground"
                    }`}>
                      {filters.topics.size + filters.types.size + filters.difficulties.size}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-border"
              >
                <div className="p-6">
                  <TaskFilters
                    filters={filters}
                    updateFilters={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))}
                    clearFilters={() => setFilters({ topics: new Set(), difficulties: new Set(), types: new Set() })}
                    tasks={questions}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
            <div className="flex gap-3">
            </div>

             <div className="flex items-center gap-6">
              <span className="text-sm font-medium text-muted-foreground">{t('library.sortBy')}:</span>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleSort('date')}
                  className={`text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    sortBy === 'date' 
                       ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-muted-foreground'
                  }`}
                >
                  {t('library.date')}
                  {sortBy === 'date' && (
                    sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                  )}
                </button>
                
                <button
                  onClick={() => toggleSort('topic')}
                  className={`text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    sortBy === 'topic' 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-muted-foreground'
                  }`}
                >
                    {t('tasks.type')}
                    {sortBy === 'type' && (
                      sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

        {/* Task Grid/List */}
        {isLoading ? (
          <div className="flex items-center justify-center flex-grow mt-6">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center flex-grow text-red-500 mt-6">
            <AlertTriangle className="w-6 h-6 mr-2" />
            {error}
          </div>
        ) : filteredAndSortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-grow gap-4 text-center p-8 mt-6">
            <FileText className="w-12 h-12 text-muted-foreground" />
            <h3 className="text-xl font-semibold text-foreground">{t('library.noTasks')}</h3>
            <p className="text-muted-foreground">
              {searchQuery ? t('library.adjustSearch') : t('library.createNew')}
            </p>
            {!searchQuery && (
              <Button
              variant="primary"
              size="lg"
              icon={<Plus className="w-5 h-5" />}
              onClick={() => setIsCreating(true)}
            >
              {t('library.createNew')}
            </Button>
            )}
          </div>
        ) : (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 auto-rows-fr">
              {filteredAndSortedTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isSelected={selectedTasks.has(task.id)}
                  onSelect={(e) => handleTaskClick(e, task.id)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  showAnswer={expandedAnswers.has(task.id)}
                  onToggleAnswer={(e: React.MouseEvent) => toggleAnswer(e, task.id)}
                  viewMode={viewMode}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4 mt-6">
              {filteredAndSortedTasks.map(task => {
                const typeColors = getTypeColor(task.type);
                const topicColors = getTopicColor(task.topic);
                const difficultyColors = getDifficultyColor(task.difficulty);
                
                return (
                  <div
                    key={task.id}
                    className={`bg-background rounded-lg border ${
                      selectedTasks.has(task.id)
                        ? 'border-blue-500 dark:border-blue-400'
                        : 'border-border'
                    } p-4 transition-all duration-200 hover:shadow-md`}
                    onClick={(e: React.MouseEvent) => handleTaskClick(e, task.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-grow">
                        <div className="flex items-center flex-wrap gap-2 mb-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${difficultyColors.bg} ${difficultyColors.text}`}>
                            {task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1)}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${topicColors.bg} ${topicColors.text}`}>
                            {task.topic}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeColors.bg} ${typeColors.text}`}>
                            {task.type}
                          </span>
                        </div>
                        <div className="prose dark:prose-invert max-w-none">
                          {renderMarkdownWithMath(task.text)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e: React.MouseEvent) => toggleAnswer(e, task.id)}
                          className="p-2 text-muted-foreground hover:text-foreground"
                        >
                          <ChevronDown className={`w-4 h-4 transform transition-transform ${
                            expandedAnswers.has(task.id) ? 'rotate-180' : ''
                          }`} />
                        </button>
                        <button
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleEdit(task);
                          }}
                          className="p-2 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleDelete(task.id);
                          }}
                          className="p-2 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {expandedAnswers.has(task.id) && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="prose dark:prose-invert max-w-none">
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">{t('tasks.solution')}</h4>
                            <div className="text-blue-800 dark:text-blue-200">
                              {renderMarkdownWithMath(task.solution || t('tasks.noSolution'))}
                            </div>
                          </div>
                          {task.answer && (
                            <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
                              <h4 className="text-sm font-medium text-emerald-900 dark:text-emerald-300 mb-2">{t('tasks.answer')}</h4>
                              <div className="text-emerald-800 dark:text-emerald-200">
                                {renderMarkdownWithMath(task.answer)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Selection Actions */}
        <AnimatePresence>
          {selectedTasks.size > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-0 left-0 right-0 bg-background border-t border-border 
                       p-4 flex justify-between items-center gap-4 shadow-lg z-50"
            >
              <div className="flex items-center gap-3">
                <div className="text-sm text-muted-foreground">
                  {selectedTasks.size} {t('tasks.selected')}
                </div>
                <button
                  onClick={() => {
                    const allSelected = selectedTasks.size === filteredAndSortedTasks.length;
                    if (allSelected) {
                      setSelectedTasks(new Set());
                    } else {
                      setSelectedTasks(new Set(filteredAndSortedTasks.map(t => t.id)));
                    }
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 
                           underline transition-colors duration-150"
                >
                  {selectedTasks.size === filteredAndSortedTasks.length ? t('tasks.deselectAll') : t('tasks.selectAll')}
                </button>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowSaveSheet(true)}
                  variant="secondary"
                  className="whitespace-nowrap"
                >
                  <Save className="w-4 h-4 mr-1" />
                  {t('tasks.saveAsSheet')}
                </Button>
                <Button
                  onClick={() => setShowDownloadModal(true)}
                  variant="secondary"
                  className="whitespace-nowrap"
                >
                  <Download className="w-4 h-4 mr-1" />
                  {t('sheets.export')}
                </Button>
                <Button
                  onClick={() => handleBulkAction('delete')}
                  variant="secondary"
                  className="whitespace-nowrap text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {t('sheets.delete')}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modals */}
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="bg-background rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden border border-gray-200/50 dark:border-gray-700/50"
              >
                <TaskCreator
                  onCreate={handleCreateTask}
                  onCancel={() => setIsCreating(false)}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {editingTask && (
            <TaskEditModal
              task={editingTask}
              onClose={() => setEditingTask(null)}
              onSave={handleSave}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSaveSheet && selectedTasks.size > 0 && (
            <SaveSheet
              selectedTasks={questions.filter(q => selectedTasks.has(q.id))}
              onSave={handleSaveAsSheet}
              onClose={() => setShowSaveSheet(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showDownloadModal && selectedTasks.size > 0 && (
            <SheetDownloadModal
              onClose={() => setShowDownloadModal(false)}
              tasks={questions.filter(q => selectedTasks.has(q.id))}
            />
          )}
        </AnimatePresence>
      </div>
    </PageLayout>
  );
};
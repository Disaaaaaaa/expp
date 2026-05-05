import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, Filter, Loader2, ChevronUp, ChevronDown, Edit2, AlertTriangle, FileText, SortAsc, SortDesc } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { Question } from '@/types/exam';
import { Button } from '@/components/common/Button';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { TaskEditModal } from '@/features/tasks/components/TaskEditModal';
import { TaskFilters } from '@/features/tasks/components/TaskFilters';
import { renderMarkdownWithMath } from '@/utils/mathFormatting';

interface TaskSelectorModalProps {
  onClose: () => void;
  onSelect: (tasks: Question[]) => void;
  existingTaskIds: string[];
}


type SortKey = 'date' | 'topic' | 'difficulty' | 'type';

export const TaskSelectorModal = ({ onClose, onSelect, existingTaskIds }: TaskSelectorModalProps) => {
  const [tasks, setTasks] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<Question | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<string>>(new Set());
  const [types, setTypes] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [allTasks, setAllTasks] = useState<Question[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  useEffect(() => {
    loadTasks();
  }, []);
  
  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      const tasks = data.map(task => ({
        id: task.id,
        text: task.text,
        type: task.type,
        topic: task.topic,
        difficulty: task.difficulty,
        solution: task.solution,
        answer: task.answers?.answer || null,
      }));
      
      
      const filteredTasks = tasks.filter(task => !existingTaskIds.includes(task.id));
      
      setAllTasks(filteredTasks);
      setTasks(filteredTasks);
      
      
      setTopics([...new Set(filteredTasks.map(t => t.topic))].filter(Boolean));
      setDifficulties([...new Set(filteredTasks.map(t => t.difficulty))].filter(Boolean));
      setTypes([...new Set(filteredTasks.map(t => t.type))].filter(Boolean));
      
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleTask = (taskId: string) => {
    const newSelectedTasks = new Set(selectedTasks);
    if (newSelectedTasks.has(taskId)) {
      newSelectedTasks.delete(taskId);
    } else {
      newSelectedTasks.add(taskId);
    }
    setSelectedTasks(newSelectedTasks);
  };
  
  const toggleTopic = (topic: string) => {
    const newSelectedTopics = new Set(selectedTopics);
    if (newSelectedTopics.has(topic)) {
      newSelectedTopics.delete(topic);
    } else {
      newSelectedTopics.add(topic);
    }
    setSelectedTopics(newSelectedTopics);
  };
  
  const toggleDifficulty = (difficulty: string) => {
    const newSelectedDifficulties = new Set(selectedDifficulties);
    if (newSelectedDifficulties.has(difficulty)) {
      newSelectedDifficulties.delete(difficulty);
    } else {
      newSelectedDifficulties.add(difficulty);
    }
    setSelectedDifficulties(newSelectedDifficulties);
  };
  
  const toggleType = (type: string) => {
    const newSelectedTypes = new Set(selectedTypes);
    if (newSelectedTypes.has(type)) {
      newSelectedTypes.delete(type);
    } else {
      newSelectedTypes.add(type);
    }
    setSelectedTypes(newSelectedTypes);
  };
  
  const handleAddTasks = () => {
    const selectedTaskObjects = allTasks.filter(task => selectedTasks.has(task.id));
    onSelect(selectedTaskObjects);
    onClose();
  };
  
  
  const toggleSort = (field: SortKey) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };
  
  
  const filteredTasks = useMemo(() => {
    return allTasks
      .filter(task => {
        
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          if (!task.text.toLowerCase().includes(query)) {
            return false;
          }
        }
        
        
        if (selectedTopics.size > 0 && !selectedTopics.has(task.topic)) {
          return false;
        }
        
        
        if (selectedDifficulties.size > 0 && !selectedDifficulties.has(task.difficulty)) {
          return false;
        }
        
        
        if (selectedTypes.size > 0 && !selectedTypes.has(task.type)) {
          return false;
        }
        
        return true;
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
  }, [allTasks, searchQuery, selectedTopics, selectedDifficulties, selectedTypes, sortBy, sortDirection]);
  
  const toggleDetails = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    setExpandedDetails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleEdit = (e: React.MouseEvent, task: Question) => {
    e.stopPropagation();
    setEditingTask(task);
  };

  const handleTaskUpdate = async (updatedTask: Question) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          text: updatedTask.text,
          type: updatedTask.type,
          topic: updatedTask.topic,
          difficulty: updatedTask.difficulty,
          solution: updatedTask.solution,
          answers: updatedTask.answer ? { answer: updatedTask.answer } : null
        })
        .eq('id', updatedTask.id);

      if (error) throw error;

      
      setAllTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === updatedTask.id ? updatedTask : task
        )
      );

      setEditingTask(null);
    } catch (err) {
      console.error('Error updating task:', err);
      
    }
  };


  if (loading) {
    return (
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
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full"
        >
          <div className="flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
        </motion.div>
      </motion.div>
    );
  }

  if (error) {
    return (
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
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full"
        >
          <div className="flex flex-col items-center text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 dark:text-red-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
            <Button
              variant="primary"
              onClick={loadTasks}
              className="dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              Try Again
            </Button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
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
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50"
      >
        
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Select Tasks</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Choose tasks to add to your sheet
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-full
                     hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-4">
            
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl 
                            focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                            bg-white dark:bg-gray-800 shadow-sm hover:border-gray-300 dark:hover:border-gray-600 
                            transition-all duration-200
                            text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>

            
            <Button
              variant={showFilters ? "primary" : "ghost"}
              icon={<Filter className="w-5 h-5" />}
              className={`min-w-[120px] ${
                showFilters 
                  ? "bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/80"
              }`}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters {(selectedTopics.size + selectedDifficulties.size + selectedTypes.size) > 0 && (
                <span className={`ml-1.5 px-2.5 py-0.5 rounded-full text-sm font-medium ${
                  showFilters 
                    ? "bg-blue-500/20 dark:bg-blue-400/20 text-white" 
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}>
                  {selectedTopics.size + selectedDifficulties.size + selectedTypes.size}
                </span>
              )}
            </Button>
          </div>

          
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                <TaskFilters
                  filters={{
                    topics: selectedTopics,
                    difficulties: selectedDifficulties,
                    types: selectedTypes
                  }}
                  updateFilters={(newFilters) => {
                    if (newFilters.topics) setSelectedTopics(newFilters.topics);
                    if (newFilters.difficulties) setSelectedDifficulties(newFilters.difficulties);
                    if (newFilters.types) setSelectedTypes(newFilters.types);
                  }}
                  clearFilters={() => {
                    setSelectedTopics(new Set());
                    setSelectedDifficulties(new Set());
                    setSelectedTypes(new Set());
                  }}
                  tasks={allTasks}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No tasks found</p>
              </div>
            ) : (
              filteredTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`group bg-white dark:bg-gray-800 rounded-xl border transition-all cursor-pointer
                    ${selectedTasks.has(task.id)
                      ? 'border-blue-500 dark:border-blue-400 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-500/30'
                    }`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex gap-2 mb-2 flex-wrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium
                            ${task.difficulty === 'easy'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : task.difficulty === 'medium'
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                            }`}
                          >
                            {task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1)}
                          </span>
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs">
                            {task.topic}
                          </span>
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs">
                            {task.type}
                          </span>
                        </div>
                        
                        <div className="text-gray-900 dark:text-white">
                          {renderMarkdownWithMath(task.text)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleEdit(e, task)}
                          className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <div className={`w-5 h-5 rounded border transition-colors flex items-center justify-center
                          ${selectedTasks.has(task.id)
                            ? 'bg-blue-500 dark:bg-blue-400 border-blue-500 dark:border-blue-400'
                            : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {selectedTasks.has(task.id) && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={onClose}
                className="dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAddTasks}
                disabled={selectedTasks.size === 0}
                className="dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
              >
                Add Selected Tasks
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      
      <AnimatePresence>
        {editingTask && (
          <TaskEditModal
            task={editingTask}
            onClose={() => setEditingTask(null)}
            onSave={handleTaskUpdate}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}; 
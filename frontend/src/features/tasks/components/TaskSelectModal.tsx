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
import { CreateSheet } from '@/features/sheets/components/CreateSheet';

interface TaskSelectModalProps {
  onClose: () => void;
  onSave: (title: string, description: string | undefined, tasks: Question[]) => void;
  existingTaskIds?: string[];
  onTasksSelected?: (tasks: Question[]) => void; // Optional callback for direct task selection
  skipCreateSheet?: boolean; // If true, skip CreateSheet and call onTasksSelected instead
}


type SortKey = 'date' | 'topic' | 'difficulty' | 'type';

export const TaskSelectModal = ({ onClose, onSave, existingTaskIds = [], onTasksSelected, skipCreateSheet = false }: TaskSelectModalProps) => {
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
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  
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
      
      setAllTasks(tasks);
      setTasks(tasks);
      
     
      setTopics([...new Set(tasks.map(t => t.topic))].filter(Boolean));
      setDifficulties([...new Set(tasks.map(t => t.difficulty))].filter(Boolean));
      setTypes([...new Set(tasks.map(t => t.type))].filter(Boolean));
      
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
  
  const handleImport = () => {
    const tasksToImport = allTasks.filter(task => selectedTasks.has(task.id));
    onSave('New Sheet', undefined, tasksToImport);
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
        // Filter out existing tasks if existingTaskIds is provided
        if (existingTaskIds && existingTaskIds.length > 0 && existingTaskIds.includes(task.id)) {
          return false;
        }
        
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
  }, [allTasks, searchQuery, selectedTopics, selectedDifficulties, selectedTypes, sortBy, sortDirection, existingTaskIds]);
  
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

  const handleContinue = () => {
    if (selectedTasks.size === 0) return;
    
    if (skipCreateSheet && onTasksSelected) {
      // Direct callback mode - return selected tasks immediately
      const selectedTaskObjects = getSelectedTaskObjects();
      onTasksSelected(selectedTaskObjects);
      onClose();
    } else {
      // Normal mode - show CreateSheet
      setShowCreateSheet(true);
    }
  };

  const handleBack = () => {
    setShowCreateSheet(false);
  };

  const getSelectedTaskObjects = () => {
    return tasks.filter(task => selectedTasks.has(task.id));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
    >
      <AnimatePresence mode="wait">
        {!showCreateSheet ? (
          <motion.div
            key="select-tasks"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full h-[85vh]
                     border border-gray-200/50 dark:border-gray-700/50 my-4
                     max-w-4xl flex flex-col"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Select Tasks</h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 
                         dark:hover:text-gray-200 rounded-full hover:bg-gray-100 
                         dark:hover:bg-gray-700 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
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
                            text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                            text-lg"
                  />
                </div>

                <Button
                  variant={selectedTasks.size > 0 ? "primary" : "ghost"}
                  size="lg"
                  icon={<Check className="w-5 h-5" />}
                  className={`min-w-[120px] h-[46px] ${
                    selectedTasks.size > 0 
                      ? "bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/80"
                  }`}
                  onClick={() => {
                    if (selectedTasks.size > 0) {
                      setSelectedTasks(new Set());
                    } else {
                      setSelectedTasks(new Set(filteredTasks.map(t => t.id)));
                    }
                  }}
                >
                  {selectedTasks.size > 0 ? (
                    <>
                      Selected <span className="ml-1.5 px-2.5 py-0.5 bg-blue-500/20 dark:bg-blue-400/20 text-white rounded-full text-sm font-medium">
                        {selectedTasks.size}
                      </span>
                    </>
                  ) : (
                    'Select All'
                  )}
                </Button>

                <Button
                  variant={showFilters ? "primary" : "ghost"}
                  size="lg"
                  icon={<Filter className="w-5 h-5" />}
                  className={`min-w-[120px] h-[46px] ${
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
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
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
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-6 flex items-center gap-6">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Sort by:</span>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleSort('date')}
                    className={`text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                      sortBy === 'date' 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Date
                    {sortBy === 'date' && (
                      sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => toggleSort('topic')}
                    className={`text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                      sortBy === 'topic' 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Topic
                    {sortBy === 'topic' && (
                      sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => toggleSort('difficulty')}
                    className={`text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                      sortBy === 'difficulty' 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Difficulty
                    {sortBy === 'difficulty' && (
                      sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => toggleSort('type')}
                    className={`text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                      sortBy === 'type' 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Type
                    {sortBy === 'type' && (
                      sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <AlertTriangle className="w-12 h-12 mx-auto text-red-500 dark:text-red-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Error loading tasks
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">{error}</p>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No tasks found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Try creating some tasks first
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTasks.map(task => (
                    <div
                      key={task.id}
                      className={`group cursor-pointer rounded-xl border transition-all duration-200
                        ${selectedTasks.has(task.id)
                          ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      onClick={() => toggleTask(task.id)}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex gap-2 mb-2">
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
                            <div className="text-gray-900 dark:text-white prose dark:prose-invert prose-sm max-w-none">
                              {task.text
                                .split(/(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g)
                                .map((part, index) => {
                                  if (part.startsWith('\\[') && part.endsWith('\\]')) {
                                    return <BlockMath key={index} math={part.slice(2, -2)} />;
                                  } else if (part.startsWith('\\(') && part.endsWith('\\)')) {
                                    return <InlineMath key={index} math={part.slice(2, -2)} />;
                                  }
                                  return <span key={index}>{part}</span>;
                                })}
                            </div>
                          </div>
                          {selectedTasks.has(task.id) && (
                            <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>

                        <div className="mt-4 flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => toggleDetails(e, task.id)}
                            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white
                                     flex items-center gap-1 transition-colors duration-150"
                          >
                            {expandedDetails.has(task.id) ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                            Details
                          </button>
                          <button
                            onClick={(e) => handleEdit(e, task)}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300
                                     flex items-center gap-1 transition-colors duration-150"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                        </div>

                        {expandedDetails.has(task.id) && (
                          <div className="mt-4 space-y-4">
                            <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                              <div className="font-medium text-blue-900 dark:text-blue-300 mb-2">Solution:</div>
                              <div className="prose dark:prose-invert prose-sm max-w-none text-blue-800 dark:text-blue-200">
                                {task.solution ? (
                                  task.solution
                                    .split(/(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g)
                                    .map((part, index) => {
                                      if (part.startsWith('\\[') && part.endsWith('\\]')) {
                                        return <BlockMath key={index} math={part.slice(2, -2)} />;
                                      } else if (part.startsWith('\\(') && part.endsWith('\\)')) {
                                        return <InlineMath key={index} math={part.slice(2, -2)} />;
                                      }
                                      return <span key={index}>{part}</span>;
                                    })
                                ) : (
                                  'No solution provided'
                                )}
                              </div>
                            </div>
                            <div className="p-4 rounded-lg bg-green-50/50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                              <div className="font-medium text-green-900 dark:text-green-300 mb-2">Answer:</div>
                              <div className="prose dark:prose-invert prose-sm max-w-none text-green-800 dark:text-green-200">
                                {task.answer ? (
                                  task.answer
                                    .split(/(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g)
                                    .map((part, index) => {
                                      if (part.startsWith('\\[') && part.endsWith('\\]')) {
                                        return <BlockMath key={index} math={part.slice(2, -2)} />;
                                      } else if (part.startsWith('\\(') && part.endsWith('\\)')) {
                                        return <InlineMath key={index} math={part.slice(2, -2)} />;
                                      }
                                      return <span key={index}>{part}</span>;
                                    })
                                ) : (
                                  'No answer provided'
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 
                           hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors
                           flex items-center font-medium"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleContinue}
                  disabled={selectedTasks.size === 0}
                  className="bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
                >
                  {skipCreateSheet ? 'Add Tasks' : 'Continue'}
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="create-sheet"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="h-[85vh] w-full max-w-2xl my-4"
          >
            <CreateSheet
              onSave={onSave}
              onBack={handleBack}
              onClose={onClose}
              selectedTasks={getSelectedTaskObjects()}
            />
          </motion.div>
        )}
      </AnimatePresence>

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
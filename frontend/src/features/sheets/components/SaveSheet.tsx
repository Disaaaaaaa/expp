import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Question } from '@/types/exam';
import { TaskSelectModal } from '@/features/tasks/components/TaskSelectModal';

interface SaveSheetProps {
  onSave: (title: string, tasks: Question[], description?: string) => void;
  onClose: () => void;
  selectedTasks: Question[];
}

export const SaveSheet = ({ onSave, onClose, selectedTasks }: SaveSheetProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allTasks, setAllTasks] = useState<Question[]>(selectedTasks);
  const [showTaskSelectModal, setShowTaskSelectModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      onSave(title, allTasks, description);
    } catch (error) {
      console.error('Error saving sheet:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTasksFromLibrary = (libraryTasks: Question[]) => {
    // Merge library tasks with existing tasks, avoiding duplicates by ID
    const existingTaskIds = new Set(allTasks.map(task => task.id));
    const newTasks = libraryTasks.filter(task => !existingTaskIds.has(task.id));
    setAllTasks([...allTasks, ...newTasks]);
    setShowTaskSelectModal(false);
  };

  
  const groupedTags = allTasks.reduce((acc, task) => {
    
    if (!acc['difficulty']) {
      acc['difficulty'] = new Set();
    }
    acc['difficulty'].add(`difficulty:${task.difficulty}`);

    
    if (!acc['topic']) {
      acc['topic'] = new Set();
    }
    acc['topic'].add(`topic:${task.topic}`);

    
    if (!acc['type']) {
      acc['type'] = new Set();
    }
    acc['type'].add(`type:${task.type}`);

    return acc;
  }, {} as Record<string, Set<string>>);

  // Convert Sets to Arrays
  const processedTags = Object.entries(groupedTags).reduce((acc, [type, tags]) => {
    acc[type] = Array.from(tags);
    return acc;
  }, {} as Record<string, string[]>);

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
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full h-[85vh]
                    border border-gray-200/50 dark:border-gray-700/50 flex flex-col max-w-2xl my-4"
      >
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Save Sheet</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Save {allTasks.length} task{allTasks.length !== 1 ? 's' : ''} as a new sheet
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 
                     hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

          <div className="space-y-6 flex-1 overflow-y-auto">
          
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       placeholder-gray-400 dark:placeholder-gray-500 transition-all"
              placeholder="Enter a descriptive title for your sheet"
            />
          </div>

          
          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Description <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       placeholder-gray-400 dark:placeholder-gray-500 transition-all"
              placeholder="Add a description to provide more context about this sheet"
            />
          </div>

          
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 border border-gray-100 dark:border-gray-600/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Selected Tasks Overview
              </h3>
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowTaskSelectModal(true)}
                className="text-sm"
              >
                Add from Library
              </Button>
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-y-4">
              
              {processedTags['difficulty'] && (
                <>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 self-center">Difficulty</span>
                  <div className="flex flex-wrap gap-2">
                    {processedTags['difficulty'].map((tag) => {
                      const difficulty = tag.split(':')[1];
                      return (
                        <span
                          key={tag}
                          className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium 
                            ${difficulty === 'easy'
                              ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 ring-1 ring-green-400/30'
                              : difficulty === 'medium'
                                ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 ring-1 ring-yellow-400/30'
                                : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 ring-1 ring-red-400/30'
                            }`}
                        >
                          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                        </span>
                      );
                    })}
                  </div>
                </>
              )}

              
              {processedTags['topic'] && (
                <>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 self-center">Topics</span>
                  <div className="flex flex-wrap gap-2">
                    {processedTags['topic'].map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium
                                 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300
                                 ring-1 ring-blue-400/30"
                      >
                        {tag.split(':')[1]}
                      </span>
                    ))}
                  </div>
                </>
              )}

              
              {processedTags['type'] && (
                <>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 self-center">Types</span>
                  <div className="flex flex-wrap gap-2">
                    {processedTags['type'].map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium
                                 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300
                                 ring-1 ring-purple-400/30"
                      >
                        {tag.split(':')[1]}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        
        <div className="p-6">
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
              onClick={handleSubmit}
              disabled={!title.trim() || isSubmitting}
              className="bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600
                       flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Saving...
                </>
              ) : (
                'Save Sheet'
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showTaskSelectModal && (
          <TaskSelectModal
            onClose={() => setShowTaskSelectModal(false)}
            onSave={(title, description, tasks) => handleAddTasksFromLibrary(tasks)}
            existingTaskIds={allTasks.map(task => task.id)}
            onTasksSelected={handleAddTasksFromLibrary}
            skipCreateSheet={true}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

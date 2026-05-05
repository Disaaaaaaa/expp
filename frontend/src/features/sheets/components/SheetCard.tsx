import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, FileText, Edit } from 'lucide-react';
import { TaskSheet } from '@/types/supabase';
import { Question } from '@/types/exam';

interface SheetCardProps {
  sheet: TaskSheet;
  tasks: Question[];
  onView: () => void;
  onEdit: (e: React.MouseEvent) => void;
  viewMode: 'grid' | 'list';
}

export const SheetCard: React.FC<SheetCardProps> = ({
  sheet,
  tasks,
  onView,
  onEdit,
  viewMode
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  
  const difficultyCount = {
    easy: tasks.filter(task => task.difficulty === 'easy').length,
    medium: tasks.filter(task => task.difficulty === 'medium').length,
    hard: tasks.filter(task => task.difficulty === 'hard').length
  };

 
  const topics = [...new Set(tasks.map(task => task.topic))];

  if (viewMode === 'list') {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-500/30 transition-colors cursor-pointer flex"
        onClick={onView}
      >
        <div className="p-4 flex items-center gap-4 w-full">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{sheet.title}</h3>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(sheet.created_at)}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                <span>{sheet.tasks?.length || 0} tasks</span>
              </div>
            </div>
            {tasks.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center">
                  <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    {difficultyCount.easy > 0 && (
                      <div 
                        className="absolute inset-y-0 left-0 bg-green-500 dark:bg-green-400"
                        style={{ width: `${(difficultyCount.easy / tasks.length) * 100}%` }}
                      ></div>
                    )}
                    {difficultyCount.medium > 0 && (
                      <div 
                        className="absolute inset-y-0 bg-yellow-500 dark:bg-yellow-400"
                        style={{ 
                          width: `${(difficultyCount.medium / tasks.length) * 100}%`,
                          left: `${(difficultyCount.easy / tasks.length) * 100}%` 
                        }}
                      ></div>
                    )}
                    {difficultyCount.hard > 0 && (
                      <div 
                        className="absolute inset-y-0 bg-red-500 dark:bg-red-400"
                        style={{ 
                          width: `${(difficultyCount.hard / tasks.length) * 100}%`,
                          left: `${((difficultyCount.easy + difficultyCount.medium) / tasks.length) * 100}%` 
                        }}
                      ></div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>{difficultyCount.easy} easy</span>
                  <span>{difficultyCount.medium} medium</span>
                  <span>{difficultyCount.hard} hard</span>
                </div>
              </div>
            )}
            {topics.length > 0 && (
              <div className="mt-3">
                <div className="flex flex-wrap gap-1">
                  {topics.slice(0, 3).map(topic => (
                    <span 
                      key={topic}
                      className="px-2 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-full text-xs"
                    >
                      {topic}
                    </span>
                  ))}
                  {topics.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs">
                      +{topics.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-full transition-colors"
            >
              <Edit className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-500/30 overflow-hidden transition-colors cursor-pointer flex flex-col h-full"
      onClick={onView}
    >
      <div className="flex flex-col h-full">
        <div className="p-5 flex-1">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate flex-1">{sheet.title}</h3>
            <button
              onClick={onEdit}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-full transition-colors ml-2"
            >
              <Edit className="w-5 h-5" />
            </button>
          </div>
          
          {sheet.description && (
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{sheet.description}</p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(sheet.created_at)}</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span>{sheet.tasks?.length || 0} tasks</span>
            </div>
          </div>
          
          {tasks.length > 0 && (
            <>
              <div className="mb-4">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Difficulty</div>
                <div className="flex items-center">
                  <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    {difficultyCount.easy > 0 && (
                      <div 
                        className="absolute inset-y-0 left-0 bg-green-500 dark:bg-green-400"
                        style={{ width: `${(difficultyCount.easy / tasks.length) * 100}%` }}
                      ></div>
                    )}
                    {difficultyCount.medium > 0 && (
                      <div 
                        className="absolute inset-y-0 bg-yellow-500 dark:bg-yellow-400"
                        style={{ 
                          width: `${(difficultyCount.medium / tasks.length) * 100}%`,
                          left: `${(difficultyCount.easy / tasks.length) * 100}%` 
                        }}
                      ></div>
                    )}
                    {difficultyCount.hard > 0 && (
                      <div 
                        className="absolute inset-y-0 bg-red-500 dark:bg-red-400"
                        style={{ 
                          width: `${(difficultyCount.hard / tasks.length) * 100}%`,
                          left: `${((difficultyCount.easy + difficultyCount.medium) / tasks.length) * 100}%` 
                        }}
                      ></div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>{difficultyCount.easy} easy</span>
                  <span>{difficultyCount.medium} medium</span>
                  <span>{difficultyCount.hard} hard</span>
                </div>
              </div>
              
              {topics.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Topics</div>
                  <div className="flex flex-wrap gap-1">
                    {topics.slice(0, 3).map(topic => (
                      <span 
                        key={topic}
                        className="px-2 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-full text-xs"
                      >
                        {topic}
                      </span>
                    ))}
                    {topics.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs">
                        +{topics.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}; 
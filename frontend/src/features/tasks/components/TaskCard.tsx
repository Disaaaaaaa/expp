import React, { useRef, useEffect } from 'react';
import { Check, ChevronUp, ChevronDown, Edit2 } from 'lucide-react';
import type { Question } from '@/types/exam';
import { renderMarkdownWithMath } from '@/utils/mathFormatting';

interface TaskCardProps {
  task: Question;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onEdit: (task: Question) => void;
  isExpanded: boolean;
  onToggleDetails: (e: React.MouseEvent) => void;
  viewMode?: 'grid' | 'list';
}

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
  return colors[difficulty] || { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300' };
};

const getTopicColor = (topic: string) => {
  return { 
    bg: 'bg-blue-100 dark:bg-blue-900/30', 
    text: 'text-blue-700 dark:text-blue-300'
  };
};

const getTypeColor = (type: string) => {
  return { 
    bg: 'bg-purple-100 dark:bg-purple-900/30', 
    text: 'text-purple-700 dark:text-purple-300'
  };
};

export const TaskCard = React.memo(({ 
  task, 
  isSelected, 
  onSelect, 
  onEdit, 
  isExpanded, 
  onToggleDetails,
  viewMode = 'grid'
}: TaskCardProps) => {
  const solutionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const difficultyColors = getDifficultyColor(task.difficulty);
  const topicColors = getTopicColor(task.topic);
  const typeColors = getTypeColor(task.type);

  useEffect(() => {
    if (isExpanded && solutionRef.current && contentRef.current) {
      const scrollContainer = contentRef.current;
      const solutionElement = solutionRef.current;
      const topPosition = solutionElement.offsetTop - scrollContainer.offsetTop;
      
      scrollContainer.scrollTo({
        top: topPosition,
        behavior: 'smooth'
      });
    }
  }, [isExpanded]);

  return (
    <div 
      onClick={onSelect}
      className={`group cursor-pointer rounded-xl border transition-all duration-200 flex ${viewMode === 'list' ? 'flex-row' : 'flex-col'} h-full
                ${isSelected
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
    >
      <div className={`flex-1 flex ${viewMode === 'list' ? 'flex-row' : 'flex-col'} min-h-0`}>
        <div className={`${viewMode === 'list' ? 'w-64 flex-shrink-0 p-4 border-r border-gray-100 dark:border-gray-700' : 'flex items-start justify-between p-4 flex-shrink-0'}`}>
          <div className="flex-1 min-w-0">
            <div className={`flex gap-2 ${viewMode === 'list' ? 'flex-col' : 'mb-2 flex-wrap'}`}>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${viewMode === 'list' ? 'w-fit' : ''} ${difficultyColors.bg} ${difficultyColors.text}`}>
                {task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1)}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${viewMode === 'list' ? 'w-fit' : ''} ${topicColors.bg} ${topicColors.text}`}>
                {task.topic}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${viewMode === 'list' ? 'w-fit' : ''} ${typeColors.bg} ${typeColors.text}`}>
                {task.type}
              </span>
            </div>
          </div>
          {isSelected && (
            <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />
          )}
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div ref={contentRef} className={`flex-1 overflow-y-auto ${viewMode === 'list' ? 'p-4' : 'p-4'} scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent`}>
            <div className="h-full flex flex-col">
              <div className="flex-1 p-4 rounded-lg bg-gray-50/50 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800">
                <div className="font-medium text-gray-900 dark:text-gray-300 mb-2">Task:</div>
                <div className="prose dark:prose-invert prose-sm max-w-none text-gray-800 dark:text-gray-200 katex-text break-words">
                  {renderMarkdownWithMath(task.text)}
                </div>
              </div>
              
              {isExpanded && (
                <div className="mt-4 space-y-4">
                  <div ref={solutionRef} className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                    <div className="font-medium text-blue-900 dark:text-blue-300 mb-2">Solution:</div>
                    <div className="prose dark:prose-invert prose-sm max-w-none text-blue-800 dark:text-blue-200 katex-text break-words">
                      {renderMarkdownWithMath(task.solution || 'No solution provided')}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50/50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                    <div className="font-medium text-green-900 dark:text-green-300 mb-2">Answer:</div>
                    <div className="prose dark:prose-invert prose-sm max-w-none text-green-800 dark:text-green-200 katex-text break-words">
                      {renderMarkdownWithMath(task.answer || 'No answer provided')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={onToggleDetails}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white
                         flex items-center gap-1 transition-colors duration-150"
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                Details
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300
                         flex items-center gap-1 transition-colors duration-150"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}); 
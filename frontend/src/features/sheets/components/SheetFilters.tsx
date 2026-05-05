import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Check, Search } from 'lucide-react';
import { Question } from '@/types/exam';

interface FiltersProps {
  filters: {
    search: string;
    topics: Set<string>;
    difficulties: Set<string>;
    dateRange: [Date | null, Date | null];
    tags: Set<string>;
  };
  updateFilters: (newFilters: Partial<{
    search: string;
    topics: Set<string>;
    difficulties: Set<string>;
    dateRange: [Date | null, Date | null];
    tags: Set<string>;
  }>) => void;
  clearFilters: () => void;
  tasks: Question[];
}

export const SheetFilters: React.FC<FiltersProps> = ({
  filters,
  updateFilters,
  clearFilters,
  tasks
}) => {
  const [isTopicsOpen, setIsTopicsOpen] = useState(false);
  const [topicSearch, setTopicSearch] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState({
    width: 0,
    left: 0,
    top: 0
  });
  
  const topicsButtonRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    const updateDropdownPosition = () => {
      if (topicsButtonRef.current) {
        const rect = topicsButtonRef.current.getBoundingClientRect();
        setDropdownStyle({
          width: rect.width,
          left: rect.left,
          top: rect.bottom + 8
        });
      }
    };

    
    if (isTopicsOpen) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition);
      window.addEventListener('resize', updateDropdownPosition);
    }

    return () => {
      window.removeEventListener('scroll', updateDropdownPosition);
      window.removeEventListener('resize', updateDropdownPosition);
    };
  }, [isTopicsOpen]);

  
  const allTopics = useMemo(() => 
    [...new Set(tasks.map(task => task.topic))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b)),
    [tasks]
  );

  const filteredTopics = useMemo(() =>
    allTopics.filter(topic =>
      topic.toLowerCase().includes(topicSearch.toLowerCase())
    ),
    [allTopics, topicSearch]
  );

  const difficulties = ['easy', 'medium', 'hard'];
  
  const toggleTopic = (topic: string) => {
    const newTopics = new Set(filters.topics);
    if (newTopics.has(topic)) {
      newTopics.delete(topic);
    } else {
      newTopics.add(topic);
    }
    updateFilters({ topics: newTopics });
  };
  
  const toggleDifficulty = (difficulty: string) => {
    const newDifficulties = new Set(filters.difficulties);
    if (newDifficulties.has(difficulty)) {
      newDifficulties.delete(difficulty);
    } else {
      newDifficulties.add(difficulty);
    }
    updateFilters({ difficulties: newDifficulties });
  };

  return (
    <div className="space-y-4">
      
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Filter Options</h3>
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            Clear All
          </button>
        </div>

        
        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Difficulty</h4>
          <div className="flex flex-wrap gap-2">
            {difficulties.map(difficulty => (
              <button
                key={difficulty}
                onClick={() => toggleDifficulty(difficulty)}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors
                  ${filters.difficulties.has(difficulty)
                    ? difficulty === 'easy'
                      ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 ring-1 ring-green-400/30 dark:ring-green-400/40'
                      : difficulty === 'medium'
                        ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 ring-1 ring-yellow-400/30 dark:ring-yellow-400/40'
                        : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 ring-1 ring-red-400/30 dark:ring-red-400/40'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 ring-1 ring-gray-200 dark:ring-gray-700'
                  }`}
              >
                {difficulty}
                {filters.difficulties.has(difficulty) && (
                  <X className={`w-3.5 h-3.5 ml-1.5 ${
                    difficulty === 'easy'
                      ? 'text-green-600 dark:text-green-400'
                      : difficulty === 'medium'
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                  }`} />
                )}
              </button>
            ))}
          </div>
        </div>

        
        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Topics</h4>
          <div className="relative">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                ref={topicsButtonRef}
                type="text"
                value={topicSearch}
                onChange={(e) => setTopicSearch(e.target.value)}
                onFocus={() => setIsTopicsOpen(true)}
                placeholder="Search topics..."
                className="w-full pl-10 pr-3 py-2 text-sm text-left bg-white dark:bg-gray-800 border border-gray-200 
                        dark:border-gray-700 rounded-lg
                        focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              <button
                onClick={() => setIsTopicsOpen(!isTopicsOpen)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${isTopicsOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {isTopicsOpen && (
            <div 
              className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 
                        dark:border-gray-700 rounded-lg shadow-lg"
              style={{
                width: `${dropdownStyle.width}px`,
                left: dropdownStyle.left,
                top: dropdownStyle.top,
                maxHeight: 'calc(100vh - 16rem)',
                overflowY: 'auto'
              }}
            >
              <div className="p-2">
                <div className="max-h-[calc(100vh-20rem)] overflow-y-auto">
                  {filteredTopics.length > 0 ? (
                    filteredTopics.map(topic => (
                      <button
                        key={topic}
                        onClick={() => toggleTopic(topic)}
                        className={`flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors
                          ${filters.topics.has(topic)
                            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                      >
                        <div className={`flex-shrink-0 w-4 h-4 mr-2 rounded border transition-colors
                          ${filters.topics.has(topic)
                            ? 'bg-blue-500 dark:bg-blue-400 border-blue-500 dark:border-blue-400'
                            : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {filters.topics.has(topic) && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </div>
                        {topic}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      No topics found
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        
        {filters.topics.size > 0 && (
          <div className="mt-2 mb-4">
            <div className="flex flex-wrap gap-2">
              {[...filters.topics].map(topic => (
                <button
                  key={topic}
                  onClick={() => toggleTopic(topic)}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium
                           bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 
                           ring-1 ring-blue-400/30 dark:ring-blue-400/40"
                >
                  {topic}
                  <X className="w-3.5 h-3.5 ml-1.5 text-blue-600 dark:text-blue-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        
        <div>
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Date Created</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                const today = new Date();
                const lastWeek = new Date();
                lastWeek.setDate(today.getDate() - 7);
                
                if (filters.dateRange[0] && filters.dateRange[1] && 
                    filters.dateRange[1].getTime() - filters.dateRange[0].getTime() === 7 * 24 * 60 * 60 * 1000) {
                  updateFilters({ dateRange: [null, null] });
                } else {
                  updateFilters({ dateRange: [lastWeek, today] });
                }
              }}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${filters.dateRange[0] && filters.dateRange[1] && filters.dateRange[1].getTime() - filters.dateRange[0].getTime() === 7 * 24 * 60 * 60 * 1000
                  ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 ring-1 ring-purple-400/30 dark:ring-purple-400/40'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 ring-1 ring-gray-200 dark:ring-gray-700'
                }`}
            >
              Last 7 days
              {filters.dateRange[0] && filters.dateRange[1] && filters.dateRange[1].getTime() - filters.dateRange[0].getTime() === 7 * 24 * 60 * 60 * 1000 && (
                <X className="w-3.5 h-3.5 ml-1.5 text-purple-600 dark:text-purple-400" />
              )}
            </button>
            <button
              onClick={() => {
                const today = new Date();
                const lastMonth = new Date();
                lastMonth.setDate(today.getDate() - 30);
                
                if (filters.dateRange[0] && filters.dateRange[1] && 
                    filters.dateRange[1].getTime() - filters.dateRange[0].getTime() === 30 * 24 * 60 * 60 * 1000) {
                  updateFilters({ dateRange: [null, null] });
                } else {
                  updateFilters({ dateRange: [lastMonth, today] });
                }
              }}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${filters.dateRange[0] && filters.dateRange[1] && filters.dateRange[1].getTime() - filters.dateRange[0].getTime() === 30 * 24 * 60 * 60 * 1000
                  ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 ring-1 ring-purple-400/30 dark:ring-purple-400/40'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 ring-1 ring-gray-200 dark:ring-gray-700'
                }`}
            >
              Last 30 days
              {filters.dateRange[0] && filters.dateRange[1] && filters.dateRange[1].getTime() - filters.dateRange[0].getTime() === 30 * 24 * 60 * 60 * 1000 && (
                <X className="w-3.5 h-3.5 ml-1.5 text-purple-600 dark:text-purple-400" />
              )}
            </button>
            <button
              onClick={() => {
                const today = new Date();
                const lastYear = new Date();
                lastYear.setFullYear(today.getFullYear() - 1);
                
                if (filters.dateRange[0] && filters.dateRange[1] && 
                    filters.dateRange[1].getTime() - filters.dateRange[0].getTime() === 365 * 24 * 60 * 60 * 1000) {
                  updateFilters({ dateRange: [null, null] });
                } else {
                  updateFilters({ dateRange: [lastYear, today] });
                }
              }}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${filters.dateRange[0] && filters.dateRange[1] && filters.dateRange[1].getTime() - filters.dateRange[0].getTime() === 365 * 24 * 60 * 60 * 1000
                  ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 ring-1 ring-purple-400/30 dark:ring-purple-400/40'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 ring-1 ring-gray-200 dark:ring-gray-700'
                }`}
            >
              Last year
              {filters.dateRange[0] && filters.dateRange[1] && filters.dateRange[1].getTime() - filters.dateRange[0].getTime() === 365 * 24 * 60 * 60 * 1000 && (
                <X className="w-3.5 h-3.5 ml-1.5 text-purple-600 dark:text-purple-400" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 
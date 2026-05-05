import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Check, Search } from 'lucide-react';
import { Question } from '@/types/exam';

interface FiltersProps {
  filters: {
    topics: Set<string>;
    difficulties: Set<string>;
    types: Set<string>;
  };
  updateFilters: (newFilters: Partial<{
    topics: Set<string>;
    difficulties: Set<string>;
    types: Set<string>;
  }>) => void;
  clearFilters: () => void;
  tasks: Question[];
}

export const TaskFilters: React.FC<FiltersProps> = ({
  filters,
  updateFilters,
  clearFilters,
  tasks
}) => {
  const [isTopicsOpen, setIsTopicsOpen] = useState(false);
  const [isTypesOpen, setIsTypesOpen] = useState(false);
  const [topicSearch, setTopicSearch] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [topicsDropdownStyle, setTopicsDropdownStyle] = useState({
    width: 0,
    left: 0,
    top: 0
  });
  const [typesDropdownStyle, setTypesDropdownStyle] = useState({
    width: 0,
    left: 0,
    top: 0
  });
  
  const topicsButtonRef = useRef<HTMLInputElement>(null);
  const typesButtonRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    const updateTopicsPosition = () => {
      if (topicsButtonRef.current) {
        const rect = topicsButtonRef.current.getBoundingClientRect();
        setTopicsDropdownStyle({
          width: rect.width,
          left: rect.left,
          top: rect.bottom + 8
        });
      }
    };

    if (isTopicsOpen) {
      updateTopicsPosition();
      window.addEventListener('scroll', updateTopicsPosition);
      window.addEventListener('resize', updateTopicsPosition);
    }

    return () => {
      window.removeEventListener('scroll', updateTopicsPosition);
      window.removeEventListener('resize', updateTopicsPosition);
    };
  }, [isTopicsOpen]);

  useEffect(() => {
    const updateTypesPosition = () => {
      if (typesButtonRef.current) {
        const rect = typesButtonRef.current.getBoundingClientRect();
        setTypesDropdownStyle({
          width: rect.width,
          left: rect.left,
          top: rect.bottom + 8
        });
      }
    };

    if (isTypesOpen) {
      updateTypesPosition();
      window.addEventListener('scroll', updateTypesPosition);
      window.addEventListener('resize', updateTypesPosition);
    }

    return () => {
      window.removeEventListener('scroll', updateTypesPosition);
      window.removeEventListener('resize', updateTypesPosition);
    };
  }, [isTypesOpen]);

  
  const allTopics = useMemo(() => 
    [...new Set(tasks.map(task => task.topic))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b)),
    [tasks]
  );

  const allTypes = useMemo(() => 
    [...new Set(tasks.map(task => task.type))]
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

  const filteredTypes = useMemo(() =>
    allTypes.filter(type =>
      type.toLowerCase().includes(typeSearch.toLowerCase())
    ),
    [allTypes, typeSearch]
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
  
  const toggleType = (type: string) => {
    const newTypes = new Set(filters.types);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    updateFilters({ types: newTypes });
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
                width: `${topicsDropdownStyle.width}px`,
                left: topicsDropdownStyle.left,
                top: topicsDropdownStyle.top,
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

         
          {filters.topics.size > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {Array.from(filters.topics).map(topic => (
                <span
                  key={topic}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs
                            bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400"
                >
                  {topic}
                  <button
                    onClick={() => toggleTopic(topic)}
                    className="hover:bg-blue-200 dark:hover:bg-blue-400/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        
        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Question Types</h4>
          <div className="relative">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                ref={typesButtonRef}
                type="text"
                value={typeSearch}
                onChange={(e) => setTypeSearch(e.target.value)}
                onFocus={() => setIsTypesOpen(true)}
                placeholder="Search question types..."
                className="w-full pl-10 pr-3 py-2 text-sm text-left bg-white dark:bg-gray-800 border border-gray-200 
                        dark:border-gray-700 rounded-lg
                        focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              <button
                onClick={() => setIsTypesOpen(!isTypesOpen)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${isTypesOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {isTypesOpen && (
            <div 
              className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 
                        dark:border-gray-700 rounded-lg shadow-lg"
              style={{
                width: `${typesDropdownStyle.width}px`,
                left: typesDropdownStyle.left,
                top: typesDropdownStyle.top,
                maxHeight: 'calc(100vh - 16rem)',
                overflowY: 'auto'
              }}
            >
              <div className="p-2">
                <div className="max-h-[calc(100vh-20rem)] overflow-y-auto">
                  {filteredTypes.length > 0 ? (
                    filteredTypes.map(type => (
                      <button
                        key={type}
                        onClick={() => toggleType(type)}
                        className={`flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors
                          ${filters.types.has(type)
                            ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                      >
                        <div className={`flex-shrink-0 w-4 h-4 mr-2 rounded border transition-colors
                          ${filters.types.has(type)
                            ? 'bg-purple-500 dark:bg-purple-400 border-purple-500 dark:border-purple-400'
                            : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {filters.types.has(type) && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </div>
                        {type}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      No types found
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          
          {filters.types.size > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {Array.from(filters.types).map(type => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs
                            bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400"
                >
                  {type}
                  <button
                    onClick={() => toggleType(type)}
                    className="hover:bg-purple-200 dark:hover:bg-purple-400/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 
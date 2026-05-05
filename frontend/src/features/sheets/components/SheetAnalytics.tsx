import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Question } from '@/types/exam';

interface SheetAnalyticsProps {
  tasks: Question[];
  onClose: () => void;
}

export const SheetAnalytics: React.FC<SheetAnalyticsProps> = ({ tasks, onClose }) => {
  
  const difficultyDistribution = {
    easy: tasks.filter(t => t.difficulty === 'easy').length,
    medium: tasks.filter(t => t.difficulty === 'medium').length,
    hard: tasks.filter(t => t.difficulty === 'hard').length
  };
  
  const topicDistribution = tasks.reduce((acc, task) => {
    acc[task.topic] = (acc[task.topic] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const typeDistribution = tasks.reduce((acc, task) => {
    acc[task.type] = (acc[task.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl"
      >
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Sheet Analytics</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Difficulty Distribution</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-24">Easy</div>
                  <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${(difficultyDistribution.easy / tasks.length) * 100}%` }}
                    ></div>
                  </div>
                  <div className="ml-2 w-8 text-right">{difficultyDistribution.easy}</div>
                </div>
                <div className="flex items-center">
                  <div className="w-24">Medium</div>
                  <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-500 rounded-full"
                      style={{ width: `${(difficultyDistribution.medium / tasks.length) * 100}%` }}
                    ></div>
                  </div>
                  <div className="ml-2 w-8 text-right">{difficultyDistribution.medium}</div>
                </div>
                <div className="flex items-center">
                  <div className="w-24">Hard</div>
                  <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${(difficultyDistribution.hard / tasks.length) * 100}%` }}
                    ></div>
                  </div>
                  <div className="ml-2 w-8 text-right">{difficultyDistribution.hard}</div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">Topic Distribution</h3>
              <div className="space-y-2">
                {Object.entries(topicDistribution).map(([topic, count]) => (
                  <div key={topic} className="flex items-center">
                    <div className="w-24 truncate">{topic}</div>
                    <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(count / tasks.length) * 100}%` }}
                      ></div>
                    </div>
                    <div className="ml-2 w-8 text-right">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Question Type Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(typeDistribution).map(([type, count]) => (
                <div key={type} className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">{type}</div>
                  <div className="text-2xl font-semibold">{count}</div>
                  <div className="text-xs text-gray-500">
                    {Math.round((count / tasks.length) * 100)}% of total
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t">
          <div className="text-sm text-gray-600">
            Total tasks: {tasks.length}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}; 
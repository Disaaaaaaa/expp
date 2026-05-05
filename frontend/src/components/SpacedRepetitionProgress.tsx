import React from 'react';
import { motion } from 'framer-motion';
import { Target, Brain, Calendar, CheckCircle2 } from 'lucide-react';
import type { SpacedRepetitionMetrics } from '../types/analytics';
import { getDueReviews } from '../services/spacedRepetition';

interface SpacedRepetitionProgressProps {
  metrics: SpacedRepetitionMetrics;
  onStartReview: (items: SpacedRepetitionMetrics['items']) => void;
}

export const SpacedRepetitionProgress: React.FC<SpacedRepetitionProgressProps> = ({
  metrics
}) => {
  const dueItems = getDueReviews(metrics.items);

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-2">
            <Target className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Due Reviews</h3>
          </div>
          <div className="text-3xl font-bold text-blue-400">
            {metrics.review_items}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Ready for review
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-2">
            <Brain className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Learning</h3>
          </div>
          <div className="text-3xl font-bold text-green-400">
            {metrics.learning_items}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            New or challenging items
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-2">
            <CheckCircle2 className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Mastered</h3>
          </div>
          <div className="text-3xl font-bold text-purple-400">
            {metrics.mastered_items}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Well-learned items
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-2">
            <Calendar className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-semibold text-white">Daily Target</h3>
          </div>
          <div className="text-3xl font-bold text-orange-400">
            {metrics.daily_review_target}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Recommended reviews
          </div>
        </motion.div>
      </div>

     
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700"
      >
        <h3 className="text-lg font-semibold mb-4 text-white">Due Reviews</h3>
        {dueItems.length === 0 ? (
          <div className="text-gray-400">No items due for review</div>
        ) : (
          <div className="space-y-4">
            {dueItems.map((item) => (
              <div key={item.question_id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                <div>
                  <div className="font-medium text-white">{item.topic}</div>
                  <div className="text-sm text-gray-400">
                    {item.difficulty} • Last reviewed {Math.round((Date.now() - item.last_reviewed.getTime()) / (24 * 60 * 60 * 1000))} days ago
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm">
                    <span className="text-green-400">{item.correct_count}</span>
                    <span className="text-gray-500">/</span>
                    <span className="text-red-400">{item.incorrect_count}</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    Streak: {item.streak}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

   
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700"
      >
        <h3 className="text-lg font-semibold mb-4 text-white">Learning Progress</h3>
        <div className="space-y-4">
          <div className="flex items-center">
            <div className="w-24 text-white">Learning</div>
            <div className="flex-1 h-6 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-400 rounded-full"
                style={{ width: `${(metrics.learning_items / metrics.total_items) * 100}%` }}
              ></div>
            </div>
            <div className="ml-2 w-8 text-right text-white">{metrics.learning_items}</div>
          </div>
          <div className="flex items-center">
            <div className="w-24 text-white">Reviewing</div>
            <div className="flex-1 h-6 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-yellow-400 rounded-full"
                style={{ width: `${((metrics.total_items - metrics.learning_items - metrics.mastered_items) / metrics.total_items) * 100}%` }}
              ></div>
            </div>
            <div className="ml-2 w-8 text-right text-white">
              {metrics.total_items - metrics.learning_items - metrics.mastered_items}
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-24 text-white">Mastered</div>
            <div className="flex-1 h-6 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-400 rounded-full"
                style={{ width: `${(metrics.mastered_items / metrics.total_items) * 100}%` }}
              ></div>
            </div>
            <div className="ml-2 w-8 text-right text-white">{metrics.mastered_items}</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}; 
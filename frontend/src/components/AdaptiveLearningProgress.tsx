import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, Target, Brain } from 'lucide-react';
import type { AdaptiveMetrics } from '../types/analytics';
import { calculateTopicMastery, determineOptimalDifficulty } from '../services/adaptiveLearning';

interface AdaptiveLearningProgressProps {
  metrics: AdaptiveMetrics;
}

export const AdaptiveLearningProgress: React.FC<AdaptiveLearningProgressProps> = ({ metrics }) => {
  const topicMastery = calculateTopicMastery(metrics);
  const optimalDifficulty = determineOptimalDifficulty(metrics);

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Overall Progress</h3>
          </div>
          <div className="text-3xl font-bold text-blue-400">
            {metrics.overall_score}%
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Based on {metrics.question_history.length} questions
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-2">
            <Target className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Optimal Difficulty</h3>
          </div>
          <div className="text-3xl font-bold text-green-400 capitalize">
            {optimalDifficulty}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Based on recent performance
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-2">
            <Clock className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Avg. Time/Question</h3>
          </div>
          <div className="text-3xl font-bold text-purple-400">
            {Math.round(metrics.learning_style.optimal_time_per_question)}s
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Optimal pace
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-2">
            <Brain className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-semibold text-white">Topics Mastered</h3>
          </div>
          <div className="text-3xl font-bold text-orange-400">
            {Object.values(topicMastery).filter(m => m >= 70).length}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Out of {Object.keys(topicMastery).length} topics
          </div>
        </motion.div>
      </div>

      {/* Topic Mastery Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700"
      >
        <h3 className="text-lg font-semibold mb-4 text-white">Topic Mastery</h3>
        <div className="space-y-4">
          {Object.entries(topicMastery)
            .sort(([, a], [, b]) => b - a)
            .map(([topic, mastery]) => (
              <div key={topic} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-white">{topic}</span>
                  <span className="text-gray-400">{Math.round(mastery)}%</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${mastery}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      mastery >= 70 ? 'bg-green-400' :
                      mastery >= 40 ? 'bg-yellow-400' :
                      'bg-red-400'
                    }`}
                  />
                </div>
              </div>
            ))}
        </div>
      </motion.div>

      {/* Recent Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700"
      >
        <h3 className="text-lg font-semibold mb-4 text-white">Recent Performance</h3>
        <div className="space-y-3">
          {metrics.question_history.slice(-5).reverse().map((question, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className={`w-2 h-2 rounded-full ${
                question.is_correct ? 'bg-green-400' : 'bg-red-400'
              }`} />
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{question.topic}</div>
                <div className="text-xs text-gray-400">
                  {question.difficulty} • {question.time_taken}s
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}; 
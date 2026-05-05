import React, { useState, useEffect } from 'react';
import { PageLayout } from '@/layouts/PageLayout';
import { motion } from 'framer-motion';
import { Award, CheckCircle, TrendingUp, BookOpen, Loader2, Clock, Target, BarChart3, Calendar } from 'lucide-react';
import { getUserStatistics, getProgressData, getRecentTaskSubmissions, getRecentSheetSubmissions, type UserStatistics, type ProgressData } from '@/services/userStatistics';
import { supabase } from '@/services/supabase';
import { AdaptiveLearningProgress } from '@/components/AdaptiveLearningProgress';
import { SpacedRepetitionProgress } from '@/components/SpacedRepetitionProgress';
import type { AdaptiveMetrics, SpacedRepetitionMetrics } from '@/types/analytics';

export const Statistics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStatistics | null>(null);
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [recentSheets, setRecentSheets] = useState<any[]>([]);
  const [adaptiveMetrics, setAdaptiveMetrics] = useState<AdaptiveMetrics | null>(null);
  const [spacedRepetitionMetrics, setSpacedRepetitionMetrics] = useState<SpacedRepetitionMetrics | null>(null);
  
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        
        // Fetch user statistics
        const userStats = await getUserStatistics();
        setStats(userStats);

        // Fetch progress data (last 30 days)
        const progress = await getProgressData(30);
        setProgressData(progress);

        // Fetch recent submissions
        const tasks = await getRecentTaskSubmissions(5);
        setRecentTasks(tasks);

        const sheets = await getRecentSheetSubmissions(5);
        setRecentSheets(sheets);

        // Try to fetch adaptive metrics (if table exists)
        try {
          const { data: adaptiveData } = await supabase
            .from('adaptive_metrics')
            .select('*')
            .single();

          if (adaptiveData) {
            setAdaptiveMetrics(adaptiveData);
          }
        } catch (e) {
          // Table might not exist, ignore
        }

        // Try to fetch spaced repetition metrics (if table exists)
        try {
          const { data: spacedData } = await supabase
            .from('spaced_repetition')
            .select('*')
            .single();

          if (spacedData) {
            setSpacedRepetitionMetrics(spacedData);
          }
        } catch (e) {
          // Table might not exist, ignore
        }
      } catch (error) {
        console.error('Error fetching statistics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStatistics();
  }, []);

  const handleStartReview = async (items: SpacedRepetitionMetrics['items']) => {
    console.log('Starting review session with items:', items);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };
  
  if (loading) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
      </PageLayout>
    );
  }

  if (!stats) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No statistics available yet. Complete some tasks to see your progress!</p>
        </div>
      </PageLayout>
    );
  }

  const tasksByDifficulty = stats.tasks_by_difficulty || { easy: 0, medium: 0, hard: 0 };
  const totalSolved = tasksByDifficulty.easy + tasksByDifficulty.medium + tasksByDifficulty.hard;

  return (
    <PageLayout maxWidth="2xl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Adaptive Learning and Spaced Repetition */}
        {adaptiveMetrics && (
          <AdaptiveLearningProgress metrics={adaptiveMetrics} />
        )}

        {spacedRepetitionMetrics && (
          <SpacedRepetitionProgress 
            metrics={spacedRepetitionMetrics}
            onStartReview={handleStartReview}
          />
        )}

        {/* Main Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center space-x-3 mb-2">
              <Award className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Success Rate</h3>
            </div>
            <div className="text-3xl font-bold text-blue-400">
              {stats.success_rate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {stats.solved_tasks} / {stats.total_task_attempts} tasks
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center space-x-3 mb-2">
              <Target className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Average Score</h3>
            </div>
            <div className="text-3xl font-bold text-green-400">
              {stats.average_score.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Overall performance
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center space-x-3 mb-2">
              <BookOpen className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sheets Completed</h3>
            </div>
            <div className="text-3xl font-bold text-purple-400">
              {stats.solved_sheets}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {stats.total_sheet_attempts} total attempts
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center space-x-3 mb-2">
              <Clock className="w-5 h-5 text-orange-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Time Spent</h3>
            </div>
            <div className="text-3xl font-bold text-orange-400">
              {formatTime(stats.total_time_spent)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Total practice time
            </div>
          </motion.div>
        </div>

        {/* Tasks by Difficulty */}
        {totalSolved > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Tasks by Difficulty</h3>
            <div className="space-y-4">
              {(['easy', 'medium', 'hard'] as const).map((difficulty) => {
                const count = tasksByDifficulty[difficulty] || 0;
                const percentage = totalSolved > 0 ? (count / totalSolved) * 100 : 0;
                const colors = {
                  easy: 'bg-green-400',
                  medium: 'bg-yellow-400',
                  hard: 'bg-red-400'
                };
                
                return (
                  <div key={difficulty} className="flex items-center">
                    <div className="w-24 text-gray-900 dark:text-white capitalize">{difficulty}</div>
                    <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${colors[difficulty]} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="ml-2 w-8 text-right text-gray-900 dark:text-white">{count}</div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Progress Chart */}
        {progressData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center space-x-2 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Progress (Last 30 Days)</h3>
            </div>
            <div className="space-y-2">
              {progressData.slice(-7).map((day, index) => {
                const maxTasks = Math.max(...progressData.map(d => d.tasks_completed + d.sheets_completed), 1);
                const total = day.tasks_completed + day.sheets_completed;
                const width = (total / maxTasks) * 100;
                
                return (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-20 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(day.date)}
                    </div>
                    <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-400 rounded-full transition-all duration-500"
                        style={{ width: `${width}%` }}
                      ></div>
                    </div>
                    <div className="w-24 text-sm text-right text-gray-600 dark:text-gray-400">
                      {day.tasks_completed} tasks, {day.sheets_completed} sheets
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Recent Activity */}
        {(recentTasks.length > 0 || recentSheets.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
            </div>
            <div className="space-y-3">
              {recentSheets.slice(0, 3).map((sheet: any) => (
                <div key={sheet.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <BookOpen className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">Sheet Completed</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {sheet.correct_tasks}/{sheet.total_tasks} correct • {formatTime(sheet.total_time_spent)}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-green-400">
                    {sheet.accuracy.toFixed(0)}%
                  </div>
                </div>
              ))}
              {recentTasks.slice(0, 3).map((task: any) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className={`w-4 h-4 ${task.is_correct ? 'text-green-400' : 'text-red-400'}`} />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">Task: {task.topic}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {task.difficulty} • {formatTime(task.time_spent)}
                      </div>
                    </div>
                  </div>
                  <div className={`text-sm font-semibold ${task.is_correct ? 'text-green-400' : 'text-red-400'}`}>
                    {task.is_correct ? '✓' : '✗'}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </PageLayout>
  );
}; 
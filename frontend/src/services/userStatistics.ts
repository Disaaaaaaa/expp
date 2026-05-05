import { supabase } from '@/services/supabase';

export interface TaskSubmission {
  taskId: string;
  sheetId?: string;
  isCorrect: boolean;
  score: number;
  timeSpent: number;
  userAnswer?: string;
  userSolution?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  questionType: string;
}

export interface SheetSubmission {
  sheetId: string;
  totalTasks: number;
  correctTasks: number;
  accuracy: number;
  totalTimeSpent: number;
  averageTimePerTask: number;
}

export interface UserStatistics {
  user_id: string;
  solved_tasks: number;
  total_task_attempts: number;
  solved_sheets: number;
  total_sheet_attempts: number;
  success_rate: number;
  average_score: number;
  total_time_spent: number;
  tasks_by_difficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
  tasks_by_topic: Record<string, { correct: number; total: number }>;
  tasks_by_type: Record<string, { correct: number; total: number }>;
  recent_activity: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface ProgressData {
  date: string;
  tasks_completed: number;
  sheets_completed: number;
  time_spent: number;
  accuracy: number;
}

/**
 * Save individual task submission to database
 */
export async function saveTaskSubmission(submission: TaskSubmission): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('task_submissions')
      .insert({
        user_id: user.id,
        task_id: submission.taskId,
        sheet_id: submission.sheetId || null,
        is_correct: submission.isCorrect,
        score: submission.score,
        time_spent: submission.timeSpent,
        user_answer: submission.userAnswer || null,
        user_solution: submission.userSolution || null,
        difficulty: submission.difficulty,
        topic: submission.topic,
        question_type: submission.questionType
      });

    if (error) throw error;

    // Update daily progress
    await updateDailyProgress(submission.timeSpent, 1, 0, submission.isCorrect ? 100 : 0);
  } catch (error) {
    console.error('Error saving task submission:', error);
    throw error;
  }
}

/**
 * Save sheet submission to database
 */
export async function saveSheetSubmission(submission: SheetSubmission): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('sheet_submissions')
      .insert({
        user_id: user.id,
        sheet_id: submission.sheetId,
        total_tasks: submission.totalTasks,
        correct_tasks: submission.correctTasks,
        accuracy: submission.accuracy,
        total_time_spent: submission.totalTimeSpent,
        average_time_per_task: submission.averageTimePerTask
      });

    if (error) throw error;

    // Update daily progress
    await updateDailyProgress(submission.totalTimeSpent, 0, 1, submission.accuracy);
  } catch (error) {
    console.error('Error saving sheet submission:', error);
    throw error;
  }
}

/**
 * Update daily progress tracking
 */
async function updateDailyProgress(
  timeSpent: number,
  tasksCompleted: number,
  sheetsCompleted: number,
  accuracy: number
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    const { data: existingProgress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    if (existingProgress) {
      // Update existing progress
      const newTasksCompleted = existingProgress.tasks_completed + tasksCompleted;
      const newSheetsCompleted = existingProgress.sheets_completed + sheetsCompleted;
      const newTimeSpent = existingProgress.time_spent + timeSpent;
      
      // Calculate weighted average accuracy
      const totalAttempts = newTasksCompleted + newSheetsCompleted;
      const newAccuracy = totalAttempts > 0
        ? ((existingProgress.accuracy * (existingProgress.tasks_completed + existingProgress.sheets_completed)) + (accuracy * (tasksCompleted + sheetsCompleted))) / totalAttempts
        : accuracy;

      await supabase
        .from('user_progress')
        .update({
          tasks_completed: newTasksCompleted,
          sheets_completed: newSheetsCompleted,
          time_spent: newTimeSpent,
          accuracy: newAccuracy
        })
        .eq('user_id', user.id)
        .eq('date', today);
    } else {
      // Create new progress entry
      await supabase
        .from('user_progress')
        .insert({
          user_id: user.id,
          date: today,
          tasks_completed: tasksCompleted,
          sheets_completed: sheetsCompleted,
          time_spent: timeSpent,
          accuracy: accuracy
        });
    }
  } catch (error) {
    console.error('Error updating daily progress:', error);
    // Don't throw - progress tracking is not critical
  }
}

/**
 * Get user statistics
 */
export async function getUserStatistics(): Promise<UserStatistics | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_statistics')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

    if (!data) {
      // Initialize statistics if they don't exist
      const { data: newStats, error: insertError } = await supabase
        .from('user_statistics')
        .insert({
          user_id: user.id,
          solved_tasks: 0,
          total_task_attempts: 0,
          solved_sheets: 0,
          total_sheet_attempts: 0,
          success_rate: 0,
          average_score: 0,
          total_time_spent: 0,
          tasks_by_difficulty: { easy: 0, medium: 0, hard: 0 },
          tasks_by_topic: {},
          tasks_by_type: {},
          recent_activity: 0
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return newStats as UserStatistics;
    }

    return data as UserStatistics;
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    throw error;
  }
}

/**
 * Get progress data for a date range
 */
export async function getProgressData(days: number = 30): Promise<ProgressData[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;

    return (data || []).map(item => ({
      date: item.date,
      tasks_completed: item.tasks_completed,
      sheets_completed: item.sheets_completed,
      time_spent: item.time_spent,
      accuracy: item.accuracy
    }));
  } catch (error) {
    console.error('Error fetching progress data:', error);
    throw error;
  }
}

/**
 * Get recent task submissions
 */
export async function getRecentTaskSubmissions(limit: number = 10) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('task_submissions')
      .select('*')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching recent task submissions:', error);
    throw error;
  }
}

/**
 * Get recent sheet submissions
 */
export async function getRecentSheetSubmissions(limit: number = 10) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('sheet_submissions')
      .select('*')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching recent sheet submissions:', error);
    throw error;
  }
}

/**
 * Get statistics by topic
 */
export async function getStatisticsByTopic() {
  try {
    const stats = await getUserStatistics();
    if (!stats) return {};

    return stats.tasks_by_topic || {};
  } catch (error) {
    console.error('Error fetching statistics by topic:', error);
    throw error;
  }
}

/**
 * Get statistics by type
 */
export async function getStatisticsByType() {
  try {
    const stats = await getUserStatistics();
    if (!stats) return {};

    return stats.tasks_by_type || {};
  } catch (error) {
    console.error('Error fetching statistics by type:', error);
    throw error;
  }
} 
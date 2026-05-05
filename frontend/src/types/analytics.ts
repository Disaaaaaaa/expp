export interface PerformanceMetrics {
  overall_score: number;
  topic_scores: Record<string, number>;
  time_per_question: number;
  improvement_rate: number;
  weak_areas: string[];
  strong_areas: string[];
}

export interface AdaptiveMetrics extends PerformanceMetrics {
  question_history: {
    question_id: string;
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard';
    is_correct: boolean;
    time_taken: number;
    timestamp: Date;
  }[];
  topic_mastery: Record<string, {
    current_level: number; 
    questions_attempted: number;
    solutions: number;
    average_time: number;
    last_practiced: Date;
  }>;
  learning_style: {
    preferred_difficulty: 'easy' | 'medium' | 'hard';
    optimal_time_per_question: number;
    topic_engagement: Record<string, number>; 
  };
}

export interface SpacedRepetitionItem {
  question_id: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  last_reviewed: Date;
  next_review: Date;
  review_count: number;
  ease_factor: number;
  interval: number; 
  correct_count: number;
  incorrect_count: number;
  streak: number;
}

export interface SpacedRepetitionMetrics {
  items: SpacedRepetitionItem[];
  daily_review_target: number;
  next_review_date: Date;
  total_items: number;
  mastered_items: number;
  learning_items: number;
  review_items: number;
}

export interface StudyGroupMember {
  user_id: string;
  username: string;
  role: 'admin' | 'member';
  joined_at: Date;
  last_active: Date;
  contribution_score: number;
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  subject: string;
  topics: string[];
  created_at: Date;
  members: StudyGroupMember[];
  settings: {
    max_members: number;
    privacy: 'public' | 'private';
    allow_invites: boolean;
    require_approval: boolean;
  };
  stats: {
    total_questions: number;
    average_score: number;
    active_members: number;
    weekly_activity: number;
  };
}

export interface GroupActivity {
  id: string;
  group_id: string;
  type: 'question_created' | 'question_solved' | 'member_joined' | 'discussion_started';
  user_id: string;
  username: string;
  timestamp: Date;
  details: {
    question_id?: string;
    topic?: string;
    score?: number;
    discussion_id?: string;
  };
} 
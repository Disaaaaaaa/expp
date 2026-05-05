export type DifficultyDistribution = {
  easy: number;
  medium: number;
  hard: number;
};

export type TaskConfig = {
  types: string[];
  difficulty: DifficultyDistribution;
  topics: string[];
  count: number;
  subject: string;
  language?: string;
};

export interface Question {
  id: string;
  text: string;
  type: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  answers?: string[] | null;
  solution?: string | null;
  answer?: string | null;
}

export interface TaskPlanItem {
  taskNumber: number;
  type: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  focusArea: string;
  learningObjective: string;
  keyConcepts: string[];
  estimatedComplexity: string;
}

export interface TaskGenerationPlan {
  tasks: TaskPlanItem[];
  overallStrategy: string;
  topicCoverage: Record<string, number>;
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
}
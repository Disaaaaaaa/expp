import { create } from 'zustand';
import { TaskConfig, Question } from '@/types/exam';

interface TaskStore {
  questions: Question[];
  taskConfig: TaskConfig | null;
  isLoading: boolean;
  error: string | null;
  
  setTaskConfig: (config: TaskConfig) => void;
  setQuestions: (questions: Question[]) => void;
  updateQuestion: (index: number, question: Question) => void;
  reorderQuestions: (startIndex: number, endIndex: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  questions: [],
  taskConfig: null,
  isLoading: false,
  error: null
};

export const useTaskStore = create<TaskStore>((set) => ({
  ...initialState,

  setTaskConfig: (config) => set({ taskConfig: config }),
  setQuestions: (questions) => set({ questions }),
  updateQuestion: (index, question) => set((state) => ({
    questions: state.questions.map((q, i) => i === index ? question : q)
  })),
  reorderQuestions: (startIndex, endIndex) => set((state) => {
    const newQuestions = [...state.questions];
    const [removed] = newQuestions.splice(startIndex, 1);
    newQuestions.splice(endIndex, 0, removed);
    return { questions: newQuestions };
  }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  reset: () => set(initialState)
}));

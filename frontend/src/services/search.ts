import { supabase } from '@/services/supabase';
import type { Question } from '@/types/exam';

interface SearchParams {
  query?: string;
  type?: string[];
  difficulty?: string[];
  topics?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
}

export async function searchQuestions(params: SearchParams) {
  let query = supabase
    .from('tasks')
    .select('*');

  if (params.query) {
    query = query.textSearch('text', params.query);
  }

  if (params.type?.length) {
    query = query.in('type', params.type);
  }

  if (params.difficulty?.length) {
    query = query.in('difficulty', params.difficulty);
  }

  if (params.topics?.length) {
    query = query.in('topic', params.topics);
  }

  if (params.dateRange) {
    query = query
      .gte('created_at', params.dateRange.start.toISOString())
      .lte('created_at', params.dateRange.end.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Question[];
} 
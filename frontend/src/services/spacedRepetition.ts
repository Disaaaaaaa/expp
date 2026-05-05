import type { SpacedRepetitionItem, SpacedRepetitionMetrics } from '@/types/analytics';

const INITIAL_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const MAX_EASE_FACTOR = 3.0;

export function calculateNextInterval(
  item: SpacedRepetitionItem,
  isCorrect: boolean
): { interval: number; easeFactor: number } {
  let newEaseFactor = item.ease_factor;
  let newInterval: number;

  if (isCorrect) {
    
    newEaseFactor = Math.max(
      MIN_EASE_FACTOR,
      item.ease_factor + (0.1 - (5 - item.streak) * 0.08)
    );
    
    if (item.streak === 0) {
      newInterval = 1; 
    } else if (item.streak === 1) {
      newInterval = 3; 
    } else {
      newInterval = Math.round(item.interval * newEaseFactor);
    }
  } else {
    
    newEaseFactor = Math.max(
      MIN_EASE_FACTOR,
      item.ease_factor - 0.2
    );
    newInterval = 1; 
  }

  return {
    interval: newInterval,
    easeFactor: Math.min(MAX_EASE_FACTOR, newEaseFactor)
  };
}

export function updateSpacedRepetitionItem(
  item: SpacedRepetitionItem,
  isCorrect: boolean
): SpacedRepetitionItem {
  const { interval, easeFactor } = calculateNextInterval(item, isCorrect);
  const now = new Date();
  
  return {
    ...item,
    last_reviewed: now,
    next_review: new Date(now.getTime() + interval * 24 * 60 * 60 * 1000),
    review_count: item.review_count + 1,
    ease_factor: easeFactor,
    interval: interval,
    correct_count: isCorrect ? item.correct_count + 1 : item.correct_count,
    incorrect_count: isCorrect ? item.incorrect_count : item.incorrect_count + 1,
    streak: isCorrect ? item.streak + 1 : 0
  };
}

export function getDueReviews(items: SpacedRepetitionItem[]): SpacedRepetitionItem[] {
  const now = new Date();
  return items
    .filter(item => new Date(item.next_review) <= now)
    .sort((a, b) => new Date(a.next_review).getTime() - new Date(b.next_review).getTime());
}

export function calculateSpacedRepetitionMetrics(items: SpacedRepetitionItem[]): SpacedRepetitionMetrics {
  const now = new Date();
  const dueItems = getDueReviews(items);
  
  return {
    items,
    daily_review_target: Math.max(10, Math.ceil(items.length * 0.1)), 
    next_review_date: dueItems[0]?.next_review || now,
    total_items: items.length,
    mastered_items: items.filter(item => item.streak >= 5).length,
    learning_items: items.filter(item => item.streak < 3).length,
    review_items: dueItems.length
  };
}

export function createSpacedRepetitionItem(
  question_id: string,
  topic: string,
  difficulty: 'easy' | 'medium' | 'hard'
): SpacedRepetitionItem {
  const now = new Date();
  return {
    question_id,
    topic,
    difficulty,
    last_reviewed: now,
    next_review: now, 
    review_count: 0,
    ease_factor: INITIAL_EASE_FACTOR,
    interval: 1,
    correct_count: 0,
    incorrect_count: 0,
    streak: 0
  };
} 
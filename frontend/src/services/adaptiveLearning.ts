import { openai } from '@/services/openai';
import type { AdaptiveMetrics } from '@/types/analytics';

export function calculateTopicMastery(metrics: AdaptiveMetrics): Record<string, number> {
  const mastery: Record<string, number> = {};
  
  
  Object.entries(metrics.topic_mastery).forEach(([topic, stats]) => {
    const successRate = stats.solutions / stats.questions_attempted;
    const timeEfficiency = Math.min(1, metrics.learning_style.optimal_time_per_question / stats.average_time);
    const recency = Math.min(1, (Date.now() - stats.last_practiced.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    
    mastery[topic] = (
      successRate * 0.5 +
      timeEfficiency * 0.3 +
      (1 - recency) * 0.2
    ) * 100;
  });
  
  return mastery;
}

export function determineOptimalDifficulty(metrics: AdaptiveMetrics): 'easy' | 'medium' | 'hard' {
  const recentQuestions = metrics.question_history
    .filter(q => Date.now() - q.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000)
    .slice(-10);
  
  if (recentQuestions.length < 5) {
    return metrics.learning_style.preferred_difficulty;
  }
  
  const successRate = recentQuestions.filter(q => q.is_correct).length / recentQuestions.length;
  const avgTime = recentQuestions.reduce((sum, q) => sum + q.time_taken, 0) / recentQuestions.length;
  
  if (successRate < 0.4) return 'easy';
  if (successRate > 0.8 && avgTime < metrics.learning_style.optimal_time_per_question * 0.8) return 'hard';
  return 'medium';
}

export async function generateAdaptiveLearningPath(metrics: AdaptiveMetrics) {
  const topicMastery = calculateTopicMastery(metrics);
  const optimalDifficulty = determineOptimalDifficulty(metrics);
  
  const prompt = `Based on the following adaptive learning metrics, generate a personalized learning path following Cambridge International Examination A/AS-level and AQA Computer Science standards:

Adaptive Learning Analysis:
- Topic Mastery Levels: ${JSON.stringify(topicMastery)}
- Optimal Difficulty Setting: ${optimalDifficulty}
- Learning Style Profile: ${JSON.stringify(metrics.learning_style)}
- Recent Performance History: ${metrics.question_history.slice(-5).map(q => 
    `${q.topic} (${q.difficulty}): ${q.is_correct ? 'Correct' : 'Incorrect'}`
  ).join(', ')}

Learning Path Development Requirements:
1. Prioritize topics with mastery levels below 70% for intensive focus
2. Adjust difficulty progression based on recent performance patterns
3. Maintain student engagement through strategic topic variety
4. Include specific practice recommendations with learning objectives
5. Set realistic, achievable daily learning goals
6. Provide accurate time commitment estimates
7. Align all content with Cambridge/AQA assessment standards
8. Incorporate formative assessment checkpoints
9. Design progressive skill-building sequences
10. Ensure pedagogical soundness throughout the learning journey

Generate a comprehensive adaptive learning path that addresses these requirements with specific, actionable recommendations tailored to the student's current learning profile.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a professional adaptive learning specialist specializing in Cambridge International Examination A/AS-level and AQA Computer Science curriculum design, with expertise in personalized educational pathway development." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content;
  } catch (error) {
    console.error('Error generating adaptive learning path:', error);
    throw error;
  }
} 
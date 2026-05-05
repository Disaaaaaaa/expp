import { openai } from '@/services/openai';
import type { PerformanceMetrics, AdaptiveMetrics } from '@/types/analytics';
import { generateAdaptiveLearningPath } from '@/services/adaptiveLearning';

export async function generatePersonalizedPath(metrics: PerformanceMetrics | AdaptiveMetrics) {
  
  if ('question_history' in metrics) {
    return generateAdaptiveLearningPath(metrics as AdaptiveMetrics);
  }

  
  const prompt = `Based on the following performance metrics, generate a personalized learning path following Cambridge International Examination A/AS-level and AQA Computer Science standards:

Performance Analysis:
- Overall Score: ${metrics.overall_score}
- Weak Areas: ${metrics.weak_areas.join(', ')}
- Strong Areas: ${metrics.strong_areas.join(', ')}

Learning Path Requirements:
1. Focus on improving identified weak areas with targeted interventions
2. Maintain proficiency in strong areas through reinforcement activities
3. Implement progressive difficulty scaling aligned with Cambridge/AQA standards
4. Include specific topic recommendations with learning objectives
5. Provide structured progression milestones
6. Incorporate assessment checkpoints for monitoring progress

Generate a comprehensive learning path that addresses these requirements with specific, actionable recommendations.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a professional educational advisor specializing in Cambridge International Examination A/AS-level and AQA Computer Science curriculum design and personalized learning path development." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content;
  } catch (error) {
    console.error('Error generating learning path:', error);
    throw error;
  }
} 
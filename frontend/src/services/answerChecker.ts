import { throttledCompletion } from '@/services/openai';

export const checkAnswerWithAI = async (
  userAnswer: string,
  solution: string,
  type: string,
  question: string
): Promise<{ isCorrect: boolean; feedback: string }> => {
  const prompt = `
Task: Evaluate student response accuracy for this ${type} question using Cambridge International Examination A/AS-level and AQA Computer Science assessment standards.

Question: ${question}
Solution: ${solution}
Student Response: ${userAnswer}

Evaluation Criteria:
1. Mathematical equivalence (for numerical responses)
2. Conceptual understanding demonstration
3. Key learning objectives coverage
4. Technical accuracy and precision
5. Cambridge/AQA style assessment standards

Respond in this JSON format:
{
  "isCorrect": boolean,
  "score": number (0-100),
  "feedback": "Detailed pedagogical feedback explaining correctness/errors",
  "keyPointsCovered": ["list", "of", "key", "points", "demonstrated"],
  "missingConcepts": ["list", "of", "missing", "concepts"],
  "improvementSuggestions": ["specific", "recommendations", "for", "enhancement"]
}`;

  try {
    const completion = await throttledCompletion([
      { role: "system", content: "You are an expert educational assessor specializing in Cambridge International Examination A/AS-level and AQA Computer Science evaluation standards." },
      { role: "user", content: prompt }
    ]);

    const response = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return {
      isCorrect: response.score >= 85, 
      feedback: `Assessment Score: ${response.score}%\n\nDetailed Feedback:\n${response.feedback}\n\nKey Points Demonstrated: ${response.keyPointsCovered?.join(', ') || 'N/A'}\n\nAreas for Improvement: ${response.improvementSuggestions?.join(', ') || 'N/A'}`
    };
  } catch (error) {
    console.error('AI answer checking failed:', error);
    
    return {
      isCorrect: false,
      feedback: "Assessment system temporarily unavailable. Please review your response using standard evaluation criteria."
    };
  }
}; 
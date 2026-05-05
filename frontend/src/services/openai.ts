import type { TaskConfig, Question, TaskGenerationPlan, TaskPlanItem } from '@/types/exam';
import pThrottle from 'p-throttle';

// Backend API endpoint for OpenAI requests
const API_BASE_URL = '/api/openai/chat';

// Throttle function to limit API calls
const throttle = pThrottle({
  limit: 50,
  interval: 60000
});

// OpenAI message type
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// API response type
interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Extended Error type for API errors
interface APIError extends Error {
  status?: number;
}

// Call backend endpoint instead of direct OpenAI API
async function callOpenAI(
  messages: OpenAIMessage[], 
  model = 'gpt-4o-mini', 
  temperature?: number, 
  max_tokens?: number
): Promise<OpenAIResponse> {
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      model,
      ...(temperature !== undefined && { temperature }),
      ...(max_tokens !== undefined && { max_tokens }),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const error = new Error(errorData.error || `HTTP error! status: ${response.status}`) as APIError;
    error.status = response.status;
    throw error;
  }

  return await response.json();
}

export const throttledCompletion = throttle(async (messages: OpenAIMessage[]) => {
  return await callOpenAI(messages, 'gpt-4o-mini');
});

// Export a compatible interface for backward compatibility
export const openai = {
  chat: {
    completions: {
      create: async (params: { 
        model?: string; 
        messages: OpenAIMessage[]; 
        temperature?: number; 
        max_tokens?: number 
      }) => {
        return await callOpenAI(
          params.messages,
          params.model || 'gpt-4o-mini',
          params.temperature,
          params.max_tokens
        );
      },
    },
  },
};


async function handleOpenAIRequest<T>(
  operation: () => Promise<T>,
  errorContext: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`OpenAI ${errorContext} error:`, error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Error in ${errorContext}: ${message}`);
  }
}


const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0 && error instanceof Error) {
      await wait(RETRY_DELAY * (MAX_RETRIES - retries + 1));
      return retryWithBackoff(operation, retries - 1);
    }
    throw error;
  }
};

const getTypeSpecificPrompt = (type: string, subject?: string): string => {
  const basePrompts: Record<string, string> = {
    'Multiple Choice': `
- Question text should NOT include the options in the TEXT field
- OPTIONS must be listed line by line, one option per line:
  A) First option text
  B) Second option text
  C) Third option text
  D) Fourth option text
- Each option must be on its own line starting with A), B), C), or D)
- ANSWER: single letter (A, B, C, or D)
- SOLUTION: step-by-step analysis explaining why correct answer is right and others are wrong`,

    'Problem Solving': `
- Clear problem statement with given information
- ANSWER: final numerical answer with units (e.g., "x = 4 cm", "6 units")
- SOLUTION: numbered steps showing all calculations, formulas, substitutions, and reasoning`,

    'Short Answer': `
- Focused question requiring specific points
- ANSWER: complete text answer (50-150 words) with all key points
- SOLUTION: step-by-step guide on structuring the answer, key concepts to include, and how to connect them`,

    'Essay': `
- Clear writing prompt with topic and word count
- ANSWER: evaluation criteria JSON with requiredPoints, weights, and word count range
- SOLUTION: step-by-step guide on thesis development, structure, evidence, and writing approach`,

    'True/False': `
- Unambiguous statement (single concept, no double negatives)
- ANSWER: "True" or "False"
- SOLUTION: step-by-step explanation with reasoning`,

    'Fill in the Blank': `
- Use ___ for blanks, context makes answer clear
- ANSWER: fill-in values (list variations if applicable)
- SOLUTION: step-by-step reasoning for each blank`,

    'Matching': `
- Two labeled columns, 4-8 pairs, one correct match per item
- ANSWER: matched pairs
- SOLUTION: step-by-step matching process`,

    'Coding': `
- Programming language, problem description, input/output format, test cases
- ANSWER: solution code or approach
- SOLUTION: step-by-step algorithm development`,

    'Debugging': `
- Code with bugs, expected vs actual behavior, error messages
- ANSWER: identified bugs and fixes
- SOLUTION: step-by-step debugging process`,

    'Case Study': `
- Detailed scenario with context, background, data
- ANSWER: analysis results or key findings
- SOLUTION: step-by-step analysis methodology`,

    'Diagram Analysis': `
- Clear diagram description, elements to identify, measurements
- ANSWER: identified elements and relationships
- SOLUTION: step-by-step diagram interpretation`,

    'Data Analysis': `
- Dataset description, analysis tasks, statistical methods
- ANSWER: analysis results or insights
- SOLUTION: step-by-step data processing methodology`,

    'Theory': `
- Specific theoretical concept, key principles, practical applications
- ANSWER: theoretical explanation or key points
- SOLUTION: step-by-step theoretical explanation`,

    'Practical': `
- Materials/tools, procedure, safety, expected outcomes
- ANSWER: procedure summary or key steps
- SOLUTION: detailed step-by-step practical methodology`
  };

  
  const subjectSpecificPrompts: Record<string, Record<string, string>> = {
    'Mathematics': {
      'Multiple Choice': '- Include calculations, common misconceptions as distractors, units',
      'Problem Solving': '- Include formulas, mathematical reasoning, diagrams, units',
      'Short Answer': '- Mathematical terms/definitions, numerical examples',
    },
    'Computer Science': {
      'Multiple Choice': '- Code snippets, programming concepts, common pitfalls',
      'Coding': '- Programming language, I/O format, complexity requirements, test cases',
      'Debugging': '- Real syntax, common errors, expected vs actual output',
      'Problem Solving': '- Algorithmic thinking, pseudocode, efficiency',
    },
    'Physics': {
      'Multiple Choice': '- Unit conversions, formulas/constants, conceptual questions',
      'Problem Solving': '- Free body diagrams, vectors, standard notation',
    },
    'Chemistry': {
      'Multiple Choice': '- Chemical equations, molecular structures, periodic table',
      'Problem Solving': '- Balanced equations, stoichiometry, nomenclature',
    },
    'Biology': {
      'Multiple Choice': '- Diagram labeling, process sequences, terminology',
      'Case Study': '- Real scenarios, experimental data, scientific method',
    },
    'English': {
      'Essay': '- Writing prompts, structure, evaluation criteria',
      'Short Answer': '- Grammar, literary analysis, reading comprehension',
    },
    'History': {
      'Essay': '- Primary sources, chronology, historical evidence',
      'Case Study': '- Historical documents, multiple perspectives, cause-effect',
    }
  };

  let prompt = basePrompts[type] || '';

  if (subject && subjectSpecificPrompts[subject]?.[type]) {
    prompt += '\n\n' + subjectSpecificPrompts[subject][type];
  }

  return prompt;
};

function parseQuestions(response: string, config: TaskConfig): Question[] {
  try {
    const delimiter = /---START TASK---|---END TASK---|---ТАПСЫРМА БАСТАЛУЫ---|---ТАПСЫРМА АЯҚТАЛУЫ---|---НАЧАЛО ЗАДАНИЯ---|---КОНЕЦ ЗАДАНИЯ---/;
    
    // Clean the response - remove any explanatory text before the first task
    const firstDelimiterMatch = response.match(/---START TASK---|---ТАПСЫРМА БАСТАЛУЫ---|---НАЧАЛО ЗАДАНИЯ---/);
    const cleanResponse = firstDelimiterMatch 
      ? response.substring(response.indexOf(firstDelimiterMatch[0]))
      : response;
    
    const items = cleanResponse.split(delimiter).filter(item => {
      const trimmed = item.trim();
      return trimmed && (
        trimmed.toLowerCase().includes('type') || 
        trimmed.toLowerCase().includes('text') ||
        trimmed.toLowerCase().includes('түрі') ||
        trimmed.toLowerCase().includes('мәтін') ||
        trimmed.toLowerCase().includes('тип') ||
        trimmed.toLowerCase().includes('текст')
      );
    });
    
    if (items.length === 0) {
      console.error('No valid tasks found in response. Response:', response);
      throw new Error('No valid tasks found in response. The generated content does not match the expected format.');
    }
    
    return items.map((content, index) => {
      const fields: Record<string, string> = {};
      const lines = content.split('\n');
      let currentField = '';
      let currentValue: string[] = [];

      const fieldMap: Record<string, string> = {
        'TYPE': 'TYPE', 'ТҮРІ': 'TYPE', 'ТИП': 'TYPE',
        'DIFFICULTY': 'DIFFICULTY', 'ҚИЫНДЫҚ': 'DIFFICULTY', 'СЛОЖНОСТЬ': 'DIFFICULTY',
        'TOPIC': 'TOPIC', 'ТАҚЫРЫП': 'TOPIC', 'ТЕМА': 'TOPIC',
        'TEXT': 'TEXT', 'МӘТІН': 'TEXT', 'ТЕКСТ': 'TEXT',
        'ANSWER': 'ANSWER', 'ЖАУАП': 'ANSWER', 'ОТВЕТ': 'ANSWER',
        'SOLUTION': 'SOLUTION', 'ШЕШІМ': 'SOLUTION', 'РЕШЕНИЕ': 'SOLUTION',
        'OPTIONS': 'OPTIONS', 'НҰСҚАЛАР': 'OPTIONS', 'ВАРИАНТЫ': 'OPTIONS'
      };

      for (const line of lines) {
        const match = line.match(/^([A-ZА-ЯҚҢҒҰҮҺӘІ_]+):\s*(.*)$/i);
        if (match) {
          if (currentField && currentValue.length > 0) {
            fields[currentField] = currentValue.join('\n').trim();
          }
          const rawField = match[1].toUpperCase();
          currentField = fieldMap[rawField] || rawField;
          currentValue = [match[2]];
        } else if (currentField && line.trim()) {
          currentValue.push(line.trim());
        }
      }
      if (currentField && currentValue.length > 0) {
        fields[currentField] = currentValue.join('\n').trim();
      }

      const requiredFields = ['TYPE', 'DIFFICULTY', 'TOPIC', 'TEXT', 'ANSWER', 'SOLUTION'];
      for (const field of requiredFields) {
        if (!fields[field]) {
          console.error(`Missing field ${field} in task ${index + 1}. Available:`, Object.keys(fields));
          throw new Error(`Missing required field ${field} in task ${index + 1}.`);
        }
      }

      const difficulty = fields['DIFFICULTY'].toLowerCase().trim();
      let normalizedDifficulty: 'easy' | 'medium' | 'hard' = 'medium';
      
      if (difficulty.includes('easy') || difficulty.includes('оңай') || difficulty.includes('легко')) {
        normalizedDifficulty = 'easy';
      } else if (difficulty.includes('hard') || difficulty.includes('қиын') || difficulty.includes('сложно')) {
        normalizedDifficulty = 'hard';
      }

      return {
        id: `${Date.now()}-${index}`,
        text: fields['TYPE'] === 'Multiple Choice' && fields['OPTIONS'] 
          ? fields['TEXT'].trim() + '\n\n' + fields['OPTIONS'].trim() 
          : fields['TEXT'],
        type: fields['TYPE'],
        topic: fields['TOPIC'],
        difficulty: normalizedDifficulty,
        solution: fields['SOLUTION'],
        answer: fields['ANSWER']
      };
    });
  } catch (error) {
    console.error('Error parsing questions:', error);
    throw error;
  }
}

/**
 * Step 1: Generate a simple task generation plan with only essential parameters
 * This creates a minimal plan with only type, topic, difficulty, and goal for each task
 */
function createTaskPlanPrompt(config: TaskConfig): string {
  const { types, difficulty: { easy, medium }, topics, count, subject } = config;
  
  const tasksPerType = Math.max(1, Math.floor(count / types.length));
  const remainingTasks = count - (tasksPerType * types.length);
  
  const easyCount = Math.round((count * easy) / 100);
  const mediumCount = Math.round((count * medium) / 100);
  const hardCount = Math.max(1, count - easyCount - mediumCount);

  const languageNames: Record<string, string> = {
    'en': 'English',
    'ru': 'Russian',
    'kk': 'Kazakh'
  };
  const targetLanguage = languageNames[config.language || 'kk'] || 'Kazakh';

  return `Generate exactly ${count} task plans for ${subject} in ${targetLanguage} language.

REQUIREMENTS:
- Types: ${types.join(', ')} (distribute evenly)
- Difficulty: ${easyCount} easy, ${mediumCount} medium, ${hardCount} hard
- Topics: ${topics.join(', ')} (ensure balanced coverage)

FORMAT (one plan per task):
---START PLAN---
TASK_NUMBER: [1-${count}]
TYPE: [${types.join(', ')}]
DIFFICULTY: [easy, medium, hard]
TOPIC: [${topics.join(', ')}]
GOAL: [specific learning objective for this task]
---END PLAN---

Generate all ${count} plans now:`;
}

/**
 * Parse the task generation plan from AI response
 */
function parseTaskPlan(response: string): TaskPlanItem[] {
  try {
    const delimiter = /---START PLAN---|---END PLAN---|---ЖОСПАР БАСТАЛУЫ---|---ЖОСПАР АЯҚТАЛУЫ---|---НАЧАЛО ПЛАНА---|---КОНЕЦ ПЛАНА---/;
    const firstDelimiterMatch = response.match(/---START PLAN---|---ЖОСПАР БАСТАЛУЫ---|---НАЧАЛО ПЛАНА---/);
    const cleanResponse = firstDelimiterMatch 
      ? response.substring(response.indexOf(firstDelimiterMatch[0]))
      : response;
    
    const items = cleanResponse.split(delimiter).filter(item => {
      const trimmed = item.trim();
      return trimmed && (
        trimmed.toLowerCase().includes('task') || 
        trimmed.toLowerCase().includes('type') || 
        trimmed.toLowerCase().includes('тапсырма') ||
        trimmed.toLowerCase().includes('түрі') ||
        trimmed.toLowerCase().includes('номер') ||
        trimmed.toLowerCase().includes('тип')
      );
    });
    
    if (items.length === 0) {
      console.error('No valid task plans found in response:', response);
      throw new Error('No valid task plans found in response.');
    }
    
    return items.map((content) => {
      const fields: Record<string, string> = {};
      const lines = content.split('\n');
      let currentField = '';
      let currentValue: string[] = [];

      const fieldMap: Record<string, string> = {
        'TASK_NUMBER': 'TASK_NUMBER', 'TASK': 'TASK_NUMBER', 'ТАПСЫРМА_НӨМІРІ': 'TASK_NUMBER', 'НОМЕР_ЗАДАНИЯ': 'TASK_NUMBER',
        'TYPE': 'TYPE', 'ТҮРІ': 'TYPE', 'ТИП': 'TYPE',
        'DIFFICULTY': 'DIFFICULTY', 'ҚИЫНДЫҚ': 'DIFFICULTY', 'СЛОЖНОСТЬ': 'DIFFICULTY',
        'TOPIC': 'TOPIC', 'ТАҚЫРЫП': 'TOPIC', 'ТЕМА': 'TOPIC',
        'GOAL': 'GOAL', 'МАҚСАТЫ': 'GOAL', 'ЦЕЛЬ': 'GOAL'
      };

      for (const line of lines) {
        const match = line.match(/^([A-ZА-ЯҚҢҒҰҮҺӘІ_]+):\s*(.*)$/i);
        if (match) {
          if (currentField && currentValue.length > 0) {
            fields[currentField] = currentValue.join('\n').trim();
          }
          const rawField = match[1].toUpperCase();
          currentField = fieldMap[rawField] || rawField;
          currentValue = [match[2]];
        } else if (currentField && line.trim()) {
          currentValue.push(line.trim());
        }
      }
      if (currentField && currentValue.length > 0) {
        fields[currentField] = currentValue.join('\n').trim();
      }

      const requiredFields = ['TASK_NUMBER', 'TYPE', 'DIFFICULTY', 'TOPIC', 'GOAL'];
      for (const field of requiredFields) {
        if (!fields[field]) {
          console.warn(`Missing field ${field} in task plan item. Fields:`, Object.keys(fields));
        }
      }

      const difficulty = (fields['DIFFICULTY'] || 'medium').toLowerCase();
      let normalizedDifficulty: 'easy' | 'medium' | 'hard' = 'medium';
      if (difficulty.includes('easy') || difficulty.includes('оңай') || difficulty.includes('легко')) {
        normalizedDifficulty = 'easy';
      } else if (difficulty.includes('hard') || difficulty.includes('қиын') || difficulty.includes('сложно')) {
        normalizedDifficulty = 'hard';
      }

      return {
        taskNumber: parseInt(fields['TASK_NUMBER'] || '1', 10),
        type: fields['TYPE'] || 'Multiple Choice',
        difficulty: normalizedDifficulty,
        topic: fields['TOPIC'] || 'General',
        focusArea: fields['GOAL'] || '',
        learningObjective: fields['GOAL'] || '',
        keyConcepts: [],
        estimatedComplexity: ''
      };
    }).sort((a, b) => a.taskNumber - b.taskNumber);
  } catch (error) {
    console.error('Error parsing task plan:', error);
    throw error;
  }
}

/**
 * Step 2: Generate a single task with only essential parameters
 */
function createIndividualTaskPrompt(planItem: TaskPlanItem, config: TaskConfig): string {
  const { subject } = config;
  const typeSpecificPrompt = getTypeSpecificPrompt(planItem.type, subject);

  const languageNames: Record<string, string> = {
    'en': 'English',
    'ru': 'Russian',
    'kk': 'Kazakh'
  };
  const targetLanguage = languageNames[config.language || 'kk'] || 'Kazakh';

  return `Generate a ${planItem.difficulty} difficulty ${planItem.type} task in ${targetLanguage} language.

PARAMETERS:
- Type: ${planItem.type}
- Topic: ${planItem.topic}
- Complexity: ${planItem.difficulty}
- Goal: ${planItem.learningObjective || planItem.focusArea}

FORMAT:
---START TASK---
TYPE: ${planItem.type}
DIFFICULTY: ${planItem.difficulty}
TOPIC: ${planItem.topic}
TEXT: [task description aligned with goal and ${planItem.difficulty} difficulty - DO NOT include options in TEXT]
${planItem.type === 'Multiple Choice' ? `OPTIONS:
A) First option text
B) Second option text
C) Third option text
D) Fourth option text` : ''}
ANSWER: [final answer only]
SOLUTION: [detailed step-by-step solution]
---END TASK---

${typeSpecificPrompt}`;
}

/**
 * Generate a single task based on a plan item
 */
async function generateIndividualTask(
  planItem: TaskPlanItem, 
  config: TaskConfig,
  onProgress?: (step: 'planning' | 'generating', current: number, total: number, plan?: TaskGenerationPlan) => void,
  plan?: TaskGenerationPlan
): Promise<Question> {
  const prompt = createIndividualTaskPrompt(planItem, config);
  
      const completion = await throttledCompletion([
      { 
        role: "system", 
        content: `Generate educational tasks in ${config.language === 'en' ? 'English' : config.language === 'ru' ? 'Russian' : 'Kazakh'} language. 
TEXT, OPTIONS, ANSWER, and SOLUTION must be in the specified language.
The TOPIC field must exactly match the provided topic name from the parameters (do not translate the topic name).
Output ONLY the task in the specified format. Start with ---START TASK--- and end with ---END TASK---. Include TYPE, DIFFICULTY, TOPIC, TEXT, ANSWER, and SOLUTION fields. For Multiple Choice questions, include OPTIONS field with each option on a separate line (A), B), C), D)). ANSWER contains the final result only. SOLUTION contains detailed step-by-step process.`
      },
      { role: "user", content: prompt }
    ]);
    
    if (!completion.choices[0]?.message?.content) {
    throw new Error('No content generated for task');
    }

  const tasks = parseQuestions(completion.choices[0].message.content, config);
  
  if (tasks.length === 0) {
    throw new Error(`Failed to parse task ${planItem.taskNumber}`);
  }

  if (onProgress && plan) {
    onProgress('generating', planItem.taskNumber, config.count, plan);
  }

  return tasks[0];
}

/**
 * Main function: Generate tasks using two-step approach
 * Step 1: Create a comprehensive plan
 * Step 2: Generate each task individually based on the plan
 */
export const generateTasks = async (
  config: TaskConfig,
  onProgress?: (step: 'planning' | 'generating', current: number, total: number, plan?: TaskGenerationPlan) => void
): Promise<Question[]> => {
  return handleOpenAIRequest(async () => {
    // Step 1: Generate task plan
    if (onProgress) {
      onProgress('planning', 0, 1);
    }

    const planPrompt = createTaskPlanPrompt(config);
    const planCompletion = await throttledCompletion([
      { 
        role: "system", 
        content: `Create task generation plans in ${config.language === 'en' ? 'English' : config.language === 'ru' ? 'Russian' : 'Kazakh'} language. 
The TOPIC and GOAL fields should reflect the target language's context where appropriate, but TOPIC must remain one of the provided topic names exactly.
Each plan must include TASK_NUMBER, TYPE, DIFFICULTY, TOPIC, and GOAL fields.
Output plans in the specified format.`
      },
      { role: "user", content: planPrompt }
    ]);
    
    if (!planCompletion.choices[0]?.message?.content) {
      throw new Error('No task plan generated');
    }

    const planItems = parseTaskPlan(planCompletion.choices[0].message.content);
    
    if (planItems.length !== config.count) {
      console.warn(`Expected ${config.count} task plans, got ${planItems.length}. Proceeding with available plans.`);
    }

    const plan: TaskGenerationPlan = {
      tasks: planItems,
      overallStrategy: `Generate ${config.count} tasks covering ${config.topics.join(', ')} with balanced difficulty distribution`,
      topicCoverage: planItems.reduce((acc, item) => {
        acc[item.topic] = (acc[item.topic] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      difficultyDistribution: {
        easy: planItems.filter(t => t.difficulty === 'easy').length,
        medium: planItems.filter(t => t.difficulty === 'medium').length,
        hard: planItems.filter(t => t.difficulty === 'hard').length
      }
    };

    if (onProgress) {
      onProgress('planning', 1, 1, plan);
    }

    // Step 2: Generate each task individually
    const questions: Question[] = [];
    
    for (const planItem of planItems) {
      try {
        const task = await generateIndividualTask(planItem, config, onProgress, plan);
        questions.push({
          ...task,
          id: `${Date.now()}-${planItem.taskNumber}`
        });
      } catch (error) {
        console.error(`Error generating task ${planItem.taskNumber}:`, error);
        // Continue with other tasks instead of failing the whole batch
      }
    }

    if (questions.length === 0) {
      throw new Error('Failed to generate any tasks. Please try again.');
    }

    return questions;
  }, 'task generation');
};

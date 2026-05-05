import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskStore } from '@/store/taskStore';
import { generateTasks } from '@/services/openai';
import { getSheets } from '@/services/supabase';
import { useToast } from '@/hooks/useToast';
import type { TaskConfig, DifficultyDistribution, TaskGenerationPlan } from '@/types/exam';
import { Loader2, BookOpen, Settings2, ChevronDown, AlertTriangle, CheckCircle2, FileText, Sparkles, X, Search, Info, TrendingUp, History } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { PageLayout } from '@/layouts/PageLayout';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useLanguageStore } from '@/store/languageStore';

type TaskType = {
  value: string;
  label: string;
  subjects: string[]; 
};

const taskTypes: TaskType[] = [
  { value: 'Multiple Choice', label: 'typeMultipleChoice', subjects: ['all'] },
  { value: 'Problem Solving', label: 'typeProblemSolving', subjects: ['Mathematics', 'Physics', 'Chemistry', 'Computer Science'] },
  { value: 'Short Answer', label: 'typeShortAnswer', subjects: ['all'] },
  { value: 'Essay', label: 'typeEssay', subjects: ['English', 'History', 'Philosophy', 'Psychology'] },
  { value: 'True/False', label: 'typeTrueFalse', subjects: ['all'] },
  { value: 'Fill in the Blank', label: 'typeFillInTheBlank', subjects: ['all'] },
  { value: 'Matching', label: 'typeMatching', subjects: ['all'] },
  { value: 'Coding', label: 'typeCoding', subjects: ['Computer Science'] },
  { value: 'Debugging', label: 'typeDebugging', subjects: ['Computer Science'] },
  { value: 'Case Study', label: 'typeCaseStudy', subjects: ['Business', 'Psychology', 'Biology', 'History'] },
  { value: 'Diagram Analysis', label: 'typeDiagramAnalysis', subjects: ['Biology', 'Physics', 'Geography', 'Art'] },
  { value: 'Data Analysis', label: 'typeDataAnalysis', subjects: ['Mathematics', 'Economics', 'Psychology', 'Geography'] },
  { value: 'Theory', label: 'typeTheory', subjects: ['all'] },
  { value: 'Practical', label: 'typePractical', subjects: ['Physics', 'Chemistry', 'Biology', 'Computer Science', 'Music', 'Art'] }
];

const subjects: Record<string, string[]> = {
  'Mathematics': ['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Trigonometry', 'Number Theory', 'Linear Algebra', 'Discrete Mathematics', 'Mathematical Logic', 'Real Analysis'],
  
  'Physics': ['Mechanics', 'Thermodynamics', 'Electricity', 'Optics', 'Quantum Physics', 'Nuclear Physics', 'Astrophysics', 'Fluid Dynamics', 'Relativity', 'Electromagnetism'],
  
  'Chemistry': ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Biochemistry', 'Analytical Chemistry', 'Polymer Chemistry', 'Environmental Chemistry', 'Medicinal Chemistry', 'Nuclear Chemistry', 'Electrochemistry'],
  
  'Biology': ['Cell Biology', 'Genetics', 'Ecology', 'Human Anatomy', 'Evolution', 'Microbiology', 'Botany', 'Zoology', 'Molecular Biology', 'Physiology'],
  
  'Computer Science': [
    'Programming Fundamentals',
    'Data Structures',
    'Algorithms',
    'Database Systems',
    'Web Development',
    'Computer Networks',
    'Operating Systems',
    'Software Engineering',
    'Cybersecurity',
    'Artificial Intelligence',
    'Machine Learning',
    'Computer Architecture',
    'Cloud Computing',
    'Mobile Development',
    'Blockchain Technology'
  ],
  
  'English': ['Grammar', 'Literature', 'Writing', 'Comprehension', 'Vocabulary', 'Creative Writing', 'Business English', 'Academic Writing', 'Public Speaking', 'Literary Analysis'],
  
  'History': ['World History', 'Ancient Civilizations', 'Modern History', 'Cultural History', 'Military History', 'Economic History', 'Social History', 'Political History', 'Art History', 'Archaeological Studies'],
  
  'Geography': [
    'Physical Geography',
    'Human Geography',
    'Cartography',
    'Climate Studies',
    'Urban Geography',
    'Economic Geography',
    'Environmental Geography',
    'Population Studies',
    'Geographic Information Systems',
    'Regional Studies'
  ],
  
  'Economics': [
    'Microeconomics',
    'Macroeconomics',
    'International Economics',
    'Development Economics',
    'Financial Economics',
    'Labor Economics',
    'Public Economics',
    'Environmental Economics',
    'Behavioral Economics',
    'Economic History'
  ],
  
  'Psychology': [
    'Clinical Psychology',
    'Cognitive Psychology',
    'Developmental Psychology',
    'Social Psychology',
    'Behavioral Psychology',
    'Neuropsychology',
    'Educational Psychology',
    'Industrial Psychology',
    'Personality Psychology',
    'Research Methods'
  ],
  
  'Philosophy': [
    'Ethics',
    'Logic',
    'Metaphysics',
    'Epistemology',
    'Political Philosophy',
    'Philosophy of Science',
    'Philosophy of Mind',
    'Aesthetics',
    'Eastern Philosophy',
    'Contemporary Philosophy'
  ],
  
  'Art': [
    'Art History',
    'Drawing',
    'Painting',
    'Sculpture',
    'Digital Art',
    'Photography',
    'Graphic Design',
    'Art Theory',
    'Contemporary Art',
    'Visual Communication'
  ],
  
  'Music': [
    'Music Theory',
    'Music History',
    'Composition',
    'Performance',
    'Music Technology',
    'World Music',
    'Music Analysis',
    'Orchestration',
    'Music Education',
    'Sound Design'
  ]
};

function validateConfig(config: TaskConfig, t: any): string | null {
  if (config.topics.length === 0) {
    return t('tasks.errorSelectTopics');
  }
  if (config.count < 1 || config.count > 20) {
    return 'Number of tasks must be between 1 and 20';
  }
  return null;
}

const DifficultySlider = ({ 
  value, 
  onChange 
}: { 
  value: DifficultyDistribution;
  onChange: (distribution: DifficultyDistribution) => void;
}) => {
  const { t } = useLanguageStore();
  const firstPoint = useMotionValue(value.easy);
  const secondPoint = useMotionValue(value.easy + value.medium);


  const easyPercentage = useTransform(firstPoint, (v: number) => Math.round(v));
  const mediumPercentage = useTransform<number[], number>(
    [firstPoint, secondPoint] as any, 
    (latest: number[]) => Math.round(latest[1] - latest[0])
  );
  const hardPercentage = useTransform(secondPoint, (v: number) => Math.round(100 - v));

  const updateDistribution = (first: number, second: number) => {
    const easy = Math.round(first);
    const medium = Math.round(second - first);
    const hard = Math.round(100 - second);
    onChange({ easy, medium, hard });
  };

  const handleDrag = (point: 'first' | 'second', event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget) return;
    
    const container = event.currentTarget.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = Math.min(100, Math.max(0, (x / container.offsetWidth) * 100));

    if (point === 'first') {
      const newX = Math.max(0, Math.min(secondPoint.get() - 5, percentage));
      firstPoint.set(newX);
      updateDistribution(newX, secondPoint.get());
    } else {
      const newX = Math.max(firstPoint.get() + 5, Math.min(100, percentage));
      secondPoint.set(newX);
      updateDistribution(firstPoint.get(), newX);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    element.setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    element.releasePointerCapture(e.pointerId);
  };
  return (
    <div className="w-full space-y-6">
      <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
        <motion.div 
          className="absolute inset-0 bg-green-500 dark:bg-green-600 rounded-l-full" 
          style={{ width: useTransform(firstPoint, (v: number) => `${v}%`) }} 
        />
        <motion.div 
          className="absolute inset-0 bg-yellow-500 dark:bg-yellow-600" 
          style={{ 
            left: useTransform(firstPoint, (v: number) => `${v}%`),
            width: useTransform<number[], string>(
              [firstPoint, secondPoint] as any,
              (latest: number[]) => `${latest[1] - latest[0]}%`
            )
          }} 
        />
        <motion.div 
          className="absolute inset-0 bg-red-500 dark:bg-red-600 rounded-r-full" 
          style={{ 
            left: useTransform(secondPoint, (v: number) => `${v}%`),
            width: useTransform(secondPoint, (v: number) => `${100 - v}%`)
          }} 
        />
        
        <motion.div
          drag="x"
          dragMomentum={false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0}
          className="absolute w-4 h-4 bg-white dark:bg-gray-100 rounded-full 
                     shadow-lg cursor-pointer border-2 border-gray-300 dark:border-gray-600 
                     hover:scale-110 transition-transform z-10"
          style={{ 
            left: useTransform(firstPoint, (v: number) => `${v}%`),
            top: '-5px'
          }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerMove={(e) => {
            if (e.buttons === 1) {
              handleDrag('first', e);
            }
          }}
        />
        
        <motion.div
          drag="x"
          dragMomentum={false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0}
          className="absolute w-4 h-4 bg-white dark:bg-gray-100 rounded-full 
                     shadow-lg cursor-pointer border-2 border-gray-300 dark:border-gray-600 
                     hover:scale-110 transition-transform z-10"
          style={{ 
            left: useTransform(secondPoint, (v: number) => `${v}%`),
            top: '-5px'
          }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerMove={(e) => {
            if (e.buttons === 1) {
              handleDrag('second', e);
            }
          }}
        />
      </div>
      
      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 dark:bg-green-600 rounded-full"></div>
            <span>{t('tasks.easy')}: <motion.span>{useTransform(easyPercentage, v => `${v}%`)}</motion.span></span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 dark:bg-yellow-600 rounded-full"></div>
            <span>{t('tasks.medium')}: <motion.span>{useTransform(mediumPercentage, v => `${v}%`)}</motion.span></span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 dark:bg-red-600 rounded-full"></div>
            <span>{t('tasks.hard')}: <motion.span>{useTransform(hardPercentage, v => `${v}%`)}</motion.span></span>
          </div>
        </div>
      </div>
    </div>
  );
};


export const TaskForm = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generationStep, setGenerationStep] = useState<'idle' | 'planning' | 'generating'>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [taskPlan, setTaskPlan] = useState<TaskGenerationPlan | null>(null);
  const { setTaskConfig, setQuestions } = useTaskStore();
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [customTopic, setCustomTopic] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [taskCount, setTaskCount] = useState(5);
  const [topicSearch, setTopicSearch] = useState('');
  const [difficultyDistribution, setDifficultyDistribution] = useState<DifficultyDistribution>({
    easy: 30,
    medium: 50,
    hard: 20
  });
  const { t, currentLanguage } = useLanguageStore();

  const handleTopicChange = (topic: string) => {
    setSelectedTopics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(topic)) {
        newSet.delete(topic);
      } else {
        newSet.add(topic);
      }
      return newSet;
    });
  };

  const handleTypeChange = (type: string) => {
    setSelectedTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  const handleReviewLastSheet = async () => {
    try {
      const sheets = await getSheets();
      if (sheets && sheets.length > 0) {
        const lastSheet = sheets[0]; // First sheet is the most recent (ordered by created_at desc)
        navigate(`/sheets/${lastSheet.id}`);
      } else {
        showToast(t('tasks.errorLoadingLastSheet'), 'info');
      }
    } catch (error) {
      console.error('Error loading last sheet:', error);
      showToast(t('tasks.errorLoadingLastSheet'), 'error');
    }
  };

  const filteredTopics = useMemo(() => {
    if (!selectedSubject) return [];
    const topics = subjects[selectedSubject] || [];
    if (!topicSearch.trim()) return topics;
    return topics.filter(topic => 
      topic.toLowerCase().includes(topicSearch.toLowerCase())
    );
  }, [selectedSubject, topicSearch]);

  const removeTopic = (topic: string) => {
    setSelectedTopics(prev => {
      const newSet = new Set(prev);
      newSet.delete(topic);
      return newSet;
    });
  };

  const removeType = (type: string) => {
    setSelectedTypes(prev => {
      const newSet = new Set(prev);
      newSet.delete(type);
      return newSet;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let topics: string[] = [];
    if (customTopic) {
      topics.push(customTopic);
    }
    if (selectedSubject) {
      topics = [...topics, ...Array.from(selectedTopics)];
    }

    if (topics.length === 0) {
      setError(t('tasks.errorSelectTopics'));
      return;
    }

    if (selectedTypes.size === 0) {
      setError(t('tasks.errorSelectTypes'));
      return;
    }

    const config: TaskConfig = {
      types: Array.from(selectedTypes),
      difficulty: difficultyDistribution,
      topics,
      count: taskCount,
      subject: selectedSubject || 'General',
      language: currentLanguage
    };

    const validationError = validateConfig(config, t);
    if (validationError) {
      setError(validationError);
      return;
    }

    setTaskConfig(config);
    
    try {
      setError(null);
      setLoading(true);
      setGenerationStep('planning');
      setProgress({ current: 0, total: 1 });
      setTaskPlan(null);
      
      const questions = await generateTasks(config, (step, current, total, plan) => {
        setGenerationStep(step);
        setProgress({ current, total });
        if (plan && step === 'planning') {
          setTaskPlan(plan);
        }
      });
      
      setQuestions(questions);
      navigate('/task-preview');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate tasks';
      setError(message);
      console.error('Error generating tasks:', error);
      setGenerationStep('idle');
      setProgress({ current: 0, total: 0 });
    } finally {
      setLoading(false);
      setGenerationStep('idle');
    }
  };

  return (
    <PageLayout maxWidth="xl">
      <div className="max-w-6xl w-full">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              {t('nav.generateTask')}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              {t('tasks.configureSettings')}
            </p>

            {/* Review Last Generated Task Sheet Button */}
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              <motion.button
                type="button"
                onClick={handleReviewLastSheet}
                disabled={loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 
                         dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800
                         text-blue-700 dark:text-blue-300 font-medium text-sm
                         hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30
                         transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <History className="w-4 h-4" />
                {t('tasks.reviewLastSheet')}
              </motion.button>
            </div>
          </motion.div>

          <div className="relative">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6"
                  >
                    <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-5 h-5" />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-8">
                  <div className="bg-gray-50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                      <Settings2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      {t('tasks.basicSettings')}
                    </h3>
                    
                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                          {t('tasks.subject')}
                        </label>
                        <div className="relative">
                          <select
                            value={selectedSubject}
                            onChange={(e) => {
                              setSelectedSubject(e.target.value);
                              setSelectedTypes(new Set());
                            }}
                            className="w-full p-3 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100
                                     border border-gray-300 dark:border-gray-600
                                     focus:ring-2 focus:ring-blue-500/50 
                                     focus:border-blue-500/50
                                     transition-all duration-200"
                          >
                            <option value="">{t('tasks.selectSubject')}</option>
                            {Object.keys(subjects).map(subject => (
                              <option key={subject} value={subject}>
                                {t(`subjects.${subject}`)}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                          {t('tasks.taskTypes')}
                          {selectedTypes.size > 0 && (
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              ({selectedTypes.size} {t('tasks.selected')})
                            </span>
                          )}
                        </label>
                        
                        {/* Selected Types as Badges */}
                        {selectedTypes.size > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {Array.from(selectedTypes).map(type => (
                              <Badge
                                key={type}
                                variant="secondary"
                                className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"
                              >
                                {type}
                                <button
                                  type="button"
                                  onClick={() => removeType(type)}
                                  className="ml-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 p-4 max-h-[200px] overflow-y-auto">
                          <div className="space-y-2">
                            {taskTypes
                              .filter(type => type.subjects.includes('all') || type.subjects.includes(selectedSubject))
                              .map(type => (
                                <label
                                  key={type.value}
                                  className="relative flex items-center p-3 rounded-lg 
                                           border border-gray-200 dark:border-gray-600 cursor-pointer
                                           bg-white dark:bg-gray-700
                                           hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-blue-500/50 
                                           transition-all duration-200
                                           data-[selected=true]:bg-blue-50 dark:data-[selected=true]:bg-blue-900/20
                                           data-[selected=true]:border-blue-500 dark:data-[selected=true]:border-blue-500"
                                  data-selected={selectedTypes.has(type.value)}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedTypes.has(type.value)}
                                    onChange={() => handleTypeChange(type.value)}
                                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 
                                             focus:ring-2 focus:ring-blue-500/50 
                                             bg-white dark:bg-gray-600"
                                  />
                                  <span className="ml-3 text-gray-700 dark:text-gray-200">{t(`tasks.${type.label}`)}</span>
                                </label>
                              ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                          {t('tasks.numberOfTasks')}: <span className="text-blue-600 dark:text-blue-400 font-semibold">{taskCount}</span>
                        </label>
                        <div className="space-y-3">
                          <input
                            type="range"
                            min="1"
                            max="20"
                            value={taskCount}
                            onChange={(e) => setTaskCount(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer
                                     accent-blue-600 dark:accent-blue-500"
                          />
                          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>1</span>
                            <span>10</span>
                            <span>20</span>
                          </div>
                          <Input
                            type="number"
                            min="1"
                            max="20"
                            value={taskCount}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              if (value >= 1 && value <= 20) {
                                setTaskCount(value);
                              }
                            }}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      {t('tasks.topicsSelection')}
                    </h3>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                          {t('tasks.customTopic')}
                        </label>
                        <Input
                           type="text"
                           value={customTopic}
                           onChange={(e) => setCustomTopic(e.target.value)}
                           placeholder={t('tasks.customTopicPlaceholder')}
                           className="w-full"
                         />
                      </div>

                      {/* Selected Topics Display */}
                      {selectedTopics.size > 0 && (
                        <div className="space-y-2">
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                             {t('tasks.selectedTopics')} ({selectedTopics.size})
                           </label>
                          <div className="flex flex-wrap gap-2">
                            {Array.from(selectedTopics).map(topic => (
                              <Badge
                                key={topic}
                                variant="secondary"
                                className="flex items-center gap-1.5 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"
                              >
                                {t(`topics.${topic}`)}
                                <button
                                  type="button"
                                  onClick={() => removeTopic(topic)}
                                  className="ml-1 hover:bg-green-200 dark:hover:bg-green-800 rounded-full p-0.5 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedSubject ? (
                        <div className="space-y-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                               type="text"
                               value={topicSearch}
                               onChange={(e) => setTopicSearch(e.target.value)}
                               placeholder={t('tasks.searchTopics')}
                               className="pl-10"
                             />
                          </div>
                          <div className="bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 p-4 max-h-[300px] overflow-y-auto">
                            {filteredTopics.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {filteredTopics.map(topic => (
                                  <label
                                    key={topic}
                                    className="relative flex items-center p-3 rounded-lg 
                                             border border-gray-200 dark:border-gray-600 cursor-pointer
                                             bg-white dark:bg-gray-700
                                             hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-blue-500/50 
                                             transition-all duration-200
                                             data-[selected=true]:bg-green-50 dark:data-[selected=true]:bg-green-900/20
                                             data-[selected=true]:border-green-500 dark:data-[selected=true]:border-green-500"
                                    data-selected={selectedTopics.has(topic)}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedTopics.has(topic)}
                                      onChange={() => handleTopicChange(topic)}
                                      className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-green-600 
                                               focus:ring-2 focus:ring-green-500/50 
                                               bg-white dark:bg-gray-600"
                                    />
                                    <span className="ml-3 text-gray-700 dark:text-gray-200">{t(`topics.${topic}`)}</span>
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>{t('tasks.noTopicsFound')} "{topicSearch}"</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center py-12">
                           <div className="text-center text-gray-500 dark:text-gray-400">
                             <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                             <p className="text-lg">{t('tasks.selectSubjectPlaceholder')}</p>
                           </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                     <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                       <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                       {t('tasks.difficultyDistribution')}
                     </h3>
                    <DifficultySlider 
                      value={difficultyDistribution} 
                      onChange={setDifficultyDistribution} 
                    />
                  </div>

                  {/* Configuration Summary */}
                  {(selectedSubject || customTopic || selectedTypes.size > 0 || selectedTopics.size > 0) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 
                               rounded-2xl border border-blue-200 dark:border-blue-800 p-6"
                    >
                       <div className="flex items-center gap-2 mb-4">
                         <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                         <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                           {t('tasks.configSummary')}
                         </h3>
                       </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                         <div>
                           <span className="text-gray-600 dark:text-gray-400">{t('tasks.subject')}:</span>
                          <span className="ml-2 font-semibold text-gray-800 dark:text-gray-200">
                            {selectedSubject ? t(`subjects.${selectedSubject}`) : 'General'}
                          </span>
                        </div>
                         <div>
                           <span className="text-gray-600 dark:text-gray-400">{t('tasks.numberOfTasks')}:</span>
                          <span className="ml-2 font-semibold text-gray-800 dark:text-gray-200">
                            {taskCount}
                          </span>
                        </div>
                         <div>
                           <span className="text-gray-600 dark:text-gray-400">{t('tasks.taskTypes')}:</span>
                           <span className="ml-2 font-semibold text-gray-800 dark:text-gray-200">
                             {selectedTypes.size > 0 ? Array.from(selectedTypes).join(', ') : t('tasks.noneSelected')}
                           </span>
                         </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">{t('tasks.topics')}:</span>
                          <span className="ml-2 font-semibold text-gray-800 dark:text-gray-200">
                            {selectedTopics.size + (customTopic ? 1 : 0)} selected
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Progress Display */}
                <AnimatePresence>
                  {loading && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 
                               rounded-2xl border border-blue-200 dark:border-blue-800 p-6 space-y-4"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        {generationStep === 'planning' ? (
                          <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-pulse" />
                        ) : (
                          <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        )}
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                          {generationStep === 'planning' 
                            ? 'Creating Task Generation Plan...' 
                            : `Generating Tasks (${progress.current}/${progress.total})...`}
                        </h3>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                          initial={{ width: 0 }}
                          animate={{ 
                            width: `${(progress.current / progress.total) * 100}%` 
                          }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        {generationStep === 'planning' 
                          ? 'Analyzing requirements and creating a strategic plan...' 
                          : `Task ${progress.current} of ${progress.total}`}
                      </p>

                      {/* Task Plan Preview */}
                      {taskPlan && generationStep === 'generating' && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800"
                        >
                          <div className="flex items-center gap-2 mb-4">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              Plan Created Successfully
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-3">
                            <div>
                              <div className="text-gray-500 dark:text-gray-400 mb-1">Topics</div>
                              <div className="font-semibold text-gray-700 dark:text-gray-300 text-base">
                                {Object.keys(taskPlan.topicCoverage).length}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500 dark:text-gray-400 mb-1">Easy</div>
                              <div className="font-semibold text-green-600 dark:text-green-400 text-base">
                                {taskPlan.difficultyDistribution.easy}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500 dark:text-gray-400 mb-1">Medium</div>
                              <div className="font-semibold text-yellow-600 dark:text-yellow-400 text-base">
                                {taskPlan.difficultyDistribution.medium}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500 dark:text-gray-400 mb-1">Hard</div>
                              <div className="font-semibold text-red-600 dark:text-red-400 text-base">
                                {taskPlan.difficultyDistribution.hard}
                              </div>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Topic Coverage:</div>
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(taskPlan.topicCoverage).map(([topic, count]) => (
                                <Badge
                                  key={topic}
                                  variant="outline"
                                  className="text-xs px-2 py-0.5"
                                >
                                  {topic} ({count})
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="pt-6"
                >
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full p-4 rounded-xl bg-blue-600
                             text-white font-semibold text-lg
                             hover:bg-blue-700
                             focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all duration-200
                             flex items-center justify-center gap-3
                             shadow-md
                             hover:shadow-lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        {generationStep === 'planning' ? (t('tasks.planningTasks') || 'Planning tasks...') : (t('tasks.generatingTasks') || 'Generating Tasks...')}
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-6 h-6" />
                        {t('tasks.generate')}
                      </>
                    )}
                  </button>
                </motion.div>
              </form>
            </div>
        </div>
    </PageLayout>
  );
};

export default TaskForm;
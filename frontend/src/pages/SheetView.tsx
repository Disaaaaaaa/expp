import React, { useState, useEffect, useMemo } from 'react';
import { useLanguageStore } from '@/store/languageStore';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit, Download, Trash2, Clock, ChevronDown, ChevronUp, FileText, BarChart3, Tag, TrendingUp, BookOpen, Users } from 'lucide-react';
import { PageLayout } from '@/layouts/PageLayout';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/components/Toast';
import { getSheetById, deleteSheets } from '@/services/supabase';
import { TaskSheet } from '@/types/supabase';
import { Question } from '@/types/exam';
import { SheetExportModal } from '@/features/sheets/components/SheetExportModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { renderMarkdownWithMath } from '@/utils/mathFormatting';
import { useAuthStore } from '@/store/authStore';
import { assignSheetToStudent, getAllStudents } from '@/services/supabase';
import { getProfile } from '@/services/profile';

export const SheetView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [sheet, setSheet] = useState<TaskSheet | null>(null);
  const [tasks, setTasks] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [visibleSolutions, setVisibleSolutions] = useState<Set<string>>(new Set());
  const { t } = useLanguageStore();
  const { user } = useAuthStore();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  
  useEffect(() => {
    if (id) {
      loadSheet(id);
    }
    if (user) {
      getProfile(user.id).then(profile => {
        setUserProfile(profile);
        if (profile?.role === 'teacher') {
          getAllStudents().then(setStudents);
        }
      });
    }
  }, [id, user]);
  
  const loadSheet = async (sheetId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getSheetById(sheetId);
      setSheet(data.sheet);
      setTasks(data.tasks.map(task => ({
        id: task.id,
        text: task.text,
        type: task.type,
        topic: task.topic,
        difficulty: task.difficulty,
        solution: task.solution,
        answer: task.answers?.answer || null,
      })));
    } catch (err) {
      console.error('Error loading sheet:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sheet');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await deleteSheets([id]);
      showToast(t('sheets.deleteSuccess') || 'Sheet deleted successfully', 'success');
      navigate('/sheets');
    } catch (err) {
      console.error('Error deleting sheet:', err);
      showToast(err instanceof Error ? err.message : 'Failed to delete sheet', 'error');
    }
  };
  
  const handleAssign = async () => {
    if (!studentEmail || !id) return;
    
    try {
      setIsAssigning(true);
      await assignSheetToStudent(id, studentEmail);
      showToast(t('sheets.assignSuccess') || 'Task assigned successfully!', 'success');
      setShowAssignModal(false);
      setStudentEmail('');
    } catch (err) {
      console.error('Error assigning task:', err);
      showToast(err instanceof Error ? err.message : 'Failed to assign task', 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
 
  
  const toggleSolution = (taskId: string) => {
    const newVisibleSolutions = new Set(visibleSolutions);
    if (newVisibleSolutions.has(taskId)) {
      newVisibleSolutions.delete(taskId);
    } else {
      newVisibleSolutions.add(taskId);
    }
    setVisibleSolutions(newVisibleSolutions);
  };

  const handleStartPractice = () => {
    if (tasks.length === 0) {
      showToast('No tasks available to practice', 'error');
      return;
    }
    navigate('/task-completion', {
      state: {
        questions: tasks,
        sheetId: id
      }
    });
  };

  // Calculate statistics
  const statistics = useMemo(() => {
    if (tasks.length === 0) {
      return {
        totalTasks: 0,
        difficultyDistribution: { easy: 0, medium: 0, hard: 0 },
        topicDistribution: {} as Record<string, number>,
        typeDistribution: {} as Record<string, number>
      };
    }

    const difficultyDistribution = {
      easy: tasks.filter(t => t.difficulty === 'easy').length,
      medium: tasks.filter(t => t.difficulty === 'medium').length,
      hard: tasks.filter(t => t.difficulty === 'hard').length
    };

    const topicDistribution = tasks.reduce((acc, task) => {
      acc[task.topic] = (acc[task.topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typeDistribution = tasks.reduce((acc, task) => {
      acc[task.type] = (acc[task.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTasks: tasks.length,
      difficultyDistribution,
      topicDistribution,
      typeDistribution
    };
  }, [tasks]);
  
  if (loading) {
    return (
      <PageLayout maxWidth="xl">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </PageLayout>
    );
  }
  
  if (error) {
    return (
      <PageLayout maxWidth="xl">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-red-600 mb-4">{t('common.error')}</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button
            variant="primary"
            onClick={() => navigate('/sheets')}
          >
            Back to Sheets
          </Button>
        </div>
      </PageLayout>
    );
  }
  
  if (!sheet) {
    return (
      <PageLayout maxWidth="xl">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Sheet Not Found</h2>
          <p className="text-gray-600 mb-6">{t('sheets.loadError')}</p>
          <Button
            variant="primary"
            onClick={() => navigate('/sheets')}
          >
            Back to Sheets
          </Button>
        </div>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout maxWidth="xl">
      <div className="mb-6">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/sheets')}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t('tasks.back') || 'Артқа'}
        </motion.button>
      </div>

      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{sheet.title}</h1>
            {sheet.description && (
              <p className="text-gray-600 dark:text-gray-400 text-lg">{sheet.description}</p>
            )}
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-3">
              <Clock className="w-4 h-4 mr-1" />
              {t('sheets.createdAt') || 'Created on'} {formatDate(sheet.created_at)}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {userProfile?.role === 'teacher' && (
              <Button
                variant="primary"
                icon={<Users className="w-4 h-4" />}
                onClick={() => setShowAssignModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {t('sheets.sendToStudent') || 'Оқушыға жіберу'}
              </Button>
            )}
            <Button
              variant="ghost"
              icon={<Edit className="w-4 h-4" />}
              onClick={() => navigate(`/sheets/${id}/edit`)}
              className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {t('sheets.edit') || 'Өңдеу'}
            </Button>
            <Button
              variant="ghost"
              icon={<Download className="w-4 h-4" />}
              onClick={() => setShowExportModal(true)}
              className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {t('sheets.export') || 'Жүктеу'}
            </Button>
            <Button
              variant="ghost"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              {t('sheets.delete') || 'Жою'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Statistics Section */}
      {tasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mb-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Total Tasks Card */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {t('sheets.totalTasks') || 'Жалпы тапсырмалар'}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-blue-700 dark:text-blue-300">
                    {statistics.totalTasks}
                  </span>
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    {statistics.totalTasks === 1 ? (t('sheets.task') || 'тапсырма') : (t('sheets.tasks') || 'тапсырмалар')}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Difficulty Distribution Card */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  {t('tasks.difficultyDistribution') || 'Difficulty Distribution'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(['easy', 'medium', 'hard'] as const).map((difficulty) => {
                    const count = statistics.difficultyDistribution[difficulty];
                    const percentage = statistics.totalTasks > 0 
                      ? Math.round((count / statistics.totalTasks) * 100) 
                      : 0;
                    const colors = {
                      easy: 'bg-green-500 dark:bg-green-400',
                      medium: 'bg-yellow-500 dark:bg-yellow-400',
                      hard: 'bg-red-500 dark:bg-red-400'
                    };
                    const textColors = {
                      easy: 'text-green-700 dark:text-green-300',
                      medium: 'text-yellow-700 dark:text-yellow-300',
                      hard: 'text-red-700 dark:text-red-300'
                    };
                    
                    return (
                      <div key={difficulty} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className={`font-medium capitalize ${textColors[difficulty]}`}>
                            {difficulty}
                          </span>
                          <span className={`font-semibold ${textColors[difficulty]}`}>
                            {count} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className={`h-full ${colors[difficulty]} rounded-full`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Question Types Distribution Card */}
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border-indigo-200 dark:border-indigo-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  {t('tasks.taskTypes') || 'Question Types'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(statistics.typeDistribution).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(statistics.typeDistribution)
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, count]) => {
                        const percentage = Math.round((count / statistics.totalTasks) * 100);
                        return (
                          <div key={type} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-indigo-700 dark:text-indigo-300 capitalize">
                                {type}
                              </span>
                              <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                                {count} ({percentage}%)
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full"
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-sm text-indigo-600 dark:text-indigo-400">{t('tasks.noneSelected')}</p>
                )}
              </CardContent>
            </Card>

            {/* Topics Distribution Card */}
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  {t('tasks.topicsCovered') || 'Topics Covered'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(statistics.topicDistribution).length > 0 ? (
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                    {Object.entries(statistics.topicDistribution)
                      .sort(([, a], [, b]) => b - a)
                      .map(([topic, count]) => {
                        const percentage = Math.round((count / statistics.totalTasks) * 100);
                        return (
                          <div key={topic} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-emerald-700 dark:text-emerald-300 truncate flex-1 mr-2">
                                {topic}
                              </span>
                              <span className="font-semibold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                                {count} ({percentage}%)
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                                className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full"
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">{t('tasks.noneSelected')}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}
      
      {/* Tasks Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {t('nav.taskSheets') || 'Тапсырмалар'}
            <span className="text-lg font-normal text-gray-500 dark:text-gray-400">
              ({tasks.length})
            </span>
          </h2>
        </div>
          
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-lg text-gray-500 dark:text-gray-400">{t('sheets.noTasksAdded')}</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">{t('sheets.addTasks')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {t('sheets.task') || 'Тапсырма'} {index + 1}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        task.difficulty === 'easy' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
                          : task.difficulty === 'medium'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                      }`}>
                        {task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1)}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                        <Tag className="w-3 h-3 inline mr-1" />
                        {task.topic}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                        {task.type}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-gray-900 dark:text-white text-base leading-relaxed">
                    {renderMarkdownWithMath(task.text)}
                  </div>
                  
                  <div className="mt-4 flex justify-start">
                    <button
                      onClick={() => toggleSolution(task.id)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      {visibleSolutions.has(task.id) ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          {t('sheets.hideSolution') || 'Шешімді жасыру'}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          {t('sheets.showSolution') || 'Шешімді көрсету'}
                        </>
                      )}
                    </button>
                  </div>
                  
                  {visibleSolutions.has(task.id) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 space-y-4 overflow-hidden"
                    >
                      {task.solution && (
                        <div className="p-4 rounded-lg bg-blue-50/80 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                          <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
                             {t('tasks.solution')}:
                          </h4>
                          <div className="prose dark:prose-invert prose-sm max-w-none text-blue-800 dark:text-blue-200 katex-text break-words">
                            {renderMarkdownWithMath(task.solution)}
                          </div>
                        </div>
                      )}
                      
                      {task.answer && (
                        <div className="p-4 rounded-lg bg-green-50/80 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                          <h4 className="font-semibold text-green-900 dark:text-green-300 mb-3 flex items-center gap-2">
                            {t('tasks.answer')}:
                          </h4>
                          <div className="prose dark:prose-invert prose-sm max-w-none text-green-800 dark:text-green-200 katex-text break-words">
                            {renderMarkdownWithMath(task.answer)}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
      </motion.div>
      
     
      {showExportModal && sheet && (
        <SheetExportModal
          onClose={() => setShowExportModal(false)}
          tasks={tasks}
          sheetTitle={sheet.title}
        />
      )}
      
      
      {showDeleteConfirm && sheet && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md mx-4 w-full border border-gray-200 dark:border-gray-700"
          >
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('sheets.deleteSheet') || 'Delete Sheet'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {t('sheets.deleteConfirm') || `Are you sure you want to delete "${sheet.title}"? This action cannot be undone.`}
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {t('sheets.delete')}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      {/* Assignment Modal */}
      {showAssignModal && (
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]"
         >
           <motion.div
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-100 dark:border-gray-700"
           >
             <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('sheets.sendToStudent') || 'Оқушыға жіберу'}</h3>
             <p className="text-gray-600 dark:text-gray-400 mb-6">{t('sheets.enterStudentEmail') || 'Тапсырманы жіберу үшін оқушының э-поштасын таңдаңыз немесе жазыңыз.'}</p>
             
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Student</label>
                 <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl mb-4">
                   {students.map(student => (
                     <button
                        key={student.id}
                        onClick={() => setStudentEmail(student.email)}
                        className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          studentEmail === student.email ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500 ring-inset' : ''
                        }`}
                     >
                       <div className="font-semibold text-gray-900 dark:text-white">{student.first_name} {student.last_name}</div>
                       <div className="text-xs text-gray-500">{student.email}</div>
                     </button>
                   ))}
                   {students.length === 0 && (
                     <div className="p-4 text-center text-gray-500 text-sm italic">No students found</div>
                   )}
                 </div>
                 
                 <div className="relative">
                   <div className="absolute inset-0 flex items-center">
                     <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                   </div>
                   <div className="relative flex justify-center text-xs uppercase">
                     <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">Or enter Email</span>
                   </div>
                 </div>

                 <input
                   type="email"
                   value={studentEmail}
                   onChange={(e) => setStudentEmail(e.target.value)}
                   placeholder="student@example.com"
                   className="mt-4 w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500"
                 />
               </div>
               
               <div className="flex gap-4 pt-2">
                 <button
                   onClick={() => setShowAssignModal(false)}
                   className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 transition-colors"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={handleAssign}
                   disabled={!studentEmail || isAssigning}
                   className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                 >
                   {isAssigning ? 'Sending...' : 'Send Task'}
                 </button>
               </div>
             </div>
           </motion.div>
         </motion.div>
      )}

      {tasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="fixed bottom-4 sm:bottom-8 right-4 sm:right-8 z-50"
        >
          <button
            onClick={handleStartPractice}
            className="flex items-center px-5 sm:px-7 py-3 sm:py-4 bg-gradient-to-r from-green-600 to-green-700 text-white 
                     rounded-full hover:from-green-700 hover:to-green-800 transition-all duration-200 
                     shadow-xl hover:shadow-2xl transform hover:scale-105 font-semibold"
          >
            <Clock className="h-5 w-5 mr-2" />
            <span className="hidden sm:inline">{t('tasks.startPractice') || 'Start Practice'}</span>
            <span className="sm:hidden">{t('tasks.practice') || 'Practice'}</span>
          </button>
        </motion.div>
      )}
    </PageLayout>
  );
}; 
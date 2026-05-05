import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskStore } from '@/store/taskStore';
import { ArrowLeft, Save, Download, FileText, GripVertical, Edit2, X, Clock, ChevronDown, ChevronUp, Plus, PlusCircle, Trash2, CheckCircle, AlertTriangle, BookOpen, Eye, EyeOff } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { useLanguageStore } from '@/store/languageStore';
import { DragDropContext, Droppable, Draggable, DroppableProps } from '@hello-pangea/dnd';
import type { Question } from '@/types/exam';
import { TaskEditor } from '@/features/tasks/components/TaskEditor';
import type { DropResult } from '@hello-pangea/dnd';
import { StrictModeDroppable } from '@/components/StrictModeDroppable';
import { TaskPreviewActions } from '@/features/tasks/components/TaskPreviewActions';
import { downloadDocument } from '@/services/documentGenerator';
import { deleteTasks } from '@/services/supabase';
import { useToast } from '@/components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { TaskCreator } from '@/features/tasks/components/TaskCreation';
import { supabase } from '@/services/supabase';
import { v4 as uuidv4 } from 'uuid';
import { SheetExportModal } from '@/features/sheets/components/SheetExportModal';
import { SheetDownloadModal } from '@/features/sheets/components/SheetDownloadModal';
import { SaveSheet } from '@/features/sheets/components/SaveSheet';
import { TaskSheet } from '@/types/supabase';
import { Button } from '@/components/common/Button';
import { TaskEditModal } from '@/features/tasks/components/TaskEditModal';
import { renderMarkdownWithMath } from '@/utils/mathFormatting';

const styles = `
  .solution-text {
    overflow-x: auto;
  }
  .solution-text .katex-display {
    margin: 1em 0;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0.5em 0;
  }
  .solution-text .katex {
    font-size: 1.1em;
  }
  .task-creator-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 2rem;
    z-index: 50;
    overflow-y: auto;
  }
  .task-editor-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 2rem;
    z-index: 50;
    overflow-y: auto;
  }
  .delete-confirm-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 50;
  }
`;


export const TaskPreview = () => {
  const navigate = useNavigate();
  const { questions, updateQuestion, reorderQuestions, setQuestions } = useTaskStore();
  const { t } = useLanguageStore();
  const [error, setError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Question | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [documentOptions, setDocumentOptions] = useState({
    includeSolutions: false,
    includeAnswers: false
  });
  const { showToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showSaveSheet, setShowSaveSheet] = useState(false);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !result.draggableId) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;
    
    reorderQuestions(sourceIndex, destinationIndex);
  };

  const handleEdit = (task: Question) => {
    setEditingTask(task);
  };

  const handleSave = async (updatedTask: Question) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          text: updatedTask.text,
          type: updatedTask.type,
          topic: updatedTask.topic,
          difficulty: updatedTask.difficulty,
          solution: updatedTask.solution,
          answer: updatedTask.answer,
        })
        .eq('id', updatedTask.id);

      if (error) throw error;

      // Update local state
      const newQuestions = questions.map(q => 
        q.id === updatedTask.id ? updatedTask : q
      );
      updateQuestion(questions.findIndex(q => q.id === updatedTask.id), updatedTask);

      setEditingTask(null);
      showToast(t('tasks.updateSuccess'), 'success');
    } catch (err) {
      console.error('Error updating task:', err);
      showToast('Failed to update task', 'error');
      throw err;
    }
  };

  const handleCancel = () => {
    setEditingTask(null);
  };

  const handleStartPractice = () => {
    navigate('/task-completion', {
      state: {
        questions
      }
    });
  };

  const toggleTask = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const handleSaveComplete = async () => {
    try {
      if (selectedTasks.size === 0) {
        showToast(t('tasks.errorSelectExport'), 'error');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Only save selected tasks
      const tasksToSave = questions
        .filter(task => selectedTasks.has(task.id))
        .map(task => ({
          id: task.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i) 
            ? task.id 
            : uuidv4(),
          text: task.text,
          type: task.type,
          topic: task.topic,
          difficulty: task.difficulty,
          solution: task.solution,
          answers: task.answer ? { answer: task.answer } : null,
          user_id: user.id
        }));

      const { error } = await supabase
        .from('tasks')
        .upsert(tasksToSave, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      showToast(`${selectedTasks.size} ${t('tasks.saveSuccess')}`, 'success');
      
      // Optionally, you can also save the task sheet as a collection
      if (tasksToSave.length > 1) {
        const sheetId = uuidv4();
        const { error: sheetError } = await supabase
          .from('task_sheets')
          .insert({
            id: sheetId,
            title: `Task Sheet - ${new Date().toLocaleDateString()}`,
            description: `Task sheet with ${tasksToSave.length} tasks`,
            user_id: user.id,
            task_ids: tasksToSave.map(t => t.id),
            created_at: new Date().toISOString()
          });
        
        if (sheetError) {
          console.error('Error saving task sheet:', sheetError);
        } else {
          showToast('Task sheet also saved to sheets library', 'success');
        }
      }
      
      navigate('/library');
    } catch (error) {
      console.error('Error saving tasks:', error);
      showToast('Failed to save tasks to library', 'error');
    }
  };

  const handleCreateTask = (task: Question) => {
    setQuestions([...questions, task]);
    setIsCreating(false);
  };

  const handleExportClick = () => {
    if (selectedTasks.size === 0) {
      showToast(t('tasks.errorSelectExport'), 'error');
      return;
    }
    setShowExportModal(true);
  };

  const handleDelete = () => {
    if (selectedTasks.size === 0) {
      showToast('Please select tasks to delete', 'error');
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      setQuestions(questions.filter(task => !selectedTasks.has(task.id)));
      setSelectedTasks(new Set());
      setShowDeleteConfirm(false);
      showToast(t('tasks.deleteSuccess'), 'success');
    } catch (error) {
      showToast('Failed to delete tasks', 'error');
      console.error('Delete error:', error);
    }
  };

  const handleSaveAsSheet = async (title: string, tasks: Question[], description?: string) => {
    try {
      setError(null);
      
      if (tasks.length === 0) {
        setError("No tasks selected to save");
        return;
      }
      
      // Save to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError("You must be logged in to save sheets");
        return;
      }
      
      // First, save all tasks to the tasks library
      const tasksForLibrary = tasks.map(task => ({
        id: task.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i) 
          ? task.id 
          : uuidv4(),
        text: task.text,
        type: task.type,
        topic: task.topic,
        difficulty: task.difficulty,
        solution: task.solution,
        answers: task.answer ? { answer: task.answer } : null,
        user_id: user.id
      }));

      // Upsert tasks to the tasks table
      const { error: tasksError } = await supabase
        .from('tasks')
        .upsert(tasksForLibrary, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });
      
      if (tasksError) throw tasksError;
      
      // Make sure we use the potentially new IDs for the sheet
      const taskIds = tasksForLibrary.map(t => t.id);
      
      // Then save the sheet with references to those tasks
      const sheetData = {
        user_id: user.id,
        title: title,
        description: description || '',
        tasks: taskIds
      };
      
      const { error: saveError } = await supabase
        .from('task_sheets')
        .insert(sheetData);
      
      if (saveError) throw saveError;
      
      showToast("Sheet and tasks saved successfully", "success");
      setShowSaveSheet(false);
      
      // Optionally navigate to the sheets library
      navigate('/sheets');
    } catch (err) {
      console.error("Error saving sheet:", err);
      setError(err instanceof Error ? err.message : "Failed to save sheet");
      showToast("Failed to save sheet", "error");
    }
  };

  const handleDownloadClick = () => {
    if (selectedTasks.size === 0) {
      showToast('Please select tasks to download', 'error');
      return;
    }
    setShowDownloadModal(true);
  };

  const DownloadMenu = () => (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute right-0 mt-2 w-72 bg-gray-800 rounded-xl shadow-lg p-4 z-10 border border-gray-700"
    >
      <h3 className="text-lg font-semibold mb-4 text-white">{t('tasks.downloadOptions')}</h3>
      
      <div className="space-y-3 mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={documentOptions.includeSolutions}
            onChange={(e) => setDocumentOptions(prev => ({
              ...prev,
              includeSolutions: e.target.checked
            }))}
            className="rounded border-gray-600 bg-gray-700 text-blue-500"
          />
          <span className="text-gray-300">{t('tasks.includeSolutions')}</span>
        </label>
        
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={documentOptions.includeAnswers}
            onChange={(e) => setDocumentOptions(prev => ({
              ...prev,
              includeAnswers: e.target.checked
            }))}
            className="rounded border-gray-600 bg-gray-700 text-blue-500"
          />
          <span className="text-gray-300">{t('tasks.includeAnswers')}</span>
        </label>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleExportClick()}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg
                   hover:bg-blue-700 transition-all duration-200 hover:scale-105 
                   hover:shadow-lg active:scale-95"
        >
          {t('sheets.export')}
        </button>
      </div>
    </motion.div>
  );

  const renderEmptyState = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gray-800 rounded-xl shadow-lg p-8 text-center border border-gray-700"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
         <h3 className="text-xl font-semibold text-white mb-2">
          {t('tasks.noTasks')}
        </h3>
        <p className="text-gray-400 mb-8">
          {t('tasks.getStarted')}
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="secondary"
            icon={<Plus className="w-5 h-5" />}
             onClick={() => setIsCreating(true)}
            className="shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
          >
            {t('tasks.createTask')}
          </Button>
          <Button
            variant="primary"
            icon={<FileText className="w-5 h-5" />}
             onClick={() => navigate('/generate-task')}
            className="shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
          >
            {t('nav.generateTask')}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );

  if (questions.length === 0) {
    return (
      <>
        <style>{styles}</style>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6 bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-700">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-300 hover:text-white rounded-full 
                       transition-all duration-200 hover:scale-105 hover:bg-gray-700/50 px-2 py-1"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              {t('tasks.back')}
            </button>
          </div>

          <div className="text-center py-12">
            {renderEmptyState()}
          </div>

         
          <AnimatePresence>
            {isCreating && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="task-creator-overlay"
              >
                <motion.div
                  initial={{ y: -20 }}
                  animate={{ y: 0 }}
                  exit={{ y: -20 }}
                  className="w-full max-w-3xl mx-4"
                >
                  <TaskCreator
                    onCreate={handleCreateTask}
                    onCancel={() => setIsCreating(false)}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </>
    );
  }
  console.log(questions[0].solution)
  return (
    <>
      <style>{styles}</style>
      <div className="max-w-6xl mx-auto px-4 py-8 relative min-h-screen">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 
                    bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 
                    border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto mb-4 sm:mb-0">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 dark:text-gray-300 
                       hover:text-gray-900 dark:hover:text-white rounded-full
                       transition-all duration-200 hover:scale-105 hover:bg-gray-100 dark:hover:bg-gray-700/50 px-2 py-1"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              {t('tasks.back')}
            </button>

            {questions.length > 0 && (
              <>
                <div className="hidden sm:block h-6 w-px bg-gray-200 dark:bg-gray-700" /> 
                <button
                  onClick={() => {
                    if (selectedTasks.size === questions.length) {
                      setSelectedTasks(new Set());
                    } else {
                      setSelectedTasks(new Set(questions.map(q => q.id)));
                    }
                  }}
                  className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white
                           transition-all duration-200 hover:scale-105 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50"
                >
                  {selectedTasks.size === questions.length ? t('tasks.deselectAll') : t('tasks.selectAll')}
                </button>

                {selectedTasks.size > 0 && (
                  <>
                    <div className="hidden sm:block h-6 w-px bg-gray-200 dark:bg-gray-700" /> 
                     <span className="text-sm text-gray-600 dark:text-gray-300">
                      {selectedTasks.size} {t('tasks.selected')}
                    </span>
                  </>
                )}
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <button
              onClick={() => setIsCreating(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 
                       bg-blue-600 text-white rounded-full hover:bg-blue-700 
                       transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
             >
              <PlusCircle className="w-5 h-5" />
              <span className="hidden sm:inline">{t('tasks.createTask')}</span>
            </button>
            
            <button
              onClick={handleDelete}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 
                       text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 
                       rounded-full transition-all duration-200 hover:scale-105 hover:shadow-md 
                       active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={selectedTasks.size === 0}
             >
              <Trash2 className="w-5 h-5" />
              <span className="hidden sm:inline">{t('sheets.delete')}</span>
            </button>

            <button
              onClick={handleDownloadClick}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 
                       bg-green-600 text-white rounded-full hover:bg-green-700 
                       transition-all duration-200 hover:scale-105 hover:shadow-lg 
                       active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={selectedTasks.size === 0}
             >
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">{t('sheets.export')}</span>
            </button>

            <button
              onClick={() => setShowSaveSheet(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 
                       bg-blue-600 text-white rounded-full hover:bg-blue-700 
                       transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
             >
              <Save className="w-5 h-5" />
              <span className="hidden sm:inline">{t('tasks.saveAsSheet')}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500 
                         text-red-600 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        <DragDropContext onDragEnd={handleDragEnd}>
          <StrictModeDroppable droppableId="tasks" type="TASK">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-4"
              >
                {questions.map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden cursor-pointer
                                  transition-all duration-200 border border-gray-200 dark:border-gray-700
                                  ${selectedTasks.has(task.id) ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30' : ''}`}
                        onClick={() => {
                          const newSelected = new Set(selectedTasks);
                          if (selectedTasks.has(task.id)) {
                            newSelected.delete(task.id);
                          } else {
                            newSelected.add(task.id);
                          }
                          setSelectedTasks(newSelected);
                        }}
                      >
                        <div className="p-4 sm:p-6">
                          <div className="flex items-start gap-4">
                            <div {...provided.dragHandleProps} className="mt-1 hidden sm:block">
                              <GripVertical className="h-5 w-5 text-gray-400" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="text-base sm:text-lg text-gray-900 dark:text-white mb-2">
                                {renderMarkdownWithMath(task.text)}
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm mb-4">
                                <span className={`px-2.5 py-1 rounded-full font-medium
                                  ${task.difficulty === 'easy'
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                    : task.difficulty === 'medium'
                                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                      : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                                  }`}>
                                  {task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1)}
                                </span>
                                <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 
                                               text-blue-700 dark:text-blue-300 rounded-full font-medium">
                                  {task.topic}
                                </span>
                                <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 
                                               text-purple-700 dark:text-purple-300 rounded-full font-medium">
                                  {task.type}
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTask(task.id);
                                  }}
                                  className="p-2 text-gray-600 dark:text-gray-400 
                                           hover:text-gray-900 dark:hover:text-gray-300 
                                           hover:bg-gray-100 dark:hover:bg-gray-700 
                                           rounded-full transition-all duration-200 
                                           hover:scale-110 active:scale-95"
                                >
                                  {expandedTasks.has(task.id) ? (
                                    <ChevronUp className="h-5 w-5" />
                                  ) : (
                                    <ChevronDown className="h-5 w-5" />
                                  )}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(task);
                                  }}
                                  className="p-2 text-gray-600 dark:text-gray-400 
                                           hover:text-gray-900 dark:hover:text-gray-300 
                                           hover:bg-gray-100 dark:hover:bg-gray-700 
                                           rounded-full transition-all duration-200 
                                           hover:scale-110 active:scale-95"
                                >
                                  <Edit2 className="h-5 w-5" />
                                </button>
                              </div>

                              {expandedTasks.has(task.id) && (
                                <div className="mt-4 space-y-4 animate-fadeIn">
                                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                                      {t('tasks.solution')}
                                    </h4>
                                    <div className="text-blue-800 dark:text-blue-200">
                                       {task.solution ? (
                                        renderMarkdownWithMath(task.solution)
                                      ) : (
                                        <span className="text-gray-500">{t('tasks.noSolution')}</span>
                                      )}
                                    </div>
                                  </div>

                                  {task.answer && (
                                    <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
                                      <h4 className="text-sm font-medium text-emerald-900 dark:text-emerald-300 mb-2">
                                        {t('tasks.answer')}
                                      </h4>
                                      <div className="text-emerald-800 dark:text-emerald-200">
                                        {renderMarkdownWithMath(task.answer)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </StrictModeDroppable>
        </DragDropContext>

        <div className="fixed bottom-4 sm:bottom-8 right-4 sm:right-8 z-50">
          <button
            onClick={handleStartPractice}
            className="flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white 
                     rounded-full hover:bg-green-700 transition-colors duration-200 
                     shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          >
             <Clock className="h-5 w-5 mr-2" />
            <span className="hidden sm:inline">{t('tasks.startPractice')}</span>
            <span className="sm:hidden">{t('tasks.practice')}</span>
          </button>
        </div>
      </div>

      
      <AnimatePresence>
        {editingTask && (
          <TaskEditModal
            task={editingTask}
            onSave={handleSave}
            onClose={() => setEditingTask(null)}
          />
        )}
      </AnimatePresence>

      
      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-3xl"
            >
              <TaskCreator
                onCreate={handleCreateTask}
                onCancel={() => setIsCreating(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      
      <AnimatePresence>
        {showDeleteConfirm && (
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
              className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md mx-4 w-full
                       border border-gray-700"
            >
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full 
                               bg-red-900/30 mb-6">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {t('tasks.confirmDeletion')}
                </h3>
                 <p className="text-sm text-gray-400 mb-8">
                  {t('tasks.deleteWarning')}
                </p>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="text-gray-300 hover:bg-gray-700 transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    {t('common.cancel') || 'Бас тарту'}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={confirmDelete}
                    className="bg-red-600 text-white hover:bg-red-700 transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
                  >
                    {t('tasks.deleteTasks') || 'Тапсырмаларды жою'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      
      <AnimatePresence>
        {showSaveSheet && (
          <SaveSheet
            selectedTasks={questions.filter(task => selectedTasks.has(task.id))}
            onSave={handleSaveAsSheet}
            onClose={() => setShowSaveSheet(false)}
          />
        )}
      </AnimatePresence>

      
      <AnimatePresence>
        {showDownloadModal && (
          <SheetDownloadModal
            onClose={() => setShowDownloadModal(false)}
            tasks={questions.filter(task => selectedTasks.has(task.id))}
            sheetTitle={t('tasks.selectedTasks') || 'Таңдалған тапсырмалар'}
          />
        )}
      </AnimatePresence>

      
      <AnimatePresence>
        {showExportModal && (
          <SheetExportModal
            onClose={() => setShowExportModal(false)}
            tasks={questions.filter(task => selectedTasks.has(task.id))}
            sheetTitle={t('tasks.selectedTasks') || 'Таңдалған тапсырмалар'}
          />
        )}
      </AnimatePresence>
    </>
  );
};
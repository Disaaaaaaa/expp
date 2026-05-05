import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { DragDropContext, Draggable, DropResult } from '@hello-pangea/dnd';
import { PageLayout } from '@/layouts/PageLayout';
import { supabase } from '@/services/supabase';
import { TaskSheet } from '@/types/supabase';
import { Question } from '@/types/exam';
import { ArrowLeft, Save, Trash2, GripVertical, Plus, AlertTriangle, Edit2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useLanguageStore } from '@/store/languageStore';
import { toast } from 'react-hot-toast';
import { StrictModeDroppable } from '@/components/StrictModeDroppable';
import { TaskSelectorModal } from '@/features/tasks/components/TaskSelectorModal';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { TaskEditModal } from '@/features/tasks/components/TaskEditModal';
import { renderMarkdownWithMath } from '@/utils/mathFormatting';

const styles = `
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
`;

export const SheetEdit = () => {
  const { t } = useLanguageStore();
  const { id } = useParams();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<TaskSheet | null>(null);
  const [tasks, setTasks] = useState<Question[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editingTask, setEditingTask] = useState<Question | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  
  useEffect(() => {
    if (hasUnsavedChanges) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [hasUnsavedChanges]);

  
  useEffect(() => {
    loadSheet();
  }, [id]);

  const loadSheet = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: sheetData, error: sheetError } = await supabase
        .from('task_sheets')
        .select('*')
        .eq('id', id)
        .single();

      if (sheetError) throw sheetError;
      
      setSheet(sheetData);
      setTitle(sheetData.title);
      setDescription(sheetData.description || '');

      if (sheetData?.tasks?.length) {
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .in('id', sheetData.tasks);

        if (tasksError) throw tasksError;
        
        const orderedTasks = sheetData.tasks
          .map((taskId: string) => {
            const task = tasksData?.find(t => t.id === taskId);
            if (task) {
              return {
                id: task.id,
                text: task.text,
                type: task.type,
                topic: task.topic,
                difficulty: task.difficulty,
                solution: task.solution,
                answer: task.answers?.answer || null,
              };
            }
            return null;
          })
          .filter(Boolean) as Question[];
        
        setTasks(orderedTasks);
      }
    } catch (error) {
      console.error('Error loading sheet:', error);
      setError(t('sheets.loadError') || 'Failed to load task sheet. Please try again.');
      toast.error(t('sheets.loadError') || 'Failed to load task sheet');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setSaving(true);
      
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      
      const updateData = {
        title,
        description: description || null,
        tasks: tasks.map(task => task.id),  
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('task_sheets')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setHasUnsavedChanges(false);
      toast.success(t('sheets.updateSuccess') || 'Sheet updated successfully');
      navigate(`/sheets/${id}`);
    } catch (error) {
      console.error('Error updating sheet:', error);
      toast.error('Failed to update sheet');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
    setHasUnsavedChanges(true);
    toast.success('Task removed from sheet');
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(tasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setTasks(items);
    setHasUnsavedChanges(true);
  };

  const handleAddTasks = (selectedTasks: Question[]) => {
    setTasks(prev => [...prev, ...selectedTasks]);
    setShowTaskSelector(false);
    setHasUnsavedChanges(true);
    toast.success(`Added ${selectedTasks.length} task(s) to sheet`);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'title') setTitle(value);
    if (name === 'description') setDescription(value);
    setHasUnsavedChanges(true);
  };

  const handleEditTask = async (updatedTask: Question) => {
    setTasks(prev => prev.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));
    setEditingTask(null);
    setHasUnsavedChanges(true);
    toast.success('Task updated');
  };


  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="flex flex-col items-center justify-center h-64">
          <AlertTriangle className="w-12 h-12 text-red-500 dark:text-red-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-300">{error}</p>
          <Button
            variant="primary"
            size="sm"
            onClick={loadSheet}
            className="mt-4"
          >
            {t('tasks.tryAgain')}
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="2xl">
      <style>{styles}</style>
      <div className="space-y-6">
        
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (hasUnsavedChanges) {
                if (window.confirm(t('settings.unsavedLeaveWarning') || 'You have unsaved changes. Are you sure you want to leave?')) {
                  navigate(-1);
                }
              } else {
                navigate(-1);
              }
            }}
            className="inline-flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('nav.back') || 'Back'}
          </button>

          <div className="flex items-center gap-4">
            <Button
              variant="primary"
              icon={<Save className="w-4 h-4" />}
              onClick={handleSave}
              disabled={saving}
              className="dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              {saving ? (t('settings.saving') || 'Saving...') : (t('settings.saveSettings') || 'Save Changes')}
            </Button>
          </div>
        </div>

        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <div className="space-y-4">
            <input
              type="text"
              name="title"
              value={title}
              onChange={handleInputChange}
              placeholder={t('sheets.sheetTitle') || "Sheet Title"}
              className="w-full text-2xl font-semibold bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-700 focus:ring-0 focus:border-blue-500 dark:focus:border-blue-400 px-0 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
            <textarea
              name="description"
              value={description}
              onChange={handleInputChange}
              placeholder={t('settings.description') || "Add a description..."}
              rows={3}
              className="w-full bg-transparent border-0 focus:ring-0 resize-none text-gray-600 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('sheets.tasks')}</h2>
            <Button
              variant="secondary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowTaskSelector(true)}
              className="dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:border-gray-600"
            >
              {t('sheets.addTasks') || 'Add Tasks'}
            </Button>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <StrictModeDroppable droppableId="tasks">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-3"
                >
                  {tasks.map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="group bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-100 dark:border-gray-600/50 hover:border-blue-200 dark:hover:border-blue-500/30 transition-colors"
                        >
                          <div className="flex flex-col w-full">
                            <div className="flex items-start gap-4 w-full">
                              <div
                                {...provided.dragHandleProps}
                                className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                              </div>
                              
                              <div className="flex-grow">
                                <div className="flex gap-2 mb-2 flex-wrap">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium
                                    ${task.difficulty === 'easy'
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                      : task.difficulty === 'medium'
                                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                    }`}
                                  >
                                    {task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1)}
                                  </span>
                                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs">
                                    {task.topic}
                                  </span>
                                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs">
                                    {task.type}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTaskExpanded(task.id);
                                  }}
                                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600/50"
                                >
                                  {expandedTasks.has(task.id) ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => setEditingTask(task)}
                                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600/50"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRemoveTask(task.id)}
                                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600/50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="mt-4 text-gray-900 dark:text-white font-medium w-full pl-9 pr-4">
                              {renderMarkdownWithMath(task.text)}
                            </div>

                            {expandedTasks.has(task.id) && (
                              <div className="mt-4 space-y-4 w-full pl-9 pr-9">
                                <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                                  <div className="font-medium text-blue-900 dark:text-blue-300 mb-2">Solution:</div>
                                  <div className="prose dark:prose-invert prose-sm max-w-none text-blue-800 dark:text-blue-200 katex-text break-words">
                                    {renderMarkdownWithMath(task.solution || 'No solution provided')}
                                  </div>
                                </div>
                                <div className="p-4 rounded-lg bg-green-50/50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                                  <div className="font-medium text-green-900 dark:text-green-300 mb-2">Answer:</div>
                                  <div className="prose dark:prose-invert prose-sm max-w-none text-green-800 dark:text-green-200 katex-text break-words">
                                    {renderMarkdownWithMath(task.answer || 'No answer provided')}
                                  </div>
                                </div>
                              </div>
                            )}
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

          {tasks.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">{t('sheets.noTasksAdded') || 'No tasks added yet. Click "Add Tasks" to get started.'}</p>
            </div>
          )}
        </div>
      </div>

      
      <AnimatePresence>
        {showTaskSelector && (
          <TaskSelectorModal
            onClose={() => setShowTaskSelector(false)}
            onSelect={handleAddTasks}
            existingTaskIds={tasks.map(t => t.id)}
          />
        )}
      </AnimatePresence>

      
      <AnimatePresence>
        {editingTask && (
          <TaskEditModal
            task={editingTask}
            onClose={() => setEditingTask(null)}
            onSave={handleEditTask}
          />
        )}
      </AnimatePresence>
    </PageLayout>
  );
}; 
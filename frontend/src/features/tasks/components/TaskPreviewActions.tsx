import React from 'react';
import { Save, FileDown, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Question } from '@/types/exam';
import { saveTasks } from '@/services/supabase';

interface TaskPreviewActionsProps {
  tasks: Question[];
  onSaveComplete: () => void;
  variant: 'single' | 'all';
  taskIndex?: number;
}

export const TaskPreviewActions = ({ 
  tasks, 
  onSaveComplete, 
  variant,
  taskIndex 
}: TaskPreviewActionsProps) => {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setError(null);
      await saveTasks(tasks, true);
      onSaveComplete();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save tasks');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveIndividual = async (task: Question) => {
    try {
      setSaving(true);
      setError(null);
      await saveTasks([task]);
      onSaveComplete();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  if (variant === 'single' && typeof taskIndex === 'number') {
    return (
      <button
        onClick={() => handleSaveIndividual(tasks[taskIndex])}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900
                 hover:bg-gray-100 rounded-lg transition-colors"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        Save Task
      </button>
    );
  }

  return (
    <button
      onClick={handleSaveAll}
      disabled={saving}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
               hover:bg-blue-700 transition-colors ml-2"
    >
      {saving ? (
        <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
      ) : (
        <FileDown className="w-5 h-5" />
      )}
      Save as Task Sheet
    </button>
  );
}; 
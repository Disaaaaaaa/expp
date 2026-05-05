import React, { useState } from 'react';
import { X, ArrowLeft, Loader2 } from 'lucide-react';
import { Question } from '@/types/exam';
import { createSheet } from '@/services/supabase';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/common/Button';

interface CreateSheetProps {
  onSave: (title: string, description: string | undefined, tasks: Question[]) => void;
  selectedTasks: Question[];
  onBack: () => void;
  onClose: () => void;
}

export const CreateSheet = ({ onSave, onBack, onClose, selectedTasks }: CreateSheetProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      
      // Save to database
      await createSheet(
        title,
        description || undefined,
        selectedTasks.map(task => task.id)
      );

      // Call the onSave prop for any additional handling
      onSave(title, description, selectedTasks);
      
      showToast('Sheet created successfully!', 'success');
      onClose(); // Close the modal after successful save
    } catch (error) {
      console.error('Error creating sheet:', error);
      showToast('Failed to create sheet. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full h-full
                    border border-gray-200/50 dark:border-gray-700/50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Sheet</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create a new sheet with {selectedTasks.length} selected task{selectedTasks.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 
                   hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6 flex-1 overflow-y-auto">
        {/* Title Input */}
        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     placeholder-gray-400 dark:placeholder-gray-500 transition-all"
            placeholder="Enter a descriptive title for your sheet"
          />
        </div>

        {/* Description Input */}
        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Description <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     placeholder-gray-400 dark:placeholder-gray-500 transition-all"
            placeholder="Add a description to provide more context about this sheet"
          />
        </div>

        {/* Tags Section */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 border border-gray-100 dark:border-gray-600/50">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Selected Tasks Overview
          </h3>
          <div className="space-y-4">
            {/* Difficulty Tags */}
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 self-center">Difficulty</span>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(selectedTasks.map(task => task.difficulty))).map((difficulty, index) => (
                  <span
                    key={index}
                    className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium 
                      ${difficulty === 'easy'
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 ring-1 ring-green-400/30'
                        : difficulty === 'medium'
                          ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 ring-1 ring-yellow-400/30'
                          : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 ring-1 ring-red-400/30'
                      }`}
                  >
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </span>
                ))}
              </div>
            </div>

            {/* Topic Tags */}
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 self-center">Topics</span>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(selectedTasks.map(task => task.topic))).map((topic, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium
                             bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300
                             ring-1 ring-blue-400/30"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            {/* Type Tags */}
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 self-center">Types</span>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(selectedTasks.map(task => task.type))).map((type, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium
                             bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300
                             ring-1 ring-purple-400/30"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="p-6">
        <div className="flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onBack}
            className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 
                     hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors
                     flex items-center font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
            className="bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600
                     flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Creating...
              </>
            ) : (
              'Create Sheet'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}; 
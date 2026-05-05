import React, { useState } from 'react';
import type { Question } from '@/types/exam';
import { X, PlusCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/common/Button';

interface TaskCreatorProps {
  task?: Question;
  onCreate: (createdTask: Question) => void;
  onCancel: () => void;
}

export const TaskCreator = ({ 
  task, 
  onCreate, 
  onCancel, 
}: TaskCreatorProps) => {
  const [newTask, setNewTask] = useState<Question>(() => task || {
    id: uuidv4(),
    text: '',
    type: '',
    topic: '',
    difficulty: 'medium',
    solution: '',
    answer: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewTask(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!newTask.text.trim()) {
      newErrors.text = 'Question text is required';
    }
    if (!newTask.type) {
      newErrors.type = 'Type is required';
    }
    if (!newTask.topic.trim()) {
      newErrors.topic = 'Topic is required';
    }
    if (!newTask.difficulty) {
      newErrors.difficulty = 'Difficulty is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onCreate(newTask);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full h-[85vh]
                   border border-gray-200/50 dark:border-gray-700/50 flex flex-col">
      
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Task</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Fill in the task details below
          </p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 
                   hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="flex-1 overflow-y-auto space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Question Text
          </label>
          <textarea
            name="text"
            value={newTask.text}
            onChange={handleInputChange}
            className={`w-full p-3 border rounded-xl min-h-[120px]
                     text-gray-900 dark:text-white bg-white dark:bg-gray-800
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     placeholder:text-gray-400 dark:placeholder:text-gray-500
                     ${errors.text ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
            placeholder="Enter the question text here..."
          />
          {errors.text && (
            <p className="mt-1 text-sm text-red-500">{errors.text}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type
            </label>
            <select
              name="type"
              value={newTask.type}
              onChange={handleInputChange}
              className={`w-full p-3 border rounded-xl
                       text-gray-900 dark:text-white bg-white dark:bg-gray-800
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       ${errors.type ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
            >
              <option value="">Select Type</option>
              <option value="Multiple Choice">Multiple Choice</option>
              <option value="Problem Solving">Problem Solving</option>
              <option value="Theory">Theory</option>
              <option value="Calculation">Calculation</option>
            </select>
            {errors.type && (
              <p className="mt-1 text-sm text-red-500">{errors.type}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Difficulty
            </label>
            <select
              name="difficulty"
              value={newTask.difficulty}
              onChange={handleInputChange}
              className={`w-full p-3 border rounded-xl
                       text-gray-900 dark:text-white bg-white dark:bg-gray-800
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       ${errors.difficulty ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            {errors.difficulty && (
              <p className="mt-1 text-sm text-red-500">{errors.difficulty}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Topic
            </label>
            <input
              name="topic"
              value={newTask.topic}
              onChange={handleInputChange}
              className={`w-full p-3 border rounded-xl
                       text-gray-900 dark:text-white bg-white dark:bg-gray-800
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       ${errors.topic ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
              placeholder="Enter the topic"
            />
            {errors.topic && (
              <p className="mt-1 text-sm text-red-500">{errors.topic}</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Solution
            </label>
            <textarea
              name="solution"
              value={newTask.solution || ''}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl min-h-[100px]
                       text-gray-900 dark:text-white bg-white dark:bg-gray-800
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       placeholder:text-gray-400 dark:placeholder:text-gray-500"
              placeholder="Enter the solution steps..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Answer
            </label>
            <textarea
              name="answer"
              value={newTask.answer || ''}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl min-h-[100px]
                       text-gray-900 dark:text-white bg-white dark:bg-gray-800
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       placeholder:text-gray-400 dark:placeholder:text-gray-500"
              placeholder="Enter the final answer..."
            />
          </div>
        </div>
      </form>

      <div className="flex justify-end gap-3 pt-6">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/80"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          className="bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
        >
          Create Task
        </Button>
      </div>
    </div>
  );
}; 
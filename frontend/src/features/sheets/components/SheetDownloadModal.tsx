import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, FileText, Download, Check } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { downloadDocument, DocumentOptions } from '@/services/documentGenerator';
import { Question } from '@/types/exam';

interface SheetDownloadModalProps {
  onClose: () => void;
  tasks: Question[];
  sheetTitle?: string;
}

export const SheetDownloadModal: React.FC<SheetDownloadModalProps> = ({ 
  onClose, 
  tasks,
  sheetTitle = 'Task Sheet'
}) => {
  const [format, setFormat] = useState<'pdf' | 'docx'>('pdf');
  const [options, setOptions] = useState<DocumentOptions>({
    includeSolutions: true,
    includeAnswers: true,
    includeAnswerSpaces: true
  });
  const [downloading, setDownloading] = useState(false);
  
  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadDocument(
        tasks,
        format,
        {
          includeSolutions: options.includeSolutions,
          includeAnswers: options.includeAnswers,
          includeAnswerSpaces: tasks.some(task => task.type.toLowerCase() !== 'multiple choice')
        },
        sheetTitle
      );
      onClose();
    } catch (error) {
      console.error('Error downloading document:', error);
    } finally {
      setDownloading(false);
    }
  };
  
  return (
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
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh]
                 border border-gray-200/50 dark:border-gray-700/50 flex flex-col"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Download Sheet</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 
                       hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-grow">
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Format</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setFormat('pdf')}
                className={`p-4 border rounded-xl flex flex-col items-center transition-colors
                  ${format === 'pdf' 
                    ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-600'
                  }`}
              >
                <FileText className={`w-8 h-8 mb-2 ${
                  format === 'pdf' 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-gray-400 dark:text-gray-500'
                }`} />
                <span className={format === 'pdf' 
                  ? 'text-red-600 dark:text-red-400 font-medium' 
                  : 'text-gray-600 dark:text-gray-400'
                }>PDF</span>
              </button>
              <button
                onClick={() => setFormat('docx')}
                className={`p-4 border rounded-xl flex flex-col items-center transition-colors
                  ${format === 'docx' 
                    ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                  }`}
              >
                <FileText className={`w-8 h-8 mb-2 ${
                  format === 'docx' 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-400 dark:text-gray-500'
                }`} />
                <span className={format === 'docx' 
                  ? 'text-blue-600 dark:text-blue-400 font-medium' 
                  : 'text-gray-600 dark:text-gray-400'
                }>DOCX</span>
              </button>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content Options</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-gray-600 dark:text-gray-400">Include Solutions</label>
                <button
                  onClick={() => setOptions({...options, includeSolutions: !options.includeSolutions})}
                  className={`w-10 h-6 rounded-full transition-colors ${
                    options.includeSolutions 
                      ? 'bg-blue-600 dark:bg-blue-500' 
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`block w-4 h-4 bg-white rounded-full transform transition-transform ${
                    options.includeSolutions ? 'translate-x-5' : 'translate-x-1'
                  }`}></span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-gray-600 dark:text-gray-400">Include Answers</label>
                <button
                  onClick={() => setOptions({...options, includeAnswers: !options.includeAnswers})}
                  className={`w-10 h-6 rounded-full transition-colors ${
                    options.includeAnswers 
                      ? 'bg-blue-600 dark:bg-blue-500' 
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`block w-4 h-4 bg-white rounded-full transform transition-transform ${
                    options.includeAnswers ? 'translate-x-5' : 'translate-x-1'
                  }`}></span>
                </button>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Task Summary</h3>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-sm space-y-1.5">
              <p className="text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-white">Title:</span> {sheetTitle}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-white">Count:</span> {tasks.length}
              </p>
              <div className="text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-white">Tags:</span>
                <div className="space-y-3 mt-2">
                  {/* Difficulty tags */}
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Difficulty</div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(tasks.map(t => t.difficulty))).map(difficulty => (
                        <span key={difficulty} className={`px-2 py-1 rounded-full text-xs font-medium
                          ${difficulty === 'easy'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : difficulty === 'medium'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          }`}>
                          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Topics</div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(tasks.map(t => t.topic))).map(topic => (
                        <span key={topic} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 
                                                    text-blue-800 dark:text-blue-300 rounded-full text-xs">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Types</div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(tasks.map(t => t.type))).map(type => (
                        <span key={type} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 
                                                   text-purple-800 dark:text-purple-300 rounded-full text-xs">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 
                       hover:bg-gray-100 dark:hover:bg-gray-700/50"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDownload}
              isLoading={downloading}
              icon={downloading ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              className="min-w-[120px] bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 
                       text-white font-medium shadow-sm"
            >
              {downloading ? 'Downloading...' : 'Download'}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}; 
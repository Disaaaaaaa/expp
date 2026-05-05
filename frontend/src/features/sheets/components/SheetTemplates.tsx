import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/common/Button';
    
interface SheetTemplate {
  id: string;
  title: string;
  description: string;
  taskCount: number;
}

interface SheetTemplatesProps {
  onClose: () => void;
  onSelect: (templateId: string) => void;
}

export const SheetTemplates: React.FC<SheetTemplatesProps> = ({ onClose, onSelect }) => {
  const [templates, setTemplates] = useState<SheetTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadTemplates();
  }, []);
  
  const loadTemplates = async () => {
    try {
      setLoading(true);
      
     
      setTemplates([
        {
          id: '1',
          title: 'Basic Math Assessment',
          description: 'A template with basic math problems',
          taskCount: 10
        },
        {
          id: '2',
          title: 'Advanced Physics',
          description: 'Complex physics problems for advanced students',
          taskCount: 15
        },
        {
          id: '3',
          title: 'Language Arts',
          description: 'Grammar and vocabulary assessment',
          taskCount: 20
        }
      ]);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl"
      >
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Sheet Templates</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(template => (
              <div
                key={template.id}
                onClick={() => onSelect(template.id)}
                className="border rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors"
              >
                <h3 className="font-medium text-lg">{template.title}</h3>
                <p className="text-gray-600 text-sm mt-1">{template.description}</p>
                <div className="mt-2 text-sm text-gray-500">
                  {template.taskCount} tasks
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-6 border-t">
          <div className="flex justify-end">
            <Button
              variant="ghost"
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}; 
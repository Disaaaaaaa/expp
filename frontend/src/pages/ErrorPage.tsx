import { motion } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ErrorPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center"
      >
        <motion.div
          initial={{ scale: 0.9, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6"
        >
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </motion.div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Something Went Wrong
        </h2>
        
        <p className="text-gray-600 mb-6">
          We encountered an unexpected error. This might be due to a network issue or temporary service disruption.
        </p>
        
        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium
                     hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
            Refresh Page
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium
                     hover:bg-gray-50 transition-colors duration-200"
          >
            Go to Homepage
          </button>
        </div>
      </motion.div>
    </div>
  );
}; 
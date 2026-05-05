import { toast } from 'react-hot-toast';

export const useToast = () => {
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    toast[type](message);
  };

  return { showToast };
}; 
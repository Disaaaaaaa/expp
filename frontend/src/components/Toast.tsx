import { useEffect, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

type ToastType = 'success' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
}

export const Toast = ({ message, type, duration = 3000 }: ToastProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!visible) return null;

  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-md shadow-lg flex items-center gap-2
      ${type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
      <span>{message}</span>
    </div>
  );
};

export const useToast = () => {
  const [toast, setToast] = useState<ToastProps | null>(null);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  return {
    toast,
    showToast,
    ToastComponent: () => toast && <Toast {...toast} />
  };
};

export const ToastComponent = () => {
  const { toast } = useToast();
  return toast && <Toast {...toast} />;
}; 
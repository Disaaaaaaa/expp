import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export const Button = ({ 
  variant = 'primary', 
  size = 'md', 
  icon, 
  isLoading, 
  children, 
  className = '',
  ...props 
}: ButtonProps) => {
  const baseStyles = "rounded-full font-semibold transition-all duration-200 flex items-center justify-center";
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg hover:scale-105 active:scale-95",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:scale-105 active:scale-95",
    ghost: "text-foreground hover:bg-accent hover:text-accent-foreground hover:scale-105 active:scale-95"
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={isLoading}
      {...props}
    >
      <div className="flex items-center gap-2">
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />}
        {icon && !isLoading && icon}
        {children}
      </div>
    </button>
  );
}; 
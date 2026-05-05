import React from 'react';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center p-8 max-w-md">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-6">
              We're sorry, but there was an error loading this page.
            </p>
            {this.state.error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl text-xs text-left overflow-auto mb-6 max-h-48 border border-red-200">
                <strong>{this.state.error.name}:</strong> {this.state.error.message}
              </div>
            )}
            <Button
              onClick={() => window.location.reload()}
              variant="primary"
            >
              Try again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 
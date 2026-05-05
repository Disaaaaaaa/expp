import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Navigation } from '@/layouts/Navigation';
import { Footer } from '@/layouts/Footer';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useToast, ToastComponent } from '@/components/Toast';
import { AppRoutes } from '@/router';

function App() {
  const { ToastComponent } = useToast();
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <Navigation />
        <ErrorBoundary>
            <main className="container mx-auto px-4 py-8 flex-grow">
            <AppRoutes />
            </main>
        </ErrorBoundary>
        <Footer />
        <ToastComponent />
      </div>
    </BrowserRouter>
  );
}

export default App;
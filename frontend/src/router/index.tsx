import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { PageLoader } from '@/components/common/PageLoader';

// Все страницы — lazy, чтобы не тянуть весь код при первой загрузке
const Home = lazy(() => import('@/pages/Home').then(m => ({ default: m.Home })));
const Login = lazy(() => import('@/pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('@/pages/Register').then(m => ({ default: m.Register })));
const Profile = lazy(() => import('@/pages/Profile').then(m => ({ default: m.Profile })));
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })));
const TaskCompletion = lazy(() => import('@/pages/TaskCompletion').then(m => ({ default: m.TaskCompletion })));
const ErrorPage = lazy(() => import('@/pages/ErrorPage').then(m => ({ default: m.ErrorPage })));
const Statistics = lazy(() => import('@/components/auth/Statistics').then(m => ({ default: m.Statistics })));

const TaskForm = lazy(() => import('@/pages/TaskForm').then(m => ({ default: m.TaskForm })));
const TaskLibrary = lazy(() => import('@/pages/TaskLibrary').then(m => ({ default: m.TaskLibrary })));
const TaskPreview = lazy(() => import('@/pages/TaskPreview').then(m => ({ default: m.TaskPreview })));
const SheetsLibrary = lazy(() => import('@/pages/SheetsLibrary').then(m => ({ default: m.SheetsLibrary })));
const SheetView = lazy(() => import('@/pages/SheetView').then(m => ({ default: m.SheetView })));
const SheetEdit = lazy(() => import('@/pages/SheetEdit').then(m => ({ default: m.SheetEdit })));
const Students = lazy(() => import('@/pages/Students').then(m => ({ default: m.Students })));
const Classes = lazy(() => import('@/pages/Classes').then(m => ({ default: m.Classes })));

export const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        
        <Route path="/generate-task" element={
          <ProtectedRoute>
            <TaskForm />
          </ProtectedRoute>
        } />
        
        <Route path="/task-preview" element={
          <ProtectedRoute>
            <TaskPreview />
          </ProtectedRoute>
        } />
        
        <Route path="/library" element={
          <ProtectedRoute>
            <TaskLibrary />
          </ProtectedRoute>
        } />
        
        <Route path="/task-completion" element={<TaskCompletion />} />
        
        <Route path="/sheets" element={
          <ProtectedRoute>
            <SheetsLibrary />
          </ProtectedRoute>
        } />
        
        <Route path="/sheets/:id" element={
          <ProtectedRoute>
            <SheetView />
          </ProtectedRoute>
        } />
        
        <Route path="/sheets/:id/edit" element={
          <ProtectedRoute>
            <SheetEdit />
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        
        <Route path="/statistics" element={
          <ProtectedRoute>
            <Statistics />
          </ProtectedRoute>
        } />
        
        <Route path="/students" element={
          <ProtectedRoute requiredRole="teacher">
            <Students />
          </ProtectedRoute>
        } />

        <Route path="/classes" element={
          <ProtectedRoute requiredRole="teacher">
            <Classes />
          </ProtectedRoute>
        } />
        
        <Route path="/error" element={<ErrorPage />} />
      </Routes>
    </Suspense>
  );
};


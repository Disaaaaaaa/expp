import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { useLanguageStore } from '@/store/languageStore';
import { useAuthStore } from '@/store/authStore';
import { PageLayout } from '@/layouts/PageLayout';

export const Register = () => {
  const { t } = useLanguageStore();
  const navigate = useNavigate();
  const { signUp, loading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signUp(email, password, `${firstName} ${lastName}`, role);
    if (!error) {
      navigate('/');
    }
  };



  return (
    <PageLayout maxWidth="sm">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.signUpTitle')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{t('auth.joinPlatform')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('auth.email')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError();
                }}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg
                         text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t("auth.emailPlaceholder") || "Электрондық поштаңызды енгізіңіз"}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('profile.firstName')}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  clearError();
                }}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg
                         text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('profile.enterFirstName')}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('profile.lastName')}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  clearError();
                }}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg
                         text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('profile.enterLastName')}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('auth.role')}
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`flex items-center justify-center px-4 py-2 border rounded-lg transition-colors ${
                  role === 'student'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300'
                    : 'bg-white border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50'
                }`}
              >
                {t('auth.student')}
              </button>
              <button
                type="button"
                onClick={() => setRole('teacher')}
                className={`flex items-center justify-center px-4 py-2 border rounded-lg transition-colors ${
                  role === 'teacher'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300'
                    : 'bg-white border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50'
                }`}
              >
                {t('auth.teacher')}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('auth.password')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError();
                }}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg
                         text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t("auth.passwordCreatePlaceholder") || "Құпиясөз жасаңыз"}
                required
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white
                     rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50
                     disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin text-blue-600 dark:text-blue-400" />
                {t('auth.creatingAccount')}
              </>
            ) : (
              t('auth.signUp')
            )}
          </button>
        </form>



        <div className="mt-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            {t('auth.haveAccount')}{' '}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">
              {t('auth.signIn')}
            </Link>
          </p>
        </div>
      </motion.div>
    </PageLayout>
  );
}; 
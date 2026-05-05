import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { useLanguageStore } from '@/store/languageStore';
import { useAuthStore } from '@/store/authStore';
import { PageLayout } from '@/layouts/PageLayout';

export const Login = () => {
  const { t } = useLanguageStore();
  const navigate = useNavigate();
  const { signIn, loading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.welcomeBack') || 'Қош келдіңіз!'}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{t('auth.signInTitle') || 'Тіркелгіге кіру'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('auth.email') || 'Email мекенжайы'}
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
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('auth.password') || 'Құпиясөз'}
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
                placeholder={t("auth.passwordPlaceholder") || "Құпиясөзді енгізіңіз"}
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
                {t('auth.signingIn') || 'Кіру орындалуда...'}
              </>
            ) : (
              t('auth.buttonSignIn') || 'Кіру'
            )}
          </button>
        </form>



        <div className="mt-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            {t('auth.noAccount') || 'Тіркелгіңіз жоқ па?'}{' '}
            <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">
              {t('auth.signUp') || 'Тіркелу'}
            </Link>
          </p>
        </div>
      </motion.div>
    </PageLayout>
  );
}; 
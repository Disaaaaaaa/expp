import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Mail, Search, Award, Calendar, ChevronRight, User } from 'lucide-react';
import { PageLayout } from '@/layouts/PageLayout';
import { getAllStudents } from '@/services/supabase';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import { useLanguageStore } from '@/store/languageStore';

export const Students = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { t } = useLanguageStore();

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await getAllStudents();
      setStudents(data || []);
    } catch (err) {
      console.error('Error loading students:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = (students || []).filter(s => {
    const fullName = `${s?.first_name || ''} ${s?.last_name || ''}`.toLowerCase();
    const email = (s?.email || '').toLowerCase();
    const search = (searchTerm || '').toLowerCase();
    return fullName.includes(search) || email.includes(search);
  });

  if (loading) return <PageLayout><div className="flex justify-center py-20"><LoadingSpinner /></div></PageLayout>;

  return (
    <PageLayout maxWidth="xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600" />
          {t('students.list')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">{t('students.manage')}</p>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder={t('students.search')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map((student, index) => (
          <motion.div
            key={student.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all group"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center overflow-hidden">
                {student.avatar_url ? (
                  <img src={student.avatar_url} alt={student.first_name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {student.first_name} {student.last_name}
                </h3>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Mail className="w-3 h-3 mr-1" />
                  {student.email}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 text-center">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="text-xs text-gray-500 uppercase font-bold">{t('students.role')}</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{t('students.roleStudent')}</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="text-xs text-gray-500 uppercase font-bold">{t('students.status')}</div>
                <div className="text-sm font-semibold text-green-600">{t('students.statusActive')}</div>
              </div>
            </div>

            <button
              onClick={() => navigate('/sheets')}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl font-semibold hover:bg-blue-600 hover:text-white transition-all group-hover:shadow-md"
            >
              {t('students.assignTasks')}
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl">
          <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-xl text-gray-500">{t('students.notFound')}</p>
        </div>
      )}
    </PageLayout>
  );
};

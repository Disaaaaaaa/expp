import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, BookOpen, Sparkles, CheckCircle, FileText, Library, Users, ArrowRight } from 'lucide-react';
import { AnimatedElement } from '@/features/home/components/AnimatedElement';
import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { useLanguageStore } from '@/store/languageStore';
import { useAuthStore } from '@/store/authStore';
import { getProfile } from '@/services/profile';
import { getStudentAssignments } from '@/services/supabase';

export const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const { t } = useLanguageStore();
  const benefitsRef = useRef(null);
  const isInView = useInView(benefitsRef, { once: true, margin: "-100px" });

  const role = user?.user_metadata?.role || profile?.role || 'student';

  useEffect(() => {
    if (user) {
      getProfile(user.id).then(setProfile);
      // If student, fetch assignments
      if (role === 'student') {
        getStudentAssignments().then(setAssignments);
      }
    }
  }, [user, role]);

  const benefits = [
    t("home.benefitDetail1"),
    t("home.benefitDetail2"),
    t("home.benefitDetail3"),
    t("home.benefitDetail4"),
    t("home.benefitDetail5")
  ];

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          type: "spring",
          duration: 0.8,
          bounce: 0.4
        }}
        className="text-center py-12 sm:py-20 bg-gradient-to-b from-blue-50 dark:from-blue-900/20 dark:to-gray-900 to-white rounded-2xl sm:rounded-3xl mb-8 sm:mb-16 px-4"
      >
        <motion.h1 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-3xl sm:text-5xl font-bold mb-4 sm:mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400"
        >
          {t('home.heroTitle1')}
          <br />
          <span className="text-4xl sm:text-6xl">{t('home.heroTitle2')}</span>
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-8 sm:mb-12 max-w-3xl mx-auto px-4"
        >
          {t('home.heroDescription')}
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="flex flex-col sm:flex-row justify-center gap-4 px-4"
        >
          {role === 'teacher' ? (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/generate-task')}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white rounded-xl font-semibold
                         hover:bg-blue-700 transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                {t('home.createNewTasks')}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/sheets')}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-transparent text-blue-600 rounded-xl font-semibold
                         hover:bg-blue-50 transition-all duration-200 border-2 border-blue-600 flex items-center justify-center gap-2"
              >
                <Library className="w-5 h-5" />
                {t('nav.library')}
              </motion.button>
            </>
          ) : (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/generate-task')}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white rounded-xl font-semibold
                         hover:bg-blue-700 transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                {t('home.selfStudy')}
              </motion.button>
              {assignments.length > 0 && (
                <motion.button
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   onClick={() => document.getElementById('assignments-section')?.scrollIntoView({ behavior: 'smooth' })}
                   className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-transparent text-green-600 rounded-xl font-semibold
                            hover:bg-green-50 transition-all duration-200 border-2 border-green-600 flex items-center justify-center gap-2"
                 >
                   <CheckCircle className="w-5 h-5" />
                   {t('home.viewAssignments')} ({assignments.length})
                 </motion.button>
              )}
            </>
          )}
        </motion.div>
      </motion.div>

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8 mb-8 sm:mb-16 px-4">
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-lg dark:shadow-gray-900/50 flex flex-col h-full
                      transform transition-all duration-200 hover:scale-105 hover:shadow-xl group">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/50
                       rounded-xl text-blue-600 dark:text-blue-400 mb-4
                       transform transition-all duration-300 
                       group-hover:scale-110 group-hover:rotate-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold mb-3 text-gray-900 dark:text-white">{t('home.benefit1Title')}</h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 flex-grow">
            {t('home.benefit1Desc')}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-lg dark:shadow-gray-900/50 flex flex-col h-full
                      transform transition-all duration-200 hover:scale-105 hover:shadow-xl group">
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/50
                       rounded-xl text-green-600 dark:text-green-400 mb-4
                       transform transition-all duration-300 
                       group-hover:scale-110 group-hover:rotate-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold mb-3 text-gray-900 dark:text-white">{t('home.benefit2Title')}</h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 flex-grow">
            {t('home.benefit2Desc')}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-lg dark:shadow-gray-900/50 flex flex-col h-full
                      transform transition-all duration-200 hover:scale-105 hover:shadow-xl group">
          <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/50
                       rounded-xl text-purple-600 dark:text-purple-400 mb-4
                       transform transition-all duration-300 
                       group-hover:scale-110 group-hover:rotate-3">
            <Library className="w-6 h-6" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold mb-3 text-gray-900 dark:text-white">{t('home.benefit3Title')}</h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 flex-grow">
            {t('home.benefit3Desc')}
          </p>
        </div>
      </div>

      {/* Assignments Section for Students */}
      {role === 'student' && assignments.length > 0 && (
        <section id="assignments-section" className="py-12 px-4 mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-8">
            {t('home.tasksFromTeachers')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignments.map((assignment) => (
              <motion.div
                key={assignment.id}
                whileHover={{ scale: 1.02 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    assignment.status === 'completed' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  }`}>
                    {assignment.status === 'completed' ? t('home.done') : t('home.pending')}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(assignment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
                  {assignment.sheet?.title || 'Untitled Sheet'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {t('home.from')}: {assignment.teacher?.first_name} {assignment.teacher?.last_name}
                </p>
                <button
                  onClick={() => navigate(`/sheets/${assignment.sheet_id}`)}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {assignment.status === 'completed' ? t('home.reviewResult') : t('home.startTask')}
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Benefits List Section */}
      <section 
        ref={benefitsRef}
        className="py-8 sm:py-12 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl sm:rounded-3xl mb-8 sm:mb-12"
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
            className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white text-center mb-8 sm:mb-12"
          >
            {t('home.platformBenefits')}
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex items-center space-x-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg dark:shadow-gray-900/50
                         transform transition-all duration-200 hover:scale-105 hover:shadow-xl
                         cursor-pointer"
              >
                <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0" />
                <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">{benefit}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <AnimatedElement>
        <div className="text-center py-12 sm:py-16 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 rounded-2xl sm:rounded-3xl mb-12 sm:mb-20 mx-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6 px-4">
            {t('home.readyToCreate')}
          </h2>
          <p className="text-lg sm:text-xl text-blue-100 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            {t('home.readyToCreateDesc')}
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/generate-task')}
            className="mx-4 px-6 sm:px-8 py-3 sm:py-4 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-xl font-semibold
                     hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200
                     shadow-lg hover:shadow-xl dark:shadow-gray-900/50"
          >
            {t('home.getStartedNow')}
          </motion.button>
        </div>
      </AnimatedElement>
    </div>
  );
};
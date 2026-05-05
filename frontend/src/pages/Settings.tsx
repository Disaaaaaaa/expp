import { useState, useEffect } from 'react';
import { PageLayout } from '@/layouts/PageLayout';
import { motion } from 'framer-motion';
import { Button } from '@/components/common/Button';
import { Bell, Shield, Monitor, Save, Loader2, Globe, CheckCircle, X } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { supabase } from '@/services/supabase';
import { getUserSettings, updateUserSettings, applyTheme, type UserSettings } from '@/services/settings';
import { useLanguageStore } from '@/store/languageStore';

export const Settings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const { showToast } = useToast();
  const { currentLanguage, setLanguage, t } = useLanguageStore();

  // Local state for form
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [language, setLanguageState] = useState<string>('en');
  const [notifications, setNotifications] = useState({
    enabled: true,
    emailNotifications: true,
    taskReminders: true
  });
  const [privacy, setPrivacy] = useState({
    showProfileToPublic: true
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const userSettings = await getUserSettings();
      
      if (userSettings) {
        setSettings(userSettings);
        setTheme(userSettings.theme || 'system');
        setLanguageState(userSettings.language || 'en');
        setNotifications({
          enabled: userSettings.notifications_enabled ?? true,
          emailNotifications: userSettings.preferences?.email_notifications ?? true,
          taskReminders: userSettings.preferences?.task_reminders ?? true
        });
        setPrivacy({
          showProfileToPublic: userSettings.preferences?.show_profile_to_public ?? true
        });
        
        // Apply theme
        applyTheme(userSettings.theme || 'system');
        
        // Sync language with language store
        if (userSettings.language && userSettings.language !== currentLanguage) {
          setLanguage(userSettings.language as 'en' | 'ru' | 'kk');
        }
      } else {
        // Default settings
        setTheme('system');
        setLanguageState('en');
        applyTheme('system');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      showToast(t('settings.settingsLoadError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    applyTheme(newTheme);
    setHasChanges(true);
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguageState(newLanguage);
    setLanguage(newLanguage as 'en' | 'ru' | 'kk');
    setHasChanges(true);
  };

  const handleNotificationChange = (key: keyof typeof notifications, value: boolean) => {
    setNotifications(prev => {
      const updated = { ...prev, [key]: value };
      // If disabling all notifications, also disable the main toggle
      if (key !== 'enabled' && !updated.emailNotifications && !updated.taskReminders) {
        updated.enabled = false;
      }
      // If enabling any notification, enable the main toggle
      if (key !== 'enabled' && (updated.emailNotifications || updated.taskReminders)) {
        updated.enabled = true;
      }
      return updated;
    });
    setHasChanges(true);
  };

  const handlePrivacyChange = (key: keyof typeof privacy, value: boolean) => {
    setPrivacy(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      
      const updates = {
        theme,
        language: language,
        notifications_enabled: notifications.enabled,
        preferences: {
          email_notifications: notifications.emailNotifications,
          task_reminders: notifications.taskReminders,
          show_profile_to_public: privacy.showProfileToPublic
        }
      };

      await updateUserSettings(updates);
      
      setHasChanges(false);
      showToast(t('settings.settingsSaved'), 'success');
    } catch (error) {
      console.error('Error saving settings', error);
      showToast(t('settings.settingsSaveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (settings) {
      setTheme(settings.theme || 'system');
      setLanguageState(settings.language || 'en');
      setLanguage(settings.language as 'en' | 'ru' | 'kk' || 'en');
      setNotifications({
        enabled: settings.notifications_enabled ?? true,
        emailNotifications: settings.preferences?.email_notifications ?? true,
        taskReminders: settings.preferences?.task_reminders ?? true
      });
      setPrivacy({
        showProfileToPublic: settings.preferences?.show_profile_to_public ?? true
      });
      applyTheme(settings.theme || 'system');
      setHasChanges(false);
    }
  };
  
  if (loading) {
    return (
      <PageLayout maxWidth="4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="4xl">
      <div className="bg-white dark:bg-gray-900 rounded-[40px]">
        <main className="container mx-auto px-4 py-20 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">{t('settings.title')}</h1>
              <p className="text-gray-600 dark:text-gray-400">
                {t('settings.description')}
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              {/* Notifications Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6 border border-border dark:border-gray-700"
              >
                <div className="flex items-center mb-6">
                  <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.notifications')}</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{t('settings.enableNotifications')}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.enableNotificationsDesc')}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={notifications.enabled}
                        onChange={() => handleNotificationChange('enabled', !notifications.enabled)}
                      />
                      <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{t('settings.emailNotifications')}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.emailNotificationsDesc')}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={notifications.emailNotifications && notifications.enabled}
                        disabled={!notifications.enabled}
                        onChange={() => handleNotificationChange('emailNotifications', !notifications.emailNotifications)}
                      />
                      <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                        !notifications.enabled 
                          ? 'bg-gray-200 dark:bg-gray-700 opacity-50 cursor-not-allowed' 
                          : 'bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600'
                      }`}></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{t('settings.taskReminders')}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.taskRemindersDesc')}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={notifications.taskReminders && notifications.enabled}
                        disabled={!notifications.enabled}
                        onChange={() => handleNotificationChange('taskReminders', !notifications.taskReminders)}
                      />
                      <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                        !notifications.enabled 
                          ? 'bg-gray-200 dark:bg-gray-700 opacity-50 cursor-not-allowed' 
                          : 'bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600'
                      }`}></div>
                    </label>
                  </div>
                </div>
              </motion.div>
              
              {/* Appearance Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6 border border-border dark:border-gray-700"
              >
                <div className="flex items-center mb-6">
                  <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.appearance')}</h2>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('settings.theme')}
                    </label>
                    <select
                      value={theme}
                      onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark' | 'system')}
                      className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="light">{t('settings.light')}</option>
                      <option value="dark">{t('settings.dark')}</option>
                      <option value="system">{t('settings.system')}</option>
                    </select>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {t('settings.themeDesc')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                      <Globe className="w-4 h-4 mr-2" />
                      {t('settings.language')}
                    </label>
                    <select
                      value={language}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="en">English</option>
                      <option value="ru">Русский</option>
                      <option value="kk">Қазақша</option>
                    </select>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {t('settings.languageDesc')}
                    </p>
                  </div>
                </div>
              </motion.div>
              
              {/* Privacy Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6 border border-border dark:border-gray-700"
              >
                <div className="flex items-center mb-6">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.privacy')}</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{t('settings.showProfileToPublic')}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.showProfileToPublicDesc')}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={privacy.showProfileToPublic}
                        onChange={() => handlePrivacyChange('showProfileToPublic', !privacy.showProfileToPublic)}
                      />
                      <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </motion.div>
              
              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex justify-end gap-3 pt-4"
              >
                {hasChanges && (
                  <Button
                    variant="ghost"
                    onClick={handleReset}
                    className="text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t('settings.reset')}
                  </Button>
                )}
                <Button
                  variant="primary"
                  icon={<Save className="w-4 h-4" />}
                  onClick={handleSaveSettings}
                  disabled={saving || !hasChanges}
                  isLoading={saving}
                  className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? t('settings.saving') : t('settings.saveSettings')}
                </Button>
              </motion.div>

              {hasChanges && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center"
                >
                  <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {t('settings.unsavedChanges')}
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </main>
      </div>
    </PageLayout>
  );
};

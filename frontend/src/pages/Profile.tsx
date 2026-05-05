import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Upload, Camera, Edit2, KeyRound, Save, Loader2, Eye, EyeOff, Award, TrendingUp, Clock, BookOpen, CheckCircle, Shield, X } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/common/Button';
import { useLanguageStore } from '@/store/languageStore';
import { useToast } from '@/components/Toast';
import { motion } from 'framer-motion';
import { PageLayout } from '@/layouts/PageLayout';
import { getUserStatistics, type UserStatistics } from '@/services/userStatistics';
import { uploadAvatar } from '@/services/profile';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
}

export const Profile: React.FC = () => {
  const { t } = useLanguageStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { showToast } = useToast();
  const { changePassword } = useAuthStore();
  
  useEffect(() => {
    loadProfile();
    loadStatistics();
  }, []);
  
  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        
        // Combine profile data with email from auth user
        // Use metadata as fallback if profile record is incomplete
        const firstNameFallback = data.first_name || user.user_metadata?.first_name || '';
        const lastNameFallback = data.last_name || user.user_metadata?.last_name || '';
        
        setProfile({
          ...data,
          first_name: firstNameFallback,
          last_name: lastNameFallback,
          email: user.email || '',
        });
        setFirstName(firstNameFallback);
        setLastName(lastNameFallback);
        setAvatar(data.avatar_url || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      showToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await getUserStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };
  
  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size must be less than 5MB', 'error');
      return;
    }

    setAvatarFile(file);
    
    // Preview image
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    
    try {
      setLoading(true);
      
      let avatarUrl = avatar;
      
      // Upload avatar if a new file was selected
      if (avatarFile) {
        setUploadingAvatar(true);
        try {
          avatarUrl = await uploadAvatar(profile.id, avatarFile);
          setAvatarFile(null);
        } catch (error) {
          console.error('Error uploading avatar:', error);
          showToast('Failed to upload avatar', 'error');
          setUploadingAvatar(false);
          return;
        } finally {
          setUploadingAvatar(false);
        }
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);
        
      if (error) throw error;
      
      await loadProfile();
      setIsEditing(false);
      showToast('Profile updated successfully', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    if (password.length > 72) {
      return 'Password must be less than 72 characters';
    }
    return null;
  };

  const handleChangePassword = async () => {
    try {
      setPasswordError('');
      
      // Validate passwords match
      if (newPassword !== confirmPassword) {
        setPasswordError('New passwords do not match');
        return;
      }
      
      // Validate password strength
      const passwordValidation = validatePassword(newPassword);
      if (passwordValidation) {
        setPasswordError(passwordValidation);
        return;
      }
      
      // Check if new password is different from current
      if (currentPassword === newPassword) {
        setPasswordError('New password must be different from current password');
        return;
      }
      
      if (!profile?.email) {
        setPasswordError('Email not found');
        return;
      }
      
      // Use auth store method to change password
      await changePassword(currentPassword, newPassword, profile.email);
      
      // Reset form and show success message
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);
      showToast('Password updated successfully', 'success');
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update password';
      setPasswordError(errorMessage);
      showToast(errorMessage, 'error');
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(location.pathname.startsWith('/kk') ? 'kk-KZ' : 'en-US', { 
        month: 'long', 
        day: 'numeric',
        year: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };
  
  if (loading && !profile) {
    return (
      <PageLayout maxWidth="6xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout maxWidth="6xl">
      <div className="bg-white dark:bg-gray-900 rounded-[40px]">
        <main className="container mx-auto px-4 py-20 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">{t('nav.profile')}</h1>
              <p className="text-gray-600 dark:text-gray-400">
                {t('profile.manageDesc')}
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Profile Card */}
              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-card dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6 border border-border dark:border-gray-700"
                >
                  <div className="flex flex-col items-center">
                    <div className="relative mb-4">
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold overflow-hidden">
                        {profile?.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={`${profile.first_name} ${profile.last_name}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={64} />
                        )}
                      </div>
                      {isEditing && (
                        <label className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-3 shadow-lg cursor-pointer hover:bg-blue-700 transition-colors">
                          <Camera className="h-5 w-5 text-white" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-1">
                      {profile?.first_name} {profile?.last_name}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4 text-center break-all text-sm">
                      {profile?.email}
                    </p>
                    <div className="w-full border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                      <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="w-4 h-4 mr-2" />
                        {t('profile.memberSince')} {formatDate(profile?.created_at || '')}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Statistics Overview */}
                {statistics && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-card dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6 border border-border dark:border-gray-700 mt-6"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                      {t('profile.quickStats')}
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{t('profile.tasksSolved')}</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {statistics.solved_tasks}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{t('profile.successRate')}</span>
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                          {statistics.success_rate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{t('profile.timeSpent')}</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatTime(statistics.total_time_spent)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
              
              {/* Right Column - Profile Information & Security */}
              <div className="lg:col-span-2 space-y-6">
                {/* Profile Information */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6 border border-border dark:border-gray-700"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      <User className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                      {t('profile.information')}
                    </h3>
                    {!isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Edit2 className="w-4 h-4" />}
                        onClick={() => setIsEditing(true)}
                        className="text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {t('profile.edit')}
                      </Button>
                    )}
                  </div>
                  
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('profile.firstName')}
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="pl-10 w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            placeholder={t("profile.enterFirstName")}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('profile.lastName')}
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="pl-10 w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            placeholder={t("profile.enterLastName")}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Email
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="email"
                            value={profile?.email}
                            disabled
                            className="pl-10 w-full p-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-xl text-gray-500 dark:text-gray-400 cursor-not-allowed"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {t('profile.emailCannotChange')}
                        </p>
                      </div>
                      
                      <div className="flex justify-end gap-3 pt-4">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setIsEditing(false);
                            setFirstName(profile?.first_name || '');
                            setLastName(profile?.last_name || '');
                            setAvatar(profile?.avatar_url || '');
                            setAvatarFile(null);
                          }}
                          className="text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          icon={<Save className="w-4 h-4" />}
                          onClick={handleSaveProfile}
                          disabled={loading || uploadingAvatar}
                          isLoading={loading || uploadingAvatar}
                          className="bg-blue-600 text-white hover:bg-blue-700"
                        >
                          {uploadingAvatar ? t('common.uploading') : t('settings.saveSettings')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('profile.firstName')}</div>
                          <div className="text-gray-900 dark:text-white font-medium">{profile?.first_name || t('common.notSet')}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('profile.lastName')}</div>
                          <div className="text-gray-900 dark:text-white font-medium">{profile?.last_name || t('common.notSet')}</div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('profile.email')}</div>
                        <div className="text-gray-900 dark:text-white break-all">{profile?.email}</div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('profile.memberSince')}</div>
                        <div className="text-gray-900 dark:text-white">
                          {formatDate(profile?.created_at || '')}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
                
                {/* Security Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-card dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6 border border-border dark:border-gray-700"
                >
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center">
                      <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('profile.security')}</h3>
                    </div>
                    {!isChangingPassword && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<KeyRound className="w-4 h-4" />}
                        onClick={() => setIsChangingPassword(true)}
                        className="text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {t('profile.changePassword')}
                      </Button>
                    )}
                  </div>
                  
                  {isChangingPassword ? (
                    <div className="space-y-4">
                      {passwordError && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md text-sm text-red-600 dark:text-red-200 border border-red-200 dark:border-red-800 flex items-center justify-between">
                          <span>{passwordError}</span>
                          <button
                            onClick={() => setPasswordError('')}
                            className="text-red-600 dark:text-red-200 hover:text-red-800 dark:hover:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('profile.currentPassword')}
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type={showCurrentPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="pl-10 pr-10 w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            placeholder="Enter your current password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('profile.newPassword')}
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="pl-10 pr-10 w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            placeholder="Enter your new password (min. 6 characters)"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        {newPassword && (
                          <p className={`mt-1 text-xs ${newPassword.length >= 6 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {newPassword.length < 6 ? 'Password must be at least 6 characters' : '✓ Password length OK'}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('profile.confirmNewPassword')}
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="pl-10 pr-10 w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            placeholder="Confirm your new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        {confirmPassword && (
                          <p className={`mt-1 text-xs ${newPassword === confirmPassword ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex justify-end gap-3 pt-4">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setIsChangingPassword(false);
                            setCurrentPassword('');
                            setNewPassword('');
                            setConfirmPassword('');
                            setPasswordError('');
                          }}
                          className="text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          icon={<KeyRound className="w-4 h-4" />}
                          onClick={handleChangePassword}
                          disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                          isLoading={loading}
                          className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {t('profile.updatePassword')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">
                        {t('profile.securityDesc')}
                      </p>
                    </div>
                  )}
                </motion.div>

                {/* Activity Summary */}
                {statistics && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-card dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/50 p-6 border border-border dark:border-gray-700"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Award className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                      {t('profile.activitySummary')}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {statistics.solved_tasks}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{t('profile.tasksSolved')}</div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {statistics.success_rate.toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{t('profile.successRate')}</div>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {formatTime(statistics.total_time_spent)}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{t('profile.timeSpent')}</div>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {statistics.total_task_attempts}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{t('profile.totalAttempts')}</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </PageLayout>
  );
};

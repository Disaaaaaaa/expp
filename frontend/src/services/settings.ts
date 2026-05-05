import { supabase } from '@/services/supabase';

export interface UserSettings {
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications_enabled: boolean;
  preferences?: {
    email_notifications?: boolean;
    task_reminders?: boolean;
    show_profile_to_public?: boolean;
  };
  created_at: string;
  updated_at?: string;
}

export interface SettingsUpdate {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  notifications_enabled?: boolean;
  preferences?: {
    email_notifications?: boolean;
    task_reminders?: boolean;
    show_profile_to_public?: boolean;
  };
}

/**
 * Get user settings from Supabase
 */
export async function getUserSettings(): Promise<UserSettings | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

    if (!data) {
      // Initialize settings if they don't exist
      const defaultPreferences = {
        email_notifications: true,
        task_reminders: true,
        show_profile_to_public: true
      };
      
      // Try to get preferences from localStorage as fallback
      const localPrefs = localStorage.getItem('user_preferences');
      const prefs = localPrefs ? JSON.parse(localPrefs) : defaultPreferences;
      
      const { data: newSettings, error: insertError } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          theme: 'system',
          language: 'en',
          notifications_enabled: true
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return { ...newSettings, preferences: prefs } as UserSettings;
    }

    // Parse preferences if it's a string
    let preferences = {};
    if (data.preferences) {
      if (typeof data.preferences === 'string') {
        try {
          preferences = JSON.parse(data.preferences);
        } catch (e) {
          preferences = {};
        }
      } else {
        preferences = data.preferences;
      }
    } else {
      // Fallback to localStorage if preferences column doesn't exist
      const localPrefs = localStorage.getItem('user_preferences');
      if (localPrefs) {
        try {
          preferences = JSON.parse(localPrefs);
        } catch (e) {
          preferences = {
            email_notifications: true,
            task_reminders: true,
            show_profile_to_public: true
          };
        }
      } else {
        preferences = {
          email_notifications: true,
          task_reminders: true,
          show_profile_to_public: true
        };
      }
    }

    return { ...data, preferences } as UserSettings;
  } catch (error) {
    console.error('Error fetching user settings:', error);
    throw error;
  }
}

/**
 * Update user settings in Supabase
 */
export async function updateUserSettings(updates: SettingsUpdate): Promise<UserSettings> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.theme !== undefined) updateData.theme = updates.theme;
    if (updates.language !== undefined) updateData.language = updates.language;
    if (updates.notifications_enabled !== undefined) updateData.notifications_enabled = updates.notifications_enabled;
    
    // Update main settings first
    const { data, error } = await supabase
      .from('user_settings')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    
    // Handle preferences separately (may not exist in DB)
    let preferences = {};
    if (updates.preferences) {
      preferences = updates.preferences;
      // Always save to localStorage as backup
      localStorage.setItem('user_preferences', JSON.stringify(updates.preferences));
      
      // Try to update preferences in DB if column exists (silent fail if not)
      try {
        await supabase
          .from('user_settings')
          .update({ preferences: updates.preferences })
          .eq('user_id', user.id);
      } catch (e) {
        // Column might not exist, that's okay - we have localStorage
        console.warn('Preferences column may not exist, using localStorage');
      }
    } else if (data?.preferences) {
      if (typeof data.preferences === 'string') {
        try {
          preferences = JSON.parse(data.preferences);
        } catch (e) {
          preferences = {};
        }
      } else {
        preferences = data.preferences;
      }
    } else {
      const localPrefs = localStorage.getItem('user_preferences');
      preferences = localPrefs ? JSON.parse(localPrefs) : {
        email_notifications: true,
        task_reminders: true,
        show_profile_to_public: true
      };
    }
    
    return { ...data, preferences } as UserSettings;
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw error;
  }
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: 'light' | 'dark' | 'system') {
  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', systemTheme === 'dark');
    localStorage.removeItem('theme');
  } else {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }
}


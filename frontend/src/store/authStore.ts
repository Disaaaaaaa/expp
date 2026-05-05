import { create } from 'zustand';
import { supabase } from '@/services/supabase';
import type { User, UserResponse } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  setUser: (user: User | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, email: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  error: null,
  initialized: false,

  setUser: (user) => set({ user, initialized: true }),

  signIn: async (email, password) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      set({ user: data.user, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to sign in' });
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (email, password, username, role: 'teacher' | 'student' = 'student') => {
    try {
      set({ loading: true, error: null });
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: username.split(' ')[0] || '',
            last_name: username.split(' ').slice(1).join(' ') || '',
            role: role
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        set({ user: authData.user });
        
        // Ensure profile exists in public.profiles
        try {
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            first_name: username.split(' ')[0] || '',
            last_name: username.split(' ').slice(1).join(' ') || '',
            email: email,
            role: role
          }, { onConflict: 'id' });
        } catch (profileError) {
          console.error('Error creating profile manually:', profileError);
          // Don't fail the whole signup if just profile insertion fails (though it's bad)
        }
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to sign up' });
    } finally {
      set({ loading: false });
    }
  },

  signInWithGoogle: async () => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) throw error;
      // Note: The actual sign-in happens via redirect, so we don't set user here
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to sign in with Google',
        loading: false 
      });
    }
  },

  signOut: async () => {
    try {
      set({ loading: true, error: null });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to sign out' });
    } finally {
      set({ loading: false });
    }
  },

  changePassword: async (currentPassword: string, newPassword: string, email: string) => {
    try {
      set({ loading: true, error: null });
      
      // Validate password strength
      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      // Verify current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword
      });
      
      if (verifyError) {
        throw new Error('Current password is incorrect');
      }
      
      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) throw updateError;
      
      set({ error: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));


supabase.auth.onAuthStateChange((event, session) => {
  useAuthStore.setState({ 
    user: session?.user ?? null,
    initialized: true,
    loading: false
  });
});

// Сразу проверяем сессию и не ждём бесконечно — через 3 с считаем инициализацию завершённой
supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.setState({ user: session?.user ?? null, initialized: true, loading: false });
}).catch(() => {
  useAuthStore.setState({ initialized: true, loading: false });
});
setTimeout(() => {
  useAuthStore.setState((s) => (s.initialized ? s : { initialized: true, loading: false }));
}, 3000); 
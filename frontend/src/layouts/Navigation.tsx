import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  ClipboardList, 
  Library, 
  Menu, 
  X,
  ChevronDown,
  GraduationCap,
  User,
  LogOut,
  Settings,
  TrendingUp,
  Layers,
  Users,
  Sun,
  Moon,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguageStore, Language } from '@/store/languageStore';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/services/supabase';
import { useToast } from '@/components/Toast';

type NavItemType = {
  path: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  className?: string;
  requiresAuth: boolean;
  requiresTeacher?: boolean;
} | {
  type: 'dropdown';
  icon: React.ReactNode;
  label: string;
  items: { path: string; label: string; }[];
  requiresAuth: boolean;
  requiresTeacher?: boolean;
};

export const Navigation = () => {
  const { t, currentLanguage, setLanguage } = useLanguageStore();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuthStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userFullName, setUserFullName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>(user?.user_metadata?.role || '');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  const isProfileActive = location.pathname === '/profile';

  useEffect(() => {
    // Initial theme setup on mount if not already done globally
    if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('theme', newTheme);
  };

  const toggleLanguage = () => {
    const langs: Language[] = ['en', 'ru', 'kk'];
    const currentIndex = langs.indexOf(currentLanguage);
    const nextIndex = (currentIndex + 1) % langs.length;
    setLanguage(langs[nextIndex]);
  };

  const navItems: NavItemType[] = [
    {
      path: '/',
      label: t('nav.home'),
      icon: <Home className="h-5 w-5" />,
      isActive: location.pathname === '/',
      requiresAuth: false
    },
    {
      path: '/generate-task',
      label: t('nav.generateTask'),
      icon: <ClipboardList className="h-5 w-5" />,
      isActive: location.pathname === '/generate-task' || location.pathname === '/task-preview',
      requiresAuth: true
    },
    {
      path: '/library',
      label: t('nav.library'),
      icon: <Library className="h-5 w-5" />,
      isActive: location.pathname === '/library',
      requiresAuth: true
    },
    {
      path: '/sheets',
      label: t('nav.taskSheets'),
      icon: <Layers className="h-5 w-5" />,
      isActive: location.pathname.startsWith('/sheets'),
      requiresAuth: true
    },
    {
      path: '/students',
      label: t('nav.students'),
      icon: <Users className="h-5 w-5" />,
      isActive: location.pathname === '/students',
      requiresAuth: true,
      requiresTeacher: true
    }
  ];

  const userMenuItems = [
    { path: '/profile', label: t('nav.profile'), icon: <User className="h-4 w-4" /> },
    { path: '/statistics', label: t('nav.statistics'), icon: <TrendingUp className="h-4 w-4" /> },
    { path: '/settings', label: t('nav.settings'), icon: <Settings className="h-4 w-4" /> }
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setUserFullName('');
        setUserRole('');
        return;
      }
      
      const metaFirstName = user.user_metadata?.first_name || '';
      const metaLastName = user.user_metadata?.last_name || '';
      const metaFullName = `${metaFirstName} ${metaLastName}`.trim();
      const metaRole = user.user_metadata?.role || 'student';
      
      if (metaFullName) setUserFullName(metaFullName);
      setUserRole(metaRole);
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, role')
          .eq('id', user.id)
          .single();
        
        if (data && !error) {
          const dbName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
          if (dbName) setUserFullName(dbName);
          if (data.role) setUserRole(data.role);
        }
      } catch (err) {
        console.error('Nav profile fetch error:', err);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    showToast(t('common.success'), 'success');
  };

  const visibleNavItems = navItems.filter(item => {
    if (item.requiresAuth && !user) return false;
    if (item.requiresTeacher && userRole !== 'teacher') return false;
    return true;
  });

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 transform transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-xl shadow-lg">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent hidden sm:inline-block">
                EXPP
              </span>
            </Link>

            <div className="hidden lg:flex items-center space-x-1 ml-6">
              {visibleNavItems.map((item, index) => (
                <NavLink
                  key={index}
                  to={'path' in item ? item.path : '#'}
                  className={({ isActive }) => `
                    flex items-center px-3 py-2 rounded-xl transition-all duration-200 text-sm
                    ${isActive 
                      ? 'bg-primary/10 text-primary font-bold shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }
                  `}
                >
                  {'icon' in item && item.icon}
                  <span className="ml-2">{'label' in item && item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center border-r border-border pr-4 mr-2 space-x-2">
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button 
                onClick={toggleLanguage}
                className="flex items-center space-x-1 px-3 py-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-accent transition-colors font-medium text-sm"
                title="Toggle Language"
              >
                <Globe className="w-4 h-4" />
                <span className="uppercase">{currentLanguage}</span>
              </button>
            </div>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className={`flex items-center space-x-3 px-4 py-2 rounded-xl hover:bg-accent transition-all ${isProfileActive ? 'bg-primary/10' : ''}`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium text-sm">{userFullName || t('nav.profile')}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-56 bg-background border border-border rounded-2xl shadow-2xl py-2 z-50 overflow-hidden"
                    >
                      {userMenuItems.map((item, idx) => (
                        <Link
                          key={idx}
                          to={item.path}
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center px-4 py-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                          {item.icon}
                          <span className="ml-3 font-medium">{item.label}</span>
                        </Link>
                      ))}
                      <div className="border-t border-border mt-2 pt-2">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center w-full px-4 py-3 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          <span className="font-bold">{t('nav.logout')}</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center space-x-3 text-sm">
                <Link to="/login" className="px-4 py-2 hover:text-primary transition-colors font-medium">{t('nav.login')}</Link>
                <Link to="/register" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:shadow-lg transition-all">{t('nav.register')}</Link>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center space-x-2">
            <button 
              onClick={toggleLanguage}
              className="p-2 text-muted-foreground uppercase font-bold text-sm"
            >
              {currentLanguage}
            </button>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-t border-border px-4 py-4"
          >
            <div className="flex items-center justify-between mb-4 border-b border-border pb-4">
              <span className="text-muted-foreground font-medium">Theme</span>
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-accent text-foreground transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
            
            <div className="space-y-2">
              {visibleNavItems.map((item, idx) => (
                <Link
                  key={idx}
                  to={'path' in item ? item.path : '#'}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center p-3 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {'icon' in item && item.icon}
                  <span className="ml-3 font-medium">{'label' in item && item.label}</span>
                </Link>
              ))}
            </div>
            {user && (
              <div className="mt-4 pt-4 border-t border-border space-y-2">
                {userMenuItems.map((item, idx) => (
                   <Link key={idx} to={item.path} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center p-3 text-muted-foreground">
                     {item.icon}
                     <span className="ml-3">{item.label}</span>
                   </Link>
                ))}
                <button onClick={handleSignOut} className="flex items-center w-full p-3 text-red-500">
                  <LogOut className="h-5 w-5 mr-3" />
                  <span>{t('nav.logout')}</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
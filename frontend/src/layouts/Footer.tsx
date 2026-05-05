import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Mail } from 'lucide-react';
import { useLanguageStore } from '@/store/languageStore';
 
 export const Footer: React.FC = () => {
   const { t } = useLanguageStore();
   const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div>
            <h2 className="text-xl font-bold mb-4">{t('nav.platform')}</h2>
            <p className="text-muted-foreground">
              {t('footer.description')}
            </p>
          </div>
          
          
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link to="/library" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('nav.library')}
                </Link>
              </li>
              <li>
                <Link to="/sheets" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('nav.taskSheets')}
                </Link>
              </li>
            </ul>
          </div>
          
          
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.resources')}</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/generate-task" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('nav.generateTask')}
                </Link>
              </li>
            </ul>
          </div>
          
          
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.connect')}</h3>
            <div className="flex space-x-4">
              <a href="https://github.com/Bixen7135/EXPP" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Github className="w-6 h-6" />
              </a>
              <a href="mailto:support@taskgenerator.com" className="text-muted-foreground hover:text-primary transition-colors">
                <Mail className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>
      </div>
      
      
      <div className="border-t border-border py-6">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="text-muted-foreground text-sm mb-4 md:mb-0">
            © {currentYear} {t('nav.platform')}. {t('footer.rights')}
          </div>
          <div className="flex space-x-6">
            <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors text-sm">
              {t('footer.privacy')}
            </Link>
            <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors text-sm">
              {t('footer.terms')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}; 
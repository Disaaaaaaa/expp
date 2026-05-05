import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translations, Language } from '@/i18n/translations';

type NestedTranslations = typeof translations.en;

interface LanguageState {
  currentLanguage: Language;
  t: (key: string) => string;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      currentLanguage: 'kk' as Language,
      t: (key: string): string => {
        const keys = key.split('.');
        let value: any = translations[get().currentLanguage];
        for (const k of keys) {
          value = value?.[k];
        }
        return value || key;
      },
      setLanguage: (lang: Language) => set({ currentLanguage: lang })
    }),
    {
      name: 'language-storage'
    }
  )
); 
import { useLanguageStore } from '@/store/languageStore';
import { Globe } from 'lucide-react';

export const LanguageSwitcher = () => {
  const { currentLanguage, setLanguage } = useLanguageStore();

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900">
        <Globe className="h-5 w-5" />
        <span className="uppercase">{currentLanguage}</span>
      </button>
      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 hidden group-hover:block">
        <button
          onClick={() => setLanguage('en')}
          className={`block px-4 py-2 text-sm w-full text-left ${
            currentLanguage === 'en' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
          } hover:bg-gray-100`}
        >
          English
        </button>
        <button
          onClick={() => setLanguage('ru')}
          className={`block px-4 py-2 text-sm w-full text-left ${
            currentLanguage === 'ru' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
          } hover:bg-gray-100`}
        >
          Русский
        </button>
        <button
          onClick={() => setLanguage('kk')}
          className={`block px-4 py-2 text-sm w-full text-left ${
            currentLanguage === 'kk' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
          } hover:bg-gray-100`}
        >
          Қазақша
        </button>
      </div>
    </div>
  );
}; 
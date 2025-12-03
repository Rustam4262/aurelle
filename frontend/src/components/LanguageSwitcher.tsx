import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useState } from 'react';

const languages = [
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'uz', name: 'O\'zbek', flag: '🇺🇿' },
  { code: 'en', name: 'English', flag: '🇬🇧' }
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    localStorage.setItem('language', languageCode);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        <Globe className="w-5 h-5 text-gray-600" />
        <span className="text-2xl">{currentLanguage.flag}</span>
        <span className="text-sm font-medium text-gray-700">{currentLanguage.name}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => changeLanguage(language.code)}
                className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors ${
                  currentLanguage.code === language.code ? 'bg-blue-50' : ''
                }`}
              >
                <span className="text-2xl">{language.flag}</span>
                <span className={`text-sm font-medium ${
                  currentLanguage.code === language.code ? 'text-blue-600' : 'text-gray-700'
                }`}>
                  {language.name}
                </span>
                {currentLanguage.code === language.code && (
                  <span className="ml-auto text-blue-600">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

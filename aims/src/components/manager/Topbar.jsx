import { useState, useEffect } from 'react';
import { Search, Menu, Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import SearchModal from './SearchModal';
import NotificationDropdown from './NotificationDropdown';

const languages = [
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'fil', name: 'Filipino', flag: '🇵🇭' },
];

export default function Topbar({ title, onMenuToggle }) {
  const { t, i18n } = useTranslation();
  const { dark, toggle } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuToggle}
            className="lg:hidden text-text-secondary hover:text-text-primary transition-colors"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors"
            title="검색 (Cmd+K)"
          >
            <Search size={18} />
          </button>
          <NotificationDropdown />

          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors text-base"
              title="Change language"
            >
              {currentLanguage.flag}
            </button>

            {langMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-card border border-border rounded-xl shadow-lg z-50">
                {languages.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      i18n.changeLanguage(lang.code);
                      setLangMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors first:rounded-t-xl last:rounded-b-xl ${
                      i18n.language === lang.code
                        ? 'bg-accent text-white'
                        : 'text-text-primary hover:bg-card-hover'
                    }`}
                  >
                    <span className="text-base">{lang.flag}</span>
                    {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={toggle}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors"
            title={dark ? t('common.lightMode') : t('common.darkMode')}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

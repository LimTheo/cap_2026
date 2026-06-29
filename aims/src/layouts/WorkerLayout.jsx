import { useState } from 'react';
import { Outlet, useLocation, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Cpu, Home, Clock, Settings, Globe } from 'lucide-react';
import BottomTabBar from '../components/worker/BottomTabBar';
import { useTheme } from '../contexts/ThemeContext';

const languages = [
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'fil', name: 'Filipino', flag: '🇵🇭' },
];

export default function WorkerLayout() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { dark, toggle } = useTheme();
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[4];

  const tabs = [
    { to: '/worker/home', icon: Home, label: t('worker.nav.home') },
    { to: '/worker/history', icon: Clock, label: t('worker.nav.history') },
    { to: '/worker/settings', icon: Settings, label: t('worker.nav.settings') },
  ];

  const hideTabBar =
    location.pathname.includes('/procedure/') ||
    location.pathname.includes('/confirm/');

  return (
    <div className="min-h-screen bg-primary">
      {/* Top bar — always visible */}
      <header className="h-14 flex items-center justify-between px-4 md:px-8 border-b border-border sticky top-0 z-30 bg-card shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
            <Cpu size={13} className="text-white" />
          </div>
          <span className="text-base font-bold text-text-primary">AIMS</span>
          <span className="ml-2 text-xs text-text-muted hidden sm:inline bg-card-hover px-2 py-0.5 rounded-full">
            {t('worker.nav.workerBadge')}
          </span>
        </div>

        {/* Desktop nav tabs — hidden on mobile */}
        {!hideTabBar && (
          <nav className="hidden md:flex items-center gap-1">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-accent text-white'
                      : 'text-text-secondary hover:text-text-primary hover:bg-card-hover'
                  }`
                }
              >
                <tab.icon size={15} />
                {tab.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:bg-card-hover transition-colors text-sm"
            title={dark ? t('common.lightMode') : t('common.darkMode')}
          >
            {dark ? '☀️' : '🌙'}
          </button>

          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:bg-card-hover transition-colors text-base"
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
        </div>
      </header>

      {/* Content */}
      <main className={`${hideTabBar ? '' : 'md:pb-0 pb-20'}`}>
        <Outlet />
      </main>

      {/* Bottom tab bar — mobile only */}
      {!hideTabBar && <BottomTabBar />}
    </div>
  );
}

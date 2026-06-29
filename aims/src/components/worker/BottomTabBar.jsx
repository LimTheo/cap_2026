import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Clock, Settings } from 'lucide-react';

// 모바일에서만 표시 (md 이상에서는 WorkerLayout 상단 네비 사용)
export default function BottomTabBar() {
  const { t } = useTranslation();

  const tabs = [
    { to: '/worker/home', icon: Home, label: t('worker.nav.home') },
    { to: '/worker/history', icon: Clock, label: t('worker.nav.history') },
    { to: '/worker/settings', icon: Settings, label: t('worker.nav.settings') },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-50">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[48px] transition-colors ${
              isActive ? 'text-accent' : 'text-text-muted'
            }`
          }
        >
          <tab.icon size={22} />
          <span className="text-xs">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

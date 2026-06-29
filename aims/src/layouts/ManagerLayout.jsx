import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/manager/Sidebar';
import Topbar from '../components/manager/Topbar';

export default function ManagerLayout() {
  const { t } = useTranslation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const pageTitles = {
    '/manager/dashboard': t('manager.pageTitle.dashboard'),
    '/manager/upload': t('manager.pageTitle.upload'),
    '/manager/procedures': t('manager.pageTitle.procedures'),
    '/manager/publish': t('manager.pageTitle.publish'),
    '/manager/workers': t('manager.pageTitle.workers'),
    '/manager/notifications': t('manager.pageTitle.notifications') || '알림',
  };

  const basePath = '/' + location.pathname.split('/').slice(1, 3).join('/');
  const title = pageTitles[basePath] || 'AIMS';

  const currentTitle = location.pathname.includes('/analysis/')
    ? t('manager.pageTitle.analysis')
    : location.pathname.includes('/procedures/')
      ? t('manager.pageTitle.procedureEdit')
      : title;

  return (
    <div className="min-h-screen bg-primary">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar — always visible on lg+ */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile sidebar */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <Sidebar collapsed={false} onToggle={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
      >
        <Topbar
          title={currentTitle}
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <main className="p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

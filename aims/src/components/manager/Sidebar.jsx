import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Upload,
  ClipboardList,
  CheckCircle,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Cpu,
} from 'lucide-react';

export default function Sidebar({ collapsed, onToggle }) {
  const { t } = useTranslation();

  const menuItems = [
    { to: '/manager/dashboard', icon: LayoutDashboard, label: t('manager.nav.dashboard') },
    { to: '/manager/upload', icon: Upload, label: t('manager.nav.upload') },
    { to: '/manager/procedures', icon: ClipboardList, label: t('manager.nav.procedures') },
    { to: '/manager/publish', icon: CheckCircle, label: t('manager.nav.publish') },
    { to: '/manager/workers', icon: Users, label: t('manager.nav.workers') },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-full z-40 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
      style={{ backgroundColor: '#1e293b' }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
            <Cpu size={16} className="text-white" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-base font-bold text-white tracking-tight leading-none">AIMS</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{t('common.appSubtitle')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {!collapsed && (
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-4 mb-2">
            {t('manager.nav.menu')}
          </p>
        )}
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 mx-2 mb-0.5 rounded-lg transition-all duration-150 ${
                collapsed ? 'justify-center py-3 px-0' : 'px-3 py-2.5'
              } ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={18}
                  className={`shrink-0 ${isActive ? 'text-blue-400' : ''}`}
                />
                {!collapsed && (
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                )}
                {!collapsed && isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: Profile + Collapse */}
      <div className="border-t border-white/10 p-3 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              김
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">김관리</p>
              <p className="text-xs text-slate-500">{t('manager.nav.admin')}</p>
            </div>
          </div>
        )}
        <div className={`flex items-center ${collapsed ? 'flex-col gap-2' : 'justify-between'}`}>
          <NavLink
            to="/"
            title={t('common.logout')}
            className="flex items-center gap-2 text-slate-500 hover:text-red-400 text-sm transition-colors p-1 rounded"
          >
            <LogOut size={15} />
            {!collapsed && <span>{t('common.logout')}</span>}
          </NavLink>
          <button
            onClick={onToggle}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded"
            title={collapsed ? t('manager.nav.expandSidebar') : t('manager.nav.collapseSidebar')}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>
      </div>
    </aside>
  );
}

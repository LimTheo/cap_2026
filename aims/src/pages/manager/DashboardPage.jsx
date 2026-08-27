import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Layers,
  FileText,
  Clock,
  CheckCircle2,
  ArrowRight,
  Upload,
  AlertTriangle,
  Loader,
  Image,
} from 'lucide-react';
import { procedureAPI } from '../../utils/api';

function StatCard({ icon: Icon, label, value, color, subtext }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 hover:bg-card-hover transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="text-sm text-text-secondary mt-1">{label}</p>
      {subtext && <p className="text-xs text-text-muted mt-1">{subtext}</p>}
    </div>
  );
}

function RecentActivityCard({ proc, statusConfig, navigate, t }) {
  const [imageError, setImageError] = useState(false);
  const cfg = statusConfig[proc.status];

  return (
    <div
      onClick={() => navigate(`/manager/procedures/${proc.id}`)}
      className="min-w-[240px] bg-card rounded-xl border border-border overflow-hidden hover:bg-card-hover hover:border-accent transition-all cursor-pointer"
    >
      <div className="h-32 bg-card-hover flex items-center justify-center relative overflow-hidden">
        {proc.thumbnail_url && !imageError ? (
          <img
            src={proc.thumbnail_url}
            alt={proc.task_name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <Image size={32} className="text-text-muted" />
        )}
        <span
          className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color} ${cfg.textColor}`}
        >
          {t(`common.status.${proc.status}`)}
        </span>
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-text-primary truncate">
          {proc.task_name}
        </p>
        <p className="text-xs text-text-muted mt-1 truncate">
          {proc.process_name}
        </p>
        <div className="flex items-center justify-between text-xs text-text-muted mt-2">
          <span>{proc.step_count || 0}단계</span>
        </div>
      </div>
    </div>
  );
}


export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProcedures: 0,
    draft: 0,
    published: 0,
    archived: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await procedureAPI.list();
        const data = result.data || [];

        setProcedures(data);
        setStats({
          totalProcedures: data.length,
          draft: data.filter(p => p.status === 'draft').length,
          published: data.filter(p => p.status === 'published').length,
          archived: data.filter(p => p.status === 'archived').length,
        });
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statusConfig = {
    draft: { color: 'bg-yellow-100', textColor: 'text-yellow-700' },
    published: { color: 'bg-green-100', textColor: 'text-green-700' },
    archived: { color: 'bg-gray-100', textColor: 'text-gray-700' },
  };

  const activityIcons = {
    upload: Upload,
    approve: CheckCircle2,
    complete: CheckCircle2,
    reject: AlertTriangle,
    alert: AlertTriangle,
  };

  const activityColors = {
    upload: 'text-accent',
    approve: 'text-success',
    complete: 'text-success',
    reject: 'text-danger',
    alert: 'text-warning',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="animate-spin text-accent" size={40} />
      </div>
    );
  }

  const recentProcedures = procedures.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label={t('manager.dashboard.totalProcedures')}
          value={stats.totalProcedures}
          color="bg-accent"
        />
        <StatCard
          icon={Clock}
          label={t('manager.dashboard.pendingReview')}
          value={stats.draft}
          color="bg-warning"
          subtext={t('manager.dashboard.pendingReviewSub')}
        />
        <StatCard
          icon={CheckCircle2}
          label={t('manager.dashboard.published')}
          value={stats.published}
          color="bg-success"
        />
        <StatCard
          icon={Layers}
          label={t('common.status.archived')}
          value={stats.archived}
          color="bg-text-muted"
        />
      </div>

      {/* Recent Procedures */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">{t('manager.dashboard.recentActivity')}</h2>
          <button
            onClick={() => navigate('/manager/procedures')}
            className="text-sm text-accent flex items-center gap-1 hover:underline"
          >
            {t('manager.dashboard.viewAll')} <ArrowRight size={14} />
          </button>
        </div>
        {recentProcedures.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-text-muted">
            <FileText size={32} className="mx-auto mb-2 opacity-50" />
            <p>{t('common.noResults')}</p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recentProcedures.map((proc) => (
              <RecentActivityCard
                key={proc.id}
                proc={proc}
                statusConfig={statusConfig}
                navigate={navigate}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Draft Status */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <h3 className="font-semibold text-text-primary">{t('common.status.draft')}</h3>
          </div>
          <p className="text-3xl font-bold text-text-primary">{stats.draft}</p>
          <p className="text-xs text-text-muted mt-2">{t('manager.dashboard.pendingReviewSub')}</p>
        </div>

        {/* Published Status */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <h3 className="font-semibold text-text-primary">{t('common.status.published')}</h3>
          </div>
          <p className="text-3xl font-bold text-text-primary">{stats.published}</p>
          <p className="text-xs text-text-muted mt-2">{t('manager.dashboard.published')}</p>
        </div>

        {/* Archived Status */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-gray-500" />
            <h3 className="font-semibold text-text-primary">{t('common.status.archived')}</h3>
          </div>
          <p className="text-3xl font-bold text-text-primary">{stats.archived}</p>
          <p className="text-xs text-text-muted mt-2">{t('common.status.archived')}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-text-primary mb-4">{t('manager.dashboard.viewAll')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/manager/upload')}
            className="px-4 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors flex items-center gap-2 justify-center"
          >
            <Upload size={18} />
            {t('manager.nav.upload')}
          </button>
          <button
            onClick={() => navigate('/manager/procedures')}
            className="px-4 py-3 bg-primary hover:bg-card-hover border border-border text-text-primary rounded-lg font-medium transition-colors flex items-center gap-2 justify-center"
          >
            <FileText size={18} />
            {t('manager.nav.procedures')}
          </button>
        </div>
      </div>
    </div>
  );
}

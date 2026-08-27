import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, FileText, Loader, AlertCircle, Image } from 'lucide-react';
import { procedureAPI } from '../../utils/api';
import { processes } from '../../data/dummyData';

export default function ProceduresListPage() {
  const { t } = useTranslation();
  const statusFilters = [
    { value: null, label: t('common.all') },
    { value: 'draft', label: t('common.status.draft') },
    { value: 'published', label: t('common.status.published') },
    { value: 'archived', label: t('common.status.archived') },
  ];

  const statusConfig = {
    draft: { color: 'bg-yellow-100', textColor: 'text-yellow-700' },
    published: { color: 'bg-green-100', textColor: 'text-green-700' },
    archived: { color: 'bg-gray-100', textColor: 'text-gray-700' },
  };
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProcedures = async () => {
      try {
        setLoading(true);
        setError('');
        const result = await procedureAPI.list(statusFilter);
        setSops(result.data || []);
      } catch (err) {
        console.error('Error fetching procedures:', err);
        setError(err.message || t('manager.proceduresList.loadError'));
      } finally {
        setLoading(false);
      }
    };

    fetchProcedures();
  }, [statusFilter]);

  const filtered = sops.filter((p) => {
    if (searchQuery && !p.task_name.includes(searchQuery) && !p.process_name.includes(searchQuery)) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="animate-spin text-accent" size={40} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-3 text-danger" size={40} />
          <p className="text-danger">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('manager.proceduresList.searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 bg-card rounded-xl p-1 overflow-x-auto">
        {statusFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === f.value
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((proc) => {
          const cfg = statusConfig[proc.status];
          return (
            <ProcedureCard
              key={proc.id}
              proc={proc}
              cfg={cfg}
              navigate={navigate}
              t={t}
            />
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-text-muted">
          <FileText size={40} className="mx-auto mb-3 opacity-50" />
          <p>{t('common.noResults')}</p>
        </div>
      )}
    </div>
  );
}

function ProcedureCard({ proc, cfg, navigate, t }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      onClick={() => navigate(`/manager/procedures/${proc.id}`)}
      className="bg-card rounded-xl border border-border overflow-hidden hover:bg-card-hover hover:border-text-muted transition-all cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="h-36 bg-card-hover flex items-center justify-center relative overflow-hidden">
        {proc.thumbnail_url && !imageError ? (
          <img
            src={proc.thumbnail_url}
            alt={proc.task_name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <Image size={40} className="text-text-muted" />
        )}
        <span
          className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color} ${cfg.textColor}`}
        >
          {t(`common.status.${proc.status}`)}
        </span>
      </div>
      <div className="p-4">
        <h3 className="text-sm font-medium text-text-primary mb-1 truncate">
          {proc.task_name}
        </h3>
        <p className="text-xs text-text-muted mb-2">{proc.process_name}</p>
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>{t('manager.proceduresList.stepCount', { count: proc.step_count })}</span>
        </div>
        {proc.duration && (
          <div className="text-xs text-text-muted mt-2">
            {proc.duration}
          </div>
        )}
      </div>
    </div>
  );
}

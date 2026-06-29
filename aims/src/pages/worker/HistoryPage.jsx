import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Loader, AlertCircle, Eye, Users } from 'lucide-react';
import { workerAPI } from '../../utils/api';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
const DEFAULT_USER_ID = 'user_worker_00';

export default function HistoryPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [workers, setWorkers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(DEFAULT_USER_ID);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const statusConfig = {
    completed: { icon: CheckCircle, color: 'text-success', label: t('common.status.completed') },
    in_progress: { icon: XCircle, color: 'text-warning', label: t('common.status.in_progress') },
    failed: { icon: XCircle, color: 'text-danger', label: t('common.status.failed') },
  };

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/worker/list`);
        if (response.ok) {
          const data = await response.json();
          setWorkers(data.workers || []);
        }
      } catch (err) {
        console.error('Error fetching workers:', err);
      }
    };

    fetchWorkers();
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError('');
        const result = await workerAPI.getHistory(currentUserId, null, 0, 100);
        setHistory(result.data || []);
      } catch (err) {
        console.error('Error fetching history:', err);
        setError(err.message || t('worker.history.loadError'));
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [currentUserId, t]);

  const filtered = filter === 'all'
    ? history
    : history.filter(h => h.status === filter);

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
      {/* Worker Selector */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-3">
          <Users size={18} className="text-accent" />
          <label className="text-sm font-medium text-text-primary">근로자 선택:</label>
          <select
            value={currentUserId}
            onChange={(e) => setCurrentUserId(e.target.value)}
            className="px-4 py-2 bg-primary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.name} ({worker.username})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 bg-card rounded-xl p-1 overflow-x-auto">
        {[
          { value: 'all', label: t('worker.history.filterAll') },
          { value: 'completed', label: t('worker.history.filterCompleted') },
          { value: 'in_progress', label: t('worker.history.filterInProgress') },
          { value: 'failed', label: t('worker.history.filterFailed') },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.value
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* History Table */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-text-muted">
          <p>{t('worker.history.noHistory')}</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-primary">
                  <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase">{t('worker.history.colTask')}</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase">{t('worker.history.colStatus')}</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-text-muted uppercase">{t('worker.history.colCompletionRate')}</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase">{t('worker.history.colDuration')}</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase">{t('worker.history.colDate')}</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-text-muted uppercase">{t('worker.history.colAction')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => {
                  const statusCfg = statusConfig[record.status];
                  const StatusIcon = statusCfg?.icon || CheckCircle;
                  const startDate = new Date(record.started_at);
                  const endDate = record.completed_at ? new Date(record.completed_at) : null;
                  const duration = endDate
                    ? Math.round((endDate - startDate) / 1000 / 60) // 분 단위
                    : '--';

                  return (
                    <tr
                      key={record.id}
                      className="border-b border-border last:border-0 hover:bg-card-hover transition-colors"
                    >
                      <td className="px-5 py-4 text-sm text-text-primary font-medium">
                        {record.task_name}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <StatusIcon size={16} className={statusCfg?.color} />
                          <span className="text-text-secondary">{statusCfg?.label}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-12 h-1.5 bg-primary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent"
                              style={{ width: `${record.accuracy_score || 0}%` }}
                            />
                          </div>
                          <span className="text-text-secondary font-medium">
                            {Math.round(record.accuracy_score || 0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-text-secondary">
                        {duration === null ? '--' : t('worker.history.durationMinutes', { duration })}
                      </td>
                      <td className="px-5 py-4 text-sm text-text-secondary">
                        {startDate.toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : 'en-US')}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => navigate(`/worker/procedure/${record.sop_id}`)}
                          className="p-1.5 text-text-muted hover:text-accent transition-colors"
                          title={t('worker.history.viewDetail')}
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {history.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-success/10 rounded-xl border border-success/20 p-4">
            <p className="text-sm text-text-secondary mb-1">{t('worker.history.completedTasks')}</p>
            <p className="text-2xl font-bold text-success">
              {history.filter(h => h.status === 'completed').length}
            </p>
          </div>
          <div className="bg-warning/10 rounded-xl border border-warning/20 p-4">
            <p className="text-sm text-text-secondary mb-1">{t('worker.history.inProgress')}</p>
            <p className="text-2xl font-bold text-warning">
              {history.filter(h => h.status === 'in_progress').length}
            </p>
          </div>
          <div className="bg-text-muted/10 rounded-xl border border-text-muted/20 p-4">
            <p className="text-sm text-text-secondary mb-1">{t('worker.history.avgCompletionRate')}</p>
            <p className="text-2xl font-bold text-text-primary">
              {history.length > 0
                ? Math.round(
                  history.reduce((sum, h) => sum + (h.accuracy_score || 0), 0) / history.length
                )
                : 0}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PlayCircle, CheckCircle2, FileText, Loader, AlertCircle } from 'lucide-react';
import { workerAPI } from '../../utils/api';

const CURRENT_USER_ID = 'user_worker_00';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProcedures = async () => {
      try {
        setLoading(true);
        const result = await workerAPI.getProcedures(CURRENT_USER_ID);
        setProcedures(result.procedures || []);
      } catch (err) {
        console.error('Error fetching procedures:', err);
        setError(err.message || t('worker.home.loadError'));
      } finally {
        setLoading(false);
      }
    };

    fetchProcedures();
  }, [t]);

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
    <div className="p-4 space-y-5">
      {/* Greeting */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <p className="text-xl font-bold mb-1">
          {t('worker.home.greeting')}
        </p>
        <p className="text-base text-text-secondary" dangerouslySetInnerHTML={{
          __html: t('worker.home.procedureCount', { count: procedures.length }).replace('<accent>', '<span className="text-accent font-bold">').replace('</accent>', '</span>')
        }} />
        <p className="text-sm text-text-muted mt-1">
          {t('worker.home.selectInstruction')}
        </p>
      </div>

      {/* Procedure Cards */}
      {procedures.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center text-text-muted">
          <FileText size={40} className="mx-auto mb-3 opacity-50" />
          <p>{t('worker.home.noProcedures')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {procedures.map((proc) => (
            <div
              key={proc.id}
              className="bg-card rounded-2xl border border-border overflow-hidden hover:bg-card-hover transition-colors cursor-pointer"
              onClick={() => navigate(`/worker/procedure/${proc.id}`)}
            >
              {/* Thumbnail */}
              <div className="h-40 bg-card-hover flex items-center justify-center relative overflow-hidden">
                {proc.thumbnail_url ? (
                  <img
                    src={`${BACKEND_URL}${proc.thumbnail_url}`}
                    alt={proc.task_name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <FileText size={40} className="text-text-muted" />
                )}
                <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 text-white`}>
                  <PlayCircle size={14} />
                  <span className="text-xs font-medium">{t('worker.home.canStart')}</span>
                </div>
                <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full bg-accent/20 text-accent text-xs font-medium`}>
                  {t('worker.home.steps', { count: proc.step_count })}
                </div>
              </div>

              <div className="p-4 space-y-3">
                {/* Title */}
                <div>
                  <h3 className="text-base font-bold text-text-primary mb-1">
                    {proc.task_name}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {proc.process_name}
                  </p>
                </div>

                {/* Info */}
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <div className="flex gap-4">
                    <span>⏱️ {proc.duration}</span>
                    <span>⭐ {t('worker.home.confidence', { value: proc.confidence })}</span>
                  </div>
                </div>

                {/* Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/worker/procedure/${proc.id}`);
                  }}
                  className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {t('worker.home.startWork')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader, AlertCircle, Save, Trash2, Send } from 'lucide-react';
import { procedureAPI } from '../../utils/api';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const statusConfig = {
  draft: { color: 'bg-yellow-100', textColor: 'text-yellow-700' },
  published: { color: 'bg-green-100', textColor: 'text-green-700' },
  archived: { color: 'bg-gray-100', textColor: 'text-gray-700' },
};

export default function ProcedureEditPage() {
  const { t } = useTranslation();
  const { id: sopId } = useParams();
  const navigate = useNavigate();

  const [sop, setSop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const fetchSOP = async () => {
      try {
        setLoading(true);
        const result = await procedureAPI.get(sopId);
        console.log('📥 ProcedureEditPage received SOP:', result);
        console.log('  - process_name:', result.process_name);
        console.log('  - task_name:', result.task_name);
        setSop(result);
        const newFormData = {
          process_name: result.process_name,
          task_name: result.task_name,
          transcript_text: result.transcript?.text || '',
        };
        console.log('📝 Setting formData:', newFormData);
        setFormData(newFormData);
      } catch (err) {
        console.error('Error fetching SOP:', err);
        setError(err.message || t('manager.procedureEdit.loadError'));
      } finally {
        setLoading(false);
      }
    };

    if (sopId) fetchSOP();
  }, [sopId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await procedureAPI.update(sopId, formData);
      alert(t('manager.procedureEdit.saveDone'));
      // 데이터 다시 로드
      const result = await procedureAPI.get(sopId);
      setSop(result);
    } catch (err) {
      alert(`${t('common.error')}: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!window.confirm(t('manager.procedureEdit.confirmPublish'))) return;
    try {
      setSaving(true);
      await procedureAPI.publish(sopId);
      alert(t('manager.procedureEdit.publishDone'));
      navigate('/manager/procedures');
    } catch (err) {
      alert(`${t('common.error')}: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('manager.procedureEdit.confirmDelete'))) return;
    try {
      setSaving(true);
      console.log('🗑️ Deleting procedure:', sopId);
      const result = await procedureAPI.delete(sopId);
      console.log('✅ Delete successful:', result);
      alert(t('manager.procedureEdit.deleteDone'));
      navigate('/manager/procedures');
    } catch (err) {
      console.error('❌ Delete failed:', err);
      alert(`${t('common.error')}: ${err.message || '삭제에 실패했습니다.'}`);
    } finally {
      setSaving(false);
    }
  };

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
          <button
            onClick={() => navigate('/manager/procedures')}
            className="mt-4 px-4 py-2 bg-accent text-white rounded-lg"
          >
            {t('manager.procedureEdit.backToListButton')}
          </button>
        </div>
      </div>
    );
  }

  if (!sop) return null;

  const cfg = statusConfig[sop.status];
  const canEdit = sop.status === 'draft';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-text-primary">{sop.task_name}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color} ${cfg.textColor}`}>
                {t(`common.status.${sop.status}`)}
              </span>
            </div>
            <p className="text-sm text-text-secondary">{sop.process_name}</p>
            {sop.duration && (
              <p className="text-xs text-text-muted mt-1">
                📹 {sop.duration} | 신뢰도 {sop.confidence}%
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Save size={16} />
                  {t('common.save')}
                </button>
                <button
                  onClick={handlePublish}
                  disabled={saving}
                  className="px-4 py-2 bg-success hover:bg-success/80 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Send size={16} />
                  {t('manager.procedureEdit.publish')}
                </button>
              </>
            )}
            <button
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-2 bg-danger hover:bg-danger/80 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Trash2 size={16} />
              {t('common.delete')}
            </button>
            {!canEdit && (
              <button
                onClick={() => navigate('/manager/procedures')}
                className="px-4 py-2 bg-text-muted/20 hover:bg-text-muted/30 text-text-primary rounded-lg text-sm font-medium transition-colors"
              >
                {t('manager.procedureEdit.backToList')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Video */}
      {sop.video_url && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-text-primary mb-3">📹</h3>
          <video
            src={`${BACKEND_URL}${sop.video_url}`}
            controls
            className="w-full rounded-lg bg-black"
            style={{ maxHeight: '400px' }}
          />
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-text-primary">{t('manager.procedureEdit.basicInfo')}</h3>
        {canEdit ? (
          <>
            <div>
              <label className="block text-sm text-text-secondary mb-2">{t('manager.procedureEdit.processName')}</label>
              <input
                type="text"
                name="process_name"
                value={formData.process_name}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-primary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-2">{t('manager.procedureEdit.taskName')}</label>
              <input
                type="text"
                name="task_name"
                value={formData.task_name}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-primary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-2">{t('manager.procedureEdit.transcript')}</label>
              <textarea
                name="transcript_text"
                value={formData.transcript_text}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-2.5 bg-primary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
          </>
        ) : (
          <>
            <p className="text-text-primary">
              <span className="text-text-secondary">{t('manager.procedureEdit.processLabel')}</span> {sop.process_name}
            </p>
            <p className="text-text-primary">
              <span className="text-text-secondary">{t('manager.procedureEdit.taskLabel')}</span> {sop.task_name}
            </p>
            {sop.transcript?.text && (
              <p className="text-text-primary">
                <span className="text-text-secondary">{t('manager.procedureEdit.speechLabel')}</span> {sop.transcript.text}
              </p>
            )}
          </>
        )}
      </div>

      {/* Steps */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <h3 className="font-semibold text-text-primary">{t('manager.procedureEdit.steps', { count: sop.steps?.length || 0 })}</h3>
        <div className="space-y-2">
          {sop.steps && sop.steps.map((step) => (
            <div key={step.step_number} className="p-3 bg-primary rounded-lg flex gap-3">
              {step.thumbnail_url && (
                <img
                  src={`${BACKEND_URL}${step.thumbnail_url}`}
                  alt={`Step ${step.step_number}`}
                  className="w-16 h-16 rounded object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary">단계 {step.step_number}: {step.name}</p>
                <p className="text-xs text-text-secondary mb-1.5">
                  {Math.round(step.time_start)}초 ~ {Math.round(step.time_end)}초 (신뢰도: {step.confidence}%)
                </p>
                {step.description && (
                  <p className="text-sm text-text-secondary whitespace-pre-line leading-relaxed">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tools */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <h3 className="font-semibold text-text-primary">감지된 부품·공구 ({sop.detected_tools?.length || 0})</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sop.detected_tools && sop.detected_tools.map((tool) => (
            <div key={tool.name} className="p-3 bg-primary rounded-lg flex items-center justify-between">
              <div>
                <p className="font-medium text-text-primary">{tool.icon} {tool.name}</p>
                <p className="text-xs text-text-secondary">
                  단계: {tool.steps_involved?.join(', ')} | 신뢰도: {tool.confidence}%
                </p>
              </div>
              {tool.preview_url && (
                <img src={`${BACKEND_URL}${tool.preview_url}`} alt={tool.name} className="w-12 h-12 rounded object-cover" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Metadata */}
      <div className="text-xs text-text-muted">
        <p>생성: {new Date(sop.created_at).toLocaleString('ko-KR')}</p>
        <p>수정: {new Date(sop.updated_at).toLocaleString('ko-KR')}</p>
        {sop.published_at && (
          <p>게시: {new Date(sop.published_at).toLocaleString('ko-KR')}</p>
        )}
      </div>
    </div>
  );
}

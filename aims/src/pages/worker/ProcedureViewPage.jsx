import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader, AlertCircle, ChevronDown, ChevronUp, Send, Play } from 'lucide-react';
import { procedureAPI, workerAPI } from '../../utils/api';

const CURRENT_USER_ID = 'user_001';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export default function ProcedureViewPage() {
  const { t, i18n } = useTranslation();
  const { id: sopId } = useParams();
  const navigate = useNavigate();

  const [sop, setSop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedStep, setExpandedStep] = useState(0);
  const [feedbackMode, setFeedbackMode] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({
    feedback_type: 'unclear',
    message: '',
    rating: 5,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchSOP = async () => {
      try {
        setLoading(true);
        const result = await procedureAPI.get(sopId);
        setSop(result);
        if (result.steps && result.steps.length > 0) {
          setExpandedStep(0);
        }
      } catch (err) {
        console.error('Error fetching SOP:', err);
        setError(err.message || t('worker.procedureView.loadError'));
      } finally {
        setLoading(false);
      }
    };

    if (sopId) fetchSOP();
  }, [sopId]);

  const handleFeedbackChange = (e) => {
    const { name, value } = e.target;
    setFeedbackForm(prev => ({
      ...prev,
      [name]: name === 'rating' ? parseInt(value) : value,
    }));
  };

  const handleSubmitFeedback = async (stepNumber = null) => {
    try {
      setSubmitting(true);
      const feedback = {
        sop_id: sopId,
        ...feedbackForm,
        step_number: stepNumber,
      };
      await workerAPI.submitFeedback(CURRENT_USER_ID, feedback);
      alert(t('worker.procedureView.feedbackSubmitted'));
      setFeedbackMode(null);
      setFeedbackForm({ feedback_type: 'unclear', message: '', rating: 5 });
    } catch (err) {
      alert(`${t('common.error')}: ${err.message}`);
    } finally {
      setSubmitting(false);
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
            onClick={() => navigate('/worker/home')}
            className="mt-4 px-4 py-2 bg-accent text-white rounded-lg"
          >
            {t('worker.procedureView.backToList')}
          </button>
        </div>
      </div>
    );
  }

  if (!sop) return null;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-6 sticky top-0 z-10">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-text-primary mb-1">{sop.task_name}</h2>
          <p className="text-base text-text-secondary">{sop.process_name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 mb-5 text-sm text-text-secondary">
          <span>⏱️ {sop.duration}</span>
          <span>📍 {t('worker.procedureView.stepsCount', { count: sop.steps?.length || 0 })}</span>
        </div>
        <button
          onClick={() => navigate(`/worker/confirm/${sopId}`)}
          className="w-full px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Play size={18} />
          {t('worker.procedureView.startWork')}
        </button>
      </div>

      {/* Transcript */}
      {sop.transcript?.text && (
        <div className="bg-blue-50 dark:bg-blue-950 rounded-xl border border-blue-200 dark:border-blue-800 p-5">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🎙️ {t('worker.procedureView.transcript')}</h3>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {sop.transcript.text}
          </p>
          {sop.transcript.language && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              {t('worker.procedureView.language')}: {sop.transcript.language}
            </p>
          )}
        </div>
      )}

      {/* Steps */}
      <div className="space-y-3">
        <h3 className="font-semibold text-text-primary">{t('worker.procedureView.steps')}</h3>
        {sop.steps && sop.steps.map((step, idx) => (
          <div
            key={step.step_number}
            className="bg-card rounded-xl border border-border overflow-hidden"
          >
            <button
              onClick={() => setExpandedStep(expandedStep === idx ? -1 : idx)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-card-hover transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 text-left">
                <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm font-bold">
                  {step.step_number}
                </div>
                <div>
                  <p className="font-medium text-text-primary">{step.name}</p>
                  <p className="text-xs text-text-muted">
                    {t('worker.procedureView.stepTime', { start: Math.round(step.time_start), end: Math.round(step.time_end), confidence: step.confidence })}
                  </p>
                </div>
              </div>
              {expandedStep === idx ? (
                <ChevronUp size={20} className="text-text-muted" />
              ) : (
                <ChevronDown size={20} className="text-text-muted" />
              )}
            </button>

            {expandedStep === idx && (
              <div className="border-t border-border px-5 py-4 bg-primary space-y-4">
                {step.description && (
                  <div>
                    <p className="text-sm text-text-secondary mb-1">📝 {t('worker.procedureView.description')}</p>
                    <p className="text-sm text-text-primary">{step.description}</p>
                  </div>
                )}

                {step.thumbnail_url && (
                  <div>
                    <p className="text-sm text-text-secondary mb-2">📸 {t('worker.procedureView.thumbnail')}</p>
                    <img
                      src={`${BACKEND_URL}${step.thumbnail_url}`}
                      alt={`Step ${step.step_number}`}
                      className="w-full rounded-lg max-h-96"
                    />
                  </div>
                )}

                <button
                  onClick={() => {
                    setFeedbackMode(step.step_number);
                    setFeedbackForm(prev => ({ ...prev, step_number: step.step_number }));
                  }}
                  className="text-sm text-accent hover:underline"
                >
                  {t('worker.procedureView.leaveFeedback')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tools */}
      {sop.detected_tools && sop.detected_tools.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-text-primary">{t('worker.procedureView.detectedTools')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sop.detected_tools.map((tool) => (
              <div key={tool.name} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{tool.icon}</span>
                  <div>
                    <p className="font-medium text-text-primary">{tool.name}</p>
                  </div>
                </div>
                <p className="text-xs text-text-secondary">
                  {t('worker.procedureView.toolSteps', { steps: tool.steps_involved?.join(', ') })}
                </p>
                {tool.preview_url && (
                  <img
                    src={`${BACKEND_URL}${tool.preview_url}`}
                    alt={tool.name}
                    className="w-full rounded mt-2"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback Section */}
      {feedbackMode && (
        <div className="bg-yellow-50 dark:bg-yellow-950 rounded-xl border border-yellow-200 dark:border-yellow-800 p-5 space-y-4">
          <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
            {feedbackMode ? t('worker.procedureView.feedbackForStep', { number: feedbackMode }) : t('worker.procedureView.feedbackTitle')}
          </h3>

          <div>
            <label className="block text-sm text-yellow-800 dark:text-yellow-200 mb-2">{t('worker.procedureView.feedbackType')}</label>
            <select
              name="feedback_type"
              value={feedbackForm.feedback_type}
              onChange={handleFeedbackChange}
              className="w-full px-4 py-2.5 bg-white dark:bg-primary border border-yellow-300 dark:border-yellow-700 rounded-lg text-sm focus:outline-none focus:border-accent"
            >
              <option value="unclear">{t('worker.procedureView.feedbackUnclear')}</option>
              <option value="missing_step">{t('worker.procedureView.feedbackMissingStep')}</option>
              <option value="incorrect_tool">{t('worker.procedureView.feedbackIncorrectTool')}</option>
              <option value="timing_issue">{t('worker.procedureView.feedbackTimingIssue')}</option>
              <option value="other">{t('worker.procedureView.feedbackOther')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-yellow-800 dark:text-yellow-200 mb-2">{t('worker.procedureView.feedbackMessage')}</label>
            <textarea
              name="message"
              value={feedbackForm.message}
              onChange={handleFeedbackChange}
              placeholder={t('worker.procedureView.feedbackMessagePlaceholder')}
              rows={3}
              className="w-full px-4 py-2.5 bg-white dark:bg-primary border border-yellow-300 dark:border-yellow-700 rounded-lg text-sm focus:outline-none focus:border-accent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-yellow-800 dark:text-yellow-200 mb-2">{t('worker.procedureView.feedbackRating')}</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(rating => (
                <button
                  key={rating}
                  onClick={() => setFeedbackForm(prev => ({ ...prev, rating }))}
                  className={`text-2xl transition-transform ${
                    feedbackForm.rating >= rating ? 'scale-125' : 'opacity-50'
                  }`}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleSubmitFeedback(feedbackMode)}
              disabled={!feedbackForm.message || submitting}
              className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Send size={16} />
              {t('worker.procedureView.submitFeedback')}
            </button>
            <button
              onClick={() => setFeedbackMode(null)}
              className="px-4 py-2.5 bg-text-muted/20 hover:bg-text-muted/30 text-text-primary rounded-lg font-medium transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/worker/home')}
          className="flex-1 px-4 py-3 bg-text-muted/20 hover:bg-text-muted/30 text-text-primary rounded-lg font-medium transition-colors"
        >
          {t('worker.procedureView.backButton')}
        </button>
        <button
          onClick={() => navigate(`/worker/confirm/${sopId}`)}
          className="flex-1 px-4 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Play size={16} />
          {t('worker.procedureView.startWork')}
        </button>
      </div>
    </div>
  );
}

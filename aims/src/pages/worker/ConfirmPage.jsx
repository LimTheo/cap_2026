import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Loader, AlertCircle, ArrowLeft, Send } from 'lucide-react';
import { procedureAPI, workerAPI } from '../../utils/api';

const CURRENT_USER_ID = 'user_001';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export default function ConfirmPage() {
  const { t } = useTranslation();
  const { id: sopId } = useParams();
  const navigate = useNavigate();

  const [sop, setSop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('checklist'); // checklist, review, done
  const [checkedSteps, setCheckedSteps] = useState([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(null);
  const [videoRef, setVideoRef] = useState(null);

  useEffect(() => {
    const fetchSOP = async () => {
      try {
        setLoading(true);
        const result = await procedureAPI.get(sopId);
        setSop(result);
        setCheckedSteps(new Array(result.steps?.length || 0).fill(false));
        // 첫 단계 자동 선택
        if (result.steps && result.steps.length > 0) {
          setCurrentStepIdx(0);
        }
      } catch (err) {
        console.error('Error fetching SOP:', err);
        setError(err.message || t('worker.confirm.loadError'));
      } finally {
        setLoading(false);
      }
    };

    if (sopId) fetchSOP();
  }, [sopId, t]);

  // 영상 재생 시간 제어 (단계 범위만 재생)
  useEffect(() => {
    if (!videoRef || currentStepIdx === null || !sop?.steps) return;

    const currentStep = sop.steps[currentStepIdx];
    const handleTimeUpdate = () => {
      if (videoRef.currentTime >= currentStep.time_end) {
        videoRef.pause();
      }
    };

    videoRef.addEventListener('timeupdate', handleTimeUpdate);
    return () => videoRef.removeEventListener('timeupdate', handleTimeUpdate);
  }, [videoRef, currentStepIdx, sop]);

  const handleStepToggle = (idx) => {
    const newChecked = [...checkedSteps];
    newChecked[idx] = !newChecked[idx];
    setCheckedSteps(newChecked);
  };

  const completedCount = checkedSteps.filter(Boolean).length;
  const totalSteps = sop?.steps?.length || 0;
  const completionRate = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      const completedStepNumbers = sop.steps
        .map((step, idx) => checkedSteps[idx] ? step.step_number : null)
        .filter(Boolean);

      const performanceData = {
        sop_id: sopId,
        completed_steps: completedStepNumbers,
        total_duration: totalSteps * 30, // 임시: 단계당 평균 30초
        step_durations: sop.steps.reduce((acc, step) => {
          acc[step.step_number] = 30; // 임시
          return acc;
        }, {}),
        accuracy_score: completionRate,
        notes,
      };

      await workerAPI.recordPerformance(CURRENT_USER_ID, performanceData);
      setPhase('done');
    } catch (err) {
      alert(t('worker.confirm.submitFailed', { message: err.message }));
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
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!sop) return null;

  if (phase === 'done') {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center space-y-4">
          <CheckCircle size={80} className="mx-auto text-success" />
          <h2 className="text-2xl font-bold text-text-primary">작업 완료!</h2>
          <p className="text-text-secondary">
            {sop.task_name} 작업이 완료되었습니다.
          </p>
          <p className="text-sm text-text-muted">
            완료율: {completionRate}%
          </p>
          <div className="flex gap-2 justify-center mt-6">
            <button
              onClick={() => navigate('/worker/history')}
              className="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
            >
              이력 보기
            </button>
            <button
              onClick={() => navigate('/worker/home')}
              className="px-6 py-3 bg-text-muted/20 hover:bg-text-muted/30 text-text-primary rounded-lg font-medium transition-colors"
            >
              목록으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-xl font-bold text-text-primary">{sop.task_name}</h2>
        </div>
        <p className="text-sm text-text-secondary mb-4">{sop.process_name}</p>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">진행률</span>
            <span className="font-medium text-accent">{completionRate}%</span>
          </div>
          <div className="w-full h-2 bg-primary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <p className="text-xs text-text-muted">
            {completedCount}/{totalSteps}개 단계 완료
          </p>
        </div>
      </div>

      {/* Video & Checklist Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player */}
        {sop.video_url && (
          <div className="lg:col-span-2 space-y-3">
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-text-primary">📹 작업 영상</h3>
                {currentStepIdx !== null && sop.steps && (
                  <span className="text-xs bg-accent text-white px-2.5 py-1 rounded-full">
                    {sop.steps[currentStepIdx].step_number}단계: {sop.steps[currentStepIdx].name}
                  </span>
                )}
              </div>
              <video
                ref={setVideoRef}
                src={`${BACKEND_URL}${sop.video_url}`}
                controls
                className="w-full rounded-lg bg-black"
                style={{ maxHeight: '500px' }}
              />
            </div>
            {currentStepIdx !== null && sop.steps && (
              <div className="bg-blue-50 dark:bg-blue-950 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>📋 현재 단계:</strong> {sop.steps[currentStepIdx].step_number}. {sop.steps[currentStepIdx].name}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  ⏱️ {Math.round(sop.steps[currentStepIdx].time_start)}초 ~ {Math.round(sop.steps[currentStepIdx].time_end)}초
                </p>
                {sop.steps[currentStepIdx].description && (
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-2">
                    {sop.steps[currentStepIdx].description}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Steps Sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="font-semibold text-text-primary">📋 단계</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {sop.steps && sop.steps.map((step, idx) => (
              <div key={step.step_number} className="space-y-2">
                <button
                  onClick={() => {
                    setCurrentStepIdx(idx);
                    if (videoRef) {
                      videoRef.currentTime = step.time_start;
                      videoRef.play();
                    }
                  }}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    currentStepIdx === idx
                      ? 'bg-accent/20 border-accent'
                      : checkedSteps[idx]
                      ? 'bg-success/20 border-success'
                      : 'bg-card border-border hover:border-accent'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 ${
                        checkedSteps[idx]
                          ? 'bg-success border-success'
                          : 'border-text-muted'
                      }`}
                    >
                      {checkedSteps[idx] && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${checkedSteps[idx] ? 'text-success line-through' : 'text-text-primary'}`}>
                        {step.step_number}. {step.name}
                      </p>
                      <p className="text-xs text-text-muted">
                        {Math.round(step.time_start)}s ~ {Math.round(step.time_end)}s
                      </p>
                    </div>
                  </div>
                </button>
                {!checkedSteps[idx] && (
                  <button
                    onClick={() => handleStepToggle(idx)}
                    className="w-full px-3 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    ✓ 완료했습니다
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-3 hidden">
        <h3 className="font-semibold text-text-primary">작업 체크리스트</h3>
        {sop.steps && sop.steps.map((step, idx) => (
          <div
            key={step.step_number}
            onClick={() => handleStepToggle(idx)}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              checkedSteps[idx]
                ? 'bg-success/10 border-success'
                : 'bg-card border-border hover:border-text-muted'
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                  checkedSteps[idx]
                    ? 'bg-success border-success'
                    : 'border-text-muted'
                }`}
              >
                {checkedSteps[idx] && (
                  <CheckCircle size={20} className="text-white" />
                )}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${checkedSteps[idx] ? 'text-success line-through' : 'text-text-primary'}`}>
                  단계 {step.step_number}: {step.name}
                </p>
                <p className="text-xs text-text-muted">
                  {Math.round(step.time_start)}초 ~ {Math.round(step.time_end)}초
                </p>
              </div>
              {step.thumbnail_url && (
                <img src={`${BACKEND_URL}${step.thumbnail_url}`} alt={`Step ${step.step_number}`} className="w-12 h-12 rounded object-cover" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="space-y-3">
        <h3 className="font-semibold text-text-primary">작업 메모</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="작업 중 특이사항이나 문제점을 기록해주세요..."
          rows={4}
          className="w-full px-4 py-3 bg-card border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent resize-none"
        />
      </div>

      {/* Tools Used */}
      {sop.detected_tools && sop.detected_tools.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-text-primary">사용된 공구</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sop.detected_tools.map((tool) => (
              <div key={tool.name} className="p-3 bg-card border border-border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{tool.icon}</span>
                  <div>
                    <p className="font-medium text-text-primary">{tool.name}</p>
                    <p className="text-xs text-text-muted">단계 {tool.steps_involved?.join(', ')}</p>
                  </div>
                </div>
                {tool.preview_url && (
                  <img
                    src={`${BACKEND_URL}${tool.preview_url}`}
                    alt={tool.name}
                    className="w-full h-24 rounded object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate(`/worker/procedure/${sopId}`)}
          className="flex-1 px-4 py-3 bg-text-muted/20 hover:bg-text-muted/30 text-text-primary rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft size={16} />
          뒤로 가기
        </button>
        <button
          onClick={handleSubmit}
          disabled={completedCount === 0 || submitting}
          className="flex-1 px-4 py-3 bg-success hover:bg-success/80 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Send size={16} />
          작업 제출
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  SplitSquareVertical,
  Wrench,
  MessageSquare,
  Edit3,
  FileText,
  AlertCircle,
  Loader,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
const tabItems = [
  { id: 'steps', label: '단계 분할', icon: SplitSquareVertical },
  { id: 'tools', label: '공구 인식', icon: Wrench },
  { id: 'descriptions', label: '동작 설명', icon: MessageSquare },
];


export default function AIAnalysisPage() {
  const { id } = useParams();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
  const [activeTab, setActiveTab] = useState('steps');
  const [activeStep, setActiveStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isQuotaError, setIsQuotaError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoading(true);
      setError('');
      setIsQuotaError(false);

      try {
        const response = await fetch(`${BACKEND_URL}/api/analyze/${id}`);
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 429) {
            setIsQuotaError(true);
            setError(data.detail || 'API 무료 할당량이 초과되었습니다.');
          } else {
            setError(data.detail || `오류 발생 (HTTP ${response.status})`);
          }
          return;
        }

        setAnalysisResult(data);
      } catch (err) {
        setError('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인하세요.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchAnalysis();
    }
  }, [id]);

  const stepColors = [
    'bg-accent', 'bg-success', 'bg-warning', 'bg-danger',
    'bg-purple-500', 'bg-pink-500', 'bg-cyan-500',
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader size={40} className="mx-auto text-accent animate-spin mb-3" />
          <p className="text-text-secondary">AI 분석 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-sm">
          <AlertCircle size={40} className="mx-auto text-danger mb-3" />
          <p className="text-danger font-medium mb-2">
            {isQuotaError ? 'API 무료 할당량 초과' : '분석 실패'}
          </p>
          <p className="text-text-secondary text-sm">{error}</p>
          {isQuotaError && (
            <p className="text-text-muted text-xs mt-2">
              무료 플랜은 하루 15회 제한이 있습니다.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!analysisResult) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle size={40} className="mx-auto text-text-muted mb-3" />
          <p className="text-text-secondary">분석 결과를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Video Player */}
        <div className="space-y-4">
          {/* Video Player */}
          <div className="relative aspect-video bg-card rounded-xl border border-border overflow-hidden">
            {analysisResult.videoUrl ? (
              <video
                src={`${BACKEND_URL}${analysisResult.videoUrl}`}
                controls
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <FileText size={48} className="mx-auto text-text-muted mb-2" />
                  <p className="text-sm text-text-muted">영상 없음</p>
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-text-muted mb-2">타임라인 (AI 단계 분할)</p>
            <div className="flex gap-0.5 h-8 rounded-lg overflow-hidden">
              {analysisResult.steps.map((step, i) => (
                <button
                  key={i}
                  onClick={() => setActiveStep(i)}
                  className={`flex-1 transition-opacity ${stepColors[i % stepColors.length]} ${
                    activeStep === i ? 'opacity-100' : 'opacity-40 hover:opacity-70'
                  }`}
                  title={`Step ${step.stepNumber}: ${step.name}`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-text-muted">0:00</span>
              <span className="text-[10px] text-text-muted">{analysisResult.duration}</span>
            </div>
          </div>

          {/* Confidence */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">AI 분석 신뢰도</p>
              <span className="text-lg font-bold text-success">
                {analysisResult.confidence}%
              </span>
            </div>
            <div className="h-2 bg-primary rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-success rounded-full"
                style={{ width: `${analysisResult.confidence}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Analysis Panel */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-accent border-b-2 border-accent'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <tab.icon size={16} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4 max-h-[500px] overflow-y-auto">
            {/* Steps Tab */}
            {activeTab === 'steps' && (
              <div className="space-y-4">
                {/* Debug Info Panel */}
                {analysisResult.debugInfo && (
                  <div className="p-3 rounded-lg border border-border bg-primary/50 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary">손 감지율</span>
                      <span className="font-medium text-text-primary">
                        {analysisResult.debugInfo.handDetectionRate}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary">분석 프레임</span>
                      <span className="font-medium text-text-primary">
                        {analysisResult.debugInfo.totalFramesSampled}개
                      </span>
                    </div>
                    {analysisResult.debugInfo.palmBoundaryCount !== undefined && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary">손바닥 경계 감지</span>
                        <span className="font-medium text-text-primary">
                          {analysisResult.debugInfo.palmBoundaryCount}회
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary">감지 방식</span>
                      <div className="flex items-center gap-1">
                        {analysisResult.debugInfo.detectionMethod === 'palm_flip' ? (
                          <>
                            <CheckCircle size={12} className="text-success" />
                            <span className="font-medium text-success">손바닥 뒤집기 ✓</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={12} className="text-warning" />
                            <span className="font-medium text-warning">균등분할</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Steps List */}
                {analysisResult.steps.map((step, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveStep(i)}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      activeStep === i
                        ? 'border-accent bg-accent/5'
                        : 'border-border hover:bg-card-hover'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold ${stepColors[i % stepColors.length]}`}
                      >
                        {step.stepNumber}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-text-primary">
                          {step.name}
                        </p>
                        <p className="text-xs text-text-muted">{step.timeRange}</p>
                      </div>
                      <span className="text-xs text-text-muted">
                        {step.confidence}%
                      </span>
                    </div>
                    {/* Thumbnail image or placeholder */}
                    {step.thumbnailUrl ? (
                      <img
                        src={`${BACKEND_URL}${step.thumbnailUrl}`}
                        alt={`${step.name} thumbnail`}
                        className="mt-2 h-24 w-full object-cover rounded-md"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="mt-2 h-16 bg-primary rounded-md flex items-center justify-center">
                        <FileText size={16} className="text-text-muted" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Tools Tab */}
            {activeTab === 'tools' && (
              <div className="space-y-3">
                {analysisResult.detectedTools && analysisResult.detectedTools.length > 0 ? (
                  analysisResult.detectedTools.map((tool, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-border space-y-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{tool.icon}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-text-primary">
                            {tool.name}
                          </p>
                          <p className="text-xs text-text-muted">
                            사용 단계: {tool.steps.map((s) => `Step ${s}`).join(', ')}
                          </p>
                        </div>
                        {typeof tool.confidence === 'number' && (
                          <span className="text-xs font-medium text-success">
                            {tool.confidence}%
                          </span>
                        )}
                      </div>
                      {/* Tool preview image */}
                      {tool.previewUrl && (
                        <img
                          src={`${BACKEND_URL}${tool.previewUrl}`}
                          alt={`${tool.name} detection`}
                          className="w-full h-20 object-cover rounded-md"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Wrench size={24} className="mx-auto text-text-muted mb-2" />
                    <p className="text-sm text-text-muted">감지된 공구가 없습니다.</p>
                  </div>
                )}
              </div>
            )}

            {/* Descriptions Tab */}
            {activeTab === 'descriptions' && (
              <div className="space-y-3">
                {analysisResult.descriptions && analysisResult.descriptions.length > 0 ? (
                  analysisResult.descriptions.map((desc, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-accent">
                          Step {i + 1}: {analysisResult.steps[i]?.name}
                        </span>
                        <button className="text-text-muted hover:text-accent">
                          <Edit3 size={14} />
                        </button>
                      </div>
                      <p className="text-sm text-text-secondary">{desc}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <MessageSquare size={24} className="mx-auto text-text-muted mb-2" />
                    <p className="text-sm text-text-muted">동작 설명을 생성하지 못했습니다.</p>
                    <p className="text-xs text-text-muted mt-1">GOOGLE_API_KEY를 확인하세요.</p>
                  </div>
                )}

                {/* STT 전사 섹션 */}
                {analysisResult.transcript && (
                  <div className="mt-4 p-3 rounded-lg border border-border bg-primary/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-text-secondary">
                        음성 전사 (Whisper STT)
                        {analysisResult.transcript.language && (
                          <span className="ml-2 text-accent">
                            {({ ko: '한국어', en: '영어', ja: '일본어', zh: '중국어', vi: '베트남어', th: '태국어', id: '인도네시아어' })[analysisResult.transcript.language] || analysisResult.transcript.language}
                          </span>
                        )}
                      </span>
                    </div>
                    {analysisResult.transcript.error ? (
                      <p className="text-xs text-warning">{analysisResult.transcript.error}</p>
                    ) : analysisResult.transcript.text ? (
                      <p className="text-sm text-text-secondary leading-relaxed">{analysisResult.transcript.text}</p>
                    ) : (
                      <p className="text-xs text-text-muted">감지된 음성 없음</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            if (analysisResult?.sopId) {
              navigate(`/manager/procedures/${analysisResult.sopId}`);
            } else {
              alert('작업절차서 ID가 없습니다. 다시 시도해주세요.');
            }
          }}
          className="px-8 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-medium transition-colors"
        >
          작업절차서 생성
        </button>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Smartphone,
  Hand,
  Volume2,
  Lightbulb,
  Upload,
  FileVideo,
  CheckCircle,
  AlertCircle,
  Video,
  Play,
  Square,
  RotateCcw,
} from 'lucide-react';
import { processes } from '../../data/dummyData';

export default function UploadPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const guidelines = [
    { icon: Smartphone, text: t('manager.upload.guide1'), color: 'text-accent' },
    { icon: Hand, text: t('manager.upload.guide2'), color: 'text-success' },
    { icon: Volume2, text: t('manager.upload.guide3'), color: 'text-warning' },
    { icon: Lightbulb, text: t('manager.upload.guide4'), color: 'text-accent' },
  ];
  const fileInputRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const streamRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState('idle'); // idle, uploading, validating, complete, error
  const [progress, setProgress] = useState(0);
  const [selectedProcess, setSelectedProcess] = useState('');
  const [taskName, setTaskName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [analysisId, setAnalysisId] = useState(null);

  // Camera recording states
  const [inputMode, setInputMode] = useState('upload'); // 'upload' | 'camera'
  const [cameraState, setCameraState] = useState('idle'); // 'idle' | 'previewing' | 'recording' | 'recorded'
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef(null);

  // Custom processes
  const [customProcesses, setCustomProcesses] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('aims_custom_processes') || '[]');
    } catch {
      return [];
    }
  });
  const [showAddProcess, setShowAddProcess] = useState(false);
  const [newProcessName, setNewProcessName] = useState('');

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      });
      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
      setCameraState('previewing');
      setError('');
    } catch (err) {
      setError(t('manager.upload.uploadError'));
      setCameraState('idle');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null;
    }
    setCameraState('idle');
    setRecordingTime(0);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    recordedChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp9,opus',
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
      setCameraState('recorded');
      setRecordingTime(0);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(100);
    setCameraState('recording');
    setRecordingTime(0);

    recordingIntervalRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && cameraState === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const useRecordedVideo = () => {
    if (recordedChunksRef.current.length === 0) return;

    const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
    const file = new File([blob], 'recorded_video.webm', { type: 'video/webm' });
    setSelectedFile(file);
    handleUpload(file);
  };

  const retakeVideo = async () => {
    recordedChunksRef.current = [];
    setRecordedVideoUrl(null);
    await startCamera();
  };

  // Upload file functions
  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate file type
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const allowedExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm'];

    if (!allowedExtensions.includes(fileExtension)) {
      setError('지원하지 않는 파일 형식입니다. (MP4, MOV, AVI, MKV, WebM 지원)');
      return;
    }

    // Validate file size (2GB limit)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > maxSize) {
      setError('파일 크기가 2GB를 초과합니다.');
      return;
    }

    setError('');
    setSelectedFile(file);
    handleUpload(file);
    setInputMode('upload');
  };

  const handleUpload = (file) => {
    if (!file) return;

    setUploadState('uploading');
    setProgress(0);

    // Get process name from selected process ID
    const allProcesses = [...processes, ...customProcesses];
    const selectedProcessObj = allProcesses.find((p) => String(p.id) === String(selectedProcess));
    const processName = selectedProcessObj?.name || '';

    const formData = new FormData();
    formData.append('file', file);

    console.log('📤 DEBUG before append:');
    console.log('  - processName:', processName, 'type:', typeof processName, 'isEmpty:', !processName);
    console.log('  - taskName:', taskName, 'type:', typeof taskName, 'isEmpty:', !taskName);

    if (processName) {
      formData.append('process_name', processName);
      console.log('  ✓ Appended process_name:', processName);
    } else {
      console.log('  ✗ process_name is empty!');
    }

    if (taskName) {
      formData.append('task_name', taskName);
      console.log('  ✓ Appended task_name:', taskName);
    } else {
      console.log('  ✗ task_name is empty!');
    }

    // Debug: 보내는 데이터 확인
    console.log('📤 Sending to backend:');
    console.log('  - File:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    console.log('  - Selected Process ID:', selectedProcess);
    console.log('  - Process Name:', processName);
    console.log('  - All Processes:', allProcesses);
    console.log('  - Task Name:', taskName);

    // Debug: FormData 내용 확인
    console.log('📦 FormData entries:');
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  - ${key}: File(${value.name}, ${(value.size / 1024 / 1024).toFixed(2)} MB)`);
      } else {
        console.log(`  - ${key}: ${value}`);
      }
    }

    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        setProgress(percentComplete);
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const result = JSON.parse(xhr.responseText);
          setAnalysisId(result.id);
          setUploadState('validating');
          // Transition to complete after a brief moment
          setTimeout(() => setUploadState('complete'), 1000);
        } catch (e) {
          setError(t('manager.upload.parseError'));
          setUploadState('error');
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          if (xhr.status === 429) {
            setError(t('manager.upload.quotaError', { detail: errorData.detail || '' }));
          } else {
            setError(errorData.detail || t('manager.upload.uploadFailed'));
          }
        } catch {
          setError(t('manager.upload.uploadFailed'));
        }
        setUploadState('error');
      }
    });

    // Handle network error
    xhr.addEventListener('error', () => {
      setError(t('manager.upload.networkError'));
      setUploadState('error');
    });

    // Send request
    const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
    xhr.open('POST', `${backendUrl}/api/analyze/video`);
    xhr.send(formData);
  };

  const resetUpload = () => {
    setUploadState('idle');
    setProgress(0);
    setSelectedFile(null);
    setError('');
    setAnalysisId(null);
  };

  const handleAddProcess = () => {
    if (!newProcessName.trim()) {
      setError(t('manager.upload.selectProcess'));
      return;
    }

    const newId = `custom_${Date.now()}`;
    const newProcess = {
      id: newId,
      name: newProcessName.trim(),
      color: '#6b7280',
      workflowCount: 0,
    };

    const updated = [...customProcesses, newProcess];
    setCustomProcesses(updated);
    localStorage.setItem('aims_custom_processes', JSON.stringify(updated));
    setSelectedProcess(newId);
    setShowAddProcess(false);
    setNewProcessName('');
  };

  // Cleanup camera when component unmounts or input mode changes
  useEffect(() => {
    return () => {
      if (inputMode === 'camera' && cameraState !== 'idle') {
        stopCamera();
      }
    };
  }, []);

  // Handle input mode changes
  useEffect(() => {
    if (inputMode === 'camera' && cameraState === 'idle') {
      startCamera();
    } else if (inputMode === 'upload' && cameraState !== 'idle') {
      stopCamera();
    }
  }, [inputMode]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Guidelines */}
      <div>
        <h2 className="text-lg font-semibold mb-4">{t('manager.upload.guideTitle')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {guidelines.map((g, i) => (
            <div
              key={i}
              className="bg-card rounded-xl border border-border p-4 flex items-start gap-3"
            >
              <g.icon size={20} className={`shrink-0 mt-0.5 ${g.color}`} />
              <p className="text-sm text-text-primary">{g.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Upload Area */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold mb-4">{t('manager.upload.uploadTitle')}</h3>

        {/* Input Mode Tabs */}
        {uploadState === 'idle' && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setInputMode('upload')}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-colors ${
                inputMode === 'upload'
                  ? 'bg-accent text-white'
                  : 'bg-primary border border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              영상 업로드
            </button>
            <button
              onClick={() => setInputMode('camera')}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-colors ${
                inputMode === 'camera'
                  ? 'bg-accent text-white'
                  : 'bg-primary border border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              직접 촬영
            </button>
          </div>
        )}

        {/* Process & Task Name */}
        {uploadState === 'idle' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">{t('manager.upload.selectProcess')}</label>
              <select
                value={selectedProcess}
                onChange={(e) => {
                  if (e.target.value === '__add_new__') {
                    setShowAddProcess(true);
                  } else {
                    setSelectedProcess(e.target.value);
                    setShowAddProcess(false);
                  }
                }}
                className="w-full px-4 py-2.5 bg-primary border border-border rounded-xl text-text-primary text-sm focus:outline-none focus:border-accent"
              >
                <option value="">{t('manager.upload.selectProcessPlaceholder')}</option>
                {[...processes, ...customProcesses].map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                <option value="__add_new__">+ {t('manager.upload.selectProcess')}...</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">{t('manager.upload.taskName')}</label>
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder={t('manager.upload.taskNamePlaceholder')}
                className="w-full px-4 py-2.5 bg-primary border border-border rounded-xl text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        )}

        {/* Add Process Input */}
        {uploadState === 'idle' && showAddProcess && (
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={newProcessName}
              onChange={(e) => setNewProcessName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddProcess();
                if (e.key === 'Escape') {
                  setShowAddProcess(false);
                  setNewProcessName('');
                }
              }}
              placeholder={t('manager.upload.selectProcessPlaceholder')}
              className="flex-1 px-4 py-2.5 bg-primary border border-border rounded-xl text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-accent"
              autoFocus
            />
            <button
              onClick={handleAddProcess}
              className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-medium transition-colors"
            >
              {t('common.confirm')}
            </button>
            <button
              onClick={() => {
                setShowAddProcess(false);
                setNewProcessName('');
              }}
              className="px-4 py-2.5 bg-primary border border-border text-text-secondary hover:text-text-primary rounded-xl font-medium transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,.mp4,.mov,.avi,.mkv"
          onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
          className="hidden"
        />

        {/* Error Message */}
        {error && (
          <div className="mb-4 flex items-start gap-3 p-3 bg-danger/10 rounded-xl border border-danger/20">
            <AlertCircle size={18} className="text-danger mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-danger font-medium">{t('manager.upload.uploadError')}</p>
              <p className="text-xs text-danger/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* File Upload Dropzone */}
        {uploadState === 'idle' && inputMode === 'upload' && (
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
              isDragging
                ? 'border-accent bg-accent/5'
                : 'border-border hover:border-text-muted'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClickUpload}
          >
            <Upload size={40} className="mx-auto text-text-muted mb-4" />
            <p className="text-text-primary font-medium mb-1">
              {t('manager.upload.dropzone')}
            </p>
            <p className="text-sm text-text-muted">
              {t('manager.upload.supportedFormats')}
            </p>
          </div>
        )}

        {/* Camera Recording UI */}
        {uploadState === 'idle' && inputMode === 'camera' && (
          <div className="space-y-4">
            {/* Video Preview */}
            <video
              ref={videoPreviewRef}
              autoPlay
              muted
              className="w-full rounded-xl bg-black aspect-video object-cover"
            />

            {/* Recording Time Display */}
            {cameraState === 'recording' && (
              <div className="flex items-center justify-center gap-2 p-3 bg-danger/10 rounded-xl border border-danger/20">
                <div className="w-2 h-2 bg-danger rounded-full animate-pulse" />
                <p className="text-sm font-medium text-danger">
                  🔴 {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                </p>
              </div>
            )}

            {/* Camera Controls */}
            <div className="flex gap-2 flex-wrap">
              {cameraState === 'previewing' && (
                <>
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-medium transition-colors"
                  >
                    <Play size={18} />
                    📽️
                  </button>
                  <button
                    onClick={() => setInputMode('upload')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary border border-border text-text-secondary hover:text-text-primary rounded-xl font-medium transition-colors"
                  >
                    <Upload size={18} />
                    {t('manager.nav.upload')}
                  </button>
                </>
              )}

              {cameraState === 'recording' && (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-4 py-2.5 bg-danger hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
                >
                  <Square size={18} />
                  ⏹️
                </button>
              )}

              {cameraState === 'recorded' && (
                <>
                  <button
                    onClick={useRecordedVideo}
                    className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-medium transition-colors"
                  >
                    <CheckCircle size={18} />
                    ✅
                  </button>
                  <button
                    onClick={retakeVideo}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary border border-border text-text-secondary hover:text-text-primary rounded-xl font-medium transition-colors"
                  >
                    <RotateCcw size={18} />
                    🔄
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {(uploadState === 'uploading' || uploadState === 'validating') && (
          <div className="border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <FileVideo size={20} className="text-accent" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {selectedFile?.name || '파일'}
                  </p>
                  <p className="text-xs text-text-muted">
                    {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB` : ''}
                  </p>
                </div>
              </div>
            </div>
            <div className="h-2 bg-primary rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-text-secondary">
              {uploadState === 'uploading'
                ? t('manager.upload.uploading', { progress })
                : t('manager.upload.analyzing')}
            </p>
          </div>
        )}

        {/* Upload Complete */}
        {uploadState === 'complete' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-success/10 rounded-xl">
              <CheckCircle size={20} className="text-success" />
              <p className="text-sm text-success font-medium">{t('manager.upload.uploadComplete')}</p>
            </div>

            <p className="text-sm text-text-secondary">
              {t('manager.upload.analyzingMessage')}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/manager/analysis/${analysisId}`)}
                className="flex-1 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-medium transition-colors"
              >
                {t('manager.upload.viewResult')}
              </button>
              <button
                onClick={resetUpload}
                className="px-6 py-3 bg-card-hover text-text-secondary rounded-xl font-medium hover:text-text-primary transition-colors"
              >
                {t('manager.upload.reupload')}
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {uploadState === 'error' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-danger/10 rounded-xl">
              <AlertCircle size={20} className="text-danger" />
              <p className="text-sm text-danger font-medium">{t('manager.upload.uploadFailed')}</p>
            </div>

            <button
              onClick={resetUpload}
              className="w-full py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-medium transition-colors"
            >
              {t('common.retry')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

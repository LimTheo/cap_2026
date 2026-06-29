/**
 * 중앙화된 API 호출 함수들
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// ============ 에러 핸들링 ============
async function handleResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw {
      status: response.status,
      message: data.detail || 'API 요청 실패',
      data,
    };
  }
  return data;
}

// ============ 분석 API ============
export const analysisAPI = {
  // 영상 분석 (기존 코드와 동일)
  async analyzeVideo(file, processName, taskName) {
    const formData = new FormData();
    formData.append('file', file);
    if (processName) formData.append('process_name', processName);
    if (taskName) formData.append('task_name', taskName);

    const response = await fetch(`${BACKEND_URL}/api/analyze/video`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(response);
  },

  // 분석 결과 조회
  async getAnalysis(analysisId) {
    const response = await fetch(`${BACKEND_URL}/api/analyze/${analysisId}`);
    return handleResponse(response);
  },
};

// ============ SOP/절차 API ============
export const procedureAPI = {
  // 절차 목록 조회
  async list(status = null, skip = 0, limit = 50) {
    const params = new URLSearchParams({
      skip,
      limit,
    });
    if (status) params.append('status', status);

    const response = await fetch(`${BACKEND_URL}/api/procedures?${params}`);
    return handleResponse(response);
  },

  // 절차 상세 조회
  async get(sopId) {
    const response = await fetch(`${BACKEND_URL}/api/procedures/${sopId}`);
    return handleResponse(response);
  },

  // 절차 수정 (draft만 가능)
  async update(sopId, data) {
    const response = await fetch(`${BACKEND_URL}/api/procedures/${sopId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // 절차 게시
  async publish(sopId) {
    const response = await fetch(`${BACKEND_URL}/api/procedures/${sopId}/publish`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  // 절차 보관
  async archive(sopId) {
    const response = await fetch(`${BACKEND_URL}/api/procedures/${sopId}/archive`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  // 절차 삭제
  async delete(sopId) {
    const response = await fetch(`${BACKEND_URL}/api/procedures/${sopId}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },
};

// ============ Worker API ============
export const workerAPI = {
  // 게시된 절차 목록
  async getProcedures(userId) {
    const response = await fetch(`${BACKEND_URL}/api/worker/${userId}/procedures`);
    return handleResponse(response);
  },

  // 작업 수행 기록 생성
  async recordPerformance(userId, data) {
    const response = await fetch(`${BACKEND_URL}/api/worker/${userId}/performance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // 수행 기록 상세 조회
  async getPerformance(userId, performanceId) {
    const response = await fetch(
      `${BACKEND_URL}/api/worker/${userId}/performance/${performanceId}`
    );
    return handleResponse(response);
  },

  // 작업 이력 조회
  async getHistory(userId, sopId = null, skip = 0, limit = 50) {
    const params = new URLSearchParams({ skip, limit });
    if (sopId) params.append('sop_id', sopId);

    const response = await fetch(
      `${BACKEND_URL}/api/worker/${userId}/history?${params}`
    );
    return handleResponse(response);
  },

  // 피드백 제출
  async submitFeedback(userId, data) {
    const response = await fetch(`${BACKEND_URL}/api/worker/${userId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // 피드백 목록 조회
  async getFeedback(userId, isResolved = null, skip = 0, limit = 50) {
    const params = new URLSearchParams({ skip, limit });
    if (isResolved !== null) params.append('is_resolved', isResolved);

    const response = await fetch(
      `${BACKEND_URL}/api/worker/${userId}/feedback?${params}`
    );
    return handleResponse(response);
  },
};

// ============ 유틸리티 함수 ============
export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function parseTimeString(timeStr) {
  // "1:23" → 83 (초)
  const parts = timeStr.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

export function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

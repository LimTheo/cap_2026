// 사용자 계정 (프로토타입용 - 실제 서비스는 백엔드 DB 필요)
export const accounts = [
  {
    id: 1,
    email: 'admin@aims.com',
    password: 'admin1234',
    role: 'manager',
    name: '김관리',
    language: 'ko',
  },
  {
    id: 2,
    email: 'worker@aims.com',
    password: 'worker1234',
    role: 'worker',
    name: 'Nguyen Van A',
    language: 'vi',
  },
];

// 지원 언어 목록
export const languages = [
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'fil', name: 'Filipino', flag: '🇵🇭' },
];

// 공정 목록
export const processes = [];

// 작업절차서 목록
export const procedures = [];

// 단계별 데이터 (절차서 ID 1번의 단계들)
export const procedureSteps = [];

// 근로자 목록
export const workers = [];

// 최근 활동 로그
export const activityLog = [];

// 대시보드 통계
export const stats = {
  totalProcesses: 0,
  totalProcedures: 0,
  pendingReview: 0,
  published: 0,
  totalWorkers: 0,
  learningComplete: 0,
  comprehensionPass: 0,
  warningWorkers: 0,
};

// AI 분석 결과 (분석 페이지용)
export const analysisResult = null;

// 근로자용 배정 작업 (Worker Home에서 사용)
export const workerAssignments = [];

// 이해도 퀴즈 데이터
export const quizData = [];

// 학습 기록 (근로자 History용)
export const learningHistory = [];

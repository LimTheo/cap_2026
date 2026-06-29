import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Archive,
} from 'lucide-react';

const notificationIcons = {
  published: CheckCircle2,
  review: Clock,
  error: AlertTriangle,
  upload: Bell,
};

const notificationColors = {
  published: 'bg-green-100 text-green-700',
  review: 'bg-blue-100 text-blue-700',
  error: 'bg-red-100 text-red-700',
  upload: 'bg-purple-100 text-purple-700',
};

const notificationLabels = {
  published: '게시됨',
  review: '검수 필요',
  error: '오류',
  upload: '업로드',
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setNotifications([
      {
        id: 1,
        type: 'published',
        title: '절차서 게시됨',
        message: '작업명: "부품 조립" 절차서가 게시되었습니다.',
        time: '2분 전',
        timestamp: Date.now() - 2 * 60000,
        read: false,
        sopId: 'sop_1',
      },
      {
        id: 2,
        type: 'review',
        title: '검수 필요',
        message: '"부품 검사" 절차서가 검수 대기 중입니다.',
        time: '15분 전',
        timestamp: Date.now() - 15 * 60000,
        read: false,
        sopId: 'sop_2',
      },
      {
        id: 3,
        type: 'upload',
        title: '영상 업로드 완료',
        message: '새로운 영상이 분석되었습니다.',
        time: '1시간 전',
        timestamp: Date.now() - 60 * 60000,
        read: false,
        sopId: 'sop_3',
      },
      {
        id: 4,
        type: 'published',
        title: '절차서 게시됨',
        message: '작업명: "패킹" 절차서가 게시되었습니다.',
        time: '3시간 전',
        timestamp: Date.now() - 3 * 60 * 60000,
        read: true,
        sopId: 'sop_4',
      },
      {
        id: 5,
        type: 'review',
        title: '검수 완료',
        message: '"포장" 절차서 검수가 완료되었습니다.',
        time: '어제',
        timestamp: Date.now() - 24 * 60 * 60000,
        read: true,
        sopId: 'sop_5',
      },
      {
        id: 6,
        type: 'error',
        title: '분석 오류',
        message: '"용접 작업" 영상 분석 중 오류가 발생했습니다.',
        time: '2일 전',
        timestamp: Date.now() - 2 * 24 * 60 * 60000,
        read: true,
        sopId: null,
      },
    ]);
  }, []);

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'published') return n.type === 'published';
    if (filter === 'review') return n.type === 'review';
    if (filter === 'error') return n.type === 'error';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleDelete = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleDeleteAll = () => {
    if (window.confirm('모든 알림을 삭제하시겠습니까?')) {
      setNotifications([]);
    }
  };

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">알림</h2>
          <p className="text-sm text-text-secondary mt-1">
            총 {notifications.length}개의 알림
            {unreadCount > 0 && ` • ${unreadCount}개 미읽음`}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 text-sm font-medium text-accent hover:bg-card rounded-lg transition-colors"
            >
              모두 읽음으로
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="px-4 py-2 text-sm font-medium text-danger hover:bg-danger/5 rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 size={16} />
              모두 삭제
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 bg-card rounded-xl p-1 mb-6 overflow-x-auto">
        {[
          { value: 'all', label: '전체' },
          { value: 'unread', label: `미읽음${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
          { value: 'published', label: '게시됨' },
          { value: 'review', label: '검수' },
          { value: 'error', label: '오류' },
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

      {/* Notifications List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Bell size={40} className="mx-auto mb-3 text-text-muted opacity-50" />
            <p className="text-text-muted">알림이 없습니다.</p>
          </div>
        ) : (
          filtered.map((notif) => {
            const Icon = notificationIcons[notif.type] || Bell;
            return (
              <div
                key={notif.id}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  !notif.read
                    ? 'bg-primary border-accent/30 hover:border-accent'
                    : 'bg-card border-border hover:border-text-muted'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      notificationColors[notif.type]
                    }`}
                  >
                    <Icon size={18} />
                  </div>

                  <div
                    className="flex-1 min-w-0"
                    onClick={() => notif.sopId && navigate(`/manager/procedures/${notif.sopId}`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-text-primary">
                          {notif.title}
                        </p>
                        <p className="text-sm text-text-secondary mt-1">
                          {notif.message}
                        </p>
                      </div>
                      {!notif.read && (
                        <span className="w-2 h-2 bg-accent rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-text-muted">{notif.time}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          notificationColors[notif.type]
                        }`}
                      >
                        {notificationLabels[notif.type]}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!notif.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notif.id);
                        }}
                        className="p-1.5 hover:bg-card rounded-lg transition-colors"
                        title="읽음으로 표시"
                      >
                        <CheckCircle2 size={18} className="text-accent" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(notif.id);
                      }}
                      className="p-1.5 hover:bg-card rounded-lg transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={18} className="text-text-muted hover:text-danger" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

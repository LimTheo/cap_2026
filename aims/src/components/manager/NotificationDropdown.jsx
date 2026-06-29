import { useState, useEffect, useRef } from 'react';
import { Bell, ArrowRight, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

export default function NotificationDropdown({ unreadCount }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    setNotifications([
      {
        id: 1,
        type: 'published',
        title: '절차서 게시됨',
        message: '작업명: "부품 조립" 절차서가 게시되었습니다.',
        time: '2분 전',
        read: false,
        sopId: 'sop_1',
      },
      {
        id: 2,
        type: 'review',
        title: '검수 필요',
        message: '"부품 검사" 절차서가 검수 대기 중입니다.',
        time: '15분 전',
        read: false,
        sopId: 'sop_2',
      },
      {
        id: 3,
        type: 'upload',
        title: '영상 업로드 완료',
        message: '새로운 영상이 분석되었습니다.',
        time: '1시간 전',
        read: false,
        sopId: 'sop_3',
      },
      {
        id: 4,
        type: 'published',
        title: '절차서 게시됨',
        message: '작업명: "패킹" 절차서가 게시되었습니다.',
        time: '3시간 전',
        read: true,
        sopId: 'sop_4',
      },
      {
        id: 5,
        type: 'review',
        title: '검수 완료',
        message: '"포장" 절차서 검수가 완료되었습니다.',
        time: '어제',
        read: true,
        sopId: 'sop_5',
      },
    ]);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (sopId) => {
    setIsOpen(false);
    navigate(`/manager/procedures/${sopId}`);
  };

  const handleMarkAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors"
        title="알림"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">알림</h3>
            {unread > 0 && (
              <span className="px-2 py-0.5 bg-danger/10 text-danger text-xs font-medium rounded-full">
                {unread}개 신규
              </span>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-text-muted">
                <Bell size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">알림이 없습니다.</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const Icon = notificationIcons[notif.type] || Bell;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif.sopId)}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-card-hover ${
                      !notif.read ? 'bg-primary' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          notificationColors[notif.type]
                        }`}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary">
                          {notif.title}
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-xs text-text-muted mt-1">
                          {notif.time}
                        </p>
                      </div>
                      <ArrowRight size={14} className="text-text-muted flex-shrink-0 mt-0.5" />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-primary border-t border-border text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/manager/notifications');
              }}
              className="text-sm text-accent hover:text-accent-hover font-medium transition-colors"
            >
              전체 알림 보기 →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

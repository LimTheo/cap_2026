import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Archive, Eye, Loader, AlertCircle } from 'lucide-react';
import { procedureAPI } from '../../utils/api';

const statusConfig = {
  draft: { color: 'bg-yellow-100', textColor: 'text-yellow-700', label: '초안' },
  published: { color: 'bg-green-100', textColor: 'text-green-700', label: '게시됨' },
  archived: { color: 'bg-gray-100', textColor: 'text-gray-700', label: '보관' },
};

export default function PublishPage() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [published, setPublished] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    const fetchProcedures = async () => {
      try {
        setLoading(true);
        const draftsResult = await procedureAPI.list('draft', 0, 100);
        const publishedResult = await procedureAPI.list('published', 0, 100);
        setDrafts(draftsResult.data || []);
        setPublished(publishedResult.data || []);
      } catch (err) {
        console.error('Error fetching procedures:', err);
        setError(err.message || '절차 조회 실패');
      } finally {
        setLoading(false);
      }
    };

    fetchProcedures();
  }, []);

  const handlePublish = async (sopId) => {
    try {
      setActionLoading(prev => ({ ...prev, [sopId]: true }));
      await procedureAPI.publish(sopId);
      // 목록 갱신
      const draftsResult = await procedureAPI.list('draft', 0, 100);
      const publishedResult = await procedureAPI.list('published', 0, 100);
      setDrafts(draftsResult.data || []);
      setPublished(publishedResult.data || []);
    } catch (err) {
      alert(`게시 실패: ${err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [sopId]: false }));
    }
  };

  const handleArchive = async (sopId) => {
    try {
      setActionLoading(prev => ({ ...prev, [sopId]: true }));
      await procedureAPI.archive(sopId);
      // 목록 갱신
      const publishedResult = await procedureAPI.list('published', 0, 100);
      setPublished(publishedResult.data || []);
    } catch (err) {
      alert(`보관 실패: ${err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [sopId]: false }));
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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 게시 대기 (Draft) */}
      <div>
        <h2 className="text-lg font-semibold mb-4">게시 대기 목록 ({drafts.length})</h2>
        {drafts.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-text-muted">
            <p>게시 대기 중인 절차가 없습니다.</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-primary">
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase">작업명</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase">공정</th>
                    <th className="text-center px-5 py-3 text-xs font-medium text-text-muted uppercase">단계 수</th>
                    <th className="text-center px-5 py-3 text-xs font-medium text-text-muted uppercase">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((proc) => (
                    <tr key={proc.id} className="border-b border-border last:border-0 hover:bg-card-hover transition-colors">
                      <td className="px-5 py-4 text-sm text-text-primary font-medium">{proc.task_name}</td>
                      <td className="px-5 py-4 text-sm text-text-secondary">{proc.process_name}</td>
                      <td className="px-5 py-4 text-sm text-text-secondary text-center">{proc.step_count}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => navigate(`/manager/procedures/${proc.id}`)}
                            className="p-1.5 text-text-muted hover:text-accent transition-colors"
                            title="상세보기"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handlePublish(proc.id)}
                            disabled={actionLoading[proc.id]}
                            className="p-1.5 text-text-muted hover:text-success disabled:opacity-50 transition-colors"
                            title="게시"
                          >
                            <Send size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 게시됨 (Published) */}
      <div>
        <h2 className="text-lg font-semibold mb-4">게시된 절차 ({published.length})</h2>
        {published.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-text-muted">
            <p>게시된 절차가 없습니다.</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-primary">
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase">작업명</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase">공정</th>
                    <th className="text-center px-5 py-3 text-xs font-medium text-text-muted uppercase">단계 수</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase">게시일</th>
                    <th className="text-center px-5 py-3 text-xs font-medium text-text-muted uppercase">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {published.map((proc) => (
                    <tr key={proc.id} className="border-b border-border last:border-0 hover:bg-card-hover transition-colors">
                      <td className="px-5 py-4 text-sm text-text-primary font-medium">{proc.task_name}</td>
                      <td className="px-5 py-4 text-sm text-text-secondary">{proc.process_name}</td>
                      <td className="px-5 py-4 text-sm text-text-secondary text-center">{proc.step_count}</td>
                      <td className="px-5 py-4 text-sm text-text-secondary">
                        {new Date(proc.published_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => navigate(`/manager/procedures/${proc.id}`)}
                            className="p-1.5 text-text-muted hover:text-accent transition-colors"
                            title="상세보기"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleArchive(proc.id)}
                            disabled={actionLoading[proc.id]}
                            className="p-1.5 text-text-muted hover:text-warning disabled:opacity-50 transition-colors"
                            title="보관"
                          >
                            <Archive size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

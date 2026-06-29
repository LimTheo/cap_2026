import { useState, useEffect, useRef } from 'react';
import { Search, ArrowRight, X, FileText, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { procedureAPI } from '../../utils/api';

export default function SearchModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        handleSelectResult(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  const handleSearch = async (q) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const allProcedures = await procedureAPI.list();
      const filtered = (allProcedures.data || []).filter((p) => {
        const searchLower = q.toLowerCase();
        return (
          p.task_name.toLowerCase().includes(searchLower) ||
          p.process_name.toLowerCase().includes(searchLower) ||
          p.id.toLowerCase().includes(searchLower)
        );
      });
      setResults(filtered.slice(0, 8));
      setSelectedIndex(0);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectResult = (result) => {
    onClose();
    navigate(`/manager/procedures/${result.id}`);
  };

  const statusConfig = {
    draft: { color: 'bg-yellow-100', textColor: 'text-yellow-700', label: '초안' },
    published: { color: 'bg-green-100', textColor: 'text-green-700', label: '게시됨' },
    archived: { color: 'bg-gray-100', textColor: 'text-gray-700', label: '보관' },
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-start justify-center pt-12 md:pt-24">
        <div
          className="w-full max-w-2xl mx-4 bg-card rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="p-4 border-b border-border flex items-center gap-3">
            <Search size={20} className="text-text-muted flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="절차서 제목, 공정명, ID로 검색..."
              className="flex-1 bg-transparent text-text-primary placeholder-text-muted focus:outline-none text-lg"
            />
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 flex items-center justify-center">
                <Loader className="animate-spin text-accent" size={24} />
              </div>
            ) : results.length === 0 && query ? (
              <div className="p-8 text-center text-text-muted">
                <FileText size={32} className="mx-auto mb-3 opacity-50" />
                <p>검색 결과가 없습니다.</p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-text-muted">
                <p>절차서를 검색해보세요.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {results.map((result, idx) => {
                  const cfg = statusConfig[result.status];
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSelectResult(result)}
                      className={`w-full px-4 py-3 flex items-center justify-between gap-3 transition-colors text-left ${
                        idx === selectedIndex
                          ? 'bg-accent/10'
                          : 'hover:bg-card-hover'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary truncate">
                          {result.task_name}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {result.process_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.color} ${cfg.textColor}`}
                        >
                          {cfg.label}
                        </span>
                        <ArrowRight size={16} className="text-text-muted" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-primary border-t border-border text-xs text-text-muted flex items-center justify-between">
            <div className="flex gap-4">
              <span>
                <kbd className="px-2 py-1 bg-card rounded border border-border">↑↓</kbd>{' '}
                이동
              </span>
              <span>
                <kbd className="px-2 py-1 bg-card rounded border border-border">Enter</kbd>{' '}
                선택
              </span>
              <span>
                <kbd className="px-2 py-1 bg-card rounded border border-border">Esc</kbd> 닫기
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, ArrowRight, X } from 'lucide-react';

const GlobalSearch = ({ isOpen, onClose, onSelectNote }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [allNotes, setAllNotes] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'p' || e.key.toLowerCase() === 'k')) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const fetchNotes = async () => {
        try {
          const res = await fetch('http://localhost:8000/api/notes');
          if (res.ok) {
            const data = await res.json();
            const files = (data.notes || []).filter(n => n.type === 'file');
            setAllNotes(files);
            setResults(files);
          }
        } catch (error) {
          console.error("Error fetching notes for global search:", error);
        }
      };
      fetchNotes();
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(allNotes);
      setActiveIndex(0);
      return;
    }
    const q = query.toLowerCase();
    const filtered = allNotes.filter(n => 
      n.name.toLowerCase().includes(q) || 
      n.path.toLowerCase().includes(q)
    );
    setResults(filtered);
    setActiveIndex(0);
  }, [query, allNotes]);

  const handleModalKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0 && results[activeIndex]) {
        handleSelect(results[activeIndex].path);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelect = (path) => {
    if (onSelectNote) onSelectNote(path);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-20 p-4 transition-all duration-200"
    >
      <div 
        onClick={e => e.stopPropagation()}
        onKeyDown={handleModalKeyDown}
        className="w-full max-w-xl bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="p-3.5 border-b border-[var(--border)] flex items-center gap-3 bg-[var(--bg-sidebar)]">
          <Search size={16} className="text-[var(--text-accent)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search documents by name or path..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button
            onClick={onClose}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {results.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              No matching notes found for "{query}".
            </div>
          ) : (
            results.map((note, idx) => (
              <div 
                key={note.path}
                onClick={() => handleSelect(note.path)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                  activeIndex === idx ? 'bg-[var(--bg-item-active)] text-[var(--text-accent)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-item-hover)]'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <FileText size={15} className={activeIndex === idx ? 'text-[var(--text-accent)]' : 'text-[var(--text-muted)]'} />
                  <div className="font-medium text-xs text-[var(--text-primary)] truncate">
                    {note.name.replace('.md', '')}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] shrink-0">
                  <ArrowRight size={12} className={activeIndex === idx ? 'text-[var(--text-accent)]' : 'opacity-0'} />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-3.5 py-2 bg-[var(--bg-sidebar)] border-t border-[var(--border)] text-[11px] text-[var(--text-muted)] flex items-center justify-between font-mono">
          <div className="flex items-center gap-3">
            <span><kbd className="bg-[var(--bg-card)] px-1 py-0.5 rounded text-[10px] text-[var(--text-primary)] border border-[var(--border)]">↑↓</kbd> Navigate</span>
            <span><kbd className="bg-[var(--bg-card)] px-1 py-0.5 rounded text-[10px] text-[var(--text-primary)] border border-[var(--border)]">Enter</kbd> Open</span>
            <span><kbd className="bg-[var(--bg-card)] px-1 py-0.5 rounded text-[10px] text-[var(--text-primary)] border border-[var(--border)]">Esc</kbd> Close</span>
          </div>
          <span>{results.length} notes</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;

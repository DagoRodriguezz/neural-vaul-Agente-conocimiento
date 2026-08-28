import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FileText, Loader2, Copy, Check, Save } from 'lucide-react';

/**
 * Convert Obsidian [[Wikilinks]] into URL-safe Markdown anchor links.
 *
 * @param {string} text Raw markdown text.
 * @returns {string} Markdown with transformed vault anchors.
 */
const preprocessWikilinks = (text) => {
  if (!text) return '';
  return text.replace(/\[\[([^\]]+)\]\]/g, (match, p1) => `[${p1}](#vault:${encodeURIComponent(p1)})`);
};

const FileViewer = ({ selectedNote, onActionComplete, onSelectNote, viewMode }) => {
  const [content, setContent] = useState('');
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);

  const textareaRef = useRef(null);

  useEffect(() => {
    if (!selectedNote) return;

    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:8000/api/notes/content?path=${encodeURIComponent(selectedNote)}`);
        if (!res.ok) throw new Error('Error al cargar la nota');
        const data = await res.json();
        setContent(data.content);
        setEditContent(data.content);
      } catch (err) {
        setError(err.message);
        setContent('');
        setEditContent('');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [selectedNote]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('http://localhost:8000/api/notes/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedNote, content: editContent })
      });
      if (!res.ok) throw new Error('Error al guardar la nota');
      setContent(editContent);
      if (onActionComplete) onActionComplete();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyNote = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2000);
  };

  if (!selectedNote) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center bg-[var(--bg-editor)] select-none">
        <FileText size={28} className="text-[var(--text-muted)] mb-3 opacity-60" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">No document selected</h2>
        <p className="text-xs text-[var(--text-muted)]">Select a note from the explorer to preview or edit.</p>
      </div>
    );
  }

  const renderCustomMarkdown = (markdownText) => {
    return (
      <div className="markdown-body font-sans text-[var(--text-secondary)]">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4 mt-2 tracking-tight">{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-3 border-b border-[var(--border)] pb-1.5 tracking-tight">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-semibold text-[var(--text-primary)] mt-4 mb-2 tracking-tight">{children}</h3>,
            p: ({ children }) => <p className="mb-4 text-[14px] leading-relaxed text-[var(--text-secondary)]">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-inside space-y-1.5 mb-4 text-[14px] text-[var(--text-secondary)]">{children}</ul>,
            li: ({ children }) => <li className="leading-relaxed text-[var(--text-secondary)]">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold text-[var(--text-primary)]">{children}</strong>,
            blockquote: ({ children }) => <blockquote className="border-l-2 border-[var(--blockquote-border)] pl-3 py-1 my-3 text-[var(--text-muted)] italic text-[14px] bg-[var(--blockquote-bg)] rounded-r">{children}</blockquote>,
            a: ({node, href, children, ...props}) => {
              if (href && href.startsWith('#vault:')) {
                const noteName = decodeURIComponent(href.replace('#vault:', ''));
                return (
                  <span 
                    onClick={(e) => {
                      e.preventDefault();
                      if (onSelectNote) onSelectNote(noteName.endsWith('.md') ? noteName : noteName + '.md');
                    }}
                    className="text-[var(--text-accent)] hover:underline cursor-pointer font-medium"
                    title={`Go to [[${noteName}]]`}
                  >
                    {children}
                  </span>
                );
              }
              return <a href={href} className="text-[var(--text-accent)] hover:underline" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
            },
            code: ({node, inline, className, children, ...props}) => {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  className="my-4 rounded-md bg-[var(--code-bg)] border border-[var(--border)] overflow-x-auto text-xs font-mono text-[var(--text-primary)] !p-3"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className="bg-[var(--code-inline-bg)] text-[var(--text-accent)] px-1.5 py-0.5 rounded text-[13px] font-mono border border-[var(--border)]" {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {preprocessWikilinks(markdownText)}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <main className="flex-1 h-full flex flex-col bg-[var(--bg-editor)] overflow-hidden transition-colors duration-200">
      <header className="h-12 border-b border-[var(--border)] px-6 flex items-center justify-between select-none shrink-0 bg-[var(--bg-editor)] relative z-20">
        <div className="flex items-center gap-1.5 text-xs truncate">
          <span className="text-[var(--text-primary)] font-medium truncate flex items-center gap-2">
            <FileText size={14} className="text-[var(--text-accent)]" />
            {selectedNote}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopyNote}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-item-hover)] transition-colors"
            title="Copy Note Markdown"
          >
            {copiedNote ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>

          {viewMode === 'edit' && (
            <button
              onClick={handleSave}
              disabled={isSaving || content === editContent}
              className="px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
              title="Guardar Cambios"
            >
              {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              <span>Save</span>
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] gap-3">
            <Loader2 size={32} className="animate-spin text-[var(--text-accent)]" />
            <p className="text-sm">Cargando nota...</p>
          </div>
        ) : error ? (
          <div className="p-8 max-w-3xl mx-auto">
            <div className="text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-800/50">
              <p className="font-bold mb-1">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : viewMode === 'edit' ? (
          <div className="h-full w-full p-8 overflow-y-auto">
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Start typing markdown..."
              className="w-full max-w-3xl mx-auto h-full bg-transparent text-[var(--text-primary)] font-mono text-sm leading-relaxed outline-none resize-none selection:bg-[var(--accent-badge-bg)] block"
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="h-full overflow-y-auto px-8 py-7 max-w-3xl mx-auto">
            {content.trim() ? (
              renderCustomMarkdown(content)
            ) : (
              <div className="text-[var(--text-muted)] italic text-sm py-8 text-center">
                Nota vacía. Cambia a "Edit" para escribir.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default FileViewer;

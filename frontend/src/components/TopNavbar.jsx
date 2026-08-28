import React from 'react';
import { 
  PanelLeftClose, 
  PanelLeft, 
  PanelRightClose, 
  PanelRight, 
  Search, 
  Sparkles, 
  Terminal, 
  FileText
} from 'lucide-react';

const TopNavbar = ({
  leftSidebarOpen,
  setLeftSidebarOpen,
  rightSidebarOpen,
  setRightSidebarOpen,
  selectedNote,
  viewMode,
  setViewMode,
  onOpenSearch,
  activeVaultPath,
}) => {
  const currentPath = activeVaultPath || localStorage.getItem('active_vault_path') || '';
  const vaultName = currentPath ? currentPath.split('/').filter(Boolean).pop() : 'Sin Bóveda';

  return (
    <header className="h-14 border-b border-[var(--border)] bg-[var(--bg-editor)] px-4 flex items-center justify-between select-none z-30 shrink-0 transition-colors duration-200">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setLeftSidebarOpen(prev => !prev)}
          className={`p-1.5 rounded-md transition-colors ${
            leftSidebarOpen 
              ? 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-item-hover)]' 
              : 'text-[var(--text-accent)] bg-[var(--accent-badge-bg)] hover:bg-[var(--bg-item-hover)]'
          }`}
          title={leftSidebarOpen ? 'Colapsar explorador' : 'Mostrar explorador'}
        >
          {leftSidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeft size={17} />}
        </button>

        <div className="flex items-center gap-2.5 pr-3 border-r border-[var(--border)]">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--text-accent)] shadow-[0_0_8px_var(--border-focus)] animate-pulse" />
          <span className="font-semibold text-[var(--text-primary)] text-xs tracking-wide">
            {vaultName} <span className="text-[var(--text-muted)] font-mono text-[10px] font-normal">/ Local PKM</span>
          </span>
        </div>

        {selectedNote ? (
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] max-w-xs md:max-w-md truncate">
            <span className="hidden md:inline">Vault / Notes /</span>
            <FileText size={13} className="text-[var(--text-accent)] shrink-0" />
            <span className="truncate text-[var(--text-primary)] font-medium">{selectedNote.replace('.md', '')}</span>
          </div>
        ) : (
          <span className="text-xs text-[var(--text-muted)] italic">Ninguna nota seleccionada</span>
        )}
      </div>

      <button
        onClick={onOpenSearch}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-[var(--bg-card)] hover:bg-[var(--bg-item-hover)] border border-[var(--border)] hover:border-[var(--border-focus)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all w-48 md:w-64 justify-between group"
      >
        <div className="flex items-center gap-2 truncate">
          <Search size={13} className="text-[var(--text-muted)] group-hover:text-[var(--text-accent)] transition-colors" />
          <span className="truncate text-[var(--text-muted)] text-xs">Quick Search...</span>
        </div>
        <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono bg-[var(--bg-sidebar)] text-[var(--text-muted)] px-1.5 py-0.5 rounded border border-[var(--border)]">
          Ctrl+P
        </kbd>
      </button>

      <div className="flex items-center gap-2.5">
        <div className="hidden lg:flex items-center bg-[var(--bg-card)] p-0.5 rounded-md border border-[var(--border)] text-xs">
          <button
            onClick={() => setViewMode('preview')}
            className={`px-2.5 py-1 rounded text-xs transition-all font-medium ${
              viewMode === 'preview'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setViewMode('edit')}
            className={`px-2.5 py-1 rounded text-xs transition-all font-medium ${
              viewMode === 'edit'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Edit
          </button>
        </div>

        <button
          onClick={() => setRightSidebarOpen(prev => !prev)}
          className={`p-1.5 rounded-md transition-colors flex items-center gap-1.5 ml-2 border-l pl-3 border-[var(--border)] ${
            rightSidebarOpen
              ? 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-item-hover)]'
              : 'text-[var(--text-accent)] bg-[var(--accent-badge-bg)] hover:bg-[var(--bg-item-hover)]'
          }`}
          title={rightSidebarOpen ? 'Colapsar panel de IA y logs' : 'Mostrar panel de IA y logs'}
        >
          <div className="flex items-center gap-1">
            <Sparkles size={15} className="text-[var(--text-accent)]" />
            <Terminal size={13} className="text-[var(--terminal-dim)]" />
          </div>
          {rightSidebarOpen ? <PanelRightClose size={16} /> : <PanelRight size={16} />}
        </button>
      </div>
    </header>
  );
};

export default TopNavbar;

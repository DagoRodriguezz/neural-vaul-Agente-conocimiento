import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  Folder, 
  FolderPlus, 
  Palette, 
  Check, 
  Settings, 
  RefreshCw, 
  Network, 
  Edit2, 
  Trash2, 
  Copy, 
  FilePlus 
} from 'lucide-react';
import { AVAILABLE_THEMES } from '../data/themes';

/**
 * Transform a flat list of note records into a nested directory tree.
 *
 * @param {Array<{path: string, type: 'file'|'folder', name: string}>} notesList
 * @returns {Array<Object>} Root-level tree nodes with nested children.
 */
function buildTree(notesList) {
  const root = [];
  for (const note of notesList) {
    const parts = note.path.split('/');
    let currentLevel = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const nodeType = isLast ? note.type : 'folder';
      let existingNode = currentLevel.find((n) => n.name === part);

      if (existingNode) {
        if (nodeType === 'folder') {
          currentLevel = existingNode.children;
        }
      } else {
        const newNode = {
          name: part,
          type: nodeType,
          path: isLast && nodeType === 'file' ? note.path : (parts.slice(0, i + 1).join('/')),
          children: nodeType === 'folder' ? [] : null
        };
        currentLevel.push(newNode);
        if (nodeType === 'folder') {
          currentLevel = newNode.children;
        }
      }
    }
  }

  const sortTree = (nodes) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children) sortTree(node.children);
    }
  };

  sortTree(root);
  return root;
}

const TreeNode = ({ node, level, onSelectNote, selectedNote, onContextMenu }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isFolder = node.type === 'folder';
  const isActive = !isFolder && node.path === selectedNote;

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, node);
  };

  if (isFolder) {
    return (
      <div className="select-none text-xs">
        <div 
          onClick={() => setIsOpen(!isOpen)}
          onContextMenu={handleContextMenu}
          className="group flex items-center justify-between py-1.5 px-2.5 rounded-md cursor-pointer transition-colors duration-150 relative my-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-item-hover)]"
          style={{ paddingLeft: `${level * 14 + 10}px` }}
        >
          <div className="flex items-center gap-2 truncate flex-1 min-w-0">
            <span className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
              {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </span>
            <Folder size={13} className="text-[var(--text-muted)] shrink-0" />
            <span className="truncate text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
              {node.name}
            </span>
          </div>
        </div>
        {isOpen && (
          <div className="mt-0.5 space-y-0.5">
            {node.children.map((child, idx) => (
              <TreeNode 
                key={idx} 
                node={child} 
                level={level + 1} 
                onSelectNote={onSelectNote} 
                selectedNote={selectedNote}
                onContextMenu={onContextMenu}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="select-none text-xs">
      <div 
        onClick={() => onSelectNote && onSelectNote(node.path)}
        onContextMenu={handleContextMenu}
        className={`group flex items-center justify-between py-1.5 px-2.5 rounded-md cursor-pointer transition-colors duration-150 relative my-0.5 ${
          isActive
            ? 'bg-[var(--bg-item-active)] text-[var(--text-accent)] font-medium'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-item-hover)]'
        }`}
        style={{ paddingLeft: `${level * 14 + 10}px` }}
      >
        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
          <FileText size={13} className={isActive ? 'text-[var(--text-accent)] shrink-0' : 'text-[var(--text-muted)] shrink-0'} />
          <span className={`truncate text-xs ${isActive ? 'text-[var(--text-accent)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>
            {node.name.replace('.md', '')}
          </span>
        </div>
      </div>
    </div>
  );
};

const Sidebar = ({ 
  refreshTrigger, 
  onSelectNote, 
  selectedNote, 
  onToggleGraph, 
  showGraph, 
  currentTheme, 
  onSelectTheme, 
  onVaultChange,
  activeVaultPath
}) => {
  const [notes, setNotes] = useState([]);
  const [vaultPathInput, setVaultPathInput] = useState(() => activeVaultPath || localStorage.getItem('active_vault_path') || '');
  const [isChangingVault, setIsChangingVault] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [vaultSuccess, setVaultSuccess] = useState(false);

  useEffect(() => {
    if (activeVaultPath) {
      setVaultPathInput(activeVaultPath);
    }
  }, [activeVaultPath]);
  
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef(null);

  const [contextMenu, setContextMenu] = useState(null);
  const contextMenuRef = useRef(null);

  const fetchNotes = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/notes');
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error('Failed to fetch notes list:', error);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [refreshTrigger]);

  const handleApplyVault = async (e) => {
    e.preventDefault();
    if (!vaultPathInput.trim()) return;

    setIsChangingVault(true);
    try {
      const res = await fetch('http://localhost:8000/api/config/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vault_path: vaultPathInput.trim() })
      });
      if (!res.ok) throw new Error('Ruta inválida');

      const newPath = vaultPathInput.trim();
      localStorage.setItem('active_vault_path', newPath);
      if (onVaultChange) onVaultChange(newPath);

      setVaultSuccess(true);
      setTimeout(() => setVaultSuccess(false), 2000);
      if (onSelectNote) onSelectNote(null);
      fetchNotes();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsChangingVault(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) {
        setIsThemeMenuOpen(false);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleContextMenu = (e, node) => {
    setContextMenu({
      x: e.pageX,
      y: e.pageY,
      node: node
    });
  };

  const handleCreateNote = async (basePath = '') => {
    setContextMenu(null);
    let name = window.prompt("Nombre de la nueva nota (sin .md):");
    if (!name) return;
    if (!name.endsWith('.md')) name += '.md';

    const targetPath = basePath ? `${basePath}/${name}` : name;
    try {
      const res = await fetch('http://localhost:8000/api/notes/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: targetPath, content: '' })
      });
      if (!res.ok) throw new Error('Error al crear nota');
      await fetchNotes();
      if (onSelectNote) onSelectNote(targetPath);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleCreateFolder = async (basePath = '') => {
    setContextMenu(null);
    let name = window.prompt("Nombre de la nueva carpeta:");
    if (!name) return;

    const targetPath = basePath ? `${basePath}/${name}` : name;
    try {
      const res = await fetch('http://localhost:8000/api/notes/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: targetPath })
      });
      if (!res.ok) throw new Error('Error al crear carpeta');
      await fetchNotes();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleRename = async (node) => {
    setContextMenu(null);
    const isFile = node.type === 'file';
    let currentName = isFile ? node.name.replace('.md', '') : node.name;

    let newName = window.prompt(`Renombrar ${isFile ? 'nota' : 'carpeta'}:`, currentName);
    if (!newName || newName === currentName) return;

    if (isFile && !newName.endsWith('.md')) newName += '.md';

    const pathParts = node.path.split('/');
    pathParts.pop();
    const basePath = pathParts.join('/');
    const newPath = basePath ? `${basePath}/${newName}` : newName;

    try {
      const res = await fetch('http://localhost:8000/api/notes/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_path: node.path, new_path: newPath })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Error al renombrar');
      }

      await fetchNotes();
      if (isFile && selectedNote === node.path) {
        if (onSelectNote) onSelectNote(newPath);
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleDelete = async (node) => {
    setContextMenu(null);
    const confirm = window.confirm(`¿Estás seguro de eliminar permanentemente ${node.name}?`);
    if (!confirm) return;

    try {
      const res = await fetch(`http://localhost:8000/api/notes?path=${encodeURIComponent(node.path)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Error al eliminar');

      await fetchNotes();
      if (node.type === 'file' && selectedNote === node.path) {
        if (onSelectNote) onSelectNote(null);
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleCopyPath = (node) => {
    setContextMenu(null);
    navigator.clipboard.writeText(node.path);
  };

  const treeData = useMemo(() => buildTree(notes), [notes]);

  return (
    <aside 
      className="w-full h-full flex flex-col bg-[var(--bg-sidebar)] select-none overflow-hidden border-r border-[var(--border)] transition-colors duration-200 relative"
      onContextMenu={(e) => {
        if (e.target === e.currentTarget || e.target.id === 'tree-container') {
          e.preventDefault();
          handleContextMenu(e, { path: '', type: 'root', name: 'Vault Root' });
        }
      }}
    >
      <div className="h-12 px-4 flex items-center justify-between border-b border-[var(--border)] shrink-0 bg-[var(--bg-sidebar)]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
              className={`p-1 rounded transition-colors ${
                isThemeMenuOpen
                  ? 'bg-[var(--accent-badge-bg)] text-[var(--text-accent)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-item-hover)]'
              }`}
              title="Temas de Color"
            >
              <Palette size={13} />
            </button>

            {isThemeMenuOpen && (
              <div className="absolute left-0 top-7 z-50 w-52 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl p-1.5 text-xs text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] mb-1">
                  Temas de Color
                </div>
                <div className="space-y-0.5">
                  {AVAILABLE_THEMES.map((t) => {
                    const isSelected = currentTheme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          onSelectTheme(t.id);
                          setIsThemeMenuOpen(false);
                        }}
                        className={`w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-[var(--bg-item-active)] text-[var(--text-accent)] font-medium'
                            : 'hover:bg-[var(--bg-item-hover)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-[var(--border)] shadow-sm shrink-0"
                            style={{ backgroundColor: t.previewColor, borderColor: t.accentColor }}
                          />
                          <span className="text-xs truncate">{t.name}</span>
                        </div>
                        {isSelected && <Check size={13} className="text-[var(--text-accent)] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => handleCreateNote('')}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-item-hover)] transition-colors"
            title="Crear Nueva Nota (Raíz)"
          >
            <FilePlus size={13} />
          </button>
          
          <button
            onClick={() => handleCreateFolder('')}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-item-hover)] transition-colors"
            title="Crear Nueva Carpeta (Raíz)"
          >
            <FolderPlus size={13} />
          </button>

          <button
            onClick={() => onToggleGraph && onToggleGraph(!showGraph)}
            className={`p-1 rounded transition-colors ${showGraph ? 'bg-[var(--accent-badge-bg)] text-[var(--text-accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-item-hover)]'}`}
            title="Vista de Grafo"
          >
            <Network size={13} />
          </button>
          
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-1 rounded transition-colors ${showConfig ? 'bg-[var(--bg-item-active)] text-[var(--text-accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-item-hover)]'}`}
            title="Configurar Bóveda"
          >
            <Settings size={13} />
          </button>
        </div>
      </div>

      {showConfig && (
        <div className="p-3 border-b border-[var(--border)] bg-[var(--bg-card)] animate-in fade-in slide-in-from-top-2 duration-200">
          <form onSubmit={handleApplyVault} className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
              Ruta de la Bóveda Actual
            </label>
            <div className="flex gap-1.5">
              <input 
                type="text" 
                value={vaultPathInput}
                onChange={(e) => setVaultPathInput(e.target.value)}
                placeholder="/ruta/a/mi_boveda"
                className="flex-1 min-w-0 bg-[var(--bg-sidebar)] text-xs text-[var(--text-primary)] border border-[var(--border)] rounded-md px-2 py-1.5 focus:outline-none focus:border-[var(--border-focus)] transition-colors placeholder-[var(--text-muted)]"
              />
              <button 
                type="submit"
                disabled={isChangingVault || !vaultPathInput.trim()}
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:bg-[var(--bg-item-hover)] disabled:text-[var(--text-muted)] text-white px-2 py-1.5 rounded-md transition-colors flex items-center justify-center shrink-0 min-w-[36px]"
              >
                {isChangingVault ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : vaultSuccess ? (
                  <Check size={12} className="text-emerald-400" />
                ) : (
                  <span className="text-[11px] font-medium px-1">Aplicar</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <div id="tree-container" className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {treeData.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] italic p-4 text-center">No hay notas en la bóveda.</p>
        ) : (
          treeData.map((node, idx) => (
            <TreeNode 
              key={idx} 
              node={node} 
              level={0} 
              onSelectNote={onSelectNote}
              selectedNote={selectedNote}
              onContextMenu={handleContextMenu}
            />
          ))
        )}
      </div>

      {contextMenu && (
        <div 
          ref={contextMenuRef}
          className="fixed z-50 w-48 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl py-1 text-xs text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-100"
          style={{ 
            top: `${Math.min(contextMenu.y, window.innerHeight - 150)}px`, 
            left: `${contextMenu.x}px` 
          }}
        >
          <div className="px-3 py-1.5 border-b border-[var(--border)] mb-1">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] truncate block max-w-full">
              {contextMenu.node.name}
            </span>
          </div>

          {(contextMenu.node.type === 'folder' || contextMenu.node.type === 'root') && (
            <>
              <button 
                onClick={() => handleCreateNote(contextMenu.node.path)}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--bg-item-hover)] transition-colors"
              >
                <FilePlus size={13} className="text-[var(--text-accent)]" /> Crear Nota
              </button>
              <button 
                onClick={() => handleCreateFolder(contextMenu.node.path)}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--bg-item-hover)] transition-colors"
              >
                <FolderPlus size={13} className="text-[var(--text-accent)]" /> Crear Carpeta
              </button>
              <div className="h-px bg-[var(--border)] my-1" />
            </>
          )}

          {contextMenu.node.type !== 'root' && (
            <>
              <button 
                onClick={() => handleRename(contextMenu.node)}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--bg-item-hover)] transition-colors"
              >
                <Edit2 size={13} className="text-[var(--text-muted)]" /> Renombrar
              </button>
              <button 
                onClick={() => handleCopyPath(contextMenu.node)}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--bg-item-hover)] transition-colors"
              >
                <Copy size={13} className="text-[var(--text-muted)]" /> Copiar Ruta
              </button>
              <div className="h-px bg-[var(--border)] my-1" />
              <button 
                onClick={() => handleDelete(contextMenu.node)}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--bg-item-hover)] text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 size={13} /> Eliminar
              </button>
            </>
          )}
        </div>
      )}
    </aside>
  );
};

export default Sidebar;

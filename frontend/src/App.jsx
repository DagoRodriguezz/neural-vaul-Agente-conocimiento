import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import RightPanel from './components/RightPanel';
import FileViewer from './components/FileViewer';
import GlobalSearch from './components/GlobalSearch';
import GraphView from './components/GraphView';
import TopNavbar from './components/TopNavbar';

const STORAGE_KEY_THEME = 'obsidian_pkm_theme_v1';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedNote, setSelectedNote] = useState(null);
  const [agentLogs, setAgentLogs] = useState([]);

  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved && ['dark', 'light', 'cyberpunk', 'celeste'].includes(saved)) {
      return saved;
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem(STORAGE_KEY_THEME, currentTheme);
  }, [currentTheme]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [showGraph, setShowGraph] = useState(false);
  const [viewMode, setViewMode] = useState('preview');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [isVaultConfigured, setIsVaultConfigured] = useState(true);
  const [activeVaultPath, setActiveVaultPath] = useState(() => localStorage.getItem('active_vault_path') || '');
  const [vaultPathInput, setVaultPathInput] = useState(() => localStorage.getItem('active_vault_path') || '');
  const [isCheckingVault, setIsCheckingVault] = useState(true);

  useEffect(() => {
    const initVault = async () => {
      const savedPath = localStorage.getItem('active_vault_path');
      if (savedPath) {
        try {
          const res = await fetch('http://localhost:8000/api/config/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vault_path: savedPath })
          });
          if (res.ok) {
            setActiveVaultPath(savedPath);
            setVaultPathInput(savedPath);
            setIsVaultConfigured(true);
            setRefreshTrigger(prev => prev + 1);
          } else {
            setIsVaultConfigured(false);
          }
        } catch {
          setIsVaultConfigured(false);
        }
      } else {
        setIsVaultConfigured(false);
      }
      setIsCheckingVault(false);
    };
    initVault();
  }, []);

  const handleActionComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleNewLog = (logMessage) => {
    const newLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      message: logMessage,
    };
    setAgentLogs(prev => [...prev.slice(-150), newLog]);
  };

  const handleSelectNote = (path) => {
    setSelectedNote(path);
    if (showGraph) setShowGraph(false);
  };

  const handleConnectVault = async (e) => {
    e.preventDefault();
    if (!vaultPathInput.trim()) return;

    setIsCheckingVault(true);
    try {
      const res = await fetch('http://localhost:8000/api/config/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vault_path: vaultPathInput.trim() })
      });
      if (!res.ok) throw new Error('Ruta inválida o no encontrada');

      const newPath = vaultPathInput.trim();
      localStorage.setItem('active_vault_path', newPath);
      setActiveVaultPath(newPath);
      setIsVaultConfigured(true);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsCheckingVault(false);
    }
  };

  return (
    <div 
      data-theme={currentTheme}
      className="flex h-screen w-screen bg-[var(--bg-app)] text-[var(--text-primary)] overflow-hidden font-sans select-none antialiased transition-colors duration-200"
    >
      {!isVaultConfigured && !isCheckingVault && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[0.5px] p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] p-6 rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 text-center">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Conectar Bóveda</h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              No hay ninguna bóveda conectada. Ingresa la ruta absoluta de tu carpeta de Markdown para comenzar.
            </p>
            <form onSubmit={handleConnectVault} className="flex flex-col gap-4">
              <input 
                type="text" 
                value={vaultPathInput}
                onChange={(e) => setVaultPathInput(e.target.value)}
                placeholder="Ej: /home/usuario/Documentos/Obsidian"
                className="w-full bg-[var(--bg-sidebar)] text-sm text-[var(--text-primary)] border border-[var(--border)] rounded-lg px-4 py-3 focus:outline-none focus:border-[var(--accent)] transition-colors placeholder-[var(--text-muted)]"
              />
              <button 
                type="submit"
                disabled={isCheckingVault || !vaultPathInput.trim()}
                className="w-full bg-[var(--accent)] text-white font-semibold py-3 rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
              >
                {isCheckingVault ? 'Conectando...' : 'Conectar Bóveda'}
              </button>
            </form>
            
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={async () => {
                  const demoPath = '../mock_vault';
                  setIsCheckingVault(true);
                  try {
                    const res = await fetch('http://localhost:8000/api/config/vault', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ vault_path: demoPath })
                    });
                    if (!res.ok) throw new Error('Error conectando bóveda de prueba');
                    localStorage.setItem('active_vault_path', demoPath);
                    setActiveVaultPath(demoPath);
                    setVaultPathInput(demoPath);
                    setIsVaultConfigured(true);
                    setRefreshTrigger(prev => prev + 1);
                  } catch (err) {
                    alert("Error: " + err.message);
                  } finally {
                    setIsCheckingVault(false);
                  }
                }}
                disabled={isCheckingVault}
                className="w-full bg-transparent text-[var(--text-muted)] border border-[var(--border)] font-medium py-2.5 rounded-lg hover:bg-[var(--bg-item-hover)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 text-sm"
              >
                Cargar Bóveda de Prueba
              </button>
            </div>
          </div>
        </div>
      )}

      <div 
        className={`transition-all duration-300 ease-in-out shrink-0 h-full bg-[var(--bg-sidebar)] ${
          isSidebarOpen ? 'w-[250px]' : 'w-0 overflow-hidden'
        }`}
      >
        <div className="w-[250px] h-full">
          <Sidebar 
            onSelectNote={handleSelectNote} 
            refreshTrigger={refreshTrigger} 
            selectedNote={selectedNote}
            onToggleGraph={setShowGraph}
            showGraph={showGraph}
            currentTheme={currentTheme}
            onSelectTheme={setCurrentTheme}
            onOpenSearch={() => setIsSearchOpen(true)}
            activeVaultPath={activeVaultPath}
            onVaultChange={(newPath) => {
              setActiveVaultPath(newPath);
              setVaultPathInput(newPath);
              setRefreshTrigger(prev => prev + 1);
            }}
          />
        </div>
      </div>

      <div className="flex-1 h-full min-w-0 bg-[var(--bg-editor)] flex flex-col overflow-hidden">
        <TopNavbar 
          leftSidebarOpen={isSidebarOpen}
          setLeftSidebarOpen={setIsSidebarOpen}
          rightSidebarOpen={isRightPanelOpen}
          setRightSidebarOpen={setIsRightPanelOpen}
          selectedNote={selectedNote}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onOpenSearch={() => setIsSearchOpen(true)}
          logsCount={agentLogs.length}
          activeVaultPath={activeVaultPath}
        />

        <div className="flex-1 relative overflow-hidden">
          {showGraph ? (
            <GraphView onSelectNote={handleSelectNote} />
          ) : (
            <FileViewer 
              selectedNote={selectedNote} 
              onActionComplete={handleActionComplete}
              onSelectNote={handleSelectNote}
              viewMode={viewMode}
              setViewMode={setViewMode}
            />
          )}
        </div>
      </div>

      <div 
        className={`transition-all duration-300 ease-in-out shrink-0 h-full bg-[var(--bg-sidebar)] ${
          isRightPanelOpen ? 'w-[360px]' : 'w-0 overflow-hidden'
        }`}
      >
        <div className="w-[360px] h-full">
          <RightPanel 
            onActionComplete={handleActionComplete} 
            onNewLog={handleNewLog}
            onSelectNote={handleSelectNote}
            logs={agentLogs}
            onClearLogs={() => setAgentLogs([])}
            selectedNote={selectedNote}
          />
        </div>
      </div>

      <GlobalSearch 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectNote={handleSelectNote} 
      />
    </div>
  );
}

export default App;

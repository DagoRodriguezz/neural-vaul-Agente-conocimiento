import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Send,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Mic,
  MicOff
} from 'lucide-react';

/**
 * Convert Obsidian [[Wikilinks]] into URL-safe Markdown anchor links.
 *
 * @param {string} text Raw markdown input.
 * @returns {string} Processed markdown with encoded anchor links.
 */
const preprocessWikilinks = (text) => {
  if (!text) return '';
  return text.replace(/\[\[([^\]]+)\]\]/g, (match, p1) => `[${p1}](#vault:${encodeURIComponent(p1)})`);
};

const RightPanel = ({ onActionComplete, onNewLog, onSelectNote, logs, onClearLogs }) => {
  const [messages, setMessages] = useState([
    {
      id: 'msg-init',
      role: 'assistant',
      text: '¡Hola! Soy tu asistente autónomo conectado a la Bóveda de Notas. ¿En qué te puedo ayudar hoy?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);

  const [model, setModel] = useState('gemini-3.5-flash-lite');
  const [isListening, setIsListening] = useState(false);

  const chatEndRef = useRef(null);
  const logsEndRef = useRef(null);

  /**
   * Capture microphone input using the browser's native Web Speech API.
   */
  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta reconocimiento de voz nativo.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.start();
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoadingAi]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleCopyMessage = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  /**
   * Dispatch user message to backend and stream agent execution logs and output via SSE.
   */
  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoadingAi) return;

    const userMessage = inputText.trim();
    setInputText('');

    const newMsg = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: userMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    setIsLoadingAi(true);

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          model: model,
          thread_id: "sesion-usuario-1"
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      const agentMsgId = `msg-agent-${Date.now()}`;
      setMessages(prev => [...prev, {
        id: agentMsgId,
        role: 'assistant',
        text: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.type === 'log') {
                if (onNewLog) onNewLog(data.message);
              } else if (data.type === 'chunk') {
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  newMessages[lastIndex] = {
                    ...newMessages[lastIndex],
                    text: newMessages[lastIndex].text + data.content
                  };
                  return newMessages;
                });
              } else if (data.type === 'result') {
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  newMessages[lastIndex] = {
                    ...newMessages[lastIndex],
                    text: data.message || ''
                  };
                  return newMessages;
                });
              } else if (data.type === 'end') {
                if (onActionComplete) onActionComplete();
                break;
              } else if (data.type === 'error') {
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  newMessages[lastIndex].text += `\n\n**Error:** ${data.message}`;
                  return newMessages;
                });
              }
            } catch (e) {
              console.error("Failed to parse SSE line:", e, "Line:", line);
            }
          }
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        text: `Lo siento, ocurrió un error: ${error.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleClearChat = () => {
    setMessages([{
      id: `msg-init-${Date.now()}`,
      role: 'assistant',
      text: 'Chat limpiado. ¿En qué te puedo ayudar?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  return (
    <aside className="w-full h-full flex flex-col bg-[var(--bg-sidebar)] select-none overflow-hidden border-l border-[var(--border)] transition-colors duration-200">
      <div className="h-12 px-4 flex items-center justify-between border-b border-[var(--border)] shrink-0 bg-[var(--bg-sidebar)]">
        <select 
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="bg-transparent text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] focus:outline-none focus:text-[var(--text-primary)] transition-colors cursor-pointer appearance-none"
        >
          <option value="gemini-3.5-flash-lite" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Gemini 3.5 Flash Lite</option>
          <option value="gemini-3.1-flash-lite" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Gemini 3.1 Flash Lite</option>
          <option value="gemini-3.7-flash" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Gemini 3.7 Flash</option>
          <option value="gemini-3.6-flash" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Gemini 3.6 Flash</option>
        </select>
        
        <button
          onClick={handleClearChat}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-item-hover)] rounded transition-colors"
          title="Clear Chat"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 select-text">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`rounded-2xl text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[var(--accent)] text-white max-w-[85%] px-3.5 py-2.5 shadow-sm'
                  : 'bg-[var(--bg-card)] text-[var(--text-primary)] max-w-[92%] p-3.5 border border-[var(--border)]'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div>
                  <div className="markdown-body space-y-1.5 text-[var(--text-secondary)] break-words">
                    {msg.text.trim() === '' && !isLoadingAi ? (
                      <span className="italic text-[var(--text-muted)]">Acción completada con éxito.</span>
                    ) : (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
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
                                className="rounded-md border border-[var(--border)] !my-4 !bg-[var(--code-bg)] text-xs"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className="bg-[var(--code-inline-bg)] text-[var(--text-accent)] px-1.5 py-0.5 rounded text-[11px] font-mono border border-[var(--border)]" {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {preprocessWikilinks(msg.text)}
                      </ReactMarkdown>
                    )}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--text-muted)] select-none">
                    <span>{msg.timestamp}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.text)}
                        className="p-0.5 hover:text-[var(--text-primary)] rounded"
                        title="Copy message"
                      >
                        {copiedMessageId === msg.id ? (
                          <Check size={11} className="text-emerald-500" />
                        ) : (
                          <Copy size={11} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{msg.text}</div>
              )}
            </div>
          </div>
        ))}

        {isLoadingAi && (
          <div className="flex justify-start">
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-3 text-xs text-[var(--text-muted)] flex items-center gap-2">
              <RefreshCw size={12} className="animate-spin text-[var(--text-accent)]" />
              <span>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-sidebar)] shrink-0">
        <div className="relative flex items-end">
          <textarea
            rows={1}
            placeholder="Ask AI anything..."
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
                e.target.style.height = 'auto';
              }
            }}
            disabled={isLoadingAi}
            className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] text-xs pl-3.5 pr-[4.5rem] py-3 rounded-xl border border-[var(--border)] focus:border-[var(--accent)] outline-none placeholder-[var(--text-muted)] transition-colors resize-none overflow-y-auto"
            style={{ maxHeight: '120px' }}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                handleVoiceInput();
              }}
              disabled={isLoadingAi}
              className={`p-1.5 rounded-lg transition-all ${
                isListening
                  ? 'text-red-500 bg-red-500/10 animate-pulse'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-item-hover)]'
              }`}
              title="Dictado por Voz"
            >
              {isListening ? <MicOff size={13} /> : <Mic size={13} />}
            </button>
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isLoadingAi}
              className="p-1.5 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-20 transition-all shadow-sm"
            >
              <Send size={11} />
            </button>
          </div>
        </div>
      </div>

      <div className="h-44 border-t border-[var(--border)] bg-[var(--bg-terminal)] flex flex-col overflow-hidden shrink-0 font-mono text-xs leading-relaxed p-3.5 select-text relative transition-colors duration-200">
        <div className="absolute top-2 right-3 z-10 flex gap-2">
          <button 
            onClick={onClearLogs}
            className="text-[var(--terminal-dim)] hover:text-[var(--text-primary)] transition-colors p-1 rounded hover:bg-[var(--bg-item-hover)]"
            title="Limpiar Logs"
          >
            <Trash2 size={13} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 text-[var(--terminal-text)] font-mono text-xs mt-4">
          {logs.map((log) => (
            <div key={log.id} className="break-all opacity-95">
              {log.message}
            </div>
          ))}
          <div className="flex items-center gap-1 text-[var(--terminal-text)] opacity-85 mt-2">
            <span>&gt; System standby.</span>
            <span className="w-1.5 h-3.5 bg-[var(--terminal-text)] animate-pulse" />
          </div>
          <div ref={logsEndRef} />
        </div>
      </div>
    </aside>
  );
};

export default RightPanel;

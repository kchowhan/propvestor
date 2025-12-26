'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type ChatResponse = {
  intent: string;
  reply: string;
  suggestions?: string[];
  data?: unknown;
};

const initialMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm your copilot. Ask me for KPIs, work orders, delinquent charges, or expiring leases.",
};

export const ChatOverlay = () => {
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) {
      return;
    }

    if (!token) {
      setError('Please log in to use the assistant.');
      return;
    }

    setError(null);
    setIsLoading(true);
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    try {
      const response = (await apiFetch('/chat', {
        method: 'POST',
        token,
        body: { message: trimmed },
      })) as ChatResponse;

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setSuggestions(response.suggestions ?? []);
    } catch (err) {
      setError((err as Error).message || 'Failed to reach the assistant.');
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I could not complete that request. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div className="w-[360px] max-w-[calc(100vw-2rem)] h-[520px] bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
            <div>
              <div className="text-sm font-semibold">AI Ops Copilot</div>
              <div className="text-xs text-slate-300">Internal analytics and ops insights</div>
            </div>
            <button
              type="button"
              className="text-slate-300 hover:text-white text-sm"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 bg-slate-50">
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'ml-auto bg-ink text-white'
                      : 'mr-auto bg-white border border-slate-200 text-slate-800'
                  }`}
                >
                  {message.content}
                </div>
              ))}
              {isLoading && (
                <div className="mr-auto bg-white border border-slate-200 text-slate-500 max-w-[60%] rounded-xl px-3 py-2 text-sm">
                  Thinking...
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>

          {suggestions.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-200 bg-white">
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 4).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                    className="text-xs px-2.5 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-slate-200 bg-white">
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="input flex-1"
                placeholder="Ask about KPIs, work orders, delinquencies..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={isLoading}
              />
              <button type="submit" className="btn btn-primary" disabled={isLoading || !input.trim()}>
                Send
              </button>
            </div>
            {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
          </form>
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary rounded-full shadow-lg"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open copilot"
      >
        {isOpen ? 'Hide Copilot' : 'AI Copilot'}
      </button>
    </div>
  );
};

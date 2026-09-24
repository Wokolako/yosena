import React, { useState, useRef, useEffect } from 'react';
import { fetchGemstones } from '../lib/api';
import { WHATSAPP_URL } from '../lib/contact';
import { MessageCircle, X, Send, Loader2, RotateCcw } from 'lucide-react';
import { Gemstone } from '../types';

interface ChatWidgetProps {
  onSelectStone?: (stone: Gemstone) => void;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  handoff?: boolean;
  error?: boolean;
}

const GREETING: ChatMessage = {
  role: 'model',
  text: 'Good day. I am the YosenaMora concierge. Ask me about stones in the vault, certification and provenance, consultation formats, or our sourcing and memo terms.',
};

const SUGGESTIONS = [
  'What unheated sapphires are in the vault?',
  'Explain Type IIa diamonds',
  'How do memo terms work?',
];

function renderFormattedText(
  text: string,
  stones: Gemstone[],
  onSelectStone?: (stone: Gemstone) => void
) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: (string | React.ReactNode)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const label = match[1];
    const url = match[2];
    const key = `link-${match.index}`;

    if (url.startsWith('#stone=') || url.startsWith('#gemstone=')) {
      const stoneId = url.split('=')[1];
      const stone = stones.find((s) => s.id === stoneId);

      parts.push(
        <button
          key={key}
          onClick={(e) => {
            e.preventDefault();
            if (stone && onSelectStone) {
              onSelectStone(stone);
            }
            window.location.hash = url;
          }}
          title={stone ? `View product page for ${stone.name}` : `View ${label}`}
          className="font-semibold text-[#C5A880] dark:text-[#D4AF37] underline underline-offset-2 hover:text-[#1A1918] dark:hover:text-[#F5F2ED] transition-colors cursor-pointer inline-flex items-center gap-0.5 mx-0.5 text-left"
        >
          <span>{label}</span>
          <svg className="w-3.5 h-3.5 inline-block opacity-80 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
      );
    } else {
      parts.push(
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#C5A880] dark:text-[#D4AF37] underline underline-offset-2 hover:text-[#1A1918] dark:hover:text-[#F5F2ED] transition-colors"
        >
          {label}
        </a>
      );
    }

    lastIndex = linkRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

/** WhatsApp hand-off shown beneath a reply the desk should take over. */
const WhatsAppHandoff: React.FC = () => (
  <a
    href={WHATSAPP_URL}
    target="_blank"
    rel="noopener noreferrer"
    className="mt-2.5 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] text-xs font-bold uppercase tracking-wider hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] transition-colors"
  >
    {/* WhatsApp glyph — lucide has no brand icons */}
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35M12.04 21.5h-.01a9.43 9.43 0 0 1-4.8-1.32l-.35-.2-3.57.93.96-3.48-.23-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.24-9.43 9.45-9.43 2.52 0 4.9.99 6.68 2.77a9.38 9.38 0 0 1 2.76 6.67c0 5.2-4.24 9.44-9.45 9.44M20.52 3.45A11.77 11.77 0 0 0 12.04 0C5.5 0 .2 5.3.2 11.82c0 2.08.55 4.11 1.59 5.9L.1 24l6.42-1.68a11.82 11.82 0 0 0 5.51 1.4h.01c6.53 0 11.84-5.3 11.84-11.82a11.75 11.75 0 0 0-3.46-8.37" />
    </svg>
    Message the trade desk
  </a>
);

export const ChatWidget: React.FC<ChatWidgetProps> = ({ onSelectStone }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('yosenamora_chat_history');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return [GREETING];
  });
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [stones, setStones] = useState<Gemstone[]>([]);

  // Backs the inline #stone= links the assistant emits. A miss only costs the
  // in-page modal — the hash still navigates — so a failure is swallowed.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchGemstones();
        if (!cancelled) setStones(data);
      } catch {
        if (!cancelled) setStones([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist chat history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('yosenamora_chat_history', JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  const handleClearHistory = () => {
    setMessages([GREETING]);
    try {
      localStorage.removeItem('yosenamora_chat_history');
    } catch (e) {}
  };

  // Pin the transcript to the newest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending]);

  // Focus the composer when the panel opens; close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const outgoing: ChatMessage = { role: 'user', text: trimmed };
    // Snapshot the thread being sent so the request matches what is on screen.
    const thread = [...messages, outgoing];

    setMessages(thread);
    setInput('');
    setIsSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The greeting is interface copy, not part of the conversation.
        body: JSON.stringify({
          messages: thread.filter((m) => m !== GREETING).map(({ role, text }) => ({ role, text })),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: data?.error ?? 'The concierge is unavailable right now.',
            handoff: true,
            error: true,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'model', text: data.reply, handoff: !!data.handoff },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: 'I could not reach the desk just now. Please try again, or message us on WhatsApp.',
          handoff: true,
          error: true,
        },
      ]);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? 'Close the concierge' : 'Ask the concierge'}
        aria-expanded={isOpen}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] shadow-2xl flex items-center justify-center hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] transition-all cursor-pointer border border-[#33312E] dark:border-[#C5A880]"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="YosenaMora concierge"
          className="fixed z-50 bg-[#FAF8F5] dark:bg-[#121110] border border-[#E0D8CE] dark:border-[#2C2926] shadow-2xl flex flex-col transition-colors
                     inset-x-3 bottom-24 top-20 rounded-xl
                     sm:inset-x-auto sm:top-auto sm:right-5 sm:bottom-24 sm:w-[24rem] sm:h-[32rem]"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#E8E1D9] dark:border-[#262320] bg-[#FFFFFF] dark:bg-[#181614] rounded-t-xl shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-serif text-lg text-[#1A1918] dark:text-[#F5F2ED] leading-tight">
                  Atelier Concierge
                </p>
                <p className="text-xs text-[#78716C] dark:text-[#A69C94] tracking-wide">
                  Vault listings, provenance &amp; terms
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {messages.length > 1 && (
                  <button
                    onClick={handleClearHistory}
                    title="Clear conversation transcript"
                    aria-label="Clear transcript"
                    className="p-1.5 text-[#78716C] dark:text-[#A69C94] hover:text-[#1A1918] dark:hover:text-[#F5F2ED] hover:bg-[#F2ECE4] dark:hover:bg-[#23201D] rounded-full transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Close the concierge"
                  className="p-1.5 text-[#57534E] dark:text-[#D5CDC4] hover:text-[#1A1918] dark:hover:text-[#F5F2ED] hover:bg-[#F2ECE4] dark:hover:bg-[#23201D] rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Transcript */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={msg.role === 'user' ? 'max-w-[85%]' : 'max-w-[90%]'}>
                  <div
                    className={`px-3.5 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] rounded-br-sm'
                        : msg.error
                          ? 'bg-[#FFFFFF] dark:bg-[#181614] border border-[#D9B8A8] dark:border-[#4A332A] text-[#57534E] dark:text-[#D5CDC4] rounded-bl-sm'
                          : 'bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] text-[#44403C] dark:text-[#D5CDC4] rounded-bl-sm'
                    }`}
                  >
                    {renderFormattedText(msg.text, stones, onSelectStone)}
                  </div>
                  {msg.role === 'model' && msg.handoff && <WhatsAppHandoff />}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start">
                <div className="px-3.5 py-2.5 rounded-xl rounded-bl-sm bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] text-[#78716C] dark:text-[#A69C94] text-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Consulting the vault records
                </div>
              </div>
            )}

            {/* Openers, shown until the visitor says something */}
            {messages.length === 1 && !isSending && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="px-3 py-1.5 rounded-full border border-[#E0D8CE] dark:border-[#332F2B] bg-[#FFFFFF] dark:bg-[#181614] text-xs text-[#57534E] dark:text-[#D5CDC4] hover:border-[#1A1918] dark:hover:border-[#C5A880] hover:text-[#1A1918] dark:hover:text-[#F5F2ED] transition-colors cursor-pointer text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="p-3 border-t border-[#E8E1D9] dark:border-[#262320] bg-[#FFFFFF] dark:bg-[#181614] rounded-b-xl shrink-0"
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about a stone, a term, a service…"
                aria-label="Message the concierge"
                maxLength={1500}
                className="flex-1 min-w-0 px-3.5 py-2.5 rounded-lg bg-[#FAF8F5] dark:bg-[#121110] border border-[#E0D8CE] dark:border-[#332F2B] text-sm text-[#1A1918] dark:text-[#F5F2ED] placeholder:text-[#A8A29E] dark:placeholder:text-[#6E6760] focus:outline-none focus:border-[#1A1918] dark:focus:border-[#C5A880] transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || isSending}
                aria-label="Send message"
                className="p-2.5 rounded-lg bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-[#A8A29E] dark:text-[#6E6760] mt-2 text-center tracking-wide">
              Answers come from our published listings. Pricing and allocation are confirmed by the desk.
            </p>
          </form>
        </div>
      )}
    </>
  );
};

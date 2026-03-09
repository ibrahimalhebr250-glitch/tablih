import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Headphones, ChevronDown, Loader2, Bot } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SupportMessage {
  id: string;
  user_phone: string;
  sender: 'user' | 'admin';
  message: string;
  image_url: string | null;
  is_read: boolean;
  created_at: string;
}

interface FloatingSupportChatProps {
  userPhone?: string;
  userName?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const GUEST_PHONE = 'guest-visitor';

async function fetchMessagesForPhone(phone: string): Promise<SupportMessage[]> {
  const { data } = await supabase.rpc('user_get_support_messages', { p_user_phone: phone });
  return (data as SupportMessage[]) ?? [];
}

async function markReadForPhone(phone: string) {
  await supabase.rpc('user_mark_support_messages_read', { p_user_phone: phone });
}

async function sendSupportMessage(phone: string, message: string, imageUrl?: string) {
  await supabase.rpc('user_send_support_message', {
    p_user_phone: phone,
    p_message: message,
    p_image_url: imageUrl ?? null,
  });
}

function triggerAIReply(phone: string, message: string) {
  fetch(`${SUPABASE_URL}/functions/v1/ai-support-reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ user_phone: phone, message }),
  }).catch(() => {});
}

export default function FloatingSupportChat({ userPhone, userName }: FloatingSupportChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isOpenRef = useRef(isOpen);
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

  const effectivePhone = userPhone || GUEST_PHONE;
  const effectiveName = userName || 'زائر';

  const refreshMessages = useCallback(async (phone: string) => {
    const msgs = await fetchMessagesForPhone(phone);
    setMessages(msgs);
  }, []);

  useEffect(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    refreshMessages(effectivePhone);

    const channel = supabase
      .channel(`support-chat-${effectivePhone}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `user_phone=eq.${effectivePhone}`,
        },
        async (payload) => {
          const newRow = payload.new as { user_phone?: string; sender?: string };
          if (newRow.user_phone !== effectivePhone) return;
          const fresh = await fetchMessagesForPhone(effectivePhone);
          setMessages(fresh);
          if (newRow.sender === 'admin' && !isOpenRef.current) {
            setUnreadCount((c) => c + 1);
            setHasNewMessage(true);
            setTimeout(() => setHasNewMessage(false), 3000);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [effectivePhone, refreshMessages]);

  useEffect(() => {
    if (isOpen) {
      markReadForPhone(effectivePhone);
      setUnreadCount(0);
    }
  }, [isOpen, effectivePhone]);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || sending) return;
    const msg = inputText.trim();
    setInputText('');
    setSending(true);
    await sendSupportMessage(effectivePhone, msg);
    triggerAIReply(effectivePhone, msg);
    setSending(false);
    textareaRef.current?.focus();
  }, [effectivePhone, inputText, sending]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      {hasNewMessage && !isOpen && (
        <div
          className="fixed bottom-24 left-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300"
          style={{ direction: 'rtl' }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 border border-slate-100 max-w-xs"
            style={{ boxShadow: '0 8px 32px rgba(26,74,94,0.18)' }}
          >
            <div className="w-8 h-8 rounded-full bg-[#1a4a5e] flex items-center justify-center flex-shrink-0">
              <Bot size={16} className="text-white" />
            </div>
            <div className="text-sm text-slate-700 font-medium">رد جديد من فريق الدعم</div>
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed bottom-24 left-4 z-50 w-80 sm:w-96 rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300"
          style={{
            boxShadow: '0 16px 48px rgba(26,74,94,0.25), 0 4px 16px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.8)',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: 'linear-gradient(135deg, #1a4a5e 0%, #0e2233 100%)' }}
          >
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <ChevronDown size={16} className="text-white" />
            </button>
            <div className="flex items-center gap-2" dir="rtl">
              <div className="text-right">
                <div className="text-white font-semibold text-sm">الدعم الفوري</div>
                <div className="flex items-center gap-1 justify-end">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-300 text-xs">متاح الآن</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Headphones size={18} className="text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white flex flex-col" style={{ height: '420px' }}>
            <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2" dir="rtl">
              {messages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <Bot size={22} className="text-slate-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-slate-600 text-sm font-medium">مرحباً {effectiveName}!</p>
                    <p className="text-slate-400 text-xs mt-1">كيف يمكننا مساعدتك؟</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {['ما هي المنصة؟', 'كيف أبيع؟', 'كيف أشتري؟'].map((q) => (
                      <button
                        key={q}
                        onClick={() => { setInputText(q); textareaRef.current?.focus(); }}
                        className="px-3 py-1.5 rounded-full border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 hover:border-[#1a4a5e]/30 transition-colors bg-white"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {msg.sender === 'admin' && (
                    <div
                      className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                      style={{ background: 'linear-gradient(135deg, #1a4a5e, #0e2233)' }}
                    >
                      <Bot size={13} className="text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'rounded-tr-sm text-white'
                        : 'rounded-tl-sm text-slate-800 bg-slate-100'
                    }`}
                    style={
                      msg.sender === 'user'
                        ? { background: 'linear-gradient(135deg, #1a4a5e, #0e2233)' }
                        : {}
                    }
                  >
                    {msg.image_url && (
                      <img src={msg.image_url} alt="" className="rounded-lg mb-1 max-w-full" />
                    )}
                    <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.sender === 'user' ? 'text-white/60' : 'text-slate-400'
                      }`}
                    >
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-slate-100 px-3 py-2.5" dir="rtl">
              <div className="flex items-end gap-2">
                <button
                  onClick={sendMessage}
                  disabled={!inputText.trim() || sending}
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #1a4a5e, #0e2233)' }}
                >
                  {sending ? (
                    <Loader2 size={15} className="text-white animate-spin" />
                  ) : (
                    <Send size={15} className="text-white" />
                  )}
                </button>
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="اكتب رسالتك..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#1a4a5e]/30 focus:border-[#1a4a5e] placeholder:text-slate-400"
                  style={{ maxHeight: '80px', minHeight: '36px' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen((o) => !o)}
        className="fixed bottom-6 left-4 z-50 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 active:scale-90 hover:scale-105"
        style={{
          background: isOpen
            ? 'linear-gradient(135deg, #374151 0%, #1f2937 100%)'
            : 'linear-gradient(135deg, #1a4a5e 0%, #0e2233 100%)',
          boxShadow: '0 8px 24px rgba(26,74,94,0.35), 0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        {isOpen ? (
          <X size={22} className="text-white" />
        ) : (
          <>
            <MessageCircle size={22} className="text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-md">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>
    </>
  );
}

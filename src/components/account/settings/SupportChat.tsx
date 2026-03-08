import { useState, useRef, useEffect } from 'react';
import {
  X,
  MessageCircle,
  Send,
  Image,
  Loader2,
  Headphones,
  ChevronRight,
} from 'lucide-react';
import type { SupportMessage } from '../../../hooks/useSettings';

interface Props {
  phone: string;
  displayName: string;
  messages: SupportMessage[];
  loading: boolean;
  sending: boolean;
  onSend: (message: string, imageUrl?: string) => Promise<{ success: boolean; error?: string }>;
  onUploadImage: (file: File) => Promise<string | null>;
  onClose: () => void;
}

export default function SupportChat({
  phone, displayName, messages, loading, sending,
  onSend, onUploadImage, onClose
}: Props) {
  const [text, setText] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setError(null);
    const result = await onSend(text);
    if (result.success) {
      setText('');
    } else {
      setError(result.error ?? 'حدث خطأ');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const url = await onUploadImage(file);
    setUploadingImage(false);
    if (url) {
      const result = await onSend('صورة مرفقة', url);
      if (!result.success) setError(result.error ?? 'حدث خطأ في رفع الصورة');
    } else {
      setError('تعذر رفع الصورة');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex flex-col" style={{ background: '#f4f9fc' }}>
      <div
        className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #0f2535, #1a3d56)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
          <ChevronRight className="w-4 h-4 text-white" />
        </button>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-[13px] font-bold text-white">الدردشة مع الإدارة</p>
            <p className="text-[10px] text-white/50">فريق دعم شبكة الطبليات الوطنية</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-[#0369A1]/30 flex items-center justify-center">
            <Headphones className="w-4 h-4 text-[#60B4E0]" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" dir="rtl">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-[#7a9aab]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-[#E0F2FE] flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-7 h-7 text-[#0369A1]" />
            </div>
            <p className="text-[13px] font-bold text-[#1a3a4a] mb-1">ابدأ محادثة</p>
            <p className="text-[11px] text-[#7a9aab] leading-relaxed max-w-[220px] mx-auto">
              فريقنا جاهز للمساعدة. أرسل رسالتك وسنرد في أقرب وقت.
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} myPhone={phone} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="mx-4 mb-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <p className="text-[11px] text-red-600 font-bold">{error}</p>
        </div>
      )}

      <div
        className="flex items-end gap-2 px-4 py-3 flex-shrink-0"
        style={{ background: 'white', borderTop: '1px solid #e2edf5' }}
        dir="rtl"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploadingImage || sending}
          className="w-10 h-10 rounded-xl bg-[#f0f6fa] flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform disabled:opacity-50"
        >
          {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin text-[#7a9aab]" /> : <Image className="w-4 h-4 text-[#7a9aab]" />}
        </button>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="اكتب رسالتك..."
          rows={1}
          className="flex-1 resize-none rounded-xl border-2 border-[#e2edf5] bg-[#f8fbfd] px-3 py-2.5 text-[13px] text-[#1a3a4a] text-right outline-none focus:border-[#0369A1] focus:bg-white transition-colors"
          style={{ maxHeight: 100, overflowY: 'auto' }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-95 transition-all disabled:opacity-40"
          style={{ background: text.trim() ? 'linear-gradient(135deg, #0369A1, #0284C7)' : '#e2edf5' }}
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Send className="w-4 h-4" style={{ color: text.trim() ? 'white' : '#9ab0bf' }} />
          )}
        </button>
      </div>
    </div>
  );
}

function MessageBubble({ msg, myPhone }: { msg: SupportMessage; myPhone: string }) {
  const isMe = msg.sender === 'user';
  const time = new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
      <div style={{ maxWidth: '78%' }}>
        {!isMe && (
          <p className="text-[9px] font-bold text-[#0369A1] mb-1 text-right">فريق الدعم</p>
        )}
        <div
          className="rounded-2xl px-3.5 py-2.5"
          style={{
            background: isMe ? 'white' : 'linear-gradient(135deg, #0369A1, #0284C7)',
            border: isMe ? '1px solid #e2edf5' : 'none',
            borderRadius: isMe ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
          }}
        >
          {msg.image_url && msg.message === 'صورة مرفقة' ? (
            <img
              src={msg.image_url}
              alt="مرفق"
              className="rounded-xl w-full max-w-[200px] object-cover"
              style={{ maxHeight: 180 }}
            />
          ) : (
            <>
              <p className="text-[12px] leading-relaxed" style={{ color: isMe ? '#1a3a4a' : 'white' }}>
                {msg.message}
              </p>
              {msg.image_url && (
                <img
                  src={msg.image_url}
                  alt="مرفق"
                  className="rounded-xl mt-2 w-full max-w-[200px] object-cover"
                  style={{ maxHeight: 180 }}
                />
              )}
            </>
          )}
        </div>
        <p className={`text-[9px] text-[#b0c4d0] mt-1 ${isMe ? 'text-right' : 'text-left'}`}>{time}</p>
      </div>
    </div>
  );
}

import { useState } from 'react';
import {
  Users, Filter, RefreshCw, MessageCircle, Star, Clock,
  CheckCircle, Send, ChevronDown, MapPin, ShoppingBag,
  Package, Handshake
} from 'lucide-react';
import type { ReengagementCandidate, WhatsAppTemplate } from '../../../hooks/useWhatsAppTemplates';
import { buildReengagementLink } from '../../../hooks/useWhatsAppTemplates';

interface Props {
  candidates: ReengagementCandidate[];
  loading: boolean;
  reengagementTemplate: WhatsAppTemplate | null;
  onFetch: (params: { inactive_days?: number; city?: string; user_type?: string; min_deals?: number }) => void;
  onMarkContacted: (phone: string) => Promise<void>;
}

const USER_TYPE_LABELS: Record<string, string> = {
  supplier: 'مورد',
  buyer: 'مشتري',
  admin: 'مدير',
};

function CandidateRow({
  candidate,
  template,
  onMarkContacted,
  isContacted,
}: {
  candidate: ReengagementCandidate;
  template: WhatsAppTemplate | null;
  onMarkContacted: (phone: string) => Promise<void>;
  isContacted: boolean;
}) {
  const [marking, setMarking] = useState(false);
  const name = candidate.company_name || candidate.display_name || candidate.phone;
  const templateText = template?.template_text ?? '';
  const link = templateText
    ? buildReengagementLink(candidate.phone, templateText)
    : `https://wa.me/${candidate.phone.replace(/^0/, '966').replace('+', '')}`;

  const days = Math.round(candidate.days_inactive);
  const urgency = days >= 30 ? 'high' : days >= 14 ? 'medium' : 'low';
  const urgencyColors = {
    high: { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' },
    medium: { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C' },
    low: { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D' },
  };
  const uc = urgencyColors[urgency];

  const handleMarkContacted = async () => {
    setMarking(true);
    await onMarkContacted(candidate.phone);
    setMarking(false);
  };

  return (
    <div
      className={`bg-white rounded-2xl border overflow-hidden transition-all ${isContacted ? 'opacity-60' : ''}`}
      style={{ borderColor: isContacted ? '#E5E7EB' : uc.border }}
      dir="rtl"
    >
      <div className="flex items-center gap-3 p-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-white text-sm"
          style={{ background: candidate.user_type === 'supplier' ? '#0369A1' : '#059669' }}
        >
          {name.charAt(0)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold text-[#0f2535] truncate">{name}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-[#6B7280]">
              {USER_TYPE_LABELS[candidate.user_type] ?? candidate.user_type}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[#7a9aab]">
            {candidate.city && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{candidate.city}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Handshake className="w-3 h-3" />
              <span>{candidate.total_deals} صفقة</span>
            </div>
            {candidate.trust_rating && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{candidate.trust_rating}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 text-left">
          <div
            className="text-[10px] font-bold px-2 py-1 rounded-lg text-center"
            style={{ background: uc.bg, color: uc.text, border: `1px solid ${uc.border}` }}
          >
            <Clock className="w-2.5 h-2.5 inline ml-0.5" />
            {days} يوم
          </div>
          {candidate.last_admin_contacted_at && (
            <p className="text-[9px] text-[#9ab0bf] mt-0.5 text-center">
              تم قبل {Math.round((Date.now() - new Date(candidate.last_admin_contacted_at).getTime()) / 86400000)} يوم
            </p>
          )}
        </div>
      </div>

      {!isContacted && (
        <div className="flex gap-2 px-4 pb-4">
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-bold text-white transition-transform active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
          >
            <Send className="w-3.5 h-3.5" />
            إرسال رسالة
          </a>
          <button
            onClick={handleMarkContacted}
            disabled={marking}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold border border-gray-200 text-[#7a9aab] hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {marking ? (
              <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
            ) : (
              <CheckCircle className="w-3.5 h-3.5" />
            )}
            تم التواصل
          </button>
        </div>
      )}

      {isContacted && (
        <div className="flex items-center gap-2 px-4 pb-4">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span className="text-xs text-emerald-600 font-bold">تم التواصل معه</span>
        </div>
      )}
    </div>
  );
}

export default function OutreachListPanel({ candidates, loading, reengagementTemplate, onFetch, onMarkContacted }: Props) {
  const [inactiveDays, setInactiveDays] = useState(14);
  const [userType, setUserType] = useState('');
  const [minDeals, setMinDeals] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [contactedPhones, setContactedPhones] = useState<Set<string>>(new Set());

  const handleMarkContacted = async (phone: string) => {
    await onMarkContacted(phone);
    setContactedPhones(prev => new Set([...prev, phone]));
  };

  const handleFetch = () => {
    onFetch({ inactive_days: inactiveDays, user_type: userType || undefined, min_deals: minDeals });
  };

  const pendingCount = candidates.filter(c => !contactedPhones.has(c.phone)).length;
  const contactedCount = contactedPhones.size;

  return (
    <div dir="rtl" className="space-y-5">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#0f2535] rounded-2xl p-4 text-center text-white">
          <p className="text-2xl font-black">{candidates.length}</p>
          <p className="text-xs text-white/60 mt-0.5">إجمالي المرشحين</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-amber-700">{pendingCount}</p>
          <p className="text-xs text-amber-600 mt-0.5">لم يُتواصل معهم</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-emerald-700">{contactedCount}</p>
          <p className="text-xs text-emerald-600 mt-0.5">تم التواصل</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#7a9aab]" />
            <span className="text-sm font-bold text-[#0f2535]">معايير الاستهداف</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-[#7a9aab] transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {showFilters && (
          <div className="border-t border-gray-100 p-5 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1a2f3e] mb-2">غير نشط منذ</label>
                <div className="flex gap-2">
                  {[7, 14, 30, 60].map(d => (
                    <button
                      key={d}
                      onClick={() => setInactiveDays(d)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        inactiveDays === d ? 'bg-[#0f2535] text-white' : 'bg-gray-100 text-[#7a9aab] hover:bg-gray-200'
                      }`}
                    >
                      {d < 30 ? `${d}ي` : `${d / 30}ش`}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1a2f3e] mb-2">نوع المستخدم</label>
                <div className="flex gap-2">
                  {[
                    { v: '', l: 'الكل' },
                    { v: 'supplier', l: 'موردين' },
                    { v: 'buyer', l: 'مشترين' },
                  ].map(({ v, l }) => (
                    <button
                      key={v}
                      onClick={() => setUserType(v)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        userType === v ? 'bg-[#0f2535] text-white' : 'bg-gray-100 text-[#7a9aab] hover:bg-gray-200'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1a2f3e] mb-2">حد أدنى للصفقات</label>
                <div className="flex gap-2">
                  {[1, 3, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setMinDeals(n)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        minDeals === n ? 'bg-[#0f2535] text-white' : 'bg-gray-100 text-[#7a9aab] hover:bg-gray-200'
                      }`}
                    >
                      +{n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={handleFetch}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0f2535] text-white font-bold text-sm hover:bg-[#1a3a4f] transition-colors"
            >
              <Users className="w-4 h-4" />
              تحديث القائمة
            </button>
          </div>
        )}
      </div>

      {/* Template info */}
      {reengagementTemplate ? (
        <div className="flex items-center gap-2.5 p-3 bg-[#25D366]/10 rounded-xl border border-[#25D366]/20">
          <MessageCircle className="w-4 h-4 text-[#25D366]" />
          <span className="text-xs text-[#1a9e5c] font-bold">سيُستخدم: {reengagementTemplate.name}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-100">
          <MessageCircle className="w-4 h-4 text-amber-500" />
          <span className="text-xs text-amber-700">لا يوجد قالب إعادة استهداف. سيُفتح واتساب بدون رسالة.</span>
        </div>
      )}

      {/* Candidate list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#25D366]/30 border-t-[#25D366] rounded-full animate-spin" />
        </div>
      ) : candidates.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-14 h-14 text-gray-200 mx-auto mb-3" />
          <p className="text-[#7a9aab] font-bold">لا يوجد مرشحون للاستهداف</p>
          <p className="text-xs text-[#9ab0bf] mt-1">جرب تغيير معايير الاستهداف</p>
          <button
            onClick={handleFetch}
            className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-[#0f2535] text-white text-sm font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            تحديث
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {candidates.map(candidate => (
            <CandidateRow
              key={candidate.user_id}
              candidate={candidate}
              template={reengagementTemplate}
              onMarkContacted={handleMarkContacted}
              isContacted={contactedPhones.has(candidate.phone)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

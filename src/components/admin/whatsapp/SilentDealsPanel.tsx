import { useState } from 'react';
import {
  BellOff, Clock, MessageCircle, Phone, Truck,
  Package, RefreshCw, ChevronDown, ChevronUp, Send,
  AlertTriangle, MapPin, Layers
} from 'lucide-react';
import type { SilentDeal, WhatsAppTemplate } from '../../../hooks/useWhatsAppTemplates';
import { buildAdminNudgeLink } from '../../../hooks/useWhatsAppTemplates';

const STAGE_LABELS: Record<string, string> = {
  inventory_reserved: 'محجوزة - بانتظار التأكيد',
  execution_in_progress: 'جاري التنفيذ',
  in_delivery: 'في التسليم',
};

const STAGE_COLORS: Record<string, { bg: string; border: string; text: string; icon: typeof Package }> = {
  inventory_reserved: { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', icon: Package },
  execution_in_progress: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', icon: Truck },
  in_delivery: { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', icon: Truck },
};

interface Props {
  deals: SilentDeal[];
  loading: boolean;
  nudgeTemplate: WhatsAppTemplate | null;
  onRefresh: (hours: number) => void;
}

function HoursLabel({ hours }: { hours: number }) {
  if (hours < 24) return <span className="text-orange-600 font-black">{Math.round(hours)} ساعة</span>;
  const days = Math.floor(hours / 24);
  return <span className="text-red-600 font-black">{days} {days === 1 ? 'يوم' : 'أيام'}</span>;
}

function SilentDealRow({
  deal,
  nudgeTemplate,
  onNudgeSent,
}: {
  deal: SilentDeal;
  nudgeTemplate: WhatsAppTemplate | null;
  onNudgeSent: (deal: SilentDeal, target: 'supplier' | 'buyer') => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const stage = STAGE_COLORS[deal.status] ?? STAGE_COLORS['inventory_reserved'];
  const StageIcon = stage.icon;
  const stageLabel = STAGE_LABELS[deal.status] ?? deal.status;

  const nudgeText = nudgeTemplate?.template_text ?? '';
  const supplierLink = nudgeText ? buildAdminNudgeLink(deal.supplier_phone, nudgeText, deal) : `https://wa.me/${deal.supplier_phone.replace(/^0/, '966').replace('+', '')}`;
  const buyerLink = nudgeText ? buildAdminNudgeLink(deal.buyer_phone, nudgeText, deal) : `https://wa.me/${deal.buyer_phone.replace(/^0/, '966').replace('+', '')}`;

  return (
    <div
      className="border rounded-2xl overflow-hidden transition-all"
      style={{ borderColor: stage.border }}
      dir="rtl"
    >
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:opacity-90 transition-opacity"
        style={{ background: stage.bg }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${stage.text}20` }}>
          <StageIcon className="w-4 h-4" style={{ color: stage.text }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-mono font-bold text-[#0f2535]" dir="ltr">{deal.deal_ref}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: stage.text, background: `${stage.text}15` }}>{stageLabel}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[#7a9aab]">
            <span>{deal.pallet_type} · {deal.size} · درجة {deal.quality}</span>
            <span>·</span>
            <span>{deal.city}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="text-[10px] text-[#9ab0bf]">بدون تواصل منذ</p>
            <HoursLabel hours={deal.hours_since_reserved} />
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-[#9ab0bf]" /> : <ChevronDown className="w-4 h-4 text-[#9ab0bf]" />}
        </div>
      </div>

      {expanded && (
        <div className="p-4 bg-white border-t" style={{ borderColor: stage.border }}>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-[#9ab0bf] mb-1">المورد</p>
              <p className="text-[12px] font-bold text-[#1a2f3e] truncate">{deal.supplier_name}</p>
              <p className="text-[11px] font-mono text-[#7a9aab]" dir="ltr">{deal.supplier_phone}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-[#9ab0bf] mb-1">المشتري</p>
              <p className="text-[12px] font-bold text-[#1a2f3e] truncate">{deal.buyer_name}</p>
              <p className="text-[11px] font-mono text-[#7a9aab]" dir="ltr">{deal.buyer_phone}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4 p-2.5 bg-gray-50 rounded-xl">
            <Layers className="w-3.5 h-3.5 text-[#7a9aab]" />
            <span className="text-[12px] font-bold text-[#1a2f3e]">{deal.quantity.toLocaleString('ar-SA')} طبلية</span>
            <MapPin className="w-3.5 h-3.5 text-[#7a9aab]" />
            <span className="text-[12px] text-[#7a9aab]">{deal.city}</span>
            <span className="flex-1 text-left text-[12px] font-bold text-[#0f2535]">{(deal.final_price * deal.quantity).toLocaleString('ar-SA')} ر.س</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={supplierLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onNudgeSent(deal, 'supplier')}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold text-white transition-transform active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
            >
              <Send className="w-3.5 h-3.5" />
              متابعة المورد
            </a>
            <a
              href={buyerLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onNudgeSent(deal, 'buyer')}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold text-white transition-transform active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg, #0369A1, #0284C7)' }}
            >
              <Phone className="w-3.5 h-3.5" />
              متابعة المشتري
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SilentDealsPanel({ deals, loading, nudgeTemplate, onRefresh }: Props) {
  const [hoursFilter, setHoursFilter] = useState(24);
  const [nudgedDeals, setNudgedDeals] = useState<Set<string>>(new Set());

  const handleNudgeSent = (deal: SilentDeal, _target: 'supplier' | 'buyer') => {
    setNudgedDeals(prev => new Set([...prev, deal.deal_id]));
  };

  const urgentCount = deals.filter(d => d.hours_since_reserved >= 48).length;
  const warningCount = deals.filter(d => d.hours_since_reserved >= 24 && d.hours_since_reserved < 48).length;

  return (
    <div dir="rtl" className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-50 border border-red-100">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-sm font-bold text-red-700">{urgentCount} صفقة عاجلة (+48 ساعة)</span>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-50 border border-orange-100">
          <Clock className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-bold text-orange-700">{warningCount} تحتاج متابعة (24-48 ساعة)</span>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20">
          <MessageCircle className="w-4 h-4 text-[#25D366]" />
          <span className="text-sm font-bold text-[#1a9e5c]">{nudgedDeals.size} تمت متابعتها</span>
        </div>
      </div>

      {/* Filter controls */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-[#7a9aab]">عرض صفقات لم يُتواصل بها منذ:</span>
        <div className="flex gap-2">
          {[12, 24, 48, 72].map(h => (
            <button
              key={h}
              onClick={() => { setHoursFilter(h); onRefresh(h); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                hoursFilter === h
                  ? 'bg-[#0f2535] text-white'
                  : 'bg-gray-100 text-[#7a9aab] hover:bg-gray-200'
              }`}
            >
              {h < 24 ? `${h} ساعة` : `${h / 24} ${h === 24 ? 'يوم' : 'أيام'}`}
            </button>
          ))}
        </div>
        <button
          onClick={() => onRefresh(hoursFilter)}
          className="mr-auto p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-[#7a9aab] ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Template missing warning */}
      {!nudgeTemplate && (
        <div className="flex items-center gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-100">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700 font-medium">لم يتم العثور على قالب المتابعة. سيُفتح واتساب بدون رسالة محددة. أضف القالب من تبويب القوالب.</p>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center py-12">
          <BellOff className="w-14 h-14 text-gray-200 mx-auto mb-3" />
          <p className="text-[#7a9aab] font-bold">لا توجد صفقات صامتة</p>
          <p className="text-xs text-[#9ab0bf] mt-1">جميع الصفقات النشطة تم التواصل بشأنها</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deals.map(deal => (
            <SilentDealRow
              key={deal.deal_id}
              deal={deal}
              nudgeTemplate={nudgeTemplate}
              onNudgeSent={handleNudgeSent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

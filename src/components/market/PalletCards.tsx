import { MapPin, Package, Star, Layers, Tag, ArrowLeftCircle } from 'lucide-react';
import { ImageGallery } from './ImageGallery';

export interface SupplyCardData {
  id: string;
  kind: 'supply';
  phone: string;
  pallet_type: string;
  size: string;
  quality: string;
  pallet_condition: string;
  available_quantity: number;
  price_per_pallet: number;
  city: string;
  description: string;
  image_urls: string[];
  created_at: string;
  trust_rating?: number;
}

export interface DemandCardData {
  id: string;
  kind: 'demand';
  phone: string;
  pallet_type: string;
  size: string;
  quality: string;
  quantity: number;
  city: string;
  accept_close_quality: boolean;
  accept_close_city: boolean;
  accept_partial_delivery: boolean;
  created_at: string;
  trust_rating?: number;
}

export type MarketCardData = SupplyCardData | DemandCardData;

const QUALITY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  A: { label: 'درجة A', color: '#15803d', bg: '#dcfce7' },
  B: { label: 'درجة B', color: '#1d4ed8', bg: '#dbeafe' },
  C: { label: 'درجة C', color: '#b45309', bg: '#fef3c7' },
  Scrap: { label: 'خردة', color: '#b91c1c', bg: '#fee2e2' },
};

function StarRating({ value }: { value?: number }) {
  if (!value) return null;
  const rounded = Math.round(value * 10) / 10;
  return (
    <div className="flex items-center gap-0.5">
      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
      <span className="text-[10px] font-bold text-amber-600">{rounded}</span>
    </div>
  );
}

function TimeAgo({ dateStr }: { dateStr: string }) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return <span className="text-[9px] text-gray-400">{days}ي</span>;
  if (hours > 0) return <span className="text-[9px] text-gray-400">{hours}س</span>;
  return <span className="text-[9px] text-gray-400">{mins}د</span>;
}

interface PalletSaleCardProps {
  card: SupplyCardData;
  onClick: (card: SupplyCardData) => void;
}

export function PalletSaleCard({ card, onClick }: PalletSaleCardProps) {
  const quality = QUALITY_MAP[card.quality] || { label: card.quality, color: '#374151', bg: '#f3f4f6' };

  return (
    <div
      onClick={() => onClick(card)}
      className="rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200 active:scale-[0.98]"
      style={{
        background: 'white',
        border: '1.5px solid rgba(0,0,0,0.07)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      <div className="relative">
        <ImageGallery
          images={card.image_urls}
          aspectRatio="16/11"
          showCounter={true}
          className="rounded-t-2xl"
        />
        <div
          className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full"
          style={{ background: '#dcfce7', border: '1px solid #86efac' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
          <span className="text-[9px] font-black text-green-700">عرض بيع</span>
        </div>
        <div className="absolute top-2 left-2">
          <TimeAgo dateStr={card.created_at} />
        </div>
      </div>

      <div className="p-2.5">
        <div className="flex items-start justify-between gap-1 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] font-black text-gray-800 truncate leading-tight">
              {card.pallet_type}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-2.5 h-2.5 text-gray-400 shrink-0" />
              <span className="text-[10px] text-gray-500 truncate">{card.city}</span>
            </div>
          </div>
          <StarRating value={card.trust_rating} />
        </div>

        <div className="flex flex-wrap gap-1 mb-2">
          <span
            className="px-1.5 py-0.5 rounded-lg text-[9px] font-bold"
            style={{ background: quality.bg, color: quality.color }}
          >
            {quality.label}
          </span>
          <span
            className="px-1.5 py-0.5 rounded-lg text-[9px] font-bold"
            style={{ background: '#f1f5f9', color: '#475569' }}
          >
            {card.size}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
          <div className="flex items-center gap-1">
            <Layers className="w-3 h-3 text-gray-400" />
            <span className="text-[10px] text-gray-500">{card.available_quantity} طبلية</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Tag className="w-3 h-3 text-emerald-600" />
            <span className="text-[13px] font-black text-emerald-700">
              {card.price_per_pallet > 0 ? `${card.price_per_pallet.toLocaleString()} ر.س` : 'تفاوض'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PalletDemandCardProps {
  card: DemandCardData;
  onClick: (card: DemandCardData) => void;
}

export function PalletDemandCard({ card, onClick }: PalletDemandCardProps) {
  const quality = QUALITY_MAP[card.quality] || { label: card.quality, color: '#374151', bg: '#f3f4f6' };

  const flexTags = [
    card.accept_close_quality && 'جودة قريبة',
    card.accept_close_city && 'مدينة قريبة',
    card.accept_partial_delivery && 'توريد جزئي',
  ].filter(Boolean) as string[];

  return (
    <div
      onClick={() => onClick(card)}
      className="rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200 active:scale-[0.98]"
      style={{
        background: 'white',
        border: '1.5px solid rgba(0,0,0,0.07)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ aspectRatio: '16/11', background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)' }}
      >
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(234,88,12,0.12)' }}
          >
            <Package className="w-7 h-7 text-orange-500" />
          </div>
          <div className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-orange-600" />
            <span className="text-[18px] font-black text-orange-700">{card.quantity}</span>
            <span className="text-[11px] text-orange-500 font-bold">طبلية</span>
          </div>
        </div>

        <div
          className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full"
          style={{ background: '#ffedd5', border: '1px solid #fdba74' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
          <span className="text-[9px] font-black text-orange-700">طلب شراء</span>
        </div>
        <div className="absolute top-2 left-2">
          <TimeAgo dateStr={card.created_at} />
        </div>
      </div>

      <div className="p-2.5">
        <div className="flex items-start justify-between gap-1 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] font-black text-gray-800 truncate leading-tight">
              {card.pallet_type}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-2.5 h-2.5 text-gray-400 shrink-0" />
              <span className="text-[10px] text-gray-500 truncate">{card.city}</span>
            </div>
          </div>
          <StarRating value={card.trust_rating} />
        </div>

        <div className="flex flex-wrap gap-1 mb-2">
          <span
            className="px-1.5 py-0.5 rounded-lg text-[9px] font-bold"
            style={{ background: quality.bg, color: quality.color }}
          >
            {quality.label}
          </span>
          <span
            className="px-1.5 py-0.5 rounded-lg text-[9px] font-bold"
            style={{ background: '#f1f5f9', color: '#475569' }}
          >
            {card.size}
          </span>
        </div>

        {flexTags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
            {flexTags.map(tag => (
              <span
                key={tag}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[8px] font-bold"
                style={{ background: '#f0fdf4', color: '#15803d' }}
              >
                <ArrowLeftCircle className="w-2 h-2" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

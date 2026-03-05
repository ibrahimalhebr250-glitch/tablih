export type PalletType = 'خشبية' | 'بلاستيكية' | 'إعادة تدوير';
export type PalletSize = '120×100' | '110×110' | '120×80' | '80×60' | 'أخرى';
export type PalletQuality = 'A' | 'B' | 'C' | 'Scrap';

export const PALLET_QUALITY_LABELS: Record<PalletQuality, { ar: string; desc: string }> = {
  A: { ar: 'ممتازة', desc: 'طبليات جديدة أو كالجديدة' },
  B: { ar: 'جيدة', desc: 'استخدام متوسط بحالة جيدة' },
  C: { ar: 'استخدام خفيف', desc: 'مناسبة للنقل الداخلي' },
  Scrap: { ar: 'إعادة تدوير', desc: 'للكسر أو إعادة التصنيع' },
};

export const SAUDI_CITIES = [
  'الرياض',
  'جدة',
  'مكة المكرمة',
  'المدينة المنورة',
  'الدمام',
  'الخبر',
  'الأحساء',
  'تبوك',
  'بريدة',
  'خميس مشيط',
  'الطائف',
  'ينبع',
  'الجبيل',
  'حائل',
  'نجران',
  'ابها',
  'القصيم',
  'القطيف',
  'الخرج',
  'المجمعة',
];

export const QUICK_QUANTITIES = [500, 1000, 2000, 5000];

export interface OrderFormData {
  palletType: PalletType | null;
  size: PalletSize | null;
  quality: PalletQuality | null;
  quantity: number;
  city: string;
  acceptCloseQuality: boolean;
  acceptCloseCity: boolean;
  acceptPartialDelivery: boolean;
}

export interface MatchResult {
  found: boolean;
  matchedQuantity?: number;
  deliveryDays?: number;
  pricePerUnit?: number;
  totalPrice?: number;
  conditions?: string[];
  requestId?: string;
  dealId?: string;
  dealRef?: string;
  reservationExpiresAt?: string;
}

export interface SavedOrder {
  id: string;
  request_id: string;
  status: 'pending' | 'matched' | 'unmatched' | 'executed';
  pallet_type: string;
  size: string;
  quality: string;
  quantity: number;
  city: string;
  matched_quantity?: number;
  matched_price?: number;
  delivery_days?: number;
  created_at: string;
}

export type BuilderStep = 'form' | 'auth' | 'matching' | 'result';

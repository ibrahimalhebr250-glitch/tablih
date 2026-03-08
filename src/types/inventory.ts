export type PalletType = 'خشبية' | 'بلاستيكية';
export type PalletSize = '120×100' | '110×110' | '120×80' | '80×60' | 'أخرى';
export type PalletQuality = 'A' | 'B' | 'C' | 'Scrap';
export type PalletCondition = 'new' | 'used' | 'repairable';
export type BatchStatus = 'draft' | 'active' | 'reserved' | 'sold' | 'paused';
export type InventoryWizardStep = 1 | 2 | 3 | 4;
export type InventoryStep = 'form' | 'registering' | 'depositing' | 'result';
export type AccordionSection = 'type' | 'size' | 'quality' | 'quantity' | 'price' | 'city' | 'description' | null;

export const CONDITION_LABELS: Record<PalletCondition, { ar: string; desc: string }> = {
  new: { ar: 'جديدة', desc: 'لم تُستخدم من قبل' },
  used: { ar: 'مستعملة', desc: 'استخدام سابق بحالة جيدة' },
  repairable: { ar: 'قابلة للإصلاح', desc: 'تحتاج صيانة بسيطة' },
};

export const QUALITY_LABELS: Record<PalletQuality, { ar: string; en: string; desc: string }> = {
  A: { ar: 'ممتازة', en: 'Grade A', desc: 'جديدة أو كالجديدة' },
  B: { ar: 'جيدة', en: 'Grade B', desc: 'استخدام متوسط، حالة ممتازة' },
  C: { ar: 'استخدام خفيف', en: 'Grade C', desc: 'مناسبة للنقل الداخلي' },
  Scrap: { ar: 'إعادة تدوير', en: 'Scrap', desc: 'للكسر أو إعادة التصنيع' },
};

export const PALLET_TYPES: { value: PalletType; desc: string }[] = [
  { value: 'خشبية', desc: 'الأكثر طلباً' },
  { value: 'بلاستيكية', desc: 'متينة وطويلة العمر' },
];

export const PALLET_SIZES: PalletSize[] = ['120×100', '110×110', '120×80', '80×60', 'أخرى'];

export const QUICK_QUANTITIES = [500, 1000, 2000, 5000];

export const SAUDI_CITIES = [
  'الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 'الأحساء',
  'تبوك', 'بريدة', 'خميس مشيط', 'الطائف', 'ينبع', 'الجبيل', 'حائل', 'نجران',
  'ابها', 'القصيم', 'القطيف', 'الخرج', 'المجمعة',
];

export interface InventoryFormData {
  palletType: PalletType | null;
  size: PalletSize | null;
  quality: PalletQuality | null;
  condition: PalletCondition;
  quantity: number;
  pricePerPallet: number;
  city: string;
  description: string;
  activateImmediately: boolean;
  publishToMarket?: boolean;
}

export interface ActiveDemand {
  id: string;
  city: string;
  pallet_type: string;
  size: string;
  quality: string;
  quantity_needed: number;
}

export interface ImpactPreview {
  totalAfterDeposit: number;
  matchingDemandCount: number;
  coveragePercent: number;
  matchableQty: number;
  hasMatch: boolean;
}

export interface DepositResult {
  batchId: string;
  batchRef: string;
  matchFound: boolean;
  matchableQty?: number;
  matchedOrderId?: string;
}

export interface InventoryListing {
  id: string;
  batch_id: string;
  pallet_type: string;
  size: string;
  quality: string;
  pallet_condition: string;
  quantity: number;
  available_quantity: number;
  price_per_pallet: number;
  city: string;
  status: BatchStatus;
  description: string;
  created_at: string;
  primary_image_url?: string;
  image_urls: string[];
}

export type PalletType = string;
export type PalletSize = string;
export type PalletQuality = string;


export interface OrderFormData {
  palletType: PalletType | null;
  size: PalletSize | null;
  quality: PalletQuality | null;
  quantity: number;
  city: string;
  condition?: string;
  acceptCloseQuality: boolean;
  acceptCloseCity: boolean;
  acceptPartialDelivery: boolean;
}

export interface MatchResult {
  found: boolean;
  matchedQuantity?: number;
  supplierCity?: string;
  supplierPhone?: string;
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

export type BuilderStep = 'form' | 'auth';

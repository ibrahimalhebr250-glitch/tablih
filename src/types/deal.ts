export type DealStatus =
  | 'pending_supplier'
  | 'matched'
  | 'supplier_confirmed'
  | 'awaiting_buyer'
  | 'inventory_reserved'
  | 'in_delivery'
  | 'completed'
  | 'cancelled';

export interface Deal {
  id: string;
  deal_ref: string;
  request_id: string;
  order_id: string | null;
  inventory_batch_id: string | null;
  buyer_phone: string;
  supplier_phone: string;
  pallet_type: string;
  size: string;
  quality: string;
  city: string;
  quantity: number;
  final_price: number;
  supplier_price: number | null;
  platform_fee: number | null;
  platform_fee_per_pallet: number | null;
  buyer_price: number | null;
  status: DealStatus;
  supplier_confirmed_at: string | null;
  buyer_confirmed_at: string | null;
  reserved_at: string | null;
  delivery_started_at: string | null;
  delivery_failed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  is_suspended: boolean;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export const DEAL_STATUS_CONFIG: Record<DealStatus, { label: string; color: string; bg: string }> = {
  pending_supplier:   { label: 'بانتظار المورد',   color: '#B45309', bg: '#FFFBEB' },
  matched:            { label: 'تم المطابقة',      color: '#B8860B', bg: '#FFFBEB' },
  supplier_confirmed: { label: 'تأكيد المورد',     color: '#92400E', bg: '#FFF7ED' },
  awaiting_buyer:     { label: 'بانتظار المشتري',  color: '#1E40AF', bg: '#EFF6FF' },
  inventory_reserved: { label: 'تأكيد المشتري',    color: '#1E40AF', bg: '#EFF6FF' },
  in_delivery:        { label: 'جاري التسليم',     color: '#0369A1', bg: '#E0F2FE' },
  completed:          { label: 'مكتملة',           color: '#4B5563', bg: '#F9FAFB' },
  cancelled:          { label: 'ملغاة',            color: '#991B1B', bg: '#FEF2F2' },
};

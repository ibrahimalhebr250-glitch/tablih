export type DealStatus =
  | 'pending_confirmation'
  | 'pending_supplier'
  | 'matched'
  | 'supplier_confirmed'
  | 'awaiting_buyer'
  | 'inventory_reserved'
  | 'in_delivery'
  | 'execution_in_progress'
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
  execution_deadline: string | null;
  execution_hours: number | null;
  created_at: string;
  updated_at: string;
}

export const DEAL_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending_confirmation:   { label: 'بانتظار اعتماد المورد', color: '#B45309', bg: '#FFFBEB' },
  pending_supplier:       { label: 'بانتظار اعتماد المورد', color: '#B45309', bg: '#FFFBEB' },
  matched:                { label: 'بانتظار اعتماد المورد', color: '#B45309', bg: '#FFFBEB' },
  supplier_confirmed:     { label: 'تم اعتماد المورد',      color: '#059669', bg: '#ECFDF5' },
  awaiting_buyer:         { label: 'بانتظار تأكيد المشتري', color: '#1E40AF', bg: '#EFF6FF' },
  inventory_reserved:     { label: 'محجوزة',               color: '#059669', bg: '#ECFDF5' },
  in_delivery:            { label: 'جاري التنفيذ',          color: '#0369A1', bg: '#E0F2FE' },
  execution_in_progress:  { label: 'جاري التنفيذ',          color: '#0369A1', bg: '#E0F2FE' },
  completed:              { label: 'مكتملة',               color: '#059669', bg: '#ECFDF5' },
  cancelled:              { label: 'ملغاة',                color: '#dc2626', bg: '#FEF2F2' },
};

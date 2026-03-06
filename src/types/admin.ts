export type AdminSection = 'dashboard' | 'inventory' | 'market' | 'orders' | 'deals' | 'finance' | 'users' | 'ratings' | 'comments' | 'settings';

export type MarketTab = 'cities' | 'inventory' | 'requests';
export type InventoryTab = 'published' | 'drafts' | 'settings' | 'types' | 'sizes' | 'quality' | 'conditions' | 'operations';
export type FinanceTab = 'dashboard' | 'commissions' | 'supplier_profile' | 'market_stats';
export type CommissionTab = 'due' | 'overdue' | 'settled';
export type SettingsTab = 'general';
export type UsersTab = 'users' | 'analytics' | 'staff' | 'roles';

export type TrustRating = 1 | 2 | 3 | 4 | 5;

export type ActivityLevel = 'active' | 'moderate' | 'inactive';

export type StaffRole = 'super_admin' | 'financial_admin' | 'operations_manager' | 'support_agent';

export interface StaffMember {
  id: string;
  phone: string;
  display_name: string;
  email: string;
  role: string;
  is_active: boolean;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_settle: boolean;
  can_modify_financials: boolean;
  can_manage_cities: boolean;
  can_manage_users: boolean;
  can_view_analytics: boolean;
  can_manage_staff: boolean;
  created_at: string;
}

export interface UserAnalyticsData {
  totalUsers: number;
  activeSuppliers: number;
  newUsersThisMonth: number;
  inactiveUsers: number;
  topSuppliers: { phone: string; display_name: string; city: string; pallets: number }[];
  cityDistribution: { city: string; count: number; percentage: number }[];
  monthlyGrowth: { month: string; count: number }[];
}

export type SettlementMethod = 'bank_transfer' | 'cash' | 'manual';

export interface FinanceMetrics {
  total_pallets: number;
  total_commission: number;
  settled_commission: number;
  outstanding_commission: number;
}

export interface SupplierCommission {
  supplier_phone: string;
  display_name: string;
  city: string;
  total_pallets: number;
  commission_amount: number;
  last_deal_date: string;
  days_overdue: number;
  deal_ids: string[];
}

export interface SettledCommission {
  id: string;
  supplier_phone: string;
  display_name: string;
  city: string;
  pallet_count: number;
  commission_amount: number;
  settlement_method: SettlementMethod;
  settled_by: string;
  settled_at: string;
}

export interface SupplierFinanceProfile {
  phone: string;
  display_name: string;
  city: string;
  total_pallets: number;
  total_sales: number;
  total_commission: number;
  deals: SupplierDealRow[];
}

export interface SupplierDealRow {
  id: string;
  deal_ref: string;
  city: string;
  quantity: number;
  commission: number;
  date: string;
  status: 'pending' | 'settled';
}

export interface CityPalletStat {
  city: string;
  pallets: number;
  salesVolume: number;
  percentage: number;
}

export interface TopSupplier {
  phone: string;
  display_name: string;
  city: string;
  pallets: number;
  salesVolume: number;
  commission: number;
}

export interface SizeDistribution {
  size: string;
  count: number;
  salesVolume: number;
  percentage: number;
}

export interface MarketSummary {
  totalPallets: number;
  totalSalesVolume: number;
  totalDeals: number;
  activeCities: number;
  activeSuppliers: number;
  avgDealSize: number;
}

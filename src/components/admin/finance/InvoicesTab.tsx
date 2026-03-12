import React, { useState, useEffect } from 'react';
import { FileText, Download, CheckCircle, Clock, XCircle, Search, Eye, Receipt, Building2, Tag } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useInvoiceSystem } from '../../../hooks/useInvoiceSystem';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  type?: 'pallets' | 'commission';
}

interface Invoice {
  id: string;
  invoice_number: string;
  deal_id: string;
  invoice_type: 'buyer_invoice' | 'supplier_invoice' | 'supplier_commission';
  buyer_phone: string;
  supplier_phone: string;
  subtotal: number;
  platform_fee: number;
  tax_amount: number;
  total_amount: number;
  status: 'draft' | 'pending' | 'paid' | 'cancelled' | 'sent' | 'overdue';
  due_date: string;
  payment_date: string | null;
  invoice_items: InvoiceItem[];
  notes: string | null;
  created_at: string;
  recipient_name?: string;
  recipient_phone?: string;
  amount?: number;
}

export default function InvoicesTab() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const { markAsPaid } = useInvoiceSystem();

  useEffect(() => {
    loadInvoices();

    const channel = supabase
      .channel('invoices_tab_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'invoices'
      }, () => {
        loadInvoices();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [filter]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
    setLoading(false);
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    const result = await markAsPaid(invoiceId);
    if (result.success) {
      await loadInvoices();
      setSelectedInvoice(null);
    }
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'cancelled' })
        .eq('id', invoiceId);

      if (error) throw error;
      await loadInvoices();
      setSelectedInvoice(null);
    } catch (error) {
      console.error('Error cancelling invoice:', error);
    }
  };

  const exportInvoices = () => {
    const csvContent = [
      ['رقم الفاتورة', 'النوع', 'المبلغ', 'العمولة', 'الحالة', 'تاريخ الاستحقاق'],
      ...filteredInvoices.map(inv => [
        inv.invoice_number,
        getInvoiceTypeLabel(inv.invoice_type),
        (inv.total_amount ?? inv.amount ?? 0).toString(),
        (inv.platform_fee ?? 0).toString(),
        getStatusLabel(inv.status),
        new Date(inv.due_date).toLocaleDateString('ar-SA')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `invoices_${new Date().toISOString()}.csv`;
    link.click();
  };

  const getInvoiceTypeLabel = (type: string) => {
    if (type === 'buyer_invoice') return 'فاتورة مشتري';
    if (type === 'supplier_invoice') return 'فاتورة مورد';
    return 'عمولة مورد';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      paid: 'مدفوعة',
      pending: 'معلقة',
      draft: 'مسودة',
      sent: 'مرسلة',
      overdue: 'متأخرة',
      cancelled: 'ملغاة'
    };
    return map[status] || status;
  };

  const getInvoiceAmount = (inv: Invoice) => inv.total_amount ?? inv.amount ?? 0;

  const filteredInvoices = invoices.filter(inv => {
    const search = searchTerm.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(search) ||
      (inv.recipient_name || '').toLowerCase().includes(search) ||
      (inv.buyer_phone || '').includes(searchTerm) ||
      (inv.supplier_phone || '').includes(searchTerm) ||
      (inv.recipient_phone || '').includes(searchTerm)
    );
  });

  const stats = {
    total: invoices.length,
    pending: invoices.filter(i => i.status === 'pending' || i.status === 'draft').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    cancelled: invoices.filter(i => i.status === 'cancelled').length,
    totalAmount: invoices.reduce((sum, i) => sum + getInvoiceAmount(i), 0),
    pendingAmount: invoices.filter(i => i.status === 'pending' || i.status === 'draft').reduce((sum, i) => sum + getInvoiceAmount(i), 0),
    paidAmount: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + getInvoiceAmount(i), 0),
    totalCommission: invoices.reduce((sum, i) => sum + (i.platform_fee ?? 0), 0)
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { icon: React.ReactNode; text: string; cls: string }> = {
      paid: { icon: <CheckCircle className="w-4 h-4" />, text: 'مدفوعة', cls: 'text-green-600 bg-green-50' },
      pending: { icon: <Clock className="w-4 h-4" />, text: 'معلقة', cls: 'text-orange-600 bg-orange-50' },
      draft: { icon: <Clock className="w-4 h-4" />, text: 'مسودة', cls: 'text-gray-600 bg-gray-50' },
      sent: { icon: <Clock className="w-4 h-4" />, text: 'مرسلة', cls: 'text-blue-600 bg-blue-50' },
      overdue: { icon: <XCircle className="w-4 h-4" />, text: 'متأخرة', cls: 'text-red-600 bg-red-50' },
      cancelled: { icon: <XCircle className="w-4 h-4" />, text: 'ملغاة', cls: 'text-red-600 bg-red-50' }
    };
    const cfg = configs[status] || configs.draft;
    return (
      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>
        {cfg.icon}
        {cfg.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <FileText className="w-7 h-7 text-blue-600" />
            <span className="px-2 py-0.5 bg-blue-200 text-blue-700 text-xs font-bold rounded-full">الكل</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs text-gray-600 mt-1">إجمالي الفواتير</div>
          <div className="text-xs text-gray-500 mt-1">{stats.totalAmount.toLocaleString()} ريال</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border border-orange-200">
          <div className="flex items-center justify-between mb-3">
            <Clock className="w-7 h-7 text-orange-600" />
            <span className="px-2 py-0.5 bg-orange-200 text-orange-700 text-xs font-bold rounded-full">معلقة</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
          <div className="text-xs text-gray-600 mt-1">فواتير معلقة</div>
          <div className="text-xs text-gray-500 mt-1">{stats.pendingAmount.toLocaleString()} ريال</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle className="w-7 h-7 text-green-600" />
            <span className="px-2 py-0.5 bg-green-200 text-green-700 text-xs font-bold rounded-full">مدفوعة</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.paid}</div>
          <div className="text-xs text-gray-600 mt-1">فواتير مدفوعة</div>
          <div className="text-xs text-gray-500 mt-1">{stats.paidAmount.toLocaleString()} ريال</div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-5 border border-amber-200">
          <div className="flex items-center justify-between mb-3">
            <Tag className="w-7 h-7 text-amber-600" />
            <span className="px-2 py-0.5 bg-amber-200 text-amber-700 text-xs font-bold rounded-full">عمولات</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalCommission.toLocaleString()}</div>
          <div className="text-xs text-gray-600 mt-1">إجمالي عمولات المنصة</div>
          <div className="text-xs text-gray-500 mt-1">ريال سعودي</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث برقم الفاتورة أو رقم الهاتف..."
                className="w-full pr-9 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">جميع الفواتير</option>
              <option value="pending">معلقة</option>
              <option value="paid">مدفوعة</option>
              <option value="cancelled">ملغاة</option>
            </select>
          </div>
          <button
            onClick={exportInvoices}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            تصدير
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">رقم الفاتورة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">النوع</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">الأطراف</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">المبلغ</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">عمولة المنصة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">الحالة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900 text-sm">{invoice.invoice_number}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(invoice.created_at).toLocaleDateString('ar-SA')}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      invoice.invoice_type === 'buyer_invoice'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-teal-100 text-teal-700'
                    }`}>
                      {getInvoiceTypeLabel(invoice.invoice_type)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-xs text-gray-500">مشتري: {invoice.buyer_phone || invoice.recipient_phone || '-'}</div>
                    <div className="text-xs text-gray-500 mt-0.5">مورد: {invoice.supplier_phone || '-'}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-bold text-gray-900 text-sm">
                      {getInvoiceAmount(invoice).toLocaleString()} ريال
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-semibold text-amber-700 text-sm">
                        {(invoice.platform_fee ?? 0).toLocaleString()} ريال
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {getStatusBadge(invoice.status)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedInvoice(invoice)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="عرض التفاصيل"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {(invoice.status === 'pending' || invoice.status === 'draft') && (
                        <>
                          <button
                            onClick={() => handleMarkAsPaid(invoice.id)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="تحديد كمدفوعة"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCancelInvoice(invoice.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="إلغاء"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredInvoices.length === 0 && (
            <div className="text-center py-16">
              <FileText className="w-14 h-14 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">لا توجد فواتير</p>
            </div>
          )}
        </div>
      </div>

      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">تفاصيل الفاتورة</h3>
                  <p className="text-xs text-gray-500">{selectedInvoice.invoice_number}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{selectedInvoice.invoice_number}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(selectedInvoice.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                  <div className="text-left">
                    {getStatusBadge(selectedInvoice.status)}
                    <div className="mt-2">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        selectedInvoice.invoice_type === 'buyer_invoice'
                          ? 'bg-blue-200 text-blue-700'
                          : 'bg-teal-200 text-teal-700'
                      }`}>
                        {getInvoiceTypeLabel(selectedInvoice.invoice_type)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs">تاريخ الاستحقاق</div>
                    <div className="font-medium text-gray-800">
                      {new Date(selectedInvoice.due_date).toLocaleDateString('ar-SA')}
                    </div>
                  </div>
                  {selectedInvoice.payment_date && (
                    <div>
                      <div className="text-gray-500 text-xs">تاريخ الدفع</div>
                      <div className="font-medium text-green-700">
                        {new Date(selectedInvoice.payment_date).toLocaleDateString('ar-SA')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-semibold text-gray-500 uppercase">المشتري</span>
                  </div>
                  <div className="font-medium text-gray-800 text-sm">{selectedInvoice.buyer_phone || selectedInvoice.recipient_phone || '-'}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-teal-500" />
                    <span className="text-xs font-semibold text-gray-500 uppercase">المورد</span>
                  </div>
                  <div className="font-medium text-gray-800 text-sm">{selectedInvoice.supplier_phone || '-'}</div>
                </div>
              </div>

              {selectedInvoice.invoice_items && selectedInvoice.invoice_items.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-3">بنود الفاتورة</div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">البيان</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500">الكمية</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500">سعر الوحدة</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedInvoice.invoice_items.map((item, idx) => (
                          <tr
                            key={idx}
                            className={item.type === 'commission' ? 'bg-amber-50' : 'bg-white'}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {item.type === 'commission' && (
                                  <Tag className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                )}
                                <span className={`text-xs ${item.type === 'commission' ? 'text-amber-800 font-medium' : 'text-gray-700'}`}>
                                  {item.description}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-gray-600">{item.quantity}</td>
                            <td className="px-4 py-3 text-center text-xs text-gray-600">
                              {(item.unit_price ?? 0).toLocaleString()} ريال
                            </td>
                            <td className="px-4 py-3 text-left">
                              <span className={`text-xs font-semibold ${item.type === 'commission' ? 'text-amber-700' : 'text-gray-900'}`}>
                                {(item.total ?? 0).toLocaleString()} ريال
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">المبلغ الفرعي</span>
                  <span className="font-medium text-gray-800">{(selectedInvoice.subtotal ?? 0).toLocaleString()} ريال</span>
                </div>
                {(selectedInvoice.platform_fee ?? 0) > 0 && (
                  <div className="flex justify-between items-center text-sm bg-amber-50 -mx-4 px-4 py-2 border-y border-amber-100">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-amber-500" />
                      <span className="font-semibold text-amber-800">عمولة المنصة</span>
                    </div>
                    <span className="font-bold text-amber-700">{(selectedInvoice.platform_fee ?? 0).toLocaleString()} ريال</span>
                  </div>
                )}
                {(selectedInvoice.tax_amount ?? 0) > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">الضريبة</span>
                    <span className="font-medium text-gray-800">{(selectedInvoice.tax_amount ?? 0).toLocaleString()} ريال</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="font-bold text-gray-900">الإجمالي</span>
                  <span className="text-xl font-bold text-gray-900">{getInvoiceAmount(selectedInvoice).toLocaleString()} ريال</span>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="text-xs font-semibold text-blue-700 mb-1">ملاحظات</div>
                  <div className="text-sm text-blue-800">{selectedInvoice.notes}</div>
                </div>
              )}

              {(selectedInvoice.status === 'pending' || selectedInvoice.status === 'draft') && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleMarkAsPaid(selectedInvoice.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-semibold text-sm transition-colors"
                  >
                    <CheckCircle className="w-5 h-5" />
                    تحديد كمدفوعة
                  </button>
                  <button
                    onClick={() => handleCancelInvoice(selectedInvoice.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 font-semibold text-sm border border-red-200 transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                    إلغاء الفاتورة
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

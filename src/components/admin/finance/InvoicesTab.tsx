import React, { useState, useEffect } from 'react';
import { FileText, Download, CheckCircle, Clock, XCircle, Search, Filter, Eye, Send } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useInvoiceSystem } from '../../../hooks/useInvoiceSystem';

interface Invoice {
  id: string;
  invoice_number: string;
  deal_id: string;
  invoice_type: 'buyer_invoice' | 'supplier_commission';
  recipient_phone: string;
  recipient_name: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  due_date: string;
  paid_at: string | null;
  created_at: string;
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
      .channel('invoices_changes')
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
      ['رقم الفاتورة', 'النوع', 'المستلم', 'المبلغ', 'الحالة', 'تاريخ الاستحقاق'],
      ...filteredInvoices.map(inv => [
        inv.invoice_number,
        inv.invoice_type === 'buyer_invoice' ? 'فاتورة مشتري' : 'عمولة مورد',
        inv.recipient_name,
        inv.amount.toString(),
        inv.status === 'paid' ? 'مدفوعة' : inv.status === 'pending' ? 'معلقة' : 'ملغاة',
        new Date(inv.due_date).toLocaleDateString('ar-SA')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `invoices_${new Date().toISOString()}.csv`;
    link.click();
  };

  const filteredInvoices = invoices.filter(inv =>
    inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.recipient_phone.includes(searchTerm)
  );

  const stats = {
    total: invoices.length,
    pending: invoices.filter(i => i.status === 'pending').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    cancelled: invoices.filter(i => i.status === 'cancelled').length,
    totalAmount: invoices.reduce((sum, i) => sum + i.amount, 0),
    pendingAmount: invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0),
    paidAmount: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
            <span className="px-3 py-1 bg-blue-200 text-blue-700 text-xs font-bold rounded-full">
              الكل
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">{stats.total}</div>
          <div className="text-sm text-gray-600">إجمالي الفواتير</div>
          <div className="text-xs text-gray-500 mt-2">
            {stats.totalAmount.toLocaleString()} ريال
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <Clock className="w-8 h-8 text-orange-600" />
            <span className="px-3 py-1 bg-orange-200 text-orange-700 text-xs font-bold rounded-full">
              معلقة
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">{stats.pending}</div>
          <div className="text-sm text-gray-600">فواتير معلقة</div>
          <div className="text-xs text-gray-500 mt-2">
            {stats.pendingAmount.toLocaleString()} ريال
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <span className="px-3 py-1 bg-green-200 text-green-700 text-xs font-bold rounded-full">
              مدفوعة
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">{stats.paid}</div>
          <div className="text-sm text-gray-600">فواتير مدفوعة</div>
          <div className="text-xs text-gray-500 mt-2">
            {stats.paidAmount.toLocaleString()} ريال
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
          <div className="flex items-center justify-between mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
            <span className="px-3 py-1 bg-red-200 text-red-700 text-xs font-bold rounded-full">
              ملغاة
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">{stats.cancelled}</div>
          <div className="text-sm text-gray-600">فواتير ملغاة</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث برقم الفاتورة أو المستلم..."
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">جميع الفواتير</option>
              <option value="pending">معلقة</option>
              <option value="paid">مدفوعة</option>
              <option value="cancelled">ملغاة</option>
            </select>
          </div>

          <button
            onClick={exportInvoices}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-5 h-5" />
            تصدير
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">رقم الفاتورة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المستلم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ الاستحقاق</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{invoice.invoice_number}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(invoice.created_at).toLocaleDateString('ar-SA')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      invoice.invoice_type === 'buyer_invoice'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {invoice.invoice_type === 'buyer_invoice' ? 'فاتورة مشتري' : 'عمولة مورد'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{invoice.recipient_name}</div>
                    <div className="text-sm text-gray-500">{invoice.recipient_phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">
                      {invoice.amount.toLocaleString()} ريال
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {invoice.status === 'paid' ? (
                      <span className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-medium">مدفوعة</span>
                      </span>
                    ) : invoice.status === 'pending' ? (
                      <span className="flex items-center gap-2 text-orange-600">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">معلقة</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-red-600">
                        <XCircle className="w-4 h-4" />
                        <span className="font-medium">ملغاة</span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {new Date(invoice.due_date).toLocaleDateString('ar-SA')}
                    </div>
                    {invoice.paid_at && (
                      <div className="text-xs text-green-600">
                        دفعت: {new Date(invoice.paid_at).toLocaleDateString('ar-SA')}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedInvoice(invoice)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="عرض التفاصيل"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {invoice.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleMarkAsPaid(invoice.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="تحديد كمدفوعة"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleCancelInvoice(invoice.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="إلغاء"
                          >
                            <XCircle className="w-5 h-5" />
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
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد فواتير</p>
            </div>
          )}
        </div>
      </div>

      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">تفاصيل الفاتورة</h3>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-gray-900">
                    {selectedInvoice.invoice_number}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">رقم الفاتورة</div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">التاريخ</div>
                    <div className="font-medium">
                      {new Date(selectedInvoice.created_at).toLocaleDateString('ar-SA')}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">الاستحقاق</div>
                    <div className="font-medium">
                      {new Date(selectedInvoice.due_date).toLocaleDateString('ar-SA')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">نوع الفاتورة</div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    selectedInvoice.invoice_type === 'buyer_invoice'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {selectedInvoice.invoice_type === 'buyer_invoice' ? 'فاتورة مشتري' : 'عمولة مورد'}
                  </span>
                </div>

                <div>
                  <div className="text-sm text-gray-600 mb-1">المستلم</div>
                  <div className="font-medium text-gray-900">{selectedInvoice.recipient_name}</div>
                  <div className="text-sm text-gray-500">{selectedInvoice.recipient_phone}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-600 mb-1">المبلغ</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {selectedInvoice.amount.toLocaleString()} ريال
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600 mb-1">الحالة</div>
                  {selectedInvoice.status === 'paid' ? (
                    <span className="flex items-center gap-2 text-green-600 font-medium">
                      <CheckCircle className="w-5 h-5" />
                      مدفوعة
                    </span>
                  ) : selectedInvoice.status === 'pending' ? (
                    <span className="flex items-center gap-2 text-orange-600 font-medium">
                      <Clock className="w-5 h-5" />
                      معلقة
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-red-600 font-medium">
                      <XCircle className="w-5 h-5" />
                      ملغاة
                    </span>
                  )}
                </div>
              </div>

              {selectedInvoice.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleMarkAsPaid(selectedInvoice.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    <CheckCircle className="w-5 h-5" />
                    تحديد كمدفوعة
                  </button>
                  <button
                    onClick={() => handleCancelInvoice(selectedInvoice.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
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

import { useState } from 'react';
import { Package, Search, Filter, Eye, Edit2, Pause, Play, Trash2, CheckCircle, XCircle, MapPin, Phone, Calendar } from 'lucide-react';
import { useAdminInventory } from '../../../hooks/useAdminInventory';
import { useInventorySettings } from '../../../hooks/useInventorySettings';

interface Props {
  adminEmail: string;
}

export default function PublishedInventoryTab({ adminEmail }: Props) {
  const { batches, loading, pauseBatch, activateBatch, deleteBatch, updateBatch } = useAdminInventory(adminEmail);
  const { palletTypes, palletSizes, qualityGrades } = useInventorySettings();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionType, setActionType] = useState<'pause' | 'activate' | 'delete' | 'edit'>('pause');
  const [actionReason, setActionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const filteredBatches = batches.filter(batch => {
    const matchesSearch =
      batch.batch_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.phone.includes(searchTerm) ||
      batch.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || batch.status === filterStatus;

    return matchesSearch && matchesStatus && batch.status !== 'draft';
  });

  const handleAction = async () => {
    if (!selectedBatch) return;

    try {
      setProcessing(true);

      switch (actionType) {
        case 'pause':
          if (!actionReason.trim()) {
            alert('يرجى إدخال سبب الإيقاف');
            return;
          }
          await pauseBatch(selectedBatch.id, actionReason);
          break;
        case 'activate':
          await activateBatch(selectedBatch.id, actionReason);
          break;
        case 'delete':
          if (!actionReason.trim()) {
            alert('يرجى إدخال سبب الحذف');
            return;
          }
          await deleteBatch(selectedBatch.id, actionReason);
          break;
      }

      setShowActionDialog(false);
      setSelectedBatch(null);
      setActionReason('');
    } catch (error) {
      console.error('Error performing action:', error);
      alert('حدث خطأ أثناء تنفيذ العملية');
    } finally {
      setProcessing(false);
    }
  };

  const openActionDialog = (batch: any, type: 'pause' | 'activate' | 'delete' | 'edit') => {
    setSelectedBatch(batch);
    setActionType(type);
    setShowActionDialog(true);
    setActionReason('');
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'نشط' },
      paused: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'موقوف' },
      fulfilled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'مكتمل' },
      partial: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'جزئي' },
    };

    const badge = badges[status] || badges.active;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث برقم المخزون، رقم الهاتف، أو المدينة..."
              className="w-full pr-10 pl-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="paused">موقوف</option>
              <option value="fulfilled">مكتمل</option>
              <option value="partial">جزئي</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">إجمالي المخزونات</p>
              <p className="text-2xl font-bold text-slate-900">{filteredBatches.length}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">النشطة</p>
              <p className="text-2xl font-bold text-green-600">
                {filteredBatches.filter(b => b.status === 'active').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">الموقوفة</p>
              <p className="text-2xl font-bold text-yellow-600">
                {filteredBatches.filter(b => b.status === 'paused').length}
              </p>
            </div>
            <Pause className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">إجمالي الكمية</p>
              <p className="text-2xl font-bold text-blue-600">
                {filteredBatches.reduce((sum, b) => sum + b.quantity, 0)}
              </p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">رقم المخزون</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">المورد</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">النوع والمقاس</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">الجودة</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">الكمية</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">السعر</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">المدينة</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">الحالة</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    لا توجد مخزونات
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-900">{batch.batch_id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-700" dir="ltr">{batch.phone}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div className="font-medium text-slate-900">{batch.pallet_type}</div>
                        <div className="text-slate-500">{batch.size}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-900">{batch.quality}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div className="font-medium text-slate-900">{batch.quantity} طبلية</div>
                        <div className="text-slate-500 text-xs">متاح: {batch.available_quantity}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-900">
                        {batch.price_per_pallet > 0 ? `${batch.price_per_pallet} ر.س` : 'قابل للتفاوض'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="text-sm text-slate-700">{batch.city}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(batch.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {batch.status === 'active' ? (
                          <button
                            onClick={() => openActionDialog(batch, 'pause')}
                            className="p-1.5 rounded hover:bg-yellow-50 text-yellow-600"
                            title="إيقاف"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => openActionDialog(batch, 'activate')}
                            className="p-1.5 rounded hover:bg-green-50 text-green-600"
                            title="تفعيل"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openActionDialog(batch, 'delete')}
                          className="p-1.5 rounded hover:bg-red-50 text-red-600"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Dialog */}
      {showActionDialog && selectedBatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {actionType === 'pause' && 'إيقاف المخزون'}
              {actionType === 'activate' && 'تفعيل المخزون'}
              {actionType === 'delete' && 'حذف المخزون'}
            </h3>

            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">رقم المخزون: {selectedBatch.batch_id}</p>
              <p className="text-sm text-slate-600">النوع: {selectedBatch.pallet_type} - {selectedBatch.size}</p>
              <p className="text-sm text-slate-600">الكمية: {selectedBatch.quantity} طبلية</p>
            </div>

            {(actionType === 'pause' || actionType === 'delete') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {actionType === 'pause' ? 'سبب الإيقاف' : 'سبب الحذف'} *
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="اكتب السبب هنا..."
                />
              </div>
            )}

            {actionType === 'activate' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ملاحظات (اختياري)
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="ملاحظات إضافية..."
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleAction}
                disabled={processing}
                className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors ${
                  actionType === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : actionType === 'pause'
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-green-600 hover:bg-green-700'
                } disabled:opacity-50`}
              >
                {processing ? 'جاري التنفيذ...' : 'تأكيد'}
              </button>
              <button
                onClick={() => {
                  setShowActionDialog(false);
                  setSelectedBatch(null);
                  setActionReason('');
                }}
                disabled={processing}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

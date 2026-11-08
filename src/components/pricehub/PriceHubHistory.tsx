import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Calendar,
  Building2,
  User,
  Package,
  Edit3,
  ShieldCheck,
  FileText,
  Paperclip,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingDown,
  X,
  Download,
  AlertCircle,
} from 'lucide-react';
import {
  SupplierQuotation,
  Supplier,
  PriceProduct,
  QuotationAuditLog,
  QuotationItem,
} from '../../types';
import {
  getQuotationAuditLogs,
  updateSupplierQuotationWithAudit,
  formatVNDCurrency,
  formatDateTimeVI,
  calculateQuotationItemNetPrice,
} from '../../services/priceHubService';

interface PriceHubHistoryProps {
  quotations: SupplierQuotation[];
  suppliers: Supplier[];
  products: PriceProduct[];
  onRefresh: () => void;
  onNavigateToComparison: (productId: string) => void;
}

export const PriceHubHistory: React.FC<PriceHubHistoryProps> = ({
  quotations,
  suppliers,
  products,
  onRefresh,
  onNavigateToComparison,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Selected quotation detail modal
  const [selectedQuotation, setSelectedQuotation] = useState<SupplierQuotation | null>(null);

  // Edit quote modal with Audit Log
  const [editingQuotation, setEditingQuotation] = useState<SupplierQuotation | null>(null);
  const [editReason, setEditReason] = useState('');
  const [modifiedItems, setModifiedItems] = useState<QuotationItem[]>([]);
  const [modifiedNotes, setModifiedNotes] = useState('');
  const [editorName, setEditorName] = useState('Sale KDT');

  // Audit Log viewer
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [currentAuditLogs, setCurrentAuditLogs] = useState<QuotationAuditLog[]>([]);

  // Unique staff list
  const staffList = useMemo(() => {
    const set = new Set<string>();
    quotations.forEach((q) => {
      if (q.createdBy) set.add(q.createdBy.trim());
    });
    return Array.from(set).sort();
  }, [quotations]);

  // Filtered quotations (sorted latest first)
  const filteredQuotations = useMemo(() => {
    return quotations
      .filter((q) => {
        const matchSupplier = selectedSupplierId === 'all' || q.supplierId === selectedSupplierId;
        const matchStaff = selectedStaff === 'all' || q.createdBy === selectedStaff;
        const matchDate = !dateFilter || q.quoteDate.startsWith(dateFilter);

        const qTerm = searchTerm.toLowerCase().trim();
        const matchSearch =
          !qTerm ||
          q.supplierName.toLowerCase().includes(qTerm) ||
          (q.supplierCode && q.supplierCode.toLowerCase().includes(qTerm)) ||
          q.items.some(
            (it) =>
              it.productName.toLowerCase().includes(qTerm) ||
              (it.productModel && it.productModel.toLowerCase().includes(qTerm))
          ) ||
          (q.notes && q.notes.toLowerCase().includes(qTerm));

        return matchSupplier && matchStaff && matchDate && matchSearch;
      })
      .sort((a, b) => new Date(b.quoteDate).getTime() - new Date(a.quoteDate).getTime());
  }, [quotations, selectedSupplierId, selectedStaff, dateFilter, searchTerm]);

  // Open Edit with audit modal
  const handleOpenEdit = (quote: SupplierQuotation) => {
    setEditingQuotation(quote);
    setModifiedItems(JSON.parse(JSON.stringify(quote.items)));
    setModifiedNotes(quote.notes || '');
    setEditReason('Nhà cung cấp đính chính lại giá chiết khấu');
    setEditorName('Sale KDT');
  };

  const handleItemPriceChange = (index: number, field: string, value: any) => {
    setModifiedItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: value };

      if (field === 'quotedPrice' || field === 'discountPercent' || field === 'discountAmount' || field === 'giftValue') {
        item.netPrice = calculateQuotationItemNetPrice({
          quotedPrice: item.quotedPrice,
          discountPercent: item.discountPercent,
          discountAmount: item.discountAmount,
          giftValue: item.giftValue,
          minQuantity: item.minQuantity,
        });
      }

      copy[index] = item;
      return copy;
    });
  };

  const handleSaveQuotationEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuotation) return;
    if (!editReason.trim()) {
      alert('Bắt buộc phải nhập Lý do chỉnh sửa để ghi vào Audit Log!');
      return;
    }

    const updated = updateSupplierQuotationWithAudit(
      editingQuotation.id,
      {
        items: modifiedItems,
        notes: modifiedNotes.trim() || undefined,
      },
      editorName || 'Sale KDT',
      editReason.trim()
    );

    if (updated) {
      alert('Đã cập nhật báo giá và ghi nhận vết thay đổi trong Audit Log!');
      setEditingQuotation(null);
      onRefresh();
    }
  };

  const handleViewAuditLogs = (quotationId: string) => {
    const logs = getQuotationAuditLogs(quotationId);
    setCurrentAuditLogs(logs);
    setIsAuditModalOpen(true);
  };

  const handleExportHistoryCSV = () => {
    let csv = `Mã đợt,Ngày báo giá,Nhà cung cấp,Mã NPP,Người hỏi,Tên sản phẩm,Model,Giá báo NPP,Chiết khấu %,Giá Net,Tình trạng,Ghi chú\n`;

    filteredQuotations.forEach((q) => {
      q.items.forEach((it) => {
        csv += `"${q.id}","${formatDateTimeVI(q.quoteDate)}","${q.supplierName}","${
          q.supplierCode || ''
        }","${q.createdBy}","${it.productName}","${it.productModel || ''}",${it.quotedPrice},${
          it.discountPercent || 0
        },${it.netPrice},"${it.stockStatus}","${it.notes || ''}"\n`;
      });
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Lich_su_bao_gia_KDT_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-bold mb-2">
            <History className="w-3.5 h-3.5" />
            MODULE E: LỊCH SỬ BÁO GIÁ & AUDIT TRAIL BẤT BIẾN
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Lịch Sử Báo Giá Từng Lần Khảo Sát
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-2xl">
            Mỗi lần hỏi giá là một bản ghi độc lập, không ghi đè giá cũ. Mọi thao tác chỉnh sửa đều được ghi lại trong Audit Log với người sửa, thời gian và giá trị trước/sau.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportHistoryCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4 text-slate-600" />
          Xuất file CSV lịch sử
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo sản phẩm, Model, nhà cung cấp, ghi chú..."
              className="w-full pl-9 pr-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700"
            >
              <option value="all">Tất cả nhà cung cấp ({suppliers.length})</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700"
            >
              <option value="all">Tất cả nhân viên hỏi giá</option>
              {staffList.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700"
            />

            {(selectedSupplierId !== 'all' || selectedStaff !== 'all' || dateFilter || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSupplierId('all');
                  setSelectedStaff('all');
                  setDateFilter('');
                  setSearchTerm('');
                }}
                className="text-xs font-bold text-purple-600 hover:text-purple-800 px-2 py-1"
              >
                Đặt lại
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quotations List */}
      <div className="space-y-4">
        {filteredQuotations.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400 text-sm">
            Không tìm thấy lần báo giá nào thỏa mãn điều kiện tìm kiếm.
          </div>
        ) : (
          filteredQuotations.map((q) => (
            <div
              key={q.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-purple-300 transition-all space-y-3"
            >
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    #{q.id.slice(0, 8)}
                  </span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>{q.supplierName}</span>
                    {q.supplierCode && (
                      <span className="text-xs font-normal text-slate-400">({q.supplierCode})</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatDateTimeVI(q.quoteDate)}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {q.createdBy}
                  </span>

                  {/* Audit Button */}
                  <button
                    type="button"
                    onClick={() => handleViewAuditLogs(q.id)}
                    className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                    title="Xem lịch sử thay đổi (Audit Log)"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    Audit Log
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(q)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                    title="Sửa báo giá có lưu vết"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                    Sửa
                  </button>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="text-slate-400 text-[10px] uppercase font-bold border-b border-slate-100">
                      <th className="py-2 px-2">Sản phẩm</th>
                      <th className="py-2 px-2">Model</th>
                      <th className="py-2 px-2 text-right">Giá báo NPP</th>
                      <th className="py-2 px-2 text-center">Chiết khấu</th>
                      <th className="py-2 px-2 text-right font-bold text-emerald-700">Giá Net</th>
                      <th className="py-2 px-2 text-center">Tình trạng</th>
                      <th className="py-2 px-2">Ghi chú</th>
                      <th className="py-2 px-2 text-right">So sánh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {q.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-purple-50/20">
                        <td className="py-2 px-2 font-bold text-slate-800">{it.productName}</td>
                        <td className="py-2 px-2 font-mono text-[11px] text-purple-700">
                          {it.productModel || '-'}
                        </td>
                        <td className="py-2 px-2 text-right font-medium text-slate-500">
                          {formatVNDCurrency(it.quotedPrice)}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-indigo-700">
                          {it.discountPercent || 0}%{' '}
                          {it.discountAmount ? `+ ${formatVNDCurrency(it.discountAmount)}` : ''}
                        </td>
                        <td className="py-2 px-2 text-right font-black text-emerald-600 text-sm">
                          {formatVNDCurrency(it.netPrice)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              it.stockStatus === 'in_stock'
                                ? 'bg-emerald-50 text-emerald-700'
                                : it.stockStatus === 'pre_order'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {it.stockStatus === 'in_stock'
                              ? 'Có sẵn'
                              : it.stockStatus === 'pre_order'
                              ? `Đặt hàng (${it.leadTimeDays || 3}d)`
                              : 'Hết hàng'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-slate-500 text-[11px] max-w-[150px] truncate" title={it.notes}>
                          {it.notes || '-'}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <button
                            type="button"
                            onClick={() => onNavigateToComparison(it.productId)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="So sánh giá sản phẩm này giữa các NPP"
                          >
                            <TrendingDown className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom conditions & attachments */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-4 flex-wrap">
                  {q.paymentTerms && <span>Thanh toán: <strong className="text-slate-700">{q.paymentTerms}</strong></span>}
                  {q.deliveryTerms && <span>Giao hàng: <strong className="text-slate-700">{q.deliveryTerms}</strong></span>}
                  {q.validUntil && (
                    <span>Hạn báo giá: <strong className="text-slate-700">{formatDateTimeVI(q.validUntil)}</strong></span>
                  )}
                </div>

                {q.attachments && q.attachments.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Paperclip className="w-3 h-3 text-purple-600" />
                    <span className="font-semibold text-purple-700">
                      {q.attachments.length} file đính kèm
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Quotation Modal (Immutable Audit Log Guarded) */}
      {editingQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
            <div className="bg-purple-700 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Edit3 className="w-5 h-5" />
                  Chỉnh Sửa Báo Giá (Bắt Buộc Ghi Audit Log)
                </h3>
                <span className="text-xs text-purple-200">
                  NPP: {editingQuotation.supplierName} - #{editingQuotation.id.slice(0, 8)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingQuotation(null)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuotationEdit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Mandatory Reason Box */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-amber-900">
                  Lý do chỉnh sửa báo giá <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="VD: NPP đính chính lại chiết khấu từ 10% lên 15%..."
                  className="w-full text-xs px-3 py-2 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-medium"
                />
                <span className="text-[10px] text-amber-700 block">
                  * Hệ thống không cho phép sửa âm thầm. Giá cũ và giá mới sẽ được lưu lại vĩnh viễn trong Audit Log.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nhân viên thực hiện sửa
                </label>
                <input
                  type="text"
                  required
                  value={editorName}
                  onChange={(e) => setEditorName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              {/* Items editing table */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Danh sách sản phẩm và giá:
                </label>
                <div className="space-y-3">
                  {modifiedItems.map((it, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="font-bold text-slate-800">{it.productName}</div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block">Giá NPP báo:</label>
                          <input
                            type="number"
                            step="1000"
                            value={it.quotedPrice}
                            onChange={(e) =>
                              handleItemPriceChange(idx, 'quotedPrice', Number(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block">Chiết khấu (%):</label>
                          <input
                            type="number"
                            step="0.5"
                            value={it.discountPercent || 0}
                            onChange={(e) =>
                              handleItemPriceChange(idx, 'discountPercent', Number(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-bold text-indigo-700"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block">Giá Net tính lại:</label>
                          <div className="py-1 font-black text-emerald-600 text-sm">
                            {formatVNDCurrency(it.netPrice)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú bổ sung</label>
                <input
                  type="text"
                  value={modifiedNotes}
                  onChange={(e) => setModifiedNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="bg-slate-50 p-4 -mx-6 -mb-6 mt-6 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingQuotation(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Lưu & Ghi Nhật Ký Audit Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Nhật Ký Thay Đổi Bất Biến (Audit Trail)
              </h3>
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-3">
              {currentAuditLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Bản ghi này chưa từng bị chỉnh sửa (giữ nguyên gốc từ khi tạo).
                </div>
              ) : (
                currentAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        {log.changedBy}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatDateTimeVI(log.changedAt)}
                      </span>
                    </div>

                    <div className="p-2 bg-amber-50 text-amber-900 rounded-lg border border-amber-200/60 text-[11px]">
                      <strong>Lý do:</strong> {log.reason}
                    </div>

                    <div className="text-[11px] text-slate-600 space-y-1">
                      <div>
                        Trường thay đổi: <strong className="text-slate-800">{log.fieldChanged}</strong>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="bg-rose-50 p-1.5 rounded border border-rose-200 text-rose-800">
                          <strong>Trước:</strong> {log.oldValue}
                        </div>
                        <div className="bg-emerald-50 p-1.5 rounded border border-emerald-200 text-emerald-800">
                          <strong>Sau:</strong> {log.newValue}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

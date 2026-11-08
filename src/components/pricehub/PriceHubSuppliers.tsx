import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Globe,
  CreditCard,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Tag,
  Clock,
  TrendingDown,
  Package,
  History,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { Supplier, PriceProduct, SupplierQuotation } from '../../types';
import {
  saveSupplier,
  deleteSupplier,
  formatVNDCurrency,
  formatDateTimeVI,
  getSupplierStats,
} from '../../services/priceHubService';

interface PriceHubSuppliersProps {
  suppliers: Supplier[];
  products: PriceProduct[];
  quotations: SupplierQuotation[];
  onRefresh: () => void;
  onNavigateToNewQuoteWithSupplier: (supplierId: string) => void;
}

export const PriceHubSuppliers: React.FC<PriceHubSuppliersProps> = ({
  suppliers,
  products,
  quotations,
  onRefresh,
  onNavigateToNewQuoteWithSupplier,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Supplier Detail Drawer / Modal
  const [selectedSupplierDetail, setSelectedSupplierDetail] = useState<Supplier | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    categories: '',
    paymentTerms: '',
    notes: '',
    isActive: true,
  });

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = searchTerm.toLowerCase().trim();
      const matchQ =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.categories && s.categories.some((c) => c.toLowerCase().includes(q)));

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && s.isActive) ||
        (statusFilter === 'inactive' && !s.isActive);

      return matchQ && matchStatus;
    });
  }, [suppliers, searchTerm, statusFilter]);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({
      code: `NPP-${String(suppliers.length + 1).padStart(3, '0')}`,
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      website: '',
      categories: '',
      paymentTerms: 'Chuyển khoản khi giao hàng',
      notes: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setFormData({
      code: s.code,
      name: s.name,
      contactPerson: s.contactPerson || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      website: s.website || '',
      categories: (s.categories || []).join(', '),
      paymentTerms: s.paymentTerms || '',
      notes: s.notes || '',
      isActive: s.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const catArray = formData.categories
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    saveSupplier({
      id: editingSupplier ? editingSupplier.id : undefined,
      code: formData.code.trim(),
      name: formData.name.trim(),
      contactPerson: formData.contactPerson.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      email: formData.email.trim() || undefined,
      address: formData.address.trim() || undefined,
      website: formData.website.trim() || undefined,
      categories: catArray,
      paymentTerms: formData.paymentTerms.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      isActive: formData.isActive,
    });

    setIsModalOpen(false);
    onRefresh();
  };

  const handleToggleActive = (s: Supplier) => {
    const nextState = !s.isActive;
    const actionName = nextState ? 'kích hoạt lại' : 'ngừng hợp tác';
    if (
      window.confirm(
        `Xác nhận ${actionName} với nhà cung cấp "${s.name}"? Toàn bộ lịch sử báo giá vẫn được lưu trữ an toàn.`
      )
    ) {
      saveSupplier({ ...s, isActive: nextState });
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold mb-2">
            <Building2 className="w-3.5 h-3.5" />
            MODULE C: HỆ THỐNG ĐỐI TÁC & NHÀ PHÂN PHỐI
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Danh Sách Nhà Cung Cấp
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-2xl">
            Lưu giữ hồ sơ đối tác, điều khoản chiết khấu, lịch sử chào giá và thông tin liên hệ của các nhà phân phối chính thức.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Thêm nhà cung cấp mới
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên NPP, mã, SĐT, liên hệ..."
            className="w-full pl-9 pr-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 w-full sm:w-auto"
          >
            <option value="all">Tất cả trạng thái ({suppliers.length})</option>
            <option value="active">Đang hợp tác</option>
            <option value="inactive">Đã ngừng hợp tác</option>
          </select>
        </div>
      </div>

      {/* Supplier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSuppliers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            Không tìm thấy nhà cung cấp nào khớp với điều kiện tìm kiếm.
          </div>
        ) : (
          filteredSuppliers.map((s) => {
            const stats = getSupplierStats(s.id, quotations, products);

            return (
              <div
                key={s.id}
                className={`bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between ${
                  s.isActive
                    ? 'border-slate-200 hover:border-emerald-400 hover:shadow-lg'
                    : 'border-slate-200 bg-slate-50/70 opacity-80'
                }`}
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {s.code}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            s.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {s.isActive ? 'Đang hợp tác' : 'Tạm dừng'}
                        </span>
                      </div>
                      <h4
                        onClick={() => setSelectedSupplierDetail(s)}
                        className="text-base font-bold text-slate-900 hover:text-emerald-600 cursor-pointer transition-colors"
                      >
                        {s.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(s)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(s)}
                        className={`p-1.5 rounded-lg ${
                          s.isActive
                            ? 'text-rose-400 hover:text-rose-600 hover:bg-rose-50'
                            : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
                        }`}
                        title={s.isActive ? 'Tạm ngừng hợp tác' : 'Kích hoạt lại'}
                      >
                        {s.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Categories Tags */}
                  {s.categories && s.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {s.categories.map((c, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Contact Info */}
                  <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {s.contactPerson && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-medium">Người liên hệ:</span>
                        <strong className="text-slate-800">{s.contactPerson}</strong>
                      </div>
                    )}
                    {s.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <a href={`tel:${s.phone}`} className="font-bold text-slate-800 hover:text-emerald-600">
                          {s.phone}
                        </a>
                      </div>
                    )}
                    {s.paymentTerms && (
                      <div className="flex items-center gap-2 text-[11px]">
                        <CreditCard className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate text-slate-500" title={s.paymentTerms}>
                          {s.paymentTerms}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Stats Counter */}
                  <div className="grid grid-cols-2 gap-2 text-center text-xs mb-4">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">Sản phẩm đã báo</span>
                      <strong className="text-slate-800 text-sm">{stats.productsCount}</strong>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">Số lần báo giá</span>
                      <strong className="text-slate-800 text-sm">{stats.quotesCount}</strong>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSupplierDetail(s)}
                    className="flex-1 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                  >
                    Xem lịch sử giá
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateToNewQuoteWithSupplier(s.id)}
                    className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    + Nhập báo giá
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-emerald-600 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {editingSupplier ? 'Chỉnh Sửa Nhà Cung Cấp' : 'Thêm Nhà Cung Cấp Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mã NPP</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên nhà cung cấp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Công ty TNHH Thiết bị Công nghiệp Việt"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Người liên hệ</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="VD: Anh Nam (Kinh doanh)"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="VD: 0988 123 456"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="baogia@npp.com"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Website</label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nhóm hàng cung cấp (cách nhau dấu phẩy)
                </label>
                <input
                  type="text"
                  value={formData.categories}
                  onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
                  placeholder="Vòng bi, Động cơ, Thiết bị điện, Dây curoa..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Điều kiện thanh toán
                </label>
                <input
                  type="text"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  placeholder="VD: Công nợ 30 ngày, Thanh toán 50% khi đặt hàng..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Địa chỉ kho / văn phòng</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Quận Bình Tân, TP.HCM..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú thêm</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Chính sách chiết khấu thêm khi mua số lượng lớn..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Đang hợp tác (Kích hoạt)
                </label>
              </div>

              <div className="bg-slate-50 p-4 -mx-6 -mb-6 mt-6 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  {editingSupplier ? 'Lưu thay đổi' : 'Thêm nhà cung cấp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Detail & Quote History Modal */}
      {selectedSupplierDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200">
            <div className="bg-emerald-700 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Hồ Sơ & Lịch Sử Báo Giá: {selectedSupplierDetail.name}
                </h3>
                <span className="text-xs text-emerald-200 font-mono">
                  Mã NPP: {selectedSupplierDetail.code}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSupplierDetail(null)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
              {/* Info summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Người liên hệ:</span>
                  <strong className="text-slate-800">{selectedSupplierDetail.contactPerson || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Điện thoại:</span>
                  <strong className="text-emerald-700">{selectedSupplierDetail.phone || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Email:</span>
                  <span className="text-slate-700 font-medium truncate block">{selectedSupplierDetail.email || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Thanh toán:</span>
                  <span className="text-slate-700 font-medium truncate block">{selectedSupplierDetail.paymentTerms || '-'}</span>
                </div>
              </div>

              {/* Quotations list from this supplier */}
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-600" />
                  Các lần chào giá ({
                    quotations.filter((q) => q.supplierId === selectedSupplierDetail.id).length
                  })
                </h4>

                {(() => {
                  const supplierQuotes = quotations.filter(
                    (q) => q.supplierId === selectedSupplierDetail.id
                  );

                  if (supplierQuotes.length === 0) {
                    return (
                      <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-xl">
                        Nhà cung cấp này chưa có bản ghi báo giá nào.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {supplierQuotes.map((sq) => (
                        <div
                          key={sq.id}
                          className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                            <div>
                              <span className="font-bold text-slate-800">
                                Đợt báo giá #{sq.id.slice(0, 8)}
                              </span>
                              <span className="text-slate-400 ml-2">
                                Ngày: {formatDateTimeVI(sq.quoteDate)} - Người hỏi: {sq.createdBy}
                              </span>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-500">
                              Hạn: {sq.validUntil ? formatDateTimeVI(sq.validUntil) : 'Không thời hạn'}
                            </span>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-slate-400 text-[10px] text-left">
                                  <th className="py-1">Sản phẩm</th>
                                  <th className="py-1 text-right">Giá báo</th>
                                  <th className="py-1 text-center">CK (%)</th>
                                  <th className="py-1 text-right">Giá Net</th>
                                  <th className="py-1 text-center">Tình trạng</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {sq.items.map((it, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50">
                                    <td className="py-1.5 font-medium text-slate-800">
                                      {it.productName}
                                    </td>
                                    <td className="py-1.5 text-right font-medium text-slate-500">
                                      {formatVNDCurrency(it.quotedPrice)}
                                    </td>
                                    <td className="py-1.5 text-center text-slate-700">
                                      {it.discountPercent || 0}%
                                    </td>
                                    <td className="py-1.5 text-right font-bold text-emerald-600">
                                      {formatVNDCurrency(it.netPrice)}
                                    </td>
                                    <td className="py-1.5 text-center text-[10px]">
                                      {it.stockStatus === 'in_stock'
                                        ? 'Sẵn kho'
                                        : it.stockStatus === 'pre_order'
                                        ? 'Đặt hàng'
                                        : 'Hết hàng'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setSelectedSupplierDetail(null);
                  onNavigateToNewQuoteWithSupplier(selectedSupplierDetail.id);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                + Nhập báo giá mới cho NPP này
              </button>

              <button
                type="button"
                onClick={() => setSelectedSupplierDetail(null)}
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

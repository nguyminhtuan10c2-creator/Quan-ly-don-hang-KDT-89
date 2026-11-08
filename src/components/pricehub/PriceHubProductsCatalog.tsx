import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Layers,
  Link as LinkIcon,
  Unlink,
  ExternalLink,
  Building2,
  TrendingDown,
  History,
  CheckCircle2,
  X,
  AlertCircle,
  Copy,
  Tag,
  Boxes,
  FileText,
  Merge,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { PriceProduct, Supplier, SupplierQuotation, Product } from '../../types';
import {
  savePriceProduct,
  deletePriceProduct,
  mergePriceProducts,
  linkPriceProductToInventory,
  formatVNDCurrency,
  formatDateTimeVI,
  getProductPriceComparison,
} from '../../services/priceHubService';

interface PriceHubProductsCatalogProps {
  products: PriceProduct[];
  suppliers: Supplier[];
  quotations: SupplierQuotation[];
  inventoryProducts: Product[];
  onRefresh: () => void;
  onNavigateToComparison: (productId: string) => void;
  onNavigateToNewQuote: (productId: string) => void;
}

export const PriceHubProductsCatalog: React.FC<PriceHubProductsCatalogProps> = ({
  products,
  suppliers,
  quotations,
  inventoryProducts,
  onRefresh,
  onNavigateToComparison,
  onNavigateToNewQuote,
}) => {
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterLinked, setFilterLinked] = useState<'all' | 'linked' | 'unlinked'>('all');

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PriceProduct | null>(null);

  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [sourceProductId, setSourceProductId] = useState('');
  const [targetProductId, setTargetProductId] = useState('');

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkingProduct, setLinkingProduct] = useState<PriceProduct | null>(null);
  const [selectedInventoryId, setSelectedInventoryId] = useState('');

  const [historyModalProduct, setHistoryModalProduct] = useState<PriceProduct | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    brand: '',
    origin: '',
    specification: '',
    category: '',
    unit: 'Cái',
    notes: '',
    imageUrl: '',
    technicalDocUrl: '',
    createdBy: 'Sale KDT',
  });

  // Extract unique brands and categories
  const brands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brand) set.add(p.brand.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchTerm.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.model && p.model.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.specification && p.specification.toLowerCase().includes(q));

      const matchBrand = selectedBrand === 'all' || p.brand === selectedBrand;
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchLinked =
        filterLinked === 'all' ||
        (filterLinked === 'linked' && !!p.linkedInventoryProductId) ||
        (filterLinked === 'unlinked' && !p.linkedInventoryProductId);

      return matchQuery && matchBrand && matchCat && matchLinked;
    });
  }, [products, searchTerm, selectedBrand, selectedCategory, filterLinked]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      model: '',
      brand: '',
      origin: '',
      specification: '',
      category: '',
      unit: 'Cái',
      notes: '',
      imageUrl: '',
      technicalDocUrl: '',
      createdBy: 'Sale KDT',
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (p: PriceProduct) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      model: p.model || '',
      brand: p.brand || '',
      origin: p.origin || '',
      specification: p.specification || '',
      category: p.category || '',
      unit: p.unit || 'Cái',
      notes: p.notes || '',
      imageUrl: p.imageUrl || '',
      technicalDocUrl: p.technicalDocUrl || '',
      createdBy: p.createdBy || 'Sale KDT',
    });
    setIsAddEditModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    savePriceProduct({
      id: editingProduct ? editingProduct.id : undefined,
      code: editingProduct ? editingProduct.code : undefined,
      name: formData.name.trim(),
      model: formData.model.trim() || undefined,
      brand: formData.brand.trim() || undefined,
      origin: formData.origin.trim() || undefined,
      specification: formData.specification.trim() || undefined,
      category: formData.category.trim() || undefined,
      unit: formData.unit.trim() || 'Cái',
      notes: formData.notes.trim() || undefined,
      imageUrl: formData.imageUrl.trim() || undefined,
      technicalDocUrl: formData.technicalDocUrl.trim() || undefined,
      createdBy: formData.createdBy || 'Sale KDT',
      linkedInventoryProductId: editingProduct?.linkedInventoryProductId,
    });

    setIsAddEditModalOpen(false);
    onRefresh();
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Xác nhận xóa sản phẩm hỏi giá "${name}"? Các báo giá liên quan sẽ được lưu trữ an toàn.`)) {
      deletePriceProduct(id);
      onRefresh();
    }
  };

  const handleOpenLink = (p: PriceProduct) => {
    setLinkingProduct(p);
    setSelectedInventoryId(p.linkedInventoryProductId || '');
    setIsLinkModalOpen(true);
  };

  const handleSaveLink = () => {
    if (!linkingProduct) return;
    linkPriceProductToInventory(linkingProduct.id, selectedInventoryId || null);
    setIsLinkModalOpen(false);
    onRefresh();
  };

  const handleUnlink = (p: PriceProduct) => {
    if (window.confirm(`Hủy liên kết với kho hàng cho sản phẩm "${p.name}"?`)) {
      linkPriceProductToInventory(p.id, null);
      onRefresh();
    }
  };

  const handleExecuteMerge = () => {
    if (!sourceProductId || !targetProductId) {
      alert('Vui lòng chọn cả sản phẩm nguồn và sản phẩm đích!');
      return;
    }
    if (sourceProductId === targetProductId) {
      alert('Sản phẩm nguồn và đích không thể giống nhau!');
      return;
    }
    const success = mergePriceProducts(sourceProductId, targetProductId);
    if (success) {
      alert('Gộp sản phẩm thành công! Tất cả báo giá cũ đã được chuyển về sản phẩm chính.');
      setIsMergeModalOpen(false);
      setSourceProductId('');
      setTargetProductId('');
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold mb-2">
            <Package className="w-3.5 h-3.5" />
            MODULE B: DANH MỤC SẢN PHẨM HỎI GIÁ ĐỘC LẬP
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Danh Mục Sản Phẩm Hỏi Giá
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-2xl">
            Tập trung tất cả các sản phẩm đã từng đi khảo giá từ các nhà phân phối. Không bắt buộc phải có trong kho hàng, phục vụ tra giá dự án, đấu thầu và đơn hàng tiềm năng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMergeModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            title="Gộp các sản phẩm hỏi giá bị trùng lặp"
          >
            <Merge className="w-4 h-4 text-slate-600" />
            Gộp trùng
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Thêm sản phẩm mới
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên sản phẩm, Model, mã hàng, thương hiệu, thông số..."
              className="w-full pl-10 pr-4 py-2.5 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700"
            >
              <option value="all">Tất cả thương hiệu ({brands.length})</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700"
            >
              <option value="all">Tất cả ngành hàng ({categories.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={filterLinked}
              onChange={(e) => setFilterLinked(e.target.value as any)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700"
            >
              <option value="all">Tất cả liên kết kho</option>
              <option value="linked">Đã liên kết Kho KDT</option>
              <option value="unlinked">Chưa liên kết kho (hỏi giá ngoài)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4">Mã SP</th>
                <th className="py-3.5 px-4 min-w-[220px]">Sản phẩm & Thông số</th>
                <th className="py-3.5 px-3">Thương hiệu</th>
                <th className="py-3.5 px-3">ĐVT</th>
                <th className="py-3.5 px-4">Giá Net thấp nhất</th>
                <th className="py-3.5 px-4">NPP tốt nhất</th>
                <th className="py-3.5 px-3">Liên kết Kho</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Không có sản phẩm nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const comparison = getProductPriceComparison(p.id, quotations, suppliers);
                  const best = comparison.bestSupplierQuote;
                  const linkedWarehouseItem = p.linkedInventoryProductId
                    ? inventoryProducts.find((ip) => ip.id === p.linkedInventoryProductId)
                    : null;

                  return (
                    <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                      {/* Code */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {p.code}
                        </span>
                      </td>

                      {/* Product & Spec */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                          {p.model && (
                            <span className="bg-purple-50 text-purple-700 font-semibold px-1.5 py-0.2 rounded">
                              Model: {p.model}
                            </span>
                          )}
                          {p.specification && <span>{p.specification}</span>}
                        </div>
                      </td>

                      {/* Brand */}
                      <td className="py-3.5 px-3">
                        {p.brand ? (
                          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                            {p.brand}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Unit */}
                      <td className="py-3.5 px-3 font-semibold text-slate-800">{p.unit}</td>

                      {/* Best Net Price */}
                      <td className="py-3.5 px-4">
                        {best ? (
                          <div className="font-black text-emerald-600 text-sm">
                            {formatVNDCurrency(best.item.netPrice)}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Chưa có giá</span>
                        )}
                      </td>

                      {/* Best Supplier */}
                      <td className="py-3.5 px-4">
                        {best ? (
                          <div>
                            <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-blue-600 shrink-0" />
                              <span className="truncate max-w-[140px]" title={best.supplier.name}>
                                {best.supplier.name}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {formatDateTimeVI(best.quote.quoteDate)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* Link to warehouse */}
                      <td className="py-3.5 px-3">
                        {linkedWarehouseItem ? (
                          <div className="flex items-center gap-1">
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded"
                              title={`Tồn kho: ${linkedWarehouseItem.stock} ${linkedWarehouseItem.unit}`}
                            >
                              <LinkIcon className="w-2.5 h-2.5" />
                              Kho: {linkedWarehouseItem.stock}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUnlink(p)}
                              className="text-slate-400 hover:text-rose-600 p-0.5"
                              title="Hủy liên kết"
                            >
                              <Unlink className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenLink(p)}
                            className="text-[10px] font-bold text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-2 py-0.5 rounded border border-slate-200 transition-colors cursor-pointer"
                          >
                            + Nối kho
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onNavigateToComparison(p.id)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="So sánh giá các NPP"
                          >
                            <TrendingDown className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onNavigateToNewQuote(p.id)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Thêm báo giá mới"
                          >
                            <Plus className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setHistoryModalProduct(p)}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                            title="Xem lịch sử hỏi giá"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Sửa thông tin"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa sản phẩm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-blue-600 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Package className="w-5 h-5" />
                {editingProduct ? 'Chỉnh Sửa Sản Phẩm Hỏi Giá' : 'Thêm Sản Phẩm Hỏi Giá Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddEditModalOpen(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên sản phẩm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Vòng bi cầu bạc đạn SKF 6205-2RSH"
                  className="w-full text-sm px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Model / Part Number
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="VD: 6205-2RSH"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Thương hiệu</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="VD: SKF, NSK, Schneider..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Xuất xứ</label>
                  <input
                    type="text"
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    placeholder="VD: Thụy Điển, Nhật Bản, Trung Quốc..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Đơn vị tính</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="Cái, Bộ, Cuộn, Mét..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nhóm sản phẩm</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="VD: Vòng bi, Thiết bị đóng cắt, Vật tư phụ..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Quy cách / Thông số kỹ thuật
                </label>
                <textarea
                  rows={2}
                  value={formData.specification}
                  onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                  placeholder="VD: Đường kính trong 25mm, ngoài 52mm, dày 15mm..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú hoặc Link tài liệu kỹ thuật
                </label>
                <input
                  type="text"
                  value={formData.technicalDocUrl}
                  onChange={(e) => setFormData({ ...formData, technicalDocUrl: e.target.value })}
                  placeholder="Link datasheet, catalog hoặc tài liệu đính kèm..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="bg-slate-50 p-4 -mx-6 -mb-6 mt-6 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  {editingProduct ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link to Inventory Product Modal */}
      {isLinkModalOpen && linkingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-indigo-700 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                Liên Kết Với Kho Hàng KDT
              </h3>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Liên kết sản phẩm hỏi giá <strong>"{linkingProduct.name}"</strong> với một sản phẩm hiện có trong kho hàng để đối chiếu tồn kho và giá vốn thực tế.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chọn sản phẩm trong kho:
                </label>
                <select
                  value={selectedInventoryId}
                  onChange={(e) => setSelectedInventoryId(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2.5 border border-slate-300 rounded-xl"
                >
                  <option value="">-- Không liên kết (Sản phẩm ngoài kho) --</option>
                  {inventoryProducts.map((ip) => (
                    <option key={ip.id} value={ip.id}>
                      [{ip.sku}] {ip.name} (Tồn: {ip.stock} {ip.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl text-[11px] text-blue-700">
                Lưu ý: Thao tác này chỉ liên kết tham chiếu và không làm thay đổi tồn kho thực tế của KDT-89.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveLink}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Xác nhận liên kết
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merge Duplicate Products Modal */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-amber-600 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Merge className="w-5 h-5" />
                Gộp Sản Phẩm Trùng Lặp
              </h3>
              <button
                type="button"
                onClick={() => setIsMergeModalOpen(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Khi có 2 sản phẩm hỏi giá bị tạo trùng nhau (do viết hoa, sai chính tả...), tính năng này sẽ chuyển toàn bộ lịch sử báo giá của <strong>Sản phẩm nguồn</strong> sang <strong>Sản phẩm đích</strong> và xóa bỏ bản ghi trùng thừa.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Chọn sản phẩm nguồn (Bị trùng - sẽ xóa):
                </label>
                <select
                  value={sourceProductId}
                  onChange={(e) => setSourceProductId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                >
                  <option value="">-- Chọn sản phẩm thừa --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name} {p.brand ? `(${p.brand})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. Chọn sản phẩm đích (Giữ lại làm chuẩn):
                </label>
                <select
                  value={targetProductId}
                  onChange={(e) => setTargetProductId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                >
                  <option value="">-- Chọn sản phẩm chính --</option>
                  {products
                    .filter((p) => p.id !== sourceProductId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.code}] {p.name} {p.brand ? `(${p.brand})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                Thao tác này là không thể hoàn tác. Toàn bộ báo giá sẽ được bảo toàn nguyên vẹn dưới sản phẩm đích.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMergeModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleExecuteMerge}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Xác nhận gộp sản phẩm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal for Single Product */}
      {historyModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
            <div className="bg-purple-700 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Lịch Sử Báo Giá: {historyModalProduct.name}
                </h3>
                <span className="text-xs text-purple-200 font-mono">
                  Mã: {historyModalProduct.code} - Model: {historyModalProduct.model || 'N/A'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalProduct(null)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
              {(() => {
                const comparison = getProductPriceComparison(
                  historyModalProduct.id,
                  quotations,
                  suppliers
                );
                if (comparison.allQuotes.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      Chưa có báo giá nào được ghi nhận cho sản phẩm này.
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {comparison.allQuotes.map((entry, idx) => {
                      const { item, quote, supplier, isLowestNetPrice } = entry;
                      return (
                        <div
                          key={`${quote.id}-${idx}`}
                          className={`p-4 rounded-xl border transition-all ${
                            isLowestNetPrice
                              ? 'bg-emerald-50/50 border-emerald-300 shadow-xs'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">
                                  {supplier.name}
                                </span>
                                {isLowestNetPrice && (
                                  <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                                    GIÁ THẤP NHẤT
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-500">
                                Ngày báo: {formatDateTimeVI(quote.quoteDate)} - Người hỏi: {quote.createdBy}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-base font-black text-emerald-600">
                                {formatVNDCurrency(item.netPrice)}
                              </span>
                              <span className="text-[11px] text-slate-400 block line-through">
                                Gốc: {formatVNDCurrency(item.quotedPrice)}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Chiết khấu:</span>
                              <span className="font-bold text-slate-700">
                                {item.discountPercent || 0}%{' '}
                                {item.discountAmount
                                  ? `+ ${formatVNDCurrency(item.discountAmount)}`
                                  : ''}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Tồn kho:</span>
                              <span className="font-bold text-slate-700">
                                {item.stockStatus === 'in_stock'
                                  ? 'Có hàng'
                                  : item.stockStatus === 'pre_order'
                                  ? `Đặt hàng (${item.leadTimeDays || 3}d)`
                                  : 'Hết hàng'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">VAT & Ship:</span>
                              <span className="font-bold text-slate-700">
                                VAT {item.vatPercent || 0}% | {formatVNDCurrency(item.freightCost || 0)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Hạn báo giá:</span>
                              <span className="font-bold text-slate-700">
                                {quote.validUntil ? formatDateTimeVI(quote.validUntil) : 'Vô thời hạn'}
                              </span>
                            </div>
                          </div>

                          {item.notes && (
                            <p className="text-xs text-slate-500 mt-2 italic">
                              Ghi chú: {item.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryModalProduct(null)}
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

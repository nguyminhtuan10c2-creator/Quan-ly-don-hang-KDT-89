import React, { useState, useMemo } from 'react';
import {
  Search,
  Calculator,
  Building2,
  Gift,
  Tag,
  Clock,
  Calendar,
  CheckCircle2,
  Copy,
  Check,
  Package,
  X,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Percent,
  Plus,
  ArrowUpDown,
  History,
  Phone,
  ShieldCheck,
  Award,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Product } from '../types';
import {
  formatVND,
  formatDateVI,
  getAllDistributorNames,
  DISTRIBUTOR_PRESETS,
  getCategories,
  getBrands,
  getStoreInfo,
  saveProduct,
} from '../services/storageService';
import { DistributorQuoteModal } from './DistributorQuoteModal';

interface PriceLookupProps {
  products: Product[];
  onNavigateToInventory?: () => void;
  onNavigateToCreateOrder?: (product?: Product) => void;
}

export const PriceLookup: React.FC<PriceLookupProps> = ({
  products,
  onNavigateToInventory,
  onNavigateToCreateOrder,
}) => {
  const storeInfo = getStoreInfo();
  const allDistributors = getAllDistributorNames();
  const allCategories = getCategories();
  const allBrands = getBrands();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedDistributor, setSelectedDistributor] = useState<string>('all');
  const [productTypeFilter, setProductTypeFilter] = useState<'all' | 'in_stock' | 'on_demand' | 'has_gift'>('all');
  const [sortBy, setSortBy] = useState<'quote_date_desc' | 'net_cost_asc' | 'price_desc' | 'price_asc' | 'name_asc'>('quote_date_desc');

  // Modal for distributor quote
  const [quoteModalProduct, setQuoteModalProduct] = useState<Product | null>(null);

  // Quick customer quotation state (per product quick calculator in-card)
  const [activeCalculatorProductId, setActiveCalculatorProductId] = useState<string | null>(null);
  const [calcQuantity, setCalcQuantity] = useState<number>(1);
  const [calcMarginPct, setCalcMarginPct] = useState<number>(10);
  const [copiedProductId, setCopiedProductId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick Add On-Demand Product Modal
  const [isAddQuickOnDemandOpen, setIsAddQuickOnDemandOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductCategory, setNewProductCategory] = useState(allCategories[0]?.name || 'Máy lạnh');
  const [newProductBrand, setNewProductBrand] = useState(allBrands[0]?.name || 'Daikin');
  const [newProductNpp, setNewProductNpp] = useState(DISTRIBUTOR_PRESETS[0]);
  const [newProductBasePrice, setNewProductBasePrice] = useState<number | ''>(10000000);
  const [newProductMinQty, setNewProductMinQty] = useState<number>(5);
  const [newProductGiftDesc, setNewProductGiftDesc] = useState('');
  const [newProductGiftVal, setNewProductGiftVal] = useState<number | ''>('');

  const getDaysAgo = (dateStr?: string): number => {
    if (!dateStr) return 999;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 999;
      const now = new Date();
      return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    } catch {
      return 999;
    }
  };

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const queryLower = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !queryLower ||
          p.name.toLowerCase().includes(queryLower) ||
          p.sku.toLowerCase().includes(queryLower) ||
          (p.brand || '').toLowerCase().includes(queryLower) ||
          (p.category || '').toLowerCase().includes(queryLower) ||
          (p.distributorName || '').toLowerCase().includes(queryLower) ||
          (p.distributorGiftDesc || '').toLowerCase().includes(queryLower);

        const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
        const matchesBrand = selectedBrand === 'all' || p.brand === selectedBrand;
        const matchesDistributor = selectedDistributor === 'all' || p.distributorName === selectedDistributor;

        let matchesType = true;
        if (productTypeFilter === 'in_stock') {
          matchesType = p.stock > 0 && !p.isOrderOnDemand;
        } else if (productTypeFilter === 'on_demand') {
          matchesType = Boolean(p.isOrderOnDemand) || p.stock === 0 || Boolean(p.distributorName);
        } else if (productTypeFilter === 'has_gift') {
          matchesType = Boolean(p.distributorGiftValue && p.distributorGiftValue > 0);
        }

        return matchesQuery && matchesCategory && matchesBrand && matchesDistributor && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === 'quote_date_desc') {
          const dateA = new Date(a.distributorQuoteDate || a.priceUpdatedAt || 0).getTime();
          const dateB = new Date(b.distributorQuoteDate || b.priceUpdatedAt || 0).getTime();
          return dateB - dateA;
        }
        if (sortBy === 'net_cost_asc') {
          const netA = a.distributorNetCost || a.costPrice || a.price;
          const netB = b.distributorNetCost || b.costPrice || b.price;
          return netA - netB;
        }
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'vi');
        return 0;
      });
  }, [products, searchQuery, selectedCategory, selectedBrand, selectedDistributor, productTypeFilter, sortBy]);

  // Handler: Copy formatted customer quotation to clipboard
  const handleCopyCustomerQuote = (product: Product, quantity: number, marginPct: number) => {
    const netCost = product.distributorNetCost || product.costPrice || Math.round(product.price * 0.78);
    const retailUnit = Math.round((netCost * (1 + marginPct / 100)) / 10000) * 10000;
    const totalAmount = retailUnit * quantity;

    const message = `[${storeInfo.name.toUpperCase()}] BÁO GIÁ SẢN PHẨM
━━━━━━━━━━━━━━━━━━━━
Sản phẩm: ${product.name}
Mã model: ${product.sku}
Thương hiệu: ${product.brand || 'Chính hãng'}
Tình trạng: ${product.stock > 0 ? `Có sẵn trong kho (${product.stock} chiếc)` : 'Hàng chính hãng đặt theo đơn'}
Bảo hành: ${product.isWarrantyEligible ? `${product.warrantyMonths || 12} tháng chính hãng` : 'Theo chính sách hãng'}
━━━━━━━━━━━━━━━━━━━━
Số lượng: ${quantity} chiếc
Đơn giá: ${formatVND(retailUnit)}
Tổng cộng: ${formatVND(totalAmount)}
━━━━━━━━━━━━━━━━━━━━
Giao hàng & lắp đặt tận nơi. Cam kết 100% hàng mới nguyên đai nguyên kiện.
Hotline / Zalo: ${storeInfo.phone || '0903881223'} - ${storeInfo.address || 'dienmaykdt89.com'}`;

    navigator.clipboard.writeText(message);
    setCopiedProductId(product.id);
    setToastMessage(`Đã sao chép nội dung báo giá của "${product.name}"!`);
    setTimeout(() => {
      setCopiedProductId(null);
      setToastMessage(null);
    }, 3500);
  };

  // Handler: Save new on-demand product
  const handleSaveQuickOnDemand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) {
      alert('Vui lòng nhập tên sản phẩm!');
      return;
    }

    const sku = newProductSku.trim().toUpperCase() || `QC-${Math.floor(1000 + Math.random() * 9000)}`;
    const basePrice = Number(newProductBasePrice) || 0;
    const minQty = Math.max(1, Number(newProductMinQty) || 1);
    const giftVal = Number(newProductGiftVal) || 0;
    const discountPerUnit = Math.round(giftVal / minQty);
    const netCost = Math.max(0, basePrice - discountPerUnit);
    const retailPrice = Math.round((netCost * 1.12) / 10000) * 10000;

    saveProduct({
      name: newProductName.trim(),
      sku,
      category: newProductCategory,
      brand: newProductBrand,
      stock: 0,
      price: retailPrice,
      costPrice: netCost,
      isOrderOnDemand: true,
      distributorName: newProductNpp.trim(),
      distributorQuoteDate: new Date().toISOString().slice(0, 10),
      distributorBasePrice: basePrice,
      distributorMinQuantity: minQty,
      distributorGiftDesc: newProductGiftDesc.trim() || undefined,
      distributorGiftValue: giftVal > 0 ? giftVal : undefined,
      distributorNetCost: netCost,
      isWarrantyEligible: true,
      warrantyMonths: 12,
      activationBonusAmount: 0,
      priceNote: `Hàng đi hỏi giá NPP ${newProductNpp}: Giá gốc ${formatVND(basePrice)} (Bậc ${minQty})${giftVal > 0 ? ` trừ quà => Net ${formatVND(netCost)}` : ''}`,
    });

    setIsAddQuickOnDemandOpen(false);
    setNewProductName('');
    setNewProductSku('');
    setToastMessage(`Đã thêm mã hàng đi hỏi "${newProductName}" thành công!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg border border-purple-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 bg-purple-500/20 text-purple-200 border border-purple-400/30 px-3 py-1 rounded-full text-xs font-bold mb-2">
              <Calculator className="w-3.5 h-3.5 text-amber-300" />
              <span>Tra cứu Giá Kho & Báo Giá Nhà Phân Phối (NPP)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Bảng Tra Cứu Giá & Tính Giá Net Chiết Khấu</span>
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/90 mt-1 max-w-2xl leading-relaxed">
              Theo dõi chính xác <strong>ngày cập nhật giá</strong>, <strong>nhà phân phối</strong>, <strong>giá nhập theo bậc số lượng (ví dụ 5 con)</strong> và <strong>tự động trừ giá trị quà tặng</strong> vào chiết khấu để tính ra giá Net thực tế chào khách.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsAddQuickOnDemandOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Thêm mã đi hỏi giá</span>
            </button>

            {onNavigateToInventory && (
              <button
                type="button"
                onClick={onNavigateToInventory}
                className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl border border-white/20 flex items-center justify-center space-x-1.5 transition-all"
              >
                <Package className="w-4 h-4 text-purple-300" />
                <span>Xem toàn bộ kho hàng</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Search & Filters Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Big Search Input */}
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-purple-600" />
            <input
              type="text"
              placeholder="Gõ tên model, SKU, Daikin, Samsung, lò vi sóng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-purple-50/40 border border-purple-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Distributor Dropdown */}
            <div className="flex items-center space-x-1 text-xs flex-1 sm:flex-none">
              <Building2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <select
                value={selectedDistributor}
                onChange={(e) => setSelectedDistributor(e.target.value)}
                className="w-full sm:w-auto bg-purple-50/70 border border-purple-200 text-purple-950 font-bold px-3 py-2 rounded-xl text-xs focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">Tất cả NPP báo giá ({allDistributors.length})</option>
                {allDistributors.map((npp) => (
                  <option key={npp} value={npp}>
                    {npp}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Dropdown */}
            <div className="flex items-center space-x-1 text-xs flex-1 sm:flex-none">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto bg-slate-50 border border-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả ngành hàng</option>
                {allCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-1 text-xs flex-1 sm:flex-none">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full sm:w-auto bg-slate-50 border border-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="quote_date_desc">Ngày hỏi giá mới nhất</option>
                <option value="net_cost_asc">Giá Net NPP thấp nhất</option>
                <option value="price_desc">Giá bán niêm yết cao nhất</option>
                <option value="price_asc">Giá bán niêm yết thấp nhất</option>
                <option value="name_asc">Tên sản phẩm A - Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-purple-600" />
            Lọc nhanh:
          </span>

          <button
            onClick={() => setProductTypeFilter('all')}
            className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
              productTypeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({products.length})
          </button>

          <button
            onClick={() => setProductTypeFilter('on_demand')}
            className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center space-x-1 ${
              productTypeFilter === 'on_demand'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            <Building2 className="w-3 h-3 text-purple-600" />
            <span>Hàng đi hỏi giá / Báo giá NPP</span>
          </button>

          <button
            onClick={() => setProductTypeFilter('has_gift')}
            className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center space-x-1 ${
              productTypeFilter === 'has_gift'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Gift className="w-3 h-3 text-amber-600" />
            <span>Có tặng quà / Trừ chiết khấu</span>
          </button>

          <button
            onClick={() => setProductTypeFilter('in_stock')}
            className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
              productTypeFilter === 'in_stock'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            Có sẵn trong kho
          </button>

          {(searchQuery || selectedCategory !== 'all' || selectedDistributor !== 'all' || productTypeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedDistributor('all');
                setProductTypeFilter('all');
              }}
              className="ml-auto text-[11px] text-purple-700 hover:text-purple-900 font-bold flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs px-1 text-slate-500 font-medium">
        <span>
          Tìm thấy <strong className="text-slate-900 font-bold">{filteredProducts.length}</strong> sản phẩm phù hợp
        </span>
        <span className="text-[11px]">Bấm vào thẻ để tính nhanh báo giá gửi khách</span>
      </div>

      {/* Results Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-3">
            <Package className="w-12 h-12 mx-auto text-slate-300" />
            <p className="font-bold text-slate-700">Không tìm thấy sản phẩm nào khớp với tìm kiếm.</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Bạn có thể bấm nút "Thêm mã đi hỏi giá" ở góc trên để lưu lại mẫu sản phẩm và giá vừa hỏi từ NPP.
            </p>
            <button
              type="button"
              onClick={() => setIsAddQuickOnDemandOpen(true)}
              className="mt-2 inline-flex items-center space-x-1.5 text-xs font-bold bg-purple-600 text-white px-4 py-2 rounded-xl shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm sản phẩm & Báo giá NPP ngay</span>
            </button>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const hasDistributorQuote = Boolean(
              product.distributorName || product.distributorBasePrice || product.distributorNetCost
            );
            const netCost = product.distributorNetCost || product.costPrice || Math.round(product.price * 0.78);
            const minQty = product.distributorMinQuantity || 1;
            const giftVal = product.distributorGiftValue || 0;
            const discountPerUnit = Math.round(giftVal / minQty);
            const isCalcOpen = activeCalculatorProductId === product.id;

            // Calculated customer price
            const customerUnitPrice = Math.round((netCost * (1 + calcMarginPct / 100)) / 10000) * 10000;
            const customerTotal = customerUnitPrice * calcQuantity;
            const estimatedProfit = customerTotal - netCost * calcQuantity;

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-purple-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Header Information */}
                <div className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-black text-slate-900 text-sm group-hover:text-purple-700 transition-colors line-clamp-2">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {product.sku}
                        </span>
                        <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200">
                          {product.category}
                        </span>
                        {product.brand && (
                          <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-indigo-200">
                            {product.brand}
                          </span>
                        )}
                      </div>
                    </div>

                    {product.isOrderOnDemand ? (
                      <span className="shrink-0 bg-purple-100 text-purple-800 border border-purple-200 font-bold px-2 py-0.5 rounded text-[10px]">
                        Đi hỏi giá
                      </span>
                    ) : (
                      <span
                        className={`shrink-0 font-bold px-2 py-0.5 rounded text-[10px] border ${
                          product.stock > 0
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {product.stock > 0 ? `Kho: ${product.stock}` : 'Hết kho'}
                      </span>
                    )}
                  </div>

                  {/* Distributor Quote Highlight Box */}
                  <div className="bg-gradient-to-br from-purple-50/90 via-indigo-50/70 to-slate-50 p-3 rounded-xl border border-purple-200/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[11px] text-purple-950 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span className="truncate max-w-[150px]">{product.distributorName || 'NPP chưa lưu'}</span>
                      </span>
                      {product.distributorQuoteDate && (
                        <span className="text-[10px] text-purple-700 font-semibold flex items-center gap-0.5 shrink-0">
                          <Calendar className="w-2.5 h-2.5" />
                          <span>{formatDateVI(product.distributorQuoteDate)}</span>
                        </span>
                      )}
                    </div>

                    {hasDistributorQuote ? (
                      <div className="space-y-1 pt-0.5">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="text-[11px] text-slate-500">Giá báo gốc:</span>
                          <span className="font-semibold text-slate-800">
                            {formatVND(product.distributorBasePrice || product.costPrice || 0)}
                            <span className="text-[10px] text-slate-500 font-normal"> (Min {minQty} con)</span>
                          </span>
                        </div>

                        {discountPerUnit > 0 && (
                          <div className="flex items-center justify-between text-xs bg-amber-50/80 p-1.5 rounded-lg border border-amber-200">
                            <span className="text-[10px] font-bold text-amber-800 flex items-center gap-1">
                              <Gift className="w-3 h-3 text-amber-600" />
                              <span>{product.distributorGiftDesc || 'Quà tặng'}</span>
                            </span>
                            <span className="font-black text-[11px] text-amber-900">
                              -{formatVND(discountPerUnit)}/con
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-purple-200/60">
                          <span className="text-[11px] font-bold text-purple-950">Giá Net thực tế:</span>
                          <span className="text-sm font-black text-purple-900 bg-white px-2 py-0.5 rounded-md border border-purple-300 shadow-2xs">
                            {formatVND(netCost)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-1 text-center">
                        <p className="text-[11px] text-slate-400 italic">Chưa có báo giá NPP cho model này</p>
                      </div>
                    )}
                  </div>

                  {/* Retail Price info */}
                  <div className="flex items-center justify-between text-xs pt-1 px-1">
                    <span className="text-slate-500 text-[11px]">Giá niêm yết bán lẻ:</span>
                    <span className="font-black text-slate-900">{formatVND(product.price)}</span>
                  </div>

                  {/* Customer Quote Calculator Accordion */}
                  {isCalcOpen && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-300 space-y-2.5 animate-in fade-in duration-100">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                        <span className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                          <Calculator className="w-3 h-3 text-indigo-600" />
                          <span>Tính giá chào khách & Lãi</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveCalculatorProductId(null)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Số lượng khách hỏi:</label>
                          <input
                            type="number"
                            min="1"
                            value={calcQuantity}
                            onChange={(e) => setCalcQuantity(Math.max(1, Number(e.target.value)))}
                            className="w-full text-xs font-bold px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">% Lãi mong muốn:</label>
                          <select
                            value={calcMarginPct}
                            onChange={(e) => setCalcMarginPct(Number(e.target.value))}
                            className="w-full text-xs font-bold px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-indigo-900"
                          >
                            <option value={5}>+5% lãi</option>
                            <option value={8}>+8% lãi</option>
                            <option value={10}>+10% lãi</option>
                            <option value={12}>+12% lãi</option>
                            <option value={15}>+15% lãi</option>
                            <option value={20}>+20% lãi</option>
                          </select>
                        </div>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-slate-200 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Giá chào 1 chiếc:</span>
                          <span className="font-bold text-slate-900">{formatVND(customerUnitPrice)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Tổng tiền ({calcQuantity} chiếc):</span>
                          <span className="font-black text-indigo-700">{formatVND(customerTotal)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-emerald-700 font-bold pt-1 border-t border-slate-100">
                          <span>Lợi nhuận ước tính:</span>
                          <span>+{formatVND(estimatedProfit)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyCustomerQuote(product, calcQuantity, calcMarginPct)}
                        className="w-full min-h-[38px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs px-3 py-2 rounded-xl flex items-center justify-center space-x-1.5 shadow-sm active:scale-95 transition-all"
                      >
                        {copiedProductId === product.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-white" />
                            <span>Đã sao chép!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Sao chép báo giá Zalo / Tin nhắn</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Bottom Actions Toolbar */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isCalcOpen) {
                        setActiveCalculatorProductId(null);
                      } else {
                        setActiveCalculatorProductId(product.id);
                        setCalcQuantity(1);
                      }
                    }}
                    className={`flex-1 min-h-[42px] font-bold text-xs px-2.5 py-2 rounded-xl border flex items-center justify-center space-x-1 transition-all ${
                      isCalcOpen
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isCalcOpen ? 'Đóng tính lãi' : 'Báo giá khách'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuoteModalProduct(product)}
                    title="Cập nhật báo giá NPP hoặc so sánh giá các bên"
                    className="flex-1 min-h-[42px] font-extrabold text-xs px-2.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 flex items-center justify-center space-x-1 transition-all"
                  >
                    <Building2 className="w-3.5 h-3.5 text-purple-600" />
                    <span>Giá NPP & Quà</span>
                  </button>

                  {onNavigateToCreateOrder && (
                    <button
                      type="button"
                      onClick={() => onNavigateToCreateOrder(product)}
                      title="Lên đơn hàng ngay với sản phẩm này"
                      className="min-h-[42px] px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: QUICK ADD ON-DEMAND PRODUCT */}
      {isAddQuickOnDemandOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white px-5 py-4 flex items-center justify-between border-b border-purple-800">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-amber-300" />
                <h3 className="font-extrabold text-sm sm:text-base">Thêm mã hàng đi hỏi giá NPP mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddQuickOnDemandOpen(false)}
                className="text-purple-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickOnDemand} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên sản phẩm *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Máy lạnh Daikin Inverter 1.5 HP FTKF35XVMV"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã SKU / Model</label>
                  <input
                    type="text"
                    placeholder="VD: FTKF35XVMV"
                    value={newProductSku}
                    onChange={(e) => setNewProductSku(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hãng sản xuất</label>
                  <select
                    value={newProductBrand}
                    onChange={(e) => setNewProductBrand(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white text-indigo-900"
                  >
                    {allBrands.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 space-y-2.5">
                <span className="font-extrabold text-[11px] text-purple-950 block">Thông tin báo giá từ NPP:</span>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tên Nhà phân phối *</label>
                  <input
                    type="text"
                    list="npp-quick-list"
                    value={newProductNpp}
                    onChange={(e) => setNewProductNpp(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-purple-300 rounded-lg font-bold bg-white"
                  />
                  <datalist id="npp-quick-list">
                    {allDistributors.map((n) => (
                      <option key={n} value={n} />
                    ))}
                  </datalist>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Giá báo gốc (VNĐ) *</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      required
                      value={newProductBasePrice}
                      onChange={(e) => setNewProductBasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 border border-purple-300 rounded-lg font-black text-purple-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Bậc số lượng (con) *</label>
                    <input
                      type="number"
                      min="1"
                      value={newProductMinQty}
                      onChange={(e) => setNewProductMinQty(Math.max(1, Number(e.target.value)))}
                      className="w-full text-xs px-3 py-2 border border-purple-300 rounded-lg font-bold bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tên quà tặng kèm (nếu có)</label>
                    <input
                      type="text"
                      placeholder="VD: Tặng lò vi sóng"
                      value={newProductGiftDesc}
                      onChange={(e) => setNewProductGiftDesc(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-purple-300 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Giá trị quà (VNĐ)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="1500000"
                      value={newProductGiftVal}
                      onChange={(e) => setNewProductGiftVal(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 border border-purple-300 rounded-lg bg-white"
                    />
                  </div>
                </div>

                {newProductBasePrice !== '' && Number(newProductBasePrice) > 0 && (
                  <div className="bg-white p-2.5 rounded-lg border border-purple-200 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-purple-900 font-bold">Giá Net sau trừ quà:</span>
                    <span className="text-sm font-black text-purple-900">
                      {formatVND(
                        Math.max(
                          0,
                          Number(newProductBasePrice) -
                            Math.round((Number(newProductGiftVal) || 0) / Math.max(1, Number(newProductMinQty) || 1))
                        )
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddQuickOnDemandOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs"
                >
                  Lưu sản phẩm đi hỏi giá
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Distributor Quote & Comparison Modal */}
      {quoteModalProduct && (
        <DistributorQuoteModal
          product={quoteModalProduct}
          isOpen={Boolean(quoteModalProduct)}
          onClose={() => setQuoteModalProduct(null)}
          onProductUpdated={() => {
            setQuoteModalProduct(null);
            setToastMessage('Đã cập nhật báo giá NPP thành công!');
            setTimeout(() => setToastMessage(null), 3500);
          }}
        />
      )}
    </div>
  );
};

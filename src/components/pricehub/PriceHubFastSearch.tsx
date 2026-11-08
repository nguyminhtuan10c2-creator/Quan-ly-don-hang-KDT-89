import React, { useState, useMemo } from 'react';
import {
  Search,
  Zap,
  TrendingDown,
  Building2,
  Calendar,
  Package,
  Copy,
  Check,
  ArrowRight,
  Calculator,
  AlertTriangle,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Percent,
  X,
  Filter,
} from 'lucide-react';
import { PriceProduct, Supplier, SupplierQuotation } from '../../types';
import {
  searchFastPriceHub,
  formatVNDCurrency,
  formatDateTimeVI,
  calculateQuotationItemNetPrice,
} from '../../services/priceHubService';

interface PriceHubFastSearchProps {
  products: PriceProduct[];
  suppliers: Supplier[];
  quotations: SupplierQuotation[];
  onNavigateToComparison: (productId: string) => void;
  onNavigateToProductDetail: (productId: string) => void;
  onNavigateToNewQuote: (productId?: string) => void;
}

export const PriceHubFastSearch: React.FC<PriceHubFastSearchProps> = ({
  products,
  suppliers,
  quotations,
  onNavigateToComparison,
  onNavigateToProductDetail,
  onNavigateToNewQuote,
}) => {
  const [query, setQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Quick Margin Calculator Modal
  const [calcItem, setCalcItem] = useState<{
    product: PriceProduct;
    bestSupplier: Supplier;
    bestNetPrice: number;
    quoteDate: string;
    stockStatus: string;
  } | null>(null);
  const [marginPercent, setMarginPercent] = useState<number>(15);
  const [customSellingPrice, setCustomSellingPrice] = useState<number>(0);
  const [includeVAT, setIncludeVAT] = useState<boolean>(true);
  const [warrantyMonths, setWarrantyMonths] = useState<number>(12);
  const [deliveryNote, setDeliveryNote] = useState<string>('Giao hàng tận nơi trong ngày');

  // Brands & categories for quick filter
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

  // Fast search results
  const searchResults = useMemo(() => {
    return searchFastPriceHub(query, products, quotations, suppliers, {
      brand: selectedBrand !== 'all' ? selectedBrand : undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
    });
  }, [query, products, quotations, suppliers, selectedBrand, selectedCategory]);

  const openQuickCalculator = (res: typeof searchResults[0]) => {
    if (!res.bestSupplier || !res.bestQuote) return;
    const baseNet = res.bestQuote.netPrice;
    setCalcItem({
      product: res.product,
      bestSupplier: res.bestSupplier,
      bestNetPrice: baseNet,
      quoteDate: res.bestQuote.quoteDate,
      stockStatus: res.bestQuote.stockStatus,
    });
    const defaultSell = Math.round(baseNet * (1 + marginPercent / 100));
    setCustomSellingPrice(defaultSell);
  };

  const computedSellPrice = useMemo(() => {
    if (!calcItem) return 0;
    if (customSellingPrice > 0) return customSellingPrice;
    return Math.round(calcItem.bestNetPrice * (1 + marginPercent / 100));
  }, [calcItem, marginPercent, customSellingPrice]);

  const computedProfit = useMemo(() => {
    if (!calcItem) return 0;
    return computedSellPrice - calcItem.bestNetPrice;
  }, [calcItem, computedSellPrice]);

  const handleCopyCustomerQuote = (res: typeof searchResults[0]) => {
    if (!res.bestQuote || !res.bestSupplier) return;
    const p = res.product;
    const net = res.bestQuote.netPrice;
    const defaultSelling = Math.round(net * 1.15); // 15% margin
    const text = `KDT-89 BÁO GIÁ SẢN PHẨM:
- Tên SP: ${p.name}
- Model: ${p.model || 'Tiêu chuẩn'} ${p.brand ? `(${p.brand})` : ''}
- Đơn vị tính: ${p.unit}
- Giá đề xuất: ${formatVNDCurrency(defaultSelling)} / ${p.unit} (chưa VAT)
- Tình trạng: ${
      res.bestQuote.stockStatus === 'in_stock'
        ? 'Sẵn hàng tại kho'
        : res.bestQuote.stockStatus === 'pre_order'
        ? `Đặt hàng (${res.bestQuote.leadTimeDays || 3} ngày)`
        : 'Liên hệ xác nhận'
    }
- Bảo hành: 12 tháng chính hãng
- Hỗ trợ giao hàng & hóa đơn VAT đầy đủ theo yêu cầu.
Hotline / Zalo: 0987.654.321`;

    navigator.clipboard.writeText(text);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCopyCalculatedQuote = () => {
    if (!calcItem) return;
    const p = calcItem.product;
    const finalVatText = includeVAT ? ' (đã bao gồm VAT 10%)' : ' (chưa bao gồm VAT)';
    const text = `KDT-89 BÁO GIÁ KHÁCH HÀNG:
- Sản phẩm: ${p.name}
- Model / Part: ${p.model || 'Tiêu chuẩn'}
- Thương hiệu: ${p.brand || 'Chính hãng'} - Quy cách: ${p.specification || p.unit}
- Đơn giá: ${formatVNDCurrency(computedSellPrice)} / ${p.unit}${finalVatText}
- Tình trạng: ${
      calcItem.stockStatus === 'in_stock' ? 'Hàng có sẵn' : 'Đặt hàng nhanh'
    }
- Thời gian giao: ${deliveryNote}
- Bảo hành: ${warrantyMonths} tháng
Vui lòng liên hệ KDT-89 để chốt đơn ngay!`;

    navigator.clipboard.writeText(text);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 translate-x-12 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold text-blue-100 mb-3">
            <Zap className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            MODULE G: TRA CỨU GIÁ SIÊU TỐC CHO SALE
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
            Tra Cứu Báo Giá Nhà Phân Phối Trong 3 Giây
          </h2>
          <p className="text-blue-100 text-sm md:text-base leading-relaxed mb-6">
            Dành riêng cho nhân viên Sale khi khách đang hỏi gấp. Tìm kiếm thông minh theo Tên hàng, Model, Part Number, NPP hoặc Thương hiệu. So sánh ngay giá tốt nhất và tính biên lợi nhuận chốt đơn tức thì.
          </p>

          {/* Big Search Input */}
          <div className="relative">
            <Search className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập tên sản phẩm, Model (VD: 6205, CB400, SKF...), Thương hiệu hoặc Nhà cung cấp..."
              className="w-full pl-13 pr-12 py-4 bg-white text-slate-900 rounded-xl shadow-2xl text-base md:text-lg font-medium placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title="Xóa tìm kiếm"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <Filter className="w-3.5 h-3.5" /> Lọc nhanh:
          </span>

          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 transition-colors"
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
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <option value="all">Tất cả ngành hàng ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {(selectedBrand !== 'all' || selectedCategory !== 'all' || query) && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSelectedBrand('all');
                setSelectedCategory('all');
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1"
            >
              Đặt lại
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Tìm thấy <span className="font-bold text-slate-900">{searchResults.length}</span> sản phẩm báo giá
        </div>
      </div>

      {/* Results Grid / List */}
      {searchResults.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">
            {query ? `Không tìm thấy sản phẩm khớp với "${query}"` : 'Chưa có sản phẩm hỏi giá nào'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            Bạn có thể tạo nhanh sản phẩm hỏi giá mới hoặc liên hệ nhà cung cấp để nhập báo giá đầu tiên.
          </p>
          <button
            type="button"
            onClick={() => onNavigateToNewQuote()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            Nhập báo giá sản phẩm mới
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {searchResults.map((res) => {
            const p = res.product;
            const bestQuote = res.bestQuote;
            const latestQuote = res.latestQuote;
            const bestSupplier = res.bestSupplier;
            const isStale = res.isStale;
            const quoteCount = res.totalQuotesCount;
            const supplierCount = res.suppliersCount;

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all duration-200 p-5 flex flex-col justify-between relative group"
              >
                {/* Top Info */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {p.code}
                        </span>
                        {p.brand && (
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                            {p.brand}
                          </span>
                        )}
                        {p.model && (
                          <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                            Model: {p.model}
                          </span>
                        )}
                      </div>
                      <h4
                        onClick={() => onNavigateToProductDetail(p.id)}
                        className="text-base font-bold text-slate-900 hover:text-blue-600 cursor-pointer line-clamp-2 transition-colors"
                        title={p.name}
                      >
                        {p.name}
                      </h4>
                    </div>

                    {/* Stock / Warning Pill */}
                    {isStale && (
                      <span
                        title="Báo giá đã quá 30 ngày, nên kiểm tra lại với NPP trước khi chốt"
                        className="shrink-0 flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-md"
                      >
                        <Clock className="w-3 h-3 text-amber-500" />
                        Giá cũ
                      </span>
                    )}
                  </div>

                  {p.specification && (
                    <p className="text-xs text-slate-500 mb-3 line-clamp-1 italic">
                      Quy cách: {p.specification}
                    </p>
                  )}

                  {/* Pricing Comparison Box */}
                  <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-xl p-3 border border-slate-200/80 mb-4 space-y-2">
                    {bestQuote && bestSupplier ? (
                      <>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                            <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                            Giá Net tốt nhất:
                          </span>
                          <span className="text-lg font-black text-emerald-600">
                            {formatVNDCurrency(bestQuote.netPrice)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span className="flex items-center gap-1 font-medium truncate max-w-[170px]" title={bestSupplier.name}>
                            <Building2 className="w-3 h-3 text-blue-600 shrink-0" />
                            {bestSupplier.name}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400">
                            {formatDateTimeVI(bestQuote.quoteDate)}
                          </span>
                        </div>

                        {bestQuote.stockStatus && (
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                            <span className="text-slate-500">Tình trạng:</span>
                            <span
                              className={`font-semibold ${
                                bestQuote.stockStatus === 'in_stock'
                                  ? 'text-emerald-700'
                                  : bestQuote.stockStatus === 'pre_order'
                                  ? 'text-amber-700'
                                  : 'text-rose-700'
                              }`}
                            >
                              {bestQuote.stockStatus === 'in_stock'
                                ? '✓ Có sẵn'
                                : bestQuote.stockStatus === 'pre_order'
                                ? `Đặt hàng (${bestQuote.leadTimeDays || 3}d)`
                                : 'Hết hàng'}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-2 text-xs text-slate-400 italic">
                        Chưa có báo giá nào từ nhà cung cấp
                      </div>
                    )}
                  </div>

                  {/* Summary badges */}
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1 mb-4">
                    <span>
                      <strong className="text-slate-800">{supplierCount}</strong> NPP đã báo
                    </span>
                    <span>
                      <strong className="text-slate-800">{quoteCount}</strong> lần hỏi giá
                    </span>
                    <span>
                      ĐVT: <strong className="text-slate-800">{p.unit}</strong>
                    </span>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openQuickCalculator(res)}
                      disabled={!bestQuote}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                      title="Tính nhanh giá bán cho khách với lợi nhuận mong muốn"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      Tính giá bán
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyCustomerQuote(res)}
                      disabled={!bestQuote}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                      title="Copy nội dung báo giá gửi Zalo cho khách"
                    >
                      {copiedId === p.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Chép Zalo</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigateToComparison(p.id)}
                      className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      <span>So sánh NPP</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigateToNewQuote(p.id)}
                      className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                    >
                      <span>+ Báo giá mới</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Margin / Quick Quotation Modal */}
      {calcItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-700 to-blue-700 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-300" />
                <h3 className="text-base font-bold">Tính Giá Bán Cho Khách Hàng</h3>
              </div>
              <button
                type="button"
                onClick={() => setCalcItem(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Sản phẩm</span>
                <h4 className="text-base font-bold text-slate-900">{calcItem.product.name}</h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                  <span className="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold">
                    {calcItem.product.code}
                  </span>
                  <span>Model: {calcItem.product.model || 'N/A'}</span>
                  <span>ĐVT: {calcItem.product.unit}</span>
                </div>
              </div>

              {/* Best Inquire Price */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">Giá Net mua vào tốt nhất (NPP)</span>
                  <span className="text-xs font-medium text-blue-700">{calcItem.bestSupplier.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-emerald-600">
                    {formatVNDCurrency(calcItem.bestNetPrice)}
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Cập nhật: {formatDateTimeVI(calcItem.quoteDate)}
                  </span>
                </div>
              </div>

              {/* Margin Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Biên lợi nhuận mong muốn (%)
                </label>
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {[10, 15, 20, 25, 30].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setMarginPercent(pct);
                        setCustomSellingPrice(Math.round(calcItem.bestNetPrice * (1 + pct / 100)));
                      }}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        marginPercent === pct
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      +{pct}%
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={marginPercent}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setMarginPercent(val);
                      setCustomSellingPrice(Math.round(calcItem.bestNetPrice * (1 + val / 100)));
                    }}
                    className="w-24 px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold"
                  />
                  <span className="text-xs text-slate-500">% lợi nhuận gộp</span>
                </div>
              </div>

              {/* Final Selling Price Input */}
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-200">
                <label className="block text-xs font-bold text-indigo-900 mb-1">
                  Giá bán đề xuất cho khách (VNĐ / {calcItem.product.unit})
                </label>
                <input
                  type="number"
                  step="1000"
                  value={customSellingPrice}
                  onChange={(e) => setCustomSellingPrice(Number(e.target.value) || 0)}
                  className="w-full text-xl font-black text-indigo-700 bg-white border border-indigo-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-400"
                />

                <div className="flex items-center justify-between text-xs text-indigo-800 font-semibold mt-2 pt-2 border-t border-indigo-100">
                  <span>Lãi dự kiến:</span>
                  <span className="text-emerald-700 font-bold">
                    +{formatVNDCurrency(computedProfit)} / {calcItem.product.unit} (
                    {calcItem.bestNetPrice > 0
                      ? Math.round((computedProfit / calcItem.bestNetPrice) * 100)
                      : 0}
                    %)
                  </span>
                </div>
              </div>

              {/* Additional Options */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeVAT}
                    onChange={(e) => setIncludeVAT(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Đã gồm VAT 10%</span>
                </label>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">Bảo hành (tháng)</label>
                  <input
                    type="number"
                    value={warrantyMonths}
                    onChange={(e) => setWarrantyMonths(Number(e.target.value) || 0)}
                    className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Ghi chú giao hàng</label>
                <input
                  type="text"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCalcItem(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={handleCopyCalculatedQuote}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                {copiedId === calcItem.product.id ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Đã chép nội dung Zalo</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Sao chép gửi Zalo khách</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

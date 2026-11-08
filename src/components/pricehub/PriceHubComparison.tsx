import React, { useState, useMemo } from 'react';
import {
  TrendingDown,
  Award,
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  Truck,
  CreditCard,
  CheckCircle2,
  Copy,
  Check,
  Search,
  Package,
  Layers,
  ArrowRight,
  Info,
  SlidersHorizontal,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { PriceProduct, Supplier, SupplierQuotation } from '../../types';
import {
  getProductPriceComparison,
  formatVNDCurrency,
  formatDateTimeVI,
} from '../../services/priceHubService';

interface PriceHubComparisonProps {
  products: PriceProduct[];
  suppliers: Supplier[];
  quotations: SupplierQuotation[];
  initialProductId?: string;
  onNavigateToNewQuote: (productId: string) => void;
  onNavigateToProductCatalog: () => void;
}

export const PriceHubComparison: React.FC<PriceHubComparisonProps> = ({
  products,
  suppliers,
  quotations,
  initialProductId,
  onNavigateToNewQuote,
  onNavigateToProductCatalog,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProductId || (products.length > 0 ? products[0].id : '')
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedSupplierId, setCopiedSupplierId] = useState<string | null>(null);

  // Selected product object
  const currentProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Product price comparison details
  const comparison = useMemo(() => {
    if (!selectedProductId) return null;
    return getProductPriceComparison(selectedProductId, quotations, suppliers);
  }, [selectedProductId, quotations, suppliers]);

  // Filtered product selector list
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const q = searchTerm.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.model && p.model.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q))
    );
  }, [products, searchTerm]);

  const handleCopyQuoteForSupplier = (supplierName: string, netPrice: number, stockStatus: string) => {
    if (!currentProduct) return;
    const text = `BÁO GIÁ KDT-89 [NPP: ${supplierName}]:
- Sản phẩm: ${currentProduct.name}
- Model: ${currentProduct.model || 'Tiêu chuẩn'} (${currentProduct.brand || 'Chính hãng'})
- Đơn vị tính: ${currentProduct.unit}
- Giá Net nhập: ${formatVNDCurrency(netPrice)}
- Tình trạng: ${stockStatus === 'in_stock' ? 'Có hàng sẵn' : 'Đặt hàng'}
Hotline KDT-89: 0987.654.321`;

    navigator.clipboard.writeText(text);
    setCopiedSupplierId(supplierName);
    setTimeout(() => setCopiedSupplierId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold mb-2">
            <TrendingDown className="w-3.5 h-3.5" />
            MODULE F: MA TRẬN SO SÁNH GIÁ NHÀ CUNG CẤP
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            So Sánh Báo Giá Giữa Các Nhà Phân Phối
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-2xl">
            Tự động xếp hạng từ giá thấp nhất đến cao nhất, tính chênh lệch, phân tách chiết khấu quà tặng, cảnh báo báo giá hết hạn và so sánh điều khoản giao hàng.
          </p>
        </div>

        {selectedProductId && (
          <button
            type="button"
            onClick={() => onNavigateToNewQuote(selectedProductId)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            + Thêm báo giá NPP cho sản phẩm này
          </button>
        )}
      </div>

      {/* Product Selector Dropdown / Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <label className="text-xs font-bold text-slate-700 shrink-0 flex items-center gap-1.5">
          <Package className="w-4 h-4 text-blue-600" />
          Chọn sản phẩm so sánh:
        </label>

        <div className="relative flex-1 w-full">
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full text-xs md:text-sm font-bold px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
          >
            {filteredProducts.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.code}] {p.name} {p.model ? `(Model: ${p.model})` : ''}{' '}
                {p.brand ? `[${p.brand}]` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Product Information Bar */}
      {currentProduct && (
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-5 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded">
                {currentProduct.code}
              </span>
              {currentProduct.brand && (
                <span className="text-xs font-bold bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded">
                  {currentProduct.brand}
                </span>
              )}
              {currentProduct.model && (
                <span className="text-xs font-bold bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded">
                  Model: {currentProduct.model}
                </span>
              )}
              <span className="text-xs text-slate-300">ĐVT: {currentProduct.unit}</span>
            </div>
            <h3 className="text-lg md:text-xl font-black text-white">{currentProduct.name}</h3>
            {currentProduct.specification && (
              <p className="text-xs text-slate-300 italic">
                Quy cách: {currentProduct.specification}
              </p>
            )}
          </div>

          {/* Quick Metrics */}
          {comparison && (
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/15">
              <div className="text-right">
                <span className="text-[10px] text-blue-200 block font-medium">Giá Net thấp nhất</span>
                <span className="text-xl font-black text-emerald-400">
                  {comparison.bestSupplierQuote
                    ? formatVNDCurrency(comparison.bestSupplierQuote.item.netPrice)
                    : 'Chưa có'}
                </span>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center">
                <span className="text-[10px] text-blue-200 block font-medium">NPP đã báo</span>
                <span className="text-base font-bold text-white">
                  {comparison.allQuotes.length} NPP
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comparison Matrix Table */}
      {comparison && comparison.allQuotes.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              Bảng Xếp Hạng & So Sánh Chi Tiết Báo Giá
            </span>

            <span className="text-xs text-slate-500">
              * Xếp theo <strong>Giá Net thực tế</strong> từ thấp đến cao
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase">
                  <th className="py-3 px-3 text-center">Xếp hạng</th>
                  <th className="py-3 px-4 min-w-[200px]">Nhà cung cấp</th>
                  <th className="py-3 px-3 text-right">Giá báo gốc</th>
                  <th className="py-3 px-3 text-center">Chiết khấu (%)</th>
                  <th className="py-3 px-3 text-right">Trừ quà / Tiền</th>
                  <th className="py-3 px-4 text-right font-black text-emerald-700 bg-emerald-50/50">
                    Giá Net thực tế
                  </th>
                  <th className="py-3 px-3 text-right">Chênh lệch</th>
                  <th className="py-3 px-3 text-center">Tình trạng kho</th>
                  <th className="py-3 px-3">Ngày báo</th>
                  <th className="py-3 px-3">Điều kiện giao / TT</th>
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparison.allQuotes.map((entry) => {
                  const { item, quote, supplier, isLowestNetPrice, priceDifference, rank } = entry;
                  const isStale =
                    Date.now() - new Date(quote.quoteDate).getTime() > 30 * 24 * 60 * 60 * 1000;
                  const isExpired = quote.validUntil && new Date(quote.validUntil) < new Date();

                  return (
                    <tr
                      key={`${quote.id}-${item.id}`}
                      className={`hover:bg-blue-50/30 transition-colors ${
                        isLowestNetPrice ? 'bg-emerald-50/30 font-medium' : ''
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3.5 px-3 text-center">
                        {isLowestNetPrice ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs shadow-xs">
                            #1
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold text-xs">
                            #{rank}
                          </span>
                        )}
                      </td>

                      {/* Supplier */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                          <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{supplier.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>Mã: {supplier.code}</span>
                          {supplier.phone && <span>• SĐT: {supplier.phone}</span>}
                        </div>
                      </td>

                      {/* Quoted Price */}
                      <td className="py-3.5 px-3 text-right font-medium text-slate-600">
                        {formatVNDCurrency(item.quotedPrice)}
                      </td>

                      {/* Discount % */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          {item.discountPercent || 0}%
                        </span>
                      </td>

                      {/* Cash or Gift Deduction */}
                      <td className="py-3.5 px-3 text-right text-slate-600">
                        {item.giftValue ? (
                          <div title={item.giftDescription}>
                            <span className="text-purple-700 font-bold">
                              -{formatVNDCurrency(Math.round(item.giftValue / (item.minQuantity || 1)))}
                            </span>
                            <span className="block text-[10px] text-purple-500 truncate max-w-[100px]">
                              Quà tặng
                            </span>
                          </div>
                        ) : item.discountAmount ? (
                          <span className="text-slate-700 font-bold">
                            -{formatVNDCurrency(item.discountAmount)}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Net Price (Crucial result) */}
                      <td className="py-3.5 px-4 text-right bg-emerald-50/50">
                        <div className="text-base font-black text-emerald-600">
                          {formatVNDCurrency(item.netPrice)}
                        </div>
                        {isLowestNetPrice && (
                          <span className="inline-block text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded mt-0.5">
                            RẺ NHẤT
                          </span>
                        )}
                      </td>

                      {/* Difference vs Best Price */}
                      <td className="py-3.5 px-3 text-right">
                        {isLowestNetPrice ? (
                          <span className="text-xs font-bold text-emerald-600">Chuẩn giá</span>
                        ) : (
                          <span className="text-xs font-bold text-rose-600">
                            +{formatVNDCurrency(priceDifference)}
                          </span>
                        )}
                      </td>

                      {/* Stock Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.stockStatus === 'in_stock'
                              ? 'bg-emerald-50 text-emerald-700'
                              : item.stockStatus === 'pre_order'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {item.stockStatus === 'in_stock'
                            ? 'Có sẵn'
                            : item.stockStatus === 'pre_order'
                            ? `Đặt (${item.leadTimeDays || 3}d)`
                            : 'Hết hàng'}
                        </span>
                      </td>

                      {/* Date & Alert */}
                      <td className="py-3.5 px-3">
                        <div className="text-slate-700 font-medium text-xs">
                          {formatDateTimeVI(quote.quoteDate)}
                        </div>
                        {isStale && (
                          <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            Giá cũ (&gt;30d)
                          </span>
                        )}
                        {isExpired && (
                          <span className="text-[10px] font-bold text-rose-700 flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            Hết hạn
                          </span>
                        )}
                      </td>

                      {/* Terms */}
                      <td className="py-3.5 px-3 text-[11px] text-slate-500">
                        {quote.paymentTerms && <div>TT: {quote.paymentTerms}</div>}
                        {quote.deliveryTerms && <div>Giao: {quote.deliveryTerms}</div>}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyQuoteForSupplier(supplier.name, item.netPrice, item.stockStatus)
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          title="Sao chép báo giá của NPP này"
                        >
                          {copiedSupplierId === supplier.name ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Chép</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Decision advice note */}
          <div className="p-4 bg-amber-50/70 border-t border-amber-200 text-xs text-amber-900 rounded-b-2xl flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Lưu ý quyết định lựa chọn NPP:</strong> Giá thấp nhất chưa hẳn là tối ưu nhất.
              Bộ phận mua hàng và Sale cần cân nhắc thêm <strong>thời gian giao hàng</strong> (hàng có sẵn hay phải chờ đặt), <strong>điều kiện thanh toán công nợ</strong> và <strong>uy tín chất lượng chính hãng</strong> của nhà phân phối.
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <TrendingDown className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-800 mb-1">
            Chưa có báo giá nào cho sản phẩm này
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
            Hãy liên hệ các nhà phân phối để cập nhật giá hoặc nhập bảng giá từ file Excel/CSV.
          </p>
          {selectedProductId && (
            <button
              type="button"
              onClick={() => onNavigateToNewQuote(selectedProductId)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nhập báo giá đầu tiên
            </button>
          )}
        </div>
      )}
    </div>
  );
};

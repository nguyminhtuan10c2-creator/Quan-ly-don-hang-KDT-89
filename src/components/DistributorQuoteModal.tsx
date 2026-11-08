import React, { useState, useMemo } from 'react';
import {
  X,
  Building2,
  Calendar,
  Gift,
  DollarSign,
  Calculator,
  TrendingUp,
  CheckCircle2,
  Trash2,
  Sparkles,
  Award,
  Package,
  Phone,
  Clock,
  ArrowRight,
  Copy,
  Check,
  Tag,
  ShieldCheck,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { Product, DistributorQuote } from '../types';
import {
  formatVND,
  formatDateVI,
  formatDateTimeVI,
  DISTRIBUTOR_PRESETS,
  getAllDistributorNames,
  addDistributorQuoteToProduct,
  deleteDistributorQuoteFromProduct,
  getActiveStaff,
} from '../services/storageService';

interface DistributorQuoteModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated?: (updatedProduct: Product) => void;
}

export const DistributorQuoteModal: React.FC<DistributorQuoteModalProps> = ({
  product,
  isOpen,
  onClose,
  onProductUpdated,
}) => {
  if (!isOpen) return null;

  const activeStaff = getActiveStaff();
  const availableDistributors = getAllDistributorNames();

  const [activeTab, setActiveTab] = useState<'calculator' | 'history'>('calculator');

  // Calculator Form State
  const [distributorName, setDistributorName] = useState<string>(
    product.distributorName || DISTRIBUTOR_PRESETS[0]
  );
  const [isCustomDistributor, setIsCustomDistributor] = useState<boolean>(false);
  const [customDistributorInput, setCustomDistributorInput] = useState<string>('');

  const [quoteDate, setQuoteDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [quotedPrice, setQuotedPrice] = useState<number | ''>(
    product.distributorBasePrice || product.costPrice || product.price ? Math.round(product.price * 0.78) : 10000000
  );
  const [minQuantity, setMinQuantity] = useState<number | ''>(
    product.distributorMinQuantity || 5
  );

  // Promotion / Gift details
  const [hasGift, setHasGift] = useState<boolean>(
    Boolean(product.distributorGiftDesc || (product.distributorGiftValue && product.distributorGiftValue > 0))
  );
  const [giftDescription, setGiftDescription] = useState<string>(
    product.distributorGiftDesc || 'Tặng kèm quà / Chiết khấu combo'
  );
  const [giftValue, setGiftValue] = useState<number | ''>(
    product.distributorGiftValue || 1000000
  );

  const [inStockAtDistributor, setInStockAtDistributor] = useState<boolean>(true);
  const [contactPerson, setContactPerson] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [applyAsCostPrice, setApplyAsCostPrice] = useState<boolean>(true);

  // Profit Margin Calculator for Retail Quotation
  const [desiredMarginPct, setDesiredMarginPct] = useState<number>(10);
  const [copiedQuoteNotice, setCopiedQuoteNotice] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Real-time calculations
  const parsedPrice = typeof quotedPrice === 'number' ? quotedPrice : 0;
  const parsedMinQty = typeof minQuantity === 'number' && minQuantity > 0 ? minQuantity : 1;
  const parsedGiftValue = hasGift && typeof giftValue === 'number' && giftValue > 0 ? giftValue : 0;

  const discountPerUnit = Math.round(parsedGiftValue / parsedMinQty);
  const netCostPerUnit = Math.max(0, parsedPrice - discountPerUnit);
  const totalRawBatchValue = parsedPrice * parsedMinQty;
  const totalNetBatchValue = netCostPerUnit * parsedMinQty;
  const totalSavedOnBatch = totalRawBatchValue - totalNetBatchValue;

  // Suggested Retail Price
  const suggestedRetailPrice = Math.round(netCostPerUnit * (1 + desiredMarginPct / 100) / 10000) * 10000;
  const projectedProfitPerUnit = suggestedRetailPrice - netCostPerUnit;

  // Sorted quotes list (by lowest net cost first)
  const quotesList = useMemo(() => {
    return Array.isArray(product.distributorQuotes) ? product.distributorQuotes : [];
  }, [product.distributorQuotes]);

  const bestQuote = useMemo(() => {
    if (quotesList.length === 0) return null;
    return [...quotesList].sort((a, b) => a.netCostPerUnit - b.netCostPerUnit)[0];
  }, [quotesList]);

  // Handler: Save quote to product
  const handleSaveQuote = (e: React.FormEvent) => {
    e.preventDefault();
    const finalDistributorName = isCustomDistributor
      ? customDistributorInput.trim()
      : distributorName.trim();

    if (!finalDistributorName) {
      alert('Vui lòng chọn hoặc nhập tên Nhà phân phối báo giá!');
      return;
    }

    if (!parsedPrice || parsedPrice <= 0) {
      alert('Vui lòng nhập giá báo từ Nhà phân phối hợp lệ!');
      return;
    }

    const updated = addDistributorQuoteToProduct(product.id, {
      distributorName: finalDistributorName,
      quoteDate,
      quotedPrice: parsedPrice,
      minQuantity: parsedMinQty,
      giftDescription: hasGift ? giftDescription : undefined,
      giftValue: hasGift ? parsedGiftValue : 0,
      inStockAtDistributor,
      contactPerson,
      note,
      updatedBy: activeStaff?.employeeName || 'Quản lý kho',
      applyAsCostPrice,
    });

    if (updated) {
      setSaveSuccessMsg(`Đã lưu thành công báo giá từ "${finalDistributorName}"! Giá Net: ${formatVND(netCostPerUnit)}/c`);
      if (onProductUpdated) {
        onProductUpdated(updated);
      }
      setTimeout(() => {
        setSaveSuccessMsg(null);
        setActiveTab('history');
      }, 1500);
    }
  };

  // Handler: Delete Quote
  const handleDeleteQuote = (quoteId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa báo giá này khỏi lịch sử?')) {
      const updated = deleteDistributorQuoteFromProduct(product.id, quoteId);
      if (updated && onProductUpdated) {
        onProductUpdated(updated);
      }
    }
  };

  // Handler: Copy fast customer quote message
  const handleCopyCustomerQuote = () => {
    const textToCopy = `Báo giá sản phẩm: ${product.name} (SKU: ${product.sku})
- Giá bán ưu đãi: ${formatVND(suggestedRetailPrice)}
- Tình trạng: ${inStockAtDistributor ? 'Sẵn sàng giao hàng' : 'Hàng đặt 1-2 ngày'}
- Bảo hành chính hãng: ${product.warrantyMonths || 12} tháng
- Hỗ trợ giao tận nơi và lắp đặt.
Liên hệ: Điện Máy KDT-89 Logistics (0977 11 88 99)`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedQuoteNotice(true);
    setTimeout(() => setCopiedQuoteNotice(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-6 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Calculator className="w-4 h-4 text-amber-400" />
                <span>Theo Dõi Báo Giá Nhà Phân Phối & Tính Giá Net Sau Trừ Quà</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white truncate" title={product.name}>
                {product.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                <span className="font-mono bg-white/10 text-slate-300 px-2 py-0.5 rounded-md text-[11px]">
                  SKU: {product.sku}
                </span>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md text-[11px] font-bold">
                  {product.category}
                </span>
                {product.brand && (
                  <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md text-[11px] font-bold">
                    Hãng: {product.brand}
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                  product.stock > 0
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {product.stock > 0 ? `Tồn kho: ${product.stock} chiếc` : 'Hàng đi hỏi / Báo giá theo yêu cầu'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-2 mt-5 border-t border-slate-800 pt-3">
            <button
              type="button"
              onClick={() => setActiveTab('calculator')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                activeTab === 'calculator'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calculator className="w-4 h-4 text-amber-300" />
              <span>Bộ Tính Giá Net & Thêm Báo Giá NPP</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Lịch Sử Báo Giá ({quotesList.length})</span>
              {bestQuote && (
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-md ml-1">
                  Giá tốt: {formatVND(bestQuote.netCostPerUnit)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
          {saveSuccessMsg && (
            <div className="bg-emerald-600 text-white p-3.5 rounded-2xl flex items-center space-x-2 shadow-lg animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
              <span className="text-xs font-bold">{saveSuccessMsg}</span>
            </div>
          )}

          {activeTab === 'calculator' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (7 cols): Input Parameters Form */}
              <form onSubmit={handleSaveQuote} className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    1. Thông tin Báo giá từ Nhà phân phối (NPP)
                  </h3>
                </div>

                {/* Distributor Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Nhà phân phối (NPP) báo giá: *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomDistributor(!isCustomDistributor)}
                      className="text-[11px] text-indigo-600 hover:underline font-bold"
                    >
                      {isCustomDistributor ? 'Chọn từ danh sách có sẵn' : '+ Nhập tên NPP khác'}
                    </button>
                  </div>

                  {isCustomDistributor ? (
                    <input
                      type="text"
                      required
                      placeholder="Nhập tên NPP hoặc đại lý báo giá (VD: NPP Daikin Tân Bình, NPP Chợ Lớn...)"
                      value={customDistributorInput}
                      onChange={(e) => setCustomDistributorInput(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 border border-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 bg-white"
                    />
                  ) : (
                    <select
                      value={distributorName}
                      onChange={(e) => setDistributorName(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 bg-white"
                    >
                      {availableDistributors.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Quote Date & Stock Availability */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ngày hỏi / Cập nhật giá: *
                    </label>
                    <input
                      type="date"
                      required
                      value={quoteDate}
                      onChange={(e) => setQuoteDate(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tình trạng hàng bên NPP:
                    </label>
                    <select
                      value={inStockAtDistributor ? 'yes' : 'no'}
                      onChange={(e) => setInStockAtDistributor(e.target.value === 'yes')}
                      className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 bg-white"
                    >
                      <option value="yes">✓ Còn hàng tại kho NPP (Giao ngay)</option>
                      <option value="no">⏳ Hàng đặt 1-2 ngày / Tạm hết</option>
                    </select>
                  </div>
                </div>

                {/* Price & Minimum Quantity Tier */}
                <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100 space-y-3">
                  <div className="flex items-center space-x-1.5 text-indigo-900 font-extrabold text-xs">
                    <DollarSign className="w-4 h-4 text-indigo-600" />
                    <span>Giá báo niêm yết & Số lượng áp dụng (Bậc giá)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Giá báo NPP (cho 1 con) - VNĐ: *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="10000"
                        required
                        placeholder="VD: 10000000"
                        value={quotedPrice}
                        onChange={(e) => setQuotedPrice(e.target.value ? Number(e.target.value) : '')}
                        className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-black text-indigo-900 bg-white"
                      />
                      <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                        Bằng chữ: {formatVND(parsedPrice)}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Bậc số lượng mua (Min con): *
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="VD: 5"
                        value={minQuantity}
                        onChange={(e) => setMinQuantity(e.target.value ? Number(e.target.value) : '')}
                        className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-black text-slate-900 bg-white"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Số lượng tối thiểu NPP yêu cầu để được giá này (VD: 5 con)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Gift / Promotional Deduction Section */}
                <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Gift className="w-4 h-4 text-amber-600" />
                      <span className="font-extrabold text-xs text-amber-950">
                        Chương trình quà tặng quy đổi / Chiết khấu trừ vào giá
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasGift}
                        onChange={(e) => setHasGift(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                      <span className="ml-2 text-xs font-bold text-slate-700">
                        {hasGift ? 'Có quà tặng / chiết khấu' : 'Không có quà'}
                      </span>
                    </label>
                  </div>

                  {hasGift && (
                    <div className="space-y-3 pt-2 border-t border-amber-200/60 animate-in fade-in duration-150">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Tên quà tặng kèm từ NPP:
                        </label>
                        <input
                          type="text"
                          placeholder="VD: Tặng Nồi chiên không dầu Lock&Lock / Quạt lửng Senko / Chiết khấu thương mại"
                          value={giftDescription}
                          onChange={(e) => setGiftDescription(e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-medium bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Tổng giá trị quà quy đổi thành tiền (VNĐ):
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="10000"
                            placeholder="VD: 1500000"
                            value={giftValue}
                            onChange={(e) => setGiftValue(e.target.value ? Number(e.target.value) : '')}
                            className="w-full text-xs px-3.5 py-2.5 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-black text-rose-700 bg-white"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">
                            Quy đổi: {formatVND(parsedGiftValue)}
                          </p>
                        </div>

                        <div className="bg-white p-2.5 rounded-xl border border-amber-200 flex flex-col justify-center">
                          <span className="text-[10px] font-bold text-slate-500">
                            Giá trị quà trừ vào mỗi con ({parsedMinQty} con):
                          </span>
                          <span className="text-sm font-black text-emerald-700 mt-0.5">
                            -{formatVND(discountPerUnit)} / con
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Contact Person & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Người phụ trách / SĐT NPP báo giá:
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Anh Hải Daikin (0909 123 456)"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ghi chú thêm về điều kiện giá:
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Giá áp dụng hết tuần, bao giao kho Q8..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                </div>

                {/* Apply as Cost Price Checkbox */}
                <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                  <input
                    type="checkbox"
                    id="applyCost"
                    checked={applyAsCostPrice}
                    onChange={(e) => setApplyAsCostPrice(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="applyCost" className="text-xs font-bold text-slate-800 cursor-pointer">
                    Đồng thời cập nhật giá Net này làm <strong>Giá Vốn (Cost Price)</strong> của sản phẩm trong kho
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-black py-3 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>LƯU BÁO GIÁ NHÀ PHÂN PHỐI NÀY</span>
                </button>
              </form>

              {/* Right Column (5 cols): Interactive Result Board & Customer Quote Generator */}
              <div className="lg:col-span-5 space-y-4">
                {/* Result Card: Net Cost Per Unit */}
                <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-xl border border-indigo-800/60 space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Calculator className="w-28 h-28 text-white" />
                  </div>

                  <div className="border-b border-white/10 pb-3">
                    <span className="text-[10px] uppercase font-black tracking-widest text-indigo-300 block">
                      Kết Quả Tính Giá Net Thực Tế
                    </span>
                    <h4 className="text-sm font-extrabold text-white mt-0.5">
                      {isCustomDistributor ? (customDistributorInput || 'NPP Mới') : distributorName}
                    </h4>
                  </div>

                  {/* Calculations breakdown */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Giá niêm yết NPP (1 con):</span>
                      <span className="font-bold text-white">{formatVND(parsedPrice)}</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-300">
                      <span>Số lượng mua theo bậc:</span>
                      <span className="font-extrabold text-indigo-300">{parsedMinQty} con</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-300">
                      <span>Tổng tiền hàng lô {parsedMinQty} con:</span>
                      <span className="font-bold text-slate-200">{formatVND(totalRawBatchValue)}</span>
                    </div>

                    {hasGift && (
                      <div className="flex justify-between items-center text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                        <span className="truncate pr-2">Trừ quà: {giftDescription}</span>
                        <span className="font-black shrink-0">-{formatVND(parsedGiftValue)}</span>
                      </div>
                    )}

                    {hasGift && (
                      <div className="flex justify-between items-center text-emerald-300">
                        <span>Chiết khấu quà trừ mỗi con:</span>
                        <span className="font-bold">-{formatVND(discountPerUnit)} / con</span>
                      </div>
                    )}

                    {/* BIG HIGHLIGHT: NET COST */}
                    <div className="bg-gradient-to-r from-emerald-950/80 to-indigo-950/90 border-2 border-emerald-500/50 p-3.5 rounded-xl mt-3 space-y-1">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-black text-emerald-400 uppercase tracking-wide">
                          Giá Nhập Net Sau Trừ Quà:
                        </span>
                        <span className="text-xl font-black text-emerald-300">
                          {formatVND(netCostPerUnit)}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300">
                        {hasGift
                          ? `Tiết kiệm được ${formatVND(totalSavedOnBatch)} trên lô ${parsedMinQty} con so với giá niêm yết!`
                          : 'Giá nhập gốc trực tiếp không qua quà tặng.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Instant Retail Quote Generator for Sales Staff */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
                  <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h4 className="font-extrabold text-slate-900 text-xs">
                      Công Cụ Báo Giá Nhanh Cho Khách Lẻ
                    </h4>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 flex justify-between">
                      <span>Chọn tỷ suất biên lợi nhuận mong muốn:</span>
                      <strong className="text-indigo-600">{desiredMarginPct}%</strong>
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[5, 8, 10, 12, 15, 20].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setDesiredMarginPct(pct)}
                          className={`flex-1 py-1 text-[11px] rounded-lg font-bold border transition-colors cursor-pointer ${
                            desiredMarginPct === pct
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          +{pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calculated Price to Quote */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-slate-600">Giá bán đề xuất báo khách:</span>
                      <span className="text-base font-black text-indigo-700">
                        {formatVND(suggestedRetailPrice)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-slate-500">
                      <span>Lợi nhuận dự kiến thu về:</span>
                      <span className="font-extrabold text-emerald-600">
                        +{formatVND(projectedProfitPerUnit)} / chiếc
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-slate-500">
                      <span>Giá niêm yết hiện tại trên web:</span>
                      <span className="font-semibold text-slate-700">
                        {formatVND(product.price)}
                      </span>
                    </div>
                  </div>

                  {/* Copy Fast Quote Message */}
                  <button
                    type="button"
                    onClick={handleCopyCustomerQuote}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl shadow-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    {copiedQuoteNotice ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>ĐÃ SAO CHÉP BÁO GIÁ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-indigo-300" />
                        <span>Sao chép tin nhắn báo giá gửi khách</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: HISTORY & DISTRIBUTOR COMPARISON TABLE */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-4 rounded-2xl border border-slate-200">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>Lịch Sử Báo Giá Các Nhà Phân Phối ({quotesList.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    So sánh giá báo gốc, quà tặng quy đổi và giá Net thực tế từ các nguồn hàng khác nhau.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('calculator')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer shrink-0"
                >
                  <Calculator className="w-4 h-4 text-amber-300" />
                  <span>+ Thêm báo giá mới</span>
                </button>
              </div>

              {quotesList.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 space-y-3">
                  <Package className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700 text-sm">Chưa có báo giá nào được lưu cho sản phẩm này.</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Hãy sử dụng bộ tính giá ở Tab 1 để ghi nhận báo giá từ NPP Daikin, Chợ Lớn hoặc các nguồn hàng khác.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('calculator')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl inline-flex items-center space-x-1.5"
                  >
                    <span>Tính và thêm báo giá ngay</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {quotesList.map((q, idx) => {
                    const isLowestNet = bestQuote && q.id === bestQuote.id;
                    return (
                      <div
                        key={q.id || idx}
                        className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all ${
                          isLowestNet
                            ? 'border-emerald-400 shadow-md ring-2 ring-emerald-500/20'
                            : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-black text-slate-900 text-sm sm:text-base flex items-center space-x-1.5">
                                <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                                <span>{q.distributorName}</span>
                              </span>

                              {isLowestNet && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300 flex items-center space-x-1">
                                  <Award className="w-3 h-3 text-emerald-600" />
                                  <span>★ GIÁ NET TỐT NHẤT</span>
                                </span>
                              )}

                              <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                                Ngày báo: {formatDateVI(q.quoteDate)}
                              </span>
                            </div>

                            {/* Terms & Gift */}
                            <div className="mt-2 text-xs space-y-1">
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
                                <span>
                                  Giá niêm yết NPP: <strong className="text-slate-900">{formatVND(q.quotedPrice)}</strong>
                                </span>
                                <span>
                                  SL áp dụng: <strong className="text-indigo-700">{q.minQuantity} con</strong>
                                </span>
                                <span>
                                  Tình trạng: <span className={q.inStockAtDistributor !== false ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                                    {q.inStockAtDistributor !== false ? 'Còn hàng tại NPP' : 'Đặt 1-2 ngày'}
                                  </span>
                                </span>
                              </div>

                              {q.giftDescription && (
                                <div className="text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg inline-block text-[11px] font-bold mt-1">
                                  🎁 {q.giftDescription} {q.giftValue ? `(Quy đổi: -${formatVND(q.giftValue)})` : ''}
                                </div>
                              )}

                              {(q.contactPerson || q.note) && (
                                <p className="text-[11px] text-slate-500 mt-1">
                                  {q.contactPerson && <span className="font-semibold text-slate-700 mr-2">Liên hệ: {q.contactPerson}</span>}
                                  {q.note && <span className="italic">"{q.note}"</span>}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Right side: Net Cost & Actions */}
                          <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2 shrink-0">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 font-bold block uppercase">
                                Giá Net Sau Trừ Quà
                              </span>
                              <span className="text-base sm:text-lg font-black text-emerald-700">
                                {formatVND(q.netCostPerUnit)}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteQuote(q.id)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                              title="Xóa báo giá này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Xóa</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            Mẹo: Giá Net sau trừ quà sẽ giúp cửa hàng chốt đơn giá cạnh tranh nhất mà vẫn bảo toàn biên lợi nhuận.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            Đóng Cửa Sổ
          </button>
        </div>
      </div>
    </div>
  );
};

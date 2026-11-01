import React, { useState, useRef } from 'react';
import {
  Upload,
  Camera,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Package,
  Building2,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  Printer,
  Loader2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Product } from '../types';
import {
  formatVND,
  formatDateVI,
  quickUpdateProductStockAndPrice,
  saveProduct,
  getProducts,
} from '../services/storageService';
import {
  ScannedDistributorReceipt,
  ScannedReceiptItem,
  scanReceiptWithGemini,
  SAMPLE_RECEIPTS,
} from '../services/receiptOcrService';

interface DistributorReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (importedCount: number, totalCost: number) => void;
}

export const DistributorReceiptScannerModal: React.FC<DistributorReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ScannedDistributorReceipt | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);
  const [showPrintSlip, setShowPrintSlip] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentProducts = getProducts();

  if (!isOpen) return null;

  // Process File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setScanError('Vui lòng chọn file hình ảnh (PNG, JPG, JPEG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      await runOcr(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  // Run AI OCR
  const runOcr = async (base64: string, mimeType: string = 'image/jpeg') => {
    setIsScanning(true);
    setScanError(null);
    setImportSuccess(false);

    try {
      const parsed = await scanReceiptWithGemini(base64, mimeType);
      // Match each scanned item with existing warehouse products
      const matchedItems = parsed.items.map((item) => {
        const found = currentProducts.find(
          (p) =>
            p.sku.toLowerCase() === item.sku.toLowerCase() ||
            p.name.toLowerCase().includes(item.productName.toLowerCase()) ||
            item.productName.toLowerCase().includes(p.name.toLowerCase())
        );

        return {
          ...item,
          matchedProductId: found?.id,
          currentStock: found?.stock || 0,
          sku: found?.sku || item.sku,
        };
      });

      setReceiptData({
        ...parsed,
        items: matchedItems,
      });
    } catch (err: any) {
      setScanError(err.message || 'Lỗi bóc tách phiếu nhập hàng');
    } finally {
      setIsScanning(false);
    }
  };

  // Load sample template for quick testing
  const handleLoadSample = async (key: 'daikin' | 'sunhouse' | 'panasonic') => {
    setIsScanning(true);
    setScanError(null);
    setImportSuccess(false);

    // Simulate AI parsing animation
    setTimeout(() => {
      const sample = SAMPLE_RECEIPTS[key];
      const matchedItems = sample.items.map((item) => {
        const found = currentProducts.find(
          (p) =>
            p.sku.toLowerCase() === item.sku.toLowerCase() ||
            p.name.toLowerCase().includes(item.productName.toLowerCase())
        );
        return {
          ...item,
          matchedProductId: found?.id,
          currentStock: found?.stock || 0,
          sku: found?.sku || item.sku,
        };
      });

      setReceiptData({
        ...sample,
        items: matchedItems,
      });
      setImagePreview(null);
      setIsScanning(false);
    }, 600);
  };

  // Handle line item field edit
  const handleItemChange = (index: number, field: keyof ScannedReceiptItem, value: any) => {
    if (!receiptData) return;
    const updated = [...receiptData.items];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    if (field === 'quantity' || field === 'unitCost') {
      const qty = field === 'quantity' ? Number(value) : updated[index].quantity;
      const cost = field === 'unitCost' ? Number(value) : updated[index].unitCost;
      updated[index].totalAmount = qty * cost;
    }
    const totalAmount = updated.reduce((s, it) => s + it.totalAmount, 0);
    setReceiptData({
      ...receiptData,
      items: updated,
      totalAmount,
    });
  };

  // Remove line item
  const handleRemoveItem = (index: number) => {
    if (!receiptData) return;
    const updated = receiptData.items.filter((_, idx) => idx !== index);
    const totalAmount = updated.reduce((s, it) => s + it.totalAmount, 0);
    setReceiptData({
      ...receiptData,
      items: updated,
      totalAmount,
    });
  };

  // Confirm import and update warehouse stock
  const handleConfirmImport = async () => {
    if (!receiptData || receiptData.items.length === 0) return;
    setIsImporting(true);

    try {
      const nowStr = new Date().toISOString();
      const receiptCode = receiptData.receiptNumber || `PNK-${Date.now().toString().slice(-6)}`;
      const noteStr = `Nhập kho theo phiếu NCC [${receiptData.supplierName}] - Số phiếu: ${receiptCode}`;

      let count = 0;
      for (const item of receiptData.items) {
        if (item.matchedProductId) {
          // Existing product -> update stock (+quantity) and costPrice
          const existing = currentProducts.find((p) => p.id === item.matchedProductId);
          const oldStock = existing?.stock || 0;
          quickUpdateProductStockAndPrice(item.matchedProductId, {
            stock: oldStock + item.quantity,
            costPrice: item.unitCost,
            price: item.suggestedPrice || existing?.price,
            stockNote: noteStr,
            updatedBy: 'Thủ kho (AI Receipt)',
          });
          count++;
        } else {
          // New product -> create in warehouse inventory
          saveProduct({
            name: item.productName,
            sku: item.sku,
            category: item.category || 'Thiết bị gia dụng',
            brand: 'Chính hãng',
            stock: item.quantity,
            price: item.suggestedPrice || Math.round(item.unitCost * 1.25),
            costPrice: item.unitCost,
            isWarrantyEligible: true,
            warrantyMonths: 12,
            activationBonusAmount: 50000,
            priceNote: noteStr,
            priceUpdatedBy: 'Thủ kho (AI Receipt)',
          });
          count++;
        }
      }

      setImportSuccess(true);
      if (onImportComplete) {
        onImportComplete(count, receiptData.totalAmount);
      }
    } catch (err: any) {
      setScanError(err.message || 'Lỗi khi nhập kho');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base text-white">
                  Nhập Hàng Từ Nhà Phân Phối Bằng AI (OCR Vision)
                </h3>
                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded-full border border-indigo-500/30 font-bold">
                  Gemini AI 3.8
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Chụp hoặc kéo thả phiếu giao hàng / hóa đơn mua hàng từ nhà cung cấp để tự động nhập kho & cập nhật giá vốn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Top Info Banner & Sample Quick-Fill */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="flex items-start space-x-2.5">
              <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-slate-900">
                  Tối ưu cho Máy Tính (Desktop) & Điện Thoại
                </p>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  AI tự động trích xuất: Tên Nhà Phân Phối, Mã phiếu, Model/SKU, Số lượng nhập và Đơn giá vốn. Tự động đối chiếu với 328 sản phẩm trong kho.
                </p>
              </div>
            </div>

            {/* Quick Test Demo Templates */}
            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-[11px] font-bold text-slate-600">Thử phiếu mẫu:</span>
              <button
                type="button"
                onClick={() => handleLoadSample('daikin')}
                className="px-2.5 py-1.5 bg-white hover:bg-blue-50 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 shadow-xs transition-colors"
              >
                Daikin
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('sunhouse')}
                className="px-2.5 py-1.5 bg-white hover:bg-amber-50 text-amber-800 font-bold text-xs rounded-xl border border-amber-200 shadow-xs transition-colors"
              >
                Sunhouse
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('panasonic')}
                className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 shadow-xs transition-colors"
              >
                Panasonic
              </button>
            </div>
          </div>

          {/* Upload / Drag & Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = async (ev) => {
                  const b64 = ev.target?.result as string;
                  setImagePreview(b64);
                  await runOcr(b64, file.type);
                };
                reader.readAsDataURL(file);
              }
            }}
            className="border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/60 transition-all rounded-3xl p-6 sm:p-8 text-center cursor-pointer group"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                {isScanning ? (
                  <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
                ) : (
                  <Upload className="w-7 h-7" />
                )}
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">
                  {isScanning ? 'Gemini AI đang bóc tách phiếu nhập...' : 'Kéo thả hoặc Bấm để tải ảnh phiếu nhập hàng'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Hỗ trợ chụp từ camera điện thoại, file ảnh hóa đơn đỏ VAT, phiếu xuất kho kiêm vận chuyển nội bộ
                </p>
              </div>
            </div>
          </div>

          {/* Error notice */}
          {scanError && (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          {/* Parsed Receipt Result Section */}
          {receiptData && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Receipt Metadata Bar */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                      Nhà Cung Cấp / Phân Phối:
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-amber-300">
                    {receiptData.supplierName}
                  </h4>
                  <div className="flex items-center space-x-3 text-xs text-slate-300 pt-1">
                    <span>
                      Số phiếu: <strong className="text-white">{receiptData.receiptNumber}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      <span>{formatDateVI(receiptData.date)}</span>
                    </span>
                  </div>
                </div>

                <div className="text-left md:text-right bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                  <span className="text-xs text-slate-400 block font-bold">Tổng tiền lô hàng nhập:</span>
                  <span className="text-xl font-black text-emerald-400">
                    {formatVND(receiptData.totalAmount)}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Gồm {receiptData.items.reduce((s, it) => s + it.quantity, 0)} sản phẩm ({receiptData.items.length} danh mục)
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-slate-900 flex items-center space-x-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span>Danh sách sản phẩm bóc tách từ phiếu (Có thể chỉnh sửa trước khi lưu kho)</span>
                  </h4>
                  <span className="text-xs text-slate-500 font-bold">
                    {receiptData.items.length} mặt hàng
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase">
                        <th className="py-3 px-3">Tên sản phẩm & Model</th>
                        <th className="py-3 px-3 text-center">Trạng thái kho</th>
                        <th className="py-3 px-3 text-center">SL Nhập</th>
                        <th className="py-3 px-3 text-right">Đơn giá vốn (VNĐ)</th>
                        <th className="py-3 px-3 text-right">Giá bán đề xuất</th>
                        <th className="py-3 px-3 text-right">Thành tiền</th>
                        <th className="py-3 px-2 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {receiptData.items.map((item, idx) => {
                        const isMatched = Boolean(item.matchedProductId);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Product Name & SKU */}
                            <td className="py-3 px-3 max-w-[260px]">
                              <input
                                type="text"
                                value={item.productName}
                                onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                                className="w-full font-bold text-xs text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 focus:outline-none"
                              />
                              <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-1">
                                <span>SKU:</span>
                                <input
                                  type="text"
                                  value={item.sku}
                                  onChange={(e) => handleItemChange(idx, 'sku', e.target.value)}
                                  className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200"
                                />
                                <span>• {item.unit}</span>
                              </div>
                            </td>

                            {/* Inventory Match Badge */}
                            <td className="py-3 px-3 text-center">
                              {isMatched ? (
                                <div className="inline-block text-center">
                                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300">
                                    Đã có trong kho
                                  </span>
                                  <p className="text-[10px] text-slate-500 mt-0.5">
                                    Tồn cũ: <strong>{item.currentStock}</strong> ➔ Mới:{' '}
                                    <strong className="text-emerald-700">
                                      {(item.currentStock || 0) + item.quantity}
                                    </strong>
                                  </p>
                                </div>
                              ) : (
                                <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-300">
                                  Sản phẩm mới
                                </span>
                              )}
                            </td>

                            {/* Quantity */}
                            <td className="py-3 px-3 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleItemChange(idx, 'quantity', Math.max(1, Number(e.target.value)))
                                }
                                className="w-16 text-center font-extrabold text-xs py-1.5 px-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </td>

                            {/* Unit Cost */}
                            <td className="py-3 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                step="10000"
                                value={item.unitCost}
                                onChange={(e) =>
                                  handleItemChange(idx, 'unitCost', Math.max(0, Number(e.target.value)))
                                }
                                className="w-28 text-right font-bold text-xs py-1.5 px-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </td>

                            {/* Suggested Selling Price */}
                            <td className="py-3 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                step="10000"
                                value={item.suggestedPrice}
                                onChange={(e) =>
                                  handleItemChange(idx, 'suggestedPrice', Math.max(0, Number(e.target.value)))
                                }
                                className="w-28 text-right font-bold text-xs text-blue-700 py-1.5 px-2 bg-blue-50/50 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </td>

                            {/* Line Total */}
                            <td className="py-3 px-3 text-right font-black text-slate-900">
                              {formatVND(item.totalAmount)}
                            </td>

                            {/* Delete button */}
                            <td className="py-3 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Success confirmation notification */}
              {importSuccess && (
                <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl flex items-center justify-between text-xs text-emerald-800 shadow-xs animate-in zoom-in-95">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-extrabold text-sm text-emerald-950">
                        Đã nhập kho thành công và tự động đồng bộ lên Cloud Firebase!
                      </p>
                      <p className="text-[11px] text-emerald-700">
                        Số lượng tồn kho và giá vốn đã được cập nhật ngay lập tức trên cả điện thoại và máy tính.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPrintSlip(true)}
                    className="min-h-[44px] px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>In Phiếu Nhập Kho</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {receiptData ? (
              <span>
                Tổng số lượng nhập:{' '}
                <strong className="text-slate-900">
                  {receiptData.items.reduce((s, it) => s + it.quantity, 0)} chiếc
                </strong>{' '}
                • Tổng tiền: <strong className="text-blue-700">{formatVND(receiptData.totalAmount)}</strong>
              </span>
            ) : (
              <span>Chưa có dữ liệu phiếu nhập</span>
            )}
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl flex-1 sm:flex-none transition-colors"
            >
              Đóng
            </button>

            {receiptData && !importSuccess && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting || receiptData.items.length === 0}
                className="min-h-[44px] px-5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 flex-1 sm:flex-none transition-all disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang cập nhật kho...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>XÁC NHẬN NHẬP KHO & LƯU CLOUD</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Printable Goods Receipt Slip (Phiếu Nhập Kho KDT-89) */}
      {showPrintSlip && receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 text-xs text-slate-900 shadow-2xl">
            {/* Header */}
            <div className="border-b border-slate-300 pb-3 flex justify-between items-start">
              <div>
                <h2 className="text-base font-black uppercase text-blue-900">
                  KHO ĐIỆN MÁY KDT-89 (KHO HIỆP ÂN)
                </h2>
                <p className="text-[11px] text-slate-600">89 Đường Số 1, KDC Hiệp Ân, P.5, Q.8, TP.HCM</p>
                <p className="text-[11px] text-slate-600">Hotline: 0988.11.89.89 - dienmaykdt89.com</p>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                  {receiptData.receiptNumber}
                </span>
                <p className="text-[10px] text-slate-500 mt-1">{formatDateVI(receiptData.date)}</p>
              </div>
            </div>

            <div className="text-center pt-1">
              <h1 className="text-lg font-black uppercase tracking-wider text-slate-900">
                PHIẾU NHẬP KHO HÀNG HÓA
              </h1>
              <p className="text-[11px] text-slate-500">
                Nhà cung cấp: <strong>{receiptData.supplierName}</strong>
              </p>
            </div>

            {/* Table */}
            <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-300">
                  <th className="p-2 border-r border-slate-300 text-center w-10">STT</th>
                  <th className="p-2 border-r border-slate-300">Tên mặt hàng & Model</th>
                  <th className="p-2 border-r border-slate-300 text-center">ĐVT</th>
                  <th className="p-2 border-r border-slate-300 text-center">SL</th>
                  <th className="p-2 border-r border-slate-300 text-right">Đơn giá vốn</th>
                  <th className="p-2 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {receiptData.items.map((it, idx) => (
                  <tr key={it.id}>
                    <td className="p-2 text-center border-r border-slate-200">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-200 font-semibold">{it.productName}</td>
                    <td className="p-2 text-center border-r border-slate-200">{it.unit}</td>
                    <td className="p-2 text-center border-r border-slate-200 font-bold">{it.quantity}</td>
                    <td className="p-2 text-right border-r border-slate-200">{formatVND(it.unitCost)}</td>
                    <td className="p-2 text-right font-black">{formatVND(it.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-black">
                  <td colSpan={5} className="p-2 text-right border-r border-slate-300">
                    TỔNG CỘNG TIỀN HÀNG:
                  </td>
                  <td className="p-2 text-right text-blue-900">{formatVND(receiptData.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Signatures */}
            <div className="grid grid-cols-3 text-center text-[11px] pt-4">
              <div>
                <p className="font-bold">Người giao hàng</p>
                <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
                <div className="h-14"></div>
              </div>
              <div>
                <p className="font-bold">Thủ kho KDT-89</p>
                <p className="text-[10px] text-slate-400 italic">(Ký nhận hàng)</p>
                <div className="h-14"></div>
              </div>
              <div>
                <p className="font-bold">Kế toán / Quản lý</p>
                <p className="text-[10px] text-slate-400 italic">(Duyệt phiếu)</p>
                <div className="h-14"></div>
              </div>
            </div>

            {/* Print and Close buttons */}
            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 no-print">
              <button
                type="button"
                onClick={() => setShowPrintSlip(false)}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-xl font-bold"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold flex items-center space-x-1"
              >
                <Printer className="w-4 h-4" />
                <span>In Phiếu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

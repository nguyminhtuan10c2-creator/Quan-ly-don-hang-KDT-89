import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Building2,
  Calendar,
  Gift,
  Tag,
  Percent,
  CheckCircle2,
  AlertCircle,
  Truck,
  Calculator,
  UploadCloud,
  X,
  Sparkles,
  Paperclip,
} from 'lucide-react';
import { PriceProduct, Supplier, QuotationItem, QuotationAttachment } from '../../types';
import {
  saveSupplierQuotation,
  savePriceProduct,
  calculateQuotationItemNetPrice,
  calculateItemEstimatedCost,
  formatVNDCurrency,
} from '../../services/priceHubService';

interface PriceHubQuoteEntryProps {
  products: PriceProduct[];
  suppliers: Supplier[];
  initialSupplierId?: string;
  initialProductId?: string;
  onRefresh: () => void;
  onSuccess: (quotationId: string) => void;
}

export const PriceHubQuoteEntry: React.FC<PriceHubQuoteEntryProps> = ({
  products,
  suppliers,
  initialSupplierId,
  initialProductId,
  onRefresh,
  onSuccess,
}) => {
  // Master Quotation Form
  const [supplierId, setSupplierId] = useState(initialSupplierId || '');
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [createdBy, setCreatedBy] = useState('Sale KDT');
  const [generalNotes, setGeneralNotes] = useState('');
  const [attachments, setAttachments] = useState<QuotationAttachment[]>([]);
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');

  // Quick New Product Modal Inside Quote Entry
  const [isQuickProductModalOpen, setIsQuickProductModalOpen] = useState(false);
  const [quickProductName, setQuickProductName] = useState('');
  const [quickProductModel, setQuickProductModel] = useState('');
  const [quickProductBrand, setQuickProductBrand] = useState('');
  const [quickProductUnit, setQuickProductUnit] = useState('Cái');

  // Quotation Items List
  const [items, setItems] = useState<
    Array<{
      tempId: string;
      productId: string;
      productName: string;
      quotedPrice: number;
      currency: string;
      discountPercent: number;
      discountAmount: number;
      giftDescription: string;
      giftValue: number;
      minQuantity: number;
      leadTimeDays: number;
      stockStatus: 'in_stock' | 'pre_order' | 'out_of_stock' | 'unconfirmed';
      vatPercent: number;
      freightCost: number;
      otherCost: number;
      notes: string;
    }>
  >([]);

  // Initialize with initialProductId or empty row
  useEffect(() => {
    if (initialSupplierId) setSupplierId(initialSupplierId);

    if (initialProductId && items.length === 0) {
      const prod = products.find((p) => p.id === initialProductId);
      if (prod) {
        setItems([
          {
            tempId: 'init-1',
            productId: prod.id,
            productName: prod.name,
            quotedPrice: 0,
            currency: 'VND',
            discountPercent: 0,
            discountAmount: 0,
            giftDescription: '',
            giftValue: 0,
            minQuantity: 1,
            leadTimeDays: 1,
            stockStatus: 'in_stock',
            vatPercent: 10,
            freightCost: 0,
            otherCost: 0,
            notes: '',
          },
        ]);
        return;
      }
    }

    if (items.length === 0) {
      handleAddItem();
    }
  }, [initialSupplierId, initialProductId, products]);

  // When supplier selected, prefill payment terms
  useEffect(() => {
    if (supplierId) {
      const s = suppliers.find((sup) => sup.id === supplierId);
      if (s && s.paymentTerms) {
        setPaymentTerms(s.paymentTerms);
      }
    }
  }, [supplierId, suppliers]);

  const handleAddItem = (presetProductId?: string) => {
    let pName = '';
    let pId = presetProductId || '';
    if (pId) {
      const found = products.find((p) => p.id === pId);
      if (found) pName = found.name;
    } else if (products.length > 0) {
      pId = products[0].id;
      pName = products[0].name;
    }

    setItems((prev) => [
      ...prev,
      {
        tempId: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        productId: pId,
        productName: pName,
        quotedPrice: 0,
        currency: 'VND',
        discountPercent: 0,
        discountAmount: 0,
        giftDescription: '',
        giftValue: 0,
        minQuantity: 1,
        leadTimeDays: 1,
        stockStatus: 'in_stock',
        vatPercent: 10,
        freightCost: 0,
        otherCost: 0,
        notes: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('Đợt báo giá phải có ít nhất 1 sản phẩm!');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: value };

      if (field === 'productId') {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          item.productName = prod.name;
        }
      }

      copy[index] = item;
      return copy;
    });
  };

  const handleCreateQuickProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickProductName.trim()) return;

    const newProd = savePriceProduct({
      name: quickProductName.trim(),
      model: quickProductModel.trim() || undefined,
      brand: quickProductBrand.trim() || undefined,
      unit: quickProductUnit.trim() || 'Cái',
      createdBy: createdBy || 'Sale KDT',
    });

    onRefresh();
    setIsQuickProductModalOpen(false);

    // Add to items list immediately
    handleAddItem(newProd.id);

    setQuickProductName('');
    setQuickProductModel('');
    setQuickProductBrand('');
  };

  const handleAddAttachment = () => {
    if (!newAttachmentName.trim()) return;
    const att: QuotationAttachment = {
      id: 'att-' + Date.now(),
      fileName: newAttachmentName.trim(),
      fileType: newAttachmentName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
      fileSize: 1024,
      fileUrl: newAttachmentUrl.trim() || undefined,
      uploadedAt: new Date().toISOString(),
      uploadedBy: createdBy,
    };
    setAttachments((prev) => [...prev, att]);
    setNewAttachmentName('');
    setNewAttachmentUrl('');
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  const handleSubmitQuotation = (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      alert('Vui lòng chọn Nhà cung cấp báo giá!');
      return;
    }

    if (items.length === 0) {
      alert('Vui lòng thêm ít nhất 1 sản phẩm báo giá!');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.productId) {
        alert(`Dòng ${i + 1}: Vui lòng chọn sản phẩm!`);
        return;
      }
      if (it.quotedPrice <= 0) {
        alert(`Dòng ${i + 1}: Vui lòng nhập giá nhà cung cấp báo lớn hơn 0!`);
        return;
      }
    }

    const selectedSupplier = suppliers.find((s) => s.id === supplierId);
    if (!selectedSupplier) {
      alert('Không tìm thấy thông tin nhà cung cấp!');
      return;
    }

    // Convert items to official QuotationItem
    const finalItems: QuotationItem[] = items.map((it) => {
      const prod = products.find((p) => p.id === it.productId);
      const net = calculateQuotationItemNetPrice({
        quotedPrice: it.quotedPrice,
        discountPercent: it.discountPercent,
        discountAmount: it.discountAmount,
        giftValue: it.giftValue,
        minQuantity: it.minQuantity,
      });

      const estCost = calculateItemEstimatedCost({
        netPrice: net,
        vatPercent: it.vatPercent,
        freightCost: it.freightCost,
        otherCost: it.otherCost,
      });

      return {
        id: 'qi-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        productId: it.productId,
        productName: prod?.name || it.productName,
        productModel: prod?.model,
        quotedPrice: it.quotedPrice,
        currency: it.currency || 'VND',
        unit: prod?.unit || 'Cái',
        discountPercent: it.discountPercent || undefined,
        discountAmount: it.discountAmount || undefined,
        giftDescription: it.giftDescription.trim() || undefined,
        giftValue: it.giftValue || undefined,
        netPrice: net,
        vatPercent: it.vatPercent || undefined,
        freightCost: it.freightCost || undefined,
        otherCost: it.otherCost || undefined,
        estimatedTotalCost: estCost,
        minQuantity: it.minQuantity || 1,
        leadTimeDays: it.leadTimeDays || undefined,
        stockStatus: it.stockStatus,
        notes: it.notes.trim() || undefined,
      };
    });

    const savedQuotation = saveSupplierQuotation({
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      supplierCode: selectedSupplier.code,
      quoteDate: new Date(quoteDate).toISOString(),
      validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
      currency: 'VNĐ',
      status: 'valid',
      paymentTerms: paymentTerms.trim() || undefined,
      deliveryTerms: deliveryTerms.trim() || undefined,
      notes: generalNotes.trim() || undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      items: finalItems,
      createdBy: createdBy || 'Sale KDT',
    });

    alert('Đã lưu thành công đợt báo giá mới! Lịch sử đã được ghi nhận.');
    onRefresh();
    onSuccess(savedQuotation.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold mb-2">
            <FileText className="w-3.5 h-3.5" />
            MODULE D: NHẬP BÁO GIÁ THỦ CÔNG (ĐA SẢN PHẨM)
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Tạo Lần Hỏi Giá Mới Từ Nhà Phân Phối
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-2xl">
            Ghi nhận chính xác giá chào, chiết khấu %, chiết khấu quà tặng quy đổi, thuế VAT và phí vận chuyển. Hệ thống tự động tính giá Net chuẩn xác.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsQuickProductModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold border border-purple-200 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tạo nhanh mã sản phẩm mới
        </button>
      </div>

      <form onSubmit={handleSubmitQuotation} className="space-y-6">
        {/* Master Supplier & Date Information Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            1. Thông Tin Nhà Cung Cấp & Thời Gian Báo Giá
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nhà cung cấp <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn nhà cung cấp --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.code}] {s.name} {!s.isActive ? '(Tạm ngừng)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ngày hỏi giá <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={quoteDate}
                onChange={(e) => setQuoteDate(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hạn hiệu lực báo giá
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                placeholder="Để trống nếu không giới hạn"
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Người hỏi giá (Sale) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                placeholder="VD: Nguyễn Văn A (Sale)"
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Điều kiện thanh toán
              </label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="Công nợ 30 ngày, Chuyển khoản ngay..."
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Điều kiện giao hàng
              </label>
              <input
                type="text"
                value={deliveryTerms}
                onChange={(e) => setDeliveryTerms(e.target.value)}
                placeholder="Giao tận kho KDT, NPP chịu ship..."
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ghi chú chung đợt báo giá
              </label>
              <input
                type="text"
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Áp dụng cho dự án Quý 4, kèm ưu đãi..."
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Quotation Items List Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600" />
                2. Danh Sách Sản Phẩm Chào Giá ({items.length} món)
              </h3>
              <p className="text-[11px] text-slate-400">
                Nhập giá gốc và chiết khấu. Giá Net tự động trừ quà tặng và chiết khấu.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleAddItem()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm dòng sản phẩm
            </button>
          </div>

          {/* Items Accordion/Rows */}
          <div className="space-y-4">
            {items.map((it, idx) => {
              const currentNet = calculateQuotationItemNetPrice({
                quotedPrice: it.quotedPrice,
                discountPercent: it.discountPercent,
                discountAmount: it.discountAmount,
                giftValue: it.giftValue,
                minQuantity: it.minQuantity,
              });

              const currentEst = calculateItemEstimatedCost({
                netPrice: currentNet,
                vatPercent: it.vatPercent,
                freightCost: it.freightCost,
                otherCost: it.otherCost,
              });

              return (
                <div
                  key={it.tempId}
                  className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                    <span className="text-xs font-black text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      #{idx + 1}
                    </span>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs text-slate-500 font-medium mr-1.5">Giá Net:</span>
                        <span className="text-base font-black text-emerald-600">
                          {formatVNDCurrency(currentNet)}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-2">
                          (Dự kiến sau VAT & Ship: {formatVNDCurrency(currentEst)})
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Xóa dòng này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Main Product Selection and Quoted Price */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Sản phẩm hỏi giá <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={it.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Chọn sản phẩm --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            [{p.code}] {p.name} {p.model ? `- Model: ${p.model}` : ''} ({p.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Giá NPP báo (VNĐ) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="1000"
                        min="0"
                        required
                        value={it.quotedPrice || ''}
                        onChange={(e) =>
                          handleItemChange(idx, 'quotedPrice', Number(e.target.value) || 0)
                        }
                        placeholder="VD: 500000"
                        className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Số lượng tối thiểu (MOQ)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={it.minQuantity}
                        onChange={(e) =>
                          handleItemChange(idx, 'minQuantity', Number(e.target.value) || 1)
                        }
                        className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Discounts & Gifts Breakdown (Crucial feature from user request!) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-200/80">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Chiết khấu (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={it.discountPercent || ''}
                        onChange={(e) =>
                          handleItemChange(idx, 'discountPercent', Number(e.target.value) || 0)
                        }
                        placeholder="VD: 10%"
                        className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-xl font-bold text-indigo-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Chiết khấu tiền mặt (VNĐ)
                      </label>
                      <input
                        type="number"
                        step="1000"
                        min="0"
                        value={it.discountAmount || ''}
                        onChange={(e) =>
                          handleItemChange(idx, 'discountAmount', Number(e.target.value) || 0)
                        }
                        placeholder="VD: 20000"
                        className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-purple-800 mb-1 flex items-center gap-1">
                        <Gift className="w-3.5 h-3.5 text-purple-600" />
                        Quà tặng đi kèm
                      </label>
                      <input
                        type="text"
                        value={it.giftDescription}
                        onChange={(e) => handleItemChange(idx, 'giftDescription', e.target.value)}
                        placeholder="VD: Tặng áo mưa, mỡ bò..."
                        className="w-full text-xs px-3 py-1.5 border border-purple-200 rounded-xl bg-purple-50/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-purple-800 mb-1 flex items-center gap-1" title="Giá trị quà chia cho số lượng MOQ để trừ thẳng vào giá Net!">
                        <Calculator className="w-3.5 h-3.5 text-purple-600" />
                        Giá trị quà trừ vào giá (VNĐ)
                      </label>
                      <input
                        type="number"
                        step="1000"
                        min="0"
                        value={it.giftValue || ''}
                        onChange={(e) =>
                          handleItemChange(idx, 'giftValue', Number(e.target.value) || 0)
                        }
                        placeholder="VD: 100000"
                        className="w-full text-xs px-3 py-1.5 border border-purple-200 rounded-xl bg-purple-50/30 font-bold text-purple-900"
                      />
                    </div>
                  </div>

                  {/* Stock status, lead time, VAT, freight, notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tình trạng</label>
                      <select
                        value={it.stockStatus}
                        onChange={(e) => handleItemChange(idx, 'stockStatus', e.target.value)}
                        className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl"
                      >
                        <option value="in_stock">✓ Có hàng sẵn</option>
                        <option value="pre_order">Đặt hàng trước</option>
                        <option value="out_of_stock">Tạm hết hàng</option>
                        <option value="unconfirmed">Chưa xác nhận</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Thời gian giao (ngày)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={it.leadTimeDays || ''}
                        onChange={(e) =>
                          handleItemChange(idx, 'leadTimeDays', Number(e.target.value) || 0)
                        }
                        placeholder="VD: 2 ngày"
                        className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Thuế VAT (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={it.vatPercent || ''}
                        onChange={(e) =>
                          handleItemChange(idx, 'vatPercent', Number(e.target.value) || 0)
                        }
                        placeholder="10%"
                        className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Phí ship (VNĐ)
                      </label>
                      <input
                        type="number"
                        step="1000"
                        min="0"
                        value={it.freightCost || ''}
                        onChange={(e) =>
                          handleItemChange(idx, 'freightCost', Number(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú dòng</label>
                      <input
                        type="text"
                        value={it.notes}
                        onChange={(e) => handleItemChange(idx, 'notes', e.target.value)}
                        placeholder="Bảo hành 12th, hàng loại 1..."
                        className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attachments Section */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-purple-600" />
            3. File Báo Giá Gốc Đính Kèm (PDF / Excel / Ảnh chụp bảng giá Zalo)
          </h3>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              value={newAttachmentName}
              onChange={(e) => setNewAttachmentName(e.target.value)}
              placeholder="Tên file hoặc tài liệu (VD: Bang_gia_thang_11_SKF.pdf)"
              className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-xl w-full"
            />
            <input
              type="text"
              value={newAttachmentUrl}
              onChange={(e) => setNewAttachmentUrl(e.target.value)}
              placeholder="Link file hoặc link ảnh cloud (tùy chọn)"
              className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-xl w-full"
            />
            <button
              type="button"
              onClick={handleAddAttachment}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors shrink-0 w-full sm:w-auto"
            >
              + Đính kèm
            </button>
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 text-xs bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200"
                >
                  <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-semibold text-slate-700">{a.fileName}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(a.id)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            * Dữ liệu sau khi lưu sẽ được lưu trữ vĩnh viễn trong lịch sử báo giá và đồng bộ thời gian thực.
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-black shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Lưu Đợt Báo Giá Này
            </button>
          </div>
        </div>
      </form>

      {/* Quick New Product Modal */}
      {isQuickProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-purple-700 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Tạo Nhanh Mã Sản Phẩm Hỏi Giá
              </h3>
              <button
                type="button"
                onClick={() => setIsQuickProductModalOpen(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên sản phẩm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={quickProductName}
                  onChange={(e) => setQuickProductName(e.target.value)}
                  placeholder="VD: Cầu chì ống Bussmann 10A"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Model / Part</label>
                  <input
                    type="text"
                    value={quickProductModel}
                    onChange={(e) => setQuickProductModel(e.target.value)}
                    placeholder="VD: 10A 500V"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Thương hiệu</label>
                  <input
                    type="text"
                    value={quickProductBrand}
                    onChange={(e) => setQuickProductBrand(e.target.value)}
                    placeholder="Bussmann, ABB..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Đơn vị tính</label>
                <input
                  type="text"
                  value={quickProductUnit}
                  onChange={(e) => setQuickProductUnit(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="bg-slate-50 p-4 -mx-6 -mb-6 mt-6 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Tạo và chèn vào bảng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

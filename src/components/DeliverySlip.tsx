import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Printer,
  Sliders,
  Eye,
  EyeOff,
  Building,
  DollarSign,
  QrCode,
  FileText,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  MapPin,
  HelpCircle,
  Plus,
  Trash2,
  Edit3,
  Sparkles,
} from 'lucide-react';
import { Order } from '../types';
import { getStoreInfo, formatVND, formatDateVI, formatDateTimeVI } from '../services/storageService';

interface DeliverySlipProps {
  order: Order | null;
  onClose: () => void;
}

interface EditableSlipItem {
  id: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  price: number;
}

// Convert numbers to Vietnamese words
function numberToVietnameseWords(amount: number): string {
  if (!amount || amount <= 0) return 'Không đồng';
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ'];

  const readThreeDigits = (n: number, isFirst: boolean): string => {
    const hundreds = Math.floor(n / 100);
    const tens = Math.floor((n % 100) / 10);
    const ones = n % 10;
    let res = '';

    if (hundreds > 0 || !isFirst) {
      res += `${digits[hundreds]} trăm `;
    }

    if (tens > 1) {
      res += `${digits[tens]} mươi `;
      if (ones === 1) res += 'mốt ';
      else if (ones === 5) res += 'lăm ';
      else if (ones > 0) res += `${digits[ones]} `;
    } else if (tens === 1) {
      res += 'mười ';
      if (ones === 5) res += 'lăm ';
      else if (ones > 0) res += `${digits[ones]} `;
    } else if (tens === 0 && ones > 0) {
      if (hundreds > 0 || !isFirst) res += 'lẻ ';
      res += `${digits[ones]} `;
    }

    return res.trim();
  };

  let numStr = Math.round(amount).toString();
  const groups: number[] = [];
  while (numStr.length > 0) {
    groups.unshift(parseInt(numStr.slice(-3), 10));
    numStr = numStr.slice(0, -3);
  }

  let words = '';
  const totalGroups = groups.length;
  for (let i = 0; i < totalGroups; i++) {
    const g = groups[i];
    if (g > 0) {
      const gWord = readThreeDigits(g, i === 0);
      const unit = units[totalGroups - 1 - i];
      words += `${gWord} ${unit} `;
    }
  }

  words = words.trim() + ' đồng';
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const DeliverySlip: React.FC<DeliverySlipProps> = ({ order, onClose }) => {
  if (!order) return null;

  const storeInfo = getStoreInfo();

  // Template Mode: KDT-89 standard or Modern
  const [templateMode, setTemplateMode] = useState<'kdt' | 'modern'>('kdt');

  // Quick Toggles Before Printing
  const [showPrice, setShowPrice] = useState<boolean>(true); // Ẩn/Hiện giá tiền
  const [showCompanyInfo, setShowCompanyInfo] = useState<boolean>(true); // Ẩn/Hiện thông tin công ty & logo
  const [showQrCode, setShowQrCode] = useState<boolean>(true); // Ẩn/Hiện mã QR ngân hàng
  const [showNotes, setShowNotes] = useState<boolean>(true); // Ẩn/Hiện điều khoản lưu ý
  const [showSignatures, setShowSignatures] = useState<boolean>(true); // Ẩn/Hiện chữ ký

  // Editable Header & Customer Information
  const [customSlipTitle, setCustomSlipTitle] = useState<string>('PHIẾU XUẤT KHO');
  const [customDay, setCustomDay] = useState<string>('24');
  const [customMonth, setCustomMonth] = useState<string>('10');
  const [customYear, setCustomYear] = useState<string>('2026');
  const [customOrderCode, setCustomOrderCode] = useState<string>(order.orderCode || '');
  const [customShipperName, setCustomShipperName] = useState<string>(order.deliveryStaffName || '');

  const [buyerUnit, setBuyerUnit] = useState<string>('Khách lẻ / Đơn lẻ');
  const [receiverName, setReceiverName] = useState<string>(order.customerName || '');
  const [receiverPhone, setReceiverPhone] = useState<string>(order.customerPhone || '');
  const [deliveryAddress, setDeliveryAddress] = useState<string>(order.deliveryAddress || '');
  const [customNote, setCustomNote] = useState<string>(order.notes || order.deliveryNotes || 'BÁN HÀNG');
  const [deliveryDateStr, setDeliveryDateStr] = useState<string>(formatDateVI(order.deliveryDate || order.createdAt));

  // Editable Company Information
  const [customCompanyName, setCustomCompanyName] = useState<string>('CÔNG TY TNHH KDT-89');
  const [customCompanyAddress, setCustomCompanyAddress] = useState<string>(
    '89 Đường Số 1, Khu Dân Cư Hiệp Ân, Phường 5, Quận 8, TP. Hồ Chí Minh'
  );
  const [customCompanyBank, setCustomCompanyBank] = useState<string>('STK: 220378 - Ngân hàng ACB - PGD Chánh Hưng');
  const [customNoticeText, setCustomNoticeText] = useState<string>(
    'Quý khách hàng vui lòng kiểm tra hàng hóa trước khi thanh toán hoặc ký nhận (không cấn móp, đầy đủ phụ kiện...). Hàng mua rồi không đổi trả. Xin cảm ơn!'
  );

  // Editable Signatures
  const [signerShipper, setSignerShipper] = useState<string>(order.deliveryStaffName || '');
  const [signerWarehouse, setSignerWarehouse] = useState<string>('KDT Kho Hiệp Ân Q8');
  const [signerAccountant, setSignerAccountant] = useState<string>('ACB-220378');
  const [signerReceiver, setSignerReceiver] = useState<string>(order.customerName || '');

  // Editable Line Items
  const [slipItems, setSlipItems] = useState<EditableSlipItem[]>(() => {
    const initialItems = (order.items || []).map((it, idx) => ({
      id: `slip-item-${idx}-${Date.now()}`,
      productName: it.productName || '',
      sku: it.sku || '',
      unit: 'Cái',
      quantity: it.quantity || 1,
      price: it.price || 0,
    }));

    // Pad with empty rows up to at least 6 rows like the user's Excel template
    while (initialItems.length < 6) {
      initialItems.push({
        id: `slip-item-empty-${initialItems.length}-${Date.now()}`,
        productName: '',
        sku: '',
        unit: '',
        quantity: 0,
        price: 0,
      });
    }
    return initialItems;
  });

  // Financial Balances Override
  const [manualPrepaid, setManualPrepaid] = useState<number>(order.prepaidAmount || 0);

  // Initialize date values from order
  useEffect(() => {
    const d = order.deliveryDate ? new Date(order.deliveryDate) : new Date(order.createdAt || Date.now());
    if (!isNaN(d.getTime())) {
      setCustomDay(String(d.getDate()).padStart(2, '0'));
      setCustomMonth(String(d.getMonth() + 1).padStart(2, '0'));
      setCustomYear(String(d.getFullYear()));
    }
  }, [order]);

  // Keep signerReceiver in sync with receiverName if not manually modified
  useEffect(() => {
    setSignerReceiver(receiverName);
  }, [receiverName]);

  // Calculate Subtotal dynamically from editable items
  const computedTotal = useMemo(() => {
    return slipItems.reduce((sum, it) => {
      if (it.productName && it.quantity > 0) {
        return sum + (it.price || 0) * (it.quantity || 1);
      }
      return sum;
    }, 0);
  }, [slipItems]);

  const computedRemaining = useMemo(() => {
    return Math.max(0, computedTotal - manualPrepaid);
  }, [computedTotal, manualPrepaid]);

  // Handle Item row updates
  const handleItemChange = (index: number, field: keyof EditableSlipItem, value: any) => {
    setSlipItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Add new product row
  const handleAddRow = () => {
    setSlipItems((prev) => [
      ...prev,
      {
        id: `slip-item-new-${Date.now()}`,
        productName: '',
        sku: '',
        unit: 'Cái',
        quantity: 1,
        price: 0,
      },
    ]);
  };

  // Remove a product row
  const handleRemoveRow = (index: number) => {
    if (slipItems.length <= 1) return;
    setSlipItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Reset all fields back to original order data
  const handleResetToOrder = () => {
    setCustomSlipTitle('PHIẾU XUẤT KHO');
    setCustomOrderCode(order.orderCode || '');
    setCustomShipperName(order.deliveryStaffName || '');
    setBuyerUnit('Khách lẻ / Đơn lẻ');
    setReceiverName(order.customerName || '');
    setReceiverPhone(order.customerPhone || '');
    setDeliveryAddress(order.deliveryAddress || '');
    setCustomNote(order.notes || order.deliveryNotes || 'BÁN HÀNG');
    setDeliveryDateStr(formatDateVI(order.deliveryDate || order.createdAt));
    setManualPrepaid(order.prepaidAmount || 0);

    const initialItems = (order.items || []).map((it, idx) => ({
      id: `slip-item-${idx}-${Date.now()}`,
      productName: it.productName || '',
      sku: it.sku || '',
      unit: 'Cái',
      quantity: it.quantity || 1,
      price: it.price || 0,
    }));
    while (initialItems.length < 6) {
      initialItems.push({
        id: `slip-item-empty-${initialItems.length}-${Date.now()}`,
        productName: '',
        sku: '',
        unit: '',
        quantity: 0,
        price: 0,
      });
    }
    setSlipItems(initialItems);
    setShowPrice(true);
    setShowCompanyInfo(true);
    setShowQrCode(true);
    setShowNotes(true);
    setShowSignatures(true);
  };

  const handlePrint = () => {
    window.print();
  };

  // Dynamic VietQR generator URL for ACB
  const qrBankUrl = `https://api.vietqr.io/image/970416-220378-compact2.jpg?amount=${
    showPrice ? computedRemaining : 0
  }&addInfo=${encodeURIComponent(customOrderCode || 'Thanh toan don hang')}&accountName=CONG%20TY%20TNHH%20KDT-89`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-6 print-container animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="bg-slate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800 no-print">
          <div className="flex items-center space-x-2">
            <Edit3 className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-sm">Chỉnh Sửa Trực Tiếp & In Phiếu Xuất Kho</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-md flex items-center space-x-1.5 transition-all active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Phiếu / Xuất PDF</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* INLINE EDITING HINT & QUICK TOGGLE BAR (Hidden when printing) */}
        <div className="bg-amber-50/90 border-b border-amber-200 p-3.5 space-y-2 text-xs text-amber-950 no-print">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span className="font-bold text-xs">
                💡 <strong>Chế độ sửa trực tiếp đang BẬT:</strong> Bạn có thể <strong>click chuột gõ thẳng vào bất kỳ ô nào trên phiếu</strong> (tên khách, SĐT, địa chỉ, hàng hóa, số tiền, ngày giao...) để sửa trước khi in!
              </span>
            </div>

            <button
              type="button"
              onClick={handleResetToOrder}
              className="bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold px-3 py-1 rounded-lg flex items-center space-x-1 shadow-xs transition-colors shrink-0"
              title="Khôi phục lại toàn bộ thông tin ban đầu của đơn hàng"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Khôi phục gốc</span>
            </button>
          </div>

          {/* Quick Filter & Display Toggles */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="font-bold text-slate-600 text-[11px] uppercase mr-1">Bật/Tắt hiển thị:</span>

            {/* 1. Toggle Ẩn / Hiện Giá Tiền */}
            <button
              type="button"
              onClick={() => setShowPrice(!showPrice)}
              className={`px-3 py-1 rounded-lg font-bold border transition-all text-xs flex items-center space-x-1.5 ${
                showPrice
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-rose-100 text-rose-800 border-rose-300'
              }`}
            >
              {showPrice ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{showPrice ? 'Đang hiện giá tiền' : 'ĐÃ ẨN GIÁ TIỀN (Phiếu không tiền)'}</span>
            </button>

            {/* 2. Toggle Ẩn / Hiện Thông Tin Công Ty */}
            <button
              type="button"
              onClick={() => setShowCompanyInfo(!showCompanyInfo)}
              className={`px-3 py-1 rounded-lg font-bold border transition-all text-xs flex items-center space-x-1.5 ${
                showCompanyInfo
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-200 text-slate-700 border-slate-300'
              }`}
            >
              {showCompanyInfo ? <Building className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{showCompanyInfo ? 'Hiện công ty & logo' : 'Ẩn công ty (Giấy tiêu đề sẵn)'}</span>
            </button>

            {/* 3. Toggle Ẩn / Hiện Mã QR */}
            <button
              type="button"
              onClick={() => setShowQrCode(!showQrCode)}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-all text-xs flex items-center space-x-1.5 ${
                showQrCode
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : 'bg-slate-200 text-slate-700 border-slate-300'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{showQrCode ? 'Hiện QR ngân hàng' : 'Ẩn QR'}</span>
            </button>

            {/* 4. Toggle Chữ Ký */}
            <button
              type="button"
              onClick={() => setShowSignatures(!showSignatures)}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-all text-xs flex items-center space-x-1.5 ${
                showSignatures
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-slate-200 text-slate-700 border-slate-300'
              }`}
            >
              <span>{showSignatures ? 'Hiện 4 chữ ký' : 'Ẩn chữ ký'}</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* PRINTABLE SLIP CONTENT: 100% INLINE EDITABLE & REALISTIC */}
        {/* ======================================================== */}
        <div className="p-6 sm:p-10 space-y-3.5 text-black bg-white font-serif text-[11px] leading-tight selection:bg-none print:p-0 print:space-y-2">
          {/* Header: Logo, Company Info, QR Code */}
          <div className="flex items-start justify-between border-b-2 border-black pb-2 gap-3 min-h-[60px]">
            {/* Left: Logo & Company Address */}
            {showCompanyInfo ? (
              <div className="flex items-center space-x-3 max-w-[500px]">
                <div className="w-16 h-16 border border-slate-300 rounded-lg flex items-center justify-center p-1 shrink-0 bg-white shadow-xs print:border-none print:shadow-none overflow-hidden">
                  <img
                    src="/assets/aistudio/logo_Cty_KDT-10_d91b9dae.png"
                    alt="Logo Công ty KDT-89"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="space-y-0.5 flex-1">
                  <input
                    type="text"
                    value={customCompanyName}
                    onChange={(e) => setCustomCompanyName(e.target.value)}
                    className="w-full text-sm sm:text-base font-black uppercase tracking-tight text-slate-950 font-sans border-0 hover:bg-blue-50/60 focus:bg-amber-50 focus:ring-1 focus:ring-blue-500 rounded px-1 transition-colors print:p-0 print:bg-transparent print:ring-0"
                    title="Click để sửa tên công ty"
                  />
                  <input
                    type="text"
                    value={customCompanyAddress}
                    onChange={(e) => setCustomCompanyAddress(e.target.value)}
                    className="w-full text-[10px] text-slate-800 border-0 hover:bg-blue-50/60 focus:bg-amber-50 focus:ring-1 focus:ring-blue-500 rounded px-1 transition-colors print:p-0 print:bg-transparent print:ring-0"
                    title="Click để sửa địa chỉ công ty"
                  />
                  <input
                    type="text"
                    value={customCompanyBank}
                    onChange={(e) => setCustomCompanyBank(e.target.value)}
                    className="w-full text-[10px] text-slate-800 font-bold border-0 hover:bg-blue-50/60 focus:bg-amber-50 focus:ring-1 focus:ring-blue-500 rounded px-1 transition-colors print:p-0 print:bg-transparent print:ring-0"
                    title="Click để sửa thông tin tài khoản ngân hàng"
                  />
                </div>
              </div>
            ) : (
              <div className="h-12 flex items-center text-slate-400 italic font-sans text-[10px] print:hidden">
                (Đã ẩn thông tin công ty - Vùng này sẽ để trống khi in)
              </div>
            )}

            {/* Right: Bank QR Code */}
            {showQrCode ? (
              <div className="flex flex-col items-center shrink-0">
                <div className="w-16 h-16 border border-slate-400 p-0.5 rounded bg-white shadow-xs print:shadow-none">
                  <img
                    src={qrBankUrl}
                    alt="Mã QR ACB"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as any).style.display = 'none';
                    }}
                  />
                </div>
                <span className="text-[9px] text-slate-600 font-sans font-semibold mt-0.5">
                  Mã QR ngân hàng
                </span>
              </div>
            ) : (
              <div className="h-12 print:hidden text-slate-400 text-[10px] italic flex items-center">
                (Đã ẩn QR)
              </div>
            )}
          </div>

          {/* Title & Metadata */}
          <div className="text-center pt-1 pb-1">
            <input
              type="text"
              value={customSlipTitle}
              onChange={(e) => setCustomSlipTitle(e.target.value)}
              className="text-center text-xl font-black uppercase tracking-wide font-sans w-full max-w-md mx-auto border-0 hover:bg-blue-50/60 focus:bg-amber-50 focus:ring-1 focus:ring-blue-500 rounded px-1 transition-colors print:p-0 print:bg-transparent print:ring-0"
              title="Click để đổi tiêu đề phiếu (Ví dụ: PHIẾU XUẤT KHO / BÀN GIAO...)"
            />

            <div className="flex items-center justify-center space-x-1 text-xs italic mt-0.5">
              <span>Ngày</span>
              <input
                type="text"
                value={customDay}
                onChange={(e) => setCustomDay(e.target.value)}
                className="w-8 text-center italic border-b border-dotted border-slate-400 hover:bg-blue-50/60 focus:bg-amber-50 px-0.5 font-bold print:border-none print:p-0"
              />
              <span>Tháng</span>
              <input
                type="text"
                value={customMonth}
                onChange={(e) => setCustomMonth(e.target.value)}
                className="w-8 text-center italic border-b border-dotted border-slate-400 hover:bg-blue-50/60 focus:bg-amber-50 px-0.5 font-bold print:border-none print:p-0"
              />
              <span>Năm</span>
              <input
                type="text"
                value={customYear}
                onChange={(e) => setCustomYear(e.target.value)}
                className="w-12 text-center italic border-b border-dotted border-slate-400 hover:bg-blue-50/60 focus:bg-amber-50 px-0.5 font-bold print:border-none print:p-0"
              />
            </div>

            <div className="flex items-center justify-between text-xs font-bold font-sans mt-2 px-2">
              <div className="flex items-center space-x-1">
                <span>MÃ ĐƠN HÀNG:</span>
                <input
                  type="text"
                  value={customOrderCode}
                  onChange={(e) => setCustomOrderCode(e.target.value)}
                  className="font-mono text-sm underline font-black border-0 hover:bg-blue-50/60 focus:bg-amber-50 focus:ring-1 focus:ring-blue-500 rounded px-1 print:p-0 print:bg-transparent print:ring-0 w-36"
                  title="Click để sửa mã đơn hàng"
                />
              </div>

              <div className="flex items-center space-x-1">
                <span>NVGH:</span>
                <input
                  type="text"
                  value={customShipperName}
                  onChange={(e) => setCustomShipperName(e.target.value)}
                  placeholder="..............................."
                  className="border-b border-dotted border-black min-w-[140px] text-center font-normal hover:bg-blue-50/60 focus:bg-amber-50 px-1 print:bg-transparent"
                  title="Click để sửa tên nhân viên giao hàng"
                />
              </div>
            </div>
          </div>

          {/* Customer Information Table (100% Editable) */}
          <div className="border border-black text-xs font-sans">
            <div className="grid grid-cols-1 divide-y divide-black">
              {/* Đơn vị mua hàng */}
              <div className="px-2 py-1 flex items-center">
                <span className="w-36 shrink-0 font-bold">- Đơn vị mua hàng:</span>
                <input
                  type="text"
                  value={buyerUnit}
                  onChange={(e) => setBuyerUnit(e.target.value)}
                  className="w-full font-medium text-slate-800 border-0 hover:bg-blue-50/60 focus:bg-amber-50 focus:ring-1 focus:ring-blue-500 rounded px-1 print:p-0 print:bg-transparent print:ring-0"
                  placeholder="Khách lẻ / Tên công ty mua hàng..."
                />
              </div>

              {/* Người nhận hàng */}
              <div className="px-2 py-1 flex items-center">
                <span className="w-36 shrink-0 font-bold">- Người nhận hàng:</span>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full font-black text-slate-900 border-0 hover:bg-blue-50/60 focus:bg-amber-50 focus:ring-1 focus:ring-blue-500 rounded px-1 print:p-0 print:bg-transparent print:ring-0"
                  placeholder="Họ tên người nhận..."
                />
              </div>

              {/* Số điện thoại */}
              <div className="px-2 py-1 flex items-center">
                <span className="w-36 shrink-0 font-bold">- Số điện thoại:</span>
                <input
                  type="text"
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  className="w-full font-black font-mono text-slate-900 border-0 hover:bg-blue-50/60 focus:bg-amber-50 focus:ring-1 focus:ring-blue-500 rounded px-1 print:p-0 print:bg-transparent print:ring-0"
                  placeholder="Số điện thoại..."
                />
              </div>

              {/* Địa chỉ */}
              <div className="px-2 py-1 flex items-center">
                <span className="w-36 shrink-0 font-bold">- Địa chỉ:</span>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full font-semibold text-slate-900 border-0 hover:bg-blue-50/60 focus:bg-amber-50 focus:ring-1 focus:ring-blue-500 rounded px-1 print:p-0 print:bg-transparent print:ring-0"
                  placeholder="Địa chỉ giao hàng..."
                />
              </div>

              {/* Ghi chú & Ngày giao */}
              <div className="px-2 py-1 flex items-center justify-between">
                <div className="flex items-center flex-1 mr-4">
                  <span className="w-36 shrink-0 font-bold">- Ghi chú:</span>
                  <input
                    type="text"
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    className="w-full font-black uppercase text-rose-700 border-0 hover:bg-blue-50/60 focus:bg-amber-50 focus:ring-1 focus:ring-blue-500 rounded px-1 print:p-0 print:bg-transparent print:ring-0"
                    placeholder="BÁN HÀNG, BẢO HÀNH..."
                  />
                </div>
                <div className="flex items-center space-x-1 shrink-0">
                  <span className="font-bold">Ngày giao:</span>
                  <input
                    type="text"
                    value={deliveryDateStr}
                    onChange={(e) => setDeliveryDateStr(e.target.value)}
                    className="w-24 font-mono font-bold border-0 hover:bg-blue-50/60 focus:bg-amber-50 focus:ring-1 focus:ring-blue-500 rounded px-1 print:p-0 print:bg-transparent print:ring-0 text-right"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Ordered Items Table (100% Editable Lines) */}
          <div className="space-y-1">
            <table className="w-full border-collapse border border-black text-[11px] font-sans">
              <thead>
                <tr className="border-b border-black text-center font-black bg-slate-100 text-[10px]">
                  <th className="border-r border-black p-1 w-7">STT</th>
                  <th className="border-r border-black p-1.5">TÊN SẢN PHẨM</th>
                  <th className="border-r border-black p-1 w-24">MÃ SỐ</th>
                  <th className="border-r border-black p-1 w-16">ĐVT</th>
                  <th className="border-r border-black p-1 w-18">
                    SỐ LƯỢNG
                    <div className="text-[7.5px] font-normal leading-none">YÊU CẦU / THỰC XUẤT</div>
                  </th>
                  {showPrice && <th className="border-r border-black p-1 w-24 text-right">ĐƠN GIÁ</th>}
                  {showPrice && <th className="p-1 w-24 text-right">THÀNH TIỀN</th>}
                  <th className="p-1 w-6 no-print print:hidden"></th>
                </tr>
              </thead>

              <tbody>
                {slipItems.map((item, idx) => {
                  const lineTotal = (item.price || 0) * (item.quantity || 0);

                  return (
                    <tr key={item.id} className="border-b border-black h-8 text-[11px]">
                      {/* STT */}
                      <td className="border-r border-black text-center p-0.5 font-bold">
                        {idx + 1}
                      </td>

                      {/* Tên sản phẩm */}
                      <td className="border-r border-black p-0.5 font-bold text-slate-900">
                        <input
                          type="text"
                          value={item.productName}
                          onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                          placeholder="Nhập tên sản phẩm..."
                          className="w-full font-bold text-slate-900 border-0 hover:bg-blue-50/60 focus:bg-amber-50 focus:ring-1 focus:ring-blue-500 rounded px-1 print:p-0 print:bg-transparent print:ring-0"
                        />
                      </td>

                      {/* Mã số / SKU */}
                      <td className="border-r border-black p-0.5 text-center font-mono font-semibold">
                        <input
                          type="text"
                          value={item.sku}
                          onChange={(e) => handleItemChange(idx, 'sku', e.target.value)}
                          placeholder="Mã SKU..."
                          className="w-full text-center font-mono font-semibold border-0 hover:bg-blue-50/60 focus:bg-amber-50 focus:ring-1 focus:ring-blue-500 rounded px-1 print:p-0 print:bg-transparent print:ring-0"
                        />
                      </td>

                      {/* Đơn vị tính */}
                      <td className="border-r border-black p-0.5 text-center">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          placeholder="Cái"
                          className="w-full text-center border-0 hover:bg-blue-50/60 focus:bg-amber-50 focus:ring-1 focus:ring-blue-500 rounded px-0.5 print:p-0 print:bg-transparent print:ring-0"
                        />
                      </td>

                      {/* Số lượng */}
                      <td className="border-r border-black p-0.5 text-center font-bold">
                        <input
                          type="number"
                          min={0}
                          value={item.quantity || ''}
                          onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 0)}
                          className="w-full text-center font-bold border-0 hover:bg-blue-50/60 focus:bg-amber-50 focus:ring-1 focus:ring-blue-500 rounded px-0.5 print:p-0 print:bg-transparent print:ring-0"
                        />
                      </td>

                      {/* Đơn giá (ẩn nếu không showPrice) */}
                      {showPrice && (
                        <td className="border-r border-black p-0.5 text-right font-mono">
                          <input
                            type="number"
                            min={0}
                            value={item.price || ''}
                            onChange={(e) => handleItemChange(idx, 'price', parseInt(e.target.value, 10) || 0)}
                            className="w-full text-right font-mono border-0 hover:bg-blue-50/60 focus:bg-amber-50 focus:ring-1 focus:ring-blue-500 rounded px-1 print:p-0 print:bg-transparent print:ring-0"
                          />
                        </td>
                      )}

                      {/* Thành tiền (ẩn nếu không showPrice) */}
                      {showPrice && (
                        <td className="p-0.5 text-right font-mono font-bold pr-1.5">
                          {lineTotal > 0 ? formatVND(lineTotal).replace(' đ', '') : ''}
                        </td>
                      )}

                      {/* Action: Delete line (no-print) */}
                      <td className="p-0.5 text-center no-print print:hidden">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="text-slate-300 hover:text-rose-600 p-0.5"
                          title="Xóa dòng này"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* Summary Rows (Only shown if showPrice is true) */}
                {showPrice && (
                  <>
                    <tr className="border-b border-black font-black bg-slate-50 text-[11px]">
                      <td colSpan={2} className="border-r border-black p-1.5 uppercase font-sans">
                        TỔNG THANH TOÁN
                      </td>
                      <td className="border-r border-black p-1.5 text-center text-slate-500 font-mono">X</td>
                      <td className="border-r border-black p-1.5 text-center text-slate-500 font-mono">X</td>
                      <td className="border-r border-black p-1.5 text-center text-slate-500 font-mono">X</td>
                      <td className="border-r border-black p-1.5 text-center text-slate-500 font-mono">X</td>
                      <td className="p-1.5 text-right font-mono font-black text-xs">
                        {formatVND(computedTotal).replace(' đ', '')}
                      </td>
                      <td className="no-print print:hidden"></td>
                    </tr>

                    <tr className="border-b border-black font-black text-[11px]">
                      <td colSpan={2} className="border-r border-black p-1.5 uppercase font-sans">
                        ĐÃ THANH TOÁN
                      </td>
                      <td className="border-r border-black p-1.5 text-center text-slate-500 font-mono">X</td>
                      <td className="border-r border-black p-1.5 text-center text-slate-500 font-mono">X</td>
                      <td className="border-r border-black p-1.5 text-center text-slate-500 font-mono">X</td>
                      <td className="border-r border-black p-1.5 text-center text-slate-500 font-mono">X</td>
                      <td className="p-0.5 text-right font-mono font-black text-xs text-emerald-800">
                        <input
                          type="number"
                          min={0}
                          value={manualPrepaid || ''}
                          onChange={(e) => setManualPrepaid(parseInt(e.target.value, 10) || 0)}
                          placeholder="0"
                          className="w-full text-right font-mono font-black text-xs text-emerald-800 border-0 hover:bg-blue-50/60 focus:bg-amber-50 focus:ring-1 focus:ring-blue-500 rounded px-1 print:p-0 print:bg-transparent print:ring-0"
                          title="Click để sửa số tiền khách đã thanh toán trước/cọc"
                        />
                      </td>
                      <td className="no-print print:hidden"></td>
                    </tr>

                    <tr className="border-b border-black font-black bg-amber-50 text-[11px]">
                      <td colSpan={2} className="border-r border-black p-1.5 uppercase font-sans text-rose-800">
                        CÒN LẠI (THU COD)
                      </td>
                      <td className="border-r border-black p-1.5 text-center text-slate-500 font-mono">X</td>
                      <td className="border-r border-black p-1.5 text-center text-slate-500 font-mono">X</td>
                      <td className="border-r border-black p-1.5 text-center text-slate-500 font-mono">X</td>
                      <td className="border-r border-black p-1.5 text-center text-slate-500 font-mono">X</td>
                      <td className="p-1.5 text-right font-mono font-black text-sm text-rose-700">
                        {formatVND(computedRemaining).replace(' đ', '')}
                      </td>
                      <td className="no-print print:hidden"></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>

            {/* Button to add extra item row (no-print) */}
            <div className="flex justify-start pt-1 no-print">
              <button
                type="button"
                onClick={handleAddRow}
                className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1 rounded-lg flex items-center space-x-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm dòng sản phẩm / phụ kiện vào phiếu</span>
              </button>
            </div>
          </div>

          {/* BẰNG CHỮ (Only shown if showPrice is true) */}
          {showPrice && (
            <div className="border border-black p-2 text-xs font-sans flex items-baseline space-x-2">
              <span className="font-black uppercase tracking-wider shrink-0">BẰNG CHỮ:</span>
              <span className="italic font-bold text-slate-900">
                {numberToVietnameseWords(computedRemaining > 0 ? computedRemaining : computedTotal)}
              </span>
            </div>
          )}

          {/* Lưu ý điều khoản */}
          {showNotes && (
            <div className="border border-black p-2 text-[10px] italic leading-tight text-slate-800 font-serif">
              <strong>Lưu ý: </strong>
              <input
                type="text"
                value={customNoticeText}
                onChange={(e) => setCustomNoticeText(e.target.value)}
                className="w-full italic border-0 hover:bg-blue-50/60 focus:bg-amber-50 focus:ring-1 focus:ring-blue-500 rounded px-1 print:p-0 print:bg-transparent print:ring-0 mt-0.5"
                title="Click để sửa nội dung lưu ý"
              />
            </div>
          )}

          {/* 4 Chữ ký kiểm soát (Cho phép sửa tên người ký) */}
          {showSignatures && (
            <div className="pt-2 grid grid-cols-4 gap-2 text-center text-[11px] font-sans">
              <div>
                <p className="font-black">Người giao hàng</p>
                <p className="text-[10px] text-slate-500 italic">(Ký, họ tên)</p>
                <div className="h-14"></div>
                <input
                  type="text"
                  value={signerShipper}
                  onChange={(e) => setSignerShipper(e.target.value)}
                  placeholder="Họ tên shipper..."
                  className="w-full text-center font-bold text-slate-800 text-[10px] border-0 hover:bg-blue-50/60 focus:bg-amber-50 rounded px-1 print:p-0 print:bg-transparent"
                />
              </div>

              <div>
                <p className="font-black">Thủ kho</p>
                <p className="text-[10px] text-slate-500 italic">(Ký, họ tên)</p>
                <div className="h-14"></div>
                <input
                  type="text"
                  value={signerWarehouse}
                  onChange={(e) => setSignerWarehouse(e.target.value)}
                  className="w-full text-center font-bold text-slate-800 text-[10px] border-0 hover:bg-blue-50/60 focus:bg-amber-50 rounded px-1 print:p-0 print:bg-transparent"
                />
              </div>

              <div>
                <p className="font-black">Kế toán trưởng</p>
                <p className="text-[10px] text-slate-500 italic">(Ký, họ tên)</p>
                <div className="h-14"></div>
                <input
                  type="text"
                  value={signerAccountant}
                  onChange={(e) => setSignerAccountant(e.target.value)}
                  className="w-full text-center font-bold text-slate-800 text-[10px] border-0 hover:bg-blue-50/60 focus:bg-amber-50 rounded px-1 print:p-0 print:bg-transparent"
                />
              </div>

              <div>
                <p className="font-black">Người nhận hàng</p>
                <p className="text-[10px] text-slate-500 italic">(Ký, họ tên)</p>
                <div className="h-14"></div>
                <input
                  type="text"
                  value={signerReceiver}
                  onChange={(e) => setSignerReceiver(e.target.value)}
                  placeholder="Họ tên người nhận..."
                  className="w-full text-center font-bold text-slate-900 text-[10px] border-0 hover:bg-blue-50/60 focus:bg-amber-50 rounded px-1 print:p-0 print:bg-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (Hidden when printing) */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex flex-wrap justify-between items-center text-xs no-print gap-2">
          <div className="flex items-center space-x-2 text-slate-600">
            <Printer className="w-4 h-4 text-blue-600" />
            <span>
              Tự động căn chỉnh vừa vặn khổ giấy <strong>A4 hoặc A5</strong> khi in.
            </span>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all flex items-center space-x-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Phiếu Xuất Kho</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

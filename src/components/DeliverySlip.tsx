import React, { useState } from 'react';
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
} from 'lucide-react';
import { Order } from '../types';
import { getStoreInfo, formatVND, formatDateVI, formatDateTimeVI } from '../services/storageService';

interface DeliverySlipProps {
  order: Order | null;
  onClose: () => void;
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

  // Customization Options Before Printing
  const [showPrice, setShowPrice] = useState<boolean>(true); // Ẩn/Hiện giá tiền
  const [showCompanyInfo, setShowCompanyInfo] = useState<boolean>(true); // Ẩn/Hiện thông tin công ty & logo
  const [showQrCode, setShowQrCode] = useState<boolean>(true); // Ẩn/Hiện mã QR ngân hàng
  const [showNotes, setShowNotes] = useState<boolean>(true); // Ẩn/Hiện điều khoản lưu ý
  const [showSignatures, setShowSignatures] = useState<boolean>(true); // Ẩn/Hiện chữ ký

  // Editable text overrides
  const [customSlipTitle, setCustomSlipTitle] = useState<string>('PHIẾU XUẤT KHO');
  const [customNote, setCustomNote] = useState<string>(order.notes || order.deliveryNotes || 'BÁN HÀNG');
  const [customShipperName, setCustomShipperName] = useState<string>(order.deliveryStaffName || '');
  const [customCompanyName, setCustomCompanyName] = useState<string>('CÔNG TY TNHH KDT-89');
  const [customCompanyAddress, setCustomCompanyAddress] = useState<string>(
    'Số 89 - 91 Đường số 1, Khu Hiệp Ân, Phường Chánh Hưng, TPHCM'
  );
  const [customCompanyBank, setCustomCompanyBank] = useState<string>('STK: 220378 - Ngân hàng ACB - PGD Chánh Hưng');
  const [customNoticeText, setCustomNoticeText] = useState<string>(
    'Quý khách hàng vui lòng kiểm tra hàng hóa trước khi thanh toán hoặc ký nhận (không cấn móp, đầy đủ phụ kiện...). Hàng mua rồi không đổi trả. Xin cảm ơn!'
  );

  // Toggle Customizer Panel visibility
  const [isCustomizeOpen, setIsCustomizeOpen] = useState<boolean>(true);

  // Reset to default
  const handleResetCustoms = () => {
    setShowPrice(true);
    setShowCompanyInfo(true);
    setShowQrCode(true);
    setShowNotes(true);
    setShowSignatures(true);
    setCustomSlipTitle('PHIẾU XUẤT KHO');
    setCustomNote(order.notes || order.deliveryNotes || 'BÁN HÀNG');
    setCustomShipperName(order.deliveryStaffName || '');
    setCustomCompanyName('CÔNG TY TNHH KDT-89');
    setCustomCompanyAddress('Số 89 - 91 Đường số 1, Khu Hiệp Ân, Phường Chánh Hưng, TPHCM');
    setCustomCompanyBank('STK: 220378 - Ngân hàng ACB - PGD Chánh Hưng');
    setCustomNoticeText(
      'Quý khách hàng vui lòng kiểm tra hàng hóa trước khi thanh toán hoặc ký nhận (không cấn móp, đầy đủ phụ kiện...). Hàng mua rồi không đổi trả. Xin cảm ơn!'
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const deliveryDateObj = order.deliveryDate ? new Date(order.deliveryDate) : new Date(order.createdAt || Date.now());
  const day = deliveryDateObj.getDate();
  const month = deliveryDateObj.getMonth() + 1;
  const year = deliveryDateObj.getFullYear();

  const totalAmount = order.totalAmount || 0;
  const prepaidAmount = order.prepaidAmount || 0;
  const remainingAmount =
    order.remainingAmount !== undefined ? order.remainingAmount : Math.max(0, totalAmount - prepaidAmount);

  // Dynamic VietQR generator URL for ACB
  const qrBankUrl = `https://api.vietqr.io/image/970416-220378-compact2.jpg?amount=${
    showPrice ? remainingAmount : 0
  }&addInfo=${encodeURIComponent(order.orderCode || 'Thanh toan don hang')}&accountName=CONG%20TY%20TNHH%20KDT-89`;

  // Pad items to at least 6 rows like the user's Excel form
  const tableRowsCount = Math.max(6, (order.items || []).length);
  const paddedItems = Array.from({ length: tableRowsCount }).map((_, i) => {
    return order.items && order.items[i] ? order.items[i] : null;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-6 print-container animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="bg-slate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800 no-print">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <h3 className="font-extrabold text-sm">Xem & Tùy Chỉnh Phiếu Xuất Kho Trước Khi In</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCustomizeOpen(!isCustomizeOpen)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1 border transition-all ${
                isCustomizeOpen
                  ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isCustomizeOpen ? 'Thu gọn tùy chỉnh' : '⚙️ Tùy chỉnh phiếu'}</span>
              {isCustomizeOpen ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
            </button>

            <button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-md flex items-center space-x-1.5 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>In Phiếu / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CUSTOMIZE SETTINGS ACCORDION (Hidden when printing) */}
        {isCustomizeOpen && (
          <div className="bg-slate-50 border-b border-slate-200 p-4 space-y-3.5 text-xs text-slate-800 no-print animate-in slide-in-from-top-2">
            {/* 1. Quick Toggles */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] mr-1">
                Tùy chọn hiển thị:
              </span>

              {/* Toggle Price */}
              <button
                type="button"
                onClick={() => setShowPrice(!showPrice)}
                className={`px-3 py-1.5 rounded-xl font-bold border flex items-center space-x-1.5 transition-all text-xs ${
                  showPrice
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
                    : 'bg-rose-50 border-rose-300 text-rose-700'
                }`}
              >
                {showPrice ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-rose-500" />}
                <span>{showPrice ? 'Đang hiện giá tiền' : 'ĐÃ ẨN GIÁ TIỀN (Phiếu không tiền)'}</span>
              </button>

              {/* Toggle Company Info */}
              <button
                type="button"
                onClick={() => setShowCompanyInfo(!showCompanyInfo)}
                className={`px-3 py-1.5 rounded-xl font-bold border flex items-center space-x-1.5 transition-all text-xs ${
                  showCompanyInfo
                    ? 'bg-blue-50 border-blue-300 text-blue-800 shadow-xs'
                    : 'bg-slate-200 border-slate-300 text-slate-600'
                }`}
              >
                {showCompanyInfo ? <Building className="w-3.5 h-3.5 text-blue-600" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{showCompanyInfo ? 'Hiện thông tin công ty' : 'Ẩn công ty (Giấy tiêu đề sẵn)'}</span>
              </button>

              {/* Toggle QR Code */}
              <button
                type="button"
                onClick={() => setShowQrCode(!showQrCode)}
                className={`px-3 py-1.5 rounded-xl font-bold border flex items-center space-x-1.5 transition-all text-xs ${
                  showQrCode
                    ? 'bg-purple-50 border-purple-300 text-purple-800 shadow-xs'
                    : 'bg-slate-200 border-slate-300 text-slate-600'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{showQrCode ? 'Hiện QR ngân hàng' : 'Ẩn QR ngân hàng'}</span>
              </button>

              {/* Toggle Signatures */}
              <button
                type="button"
                onClick={() => setShowSignatures(!showSignatures)}
                className={`px-3 py-1.5 rounded-xl font-bold border flex items-center space-x-1.5 transition-all text-xs ${
                  showSignatures
                    ? 'bg-slate-100 border-slate-300 text-slate-800'
                    : 'bg-slate-200 border-slate-300 text-slate-500'
                }`}
              >
                <span>{showSignatures ? 'Hiện 4 chữ ký' : 'Ẩn phần chữ ký'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetCustoms}
                className="text-slate-500 hover:text-slate-800 text-[11px] font-bold underline flex items-center space-x-1 ml-auto"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại mặc định</span>
              </button>
            </div>

            {/* 2. Text Override Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Tiêu đề phiếu in:</label>
                <input
                  type="text"
                  value={customSlipTitle}
                  onChange={(e) => setCustomSlipTitle(e.target.value)}
                  placeholder="PHIẾU XUẤT KHO / BÀN GIAO..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Ghi chú phiếu:</label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="BÁN HÀNG, HÀNG MẪU, BẢO HÀNH..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Tên NV Giao Hàng (NVGH):</label>
                <input
                  type="text"
                  value={customShipperName}
                  onChange={(e) => setCustomShipperName(e.target.value)}
                  placeholder="Họ tên nhân viên giao hàng..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Notice override */}
            {showNotes && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Nội dung câu Lưu ý ở chân phiếu:</label>
                <input
                  type="text"
                  value={customNoticeText}
                  onChange={(e) => setCustomNoticeText(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs italic focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* PRINTABLE SLIP CONTENT: MATCHING USER'S TEMPLATE         */}
        {/* ======================================================== */}
        <div className="p-6 sm:p-10 space-y-4 text-black bg-white font-serif text-[11px] leading-tight selection:bg-none print:p-0">
          {/* Header: Logo, Company Info, QR Code */}
          <div className="flex items-start justify-between border-b-2 border-black pb-2 gap-3 min-h-[60px]">
            {/* Left: Logo & Company Address */}
            {showCompanyInfo ? (
              <div className="flex items-center space-x-3 max-w-[500px]">
                <div className="w-14 h-14 border-2 border-slate-900 rounded-xl flex flex-col items-center justify-center p-1 shrink-0 bg-slate-50 shadow-xs print:border-black">
                  <div className="w-full flex items-center justify-center space-x-0.5">
                    <span className="font-black text-rose-600 text-sm tracking-tighter">KDT</span>
                    <span className="font-extrabold text-blue-900 text-[10px]">-89</span>
                  </div>
                  <span className="text-[7px] text-slate-500 uppercase font-sans font-bold">Appliance</span>
                </div>

                <div>
                  <h1 className="text-sm sm:text-base font-black uppercase tracking-tight text-slate-950 font-sans">
                    {customCompanyName}
                  </h1>
                  <p className="text-[10px] text-slate-800 mt-0.5">{customCompanyAddress}</p>
                  <p className="text-[10px] text-slate-800 font-bold">{customCompanyBank}</p>
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
                <div className="w-16 h-16 border border-slate-400 p-0.5 rounded bg-white shadow-xs">
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
            <h2 className="text-xl font-black uppercase tracking-wide font-sans">{customSlipTitle}</h2>
            <p className="text-xs italic mt-0.5">
              Ngày {day} Tháng {month < 10 ? `0${month}` : month} Năm {year}
            </p>

            <div className="flex items-center justify-between text-xs font-bold font-sans mt-2 px-2">
              <div>
                <span>MÃ ĐƠN HÀNG: </span>
                <span className="font-mono text-sm underline">{order.orderCode}</span>
              </div>
              <div>
                <span>NVGH: </span>
                <span className="border-b border-dotted border-black inline-block min-w-[120px] text-center font-normal">
                  {customShipperName || '...............................'}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Information Table */}
          <div className="border border-black text-xs font-sans">
            <div className="grid grid-cols-1 divide-y divide-black">
              <div className="px-2 py-1 flex">
                <span className="w-32 shrink-0 font-bold">- Đơn vị mua hàng:</span>
                <span className="font-medium text-slate-700 italic">Khách lẻ / Đơn lẻ</span>
              </div>

              <div className="px-2 py-1 flex">
                <span className="w-32 shrink-0 font-bold">- Người nhận hàng:</span>
                <span className="font-black text-slate-900">{order.customerName}</span>
              </div>

              <div className="px-2 py-1 flex">
                <span className="w-32 shrink-0 font-bold">- Số điện thoại:</span>
                <span className="font-black font-mono">{order.customerPhone}</span>
              </div>

              <div className="px-2 py-1 flex">
                <span className="w-32 shrink-0 font-bold">- Địa chỉ:</span>
                <span className="font-semibold text-slate-900">{order.deliveryAddress}</span>
              </div>

              <div className="px-2 py-1 flex items-center justify-between">
                <div className="flex">
                  <span className="w-32 shrink-0 font-bold">- Ghi chú:</span>
                  <span className="font-black uppercase text-rose-700">{customNote}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold">Ngày giao: </span>
                  <span className="font-mono font-bold">
                    {formatDateVI(order.deliveryDate || order.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ordered Items Table */}
          <table className="w-full border-collapse border border-black text-[11px] font-sans">
            <thead>
              <tr className="border-b border-black text-center font-black bg-slate-100 text-[10px]">
                <th className="border-r border-black p-1.5 w-8">STT</th>
                <th className="border-r border-black p-1.5">TÊN SẢN PHẨM</th>
                <th className="border-r border-black p-1.5 w-24">MÃ SỐ</th>
                <th className="border-r border-black p-1.5 w-16">ĐƠN VỊ TÍNH</th>
                <th className="border-r border-black p-1.5 w-20">
                  SỐ LƯỢNG
                  <div className="text-[8px] font-normal">YÊU CẦU / THỰC XUẤT</div>
                </th>
                {showPrice && <th className="border-r border-black p-1.5 w-24 text-right">ĐƠN GIÁ</th>}
                {showPrice && <th className="p-1.5 w-24 text-right">THÀNH TIỀN</th>}
              </tr>
            </thead>

            <tbody>
              {paddedItems.map((item, idx) => (
                <tr key={idx} className="border-b border-black h-8 text-[11px]">
                  <td className="border-r border-black text-center p-1 font-bold">
                    {item ? idx + 1 : idx + 1}
                  </td>
                  <td className="border-r border-black p-1 font-bold text-slate-900">
                    {item?.productName || ''}
                  </td>
                  <td className="border-r border-black p-1 text-center font-mono font-semibold">
                    {item?.sku || ''}
                  </td>
                  <td className="border-r border-black p-1 text-center">
                    {item ? 'Cái' : ''}
                  </td>
                  <td className="border-r border-black p-1 text-center font-bold">
                    {item ? item.quantity : ''}
                  </td>
                  {showPrice && (
                    <td className="border-r border-black p-1 text-right font-mono">
                      {item ? formatVND(item.price).replace(' đ', '') : ''}
                    </td>
                  )}
                  {showPrice && (
                    <td className="p-1 text-right font-mono font-bold">
                      {item ? formatVND(item.price * item.quantity).replace(' đ', '') : ''}
                    </td>
                  )}
                </tr>
              ))}

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
                      {formatVND(totalAmount).replace(' đ', '')}
                    </td>
                  </tr>

                  <tr className="border-b border-black font-black text-[11px]">
                    <td colSpan={2} className="border-r border-black p-1.5 uppercase font-sans">
                      ĐÃ THANH TOÁN
                    </td>
                    <td className="border-r border-black p-1.5 text-center text-slate-500 font-mono">X</td>
                    <td className="border-r border-black p-1.5 text-center text-slate-500 font-mono">X</td>
                    <td className="border-r border-black p-1.5 text-center text-slate-500 font-mono">X</td>
                    <td className="border-r border-black p-1.5 text-center text-slate-500 font-mono">X</td>
                    <td className="p-1.5 text-right font-mono font-black text-xs text-emerald-800">
                      {formatVND(prepaidAmount).replace(' đ', '')}
                    </td>
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
                      {formatVND(remainingAmount).replace(' đ', '')}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>

          {/* BẰNG CHỮ (Only shown if showPrice is true) */}
          {showPrice && (
            <div className="border border-black p-2 text-xs font-sans flex items-baseline space-x-2">
              <span className="font-black uppercase tracking-wider shrink-0">BẰNG CHỮ:</span>
              <span className="italic font-bold text-slate-900">
                {numberToVietnameseWords(remainingAmount > 0 ? remainingAmount : totalAmount)}
              </span>
            </div>
          )}

          {/* Lưu ý điều khoản */}
          {showNotes && (
            <div className="border border-black p-2 text-[10px] italic leading-tight text-slate-800 font-serif">
              <strong>Lưu ý:</strong> {customNoticeText}
            </div>
          )}

          {/* 4 Chữ ký kiểm soát */}
          {showSignatures && (
            <div className="pt-2 grid grid-cols-4 gap-2 text-center text-[11px] font-sans">
              <div>
                <p className="font-black">Người giao hàng</p>
                <p className="text-[10px] text-slate-500 italic">(Ký, họ tên)</p>
                <div className="h-16"></div>
                <p className="font-bold text-slate-800 text-[10px]">
                  {customShipperName || ''}
                </p>
              </div>

              <div>
                <p className="font-black">Thủ kho</p>
                <p className="text-[10px] text-slate-500 italic">(Ký, họ tên)</p>
                <div className="h-16"></div>
                <p className="font-bold text-slate-800 text-[10px]">KDT Kho Q1</p>
              </div>

              <div>
                <p className="font-black">Kế toán trưởng</p>
                <p className="text-[10px] text-slate-500 italic">(Ký, họ tên)</p>
                <div className="h-16"></div>
                <p className="font-bold text-slate-800 text-[10px]">ACB-220378</p>
              </div>

              <div>
                <p className="font-black">Người nhận hàng</p>
                <p className="text-[10px] text-slate-500 italic">(Ký, họ tên)</p>
                <div className="h-16"></div>
                <p className="font-bold text-slate-900 text-[10px]">{order.customerName}</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (Hidden when printing) */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex flex-wrap justify-between items-center text-xs no-print gap-2">
          <div className="flex items-center space-x-2 text-slate-600">
            <Printer className="w-4 h-4 text-blue-600" />
            <span>
              Hỗ trợ kết nối mọi máy in: <strong>Máy in văn phòng (Canon/HP/Brother...)</strong>,{' '}
              <strong>máy in nhiệt (A5, 80mm)</strong> hoặc <strong>Lưu file PDF</strong>.
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

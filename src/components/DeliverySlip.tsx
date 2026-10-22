import React from 'react';
import { X, Printer, ShieldCheck, CheckCircle2, Store, Phone, MapPin, User, FileText } from 'lucide-react';
import { Order } from '../types';
import { getStoreInfo, formatVND, formatDateVI, formatDateTimeVI } from '../services/storageService';

interface DeliverySlipProps {
  order: Order | null;
  onClose: () => void;
}

export const DeliverySlip: React.FC<DeliverySlipProps> = ({ order, onClose }) => {
  if (!order) return null;

  const storeInfo = getStoreInfo();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-6 print-container animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between border-b border-slate-800 no-print">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <h3 className="font-extrabold text-sm">Xem & In Phiếu Giao Hàng (Delivery Slip)</h3>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center space-x-1.5 transition-all"
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

        {/* PRINTABLE SLIP CONTENT AREA */}
        <div className="p-6 sm:p-10 space-y-6 text-slate-900 bg-white font-sans text-xs">
          {/* Slip Header */}
          <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-blue-900">
                {storeInfo.name}
              </h1>
              <p className="text-[11px] text-slate-600 mt-1 flex items-center">
                <MapPin className="w-3 h-3 mr-1 inline shrink-0" />
                <span>{storeInfo.address}</span>
              </p>
              <p className="text-[11px] text-slate-600 flex items-center space-x-3 mt-0.5">
                <span>Hotline: <strong>{storeInfo.phone}</strong></span>
                <span>MST: <strong>{storeInfo.taxCode}</strong></span>
              </p>
            </div>

            <div className="text-left sm:text-right border-l-2 sm:border-l-0 sm:border-r-0 border-blue-600 pl-3 sm:pl-0">
              <h2 className="text-lg font-black text-slate-900 uppercase">PHIẾU GIAO HÀNG</h2>
              <p className="text-xs font-bold text-blue-700 font-mono mt-0.5">MÃ ĐƠN: {order.orderCode}</p>
              <p className="text-[11px] text-slate-500">Lập phiếu: {formatDateTimeVI(order.createdAt)}</p>
            </div>
          </div>

          {/* Employee & Delivery Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {/* Sales Staff Info */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">NV Lập đơn (Sales)</p>
              <p className="text-xs font-black text-slate-900 flex items-center space-x-1.5">
                <span>MÃ NV: <strong className="text-blue-700 font-mono bg-blue-100 px-1.5 py-0.5 rounded border border-blue-300">{order.employeeId}</strong></span>
              </p>
              <p className="text-[11px] font-bold text-slate-800">{order.employeeName}</p>
            </div>

            {/* Delivery Staff (Shipper) Info */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">NV Giao hàng (Shipper)</p>
              <p className="text-xs font-black text-slate-900">
                MÃ SHIPPER: <span className="inline-block border-b border-slate-400 font-mono text-slate-400 font-normal px-2">........................................</span>
              </p>
              <p className="text-[11px] font-bold text-slate-900">
                Họ tên Shipper: <span className="inline-block border-b border-slate-300 text-slate-400 font-normal px-2">....................................................</span>
              </p>
            </div>

            {/* Scheduled Delivery Time */}
            <div className="space-y-1 sm:text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Thời gian Giao hàng</p>
              <p className="text-xs font-extrabold text-slate-900">
                Ngày: {formatDateVI(order.deliveryDate)}
              </p>
              <p className="text-[11px] font-bold text-blue-700">Khung giờ: {order.deliveryTime}</p>
            </div>
          </div>

          {/* Customer Details */}
          <div className="space-y-1 border-b border-slate-200 pb-4">
            <h3 className="text-xs font-extrabold uppercase text-slate-800 tracking-wider">THÔNG TIN KHÁCH HÀNG NHẬN HÀNG</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              <p>Họ và tên khách hàng: <strong className="text-slate-900">{order.customerName}</strong></p>
              <p>Số điện thoại: <strong className="text-slate-900 font-mono">{order.customerPhone}</strong></p>
              <p className="sm:col-span-2">Địa chỉ giao hàng: <strong className="text-slate-900">{order.deliveryAddress}</strong></p>
            </div>
          </div>

          {/* Ordered Items Table */}
          <div>
            <h3 className="text-xs font-extrabold uppercase text-slate-800 tracking-wider mb-2">
              DANH SÁCH SẢN PHẨM & THỜI HẠN BẢO HÀNH
            </h3>

            <table className="w-full text-left border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-extrabold text-slate-700 uppercase text-[10px]">
                  <th className="py-2 px-2 border-r border-slate-300 text-center w-8">STT</th>
                  <th className="py-2 px-3 border-r border-slate-300">Tên sản phẩm & SKU</th>
                  <th className="py-2 px-2 border-r border-slate-300 text-center w-12">SL</th>
                  <th className="py-2 px-3 border-r border-slate-300 text-right">Đơn giá</th>
                  <th className="py-2 px-3 border-r border-slate-300 text-center">Bảo hành</th>
                  <th className="py-2 px-3 text-right">Thành tiền</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {order.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="py-2 px-2 border-r border-slate-300 text-center font-bold">{idx + 1}</td>
                    <td className="py-2 px-3 border-r border-slate-300">
                      <p className="font-extrabold text-slate-900">{item.productName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">Mã SKU: {item.sku}</p>
                    </td>
                    <td className="py-2 px-2 border-r border-slate-300 text-center font-bold">{item.quantity}</td>
                    <td className="py-2 px-3 border-r border-slate-300 text-right">{formatVND(item.price)}</td>
                    <td className="py-2 px-3 border-r border-slate-300 text-center">
                      {item.warrantyMonths > 0 ? (
                        <div>
                          <span className="font-bold text-slate-800">
                            {item.warrantyMonths} tháng
                            {item.warrantyMonths >= 12 && ` (${(item.warrantyMonths / 12).toFixed(1).replace(/\.0$/, '')} năm)`}
                          </span>
                          {item.isWarrantyActivated && (
                            <span className="block text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-300 mt-0.5">
                              ĐÃ KÍCH HOẠT BH
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Không BH</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-black text-slate-900">
                      {formatVND(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Totals Breakdown */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-4">
              <div className="text-xs space-y-1 max-w-sm">
                <p>Ghi chú đơn hàng: <span className="italic font-medium">{order.notes || 'Không có ghi chú'}</span></p>
                <p className="text-[11px] text-slate-500 pt-1">
                  * Quý khách vui lòng kiểm tra kĩ sản phẩm, ngoại quan và phiếu bảo hành trước khi thanh toán.
                </p>
              </div>

              {/* Explicit line items table for Total, Shipping, Prepaid, and Remaining Balance */}
              <div className="w-full sm:w-72 space-y-1.5 text-xs font-medium border-t sm:border-t-0 sm:border-l border-slate-300 pt-2 sm:pt-0 sm:pl-4">
                <div className="flex justify-between text-slate-700">
                  <span>Tổng tiền hàng (Subtotal):</span>
                  <span className="font-extrabold text-slate-900">
                    {formatVND(order.subtotal || order.totalAmount)}
                  </span>
                </div>

                <div className="flex justify-between text-slate-700">
                  <span>Phí vận chuyển (Shipping):</span>
                  <span className="font-extrabold text-blue-700">
                    +{formatVND(order.shippingFee || 0)}
                  </span>
                </div>

                <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900">
                  <span>Tổng giá trị đơn hàng:</span>
                  <span className="text-blue-900">{formatVND(order.totalAmount)}</span>
                </div>

                <div className="flex justify-between text-slate-700">
                  <span>Đã thanh toán trước (Cọc/Trả trước):</span>
                  <span className="font-extrabold text-emerald-700">
                    -{formatVND(order.prepaidAmount || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-amber-50 border-2 border-amber-400 p-2 rounded-lg mt-2">
                  <span className="font-black text-amber-900 text-xs">CẦN THU KHI GIAO (COD):</span>
                  <span className="text-base font-black text-amber-900">
                    {formatVND(
                      order.remainingAmount !== undefined
                        ? order.remainingAmount
                        : Math.max(0, order.totalAmount - (order.prepaidAmount || 0))
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Signature Block */}
          <div className="pt-8 grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              <p className="font-extrabold uppercase">NGƯỜI LẬP ĐƠN</p>
              <p className="text-[10px] text-slate-500 font-mono">(Mã NV: {order.employeeId})</p>
              <div className="h-16"></div>
              <p className="font-bold text-slate-800">{order.employeeName}</p>
            </div>

            <div>
              <p className="font-extrabold uppercase">NGƯỜI GIAO HÀNG (SHIPPER)</p>
              <p className="text-[10px] text-slate-500 font-mono">(Mã Shipper: .....................)</p>
              <div className="h-16"></div>
              <p className="font-bold text-slate-400 text-[10px] italic">(Ký & ghi rõ họ tên)</p>
            </div>

            <div>
              <p className="font-extrabold uppercase">KHÁCH HÀNG NHẬN HÀNG</p>
              <p className="text-[10px] text-slate-500">(Xác nhận đã nhận đủ hàng)</p>
              <div className="h-16"></div>
              <p className="font-bold text-slate-800">{order.customerName}</p>
            </div>
          </div>
        </div>

        {/* Modal Footer (Hidden when printing) */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end space-x-3 no-print">
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
            <span>In phiếu giao hàng</span>
          </button>
        </div>
      </div>
    </div>
  );
};

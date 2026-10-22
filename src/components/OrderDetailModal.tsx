import React, { useState } from 'react';
import {
  X,
  Printer,
  User,
  Phone,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  Award,
  FileText,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Send,
  Navigation,
  History,
  Edit,
  Compass,
} from 'lucide-react';
import { Order, OrderStatus, DeliveryLog } from '../types';
import {
  updateOrderDeliveryDetails,
  formatVND,
  formatDateVI,
  formatDateTimeVI,
  getOrderStatusLabel,
  getStaff,
  getStoreInfo,
} from '../services/storageService';
import { DeliveryMapWidget } from './DeliveryMapWidget';
import { DeliveryTrackingMap, MapComponent } from './DeliveryTrackingMap';

// Re-export MapComponent for direct usage or testing
export { MapComponent, DeliveryTrackingMap };

interface OrderDetailModalProps {
  order: Order | null;
  onClose: () => void;
  onOpenPrintSlip: (order: Order) => void;
  onEditOrder?: (order: Order) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  onClose,
  onOpenPrintSlip,
  onEditOrder,
}) => {
  if (!order) return null;

  const staffList = getStaff();
  const deliveryStaffList = staffList.filter((s) => s.role === 'Delivery');
  const storeInfo = getStoreInfo();

  const [currentOrder, setCurrentOrder] = useState<Order>(order);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(order.status);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(order.deliveryStaffId || 'NV004');
  const [driverNote, setDriverNote] = useState<string>('');
  const [showLogForm, setShowLogForm] = useState<boolean>(false);
  const [mapMode, setMapMode] = useState<'leaflet' | 'simulation'>('leaflet');

  const handleUpdateDeliveryStatus = (e: React.FormEvent) => {
    e.preventDefault();

    const chosenStaff = staffList.find((s) => s.employeeId === selectedStaffId);

    const updated = updateOrderDeliveryDetails(currentOrder.id, {
      status: selectedStatus,
      deliveryStaffId: selectedStaffId,
      deliveryStaffName: chosenStaff?.employeeName || currentOrder.deliveryStaffName,
      deliveryStaffPhone: chosenStaff?.phone || currentOrder.deliveryStaffPhone,
      newLogNote: driverNote.trim() ? driverNote.trim() : undefined,
      updatedBy: chosenStaff?.employeeName || 'Bàn giao Shipper',
    });

    if (updated) {
      setCurrentOrder(updated);
      setDriverNote('');
      setShowLogForm(false);
    }
  };

  // Steps definition for visual progress line
  const steps: { key: OrderStatus; label: string; icon: any }[] = [
    { key: 'pending_pickup', label: '1. Chờ lấy hàng', icon: Calendar },
    { key: 'in_transit', label: '2. Đang giao hàng', icon: Truck },
    { key: 'delivered', label: '3. Giao thành công', icon: CheckCircle2 },
  ];

  const getStepIndex = (st: OrderStatus) => {
    if (st === 'pending' || st === 'pending_pickup') return 0;
    if (st === 'delivering' || st === 'in_transit') return 1;
    if (st === 'completed' || st === 'delivered') return 2;
    if (st === 'failed') return 1; // stayed stuck at transit
    return 0;
  };

  const currentStepIdx = getStepIndex(currentOrder.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded tracking-wider uppercase">
                Lộ Trình Giao Hàng Real-Time
              </span>
              <span className="text-xs text-slate-400">({formatDateTimeVI(currentOrder.createdAt)})</span>
            </div>
            <h3 className="font-extrabold text-lg flex items-center space-x-2 mt-1">
              <span>Đơn Hàng: {currentOrder.orderCode}</span>
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            {onEditOrder && (
              <button
                onClick={() => {
                  onClose();
                  onEditOrder(currentOrder);
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-1.5 rounded-xl shadow-xs flex items-center space-x-1.5 text-xs transition-all"
              >
                <Edit className="w-4 h-4" />
                <span>Sửa Đơn</span>
              </button>
            )}
            <button
              onClick={() => {
                onClose();
                onOpenPrintSlip(currentOrder);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3.5 py-1.5 rounded-xl shadow-xs flex items-center space-x-1.5 text-xs transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>In Phiếu Giao</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Scrollable */}
        <div className="p-6 space-y-6 text-xs max-h-[80vh] overflow-y-auto">
          {/* Visual Route Progress Steps Bar */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs font-extrabold text-slate-900 mb-4 flex items-center space-x-2">
              <Navigation className="w-4 h-4 text-blue-600" />
              <span>Tiến Độ Vận Chuyển Đơn Hàng</span>
            </p>

            {currentOrder.status === 'failed' ? (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center space-x-2 text-rose-800 font-bold mb-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Đơn hàng giao thất bại. Vui lòng kiểm tra lịch sử và liên hệ khách hàng!</span>
              </div>
            ) : currentOrder.status === 'cancelled' ? (
              <div className="bg-slate-200 border border-slate-300 p-3 rounded-xl flex items-center space-x-2 text-slate-700 font-bold mb-3">
                <X className="w-5 h-5 text-slate-600 shrink-0" />
                <span>Đơn hàng đã bị hủy bỏ!</span>
              </div>
            ) : null}

            <div className="relative flex items-center justify-between max-w-xl mx-auto px-4">
              {/* Connecting Line */}
              <div className="absolute top-1/2 left-10 right-10 -translate-y-1/2 h-1 bg-slate-200 -z-0">
                <div
                  className="h-full bg-blue-600 transition-all duration-500"
                  style={{
                    width: `${(currentStepIdx / (steps.length - 1)) * 100}%`,
                  }}
                ></div>
              </div>

              {steps.map((step, idx) => {
                const IconComponent = step.icon;
                const isPassed = idx <= currentStepIdx && currentOrder.status !== 'cancelled' && currentOrder.status !== 'failed';
                const isCurrent = idx === currentStepIdx && currentOrder.status !== 'cancelled' && currentOrder.status !== 'failed';

                return (
                  <div key={step.key} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all ${
                        isCurrent
                          ? 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100 shadow-md scale-110'
                          : isPassed
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-400 border-slate-300'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span
                      className={`mt-2 text-[11px] font-extrabold text-center max-w-[90px] ${
                        isCurrent ? 'text-blue-700' : isPassed ? 'text-slate-800' : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Map Simulation & Driver Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Map Column (2 Cols) */}
            <div className="lg:col-span-2 space-y-2">
              {/* View Switcher Tabs */}
              <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-700 flex items-center space-x-1.5 pl-2">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>Theo Dõi Giao Hàng & Định Vị:</span>
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setMapMode('leaflet')}
                    className={`text-xs font-extrabold px-3 py-1 rounded-lg transition-all flex items-center space-x-1.5 ${
                      mapMode === 'leaflet'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Bản Đồ Leaflet (GPS)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapMode('simulation')}
                    className={`text-xs font-extrabold px-3 py-1 rounded-lg transition-all flex items-center space-x-1.5 ${
                      mapMode === 'simulation'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Mô Phỏng Lộ Trình</span>
                  </button>
                </div>
              </div>

              {mapMode === 'leaflet' ? (
                <MapComponent order={currentOrder} storeInfo={storeInfo} />
              ) : (
                <DeliveryMapWidget
                  order={currentOrder}
                  customerName={currentOrder.customerName}
                  customerPhone={currentOrder.customerPhone}
                  deliveryAddress={currentOrder.deliveryAddress}
                  deliveryStaffName={currentOrder.deliveryStaffName}
                  deliveryStaffPhone={currentOrder.deliveryStaffPhone}
                  status={currentOrder.status}
                />
              )}
            </div>

            {/* Delivery Staff & Quick Update Column (1 Col) */}
            <div className="space-y-4">
              {/* Assigned Shipper Details */}
              <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200/80 space-y-3">
                <div className="flex items-center space-x-2 border-b border-blue-200 pb-2">
                  <Truck className="w-4 h-4 text-blue-700" />
                  <h4 className="font-extrabold text-blue-900 text-xs">Nhân Viên Giao Hàng (Shipper)</h4>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Mã Shipper:</span>
                    <span className="font-mono font-extrabold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                      {currentOrder.deliveryStaffId || 'NV004'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Họ tên Shipper:</span>
                    <span className="font-extrabold text-slate-900">
                      {currentOrder.deliveryStaffName || 'Phạm Quốc Việt'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Số điện thoại:</span>
                    <a
                      href={`tel:${currentOrder.deliveryStaffPhone || '0977118899'}`}
                      className="font-bold text-blue-600 hover:underline flex items-center space-x-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{currentOrder.deliveryStaffPhone || '0977118899'}</span>
                    </a>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-blue-200">
                    <span className="text-slate-500 font-medium">Khung giờ dự kiến:</span>
                    <span className="font-bold text-slate-800">{currentOrder.deliveryTime}</span>
                  </div>
                </div>
              </div>

              {/* Quick Update Delivery Status Form */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-extrabold text-slate-900 text-xs flex items-center space-x-1.5">
                    <History className="w-4 h-4 text-blue-600" />
                    <span>Cập Nhật Lộ Trình</span>
                  </span>
                  <button
                    onClick={() => setShowLogForm(!showLogForm)}
                    className="text-[10px] text-blue-600 hover:underline font-bold"
                  >
                    {showLogForm ? 'Thu gọn' : 'Đổi trạng thái'}
                  </button>
                </div>

                {showLogForm ? (
                  <form onSubmit={handleUpdateDeliveryStatus} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Chuyển Trạng Thái:
                      </label>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                      >
                        <option value="pending_pickup">Chờ lấy hàng (Pending Pickup)</option>
                        <option value="in_transit">Đang giao hàng (In Transit)</option>
                        <option value="delivered">Giao thành công (Delivered)</option>
                        <option value="failed">Giao thất bại (Delivery Failed)</option>
                        <option value="cancelled">Đã hủy đơn (Cancelled)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Phân công Shipper:
                      </label>
                      <select
                        value={selectedStaffId}
                        onChange={(e) => setSelectedStaffId(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold bg-slate-50"
                      >
                        {staffList.map((s) => (
                          <option key={s.id} value={s.employeeId}>
                            {s.employeeId} - {s.employeeName} ({s.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Ghi chú cập nhật lộ trình / Lý do:
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Nhập phản hồi từ Shipper hoặc ghi chú vị trí..."
                        value={driverNote}
                        onChange={(e) => setDriverNote(e.target.value)}
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 rounded-xl shadow-xs flex items-center justify-center space-x-1.5 transition-all text-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Lưu Cập Nhật Vận Chuyển</span>
                    </button>
                  </form>
                ) : (
                  <div className="space-y-2">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-medium block">Trạng thái hiện tại:</span>
                      <span className="font-extrabold text-blue-700 text-xs">
                        {getOrderStatusLabel(currentOrder.status)}
                      </span>
                    </div>

                    <button
                      onClick={() => setShowLogForm(true)}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs transition-colors"
                    >
                      Cập nhật trạng thái / Đổi Shipper
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timeline History Logs */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="font-extrabold text-slate-900 text-xs flex items-center space-x-2 border-b border-slate-100 pb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Nhật Ký Lộ Trình Cập Nhật (Route Logs Timeline)</span>
            </h4>

            <div className="space-y-3 pl-2 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {currentOrder.deliveryLogs && currentOrder.deliveryLogs.length > 0 ? (
                currentOrder.deliveryLogs.map((log, idx) => (
                  <div key={log.id || idx} className="relative flex items-start space-x-3 text-xs">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] z-10 shrink-0 shadow-xs">
                      {idx + 1}
                    </div>

                    <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                          {getOrderStatusLabel(log.status)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDateTimeVI(log.timestamp)}
                        </span>
                      </div>

                      <p className="text-slate-800 font-medium text-xs mt-1">{log.note}</p>

                      {log.updatedBy && (
                        <p className="text-[10px] text-slate-500 pt-1">
                          Cập nhật bởi: <span className="font-bold text-slate-700">{log.updatedBy}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 italic py-2">Chưa có nhật ký ghi nhận.</p>
              )}
            </div>
          </div>

          {/* Employee & Customer Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nhân viên tạo đơn</p>
              <p className="font-bold text-slate-900">
                Mã NV: <span className="text-blue-700 font-mono font-extrabold">{currentOrder.employeeId}</span>
              </p>
              <p className="text-slate-700">{currentOrder.employeeName}</p>
            </div>

            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Lịch hẹn giao hàng</p>
              <p className="font-bold text-slate-900">{formatDateVI(currentOrder.deliveryDate)}</p>
              <p className="text-slate-700">{currentOrder.deliveryTime}</p>
            </div>

            <div className="sm:col-span-2 pt-2 border-t border-slate-200">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Thông tin khách hàng & Địa chỉ giao
              </p>
              <p className="font-bold text-slate-900">
                {currentOrder.customerName} - {currentOrder.customerPhone}
              </p>
              <p className="text-slate-700">{currentOrder.deliveryAddress}</p>
            </div>
          </div>

          {/* Ordered Products Table */}
          <div>
            <h4 className="font-extrabold text-slate-900 mb-2">Sản phẩm trong đơn ({currentOrder.items.length})</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-[11px]">
                    <th className="py-2.5 px-3">Sản phẩm</th>
                    <th className="py-2.5 px-2 text-center">SL</th>
                    <th className="py-2.5 px-3 text-right">Đơn giá</th>
                    <th className="py-2.5 px-3 text-center">Bảo hành</th>
                    <th className="py-2.5 px-3 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentOrder.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3">
                        <p className="font-extrabold text-slate-900">{item.productName}</p>
                        <p className="text-[10px] text-slate-500 font-mono">SKU: {item.sku}</p>
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right">{formatVND(item.price)}</td>
                      <td className="py-2.5 px-3 text-center">
                        {item.warrantyMonths > 0 ? (
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.isWarrantyActivated
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {item.warrantyMonths} tháng {item.isWarrantyActivated ? '(Đã kích hoạt)' : 'Chưa BH'}
                            </span>
                            {item.isWarrantyActivated && (
                              <span className="text-[9px] font-extrabold text-emerald-700 mt-0.5">
                                Thưởng: +{formatVND((item.activationBonusAmount || 0) * item.quantity)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Không</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900">
                        {formatVND(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-slate-900 text-white p-5 rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-800 text-xs">
              <div>
                <span className="text-slate-400">Tổng tiền hàng (Subtotal): </span>
                <span className="font-extrabold text-white">{formatVND(currentOrder.subtotal || currentOrder.totalAmount)}</span>
              </div>
              <div className="sm:text-right">
                <span className="text-slate-400">Phí vận chuyển: </span>
                <span className="font-extrabold text-blue-300">+{formatVND(currentOrder.shippingFee || 0)}</span>
              </div>
              <div>
                <span className="text-slate-400">Số tiền đã trả trước: </span>
                <span className="font-extrabold text-emerald-400">-{formatVND(currentOrder.prepaidAmount || 0)}</span>
              </div>
              <div className="sm:text-right">
                <span className="text-slate-400">Thưởng kích hoạt BH (NV {currentOrder.employeeId}): </span>
                <span className="font-extrabold text-emerald-400">+{formatVND(currentOrder.totalBonusEarned)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div>
                <span className="text-[11px] text-slate-400 block">Tổng giá trị đơn hàng:</span>
                <span className="text-lg font-black text-blue-400">{formatVND(currentOrder.totalAmount)}</span>
                {currentOrder.debtDueDate && (currentOrder.remainingAmount || 0) > 0 && (
                  <span className="text-[10px] text-amber-300 block mt-0.5">
                    Hạn thanh toán công nợ: {formatDateVI(currentOrder.debtDueDate)}
                  </span>
                )}
              </div>
              <div className="text-right bg-slate-800/80 px-4 py-2 rounded-xl border border-amber-500/30">
                <span className="text-[10px] text-amber-400 font-bold block uppercase tracking-wider">
                  Số tiền còn lại cần thu (COD):
                </span>
                <span className="text-xl font-black text-amber-300">
                  {formatVND(
                    currentOrder.remainingAmount !== undefined
                      ? currentOrder.remainingAmount
                      : Math.max(0, currentOrder.totalAmount - (currentOrder.prepaidAmount || 0))
                  )}
                </span>
              </div>
            </div>

            {/* Payment Logs History if available */}
            {currentOrder.paymentLogs && currentOrder.paymentLogs.length > 0 && (
              <div className="pt-2 border-t border-slate-800 text-xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1.5">
                  Lịch sử phiếu thu đã ghi nhận ({currentOrder.paymentLogs.length}):
                </span>
                <div className="space-y-1.5">
                  {currentOrder.paymentLogs.map((p, pIdx) => (
                    <div
                      key={p.id || pIdx}
                      className="bg-slate-950/60 px-3 py-1.5 rounded-lg flex items-center justify-between text-[11px]"
                    >
                      <span className="text-slate-300">
                        <span className="font-mono text-blue-300 mr-2">{p.receiptCode || `PT-0${pIdx + 1}`}</span>
                        {p.note || 'Thanh toán'}
                      </span>
                      <span className="font-black text-emerald-400">+{formatVND(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end space-x-2">
          {onEditOrder && (
            <button
              onClick={() => {
                onClose();
                onEditOrder(currentOrder);
              }}
              className="px-4 py-2 text-xs font-extrabold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-colors flex items-center space-x-1.5"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Chỉnh Sửa Đơn</span>
            </button>
          )}
          <button
            onClick={() => onOpenPrintSlip(currentOrder)}
            className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>In Phiếu Giao Hàng</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  ClipboardList,
  Search,
  Filter,
  Printer,
  Eye,
  Trash2,
  Calendar,
  User,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  Award,
  ChevronRight,
  UserCheck,
  Edit,
  Phone,
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import {
  updateOrderStatus,
  deleteOrder,
  formatVND,
  formatDateVI,
  formatDateTimeVI,
  exportOrdersAsCsv,
  calculateDistanceKm,
  getStoreInfo,
  getGoogleMapsDirectionsUrl,
} from '../services/storageService';
import { UploadCloud, Download, Database, MapPin, ExternalLink, Navigation } from 'lucide-react';

interface OrderListProps {
  orders: Order[];
  onSelectOrderForSlip: (order: Order) => void;
  onSelectOrderForDetail: (order: Order) => void;
  onEditOrder?: (order: Order) => void;
  onOpenDataManagement?: () => void;
  onNavigateToDeliverySchedule?: () => void;
}

export const OrderList: React.FC<OrderListProps> = ({
  orders,
  onSelectOrderForSlip,
  onSelectOrderForDetail,
  onEditOrder,
  onOpenDataManagement,
  onNavigateToDeliverySchedule,
}) => {
  const storeInfo = getStoreInfo();
  const storeLat = storeInfo.lat || 10.7698;
  const storeLng = storeInfo.lng || 106.6897;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [deliveryStaffFilter, setDeliveryStaffFilter] = useState<string>('all');

  // Extract unique employee IDs for sales filter
  const uniqueEmployees = Array.from(new Set(orders.map((o) => o.employeeId || 'KDV')));
  
  // Extract unique delivery staff for shipper filter
  const uniqueDeliveryStaff = Array.from(
    new Set(orders.map((o) => o.deliveryStaffId).filter(Boolean))
  ) as string[];

  // Filter Orders
  const filteredOrders = orders.filter((order) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      order.orderCode.toLowerCase().includes(q) ||
      order.customerName.toLowerCase().includes(q) ||
      order.customerPhone.toLowerCase().includes(q) ||
      (order.employeeId && order.employeeId.toLowerCase().includes(q)) ||
      (order.employeeName && order.employeeName.toLowerCase().includes(q)) ||
      (order.deliveryStaffId && order.deliveryStaffId.toLowerCase().includes(q)) ||
      (order.deliveryStaffName && order.deliveryStaffName.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === 'all' ||
      order.status === statusFilter ||
      (statusFilter === 'pending_pickup' && (order.status === 'pending' || order.status === 'pending_pickup')) ||
      (statusFilter === 'in_transit' && (order.status === 'delivering' || order.status === 'in_transit')) ||
      (statusFilter === 'delivered' && (order.status === 'completed' || order.status === 'delivered'));

    const matchesEmployee = employeeFilter === 'all' || order.employeeId === employeeFilter;
    const matchesDeliveryStaff = deliveryStaffFilter === 'all' || order.deliveryStaffId === deliveryStaffFilter;

    return matchesSearch && matchesStatus && matchesEmployee && matchesDeliveryStaff;
  });

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    updateOrderStatus(orderId, newStatus);
  };

  const handleDelete = (orderId: string, orderCode: string) => {
    if (window.confirm(`Bạn có chắc muốn xóa đơn hàng ${orderCode}?`)) {
      deleteOrder(orderId);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <ClipboardList className="w-6 h-6 text-blue-600" />
            <span>Danh sách Đơn hàng (Order History)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tra cứu thông tin đơn hàng, lọc theo Mã nhân viên (Employee ID), thay đổi trạng thái và in phiếu giao hàng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToDeliverySchedule && (
            <button
              type="button"
              onClick={onNavigateToDeliverySchedule}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Truck className="w-4 h-4 text-amber-300" />
              <span>Chế độ Lịch Trình Vận Chuyển & Khoảng cách →</span>
            </button>
          )}

          {onOpenDataManagement && (
            <button
              type="button"
              onClick={onOpenDataManagement}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-extrabold px-3.5 py-1.5 rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Nạp đơn cũ</span>
            </button>
          )}

          <button
            type="button"
            onClick={exportOrdersAsCsv}
            title="Xuất toàn bộ đơn hàng ra file Excel .csv"
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>

          <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            Tổng: <span className="text-blue-600">{filteredOrders.length}</span> / {orders.length} đơn
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search input with Employee ID & Shipper support */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo Mã đơn, KH, Mã NV hoặc Shipper..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Sales Employee Filter */}
          <div className="flex items-center space-x-1 text-xs">
            <UserCheck className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 font-bold px-2.5 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả NV Bán hàng ({uniqueEmployees.length})</option>
              {uniqueEmployees.map((emp) => (
                <option key={emp} value={emp}>
                  NV Bán hàng: {emp}
                </option>
              ))}
            </select>
          </div>

          {/* Delivery Staff (Shipper) Filter */}
          <div className="flex items-center space-x-1 text-xs">
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={deliveryStaffFilter}
              onChange={(e) => setDeliveryStaffFilter(e.target.value)}
              className="bg-blue-50/60 border border-blue-200 text-blue-900 font-bold px-2.5 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả Shipper ({uniqueDeliveryStaff.length})</option>
              {uniqueDeliveryStaff.map((staffId) => (
                <option key={staffId} value={staffId}>
                  Shipper: {staffId}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 font-bold px-2.5 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending_pickup">Chờ lấy hàng</option>
              <option value="in_transit">Đang giao hàng</option>
              <option value="delivered">Giao thành công</option>
              <option value="failed">Giao thất bại</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </div>
      </div>

      {/* MOBILE VIEW: Vertical Order Cards (Visible on screens < 768px, optimized for 360px-430px) */}
      <div className="block md:hidden space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
            Không tìm thấy đơn hàng nào khớp với tìm kiếm.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isCompleted = order.status === 'completed' || order.status === 'delivered';
            const isDelivering = order.status === 'delivering' || order.status === 'in_transit';
            const isPending = order.status === 'pending' || order.status === 'pending_pickup';

            const statusLabel =
              isCompleted ? 'Giao thành công' :
              isDelivering ? 'Đang giao hàng' :
              isPending ? 'Chờ lấy hàng' :
              order.status === 'failed' ? 'Giao thất bại' :
              order.status === 'cancelled' ? 'Đã hủy' : order.status;

            const statusBadgeClass =
              isCompleted ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
              isDelivering ? 'bg-blue-100 text-blue-800 border-blue-300' :
              isPending ? 'bg-amber-100 text-amber-800 border-amber-300' :
              'bg-slate-100 text-slate-700 border-slate-300';

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 hover:border-blue-300 transition-all"
              >
                {/* 1. Card Top: Order Code, Time & Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => onSelectOrderForDetail(order)}
                      className="font-black text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-xl border border-blue-200 transition-colors shrink-0"
                    >
                      {order.orderCode}
                    </button>
                    <span className="text-[10px] text-slate-400 font-medium truncate">
                      {formatDateVI(order.createdAt)}
                    </span>
                  </div>

                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${statusBadgeClass}`}>
                    {statusLabel}
                  </span>
                </div>

                {/* 2. Customer Info & Quick Phone Call */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-extrabold text-xs text-slate-900 truncate">{order.customerName}</p>
                      <p className="text-[10px] text-slate-400">
                        NV Bán: <span className="font-bold text-slate-700">{order.employeeId}</span>
                      </p>
                    </div>

                    <a
                      href={`tel:${order.customerPhone}`}
                      className="min-h-[44px] min-w-[44px] px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs shrink-0 active:scale-95 transition-transform"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span className="font-mono">{order.customerPhone}</span>
                    </a>
                  </div>

                  {order.deliveryAddress && (
                    <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-200/60 text-xs text-slate-600">
                      <div className="flex items-start space-x-1.5 min-w-0 flex-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-tight line-clamp-2 text-slate-700">
                          {order.deliveryAddress}
                        </span>
                      </div>
                      <a
                        href={getGoogleMapsDirectionsUrl(storeLat, storeLng, order.deliveryLat, order.deliveryLng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 shrink-0 shadow-xs"
                        title="Chỉ đường Google Maps"
                      >
                        <Navigation className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>

                {/* 3. Delivery Schedule & Assigned Shipper */}
                <div className="flex items-center justify-between text-xs px-1 text-slate-600">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="text-[11px] font-semibold text-slate-800 truncate">
                      {formatDateVI(order.deliveryDate)} ({order.deliveryTime})
                    </span>
                  </div>
                  <div className="text-[11px] shrink-0">
                    <span className="text-slate-400">Shipper: </span>
                    <span className="font-bold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded text-[10px]">
                      {order.deliveryStaffName || 'Chưa phân công'}
                    </span>
                  </div>
                </div>

                {/* 4. Financial Totals */}
                <div className="flex items-baseline justify-between pt-2 border-t border-slate-100 px-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Tổng tiền đơn</span>
                    <span className="text-sm font-black text-slate-900">{formatVND(order.totalAmount)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">Thu COD / Nợ</span>
                    <span
                      className={`text-xs font-black ${
                        (order.remainingAmount || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {(order.remainingAmount || 0) > 0 ? formatVND(order.remainingAmount || 0) : 'Đã thu đủ (0đ)'}
                    </span>
                  </div>
                </div>

                {/* 5. Mobile Action Buttons (All min-h-[44px]) */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onSelectOrderForSlip(order)}
                    className="min-h-[44px] bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-1 shadow-xs transition-transform"
                  >
                    <Printer className="w-4 h-4" />
                    <span>In phiếu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectOrderForDetail(order)}
                    className="min-h-[44px] bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center space-x-1 border border-slate-200 transition-colors"
                  >
                    <Eye className="w-4 h-4 text-slate-600" />
                    <span>Chi tiết</span>
                  </button>

                  {onEditOrder && (
                    <button
                      type="button"
                      onClick={() => onEditOrder(order)}
                      className="min-h-[44px] bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 font-bold text-xs rounded-xl flex items-center justify-center space-x-1 border border-amber-200 transition-colors"
                    >
                      <Edit className="w-4 h-4 text-amber-700" />
                      <span>Sửa đơn</span>
                    </button>
                  )}
                </div>

                {/* 6. Quick Status Update Dropdown for Mobile */}
                <div className="pt-1">
                  <select
                    value={
                      order.status === 'pending' ? 'pending_pickup' :
                      order.status === 'delivering' ? 'in_transit' :
                      order.status === 'completed' ? 'delivered' : order.status
                    }
                    onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                    className="w-full min-h-[44px] px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending_pickup">Chờ lấy hàng (Pending Pickup)</option>
                    <option value="in_transit">Đang giao hàng (In Transit)</option>
                    <option value="delivered">Giao thành công (Delivered)</option>
                    <option value="failed">Giao thất bại (Delivery Failed)</option>
                    <option value="cancelled">Đã hủy (Cancelled)</option>
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Orders Table (Desktop) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-3.5">Mã đơn & Ngày</th>
                <th className="py-3.5 px-3.5">Khách hàng & SĐT</th>
                <th className="py-3.5 px-3.5 text-center">NV Lên Đơn</th>
                <th className="py-3.5 px-3.5 text-center">Shipper Giao Hàng</th>
                <th className="py-3.5 px-3.5">Lịch giao hàng</th>
                <th className="py-3.5 px-3.5 text-right">Tổng tiền</th>
                <th className="py-3.5 px-3.5 text-center">Lộ trình & Trạng thái</th>
                <th className="py-3.5 px-3.5 text-center">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Không tìm thấy đơn hàng nào khớp với tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Order Code & Date */}
                    <td className="py-3.5 px-3.5">
                      <button
                        onClick={() => onSelectOrderForDetail(order)}
                        className="font-extrabold text-blue-700 hover:underline text-left block"
                      >
                        {order.orderCode}
                      </button>
                      <span className="text-[10px] text-slate-400 block">{formatDateTimeVI(order.createdAt)}</span>
                    </td>

                    {/* Customer Info */}
                    <td className="py-3.5 px-3.5">
                      <p className="font-extrabold text-slate-900">{order.customerName}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{order.customerPhone}</p>
                    </td>

                    {/* Sales Employee ID & Name */}
                    <td className="py-3.5 px-3.5 text-center">
                      <div className="inline-block text-center">
                        <span className="bg-slate-800 text-white font-extrabold text-[10px] px-2 py-0.5 rounded border border-slate-700">
                          {order.employeeId}
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[90px]">{order.employeeName}</p>
                      </div>
                    </td>

                    {/* Delivery Staff (Shipper) */}
                    <td className="py-3.5 px-3.5 text-center">
                      {order.deliveryStaffName ? (
                        <div className="inline-block text-center">
                          <span className="bg-blue-100 text-blue-900 font-extrabold text-[10px] px-2 py-0.5 rounded border border-blue-300">
                            {order.deliveryStaffId || 'Shipper'}
                          </span>
                          <p className="text-[10px] font-bold text-blue-800 mt-0.5 truncate max-w-[100px]">
                            {order.deliveryStaffName}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Chưa phân công</span>
                      )}
                    </td>

                    {/* Scheduled Delivery Time & Distance */}
                    <td className="py-3.5 px-3.5">
                      <p className="font-bold text-slate-800">{formatDateVI(order.deliveryDate)}</p>
                      <p className="text-[11px] text-slate-500">{order.deliveryTime}</p>
                      {(() => {
                        const custLat = order.deliveryLat || (storeLat + (Math.sin(order.id.charCodeAt(order.id.length - 1)) * 0.035));
                        const custLng = order.deliveryLng || (storeLng + (Math.cos(order.id.charCodeAt(order.id.length - 1)) * 0.04));
                        const distKm = calculateDistanceKm(storeLat, storeLng, custLat, custLng);
                        const mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${storeLat},${storeLng}&destination=${custLat},${custLng}&travelmode=driving`;
                        return (
                          <div className="mt-1 flex items-center space-x-1.5">
                            <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Navigation className="w-2.5 h-2.5 text-blue-600" />
                              <span>{distKm} km</span>
                            </span>
                            <a
                              href={mapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold underline flex items-center gap-0.5"
                              title="Mở chỉ đường Google Maps tại Việt Nam"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              <span>Chỉ đường</span>
                            </a>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Total Amount */}
                    <td className="py-3.5 px-3.5 text-right font-black text-slate-900">
                      {formatVND(order.totalAmount)}
                    </td>

                    {/* Order Status Selector */}
                    <td className="py-3.5 px-3.5 text-center">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                        className={`text-[11px] font-extrabold px-2 py-1 rounded-xl border focus:outline-none cursor-pointer ${
                          order.status === 'pending' || order.status === 'pending_pickup'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : order.status === 'delivering' || order.status === 'in_transit'
                            ? 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse'
                            : order.status === 'completed' || order.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : order.status === 'failed'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        <option value="pending_pickup">Chờ lấy hàng</option>
                        <option value="in_transit">Đang giao hàng</option>
                        <option value="delivered">Giao thành công</option>
                        <option value="failed">Giao thất bại</option>
                        <option value="cancelled">Đã hủy</option>
                      </select>
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => onSelectOrderForSlip(order)}
                          title="In phiếu giao hàng (Delivery Slip)"
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1.5 rounded-lg shadow-xs transition-all flex items-center space-x-1 text-[11px]"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>In phiếu</span>
                        </button>

                        {onEditOrder && (
                          <button
                            onClick={() => onEditOrder(order)}
                            title="Sửa đơn hàng"
                            className="px-2 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold transition-colors flex items-center space-x-1 text-[11px]"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Sửa đơn</span>
                          </button>
                        )}

                        <button
                          onClick={() => onSelectOrderForDetail(order)}
                          title="Xem chi tiết đơn hàng"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(order.id, order.orderCode)}
                          title="Xóa đơn hàng"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

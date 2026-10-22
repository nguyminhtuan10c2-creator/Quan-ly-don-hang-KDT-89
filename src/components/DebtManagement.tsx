import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  AlertTriangle,
  Clock,
  CheckCircle2,
  DollarSign,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  Send,
  Phone,
  MessageSquare,
  Copy,
  Check,
  X,
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
  Truck,
  UserCheck,
  ChevronRight,
  Receipt,
  Layers,
  History,
} from 'lucide-react';
import { Order, Staff, StoreInfo, PaymentLog } from '../types';
import {
  formatVND,
  formatDateVI,
  formatDateTimeVI,
  getOrderStatusLabel,
  recordDebtPayment,
  settleShipperCod,
  batchSettleShipperCod,
  updateOrderDebtDueDate,
  exportDebtListAsCsv,
  getStoreInfo,
  getStaff,
} from '../services/storageService';

interface DebtManagementProps {
  orders: Order[];
  onNavigateToRevenue?: () => void;
  onViewOrderDetail?: (order: Order) => void;
}

type DebtTabType = 'all_debt' | 'overdue' | 'shipper_pending' | 'customer_debt' | 'fully_paid';

export const DebtManagement: React.FC<DebtManagementProps> = ({
  orders,
  onNavigateToRevenue,
  onViewOrderDetail,
}) => {
  const storeInfo = useMemo(() => getStoreInfo(), []);
  const staffList = useMemo(() => getStaff(), []);

  // Filter States
  const [activeTab, setActiveTab] = useState<DebtTabType>('all_debt');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedShipperFilter, setSelectedShipperFilter] = useState<string>('all');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'debt_desc' | 'due_date_asc' | 'date_desc'>('debt_desc');

  // Modals state
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'card' | 'momo_vnpay'>('cash');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [paymentReceivedBy, setPaymentReceivedBy] = useState<string>('Kế toán bán hàng');
  const [paymentReceiptCode, setPaymentReceiptCode] = useState<string>('');

  // Reminder Modal
  const [reminderOrder, setReminderOrder] = useState<Order | null>(null);
  const [copiedReminder, setCopiedReminder] = useState<boolean>(false);

  // Due Date Change Modal
  const [dueDateOrder, setDueDateOrder] = useState<Order | null>(null);
  const [newDueDate, setNewDueDate] = useState<string>('');

  // Payment Logs Modal
  const [historyOrder, setHistoryOrder] = useState<Order | null>(null);

  // Batch Selection for Shipper COD settlement
  const [selectedCodIds, setSelectedCodIds] = useState<string[]>([]);
  const [batchSettling, setBatchSettling] = useState<boolean>(false);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Compute stats across all orders
  const stats = useMemo(() => {
    let totalReceivables = 0; // Total remainingAmount > 0
    let overdueAmount = 0;
    let overdueCount = 0;
    let shipperCodAmount = 0;
    let shipperCodCount = 0;
    let totalCollected = 0;
    let fullyPaidCount = 0;

    orders.forEach((o) => {
      const remaining = o.remainingAmount || 0;
      const prepaid = o.prepaidAmount || 0;
      const isDelivered = o.status === 'delivered' || o.status === 'completed';

      totalCollected += prepaid;

      if (remaining > 0) {
        totalReceivables += remaining;

        // Check overdue
        if (o.debtDueDate && o.debtDueDate < todayStr) {
          overdueAmount += remaining;
          overdueCount++;
        }

        // Check shipper holding COD: delivered but not settled
        if (isDelivered && !o.codSettledToShop) {
          shipperCodAmount += remaining;
          shipperCodCount++;
        }
      } else {
        fullyPaidCount++;
      }
    });

    return {
      totalReceivables,
      overdueAmount,
      overdueCount,
      shipperCodAmount,
      shipperCodCount,
      totalCollected,
      fullyPaidCount,
    };
  }, [orders, todayStr]);

  // Filtered orders according to tab and inputs
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const remaining = order.remainingAmount || 0;
        const isDelivered = order.status === 'delivered' || order.status === 'completed';
        const isOverdue = remaining > 0 && !!order.debtDueDate && order.debtDueDate < todayStr;
        const isShipperPending = remaining > 0 && isDelivered && !order.codSettledToShop;

        // Tab Filter
        if (activeTab === 'all_debt') {
          if (remaining <= 0) return false;
        } else if (activeTab === 'overdue') {
          if (!isOverdue) return false;
        } else if (activeTab === 'shipper_pending') {
          if (!isShipperPending) return false;
        } else if (activeTab === 'customer_debt') {
          if (remaining <= 0) return false;
        } else if (activeTab === 'fully_paid') {
          if (remaining > 0) return false;
        }

        // Shipper filter
        if (selectedShipperFilter !== 'all') {
          if (order.deliveryStaffId !== selectedShipperFilter) return false;
        }

        // Staff filter
        if (selectedStaffFilter !== 'all') {
          if ((order.employeeId || '').toUpperCase() !== selectedStaffFilter.toUpperCase()) return false;
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchCode = (order.orderCode || '').toLowerCase().includes(q);
          const matchCust = (order.customerName || '').toLowerCase().includes(q);
          const matchPhone = (order.customerPhone || '').includes(q);
          const matchShipper = (order.deliveryStaffName || '').toLowerCase().includes(q);
          if (!matchCode && !matchCust && !matchPhone && !matchShipper) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'debt_desc') {
          return (b.remainingAmount || 0) - (a.remainingAmount || 0);
        } else if (sortBy === 'due_date_asc') {
          const dueA = a.debtDueDate || '9999-99-99';
          const dueB = b.debtDueDate || '9999-99-99';
          return dueA.localeCompare(dueB);
        } else {
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        }
      });
  }, [
    orders,
    activeTab,
    selectedShipperFilter,
    selectedStaffFilter,
    searchQuery,
    sortBy,
    todayStr,
  ]);

  // Handle open payment modal
  const handleOpenPayment = (order: Order) => {
    setPaymentModalOrder(order);
    const remaining = order.remainingAmount || Math.max(0, order.totalAmount - (order.prepaidAmount || 0));
    setPaymentAmount(remaining);
    setPaymentMethod('cash');
    setPaymentNote(`Thu hồi nợ đơn hàng ${order.orderCode}`);
    setPaymentReceivedBy('Kế toán bán hàng');
    setPaymentReceiptCode(`PT-${order.orderCode.replace(/[^0-9A-Z]/g, '')}-${Date.now().toString().slice(-4)}`);
  };

  // Submit payment
  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalOrder) return;

    if (paymentAmount <= 0) {
      alert('Vui lòng nhập số tiền thu lớn hơn 0!');
      return;
    }

    const updated = recordDebtPayment(paymentModalOrder.id, {
      amount: paymentAmount,
      method: paymentMethod,
      note: paymentNote,
      receivedBy: paymentReceivedBy,
      receiptCode: paymentReceiptCode,
    });

    if (updated) {
      setPaymentModalOrder(null);
    }
  };

  // Handle Settle Single Shipper COD
  const handleSettleCod = (order: Order) => {
    if (window.confirm(`Xác nhận Shipper ${order.deliveryStaffName || ''} đã bàn giao đủ ${formatVND(order.remainingAmount || 0)} tiền COD của đơn ${order.orderCode} về cho cửa hàng?`)) {
      settleShipperCod(order.id, 'Kế toán cửa hàng', `Đã nhận bàn giao tiền COD từ Shipper`);
    }
  };

  // Handle Batch Settle Shipper COD
  const handleBatchSettleCod = () => {
    if (selectedCodIds.length === 0) return;
    if (window.confirm(`Xác nhận quyết toán nộp tiền COD cho ${selectedCodIds.length} đơn hàng đã chọn?`)) {
      setBatchSettling(true);
      batchSettleShipperCod(selectedCodIds, 'Kế toán cửa hàng');
      setSelectedCodIds([]);
      setBatchSettling(false);
    }
  };

  // Open Due Date Modal
  const handleOpenDueDateModal = (order: Order) => {
    setDueDateOrder(order);
    setNewDueDate(order.debtDueDate || todayStr);
  };

  // Save new due date
  const handleSaveDueDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueDateOrder || !newDueDate) return;
    updateOrderDebtDueDate(dueDateOrder.id, newDueDate);
    setDueDateOrder(null);
  };

  // Generate Reminder Message
  const getReminderMessage = (order: Order) => {
    const remaining = formatVND(order.remainingAmount || 0);
    const dueDateFormatted = order.debtDueDate ? formatDateVI(order.debtDueDate) : 'hôm nay';
    return `Kính chào Anh/Chị ${order.customerName},\n\nCửa hàng ${storeInfo.name} xin gửi lời cảm ơn Quý khách đã mua sắm.\nBộ phận Kế toán xin phép nhắc lịch thanh toán cho đơn hàng ${order.orderCode}.\n\n- Số tiền cần thanh toán: ${remaining}\n- Hạn thanh toán: ${dueDateFormatted}\n\nQuý khách có thể chuyển khoản thanh toán theo thông tin:\n- Đơn vị thụ hưởng: ${storeInfo.name}\n- Số tài khoản: 0312345678 (MB Bank / Vietcombank)\n- Nội dung chuyển khoản: TT ${order.orderCode} - ${order.customerPhone}\n\nMọi thắc mắc xin vui lòng liên hệ hotline: ${storeInfo.phone}.\nXin chân thành cảm ơn Quý khách!`;
  };

  const handleCopyReminder = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedReminder(true);
    setTimeout(() => setCopiedReminder(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 rounded-2xl p-6 text-white shadow-xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs tracking-wider uppercase mb-1">
            <Receipt className="w-4 h-4" />
            <span>Kế Toán & Đối Soát Công Nợ</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center space-x-3">
            <span>Sổ Theo Dõi Công Nợ & Thu Hộ COD</span>
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Quản lý chi tiết công nợ phải thu từ khách hàng, theo dõi các khoản nợ quá hạn, đối soát quyết toán tiền thu hộ COD từ nhân viên giao hàng và ghi nhận phiếu thu.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 no-print">
          {onNavigateToRevenue && (
            <button
              onClick={onNavigateToRevenue}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center space-x-2 shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Báo cáo doanh thu</span>
            </button>
          )}

          <button
            onClick={() => exportDebtListAsCsv(filteredOrders)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center space-x-2 shadow-md shadow-emerald-600/20 transition-all"
            title="Xuất Sổ Công Nợ Excel CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất file Excel CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">In sổ nợ</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Receivables */}
        <div
          onClick={() => setActiveTab('all_debt')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'all_debt'
              ? 'bg-blue-50/70 border-blue-400 shadow-sm'
              : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tổng công nợ phải thu
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-2">
            {formatVND(stats.totalReceivables)}
          </h3>
          <p className="mt-2 text-xs text-slate-500">
            Từ tất cả đơn hàng đang còn nợ
          </p>
        </div>

        {/* Overdue Debt */}
        <div
          onClick={() => setActiveTab('overdue')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'overdue'
              ? 'bg-rose-50 border-rose-400 shadow-sm'
              : 'bg-white border-slate-200 shadow-xs hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center space-x-1">
              <span>Công nợ quá hạn</span>
              {stats.overdueCount > 0 && (
                <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                  {stats.overdueCount}
                </span>
              )}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-rose-600 mt-2">
            {formatVND(stats.overdueAmount)}
          </h3>
          <p className="mt-2 text-xs font-bold text-rose-600">
            {stats.overdueCount > 0 ? `${stats.overdueCount} đơn quá hạn cần thu hồi ngay` : 'Không có nợ quá hạn'}
          </p>
        </div>

        {/* Shipper Holding COD */}
        <div
          onClick={() => setActiveTab('shipper_pending')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'shipper_pending'
              ? 'bg-amber-50 border-amber-400 shadow-sm'
              : 'bg-white border-slate-200 shadow-xs hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center space-x-1">
              <span>COD Shipper giữ</span>
              {stats.shipperCodCount > 0 && (
                <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                  {stats.shipperCodCount}
                </span>
              )}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-amber-600 mt-2">
            {formatVND(stats.shipperCodAmount)}
          </h3>
          <p className="mt-2 text-xs text-amber-800 font-bold">
            {stats.shipperCodCount} đơn giao xong chưa nộp quỹ
          </p>
        </div>

        {/* Collected Total */}
        <div
          onClick={() => setActiveTab('fully_paid')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'fully_paid'
              ? 'bg-emerald-50 border-emerald-400 shadow-sm'
              : 'bg-white border-slate-200 shadow-xs hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Đã thu & Tất toán
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-emerald-600 mt-2">
            {formatVND(stats.totalCollected)}
          </h3>
          <p className="mt-2 text-xs text-slate-500">
            {stats.fullyPaidCount} đơn đã thanh toán đủ 100%
          </p>
        </div>
      </div>

      {/* Tabs and Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 no-print">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all_debt', label: 'Tất cả công nợ', count: null },
              { id: 'overdue', label: 'Nợ quá hạn', count: stats.overdueCount, isAlert: true },
              { id: 'shipper_pending', label: 'Shipper giữ COD', count: stats.shipperCodCount, isWarn: true },
              { id: 'fully_paid', label: 'Đã tất toán đủ (100%)', count: stats.fullyPaidCount },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as DebtTabType)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === t.id
                    ? t.isAlert
                      ? 'bg-rose-600 text-white shadow-xs shadow-rose-500/20'
                      : t.isWarn
                      ? 'bg-amber-600 text-white shadow-xs shadow-amber-500/20'
                      : 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{t.label}</span>
                {t.count !== null && t.count > 0 && (
                  <span
                    className={`ml-1 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                      activeTab === t.id
                        ? 'bg-white/20 text-white'
                        : t.isAlert
                        ? 'bg-rose-200 text-rose-800'
                        : t.isWarn
                        ? 'bg-amber-200 text-amber-800'
                        : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Batch Shipper COD Action */}
          {activeTab === 'shipper_pending' && selectedCodIds.length > 0 && (
            <button
              onClick={handleBatchSettleCod}
              disabled={batchSettling}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Quyết toán {selectedCodIds.length} đơn đã chọn</span>
            </button>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Tìm khách hàng / Mã đơn / SĐT
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Nhập tên, số điện thoại, mã đơn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Shipper Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Shipper phụ trách
            </label>
            <select
              value={selectedShipperFilter}
              onChange={(e) => setSelectedShipperFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả nhân viên giao hàng</option>
              {staffList
                .filter((s) => s.role === 'Delivery')
                .map((s) => (
                  <option key={s.id} value={s.employeeId}>
                    {s.employeeId} - {s.employeeName}
                  </option>
                ))}
            </select>
          </div>

          {/* Staff Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Nhân viên bán hàng
            </label>
            <select
              value={selectedStaffFilter}
              onChange={(e) => setSelectedStaffFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả nhân viên kinh doanh</option>
              {staffList
                .filter((s) => s.role === 'Sales' || s.role === 'Admin')
                .map((s) => (
                  <option key={s.id} value={s.employeeId}>
                    {s.employeeId} - {s.employeeName}
                  </option>
                ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Sắp xếp theo
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="debt_desc">Số tiền nợ nhiều nhất</option>
              <option value="due_date_asc">Hạn thanh toán gần nhất</option>
              <option value="date_desc">Ngày lên đơn mới nhất</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Debt Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
              <Receipt className="w-5 h-5 text-blue-600" />
              <span>Danh Sách Đối Soát & Theo Dõi Công Nợ ({filteredOrders.length} đơn)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Ghi nhận các khoản thanh toán một phần, tất toán công nợ và quyết toán tiền mặt từ shipper
            </p>
          </div>

          {/* Quick select all for batch COD settlement */}
          {activeTab === 'shipper_pending' && filteredOrders.length > 0 && (
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-600 no-print">
              <button
                onClick={() => {
                  if (selectedCodIds.length === filteredOrders.length) {
                    setSelectedCodIds([]);
                  } else {
                    setSelectedCodIds(filteredOrders.map((o) => o.id));
                  }
                }}
                className="hover:text-blue-600 underline"
              >
                {selectedCodIds.length === filteredOrders.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả đơn'}
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-[11px]">
                {activeTab === 'shipper_pending' && (
                  <th className="py-3 px-3 text-center no-print w-10">
                    <input
                      type="checkbox"
                      checked={filteredOrders.length > 0 && selectedCodIds.length === filteredOrders.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedCodIds(filteredOrders.map((o) => o.id));
                        else setSelectedCodIds([]);
                      }}
                      className="rounded text-blue-600"
                    />
                  </th>
                )}
                <th className="py-3 px-4">Mã đơn & Ngày</th>
                <th className="py-3 px-4">Khách hàng & SĐT</th>
                <th className="py-3 px-3">Shipper / NV Bán</th>
                <th className="py-3 px-3 text-right">Tổng giá trị</th>
                <th className="py-3 px-3 text-right">Đã thanh toán</th>
                <th className="py-3 px-4 text-right">Còn nợ (Phải thu)</th>
                <th className="py-3 px-3 text-center">Hạn trả nợ</th>
                <th className="py-3 px-3 text-center">Trạng thái COD</th>
                <th className="py-3 px-4 text-center no-print">Thao tác nghiệp vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const remaining = order.remainingAmount || 0;
                  const isDelivered = order.status === 'delivered' || order.status === 'completed';
                  const isOverdue = remaining > 0 && !!order.debtDueDate && order.debtDueDate < todayStr;
                  const isChecked = selectedCodIds.includes(order.id);

                  // Calculate days overdue or remaining
                  let dueDateBadge = null;
                  if (remaining > 0 && order.debtDueDate) {
                    const dueTime = new Date(order.debtDueDate).getTime();
                    const nowTime = new Date(todayStr).getTime();
                    const diffDays = Math.round((dueTime - nowTime) / (1000 * 3600 * 24));

                    if (diffDays < 0) {
                      dueDateBadge = (
                        <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-200 block mt-1">
                          Quá hạn {Math.abs(diffDays)} ngày!
                        </span>
                      );
                    } else if (diffDays === 0) {
                      dueDateBadge = (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200 block mt-1">
                          Hôm nay đến hạn
                        </span>
                      );
                    } else {
                      dueDateBadge = (
                        <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded block mt-1">
                          Còn {diffDays} ngày
                        </span>
                      );
                    }
                  }

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isOverdue ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {activeTab === 'shipper_pending' && (
                        <td className="py-3 px-3 text-center no-print">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedCodIds([...selectedCodIds, order.id]);
                              else setSelectedCodIds(selectedCodIds.filter((id) => id !== order.id));
                            }}
                            className="rounded text-blue-600"
                          />
                        </td>
                      )}

                      <td className="py-3 px-4">
                        <div className="font-extrabold text-blue-600 font-mono">
                          {order.orderCode}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatDateVI(order.createdAt)}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{order.customerName}</p>
                        <p className="text-[11px] text-slate-600 font-mono">{order.customerPhone}</p>
                        <p className="text-[10px] text-slate-400 truncate max-w-xs">{order.deliveryAddress}</p>
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-800">
                          {order.deliveryStaffName ? (
                            <span className="flex items-center space-x-1">
                              <Truck className="w-3 h-3 text-blue-600 inline" />
                              <span>{order.deliveryStaffName}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Chưa giao</span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          NV bán: <span className="font-mono font-bold text-slate-700">{order.employeeId}</span>
                        </p>
                      </td>

                      <td className="py-3 px-3 text-right font-medium text-slate-800">
                        {formatVND(order.totalAmount)}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span className="font-bold text-emerald-600">
                          {formatVND(order.prepaidAmount || 0)}
                        </span>
                        {order.paymentLogs && order.paymentLogs.length > 0 && (
                          <button
                            onClick={() => setHistoryOrder(order)}
                            className="block text-[10px] text-blue-600 underline text-right ml-auto"
                            title="Xem phiếu thu"
                          >
                            {order.paymentLogs.length} phiếu thu
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {remaining > 0 ? (
                          <div className="inline-block bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                            <span className="text-sm font-black text-amber-700 block">
                              {formatVND(remaining)}
                            </span>
                            <span className="text-[10px] font-bold text-amber-600">
                              (Chưa thanh toán)
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center text-emerald-600 font-extrabold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Đã tất toán
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {remaining > 0 ? (
                          <div>
                            <span className="font-bold text-slate-700">
                              {order.debtDueDate ? formatDateVI(order.debtDueDate) : 'Chưa đặt hẹn'}
                            </span>
                            {dueDateBadge}
                            <button
                              onClick={() => handleOpenDueDateModal(order)}
                              className="text-[10px] text-blue-600 hover:text-blue-800 underline block mt-0.5 no-print"
                            >
                              Đổi hạn
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {isDelivered ? (
                          order.codSettledToShop ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 inline-block">
                              Đã nộp quỹ
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 inline-block">
                              Shipper đang giữ
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 text-[10px]">Chưa giao</span>
                        )}
                      </td>

                      {/* Operations / Actions */}
                      <td className="py-3 px-4 text-center no-print whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Record Payment Button */}
                          {remaining > 0 && (
                            <button
                              onClick={() => handleOpenPayment(order)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded-lg text-[11px] shadow-xs flex items-center space-x-1 transition-colors"
                              title="Ghi nhận thanh toán / thu nợ"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Thu nợ</span>
                            </button>
                          )}

                          {/* Shipper Settle COD Button */}
                          {isDelivered && !order.codSettledToShop && remaining > 0 && (
                            <button
                              onClick={() => handleSettleCod(order)}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5 py-1.5 rounded-lg text-[11px] shadow-xs flex items-center space-x-1 transition-colors"
                              title="Quyết toán tiền Shipper nộp"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Nộp COD</span>
                            </button>
                          )}

                          {/* Reminder button */}
                          {remaining > 0 && (
                            <button
                              onClick={() => setReminderOrder(order)}
                              className="bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 font-bold px-2 py-1.5 rounded-lg text-[11px] transition-colors"
                              title="Soạn tin nhắc nợ"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Order Detail Button */}
                          {onViewOrderDetail && (
                            <button
                              onClick={() => onViewOrderDetail(order)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                              title="Xem chi tiết đơn"
                            >
                              Chi tiết
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Không có đơn hàng công nợ nào phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL 1: GHI NHẬN THU NỢ (RECORD PAYMENT MODAL) --- */}
      {paymentModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded tracking-wider uppercase">
                  Phiếu Thu Tiền / Thu Nợ
                </span>
                <h3 className="font-extrabold text-base mt-1">
                  Ghi Nhận Thanh Toán - Đơn: {paymentModalOrder.orderCode}
                </h3>
              </div>
              <button
                onClick={() => setPaymentModalOrder(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmPayment} className="p-6 space-y-4">
              {/* Order Info Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Khách hàng:</span>
                  <span className="font-bold text-slate-900">
                    {paymentModalOrder.customerName} ({paymentModalOrder.customerPhone})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tổng giá trị đơn:</span>
                  <span className="font-bold text-slate-900">
                    {formatVND(paymentModalOrder.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Đã thanh toán trước đó:</span>
                  <span className="font-bold text-emerald-600">
                    {formatVND(paymentModalOrder.prepaidAmount || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                  <span className="text-amber-700">Số tiền còn nợ hiện tại:</span>
                  <span className="text-amber-700 text-sm font-extrabold">
                    {formatVND(paymentModalOrder.remainingAmount || 0)}
                  </span>
                </div>
              </div>

              {/* Amount Input with Quick Suggestion */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số tiền thực thu đợt này (VNĐ) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1000"
                  max={paymentModalOrder.remainingAmount || paymentModalOrder.totalAmount}
                  step="1000"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-base font-black text-emerald-700 focus:ring-2 focus:ring-emerald-500"
                  required
                />

                {/* Quick button to pay full remaining */}
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(paymentModalOrder.remainingAmount || 0)}
                    className="text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg"
                  >
                    Thu hết toàn bộ ({formatVND(paymentModalOrder.remainingAmount || 0)})
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPaymentAmount(Math.round((paymentModalOrder.remainingAmount || 0) / 2))
                    }
                    className="text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 px-2.5 py-1 rounded-lg"
                  >
                    Thu 50%
                  </button>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hình thức thanh toán
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Tiền mặt tại quầy / Shipper nộp tiền mặt</option>
                  <option value="bank_transfer">Chuyển khoản ngân hàng</option>
                  <option value="card">Quẹt thẻ POS</option>
                  <option value="momo_vnpay">Ví điện tử Momo / VNPay</option>
                </select>
              </div>

              {/* Receipt Code & Receiver */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mã phiếu thu</label>
                  <input
                    type="text"
                    value={paymentReceiptCode}
                    onChange={(e) => setPaymentReceiptCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Người thu tiền</label>
                  <input
                    type="text"
                    value={paymentReceivedBy}
                    onChange={(e) => setPaymentReceivedBy(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú thu tiền</label>
                <textarea
                  rows={2}
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Ghi chú thêm về lần thu nợ này..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:bg-white"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalOrder(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-600/30 flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác nhận thu {formatVND(paymentAmount)}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: SOẠN TIN NHẮN NHẮC NỢ (DEBT REMINDER MODAL) --- */}
      {reminderOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded tracking-wider uppercase">
                  Nhắc Nợ Khách Hàng
                </span>
                <h3 className="font-extrabold text-base mt-1">
                  Mẫu Tin Nhắn Nhắc Lịch Thanh Toán
                </h3>
              </div>
              <button
                onClick={() => setReminderOrder(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-blue-900 font-medium">
                Mẫu tin nhắn nhắc nợ lịch sự, chuyên nghiệp kèm số tài khoản cửa hàng và thông tin đơn hàng đã được tạo sẵn bên dưới.
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nội dung tin nhắn:</label>
                <textarea
                  readOnly
                  rows={10}
                  value={getReminderMessage(reminderOrder)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-slate-800 text-xs leading-relaxed focus:bg-white"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center space-x-2">
                  <a
                    href={`tel:${reminderOrder.customerPhone}`}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl flex items-center space-x-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Gọi {reminderOrder.customerPhone}</span>
                  </a>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleCopyReminder(getReminderMessage(reminderOrder))}
                    className={`font-bold px-4 py-2 rounded-xl flex items-center space-x-1.5 transition-all ${
                      copiedReminder
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20'
                    }`}
                  >
                    {copiedReminder ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Đã sao chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Sao chép tin nhắn</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: ĐỔI HẠN NỢ (DUE DATE MODAL) --- */}
      {dueDateOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">Gia Hạn / Đổi Ngày Hẹn Trả Nợ</h3>
              <button onClick={() => setDueDateOrder(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveDueDate} className="p-5 space-y-4 text-xs">
              <p className="text-slate-600">
                Đơn hàng: <span className="font-bold text-slate-900">{dueDateOrder.orderCode}</span> ({dueDateOrder.customerName})
              </p>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ngày hẹn thanh toán mới:</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 3);
                    setNewDueDate(d.toISOString().slice(0, 10));
                  }}
                  className="bg-slate-100 text-slate-700 px-2 py-1 rounded-lg font-bold"
                >
                  +3 ngày
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 7);
                    setNewDueDate(d.toISOString().slice(0, 10));
                  }}
                  className="bg-slate-100 text-slate-700 px-2 py-1 rounded-lg font-bold"
                >
                  +7 ngày
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 15);
                    setNewDueDate(d.toISOString().slice(0, 10));
                  }}
                  className="bg-slate-100 text-slate-700 px-2 py-1 rounded-lg font-bold"
                >
                  +15 ngày
                </button>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDueDateOrder(null)}
                  className="px-3 py-1.5 font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-xs"
                >
                  Lưu hạn nợ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: LỊCH SỬ PHIẾU THU TIỀN (PAYMENT LOGS MODAL) --- */}
      {historyOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded tracking-wider uppercase">
                  Lịch Sử Phiếu Thu
                </span>
                <h3 className="font-extrabold text-base mt-1">
                  Đơn Hàng: {historyOrder.orderCode}
                </h3>
              </div>
              <button onClick={() => setHistoryOrder(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Khách hàng:</span>
                  <span className="font-extrabold text-slate-900">{historyOrder.customerName}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Tổng đã thu:</span>
                  <span className="font-extrabold text-emerald-600 text-sm">
                    {formatVND(historyOrder.prepaidAmount || 0)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-800">Danh sách các phiếu thu tiền:</h4>
                {historyOrder.paymentLogs && historyOrder.paymentLogs.length > 0 ? (
                  historyOrder.paymentLogs.map((log, idx) => (
                    <div
                      key={log.id || idx}
                      className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-blue-700 font-mono">
                          {log.receiptCode || `PT-00${idx + 1}`}
                        </span>
                        <span className="font-black text-emerald-700 text-xs">
                          +{formatVND(log.amount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500 text-[10px]">
                        <span>Hình thức: {log.method}</span>
                        <span>{formatDateTimeVI(log.date)}</span>
                      </div>
                      {log.note && <p className="text-slate-700 italic text-[11px] pt-1">"{log.note}"</p>}
                      <p className="text-[10px] text-slate-400">
                        Người lập phiếu: <span className="font-bold text-slate-600">{log.receivedBy}</span>
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic">Chưa có phiếu thu chi tiết.</p>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setHistoryOrder(null)}
                  className="px-4 py-2 font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

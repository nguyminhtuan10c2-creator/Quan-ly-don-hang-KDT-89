import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Filter,
  Download,
  Printer,
  ShoppingBag,
  CreditCard,
  Clock,
  CheckCircle2,
  Users,
  Award,
  ArrowUpRight,
  ChevronDown,
  Layers,
  Search,
  RefreshCw,
  Wallet,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
} from 'lucide-react';
import { Order, Product, Staff, OrderStatus } from '../types';
import {
  formatVND,
  formatDateVI,
  formatDateTimeVI,
  getOrderStatusLabel,
  exportRevenueReportAsCsv,
} from '../services/storageService';

interface RevenueReportProps {
  orders: Order[];
  products: Product[];
  staffList?: Staff[];
  onNavigateToDebt?: () => void;
  onViewOrderDetail?: (order: Order) => void;
}

type PeriodPreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'all'
  | 'custom';

export const RevenueReport: React.FC<RevenueReportProps> = ({
  orders,
  products,
  staffList = [],
  onNavigateToDebt,
  onViewOrderDetail,
}) => {
  // Filter States
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // 1st of current month
    return d.toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders'>('revenue');

  // Compute active date range based on preset
  const { dateRangeStart, dateRangeEnd, periodLabel } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    let start = '';
    let end = todayStr;
    let label = '';

    switch (periodPreset) {
      case 'today': {
        start = todayStr;
        end = todayStr;
        label = `Hôm nay (${formatDateVI(todayStr)})`;
        break;
      }
      case 'yesterday': {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        const yStr = y.toISOString().slice(0, 10);
        start = yStr;
        end = yStr;
        label = `Hôm qua (${formatDateVI(yStr)})`;
        break;
      }
      case 'this_week': {
        const firstDayOfWeek = new Date(now);
        const day = now.getDay() || 7; // get current day of week (1=Mon, ..., 7=Sun)
        firstDayOfWeek.setDate(now.getDate() - (day - 1));
        start = firstDayOfWeek.toISOString().slice(0, 10);
        end = todayStr;
        label = `Tuần này (${formatDateVI(start)} - ${formatDateVI(end)})`;
        break;
      }
      case 'this_month': {
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        start = firstDayOfMonth.toISOString().slice(0, 10);
        end = todayStr;
        label = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
        break;
      }
      case 'last_month': {
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        start = firstDayLastMonth.toISOString().slice(0, 10);
        end = lastDayLastMonth.toISOString().slice(0, 10);
        label = `Tháng trước (${firstDayLastMonth.getMonth() + 1}/${firstDayLastMonth.getFullYear()})`;
        break;
      }
      case 'this_quarter': {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const startQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
        start = startQuarter.toISOString().slice(0, 10);
        end = todayStr;
        label = `Quý ${currentQuarter + 1}/${now.getFullYear()}`;
        break;
      }
      case 'this_year': {
        start = `${now.getFullYear()}-01-01`;
        end = todayStr;
        label = `Năm ${now.getFullYear()}`;
        break;
      }
      case 'all': {
        start = '2020-01-01';
        end = '2030-12-31';
        label = 'Tất cả thời gian';
        break;
      }
      case 'custom': {
        start = customStartDate;
        end = customEndDate;
        label = `${formatDateVI(customStartDate)} - ${formatDateVI(customEndDate)}`;
        break;
      }
    }

    return { dateRangeStart: start, dateRangeEnd: end, periodLabel: label };
  }, [periodPreset, customStartDate, customEndDate]);

  // Filter orders according to date range and dropdowns
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = (order.deliveryDate || order.createdAt || '').slice(0, 10);

      // Date Range Filter
      if (dateRangeStart && orderDate < dateRangeStart) return false;
      if (dateRangeEnd && orderDate > dateRangeEnd) return false;

      // Staff filter
      if (selectedStaffFilter !== 'all' && (order.employeeId || '').toUpperCase() !== selectedStaffFilter.toUpperCase()) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter !== 'all') {
        if (selectedStatusFilter === 'completed_delivered') {
          if (order.status !== 'completed' && order.status !== 'delivered') return false;
        } else if (selectedStatusFilter === 'in_progress') {
          if (order.status !== 'delivering' && order.status !== 'in_transit' && order.status !== 'pending' && order.status !== 'pending_pickup') {
            return false;
          }
        } else if (order.status !== selectedStatusFilter) {
          return false;
        }
      }

      // Payment method filter
      if (selectedPaymentMethod !== 'all' && (order.paymentMethod || 'cod') !== selectedPaymentMethod) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = (order.orderCode || '').toLowerCase().includes(q);
        const matchCust = (order.customerName || '').toLowerCase().includes(q);
        const matchPhone = (order.customerPhone || '').includes(q);
        const matchItem = (order.items || []).some((it) => it.productName.toLowerCase().includes(q));
        if (!matchCode && !matchCust && !matchPhone && !matchItem) return false;
      }

      return true;
    });
  }, [
    orders,
    dateRangeStart,
    dateRangeEnd,
    selectedStaffFilter,
    selectedStatusFilter,
    selectedPaymentMethod,
    searchQuery,
  ]);

  // Calculations for KPIs
  const {
    totalRevenueRealized,
    totalRevenueExpected,
    totalPrepaidCollected,
    totalRemainingDebt,
    completedOrdersCount,
    deliveringOrdersCount,
    cancelledOrdersCount,
    averageOrderValue,
    totalBonusPayout,
    shippingFeeTotal,
  } = useMemo(() => {
    let realized = 0; // Completed & delivered orders
    let expected = 0; // In transit & pending orders
    let prepaid = 0;
    let debt = 0;
    let completedCount = 0;
    let deliveringCount = 0;
    let cancelledCount = 0;
    let bonus = 0;
    let shipping = 0;

    filteredOrders.forEach((o) => {
      const isCompleted = o.status === 'completed' || o.status === 'delivered';
      const isDelivering = o.status === 'delivering' || o.status === 'in_transit' || o.status === 'pending' || o.status === 'pending_pickup';
      const isCancelled = o.status === 'cancelled' || o.status === 'failed';

      if (isCompleted) {
        realized += o.totalAmount || 0;
        completedCount++;
      } else if (isDelivering) {
        expected += o.totalAmount || 0;
        deliveringCount++;
      } else if (isCancelled) {
        cancelledCount++;
      }

      prepaid += o.prepaidAmount || 0;
      debt += o.remainingAmount || 0;
      bonus += o.totalBonusEarned || 0;
      shipping += o.shippingFee || 0;
    });

    const validOrderCount = completedCount + deliveringCount;
    const aov = validOrderCount > 0 ? (realized + expected) / validOrderCount : 0;

    return {
      totalRevenueRealized: realized,
      totalRevenueExpected: expected,
      totalPrepaidCollected: prepaid,
      totalRemainingDebt: debt,
      completedOrdersCount: completedCount,
      deliveringOrdersCount: deliveringCount,
      cancelledOrdersCount: cancelledCount,
      averageOrderValue: aov,
      totalBonusPayout: bonus,
      shippingFeeTotal: shipping,
    };
  }, [filteredOrders]);

  // Chart aggregation: group by day/period
  const timelineData = useMemo(() => {
    const map = new Map<string, { date: string; revenue: number; orderCount: number; label: string }>();

    filteredOrders.forEach((o) => {
      const d = (o.deliveryDate || o.createdAt || '').slice(0, 10);
      if (!d) return;

      const isCompleted = o.status === 'completed' || o.status === 'delivered';
      const amount = isCompleted ? o.totalAmount || 0 : 0;

      if (!map.has(d)) {
        const parts = d.split('-');
        const shortLabel = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
        map.set(d, { date: d, revenue: 0, orderCount: 0, label: shortLabel });
      }

      const item = map.get(d)!;
      item.revenue += amount;
      item.orderCount += 1;
    });

    const sorted = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    return sorted.slice(-14); // Keep last 14 distinct dates for clean visual layout
  }, [filteredOrders]);

  const maxTimelineRevenue = useMemo(() => {
    return Math.max(...timelineData.map((d) => d.revenue), 1000000);
  }, [timelineData]);

  const maxTimelineOrders = useMemo(() => {
    return Math.max(...timelineData.map((d) => d.orderCount), 5);
  }, [timelineData]);

  // Payment Method Breakdown
  const paymentMethodStats = useMemo(() => {
    let codAmount = 0;
    let bankAmount = 0;
    let otherAmount = 0;

    filteredOrders.forEach((o) => {
      const amount = o.totalAmount || 0;
      const method = o.paymentMethod || 'cod';
      if (method === 'bank_transfer') bankAmount += amount;
      else if (method === 'cod') codAmount += amount;
      else otherAmount += amount;
    });

    const total = codAmount + bankAmount + otherAmount || 1;
    return {
      codAmount,
      bankAmount,
      otherAmount,
      codPct: Math.round((codAmount / total) * 100),
      bankPct: Math.round((bankAmount / total) * 100),
      otherPct: Math.round((otherAmount / total) * 100),
    };
  }, [filteredOrders]);

  // Top Sales Staff Ranking
  const staffLeaderboard = useMemo(() => {
    const map = new Map<
      string,
      { employeeId: string; employeeName: string; totalRevenue: number; orderCount: number; bonus: number }
    >();

    filteredOrders.forEach((o) => {
      const empId = o.employeeId || 'NV001';
      if (!map.has(empId)) {
        map.set(empId, {
          employeeId: empId,
          employeeName: o.employeeName || empId,
          totalRevenue: 0,
          orderCount: 0,
          bonus: 0,
        });
      }
      const st = map.get(empId)!;
      const isCompleted = o.status === 'completed' || o.status === 'delivered';
      if (isCompleted) {
        st.totalRevenue += o.totalAmount || 0;
      }
      st.orderCount += 1;
      st.bonus += o.totalBonusEarned || 0;
    });

    return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredOrders]);

  // Top Selling Products in Period
  const topProducts = useMemo(() => {
    const map = new Map<string, { productName: string; sku: string; quantity: number; revenue: number }>();

    filteredOrders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const key = item.productId || item.productName;
        if (!map.has(key)) {
          map.set(key, {
            productName: item.productName,
            sku: item.sku,
            quantity: 0,
            revenue: 0,
          });
        }
        const p = map.get(key)!;
        p.quantity += item.quantity || 1;
        p.revenue += (item.price || 0) * (item.quantity || 1);
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredOrders]);

  const handleExportCsv = () => {
    exportRevenueReportAsCsv(periodPreset, filteredOrders);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Title */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs tracking-wider uppercase mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Tài Chính & Kế Toán Doanh Nghiệp</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center space-x-3">
            <span>Báo Cáo Doanh Thu Bán Hàng</span>
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">
              {periodLabel}
            </span>
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Theo dõi tổng doanh thu thực tế, doanh thu dự kiến trong lộ trình giao, tỷ lệ phương thức thanh toán, đối soát hoa hồng và hiệu suất kinh doanh của từng nhân sự.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 no-print">
          {onNavigateToDebt && (
            <button
              onClick={onNavigateToDebt}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center space-x-2 shadow-lg shadow-amber-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <CreditCard className="w-4 h-4" />
              <span>Quản lý Công nợ ({formatVND(totalRemainingDebt)})</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          )}

          <button
            onClick={handleExportCsv}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center space-x-2 shadow-md shadow-emerald-600/20 transition-all"
            title="Xuất file Excel CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel / CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5 transition-all"
            title="In báo cáo doanh thu"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">In báo cáo</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 no-print">
        {/* Preset Period Buttons */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-slate-500 flex items-center space-x-1 mr-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Kỳ báo cáo:</span>
          </span>

          {[
            { id: 'today', label: 'Hôm nay' },
            { id: 'yesterday', label: 'Hôm qua' },
            { id: 'this_week', label: 'Tuần này' },
            { id: 'this_month', label: 'Tháng này' },
            { id: 'last_month', label: 'Tháng trước' },
            { id: 'this_quarter', label: 'Quý này' },
            { id: 'this_year', label: 'Năm nay' },
            { id: 'all', label: 'Tất cả' },
            { id: 'custom', label: 'Tùy chọn ngày' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriodPreset(item.id as PeriodPreset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                periodPreset === item.id
                  ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/30'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range Pickers (shown when custom is selected) */}
        {periodPreset === 'custom' && (
          <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200/60 flex flex-wrap items-center gap-4 text-xs animate-in fade-in duration-150">
            <span className="font-bold text-blue-900">Khoảng thời gian:</span>
            <div className="flex items-center space-x-2">
              <label className="text-slate-600 font-medium">Từ ngày:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-slate-600 font-medium">Đến ngày:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Secondary Filters: Employee, Status, Payment Method, Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Employee Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Nhân viên kinh doanh
            </label>
            <select
              value={selectedStaffFilter}
              onChange={(e) => setSelectedStaffFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả nhân viên</option>
              {staffList
                .filter((s) => s.role === 'Sales' || s.role === 'Admin')
                .map((s) => (
                  <option key={s.id} value={s.employeeId}>
                    {s.employeeId} - {s.employeeName}
                  </option>
                ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Trạng thái đơn hàng
            </label>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="completed_delivered">Đã giao & Hoàn thành (Ghi nhận DT)</option>
              <option value="in_progress">Đang giao & Chờ xuất kho (DT dự kiến)</option>
              <option value="cancelled">Đã hủy / Thất bại</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Phương thức thanh toán
            </label>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả phương thức</option>
              <option value="cod">Tiền mặt / Thu hộ COD</option>
              <option value="bank_transfer">Chuyển khoản ngân hàng</option>
              <option value="card">Thẻ / Ví điện tử</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Tìm kiếm đơn hàng
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Mã đơn, tên khách, SĐT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Financial Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Realized Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Doanh thu thực tế (Đã giao)
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mt-2">
              {formatVND(totalRevenueRealized)}
            </h3>
            <div className="mt-2 flex items-center text-xs text-emerald-700 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              <span>{completedOrdersCount} đơn giao thành công</span>
            </div>
          </div>
        </div>

        {/* Expected Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Doanh thu dự kiến (Đang giao)
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-blue-600 mt-2">
              {formatVND(totalRevenueExpected)}
            </h3>
            <div className="mt-2 flex items-center text-xs text-slate-500">
              <span>{deliveringOrdersCount} đơn hàng đang xử lý</span>
            </div>
          </div>
        </div>

        {/* Receivables / Outstanding Debt */}
        <div
          onClick={onNavigateToDebt}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-all cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                Công nợ còn phải thu
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-amber-600 mt-2">
              {formatVND(totalRemainingDebt)}
            </h3>
            <div className="mt-2 flex items-center text-xs text-amber-700 font-bold group-hover:translate-x-1 transition-transform">
              <span>Xem sổ theo dõi công nợ →</span>
            </div>
          </div>
        </div>

        {/* AOV & Bonus Payout */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-purple-300 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Giá trị đơn TB (AOV)
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-purple-700 mt-2">
              {formatVND(averageOrderValue)}
            </h3>
            <div className="mt-2 flex items-center text-xs text-slate-500">
              <Award className="w-3.5 h-3.5 text-emerald-600 mr-1" />
              <span>Thưởng bảo hành chi trả: {formatVND(totalBonusPayout)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid: Revenue Timeline Chart & Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Revenue Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span>Biểu Đồ Xu Hướng Doanh Thu Theo Dòng Thời Gian</span>
              </h3>
              <p className="text-xs text-slate-500">
                Thống kê các mốc phát sinh giao dịch trong kỳ ({timelineData.length} điểm dữ liệu)
              </p>
            </div>

            {/* Metric Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setChartMetric('revenue')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  chartMetric === 'revenue'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Doanh thu (VNĐ)
              </button>
              <button
                onClick={() => setChartMetric('orders')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  chartMetric === 'orders'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Số lượng đơn
              </button>
            </div>
          </div>

          {/* Interactive CSS Bar Chart */}
          {timelineData.length > 0 ? (
            <div className="pt-4">
              <div className="h-56 flex items-end justify-between gap-2 sm:gap-3 px-2 border-b border-slate-200 pb-2">
                {timelineData.map((d, idx) => {
                  const barValue = chartMetric === 'revenue' ? d.revenue : d.orderCount;
                  const maxValue = chartMetric === 'revenue' ? maxTimelineRevenue : maxTimelineOrders;
                  const heightPct = Math.max(8, Math.min(100, Math.round((barValue / maxValue) * 100)));

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-14 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bg-slate-900 text-white text-[11px] p-2 rounded-xl shadow-xl z-30 whitespace-nowrap text-center">
                        <div className="font-bold text-slate-300">{d.date}</div>
                        <div className="text-emerald-400 font-extrabold">{formatVND(d.revenue)}</div>
                        <div className="text-slate-400 text-[10px]">{d.orderCount} đơn hàng</div>
                      </div>

                      {/* Bar Pillar */}
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full max-w-[36px] rounded-t-lg transition-all duration-300 ${
                          chartMetric === 'revenue'
                            ? d.revenue > 0
                              ? 'bg-gradient-to-t from-blue-600 to-indigo-500 group-hover:from-blue-500 group-hover:to-indigo-400 shadow-xs'
                              : 'bg-slate-200'
                            : 'bg-gradient-to-t from-emerald-600 to-teal-500 group-hover:from-emerald-500 group-hover:to-teal-400 shadow-xs'
                        }`}
                      />

                      {/* X-axis Label */}
                      <span className="text-[10px] font-bold text-slate-500 mt-2 truncate w-full text-center">
                        {d.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-2">
                <span>Trục hoành: Ngày phát sinh</span>
                <span className="font-bold text-slate-600">
                  Cao nhất trong kỳ: {chartMetric === 'revenue' ? formatVND(maxTimelineRevenue) : `${maxTimelineOrders} đơn`}
                </span>
              </div>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-slate-400">
              <Calendar className="w-8 h-8 mb-2 stroke-1" />
              <p className="text-xs">Không có dữ liệu giao dịch trong khoảng thời gian đã chọn</p>
            </div>
          )}
        </div>

        {/* Payment Methods Structure & Receivables (1 col) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Wallet className="w-5 h-5 text-emerald-600" />
              <span>Cơ Cấu Phương Thức Thanh Toán</span>
            </h3>

            <div className="space-y-4 pt-4">
              {/* COD Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700 flex items-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-2" />
                    Tiền mặt / Thu hộ COD
                  </span>
                  <span className="font-black text-slate-900">
                    {formatVND(paymentMethodStats.codAmount)} ({paymentMethodStats.codPct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${paymentMethodStats.codPct}%` }}
                  />
                </div>
              </div>

              {/* Bank Transfer Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700 flex items-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2" />
                    Chuyển khoản ngân hàng
                  </span>
                  <span className="font-black text-slate-900">
                    {formatVND(paymentMethodStats.bankAmount)} ({paymentMethodStats.bankPct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${paymentMethodStats.bankPct}%` }}
                  />
                </div>
              </div>

              {/* Other Bar */}
              {paymentMethodStats.otherAmount > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-slate-700 flex items-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 mr-2" />
                      Thẻ / Ví điện tử / Trả góp
                    </span>
                    <span className="font-black text-slate-900">
                      {formatVND(paymentMethodStats.otherAmount)} ({paymentMethodStats.otherPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-purple-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${paymentMethodStats.otherPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Cashflow Summary Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Đã cọc & thu trước:</span>
              <span className="font-bold text-emerald-700">{formatVND(totalPrepaidCollected)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tổng phí ship đã thu:</span>
              <span className="font-bold text-blue-700">{formatVND(shippingFeeTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-2 font-bold">
              <span>Còn nợ chưa quyết toán:</span>
              <span className="text-amber-700 font-extrabold">{formatVND(totalRemainingDebt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Top Sales Staff & Best Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Sales Leaderboard */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Xếp Hạng Doanh Số Nhân Viên (Sales Leaderboard)</span>
            </h3>
            <span className="text-xs font-bold text-slate-400">{staffLeaderboard.length} nhân sự</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-[11px]">
                  <th className="py-2.5 px-3">Hạng</th>
                  <th className="py-2.5 px-3">Nhân viên</th>
                  <th className="py-2.5 px-2 text-center">Số đơn</th>
                  <th className="py-2.5 px-3 text-right">Doanh thu đạt</th>
                  <th className="py-2.5 px-3 text-right">Thưởng BH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffLeaderboard.map((s, idx) => (
                  <tr key={s.employeeId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3">
                      {idx === 0 ? (
                        <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-900 font-black inline-flex items-center justify-center text-[10px]">
                          1
                        </span>
                      ) : idx === 1 ? (
                        <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-900 font-black inline-flex items-center justify-center text-[10px]">
                          2
                        </span>
                      ) : idx === 2 ? (
                        <span className="w-5 h-5 rounded-full bg-amber-700 text-white font-black inline-flex items-center justify-center text-[10px]">
                          3
                        </span>
                      ) : (
                        <span className="text-slate-500 font-bold pl-1.5">{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-extrabold text-slate-900">{s.employeeName}</p>
                      <p className="text-[10px] text-blue-600 font-mono font-bold">{s.employeeId}</p>
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-slate-700">{s.orderCount}</td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900">
                      {formatVND(s.totalRevenue)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                      +{formatVND(s.bonus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 5 Best Selling Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              <span>Top Sản Phẩm Đem Lại Doanh Thu Cao Nhất</span>
            </h3>
            <span className="text-xs font-bold text-slate-400">Top 5</span>
          </div>

          {topProducts.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {topProducts.map((p, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-extrabold flex items-center justify-center text-xs shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-900 truncate">{p.productName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        SKU: {p.sku} • Đã bán: <span className="font-bold text-slate-700">{p.quantity} chiếc</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-slate-900 block">{formatVND(p.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              Chưa có dữ liệu bán hàng trong kỳ này.
            </div>
          )}
        </div>
      </div>

      {/* Detailed Orders Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <span>Bảng Kê Chi Tiết Đơn Hàng Trong Kỳ ({filteredOrders.length} đơn)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Danh sách chi tiết phục vụ đối soát kế toán và tổng kết doanh số
            </p>
          </div>

          <div className="flex items-center space-x-2 no-print">
            <button
              onClick={handleExportCsv}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải file Excel CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-[11px]">
                <th className="py-3 px-4">Mã đơn</th>
                <th className="py-3 px-3">Ngày</th>
                <th className="py-3 px-4">Khách hàng</th>
                <th className="py-3 px-3">NV Bán</th>
                <th className="py-3 px-3 text-right">Tiền hàng</th>
                <th className="py-3 px-3 text-right">Tổng đơn</th>
                <th className="py-3 px-3 text-right">Đã thu</th>
                <th className="py-3 px-3 text-right">Còn nợ</th>
                <th className="py-3 px-3 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-center no-print">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const isDelivered = order.status === 'delivered' || order.status === 'completed';
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-blue-600 font-mono">
                          {order.orderCode}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {formatDateVI(order.deliveryDate || order.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{order.customerName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{order.customerPhone}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                          {order.employeeId}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-700">
                        {formatVND(order.subtotal || order.totalAmount)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">
                        {formatVND(order.totalAmount)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-600">
                        {formatVND(order.prepaidAmount || 0)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold">
                        {(order.remainingAmount || 0) > 0 ? (
                          <span className="text-amber-600 font-extrabold">
                            {formatVND(order.remainingAmount)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">0 đ</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                            isDelivered
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : order.status === 'cancelled' || order.status === 'failed'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {getOrderStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center no-print">
                        {onViewOrderDetail && (
                          <button
                            onClick={() => onViewOrderDetail(order)}
                            className="bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors"
                          >
                            Xem đơn
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Không tìm thấy đơn hàng nào phù hợp với bộ lọc đã chọn.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

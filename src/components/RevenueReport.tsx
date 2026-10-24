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
  Target,
  Trophy,
  Percent,
  BarChart3,
  PieChart,
  UserCheck,
  Sparkles,
  ChevronRight,
  X,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { Order, Product, Staff, OrderStatus } from '../types';
import {
  formatVND,
  formatDateVI,
  formatDateTimeVI,
  getOrderStatusLabel,
  exportRevenueReportAsCsv,
  exportSalesTeamReportAsCsv,
  getStaff,
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

type ViewMode = 'team_sale' | 'overview' | 'orders_detail';

interface EmployeePerformanceStat {
  employeeId: string;
  employeeName: string;
  role: string;
  email?: string;
  phone?: string;
  avatar?: string;
  totalOrders: number;
  completedOrders: number;
  deliveringOrders: number;
  cancelledOrders: number;
  realizedRevenue: number;
  inFlightRevenue: number;
  totalRevenue: number;
  totalBonusEarned: number;
  averageOrderValue: number;
  successRate: number;
  contributionShare: number;
  categorySales: Record<string, { quantity: number; revenue: number }>;
  topProducts: Array<{ productName: string; sku: string; quantity: number; revenue: number }>;
  recentOrders: Order[];
}

export const RevenueReport: React.FC<RevenueReportProps> = ({
  orders,
  products,
  staffList = [],
  onNavigateToDebt,
  onViewOrderDetail,
}) => {
  // View mode switcher: Team Sale (default), Overview, Orders Detail
  const [activeViewMode, setActiveViewMode] = useState<ViewMode>('team_sale');

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

  // Drilldown modal for single employee
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState<EmployeePerformanceStat | null>(null);

  // Sales target quota state (default 200,000,000 VND)
  const [salesTeamTargetQuota, setSalesTeamTargetQuota] = useState<number>(200000000);
  const [isEditingTarget, setIsEditingTarget] = useState<boolean>(false);
  const [targetInput, setTargetInput] = useState<string>('200000000');

  // Resolve staff list with fallback
  const allStaff = useMemo(() => {
    return staffList && staffList.length > 0 ? staffList : getStaff();
  }, [staffList]);

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
        const d = new Date(now);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
        d.setDate(diff);
        start = d.toISOString().slice(0, 10);
        end = todayStr;
        label = `Tuần này (${formatDateVI(start)} - ${formatDateVI(end)})`;
        break;
      }
      case 'this_month': {
        const d = new Date(now.getFullYear(), now.getMonth(), 1);
        start = d.toISOString().slice(0, 10);
        end = todayStr;
        label = `Tháng này (${now.getMonth() + 1}/${now.getFullYear()})`;
        break;
      }
      case 'last_month': {
        const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
        start = firstDay.toISOString().slice(0, 10);
        end = lastDay.toISOString().slice(0, 10);
        label = `Tháng trước (${firstDay.getMonth() + 1}/${firstDay.getFullYear()})`;
        break;
      }
      case 'this_quarter': {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const firstDay = new Date(now.getFullYear(), currentQuarter * 3, 1);
        start = firstDay.toISOString().slice(0, 10);
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
        label = 'Toàn bộ thời gian';
        break;
      }
      case 'custom': {
        start = customStartDate || '2020-01-01';
        end = customEndDate || todayStr;
        label = `Từ ${formatDateVI(start)} đến ${formatDateVI(end)}`;
        break;
      }
      default: {
        start = '2020-01-01';
        end = todayStr;
        label = 'Tất cả';
      }
    }

    return { dateRangeStart: start, dateRangeEnd: end, periodLabel: label };
  }, [periodPreset, customStartDate, customEndDate]);

  // Filter Orders by Date Range & Search Criteria
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = (order.deliveryDate || order.createdAt || '').slice(0, 10);

      // Date Range Filter
      if (dateRangeStart && orderDate < dateRangeStart) return false;
      if (dateRangeEnd && orderDate > dateRangeEnd) return false;

      // Staff Filter
      if (selectedStaffFilter !== 'all' && order.employeeId !== selectedStaffFilter) return false;

      // Status Filter
      if (selectedStatusFilter !== 'all') {
        if (selectedStatusFilter === 'completed' && order.status !== 'completed' && order.status !== 'delivered') return false;
        if (selectedStatusFilter === 'delivering' && order.status !== 'delivering' && order.status !== 'in_transit') return false;
        if (selectedStatusFilter === 'pending' && order.status !== 'pending' && order.status !== 'pending_pickup') return false;
        if (selectedStatusFilter === 'cancelled' && order.status !== 'cancelled' && order.status !== 'failed') return false;
      }

      // Payment Method Filter
      if (selectedPaymentMethod !== 'all') {
        const method = order.paymentMethod || 'cod';
        if (method !== selectedPaymentMethod) return false;
      }

      // Keyword Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = (order.orderCode || '').toLowerCase().includes(q);
        const matchCustomer = (order.customerName || '').toLowerCase().includes(q);
        const matchPhone = (order.customerPhone || '').includes(q);
        const matchStaff = (order.employeeName || '').toLowerCase().includes(q) || (order.employeeId || '').toLowerCase().includes(q);
        const matchItem = (order.items || []).some(
          (i) => (i.productName || '').toLowerCase().includes(q) || (i.sku || '').toLowerCase().includes(q)
        );
        if (!matchCode && !matchCustomer && !matchPhone && !matchStaff && !matchItem) return false;
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

  // Store-wide Calculations for Overview KPIs
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
    let realized = 0;
    let expected = 0;
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

  // EMPLOYEE REVENUE & PERFORMANCE BREAKDOWN (BÁO CÁO THEO NHÂN VIÊN)
  const employeePerformanceList = useMemo(() => {
    const map = new Map<string, EmployeePerformanceStat>();

    // Seed all staff
    allStaff.forEach((s) => {
      map.set(s.employeeId, {
        employeeId: s.employeeId,
        employeeName: s.employeeName,
        role: s.role,
        email: s.email,
        phone: s.phone,
        avatar: s.avatar,
        totalOrders: 0,
        completedOrders: 0,
        deliveringOrders: 0,
        cancelledOrders: 0,
        realizedRevenue: 0,
        inFlightRevenue: 0,
        totalRevenue: 0,
        totalBonusEarned: 0,
        averageOrderValue: 0,
        successRate: 0,
        contributionShare: 0,
        categorySales: {},
        topProducts: [],
        recentOrders: [],
      });
    });

    // Aggregate filtered orders
    const itemMapByEmp = new Map<string, Map<string, { productName: string; sku: string; quantity: number; revenue: number }>>();

    filteredOrders.forEach((o) => {
      const empId = o.employeeId || 'NV001';
      if (!map.has(empId)) {
        map.set(empId, {
          employeeId: empId,
          employeeName: o.employeeName || empId,
          role: 'Sales',
          totalOrders: 0,
          completedOrders: 0,
          deliveringOrders: 0,
          cancelledOrders: 0,
          realizedRevenue: 0,
          inFlightRevenue: 0,
          totalRevenue: 0,
          totalBonusEarned: 0,
          averageOrderValue: 0,
          successRate: 0,
          contributionShare: 0,
          categorySales: {},
          topProducts: [],
          recentOrders: [],
        });
      }

      const st = map.get(empId)!;
      st.totalOrders += 1;
      st.recentOrders.push(o);

      const isCompleted = o.status === 'completed' || o.status === 'delivered';
      const isDelivering = o.status === 'delivering' || o.status === 'in_transit' || o.status === 'pending' || o.status === 'pending_pickup';
      const isCancelled = o.status === 'cancelled' || o.status === 'failed';

      const amount = o.totalAmount || 0;
      if (isCompleted) {
        st.completedOrders += 1;
        st.realizedRevenue += amount;
      } else if (isDelivering) {
        st.deliveringOrders += 1;
        st.inFlightRevenue += amount;
      } else if (isCancelled) {
        st.cancelledOrders += 1;
      }

      st.totalBonusEarned += o.totalBonusEarned || 0;

      // Group products
      if (!itemMapByEmp.has(empId)) {
        itemMapByEmp.set(empId, new Map());
      }
      const empItems = itemMapByEmp.get(empId)!;

      (o.items || []).forEach((it) => {
        const prod = products.find((p) => p.id === it.productId);
        const cat = prod?.category || 'Gia dụng';
        if (!st.categorySales[cat]) {
          st.categorySales[cat] = { quantity: 0, revenue: 0 };
        }
        st.categorySales[cat].quantity += it.quantity || 1;
        st.categorySales[cat].revenue += (it.price || 0) * (it.quantity || 1);

        const pKey = it.productId || it.productName;
        if (!empItems.has(pKey)) {
          empItems.set(pKey, {
            productName: it.productName,
            sku: it.sku,
            quantity: 0,
            revenue: 0,
          });
        }
        const pStat = empItems.get(pKey)!;
        pStat.quantity += it.quantity || 1;
        pStat.revenue += (it.price || 0) * (it.quantity || 1);
      });
    });

    // Compute derived metrics & attach top products
    const list = Array.from(map.values()).map((st) => {
      st.totalRevenue = st.realizedRevenue + st.inFlightRevenue;
      const validOrders = st.completedOrders + st.deliveringOrders;
      st.averageOrderValue = validOrders > 0 ? st.totalRevenue / validOrders : 0;
      st.successRate = st.totalOrders > 0 ? Math.round((st.completedOrders / st.totalOrders) * 100) : 0;

      const empItems = itemMapByEmp.get(st.employeeId);
      if (empItems) {
        st.topProducts = Array.from(empItems.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);
      }
      return st;
    });

    // Total sales revenue across all Sales reps for share calculation
    const salesTeamTotalRevenue = list
      .filter((s) => s.role === 'Sales')
      .reduce((sum, s) => sum + s.totalRevenue, 0) || 1;

    list.forEach((st) => {
      st.contributionShare = Math.round((st.totalRevenue / salesTeamTotalRevenue) * 100);
    });

    // Sort: Sales reps first, ordered by totalRevenue desc
    return list.sort((a, b) => {
      if (a.role === 'Sales' && b.role !== 'Sales') return -1;
      if (a.role !== 'Sales' && b.role === 'Sales') return 1;
      return b.totalRevenue - a.totalRevenue;
    });
  }, [allStaff, filteredOrders, products]);

  // TOTAL SALES TEAM SUMMARY (BÁO CÁO THEO TỔNG TEAM SALE)
  const salesTeamSummary = useMemo(() => {
    const salesMembers = employeePerformanceList.filter((s) => s.role === 'Sales');

    let totalRealized = 0;
    let totalInFlight = 0;
    let totalOrders = 0;
    let completedOrders = 0;
    let deliveringOrders = 0;
    let cancelledOrders = 0;
    let totalBonus = 0;

    salesMembers.forEach((m) => {
      totalRealized += m.realizedRevenue;
      totalInFlight += m.inFlightRevenue;
      totalOrders += m.totalOrders;
      completedOrders += m.completedOrders;
      deliveringOrders += m.deliveringOrders;
      cancelledOrders += m.cancelledOrders;
      totalBonus += m.totalBonusEarned;
    });

    const totalRevenue = totalRealized + totalInFlight;
    const validOrders = completedOrders + deliveringOrders;
    const aov = validOrders > 0 ? totalRevenue / validOrders : 0;
    const successRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

    const storeOverallTotal = (totalRevenueRealized + totalRevenueExpected) || 1;
    const teamShareOverall = Math.min(100, Math.round((totalRevenue / storeOverallTotal) * 100));

    const target = salesTeamTargetQuota || 200000000;
    const targetProgress = Math.min(100, Math.round((totalRevenue / target) * 100));

    return {
      membersCount: salesMembers.length,
      totalRealized,
      totalInFlight,
      totalRevenue,
      totalOrders,
      completedOrders,
      deliveringOrders,
      cancelledOrders,
      totalBonus,
      aov,
      successRate,
      teamShareOverall,
      target,
      targetProgress,
      members: salesMembers,
    };
  }, [employeePerformanceList, totalRevenueRealized, totalRevenueExpected, salesTeamTargetQuota]);

  // Top Sales Leaderboard for Overview
  const topSalesEmployee = salesTeamSummary.members[0] || null;

  // Chart timeline aggregation
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
    return sorted.slice(-14);
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

  // Export handlers
  const handleExportCsv = () => {
    exportRevenueReportAsCsv(periodPreset, filteredOrders);
  };

  const handleExportSalesTeamCsv = () => {
    exportSalesTeamReportAsCsv(periodLabel, employeePerformanceList);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveTarget = () => {
    const val = Number(targetInput) || 200000000;
    setSalesTeamTargetQuota(val);
    setIsEditingTarget(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Title */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs tracking-wider uppercase mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Tài Chính & Quản Trị Kinh Doanh</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex flex-wrap items-center gap-3">
            <span>Báo Cáo Doanh Thu Bán Hàng</span>
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">
              {periodLabel}
            </span>
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Phân tích chuyên sâu <strong>doanh thu theo từng nhân viên</strong> và <strong>tổng team sale</strong>, theo dõi tiến độ chỉ tiêu, tỷ lệ chốt đơn và hoa hồng bảo hành.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 no-print">
          {onNavigateToDebt && (
            <button
              onClick={onNavigateToDebt}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5 shadow-lg shadow-amber-600/20 transition-all hover:scale-[1.02]"
            >
              <CreditCard className="w-4 h-4" />
              <span>Sổ Công nợ ({formatVND(totalRemainingDebt)})</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          )}

          <button
            onClick={handleExportSalesTeamCsv}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5 shadow-md shadow-blue-600/20 transition-all"
            title="Xuất bảng xếp hạng doanh thu team sale & từng nhân viên ra file Excel CSV"
          >
            <Users className="w-4 h-4" />
            <span>Xuất Doanh Thu Team Sale (CSV)</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 transition-all"
            title="Xuất danh sách đơn hàng ra file Excel CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Bảng Kê Đơn (CSV)</span>
          </button>

          <button
            onClick={handlePrint}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-3 py-2.5 rounded-xl flex items-center space-x-1.5 transition-all"
            title="In báo cáo doanh thu"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">In báo cáo</span>
          </button>
        </div>
      </div>

      {/* Main View Mode Selector Tabs */}
      <div className="flex items-center space-x-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs no-print overflow-x-auto">
        <button
          onClick={() => setActiveViewMode('team_sale')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all shrink-0 ${
            activeViewMode === 'team_sale'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 scale-[1.01]'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Báo Cáo Doanh Thu Team Sale & Theo Nhân Viên</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeViewMode === 'team_sale' ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {salesTeamSummary.membersCount} Sales
          </span>
        </button>

        <button
          onClick={() => setActiveViewMode('overview')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all shrink-0 ${
            activeViewMode === 'overview'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 scale-[1.01]'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Toàn Cảnh Doanh Thu & Dòng Tiền</span>
        </button>

        <button
          onClick={() => setActiveViewMode('orders_detail')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all shrink-0 ${
            activeViewMode === 'orders_detail'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 scale-[1.01]'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Bảng Kê Chi Tiết Đơn Hàng</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeViewMode === 'orders_detail' ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {filteredOrders.length} đơn
          </span>
        </button>
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
            { id: 'custom', label: 'Tuỳ chọn ngày' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => setPeriodPreset(preset.id as PeriodPreset)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                periodPreset === preset.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom Date Inputs if selected */}
        {periodPreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 bg-blue-50/60 p-3 rounded-xl border border-blue-200 text-xs">
            <span className="font-bold text-blue-900">Chọn khoảng ngày tuỳ chỉnh:</span>
            <div className="flex items-center space-x-2">
              <label className="text-slate-600 font-medium">Từ:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-slate-600 font-medium">Đến:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Dropdown Filters & Search */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Staff Filter Dropdown */}
          <div className="flex items-center space-x-1.5 text-xs">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedStaffFilter}
              onChange={(e) => setSelectedStaffFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 font-semibold text-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            >
              <option value="all">Tất cả nhân sự ({allStaff.length})</option>
              {allStaff.map((s) => (
                <option key={s.id} value={s.employeeId}>
                  {s.employeeName} ({s.employeeId} - {s.role})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 font-semibold text-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            >
              <option value="all">Tất cả trạng thái đơn</option>
              <option value="completed">Đã giao thành công</option>
              <option value="delivering">Đang giao hàng</option>
              <option value="pending">Chờ lấy hàng</option>
              <option value="cancelled">Đã hủy / Thất bại</option>
            </select>
          </div>

          {/* Payment Method */}
          <div className="flex items-center space-x-1.5 text-xs">
            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="bg-slate-50 border border-slate-200 font-semibold text-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            >
              <option value="all">Tất cả hình thức thanh toán</option>
              <option value="cod">Tiền mặt khi nhận (COD)</option>
              <option value="bank_transfer">Chuyển khoản ngân hàng</option>
              <option value="card">Thẻ tín dụng / Ghi nợ</option>
              <option value="installment">Trả góp</option>
            </select>
          </div>

          {/* Search box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn, khách hàng, nhân viên, sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Reset filter button */}
          {(selectedStaffFilter !== 'all' ||
            selectedStatusFilter !== 'all' ||
            selectedPaymentMethod !== 'all' ||
            searchQuery.trim()) && (
            <button
              onClick={() => {
                setSelectedStaffFilter('all');
                setSelectedStatusFilter('all');
                setSelectedPaymentMethod('all');
                setSearchQuery('');
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Xoá lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW MODE 1: BÁO CÁO DOANH THU TEAM SALE & THEO TỪNG NHÂN VIÊN */}
      {/* ========================================================================= */}
      {activeViewMode === 'team_sale' && (
        <div className="space-y-6">
          {/* SECTION 1: TỔNG QUAN DOANH THU TOÀN BỘ TEAM SALE */}
          <div className="bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-blue-800 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-800/60 pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-blue-300 font-bold text-xs uppercase tracking-wider">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Báo Cáo Tổng Hợp Toàn Bộ Team Sale</span>
                </div>
                <h2 className="text-2xl font-black text-white">Hiệu Suất Doanh Thu Bộ Phận Bán Hàng</h2>
                <p className="text-xs text-blue-200">
                  Tổng hợp số liệu kinh doanh của toàn bộ <strong>{salesTeamSummary.membersCount} nhân viên Sales</strong> trong kỳ báo cáo {periodLabel}.
                </p>
              </div>

              {/* Target Quota Setting in Header */}
              <div className="bg-blue-950/80 border border-blue-700/60 p-3 rounded-xl flex items-center gap-3">
                <Target className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-blue-300 uppercase font-bold tracking-wider">Chỉ tiêu doanh số kỳ:</div>
                  {isEditingTarget ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="number"
                        value={targetInput}
                        onChange={(e) => setTargetInput(e.target.value)}
                        className="w-28 px-2 py-0.5 bg-slate-900 border border-blue-400 rounded text-xs text-white font-bold"
                      />
                      <button
                        onClick={handleSaveTarget}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-0.5 rounded text-[10px] font-bold"
                      >
                        Lưu
                      </button>
                      <button
                        onClick={() => setIsEditingTarget(false)}
                        className="text-slate-400 hover:text-white text-[10px]"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-black text-base text-amber-300">{formatVND(salesTeamSummary.target)}</span>
                      <button
                        onClick={() => {
                          setTargetInput(String(salesTeamSummary.target));
                          setIsEditingTarget(true);
                        }}
                        className="text-[10px] text-blue-400 hover:text-blue-200 underline"
                      >
                        Sửa
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 4 Major KPI Cards for Total Sales Team */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Tổng Doanh Thu Thực Tế Team Sale */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-2">
                <div className="flex items-center justify-between text-blue-200 text-xs font-bold">
                  <span>Tổng Doanh Thu Thực Tế</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400">
                  {formatVND(salesTeamSummary.totalRealized)}
                </div>
                <div className="text-[11px] text-blue-200 flex items-center justify-between pt-1 border-t border-white/10">
                  <span>Đang giao (chờ thu):</span>
                  <span className="font-bold text-amber-300">+{formatVND(salesTeamSummary.totalInFlight)}</span>
                </div>
              </div>

              {/* Card 2: Tổng Doanh Thu Tạo Ra & Tỷ trọng cửa hàng */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-2">
                <div className="flex items-center justify-between text-blue-200 text-xs font-bold">
                  <span>Tổng Doanh Số Tạo Ra</span>
                  <Percent className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  {formatVND(salesTeamSummary.totalRevenue)}
                </div>
                <div className="text-[11px] text-blue-200 flex items-center justify-between pt-1 border-t border-white/10">
                  <span>Đóng góp toàn cửa hàng:</span>
                  <span className="font-black text-blue-300">{salesTeamSummary.teamShareOverall}%</span>
                </div>
              </div>

              {/* Card 3: Khối lượng đơn & Tỷ lệ thành công */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-2">
                <div className="flex items-center justify-between text-blue-200 text-xs font-bold">
                  <span>Đơn Hàng Team Sale</span>
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  {salesTeamSummary.completedOrders} <span className="text-sm font-normal text-blue-200">/ {salesTeamSummary.totalOrders} đơn</span>
                </div>
                <div className="text-[11px] text-blue-200 flex items-center justify-between pt-1 border-t border-white/10">
                  <span>Tỷ lệ chốt thành công:</span>
                  <span className="font-bold text-emerald-300">{salesTeamSummary.successRate}%</span>
                </div>
              </div>

              {/* Card 4: Giá trị TB/đơn (AOV) & Thưởng BH */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-2">
                <div className="flex items-center justify-between text-blue-200 text-xs font-bold">
                  <span>Giá Trị TB / Đơn (AOV)</span>
                  <Award className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-black text-purple-300">
                  {formatVND(salesTeamSummary.aov)}
                </div>
                <div className="text-[11px] text-blue-200 flex items-center justify-between pt-1 border-t border-white/10">
                  <span>Thưởng kích hoạt BH Team:</span>
                  <span className="font-bold text-emerald-400">+{formatVND(salesTeamSummary.totalBonus)}</span>
                </div>
              </div>
            </div>

            {/* Target Progress Bar */}
            <div className="bg-blue-950/60 p-4 rounded-xl border border-blue-800/80 space-y-2">
              <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                <div className="flex items-center space-x-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-blue-100">
                    Tiến độ hoàn thành chỉ tiêu doanh thu Team Sale:
                  </span>
                  <span className="font-black text-amber-300 text-sm">{salesTeamSummary.targetProgress}%</span>
                </div>
                <div className="text-blue-300 text-[11px]">
                  Đã đạt <strong className="text-white">{formatVND(salesTeamSummary.totalRevenue)}</strong> / Chỉ tiêu{' '}
                  <strong className="text-amber-300">{formatVND(salesTeamSummary.target)}</strong>
                </div>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-blue-700/50">
                <div
                  className="bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400 h-2 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.max(5, salesTeamSummary.targetProgress))}%` }}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: BIỂU ĐỒ SO SÁNH TRỰC QUAN DOANH THU CÁC NHÂN VIÊN SALE */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  <span>So Sánh Tỷ Trọng & Doanh Thu Từng Nhân Viên Sale</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Biểu đồ so sánh phần trăm đóng góp và doanh số thực tế của từng nhân sự trong Team Sale
                </p>
              </div>
              {topSalesEmployee && (
                <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center space-x-2 text-xs font-bold text-amber-900">
                  <Trophy className="w-4 h-4 text-amber-600" />
                  <span>
                    Top 1 Doanh số: <strong>{topSalesEmployee.employeeName}</strong> ({formatVND(topSalesEmployee.totalRevenue)})
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {salesTeamSummary.members.map((member, idx) => {
                const maxRevenue = salesTeamSummary.members[0]?.totalRevenue || 1;
                const barWidth = Math.max(8, Math.round((member.totalRevenue / maxRevenue) * 100));

                return (
                  <div key={member.employeeId} className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-5 h-5 rounded-full font-black text-[10px] flex items-center justify-center shrink-0 ${
                            idx === 0
                              ? 'bg-amber-400 text-amber-950'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-900'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="font-extrabold text-slate-900">{member.employeeName}</span>
                        <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                          {member.employeeId}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          ({member.completedOrders} đơn xong / {member.totalOrders} đơn)
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 text-right">
                        <span className="text-xs font-black text-slate-900">{formatVND(member.totalRevenue)}</span>
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                          {member.contributionShare}% Team
                        </span>
                      </div>
                    </div>

                    {/* Comparative Visual Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          idx === 0
                            ? 'bg-gradient-to-r from-amber-400 to-indigo-600'
                            : idx === 1
                            ? 'bg-gradient-to-r from-blue-400 to-blue-600'
                            : 'bg-gradient-to-r from-slate-400 to-slate-600'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: BẢNG XẾP HẠNG & CHI TIẾT DOANH THU TỪNG NHÂN VIÊN */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <span>Bảng Phân Tích Doanh Thu Chi Tiết Từng Nhân Viên Sale</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Số liệu đối soát doanh thu thực tế, doanh thu đang giao, tỷ lệ chốt đơn và hoa hồng bảo hành của từng nhân sự
                </p>
              </div>

              <button
                onClick={handleExportSalesTeamCsv}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất file Excel CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3">Hạng</th>
                    <th className="py-3 px-4">Nhân viên</th>
                    <th className="py-3 px-3 text-right">Doanh thu thực tế</th>
                    <th className="py-3 px-3 text-right">Đang giao</th>
                    <th className="py-3 px-3 text-right">Tổng doanh số</th>
                    <th className="py-3 px-3 text-center">% Team Sale</th>
                    <th className="py-3 px-3 text-center">Đơn (Xong/Tổng)</th>
                    <th className="py-3 px-3 text-right">AOV / Đơn</th>
                    <th className="py-3 px-3 text-right">Thưởng BH</th>
                    <th className="py-3 px-4 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeePerformanceList.map((st, idx) => (
                    <tr
                      key={st.employeeId}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      {/* Rank */}
                      <td className="py-3 px-3">
                        {idx === 0 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black inline-flex items-center justify-center text-xs shadow-xs">
                            🏆 1
                          </span>
                        ) : idx === 1 ? (
                          <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-black inline-flex items-center justify-center text-xs">
                            🥈 2
                          </span>
                        ) : idx === 2 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-700 text-white font-black inline-flex items-center justify-center text-xs">
                            🥉 3
                          </span>
                        ) : (
                          <span className="text-slate-500 font-bold pl-2">{idx + 1}</span>
                        )}
                      </td>

                      {/* Staff Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          {st.avatar ? (
                            <img
                              src={st.avatar}
                              alt={st.employeeName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-xs">
                              {st.employeeName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                              <span>{st.employeeName}</span>
                              {st.role === 'Sales' && (
                                <span className="bg-blue-100 text-blue-800 text-[9px] font-black px-1.5 py-0.2 rounded">
                                  SALES
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              Mã: <strong className="text-slate-600">{st.employeeId}</strong>
                              {st.phone && ` • SĐT: ${st.phone}`}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Realized Revenue */}
                      <td className="py-3 px-3 text-right font-black text-emerald-700">
                        {formatVND(st.realizedRevenue)}
                      </td>

                      {/* In-Flight Revenue */}
                      <td className="py-3 px-3 text-right font-semibold text-amber-700">
                        {formatVND(st.inFlightRevenue)}
                      </td>

                      {/* Total Revenue */}
                      <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">
                        {formatVND(st.totalRevenue)}
                      </td>

                      {/* Contribution % */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block bg-indigo-50 border border-indigo-200 text-indigo-700 font-black px-2 py-0.5 rounded-lg text-xs">
                          {st.contributionShare}%
                        </span>
                      </td>

                      {/* Orders Count & Success Rate */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-slate-900">{st.completedOrders}</span>
                        <span className="text-slate-400"> / {st.totalOrders}</span>
                        <p className="text-[10px] font-bold text-emerald-600">{st.successRate}% chốt</p>
                      </td>

                      {/* AOV */}
                      <td className="py-3 px-3 text-right font-bold text-slate-700">
                        {formatVND(st.averageOrderValue)}
                      </td>

                      {/* Bonus */}
                      <td className="py-3 px-3 text-right font-bold text-emerald-600">
                        +{formatVND(st.totalBonusEarned)}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedEmployeeDetail(st)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl shadow-xs transition-colors inline-flex items-center space-x-1"
                        >
                          <span>Chi tiết</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 2: TOÀN CẢNH DOANH THU & DÒNG TIỀN */}
      {/* ========================================================================= */}
      {activeViewMode === 'overview' && (
        <div className="space-y-6">
          {/* 4 Financial Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Realized Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Doanh thu thực tế (Đã giao)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700">
                {formatVND(totalRevenueRealized)}
              </div>
              <p className="text-[11px] text-slate-500">
                Từ <strong>{completedOrdersCount}</strong> đơn giao thành công
              </p>
            </div>

            {/* In-Flight Expected Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Doanh thu đang giao (Dự kiến)</span>
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-blue-700">
                {formatVND(totalRevenueExpected)}
              </div>
              <p className="text-[11px] text-slate-500">
                Từ <strong>{deliveringOrdersCount}</strong> đơn đang trên đường giao
              </p>
            </div>

            {/* Prepaid Collected */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Tiền cọc & Thu trước</span>
                <Wallet className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-black text-purple-700">
                {formatVND(totalPrepaidCollected)}
              </div>
              <p className="text-[11px] text-slate-500">Đã trừ vào công nợ khi xuất kho</p>
            </div>

            {/* Remaining Debt */}
            <div
              onClick={onNavigateToDebt}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-amber-300 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-xs font-bold text-amber-700 uppercase tracking-wider">
                <span>Công nợ chưa quyết toán</span>
                <CreditCard className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-700">
                {formatVND(totalRemainingDebt)}
              </div>
              <p className="text-[11px] text-amber-800 font-semibold group-hover:underline flex items-center">
                <span>Mở sổ theo dõi công nợ →</span>
              </p>
            </div>
          </div>

          {/* Revenue Timeline Chart & Payment Methods */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timeline Bar Chart */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <span>Biến Động Doanh Thu Theo Từng Ngày</span>
                  </h3>
                  <p className="text-xs text-slate-500">Biểu đồ đối soát doanh thu thực tế phát sinh</p>
                </div>

                <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setChartMetric('revenue')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      chartMetric === 'revenue' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Doanh thu
                  </button>
                  <button
                    onClick={() => setChartMetric('orders')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      chartMetric === 'orders' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Số đơn
                  </button>
                </div>
              </div>

              {timelineData.length > 0 ? (
                <div className="pt-4">
                  <div className="flex items-end justify-between gap-2 h-52 px-2 border-b border-slate-200 pb-2">
                    {timelineData.map((d, idx) => {
                      const val = chartMetric === 'revenue' ? d.revenue : d.orderCount;
                      const maxVal = chartMetric === 'revenue' ? maxTimelineRevenue : maxTimelineOrders;
                      const heightPct = Math.max(8, Math.round((val / maxVal) * 100));

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                          {/* Tooltip on Hover */}
                          <div className="absolute -top-12 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-lg">
                            <p className="font-bold">{d.date}</p>
                            <p className="text-emerald-300 font-black">{formatVND(d.revenue)}</p>
                            <p className="text-slate-300">{d.orderCount} đơn hàng</p>
                          </div>

                          <div
                            className={`w-full max-w-[32px] rounded-t-lg transition-all duration-300 ${
                              chartMetric === 'revenue'
                                ? 'bg-blue-600 group-hover:bg-blue-500'
                                : 'bg-indigo-600 group-hover:bg-indigo-500'
                            }`}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* X Axis Labels */}
                  <div className="flex justify-between gap-2 pt-2 px-2 text-[10px] text-slate-400 font-mono">
                    {timelineData.map((d, idx) => (
                      <span key={idx} className="flex-1 text-center truncate">
                        {d.label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400 text-xs">
                  Chưa có dữ liệu đơn hàng trong khoảng thời gian đã chọn.
                </div>
              )}
            </div>

            {/* Payment Method Stats */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <span>Cơ Cấu Thanh Toán</span>
                </h3>
                <p className="text-xs text-slate-500">Tỷ lệ thanh toán tiền mặt vs chuyển khoản</p>
              </div>

              <div className="space-y-4 pt-2">
                {/* COD Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-slate-700 flex items-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-2" />
                      Tiền mặt khi giao (COD)
                    </span>
                    <span className="font-black text-slate-900">
                      {formatVND(paymentMethodStats.codAmount)} ({paymentMethodStats.codPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
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

          {/* Top 5 Best Selling Products in Period */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
                <span>Top Sản Phẩm Đem Lại Doanh Thu Cao Nhất Trong Kỳ</span>
              </h3>
              <span className="text-xs font-bold text-slate-400">Top 5 Mặt Hàng</span>
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
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 3: BẢNG KÊ CHI TIẾT ĐƠN HÀNG */}
      {/* ========================================================================= */}
      {activeViewMode === 'orders_detail' && (
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

            <button
              onClick={handleExportCsv}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải file Excel CSV</span>
            </button>
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
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-blue-700">
                        {onViewOrderDetail ? (
                          <button
                            onClick={() => onViewOrderDetail(order)}
                            className="hover:underline font-mono"
                          >
                            {order.orderCode}
                          </button>
                        ) : (
                          <span className="font-mono">{order.orderCode}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {formatDateVI(order.deliveryDate || order.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-extrabold text-slate-900">{order.customerName}</p>
                        <p className="text-[10px] text-slate-400">{order.customerPhone}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[11px] border border-slate-200">
                          {order.employeeName || order.employeeId}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-600">
                        {formatVND(order.subtotal || order.totalAmount)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">
                        {formatVND(order.totalAmount)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-700">
                        {formatVND(order.prepaidAmount || 0)}
                      </td>
                      <td className="py-3 px-3 text-right font-extrabold text-amber-700">
                        {formatVND(order.remainingAmount || 0)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-block border ${
                            order.status === 'completed' || order.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : order.status === 'delivering' || order.status === 'in_transit'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : order.status === 'cancelled' || order.status === 'failed'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          {getOrderStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center no-print">
                        {onViewOrderDetail && (
                          <button
                            onClick={() => onViewOrderDetail(order)}
                            className="text-blue-600 hover:text-blue-800 font-bold text-xs"
                          >
                            Xem →
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      Không tìm thấy đơn hàng nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRILLDOWN MODAL: HỒ SƠ CHI TIẾT DOANH SỐ CỦA TỪNG NHÂN VIÊN */}
      {/* ========================================================================= */}
      {selectedEmployeeDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-t-3xl flex items-start justify-between">
              <div className="flex items-center space-x-4">
                {selectedEmployeeDetail.avatar ? (
                  <img
                    src={selectedEmployeeDetail.avatar}
                    alt={selectedEmployeeDetail.employeeName}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-white/20 shadow-md"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center border-2 border-white/20">
                    {selectedEmployeeDetail.employeeName.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xl font-black">{selectedEmployeeDetail.employeeName}</h3>
                    <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {selectedEmployeeDetail.role}
                    </span>
                  </div>
                  <p className="text-xs text-blue-200 mt-0.5">
                    Mã nhân viên: <strong className="text-white font-mono">{selectedEmployeeDetail.employeeId}</strong> •{' '}
                    SĐT: {selectedEmployeeDetail.phone || 'Chưa cập nhật'}
                  </p>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Báo cáo kỳ: <span className="text-amber-300 font-bold">{periodLabel}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedEmployeeDetail(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* 4 Performance Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Doanh thu thực tế</p>
                  <p className="text-base font-black text-emerald-700 mt-1">
                    {formatVND(selectedEmployeeDetail.realizedRevenue)}
                  </p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Doanh thu đang giao</p>
                  <p className="text-base font-black text-blue-700 mt-1">
                    {formatVND(selectedEmployeeDetail.inFlightRevenue)}
                  </p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Đơn hoàn thành</p>
                  <p className="text-base font-black text-slate-900 mt-1">
                    {selectedEmployeeDetail.completedOrders} / {selectedEmployeeDetail.totalOrders}
                  </p>
                  <p className="text-[9px] font-bold text-emerald-600 mt-0.5">{selectedEmployeeDetail.successRate}% chốt</p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Thưởng kích hoạt BH</p>
                  <p className="text-base font-black text-purple-700 mt-1">
                    +{formatVND(selectedEmployeeDetail.totalBonusEarned)}
                  </p>
                </div>
              </div>

              {/* Contribution to Sales Team Bar */}
              <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-extrabold text-blue-900">
                    Đóng góp vào doanh số toàn bộ Team Sale:
                  </span>
                  <span className="font-black text-blue-800 text-sm">{selectedEmployeeDetail.contributionShare}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(5, selectedEmployeeDetail.contributionShare))}%` }}
                  />
                </div>
              </div>

              {/* Top 5 Best Selling Products by this Employee */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center space-x-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                  <span>Sản Phẩm Bán Chạy Nhất Của Nhân Viên Này</span>
                </h4>

                {selectedEmployeeDetail.topProducts.length > 0 ? (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/40">
                    {selectedEmployeeDetail.topProducts.map((p, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900 truncate">{p.productName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              SKU: {p.sku} • Đã bán: <strong>{p.quantity} cái</strong>
                            </p>
                          </div>
                        </div>
                        <span className="font-black text-slate-900 shrink-0">{formatVND(p.revenue)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Chưa có đơn hàng phát sinh trong kỳ.</p>
                )}
              </div>

              {/* Recent Orders of this employee */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Danh Sách Đơn Hàng Gần Nhất ({selectedEmployeeDetail.recentOrders.length} đơn)</span>
                </h4>

                <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-2xl p-2 bg-slate-50/30">
                  {selectedEmployeeDetail.recentOrders.slice(0, 8).map((ord) => (
                    <div
                      key={ord.id}
                      className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-blue-700 font-mono">{ord.orderCode}</span>
                          <span className="text-[10px] text-slate-400">{formatDateVI(ord.deliveryDate || ord.createdAt)}</span>
                        </div>
                        <p className="text-slate-700 font-medium">{ord.customerName} ({ord.customerPhone})</p>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-slate-900 block">{formatVND(ord.totalAmount)}</span>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                            ord.status === 'completed' || ord.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {getOrderStatusLabel(ord.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-3xl flex justify-end">
              <button
                onClick={() => setSelectedEmployeeDetail(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

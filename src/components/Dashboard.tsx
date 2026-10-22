import React from 'react';
import {
  ShoppingBag,
  Clock,
  AlertTriangle,
  Award,
  ArrowRight,
  Plus,
  Printer,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  PackageCheck,
  Truck,
  UserCheck,
  Warehouse,
  DollarSign,
  CreditCard,
  Receipt,
} from 'lucide-react';
import { Product, Order, EmployeeBonusSummary } from '../types';
import { formatVND, formatDateVI } from '../services/storageService';

interface DashboardProps {
  products: Product[];
  orders: Order[];
  bonusSummaries: EmployeeBonusSummary[];
  onNavigate: (tab: string) => void;
  onViewOrder: (order: Order) => void;
  onPrintSlip: (order: Order) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  products,
  orders,
  bonusSummaries,
  onNavigate,
  onViewOrder,
  onPrintSlip,
}) => {
  // Metrics calculation
  const totalOrders = orders.length;
  const pendingDeliveries = orders.filter((o) => o.status === 'pending' || o.status === 'delivering').length;
  const lowStockProducts = products.filter((p) => p.stock <= (p.minStockAlert || 5));
  const totalWarrantyBonus = bonusSummaries.reduce((acc, curr) => acc + curr.totalBonusEarned, 0);

  // Revenue & Debt calculations
  const totalRevenue = orders
    .filter((o) => o.status === 'completed' || o.status === 'delivered')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const totalDebt = orders.reduce((sum, o) => sum + (o.remainingAmount || 0), 0);
  const debtOrdersCount = orders.filter((o) => (o.remainingAmount || 0) > 0).length;

  // Recent 5 orders
  const recentOrders = [...orders].slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <PackageCheck className="w-4 h-4" />
            <span>Hệ thống Quản lý Đơn hàng & Kho hàng</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Tổng quan Hoạt động Kinh doanh</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Theo dõi danh sách đơn hàng, quản lý kho tự động trừ tồn kho, lên lịch giao hàng, báo cáo doanh thu & quản lý công nợ.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => onNavigate('create-order')}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Lên đơn mới</span>
          </button>
          <button
            onClick={() => onNavigate('revenue-report')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 transition-all"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Báo cáo doanh thu</span>
          </button>
          <button
            onClick={() => onNavigate('debt-management')}
            className="bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-amber-600/20 transition-all"
          >
            <CreditCard className="w-4 h-4" />
            <span>Quản lý công nợ</span>
          </button>
          <button
            onClick={() => onNavigate('inventory')}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all"
          >
            <Warehouse className="w-4 h-4" />
            <span>Kho hàng</span>
          </button>
        </div>
      </div>

      {/* Financial Highlight Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Realized Revenue Card */}
        <div
          onClick={() => onNavigate('revenue-report')}
          className="bg-gradient-to-br from-emerald-500/10 via-white to-white p-5 rounded-2xl border border-emerald-200 shadow-xs hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Tổng doanh thu thực tế</span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {formatVND(totalRevenue)}
            </h3>
            <p className="text-xs text-emerald-700 font-bold mt-1 flex items-center group-hover:translate-x-1 transition-transform">
              <span>Xem báo cáo chi tiết theo kỳ & phân tích →</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Debt Receivables Card */}
        <div
          onClick={() => onNavigate('debt-management')}
          className="bg-gradient-to-br from-amber-500/10 via-white to-white p-5 rounded-2xl border border-amber-200 shadow-xs hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-800 uppercase tracking-wider">
              <CreditCard className="w-4 h-4 text-amber-600" />
              <span>Tổng công nợ phải thu (COD & Khách nợ)</span>
            </div>
            <h3 className="text-2xl font-black text-amber-700 mt-1">
              {formatVND(totalDebt)}
            </h3>
            <p className="text-xs text-amber-800 font-bold mt-1 flex items-center group-hover:translate-x-1 transition-transform">
              <span>{debtOrdersCount} đơn hàng còn nợ • Mở sổ theo dõi công nợ →</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Receipt className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <div
          onClick={() => onNavigate('orders')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng đơn hàng</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{totalOrders}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
            <span>Tất cả đơn hàng hiện có</span>
            <span className="text-blue-600 font-bold flex items-center group-hover:translate-x-1 transition-transform">
              Xem danh sách <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>
        </div>

        {/* Pending Deliveries */}
        <div
          onClick={() => onNavigate('orders')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Chờ & Đang giao</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{pendingDeliveries}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Truck className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
            <span>Cần giao đúng thời gian</span>
            <span className="text-amber-600 font-bold flex items-center group-hover:translate-x-1 transition-transform">
              Lịch giao hàng <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div
          onClick={() => onNavigate('inventory')}
          className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer group ${
            lowStockProducts.length > 0
              ? 'border-rose-300 ring-2 ring-rose-100 bg-rose-50/30'
              : 'border-slate-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Cảnh báo sắp hết hàng</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{lowStockProducts.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
            <span>Sản phẩm Tồn kho ≤ 5</span>
            <span className="text-rose-600 font-bold flex items-center group-hover:translate-x-1 transition-transform">
              Nhập thêm kho <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>
        </div>

        {/* Total Warranty Activation Bonus */}
        <div
          onClick={() => onNavigate('bonus-report')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Tiền thưởng kích hoạt BH</p>
              <h3 className="text-xl font-black text-emerald-700 mt-1">{formatVND(totalWarrantyBonus)}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Award className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
            <span>Tổng thưởng nhân viên đạt</span>
            <span className="text-emerald-600 font-bold flex items-center group-hover:translate-x-1 transition-transform">
              Xem báo cáo NV <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Recent Orders & Low stock list */}
        <div className="lg:col-span-2 space-y-6">
          {/* Low Stock Warning Banner if any */}
          {lowStockProducts.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2 text-rose-800 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <span>Sản phẩm trong kho sắp hết hàng ({lowStockProducts.length})</span>
                </div>
                <button
                  onClick={() => onNavigate('inventory')}
                  className="text-xs font-bold text-rose-700 hover:text-rose-900 underline"
                >
                  Đến trang Kho hàng
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {lowStockProducts.map((p) => (
                  <div key={p.id} className="bg-white p-3 rounded-xl border border-rose-200 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900 truncate max-w-[180px]">{p.name}</p>
                      <p className="text-[11px] text-slate-500">
                        Mã SKU: <span className="font-mono">{p.sku}</span> • Giá: <strong className="text-slate-800">{formatVND(p.price)}</strong>
                      </p>
                      <p className="text-[10px] text-indigo-600 font-medium">
                        Cập nhật giá: {formatDateVI(p.priceUpdatedAt || p.createdAt)}
                      </p>
                    </div>
                    <span className="bg-rose-100 text-rose-800 font-black px-2.5 py-1 rounded-lg border border-rose-300">
                      Còn {p.stock} {p.stock === 0 ? 'HẾT' : 'cái'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Orders Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Đơn hàng mới tạo gần đây</h3>
                <p className="text-xs text-slate-500">Hiển thị 5 đơn hàng mới nhất cần quản lý</p>
              </div>
              <button
                onClick={() => onNavigate('orders')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <span>Xem tất cả</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Mã đơn</th>
                    <th className="py-3 px-4">Khách hàng</th>
                    <th className="py-3 px-4">Mã NV tạo</th>
                    <th className="py-3 px-4">Thời gian giao</th>
                    <th className="py-3 px-4 text-right">Tổng tiền</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-center">In phiếu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-blue-700">
                        <button onClick={() => onViewOrder(order)} className="hover:underline text-left">
                          {order.orderCode}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{order.customerName}</p>
                        <p className="text-[11px] text-slate-500">{order.customerPhone}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-100 text-slate-800 text-[11px] font-bold px-2 py-0.5 rounded border border-slate-200">
                          {order.employeeId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <p className="font-medium">{formatDateVI(order.deliveryDate)}</p>
                        <p className="text-[11px] text-slate-500">{order.deliveryTime}</p>
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        {formatVND(order.totalAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => onPrintSlip(order)}
                          title="In phiếu giao hàng"
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-1.5 rounded-lg border border-blue-200 transition-colors inline-flex items-center space-x-1 text-[11px] font-bold"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">In phiếu</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Employee Bonus Leaderboard */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Thưởng kích hoạt bảo hành</h3>
              </div>
              <button
                onClick={() => onNavigate('bonus-report')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800"
              >
                Chi tiết
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Bảng theo dõi số tiền thưởng kích hoạt bảo hành thực tế thu về của từng nhân viên bán hàng:
            </p>

            <div className="space-y-3">
              {bonusSummaries.map((emp, idx) => (
                <div
                  key={emp.employeeId}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center ${
                        idx === 0
                          ? 'bg-amber-400 text-amber-950'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-xs text-slate-900">{emp.employeeName}</span>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                          {emp.employeeId}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {emp.totalOrders} đơn hàng • {emp.totalWarrantyItemsActivated} SP đã kích hoạt BH
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-extrabold text-emerald-600">{formatVND(emp.totalBonusEarned)}</p>
                    <p className="text-[10px] text-slate-400">Tiền thưởng</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Tiền thưởng tự động cộng dồn khi tạo đơn hàng có tick chọn "Kích hoạt bảo hành".</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Internal Status Badge
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'pending':
    case 'pending_pickup':
      return (
        <span className="bg-amber-100 text-amber-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-300 inline-block">
          Chờ lấy hàng
        </span>
      );
    case 'delivering':
    case 'in_transit':
      return (
        <span className="bg-blue-100 text-blue-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-300 inline-block animate-pulse">
          Đang giao
        </span>
      );
    case 'completed':
    case 'delivered':
      return (
        <span className="bg-emerald-100 text-emerald-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-300 inline-block">
          Giao thành công
        </span>
      );
    case 'failed':
      return (
        <span className="bg-rose-100 text-rose-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-rose-300 inline-block">
          Giao thất bại
        </span>
      );
    case 'cancelled':
      return (
        <span className="bg-slate-100 text-slate-600 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-slate-300 inline-block">
          Đã hủy
        </span>
      );
    default:
      return null;
  }
};

function WarehouseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H21m-4.5 0H12m0 0V10.5M12 21H3m0 0v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H9m-6 0h18M12 3v7.5"
      />
    </svg>
  );
}

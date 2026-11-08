import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Package,
  Building2,
  Calendar,
  AlertTriangle,
  Clock,
  Sparkles,
  Award,
  ArrowRight,
  Filter,
  DollarSign,
  Search,
  CheckCircle2,
  XCircle,
  Percent,
} from 'lucide-react';
import {
  getPriceHubDashboardStats,
  getSuppliers,
  getPriceProducts,
  getQuotations,
} from '../../services/priceHubService';
import { formatVND, formatDateVI } from '../../services/storageService';

interface PriceHubDashboardProps {
  onNavigateTab: (tab: string, targetId?: string) => void;
  onSelectProductForCompare?: (productId: string) => void;
}

export const PriceHubDashboard: React.FC<PriceHubDashboardProps> = ({
  onNavigateTab,
  onSelectProductForCompare,
}) => {
  const suppliers = getSuppliers();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const stats = useMemo(() => {
    return getPriceHubDashboardStats({
      supplierId: selectedSupplierId !== 'all' ? selectedSupplierId : undefined,
      month: selectedMonth || undefined,
    });
  }, [selectedSupplierId, selectedMonth]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* KPI Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Price Products */}
        <div
          onClick={() => onNavigateTab('products')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Sản phẩm hỏi giá
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {stats.totalPriceProducts}
            </span>
            <span className="text-xs font-bold text-slate-500">model/sản phẩm</span>
          </div>
          <p className="text-[11px] text-blue-600 font-bold mt-1.5 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Xem danh mục riêng</span>
            <ArrowRight className="w-3 h-3" />
          </p>
        </div>

        {/* KPI 2: Total Suppliers */}
        <div
          onClick={() => onNavigateTab('suppliers')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-purple-400 hover:shadow-md cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Nhà cung cấp / NPP
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {stats.totalSuppliers}
            </span>
            <span className="text-xs font-bold text-slate-500">đối tác đang giao dịch</span>
          </div>
          <p className="text-[11px] text-purple-600 font-bold mt-1.5 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Quản lý nhà cung cấp</span>
            <ArrowRight className="w-3 h-3" />
          </p>
        </div>

        {/* KPI 3: New Quotes This Month */}
        <div
          onClick={() => onNavigateTab('history')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 hover:shadow-md cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Báo giá mới tháng này
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700">
              {stats.newQuotesThisMonth}
            </span>
            <span className="text-xs font-bold text-slate-500">đợt báo giá mới</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Xem lịch sử chi tiết</span>
            <ArrowRight className="w-3 h-3" />
          </p>
        </div>

        {/* KPI 4: Expiring & Stale Alerts */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Cảnh báo hiệu lực giá
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="bg-amber-100 text-amber-800 text-xs font-black px-2 py-0.5 rounded-lg border border-amber-300">
              {stats.expiringQuotesCount} sắp hết hạn
            </span>
            <span className="bg-rose-100 text-rose-800 text-xs font-black px-2 py-0.5 rounded-lg border border-rose-300">
              {stats.expiredQuotesCount} hết hạn
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1.5">
            {stats.staleProductsCount} SP chưa hỏi giá lại (&gt;30 ngày)
          </p>
        </div>
      </div>

      {/* Filter Toolbar for Dashboard */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-purple-600" />
          <span className="font-extrabold text-slate-800">Bộ lọc số liệu Dashboard:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 font-semibold px-3 py-1.5 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
          >
            <option value="all">Tất cả nhà cung cấp</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 font-semibold px-3 py-1.5 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />

          {(selectedSupplierId !== 'all' || selectedMonth) && (
            <button
              onClick={() => {
                setSelectedSupplierId('all');
                setSelectedMonth('');
              }}
              className="text-purple-600 hover:text-purple-800 font-bold px-2 py-1"
            >
              Đặt lại
            </button>
          )}
        </div>
      </div>

      {/* Grid: Notable Price Changes & Top Competitive Suppliers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: Notable Price Changes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="font-black text-sm text-slate-900">
                Biến động giá đáng chú ý gần đây
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-semibold">So với lần báo trước</span>
          </div>

          {stats.notablePriceChanges.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1.5" />
              <p>Chưa ghi nhận biến động giá lớn (&gt;2%) trong các lần báo gần nhất.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {stats.notablePriceChanges.map((change, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    if (onSelectProductForCompare) onSelectProductForCompare(change.productId);
                    onNavigateTab('comparison');
                  }}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <p className="font-extrabold text-slate-800 truncate">{change.productName}</p>
                    <p className="text-[11px] text-slate-400">
                      NPP: <strong className="text-slate-600">{change.supplierName}</strong> • {formatDateVI(change.quoteDate)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="font-black text-slate-900">{formatVND(change.newPrice)}</span>
                      <span
                        className={`font-black text-[10px] px-1.5 py-0.5 rounded ${
                          change.changeAmount > 0
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {change.changeAmount > 0 ? `+${change.changePercent}%` : `${change.changePercent}%`}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 line-through block">
                      Cũ: {formatVND(change.oldPrice)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 2: Top Competitive Suppliers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-purple-600" />
              <h3 className="font-black text-sm text-slate-900">
                Nhà cung cấp có giá cạnh tranh nhất
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-semibold">Tỷ lệ giá tốt nhất</span>
          </div>

          {stats.topCompetitiveSuppliers.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
              <p>Chưa đủ dữ liệu để xếp hạng tỷ lệ cạnh tranh của các nhà cung cấp.</p>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              {stats.topCompetitiveSuppliers.map((sup, idx) => (
                <div
                  key={sup.supplierId}
                  onClick={() => onNavigateTab('suppliers', sup.supplierId)}
                  className="p-3 bg-slate-50 hover:bg-purple-50/60 rounded-xl border border-slate-200/80 hover:border-purple-300 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-black text-slate-900 truncate">{sup.supplierName}</span>
                    </div>
                    <span className="font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md text-[11px]">
                      {sup.competitiveRate}% giá rẻ nhất
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Đã báo {sup.totalQuotes} sản phẩm</span>
                    <span>{sup.lowestPriceCount} lần đạt giá Net thấp nhất</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-extrabold text-base">Bạn vừa nhận được báo giá mới từ Nhà cung cấp?</h4>
          <p className="text-xs text-purple-200 mt-0.5">
            Lưu ngay vào KDT Price Hub để bảo toàn dữ liệu, tự động tính giá Net và so sánh tức thì với các bên khác.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigateTab('new-quote')}
            className="bg-white hover:bg-purple-50 text-purple-900 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xs active:scale-95 transition-all"
          >
            + Nhập báo giá thủ công
          </button>
          <button
            onClick={() => onNavigateTab('import')}
            className="bg-purple-600/80 hover:bg-purple-600 text-white border border-purple-400 font-bold text-xs px-3.5 py-2.5 rounded-xl active:scale-95 transition-all"
          >
            Import Excel / PDF
          </button>
        </div>
      </div>
    </div>
  );
};

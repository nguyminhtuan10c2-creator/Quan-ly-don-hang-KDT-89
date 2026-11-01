import React, { useState } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  Truck,
  Menu,
  X,
  Warehouse,
  TrendingUp,
  CreditCard,
  FolderTree,
  Award,
  Database,
  Cloud,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  pendingCount: number;
  lowStockCount: number;
  unpaidDebtCount: number;
  onOpenDataManagement?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  pendingCount,
  lowStockCount,
  unpaidDebtCount,
  onOpenDataManagement,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const handleTabClick = (tabId: string) => {
    setIsMoreMenuOpen(false);
    onSelectTab(tabId);
  };

  const moreMenuItems = [
    {
      id: 'inventory',
      label: 'Kho hàng & Tồn kho',
      desc: 'Quản lý 328 sản phẩm, tồn kho, giá bán & giá vốn',
      icon: Warehouse,
      badge: lowStockCount > 0 ? `${lowStockCount} sắp hết` : null,
      badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30',
    },
    {
      id: 'revenue-report',
      label: 'Báo cáo doanh thu',
      desc: 'Phân tích doanh số theo kỳ, kênh & nhân viên',
      icon: TrendingUp,
      badge: 'Doanh thu',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'debt-management',
      label: 'Quản lý công nợ',
      desc: 'Theo dõi COD shipper & công nợ khách hàng',
      icon: CreditCard,
      badge: unpaidDebtCount > 0 ? `${unpaidDebtCount} đơn nợ` : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'master-data',
      label: 'Danh mục & Hãng',
      desc: 'Quản lý danh mục ngành hàng & thương hiệu',
      icon: FolderTree,
    },
    {
      id: 'bonus-report',
      label: 'Thưởng kích hoạt BH',
      desc: 'Theo dõi tiền thưởng kích hoạt bảo hành điện máy',
      icon: Award,
      badge: 'Thưởng BH',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar (Visible only on mobile screens < 768px) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/98 backdrop-blur-lg border-t border-slate-800 text-slate-300 shadow-2xl safe-area-pb select-none no-print"
      >
        <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1 items-center">
          {/* 1. Tổng quan */}
          <button
            type="button"
            onClick={() => handleTabClick('dashboard')}
            className={`min-h-[48px] flex flex-col items-center justify-center transition-all ${
              activeTab === 'dashboard'
                ? 'text-blue-400 font-extrabold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Tổng quan</span>
          </button>

          {/* 2. Đơn hàng */}
          <button
            type="button"
            onClick={() => handleTabClick('orders')}
            className={`min-h-[48px] flex flex-col items-center justify-center relative transition-all ${
              activeTab === 'orders'
                ? 'text-blue-400 font-extrabold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardList className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Đơn hàng</span>
          </button>

          {/* 3. Lên đơn (Prominent Raised Center Button) */}
          <button
            type="button"
            onClick={() => handleTabClick('create-order')}
            className="min-h-[48px] flex flex-col items-center justify-center relative -top-3 group"
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-active:scale-90 ${
                activeTab === 'create-order'
                  ? 'bg-gradient-to-tr from-blue-700 to-indigo-500 text-white ring-4 ring-blue-500/30 shadow-blue-500/40'
                  : 'bg-gradient-to-tr from-blue-600 to-blue-500 text-white shadow-blue-600/30'
              }`}
            >
              <PlusCircle className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span
              className={`text-[10px] mt-0.5 font-bold tracking-tight ${
                activeTab === 'create-order' ? 'text-blue-400 font-black' : 'text-slate-300'
              }`}
            >
              Lên đơn
            </span>
          </button>

          {/* 4. Giao hàng / Shipper */}
          <button
            type="button"
            onClick={() => handleTabClick('delivery-schedule')}
            className={`min-h-[48px] flex flex-col items-center justify-center relative transition-all ${
              activeTab === 'delivery-schedule'
                ? 'text-blue-400 font-extrabold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Truck className="w-5 h-5 mb-0.5" />
              {pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-amber-500 text-slate-950 text-[9px] font-black px-1 rounded-full min-w-[14px] text-center border border-slate-900">
                  {pendingCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight">Giao hàng</span>
          </button>

          {/* 5. Thêm (More menu drawer) */}
          <button
            type="button"
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className={`min-h-[48px] flex flex-col items-center justify-center transition-all ${
              isMoreMenuOpen ||
              ['inventory', 'revenue-report', 'debt-management', 'master-data', 'bonus-report'].includes(
                activeTab
              )
                ? 'text-blue-400 font-extrabold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Thêm</span>
          </button>
        </div>
      </nav>

      {/* Slide-over / Bottom Sheet for "Thêm" Menu */}
      {isMoreMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200 safe-area-pb"
          >
            {/* Sheet Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Chức năng mở rộng</h3>
                  <p className="text-[10px] text-slate-400">KDT-89 OrderManager Logistics</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Items List */}
            <div className="space-y-2">
              {moreMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full min-h-[48px] p-3 rounded-2xl flex items-center justify-between text-left transition-all border ${
                      isActive
                        ? 'bg-blue-600/20 border-blue-500/50 text-white'
                        : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700/60 text-slate-300'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-white">{item.label}</span>
                          {item.badge && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded-full border font-bold ${
                                item.badgeColor || 'bg-slate-700 text-slate-300 border-slate-600'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">{item.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  </button>
                );
              })}

              {/* Data Management Action */}
              {onOpenDataManagement && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenDataManagement();
                  }}
                  className="w-full min-h-[48px] p-3 rounded-2xl flex items-center justify-between bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-left transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/40">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-white">Nạp & Quản lý Dữ liệu</span>
                      <p className="text-[10px] text-slate-400">Nạp đơn hàng cũ, backup & kiểm tra bộ nhớ</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                </button>
              )}
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(false)}
                className="w-full min-h-[44px] py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold text-xs hover:text-white"
              >
                Đóng menu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

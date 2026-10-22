import React from 'react';
import {
  LayoutDashboard,
  Warehouse,
  ShoppingCart,
  ClipboardList,
  Award,
  FolderTree,
  TrendingUp,
  CreditCard,
} from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  pendingCount: number;
  lowStockCount: number;
  unpaidDebtCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  pendingCount,
  lowStockCount,
  unpaidDebtCount = 0,
}) => {
  const tabs = [
    {
      id: 'dashboard',
      label: 'Tổng quan',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'revenue-report',
      label: 'Báo cáo doanh thu',
      icon: TrendingUp,
      badge: 'Doanh thu',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
    {
      id: 'debt-management',
      label: 'Quản lý công nợ',
      icon: CreditCard,
      badge: unpaidDebtCount > 0 ? `${unpaidDebtCount} nợ` : null,
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    {
      id: 'orders',
      label: 'Đơn hàng',
      icon: ClipboardList,
      badge: pendingCount > 0 ? `${pendingCount} chờ` : null,
      badgeBg: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    {
      id: 'create-order',
      label: 'Lên đơn mới',
      icon: ShoppingCart,
      highlight: true,
    },
    {
      id: 'inventory',
      label: 'Kho hàng',
      icon: Warehouse,
      badge: lowStockCount > 0 ? `${lowStockCount} cảnh báo` : null,
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    {
      id: 'master-data',
      label: 'Danh mục & Hãng',
      icon: FolderTree,
      badge: null,
    },
    {
      id: 'bonus-report',
      label: 'Thưởng kích hoạt',
      icon: Award,
      badge: 'Thưởng BH',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 shadow-xs sticky top-16 z-20 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  tab.highlight && !isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 hover:bg-blue-700'
                    : isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${tab.highlight && !isActive ? 'text-white' : isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                <span>{tab.label}</span>

                {tab.badge && (
                  <span
                    className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                      tab.badgeBg || 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

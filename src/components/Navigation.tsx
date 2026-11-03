import React, { useRef, useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Warehouse,
  ShoppingCart,
  ClipboardList,
  Award,
  FolderTree,
  TrendingUp,
  CreditCard,
  Truck,
  ChevronLeft,
  ChevronRight,
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Tabs ordered with core operational items (Đơn hàng & Kho hàng) upfront
  const tabs = [
    {
      id: 'dashboard',
      label: 'Tổng quan',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'orders',
      label: 'Đơn hàng',
      icon: ClipboardList,
      badge: pendingCount > 0 ? `${pendingCount}` : null,
      badgeBg: 'bg-blue-100 text-blue-800 border-blue-300',
      badgeTitle: 'Đơn hàng cần xử lý/giao',
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
      badge: lowStockCount > 0 ? `${lowStockCount} sắp hết` : null,
      badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
      badgeTitle: 'Sản phẩm sắp hết hàng',
    },
    {
      id: 'delivery-schedule',
      label: 'Lịch giao & Shipper',
      icon: Truck,
      badge: null,
    },
    {
      id: 'revenue-report',
      label: 'Báo cáo doanh thu',
      icon: TrendingUp,
      badge: null,
    },
    {
      id: 'debt-management',
      label: 'Quản lý công nợ',
      icon: CreditCard,
      badge: unpaidDebtCount > 0 ? `${unpaidDebtCount} nợ` : null,
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
      badgeTitle: 'Đơn còn công nợ',
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
      badge: null,
    },
  ];

  // Check scroll capability
  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (el) {
      const hasOverflow = el.scrollWidth > el.clientWidth;
      setCanScrollLeft(el.scrollLeft > 10);
      setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (el) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkScroll, 300);
    }
  };

  return (
    <nav className="hidden md:block bg-white border-b border-slate-200 shadow-xs sticky top-14 sm:top-16 z-20 no-print">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 relative">
        <div className="flex items-center relative">
          {/* Scroll Left Button if overflow */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => handleScroll('left')}
              className="absolute left-0 z-10 h-9 w-9 -ml-1 rounded-full bg-white/95 border border-slate-300 shadow-md text-slate-700 flex items-center justify-center hover:bg-slate-100 transition-all cursor-pointer"
              title="Cuộn sang trái"
              aria-label="Cuộn sang trái"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Tab List */}
          <div
            ref={scrollContainerRef}
            onScroll={checkScroll}
            className="flex items-center space-x-1 sm:space-x-2 py-2 overflow-x-auto scroll-smooth w-full no-scrollbar"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#cbd5e1 transparent',
            }}
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    tab.highlight && !isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 hover:bg-blue-700'
                      : isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      tab.highlight && !isActive
                        ? 'text-white'
                        : isActive
                        ? 'text-blue-600'
                        : 'text-slate-500'
                    }`}
                  />
                  <span>{tab.label}</span>

                  {tab.badge && (
                    <span
                      title={tab.badgeTitle}
                      className={`ml-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border shrink-0 ${
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

          {/* Scroll Right Button if overflow */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => handleScroll('right')}
              className="absolute right-0 z-10 h-9 w-9 -mr-1 rounded-full bg-white/95 border border-slate-300 shadow-md text-slate-700 flex items-center justify-center hover:bg-slate-100 transition-all cursor-pointer"
              title="Cuộn sang phải"
              aria-label="Cuộn sang phải"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

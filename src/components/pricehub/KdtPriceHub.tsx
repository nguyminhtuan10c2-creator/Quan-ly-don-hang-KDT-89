import React, { useState, useEffect } from 'react';
import {
  Zap,
  LayoutDashboard,
  Package,
  Building2,
  FileText,
  FileSpreadsheet,
  TrendingDown,
  History,
  Sparkles,
  RefreshCw,
  Coins,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import {
  PriceProduct,
  Supplier,
  SupplierQuotation,
  Product,
} from '../../types';
import {
  getPriceProducts,
  getSuppliers,
  getSupplierQuotations,
} from '../../services/priceHubService';

import { PriceHubDashboard } from './PriceHubDashboard';
import { PriceHubFastSearch } from './PriceHubFastSearch';
import { PriceHubProductsCatalog } from './PriceHubProductsCatalog';
import { PriceHubSuppliers } from './PriceHubSuppliers';
import { PriceHubQuoteEntry } from './PriceHubQuoteEntry';
import { PriceHubImport } from './PriceHubImport';
import { PriceHubHistory } from './PriceHubHistory';
import { PriceHubComparison } from './PriceHubComparison';

interface KdtPriceHubProps {
  inventoryProducts: Product[];
  onNavigateToInventory?: () => void;
  onNavigateToCreateOrder?: (productName?: string) => void;
}

export type PriceHubSubTab =
  | 'fast-search'
  | 'dashboard'
  | 'products'
  | 'suppliers'
  | 'quote-entry'
  | 'import'
  | 'comparison'
  | 'history';

export const KdtPriceHub: React.FC<KdtPriceHubProps> = ({
  inventoryProducts,
  onNavigateToInventory,
  onNavigateToCreateOrder,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<PriceHubSubTab>('fast-search');

  // Core Price Hub State
  const [priceProducts, setPriceProducts] = useState<PriceProduct[]>(getPriceProducts());
  const [suppliers, setSuppliers] = useState<Supplier[]>(getSuppliers());
  const [quotations, setQuotations] = useState<SupplierQuotation[]>(getSupplierQuotations());

  // Cross-navigation context
  const [targetProductId, setTargetProductId] = useState<string | undefined>(undefined);
  const [targetSupplierId, setTargetSupplierId] = useState<string | undefined>(undefined);

  const refreshAllData = () => {
    setPriceProducts(getPriceProducts());
    setSuppliers(getSuppliers());
    setQuotations(getSupplierQuotations());
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Subtabs configuration
  const subTabs = [
    {
      id: 'fast-search' as PriceHubSubTab,
      label: 'Tra cứu siêu tốc',
      shortLabel: 'Tra cứu',
      icon: Zap,
      badge: 'SALE 3s',
      badgeColor: 'bg-amber-400 text-slate-900',
    },
    {
      id: 'dashboard' as PriceHubSubTab,
      label: 'Tổng quan & Phân tích',
      shortLabel: 'Tổng quan',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'comparison' as PriceHubSubTab,
      label: 'So sánh giá NPP',
      shortLabel: 'So sánh giá',
      icon: TrendingDown,
      badge: 'Net Rank',
      badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    },
    {
      id: 'quote-entry' as PriceHubSubTab,
      label: 'Nhập báo giá',
      shortLabel: 'Nhập giá',
      icon: FileText,
      badge: '+ Mới',
      badgeColor: 'bg-blue-100 text-blue-800 border border-blue-300',
    },
    {
      id: 'import' as PriceHubSubTab,
      label: 'Import Excel / PDF',
      shortLabel: 'Import file',
      icon: FileSpreadsheet,
      badge: 'XLS/CSV',
      badgeColor: 'bg-purple-100 text-purple-800 border border-purple-300',
    },
    {
      id: 'products' as PriceHubSubTab,
      label: 'Sản phẩm hỏi giá',
      shortLabel: 'Sản phẩm',
      icon: Package,
      badge: `${priceProducts.length}`,
      badgeColor: 'bg-slate-100 text-slate-700',
    },
    {
      id: 'suppliers' as PriceHubSubTab,
      label: 'Nhà cung cấp',
      shortLabel: 'NPP',
      icon: Building2,
      badge: `${suppliers.length}`,
      badgeColor: 'bg-slate-100 text-slate-700',
    },
    {
      id: 'history' as PriceHubSubTab,
      label: 'Lịch sử & Audit Log',
      shortLabel: 'Lịch sử',
      icon: History,
      badge: `${quotations.length}`,
      badgeColor: 'bg-slate-100 text-slate-700',
    },
  ];

  // Navigation handlers
  const handleNavigateToComparison = (productId: string) => {
    setTargetProductId(productId);
    setActiveSubTab('comparison');
  };

  const handleNavigateToProductDetail = (productId: string) => {
    setTargetProductId(productId);
    setActiveSubTab('comparison');
  };

  const handleNavigateToNewQuote = (productId?: string) => {
    setTargetProductId(productId);
    setTargetSupplierId(undefined);
    setActiveSubTab('quote-entry');
  };

  const handleNavigateToNewQuoteWithSupplier = (supplierId: string) => {
    setTargetSupplierId(supplierId);
    setTargetProductId(undefined);
    setActiveSubTab('quote-entry');
  };

  const handleQuoteSavedSuccess = (quotationId: string) => {
    refreshAllData();
    setActiveSubTab('history');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  KDT PRICE HUB
                </h1>
                <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full">
                  TRUNG TÂM DỮ LIỆU BÁO GIÁ
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Hệ thống quản lý dữ liệu giá mua từ các nhà phân phối dành riêng cho Sale, Thu mua & Quản lý
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              type="button"
              onClick={refreshAllData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              title="Làm mới dữ liệu từ hệ thống"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Đồng bộ</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs Scrollable Navigation Bar */}
        <div className="pt-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 min-w-max pb-1">
            {subTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-500'
                    }`}
                  />
                  <span>{tab.label}</span>

                  {tab.badge && (
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : tab.badgeColor || 'bg-slate-100 text-slate-700'
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
      </div>

      {/* Main SubTab Content View */}
      <div>
        {activeSubTab === 'fast-search' && (
          <PriceHubFastSearch
            products={priceProducts}
            suppliers={suppliers}
            quotations={quotations}
            onNavigateToComparison={handleNavigateToComparison}
            onNavigateToProductDetail={handleNavigateToProductDetail}
            onNavigateToNewQuote={handleNavigateToNewQuote}
          />
        )}

        {activeSubTab === 'dashboard' && (
          <PriceHubDashboard
            products={priceProducts}
            suppliers={suppliers}
            quotations={quotations}
            onNavigateToProducts={() => setActiveSubTab('products')}
            onNavigateToSuppliers={() => setActiveSubTab('suppliers')}
            onNavigateToComparison={handleNavigateToComparison}
            onNavigateToNewQuote={handleNavigateToNewQuote}
          />
        )}

        {activeSubTab === 'comparison' && (
          <PriceHubComparison
            products={priceProducts}
            suppliers={suppliers}
            quotations={quotations}
            initialProductId={targetProductId}
            onNavigateToNewQuote={handleNavigateToNewQuote}
            onNavigateToProductCatalog={() => setActiveSubTab('products')}
          />
        )}

        {activeSubTab === 'quote-entry' && (
          <PriceHubQuoteEntry
            products={priceProducts}
            suppliers={suppliers}
            initialProductId={targetProductId}
            initialSupplierId={targetSupplierId}
            onRefresh={refreshAllData}
            onSuccess={handleQuoteSavedSuccess}
          />
        )}

        {activeSubTab === 'import' && (
          <PriceHubImport
            products={priceProducts}
            suppliers={suppliers}
            onRefresh={refreshAllData}
            onSuccess={handleQuoteSavedSuccess}
          />
        )}

        {activeSubTab === 'products' && (
          <PriceHubProductsCatalog
            products={priceProducts}
            suppliers={suppliers}
            quotations={quotations}
            inventoryProducts={inventoryProducts}
            onRefresh={refreshAllData}
            onNavigateToComparison={handleNavigateToComparison}
            onNavigateToNewQuote={handleNavigateToNewQuote}
          />
        )}

        {activeSubTab === 'suppliers' && (
          <PriceHubSuppliers
            suppliers={suppliers}
            products={priceProducts}
            quotations={quotations}
            onRefresh={refreshAllData}
            onNavigateToNewQuoteWithSupplier={handleNavigateToNewQuoteWithSupplier}
          />
        )}

        {activeSubTab === 'history' && (
          <PriceHubHistory
            quotations={quotations}
            suppliers={suppliers}
            products={priceProducts}
            onRefresh={refreshAllData}
            onNavigateToComparison={handleNavigateToComparison}
          />
        )}
      </div>
    </div>
  );
};

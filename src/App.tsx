import React, { useState, useEffect } from 'react';
import { Product, Order, EmployeeBonusSummary, CategoryItem, BrandItem } from './types';
import {
  getProducts,
  getOrders,
  getEmployeeBonusSummaries,
  getCategories,
  getBrands,
  getStaff,
  subscribeToStorage,
} from './services/storageService';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { CategoryBrandManager } from './components/CategoryBrandManager';
import { OrderForm } from './components/OrderForm';
import { OrderList } from './components/OrderList';
import { BonusReport } from './components/BonusReport';
import { RevenueReport } from './components/RevenueReport';
import { DebtManagement } from './components/DebtManagement';
import { DeliverySlip } from './components/DeliverySlip';
import { OrderDetailModal } from './components/OrderDetailModal';
import { DataManagementModal } from './components/DataManagementModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const [products, setProducts] = useState<Product[]>(getProducts());
  const [orders, setOrders] = useState<Order[]>(getOrders());
  const [bonusSummaries, setBonusSummaries] = useState<EmployeeBonusSummary[]>(getEmployeeBonusSummaries());
  const [categories, setCategories] = useState<CategoryItem[]>(getCategories());
  const [brands, setBrands] = useState<BrandItem[]>(getBrands());

  // Modals & Editing State
  const [selectedOrderForSlip, setSelectedOrderForSlip] = useState<Order | null>(null);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isDataModalOpen, setIsDataModalOpen] = useState<boolean>(false);

  // Sync state with local storage updates
  useEffect(() => {
    const refreshData = () => {
      setProducts(getProducts());
      setOrders(getOrders());
      setBonusSummaries(getEmployeeBonusSummaries());
      setCategories(getCategories());
      setBrands(getBrands());
    };

    // Initial refresh
    refreshData();

    // Subscribe to storage changes
    const unsubscribe = subscribeToStorage(refreshData);
    return () => unsubscribe();
  }, []);

  const pendingCount = orders.filter((o) => o.status === 'pending' || o.status === 'delivering').length;
  const lowStockCount = products.filter((p) => p.stock <= (p.minStockAlert || 5)).length;
  const unpaidDebtCount = orders.filter((o) => (o.remainingAmount || 0) > 0).length;

  const handleOrderCreatedFromForm = (newOrder: Order) => {
    // Clear edit state after saving
    setEditingOrder(null);
    // Show slip or remain on creation screen
    setSelectedOrderForSlip(newOrder);
  };

  const handleStartEditOrder = (order: Order) => {
    setEditingOrder(order);
    setSelectedOrderForDetail(null);
    setActiveTab('create-order');
  };

  const handleCancelEdit = () => {
    setEditingOrder(null);
    setActiveTab('orders');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Top Header */}
      <Header
        onNavigate={(tab) => setActiveTab(tab)}
        onOpenDataManagement={() => setIsDataModalOpen(true)}
      />

      {/* Main Tab Navigation */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        pendingCount={pendingCount}
        lowStockCount={lowStockCount}
        unpaidDebtCount={unpaidDebtCount}
      />

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            products={products}
            orders={orders}
            bonusSummaries={bonusSummaries}
            onNavigate={(tab) => setActiveTab(tab)}
            onViewOrder={(order) => setSelectedOrderForDetail(order)}
            onPrintSlip={(order) => setSelectedOrderForSlip(order)}
          />
        )}

        {activeTab === 'revenue-report' && (
          <RevenueReport
            orders={orders}
            products={products}
            staffList={getStaff()}
            onNavigateToDebt={() => setActiveTab('debt-management')}
            onViewOrderDetail={(order) => setSelectedOrderForDetail(order)}
          />
        )}

        {activeTab === 'debt-management' && (
          <DebtManagement
            orders={orders}
            onNavigateToRevenue={() => setActiveTab('revenue-report')}
            onViewOrderDetail={(order) => setSelectedOrderForDetail(order)}
          />
        )}

        {activeTab === 'inventory' && (
          <Inventory
            products={products}
            categories={categories}
            brands={brands}
            onNavigateToMasterData={() => setActiveTab('master-data')}
          />
        )}

        {activeTab === 'master-data' && (
          <CategoryBrandManager
            categories={categories}
            brands={brands}
            products={products}
          />
        )}

        {activeTab === 'create-order' && (
          <OrderForm
            products={products}
            onOrderCreated={handleOrderCreatedFromForm}
            onNavigateToOrders={() => {
              setEditingOrder(null);
              setActiveTab('orders');
            }}
            editingOrder={editingOrder}
            onCancelEdit={handleCancelEdit}
          />
        )}

        {activeTab === 'orders' && (
          <OrderList
            orders={orders}
            onSelectOrderForSlip={(order) => setSelectedOrderForSlip(order)}
            onSelectOrderForDetail={(order) => setSelectedOrderForDetail(order)}
            onEditOrder={handleStartEditOrder}
            onOpenDataManagement={() => setIsDataModalOpen(true)}
          />
        )}

        {activeTab === 'bonus-report' && <BonusReport bonusSummaries={bonusSummaries} />}
      </main>

      {/* Printable Delivery Slip Modal */}
      {selectedOrderForSlip && (
        <DeliverySlip order={selectedOrderForSlip} onClose={() => setSelectedOrderForSlip(null)} />
      )}

      {/* Order Detail View Modal */}
      {selectedOrderForDetail && (
        <OrderDetailModal
          order={selectedOrderForDetail}
          onClose={() => setSelectedOrderForDetail(null)}
          onOpenPrintSlip={(order) => setSelectedOrderForSlip(order)}
          onEditOrder={handleStartEditOrder}
        />
      )}

      {/* Data Management & Import Modal */}
      {isDataModalOpen && (
        <DataManagementModal
          isOpen={isDataModalOpen}
          onClose={() => setIsDataModalOpen(false)}
          onDataChanged={() => {
            setOrders(getOrders());
            setBonusSummaries(getEmployeeBonusSummaries());
          }}
        />
      )}

      {/* Simple Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 no-print">
        <p>© 2026 OrderManager - Hệ thống Quản lý Đơn hàng, Tồn kho & Thưởng Kích hoạt Bảo hành</p>
      </footer>
    </div>
  );
}

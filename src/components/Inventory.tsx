import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  Award,
  Package,
  X,
  Check,
  RefreshCw,
  FolderTree,
  Tag,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Calendar,
  History,
  ArrowUpDown,
  FileSpreadsheet,
  Zap,
  Info,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Product, CategoryItem, BrandItem, PriceChangeRecord } from '../types';
import {
  saveProduct,
  deleteProduct,
  formatVND,
  formatDateVI,
  formatDateTimeVI,
  getCategories,
  getBrands,
  getStaff,
  getActiveStaff,
  saveCategory,
  saveBrand,
  quickUpdateProductStockAndPrice,
  exportProductPriceAuditAsCsv,
  reloadInventoryFromReport,
} from '../services/storageService';

interface InventoryProps {
  products: Product[];
  categories?: CategoryItem[];
  brands?: BrandItem[];
  onNavigateToMasterData?: () => void;
}

export const Inventory: React.FC<InventoryProps> = ({
  products,
  categories: categoriesProp,
  brands: brandsProp,
  onNavigateToMasterData,
}) => {
  const staffList = getStaff();
  const activeStaff = getActiveStaff();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [priceRecencyFilter, setPriceRecencyFilter] = useState<'all' | 'recent_7d' | 'recent_30d' | 'older_90d'>('all');
  const [sortBy, setSortBy] = useState<'price_updated_desc' | 'stock_asc' | 'stock_desc' | 'price_desc' | 'price_asc' | 'name_asc'>('price_updated_desc');

  // Fallback category and brand lists
  const managedCategories = categoriesProp || getCategories();
  const managedBrands = brandsProp || getBrands();

  // Quick Price & Stock Modal State
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [quickTargetProduct, setQuickTargetProduct] = useState<Product | null>(null);
  const [quickNewStock, setQuickNewStock] = useState<number | ''>(0);
  const [quickNewPrice, setQuickNewPrice] = useState<number | ''>(0);
  const [quickNewCostPrice, setQuickNewCostPrice] = useState<number | ''>(0);
  const [quickPriceDate, setQuickPriceDate] = useState<string>('');
  const [quickPriceNote, setQuickPriceNote] = useState<string>('');
  const [quickUpdatedBy, setQuickUpdatedBy] = useState<string>('');

  // Price History Timeline Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyTargetProduct, setHistoryTargetProduct] = useState<Product | null>(null);

  // Sync Toast State
  const [syncSuccessToast, setSyncSuccessToast] = useState<string | null>(null);

  // Full Add/Edit Product Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Quick-Add Category & Brand States
  const [showQuickAddCategoryModal, setShowQuickAddCategoryModal] = useState(false);
  const [quickCategoryNameInput, setQuickCategoryNameInput] = useState('');
  const [quickCategoryDescInput, setQuickCategoryDescInput] = useState('');

  const [showQuickAddBrandModal, setShowQuickAddBrandModal] = useState(false);
  const [quickBrandNameInput, setQuickBrandNameInput] = useState('');
  const [quickBrandDescInput, setQuickBrandDescInput] = useState('');

  // Form Fields for Full Modal
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState(managedCategories[0]?.name || 'Điện thoại');
  const [brand, setBrand] = useState(managedBrands[0]?.name || 'Khác');
  const [stock, setStock] = useState<number | ''>(10);
  const [price, setPrice] = useState<number | ''>(1000000);
  const [costPrice, setCostPrice] = useState<number | ''>(780000);
  const [priceUpdatedAt, setPriceUpdatedAt] = useState<string>('');
  const [priceNote, setPriceNote] = useState<string>('');
  const [priceUpdatedBy, setPriceUpdatedBy] = useState<string>('');
  const [isWarrantyEligible, setIsWarrantyEligible] = useState(true);
  const [warrantyMonths, setWarrantyMonths] = useState<number>(12);
  const [activationBonusAmount, setActivationBonusAmount] = useState<number>(50000);
  const [description, setDescription] = useState('');

  // Helper extractor for product brand if undefined
  const getProductBrand = (product: Product): string => {
    if (product.brand) return product.brand.trim();
    const nameLower = product.name.toLowerCase();
    for (const b of managedBrands) {
      if (nameLower.includes(b.name.toLowerCase())) {
        return b.name;
      }
    }
    return 'Khác';
  };

  // Helper date diff in days
  const getDaysAgo = (dateStr?: string): number => {
    if (!dateStr) return 999;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 999;
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      return 999;
    }
  };

  // Filter & Sort products
  const filteredProducts = products
    .filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.brand || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const pBrand = getProductBrand(p);
      const matchesBrand = selectedBrand === 'all' || pBrand === selectedBrand;

      // Stock status filter
      let matchesStock = true;
      const minAlert = p.minStockAlert || 5;
      if (stockStatusFilter === 'out_of_stock') {
        matchesStock = p.stock === 0;
      } else if (stockStatusFilter === 'low_stock') {
        matchesStock = p.stock > 0 && p.stock <= minAlert;
      } else if (stockStatusFilter === 'in_stock') {
        matchesStock = p.stock > minAlert;
      }

      // Price update recency filter
      let matchesPriceRecency = true;
      const days = getDaysAgo(p.priceUpdatedAt || p.createdAt);
      if (priceRecencyFilter === 'recent_7d') {
        matchesPriceRecency = days <= 7;
      } else if (priceRecencyFilter === 'recent_30d') {
        matchesPriceRecency = days <= 30;
      } else if (priceRecencyFilter === 'older_90d') {
        matchesPriceRecency = days > 90;
      }

      return matchesSearch && matchesCategory && matchesBrand && matchesStock && matchesPriceRecency;
    })
    .sort((a, b) => {
      if (sortBy === 'price_updated_desc') {
        const dateA = new Date(a.priceUpdatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.priceUpdatedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      }
      if (sortBy === 'stock_asc') return a.stock - b.stock;
      if (sortBy === 'stock_desc') return b.stock - a.stock;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'vi');
      return 0;
    });

  // KPI calculations
  const totalSkuCount = products.length;
  const totalStockUnits = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalInventoryRetailValue = products.reduce((sum, p) => sum + (p.price || 0) * (p.stock || 0), 0);
  const totalInventoryCostValue = products.reduce((sum, p) => sum + (p.costPrice || p.price * 0.78) * (p.stock || 0), 0);
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= (p.minStockAlert || 5)).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;
  const priceUpdatedLast30DaysCount = products.filter((p) => getDaysAgo(p.priceUpdatedAt || p.createdAt) <= 30).length;

  // Handler: Open Quick Price/Stock Update Modal
  const handleOpenQuickModal = (product: Product) => {
    setQuickTargetProduct(product);
    setQuickNewStock(product.stock);
    setQuickNewPrice(product.price);
    setQuickNewCostPrice(product.costPrice || Math.round(product.price * 0.78));
    // Set default price date to current local date and time string formatted for input[type="datetime-local"]
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
    setQuickPriceDate(localISOTime);
    setQuickPriceNote('');
    setQuickUpdatedBy(activeStaff?.employeeName || 'Quản lý kho');
    setQuickModalOpen(true);
  };

  const handleSaveQuickUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTargetProduct) return;

    const numPrice = Number(quickNewPrice) || 0;
    const numStock = Number(quickNewStock) || 0;
    const numCostPrice = Number(quickNewCostPrice) || Math.round(numPrice * 0.78);

    // Format ISO string from local datetime
    let finalDate = new Date().toISOString();
    if (quickPriceDate) {
      try {
        finalDate = new Date(quickPriceDate).toISOString();
      } catch {
        finalDate = new Date().toISOString();
      }
    }

    quickUpdateProductStockAndPrice(quickTargetProduct.id, {
      price: numPrice,
      costPrice: numCostPrice,
      stock: numStock,
      priceUpdatedAt: finalDate,
      priceNote: quickPriceNote.trim() || 'Cập nhật giá và kiểm kê kho',
      updatedBy: quickUpdatedBy.trim() || activeStaff?.employeeName || 'Quản lý kho',
      stockNote: `Kiểm kê cập nhật kho: ${numStock} chiếc`,
    });

    setQuickModalOpen(false);
    setQuickTargetProduct(null);
  };

  // Handler: Open Price History Modal
  const handleOpenHistoryModal = (product: Product) => {
    setHistoryTargetProduct(product);
    setHistoryModalOpen(true);
  };

  // Handler: Open Full Add Modal
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setName('');
    setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setCategory(managedCategories[0]?.name || 'Điện thoại');
    setBrand(managedBrands[0]?.name || 'Khác');
    setStock(10);
    setPrice(2000000);
    setCostPrice(1500000);

    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    setPriceUpdatedAt(new Date(now.getTime() - tzOffset).toISOString().slice(0, 16));
    setPriceNote('Thiết lập giá ban đầu khi thêm vào kho');
    setPriceUpdatedBy(activeStaff?.employeeName || 'Quản lý kho');

    setIsWarrantyEligible(true);
    setWarrantyMonths(12);
    setActivationBonusAmount(50000);
    setDescription('');
    setIsModalOpen(true);
  };

  // Handler: Open Full Edit Modal
  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setSku(product.sku);
    setCategory(product.category || managedCategories[0]?.name || 'Khác');
    setBrand(getProductBrand(product));
    setStock(product.stock);
    setPrice(product.price);
    setCostPrice(product.costPrice !== undefined ? product.costPrice : Math.round(product.price * 0.78));

    // Existing date or current
    const dateSource = product.priceUpdatedAt ? new Date(product.priceUpdatedAt) : new Date();
    const tzOffset = dateSource.getTimezoneOffset() * 60000;
    setPriceUpdatedAt(new Date(dateSource.getTime() - tzOffset).toISOString().slice(0, 16));
    setPriceNote(product.priceNote || '');
    setPriceUpdatedBy(product.priceUpdatedBy || activeStaff?.employeeName || 'Quản lý kho');

    setIsWarrantyEligible(product.isWarrantyEligible);
    setWarrantyMonths(product.warrantyMonths || 12);
    setActivationBonusAmount(product.activationBonusAmount || 0);
    setDescription(product.description || '');
    setIsModalOpen(true);
  };

  const handleDeleteProduct = (id: string, productName: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${productName}" khỏi kho hàng?`)) {
      deleteProduct(id);
    }
  };

  const handleSaveFullSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim()) {
      alert('Vui lòng điền đầy đủ Tên sản phẩm và Mã SKU!');
      return;
    }

    let isoPriceDate = new Date().toISOString();
    if (priceUpdatedAt) {
      try {
        isoPriceDate = new Date(priceUpdatedAt).toISOString();
      } catch {
        isoPriceDate = new Date().toISOString();
      }
    }

    saveProduct({
      id: editingProduct ? editingProduct.id : undefined,
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      category,
      brand,
      stock: Number(stock) || 0,
      price: Number(price) || 0,
      costPrice: Number(costPrice) || Math.round((Number(price) || 0) * 0.78),
      priceUpdatedAt: isoPriceDate,
      priceUpdatedBy: priceUpdatedBy.trim() || activeStaff?.employeeName || 'Quản lý kho',
      priceNote: priceNote.trim() || (editingProduct ? 'Cập nhật thông tin và giá sản phẩm' : 'Nhập kho sản phẩm mới'),
      isWarrantyEligible,
      warrantyMonths: isWarrantyEligible ? Number(warrantyMonths) || 12 : 0,
      activationBonusAmount: isWarrantyEligible ? Number(activationBonusAmount) || 0 : 0,
      description: description.trim(),
      minStockAlert: 5,
    });

    setIsModalOpen(false);
  };

  const handleQuickSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickCategoryNameInput.trim();
    if (!trimmed) {
      alert('Vui lòng nhập tên danh mục!');
      return;
    }
    const saved = saveCategory({ name: trimmed, description: quickCategoryDescInput.trim() });
    setCategory(saved.name);
    setShowQuickAddCategoryModal(false);
    setQuickCategoryNameInput('');
    setQuickCategoryDescInput('');
  };

  const handleQuickSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickBrandNameInput.trim();
    if (!trimmed) {
      alert('Vui lòng nhập tên hãng / thương hiệu!');
      return;
    }
    const saved = saveBrand({ name: trimmed, description: quickBrandDescInput.trim() });
    setBrand(saved.name);
    setShowQuickAddBrandModal(false);
    setQuickBrandNameInput('');
    setQuickBrandDescInput('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <Package className="w-6 h-6 text-blue-600" />
            <span>Quản lý Kho hàng & Kiểm soát Giá sản phẩm</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cập nhật nhanh tồn kho, giá bán & giá vốn, theo dõi chính xác <strong>ngày giờ cập nhật giá</strong> và toàn bộ lịch sử biến động giá của từng sản phẩm.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              reloadInventoryFromReport();
              setSyncSuccessToast('Đã nạp thành công 328 sản phẩm tồn kho từ file 13/10/2026 thuộc 6 nhóm yêu cầu!');
              setTimeout(() => setSyncSuccessToast(null), 5000);
            }}
            className="bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-xs"
            title="Khôi phục / Nạp lại danh mục 328 sản phẩm chuẩn từ file TON_13-101.csv"
          >
            <RefreshCw className="w-4 h-4 text-sky-600" />
            <span>Nạp file tồn 13/10 (328 SP)</span>
          </button>

          <button
            onClick={() => exportProductPriceAuditAsCsv(filteredProducts)}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-xs"
            title="Xuất bảng kiểm soát giá & tồn kho ra file Excel/CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Xuất bảng giá kho (CSV)</span>
          </button>

          {onNavigateToMasterData && (
            <button
              onClick={onNavigateToMasterData}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all"
            >
              <FolderTree className="w-4 h-4 text-indigo-600" />
              <span>Danh mục & Hãng</span>
            </button>
          )}

          <button
            onClick={handleOpenAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center space-x-2 shadow-md shadow-blue-500/20 transition-all hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm sản phẩm mới</span>
          </button>
        </div>
      </div>

      {/* File Import Context Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-emerald-50 border border-blue-200 p-3.5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-blue-600 text-white font-bold shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="font-extrabold text-slate-800">
              Dữ liệu tồn kho chính thức (13/10/2026): <span className="text-blue-700">328 sản phẩm</span>
            </p>
            <p className="text-slate-600 text-[11px] mt-0.5">
              Đã lọc chính xác <strong>6 nhóm mặt hàng</strong> theo yêu cầu: <span className="font-semibold text-slate-900">Tivi, Tủ lạnh, Máy giặt, Quạt, Máy lạnh, Gia dụng</span>. Loại bỏ toàn bộ vật tư, linh kiện, dụng cụ & dịch vụ.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto">
          <span className="bg-white/80 border border-blue-200 text-blue-800 px-2.5 py-1 rounded-lg font-bold text-[11px]">
            File: TON_13-101.csv
          </span>
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-lg font-bold text-[11px]">
            ✓ Đã chuẩn hoá tiếng Việt
          </span>
        </div>
      </div>

      {syncSuccessToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncSuccessToast}</span>
          </div>
          <button onClick={() => setSyncSuccessToast(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: SKU & Stock Units */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng mặt hàng trong kho</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{totalSkuCount}</span>
              <span className="text-xs font-bold text-slate-500">mã SKU</span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium mt-1">
              Tổng số lượng: <strong className="text-blue-700">{totalStockUnits}</strong> chiếc
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-xs">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Inventory Value */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Giá trị hàng tồn kho</p>
            <p className="text-lg font-black text-emerald-700 mt-1">{formatVND(totalInventoryRetailValue)}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Giá vốn ước tính: <span className="font-semibold text-slate-700">{formatVND(totalInventoryCostValue)}</span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Stock Status Alerts */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cảnh báo tồn kho</p>
            <div className="flex items-center space-x-3 mt-1.5">
              <span
                onClick={() => setStockStatusFilter('low_stock')}
                className="cursor-pointer text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 hover:bg-amber-100 transition-all"
                title="Bấm để lọc các sản phẩm sắp hết"
              >
                {lowStockCount} sắp hết
              </span>
              <span
                onClick={() => setStockStatusFilter('out_of_stock')}
                className="cursor-pointer text-xs font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 hover:bg-rose-100 transition-all"
                title="Bấm để lọc các sản phẩm đã hết hàng"
              >
                {outOfStockCount} hết hàng
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Định mức cảnh báo: ≤ 5 chiếc</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Price Control & Recency */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kiểm soát giá bán</p>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-black text-indigo-700">{priceUpdatedLast30DaysCount}</span>
              <span className="text-xs font-bold text-slate-500">/ {totalSkuCount} SP</span>
            </div>
            <p className="text-[11px] text-indigo-900 font-medium mt-1 flex items-center space-x-1">
              <Clock className="w-3 h-3 text-indigo-600" />
              <span>Đã cập nhật giá trong 30 ngày qua</span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-xs">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Field */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên sản phẩm, mã SKU, hãng, danh mục..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Category Dropdown */}
            <div className="flex items-center space-x-1 text-xs">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả danh mục ({managedCategories.length})</option>
                {managedCategories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Dropdown */}
            <div className="flex items-center space-x-1 text-xs">
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Tất cả hãng sản xuất ({managedBrands.length})</option>
                {managedBrands.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Recency Filter Dropdown */}
            <div className="flex items-center space-x-1 text-xs">
              <select
                value={priceRecencyFilter}
                onChange={(e) => setPriceRecencyFilter(e.target.value as any)}
                className="bg-indigo-50/70 border border-indigo-200 text-indigo-900 font-bold px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                title="Lọc theo ngày cập nhật giá gần nhất"
              >
                <option value="all">Tất cả hạn đổi giá</option>
                <option value="recent_7d">⚡ Giá mới đổi (≤ 7 ngày)</option>
                <option value="recent_30d">📅 Cập nhật giá (≤ 30 ngày)</option>
                <option value="older_90d">⚠️ Chưa đổi giá (&gt; 90 ngày)</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-1 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="price_updated_desc">Ngày cập nhật giá mới nhất</option>
                <option value="stock_asc">Tồn kho ít nhất trước</option>
                <option value="stock_desc">Tồn kho nhiều nhất trước</option>
                <option value="price_desc">Giá bán cao nhất</option>
                <option value="price_asc">Giá bán thấp nhất</option>
                <option value="name_asc">Tên sản phẩm A - Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Filter Pills (6 Allowed Categories) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Tag className="w-3 h-3 text-blue-600" />
            Nhóm hàng:
          </span>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({products.length})
          </button>
          {[
            { name: 'Máy lạnh', color: 'text-sky-700 bg-sky-50 border-sky-200' },
            { name: 'Gia dụng', color: 'text-amber-700 bg-amber-50 border-amber-200' },
            { name: 'Máy giặt', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
            { name: 'Quạt', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
            { name: 'Tivi', color: 'text-purple-700 bg-purple-50 border-purple-200' },
            { name: 'Tủ lạnh', color: 'text-teal-700 bg-teal-50 border-teal-200' },
          ].map((catItem) => {
            const count = products.filter((p) => p.category === catItem.name).length;
            const isSelected = selectedCategory === catItem.name;
            return (
              <button
                key={catItem.name}
                onClick={() => setSelectedCategory(isSelected ? 'all' : catItem.name)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : `${catItem.color} hover:opacity-80`
                }`}
              >
                {catItem.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Stock Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-500 mr-1">Trạng thái kho:</span>
          <button
            onClick={() => setStockStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
              stockStatusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({products.length})
          </button>
          <button
            onClick={() => setStockStatusFilter('in_stock')}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
              stockStatusFilter === 'in_stock'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            Còn dồi dào (&gt; 5)
          </button>
          <button
            onClick={() => setStockStatusFilter('low_stock')}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center space-x-1 ${
              stockStatusFilter === 'low_stock'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Sắp hết (≤ 5): {lowStockCount}</span>
          </button>
          <button
            onClick={() => setStockStatusFilter('out_of_stock')}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center space-x-1 ${
              stockStatusFilter === 'out_of_stock'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <span>Hết hàng (0): {outOfStockCount}</span>
          </button>

          {(selectedCategory !== 'all' || selectedBrand !== 'all' || stockStatusFilter !== 'all' || priceRecencyFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedBrand('all');
                setStockStatusFilter('all');
                setPriceRecencyFilter('all');
              }}
              className="ml-auto text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Đặt lại bộ lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Product Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Sản phẩm & SKU</th>
                <th className="py-3.5 px-4">Danh mục / Hãng</th>
                <th className="py-3.5 px-4 text-center">Tồn kho</th>
                <th className="py-3.5 px-4 text-right">
                  <div className="flex flex-col items-end">
                    <span>Giá bán niêm yết</span>
                    <span className="text-[10px] text-indigo-600 font-bold lowercase">★ Ngày cập nhật giá</span>
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Giá vốn & Biên lãi</th>
                <th className="py-3.5 px-4 text-center">Bảo hành / Thưởng</th>
                <th className="py-3.5 px-4 text-center">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold">Không tìm thấy sản phẩm nào khớp với điều kiện lọc.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Thử xóa bộ lọc hoặc tìm kiếm với từ khóa khác.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const isLowStock = product.stock > 0 && product.stock <= (product.minStockAlert || 5);
                  const isOutOfStock = product.stock === 0;
                  const pBrand = getProductBrand(product);
                  const daysSincePriceUpdate = getDaysAgo(product.priceUpdatedAt || product.createdAt);
                  const priceHistoryCount = (product.priceHistory || []).length;
                  const cost = product.costPrice || Math.round(product.price * 0.78);
                  const marginPct = product.price > 0 && cost > 0
                    ? (((product.price - cost) / product.price) * 100).toFixed(1)
                    : null;

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Product Name & SKU */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start space-x-2">
                          <div>
                            <p className="font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors">
                              {product.name}
                            </p>
                            <div className="flex items-center space-x-2 mt-0.5">
                              <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {product.sku}
                              </span>
                              {product.description && (
                                <span className="text-[11px] text-slate-400 truncate max-w-xs" title={product.description}>
                                  {product.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category & Brand */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 items-center">
                          <span className="bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded-md border border-blue-200 text-[10px]">
                            {product.category}
                          </span>
                          {pBrand && (
                            <span className="bg-indigo-50 text-indigo-800 font-bold px-2 py-0.5 rounded-md border border-indigo-200 text-[10px]">
                              {pBrand}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stock Quantity */}
                      <td className="py-3.5 px-4 text-center">
                        <div>
                          <span
                            className={`font-black px-3 py-1 rounded-xl text-xs border inline-block ${
                              isOutOfStock
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : isLowStock
                                ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {product.stock} {isOutOfStock ? '(Hết hàng)' : 'chiếc'}
                          </span>
                          {product.stockUpdatedAt && (
                            <p className="text-[10px] text-slate-400 mt-1" title={`Kho cập nhật: ${formatDateTimeVI(product.stockUpdatedAt)}`}>
                              Kiểm kho: {formatDateVI(product.stockUpdatedAt)}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Price & Price Update Date */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-black text-slate-900 text-sm">{formatVND(product.price)}</span>
                          </div>

                          {/* Price Update Date Badge */}
                          <div className="mt-1 flex items-center space-x-1">
                            {daysSincePriceUpdate <= 7 ? (
                              <span className="inline-flex items-center space-x-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs">
                                <Zap className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Giá mới: {formatDateVI(product.priceUpdatedAt || product.createdAt)}</span>
                              </span>
                            ) : daysSincePriceUpdate > 90 ? (
                              <span className="inline-flex items-center space-x-1 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-medium px-2 py-0.5 rounded-md">
                                <Clock className="w-2.5 h-2.5 text-amber-600" />
                                <span>Cập nhật: {formatDateVI(product.priceUpdatedAt || product.createdAt)} (&gt;3th)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                                <Calendar className="w-2.5 h-2.5 text-indigo-600" />
                                <span>Cập nhật: {formatDateVI(product.priceUpdatedAt || product.createdAt)}</span>
                              </span>
                            )}

                            {/* View History Button */}
                            <button
                              onClick={() => handleOpenHistoryModal(product)}
                              title={`Xem lịch sử thay đổi giá (${priceHistoryCount} lần đổi)`}
                              className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 p-1 rounded-md transition-all flex items-center space-x-0.5"
                            >
                              <History className="w-3 h-3 text-indigo-500" />
                              <span>{priceHistoryCount > 0 ? `(${priceHistoryCount})` : ''}</span>
                            </button>
                          </div>

                          {/* Subtext info of updater or note */}
                          {product.priceNote && (
                            <p className="text-[10px] text-slate-400 italic max-w-xs truncate mt-0.5" title={product.priceNote}>
                              "{product.priceNote}"
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Cost Price & Profit Margin */}
                      <td className="py-3.5 px-4 text-right">
                        <div>
                          <p className="font-semibold text-slate-600 text-xs">{formatVND(cost)}</p>
                          {marginPct && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-block mt-0.5 ${
                                Number(marginPct) > 20
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : Number(marginPct) > 10
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              Lãi: +{marginPct}%
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Warranty & Activation Bonus */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="space-y-1">
                          {product.isWarrantyEligible ? (
                            <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md border border-blue-200 text-[10px] inline-flex items-center space-x-1">
                              <ShieldCheck className="w-3 h-3 text-blue-600" />
                              <span>{product.warrantyMonths} tháng</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">Không BH</span>
                          )}

                          {product.isWarrantyEligible && product.activationBonusAmount > 0 && (
                            <div>
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[10px] font-bold inline-flex items-center space-x-1">
                                <Award className="w-3 h-3 text-emerald-600" />
                                <span>+{formatVND(product.activationBonusAmount)}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Quick Update Stock & Price */}
                          <button
                            onClick={() => handleOpenQuickModal(product)}
                            title="Cập nhật nhanh Giá & Kho hàng"
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 transition-all shadow-2xs"
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </button>

                          {/* Price History */}
                          <button
                            onClick={() => handleOpenHistoryModal(product)}
                            title="Lịch sử biến động giá"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* Full Edit */}
                          <button
                            onClick={() => handleOpenEditModal(product)}
                            title="Sửa toàn bộ thông tin sản phẩm"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteProduct(product.id, product.name)}
                            title="Xóa sản phẩm"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: QUICK UPDATE STOCK, PRICE & DATE MODAL */}
      {/* ======================================================== */}
      {quickModalOpen && quickTargetProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">Cập nhật nhanh Giá & Kho hàng</h3>
                  <p className="text-[11px] text-indigo-200">Kiểm soát giá bán và ngày áp dụng giá của sản phẩm</p>
                </div>
              </div>
              <button
                onClick={() => setQuickModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Product Summary Card */}
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-black text-slate-900 text-sm">{quickTargetProduct.name}</p>
                <div className="flex items-center space-x-2 mt-0.5 text-xs">
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-bold">
                    SKU: {quickTargetProduct.sku}
                  </span>
                  <span className="text-slate-500 font-medium">Hãng: {getProductBrand(quickTargetProduct)}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">Giá hiện tại</span>
                <span className="font-black text-slate-800 text-sm">{formatVND(quickTargetProduct.price)}</span>
              </div>
            </div>

            <form onSubmit={handleSaveQuickUpdate} className="p-6 space-y-4">
              {/* Price & Cost Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Giá bán mới (VNĐ) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={quickNewPrice}
                    onChange={(e) => setQuickNewPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-sm px-3.5 py-2.5 border-2 border-indigo-400 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-black text-indigo-700 bg-white"
                  />
                  {/* Price diff indicator */}
                  {quickNewPrice !== '' && Number(quickNewPrice) !== quickTargetProduct.price && (
                    <div className="flex items-center space-x-1 mt-1 text-[11px] font-bold">
                      {Number(quickNewPrice) > quickTargetProduct.price ? (
                        <span className="text-emerald-700 flex items-center space-x-0.5">
                          <TrendingUp className="w-3 h-3" />
                          <span>
                            Tăng +{formatVND(Number(quickNewPrice) - quickTargetProduct.price)} (+
                            {(((Number(quickNewPrice) - quickTargetProduct.price) / quickTargetProduct.price) * 100).toFixed(1)}%)
                          </span>
                        </span>
                      ) : (
                        <span className="text-rose-700 flex items-center space-x-0.5">
                          <TrendingDown className="w-3 h-3" />
                          <span>
                            Giảm {formatVND(Number(quickNewPrice) - quickTargetProduct.price)} (
                            {(((Number(quickNewPrice) - quickTargetProduct.price) / quickTargetProduct.price) * 100).toFixed(1)}%)
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Giá vốn / Giá nhập (VNĐ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={quickNewCostPrice}
                    onChange={(e) => setQuickNewCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-slate-700 bg-white"
                  />
                  {quickNewPrice !== '' && quickNewCostPrice !== '' && Number(quickNewPrice) > 0 && Number(quickNewCostPrice) > 0 && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Biên lãi ước tính:{' '}
                      <strong className="text-emerald-700">
                        +{(((Number(quickNewPrice) - Number(quickNewCostPrice)) / Number(quickNewPrice)) * 100).toFixed(1)}%
                      </strong>
                    </p>
                  )}
                </div>
              </div>

              {/* Price Update Date & Time */}
              <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-indigo-900 flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>Ngày & Giờ áp dụng cập nhật giá *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const tzOffset = now.getTimezoneOffset() * 60000;
                      setQuickPriceDate(new Date(now.getTime() - tzOffset).toISOString().slice(0, 16));
                    }}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                  >
                    Lấy giờ hiện tại
                  </button>
                </div>

                <input
                  type="datetime-local"
                  required
                  value={quickPriceDate}
                  onChange={(e) => setQuickPriceDate(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-indigo-950 bg-white"
                />
                <p className="text-[10px] text-indigo-800">
                  Ngày này sẽ được lưu vào hệ thống và hiển thị trực tiếp cho nhân viên bán hàng & kế toán kiểm soát.
                </p>
              </div>

              {/* Stock Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số lượng tồn kho mới (Chiếc) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={quickNewStock}
                    onChange={(e) => setQuickNewStock(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-black text-slate-900 bg-white"
                  />
                  {quickNewStock !== '' && Number(quickNewStock) !== quickTargetProduct.stock && (
                    <p className="text-[11px] font-bold text-slate-600 mt-1">
                      Chênh lệch tồn:{' '}
                      <strong className={Number(quickNewStock) > quickTargetProduct.stock ? 'text-emerald-700' : 'text-rose-700'}>
                        {Number(quickNewStock) > quickTargetProduct.stock ? `+${Number(quickNewStock) - quickTargetProduct.stock}` : `${Number(quickNewStock) - quickTargetProduct.stock}`} chiếc
                      </strong>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Người thực hiện cập nhật
                  </label>
                  <select
                    value={quickUpdatedBy}
                    onChange={(e) => setQuickUpdatedBy(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={`${s.employeeName} (${s.role})`}>
                        {s.employeeName} ({s.role})
                      </option>
                    ))}
                    <option value="Quản lý kho">Quản lý kho</option>
                  </select>
                </div>
              </div>

              {/* Price Note / Reason */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Lý do / Ghi chú điều chỉnh giá</label>
                  <span className="text-[10px] text-slate-400">Tùy chọn</span>
                </div>
                <div className="space-y-1.5">
                  <select
                    onChange={(e) => {
                      if (e.target.value) setQuickPriceNote(e.target.value);
                    }}
                    className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 bg-slate-50 focus:bg-white"
                  >
                    <option value="">-- Chọn nhanh lý do mẫu --</option>
                    <option value="Điều chỉnh theo bảng giá hãng mới công bố">Điều chỉnh theo bảng giá hãng mới công bố</option>
                    <option value="Chương trình kích cầu / Khuyến mãi giảm giá">Chương trình kích cầu / Khuyến mãi giảm giá</option>
                    <option value="Tăng giá do tỷ giá nhập khẩu thay đổi">Tăng giá do tỷ giá nhập khẩu thay đổi</option>
                    <option value="Thanh lý / Xả hàng tồn kho chuẩn bị model mới">Thanh lý / Xả hàng tồn kho chuẩn bị model mới</option>
                    <option value="Cập nhật định kỳ tháng">Cập nhật định kỳ tháng</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Hoặc tự nhập lý do (VD: Giảm 5% cho đại lý, Tăng theo giá thị trường...)"
                    value={quickPriceNote}
                    onChange={(e) => setQuickPriceNote(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setQuickModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center space-x-1.5 hover:scale-[1.01]"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu cập nhật giá & kho ngay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: PRICE HISTORY AUDIT TIMELINE MODAL */}
      {/* ======================================================== */}
      {historyModalOpen && historyTargetProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">Lịch sử Biến động & Kiểm soát Giá</h3>
                  <p className="text-[11px] text-slate-300">Theo dõi toàn bộ các lần thay đổi giá bán & giá vốn</p>
                </div>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Header Card */}
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-black text-slate-900 text-sm">{historyTargetProduct.name}</p>
                <div className="flex items-center space-x-2 mt-0.5 text-xs text-slate-500">
                  <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                    SKU: {historyTargetProduct.sku}
                  </span>
                  <span>Tồn kho: <strong className="text-slate-800">{historyTargetProduct.stock} chiếc</strong></span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Giá bán hiện tại</span>
                <span className="font-black text-indigo-700 text-base">{formatVND(historyTargetProduct.price)}</span>
              </div>
            </div>

            {/* Timeline Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {(!historyTargetProduct.priceHistory || historyTargetProduct.priceHistory.length === 0) ? (
                <div className="py-8 text-center text-slate-400 space-y-2">
                  <Info className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold">Chưa có bản ghi thay đổi giá trước đó.</p>
                  <p className="text-[11px] text-slate-400">
                    Giá ban đầu được tạo vào ngày{' '}
                    <strong>{formatDateTimeVI(historyTargetProduct.priceUpdatedAt || historyTargetProduct.createdAt)}</strong>:{' '}
                    {formatVND(historyTargetProduct.price)}
                  </p>
                </div>
              ) : (
                <div className="relative border-l-2 border-indigo-200 ml-4 space-y-6 py-2">
                  {historyTargetProduct.priceHistory.map((item, idx) => {
                    const priceDiff = item.newPrice - item.oldPrice;
                    const diffPct = item.oldPrice > 0 ? (((item.newPrice - item.oldPrice) / item.oldPrice) * 100).toFixed(1) : '0';

                    return (
                      <div key={item.id || idx} className="relative pl-6">
                        {/* Dot indicator */}
                        <div
                          className={`absolute -left-2 top-1 w-4 h-4 rounded-full border-2 border-white shadow-xs flex items-center justify-center ${
                            idx === 0 ? 'bg-indigo-600 ring-4 ring-indigo-100' : 'bg-slate-400'
                          }`}
                        />

                        {/* Content Card */}
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="text-xs font-extrabold text-slate-900 flex items-center space-x-1.5">
                              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{formatDateTimeVI(item.changedAt)}</span>
                            </span>

                            {idx === 0 && (
                              <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                                Đợt cập nhật gần nhất
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                            <div className="bg-slate-50 p-2 rounded-lg">
                              <span className="text-[10px] text-slate-500 block">Giá bán điều chỉnh:</span>
                              <div className="flex items-center space-x-2 mt-0.5 font-bold">
                                <span className="line-through text-slate-400 text-[11px]">{formatVND(item.oldPrice)}</span>
                                <ChevronRight className="w-3 h-3 text-slate-400" />
                                <span className="text-slate-900 font-extrabold">{formatVND(item.newPrice)}</span>
                              </div>
                              {priceDiff !== 0 && (
                                <span
                                  className={`text-[10px] font-extrabold block mt-0.5 ${
                                    priceDiff > 0 ? 'text-emerald-700' : 'text-rose-700'
                                  }`}
                                >
                                  {priceDiff > 0 ? `+${formatVND(priceDiff)} (+${diffPct}%)` : `${formatVND(priceDiff)} (${diffPct}%)`}
                                </span>
                              )}
                            </div>

                            {item.newCostPrice !== undefined && item.newCostPrice > 0 && (
                              <div className="bg-slate-50 p-2 rounded-lg">
                                <span className="text-[10px] text-slate-500 block">Giá vốn / Giá nhập:</span>
                                <div className="flex items-center space-x-2 mt-0.5 font-bold">
                                  {item.oldCostPrice ? (
                                    <>
                                      <span className="line-through text-slate-400 text-[11px]">{formatVND(item.oldCostPrice)}</span>
                                      <ChevronRight className="w-3 h-3 text-slate-400" />
                                    </>
                                  ) : null}
                                  <span className="text-slate-800">{formatVND(item.newCostPrice)}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Reason and Updater */}
                          <div className="text-[11px] text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1 border-t border-slate-100">
                            <span>
                              Lý do: <strong>{item.reason || 'Cập nhật giá bán sản phẩm'}</strong>
                            </span>
                            <span className="text-slate-400 text-[10px]">
                              Bởi: <strong className="text-slate-600">{item.changedBy || 'Hệ thống'}</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setHistoryModalOpen(false);
                  handleOpenQuickModal(historyTargetProduct);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-sm transition-all"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Điều chỉnh giá mới ngay</span>
              </button>

              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: FULL ADD / EDIT PRODUCT MODAL */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <h3 className="font-extrabold text-base">
                {editingProduct ? 'Chỉnh sửa Toàn bộ Sản phẩm Kho' : 'Thêm Sản phẩm Kho hàng Mới'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFullSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên sản phẩm *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Smart TV Samsung 4K 65 inch"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mã SKU sản phẩm *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: SS-TV65-4K"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono uppercase"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Danh mục sản phẩm *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickCategoryNameInput('');
                        setQuickCategoryDescInput('');
                        setShowQuickAddCategoryModal(true);
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center space-x-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Thêm Danh mục</span>
                    </button>
                  </div>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                  >
                    {managedCategories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                    {!managedCategories.some((c) => c.name === category) && category && (
                      <option value={category}>{category}</option>
                    )}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Hãng / Thương hiệu *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickBrandNameInput('');
                        setQuickBrandDescInput('');
                        setShowQuickAddBrandModal(true);
                      }}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center space-x-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Thêm Hãng</span>
                    </button>
                  </div>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium text-indigo-900"
                  >
                    {managedBrands.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                    {!managedBrands.some((b) => b.name === brand) && brand && (
                      <option value={brand}>{brand}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số lượng tồn kho (Chiếc) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Giá bán niêm yết (VNĐ) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-blue-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Giá vốn / Giá nhập (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-700"
                  />
                </div>
              </div>

              {/* Price Audit Section */}
              <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200 space-y-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-extrabold text-indigo-900">Kiểm soát Ngày áp dụng Giá</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Ngày & Giờ áp dụng giá</label>
                    <input
                      type="datetime-local"
                      value={priceUpdatedAt}
                      onChange={(e) => setPriceUpdatedAt(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-indigo-950"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Người cập nhật giá</label>
                    <input
                      type="text"
                      placeholder="Tên nhân viên..."
                      value={priceUpdatedBy}
                      onChange={(e) => setPriceUpdatedBy(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Ghi chú đợt đổi giá này</label>
                  <input
                    type="text"
                    placeholder="VD: Điều chỉnh theo giá hãng, Khuyến mãi mùa lễ..."
                    value={priceNote}
                    onChange={(e) => setPriceNote(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* Warranty & Activation Bonus Section */}
              <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-extrabold text-blue-900">Cấu hình Bảo hành & Thưởng Kích hoạt</span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isWarrantyEligible}
                      onChange={(e) => setIsWarrantyEligible(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ml-2 text-xs font-bold text-slate-700">Có bảo hành</span>
                  </label>
                </div>

                {isWarrantyEligible && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Thời hạn bảo hành (Tháng)</label>
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          min="0"
                          value={warrantyMonths}
                          onChange={(e) => setWarrantyMonths(Math.max(0, Number(e.target.value)))}
                          className="w-full text-xs px-2.5 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-blue-900 bg-white"
                          placeholder="Số tháng BH"
                        />
                        <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">Tháng</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold text-emerald-800 mb-1 flex items-center space-x-1">
                        <Award className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Mức thưởng kích hoạt (Bonus/SP)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="5000"
                        placeholder="VD: 50000"
                        value={activationBonusAmount}
                        onChange={(e) => setActivationBonusAmount(Number(e.target.value))}
                        className="w-full text-xs px-3 py-2 border-2 border-emerald-400 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white font-extrabold text-emerald-700 shadow-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả / Ghi chú sản phẩm</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú chi tiết bảo hành, quà tặng kèm nếu có..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all"
                >
                  {editingProduct ? 'Cập nhật sản phẩm' : 'Lưu sản phẩm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD CATEGORY SUB-MODAL */}
      {showQuickAddCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <FolderTree className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-extrabold text-slate-900">Thêm Danh Mục Mới Nhanh</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddCategoryModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickSaveCategory} className="space-y-3 mt-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên danh mục * (VD: Máy hút mùi, Nồi chiên...)
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Nhập tên danh mục..."
                  value={quickCategoryNameInput}
                  onChange={(e) => setQuickCategoryNameInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú (Không bắt buộc)</label>
                <input
                  type="text"
                  placeholder="Mô tả ngắn gọn..."
                  value={quickCategoryDescInput}
                  onChange={(e) => setQuickCategoryDescInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAddCategoryModal(false)}
                  className="px-3 py-1.5 font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                >
                  Lưu & Chọn ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD BRAND SUB-MODAL */}
      {showQuickAddBrandModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-extrabold text-slate-900">Thêm Hãng / Thương Hiệu Nhanh</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddBrandModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickSaveBrand} className="space-y-3 mt-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên Hãng / Thương hiệu * (VD: BOSCH, Tefal...)
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Nhập tên hãng..."
                  value={quickBrandNameInput}
                  onChange={(e) => setQuickBrandNameInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Xuất xứ / Ghi chú (Không bắt buộc)</label>
                <input
                  type="text"
                  placeholder="e.g. Đức, Nhật..."
                  value={quickBrandDescInput}
                  onChange={(e) => setQuickBrandDescInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAddBrandModal(false)}
                  className="px-3 py-1.5 font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Lưu & Chọn ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

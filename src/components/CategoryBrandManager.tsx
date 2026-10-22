import React, { useState } from 'react';
import {
  FolderTree,
  Tag,
  Plus,
  Edit,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';
import { CategoryItem, BrandItem, Product } from '../types';
import {
  saveCategory,
  deleteCategory,
  saveBrand,
  deleteBrand,
} from '../services/storageService';

interface CategoryBrandManagerProps {
  categories: CategoryItem[];
  brands: BrandItem[];
  products: Product[];
}

export const CategoryBrandManager: React.FC<CategoryBrandManagerProps> = ({
  categories,
  brands,
  products,
}) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'brands'>('categories');
  const [searchQuery, setSearchQuery] = useState('');

  // Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');

  // Brand Modal State
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandItem | null>(null);
  const [brandName, setBrandName] = useState('');
  const [brandDesc, setBrandDesc] = useState('');

  // --- Category Handlers ---
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDesc('');
    setShowCategoryModal(true);
  };

  const handleOpenEditCategory = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryDesc(cat.description || '');
    setShowCategoryModal(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      alert('Vui lòng nhập tên danh mục!');
      return;
    }
    saveCategory({
      id: editingCategory?.id,
      name: categoryName.trim(),
      description: categoryDesc.trim(),
    });
    setShowCategoryModal(false);
  };

  const handleDeleteCategory = (cat: CategoryItem) => {
    const associatedCount = products.filter((p) => p.category === cat.name).length;
    let message = `Bạn có chắc chắn muốn xóa danh mục "${cat.name}"?`;
    if (associatedCount > 0) {
      message = `Cảnh báo: Có ${associatedCount} sản phẩm thuộc danh mục "${cat.name}". Bạn vẫn muốn xóa chứ?`;
    }
    if (window.confirm(message)) {
      deleteCategory(cat.id);
    }
  };

  // --- Brand Handlers ---
  const handleOpenAddBrand = () => {
    setEditingBrand(null);
    setBrandName('');
    setBrandDesc('');
    setShowBrandModal(true);
  };

  const handleOpenEditBrand = (brand: BrandItem) => {
    setEditingBrand(brand);
    setBrandName(brand.name);
    setBrandDesc(brand.description || '');
    setShowBrandModal(true);
  };

  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      alert('Vui lòng nhập tên hãng / thương hiệu!');
      return;
    }
    saveBrand({
      id: editingBrand?.id,
      name: brandName.trim(),
      description: brandDesc.trim(),
    });
    setShowBrandModal(false);
  };

  const handleDeleteBrand = (brand: BrandItem) => {
    const associatedCount = products.filter(
      (p) => (p.brand || '').toLowerCase() === brand.name.toLowerCase()
    ).length;
    let message = `Bạn có chắc chắn muốn xóa hãng "${brand.name}"?`;
    if (associatedCount > 0) {
      message = `Cảnh báo: Có ${associatedCount} sản phẩm thuộc hãng "${brand.name}". Bạn vẫn muốn xóa chứ?`;
    }
    if (window.confirm(message)) {
      deleteBrand(brand.id);
    }
  };

  // Filtered lists
  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBrands = brands.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
          <FolderTree className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-blue-500/20 text-blue-200 border border-blue-400/30 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>Quản Lý Master Data Kho Hàng</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Danh Mục & Hãng Sản Phẩm
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 leading-relaxed">
            Quản lý danh sách các loại mặt hàng và các nhà sản xuất/thương hiệu trong kho. Dữ liệu sẽ tự động đồng bộ sang tất cả bộ lọc, form lên đơn và danh mục kho.
          </p>
        </div>
      </div>

      {/* Control Navigation & Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tab switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
              activeTab === 'categories'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Danh mục sản phẩm ({categories.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('brands')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
              activeTab === 'brands'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Hãng / Thương hiệu ({brands.length})</span>
          </button>
        </div>

        {/* Search & Add Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder={activeTab === 'categories' ? 'Tìm danh mục...' : 'Tìm hãng sản xuất...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          {activeTab === 'categories' ? (
            <button
              type="button"
              onClick={handleOpenAddCategory}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-xs flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Thêm danh mục mới</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenAddBrand}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-xs flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Thêm hãng mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      {activeTab === 'categories' ? (
        /* CATEGORIES LIST */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => {
            const associatedProducts = products.filter((p) => p.category === cat.name);
            return (
              <div
                key={cat.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                        <FolderTree className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">{cat.name}</h3>
                        <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-slate-500 mt-0.5">
                          <Package className="w-3 h-3 text-slate-400" />
                          <span>{associatedProducts.length} sản phẩm</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditCategory(cat)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Xóa danh mục"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mt-3 line-clamp-2">
                    {cat.description || 'Chưa có mô tả danh mục'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Trạng thái: Hoạt động</span>
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono font-bold">
                    ID: {cat.id}
                  </span>
                </div>
              </div>
            );
          })}

          {filteredCategories.length === 0 && (
            <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200">
              <FolderTree className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">Không tìm thấy danh mục phù hợp</p>
              <p className="text-xs text-slate-500 mt-1">Thử đổi từ khóa hoặc bấm bấm "Thêm danh mục mới"</p>
            </div>
          )}
        </div>
      ) : (
        /* BRANDS LIST */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBrands.map((brand) => {
            const associatedProducts = products.filter(
              (p) => (p.brand || '').toLowerCase() === brand.name.toLowerCase()
            );
            return (
              <div
                key={brand.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
                        <Tag className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">{brand.name}</h3>
                        <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-slate-500 mt-0.5">
                          <Package className="w-3 h-3 text-slate-400" />
                          <span>{associatedProducts.length} sản phẩm</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditBrand(brand)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBrand(brand)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Xóa hãng"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mt-3 line-clamp-2">
                    {brand.description || 'Chưa có thông tin giới thiệu thương hiệu'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Hãng chính hãng</span>
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono font-bold">
                    ID: {brand.id}
                  </span>
                </div>
              </div>
            );
          })}

          {filteredBrands.length === 0 && (
            <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200">
              <Tag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">Không tìm thấy hãng / thương hiệu phù hợp</p>
              <p className="text-xs text-slate-500 mt-1">Thử đổi từ khóa hoặc bấm "Thêm hãng mới"</p>
            </div>
          )}
        </div>
      )}

      {/* CATEGORY MODAL */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <FolderTree className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingCategory ? 'Chỉnh Sửa Danh Mục' : 'Thêm Danh Mục Mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên danh mục sản phẩm *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Tủ lạnh, Máy lạnh, Tivi..."
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mô tả danh mục
                </label>
                <textarea
                  rows={3}
                  placeholder="Nhập ghi chú hoặc phạm vi các sản phẩm thuộc loại này..."
                  value={categoryDesc}
                  onChange={(e) => setCategoryDesc(e.target.value)}
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
                >
                  {editingCategory ? 'Cập nhật' : 'Thêm danh mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BRAND MODAL */}
      {showBrandModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingBrand ? 'Chỉnh Sửa Hãng / Thương Hiệu' : 'Thêm Hãng / Thương Hiệu Mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBrandModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên Hãng / Nhà Sản Xuất *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Samsung, LG, Panasonic, Apple..."
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mô tả / Xuất xứ / Ghi chú
                </label>
                <textarea
                  rows={3}
                  placeholder="Nhập xuất xứ hoặc ghi chú về thương hiệu..."
                  value={brandDesc}
                  onChange={(e) => setBrandDesc(e.target.value)}
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBrandModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
                >
                  {editingBrand ? 'Cập nhật' : 'Thêm hãng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

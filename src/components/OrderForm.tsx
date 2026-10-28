import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart,
  User,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Plus,
  Minus,
  Trash2,
  ShieldCheck,
  Award,
  CheckCircle2,
  AlertCircle,
  Printer,
  ChevronDown,
  UserCheck,
  PackagePlus,
  X,
  Edit,
  Filter,
  Search,
  RotateCcw,
  Tag,
  Zap,
  Check,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  ArrowRight,
  CornerDownLeft,
} from 'lucide-react';
import { Product, OrderItem, OrderStatus, Order } from '../types';
import {
  saveOrder,
  getActiveStaff,
  getStaff,
  formatVND,
  formatDateVI,
  formatDateTimeVI,
  saveProduct,
  getProducts,
  getNextOrderCodeForEmployee,
  getCategories,
  getBrands,
  removeVietnameseTones,
} from '../services/storageService';
import { VietnamAddressMapPicker } from './VietnamAddressMapPicker';

interface OrderFormProps {
  products: Product[];
  onOrderCreated: (newOrder: any) => void;
  onNavigateToOrders: () => void;
  editingOrder?: Order | null;
  onCancelEdit?: () => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({
  products,
  onOrderCreated,
  onNavigateToOrders,
  editingOrder,
  onCancelEdit,
}) => {
  const activeStaff = getActiveStaff();
  const staffList = getStaff();

  // Local products state to react to quick added products
  const [localProducts, setLocalProducts] = useState<Product[]>(products && products.length ? products : getProducts());

  useEffect(() => {
    if (products && products.length > 0) {
      setLocalProducts(products);
    } else {
      setLocalProducts(getProducts());
    }
  }, [products]);

  // Employee Creator Info
  const [employeeId, setEmployeeId] = useState(editingOrder ? editingOrder.employeeId : activeStaff.employeeId);
  const [employeeName, setEmployeeName] = useState(editingOrder ? editingOrder.employeeName : activeStaff.employeeName);

  // Customer Info
  const [customerName, setCustomerName] = useState(editingOrder ? editingOrder.customerName : '');
  const [customerPhone, setCustomerPhone] = useState(editingOrder ? editingOrder.customerPhone : '');
  const [deliveryAddress, setDeliveryAddress] = useState(editingOrder ? editingOrder.deliveryAddress : '');
  const [deliveryLat, setDeliveryLat] = useState<number | undefined>(editingOrder?.deliveryLat);
  const [deliveryLng, setDeliveryLng] = useState<number | undefined>(editingOrder?.deliveryLng);

  // Delivery Scheduler & Staff Assignment
  const deliveryStaffList = staffList.filter((s) => s.role === 'Delivery');
  const defaultDeliveryStaff = deliveryStaffList[0] || staffList[0];

  const todayStr = new Date().toISOString().split('T')[0];
  const [deliveryDate, setDeliveryDate] = useState(editingOrder ? editingOrder.deliveryDate : todayStr);
  const [deliveryTime, setDeliveryTime] = useState(editingOrder ? editingOrder.deliveryTime : '09:00 - 11:30');
  const [deliveryStaffId, setDeliveryStaffId] = useState(
    editingOrder ? editingOrder.deliveryStaffId || defaultDeliveryStaff?.employeeId || 'NV004' : defaultDeliveryStaff?.employeeId || 'NV004'
  );
  const [deliveryStaffName, setDeliveryStaffName] = useState(
    editingOrder ? editingOrder.deliveryStaffName || defaultDeliveryStaff?.employeeName || 'Phạm Quốc Việt' : defaultDeliveryStaff?.employeeName || 'Phạm Quốc Việt'
  );
  const [deliveryStaffPhone, setDeliveryStaffPhone] = useState(
    editingOrder ? editingOrder.deliveryStaffPhone || defaultDeliveryStaff?.phone || '0977118899' : defaultDeliveryStaff?.phone || '0977118899'
  );
  const [status, setStatus] = useState<OrderStatus>(editingOrder ? editingOrder.status : 'pending_pickup');
  const [notes, setNotes] = useState(editingOrder ? editingOrder.notes || '' : '');

  // Selected Order Items
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>(editingOrder ? editingOrder.items : []);

  // Shipping Fee & Down Payment / Prepaid Amount
  const [shippingFee, setShippingFee] = useState<number>(editingOrder?.shippingFee || 0);
  const [prepaidAmount, setPrepaidAmount] = useState<number>(editingOrder?.prepaidAmount || 0);

  // Item Picker State & Custom Unit Price & Bonus
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [pickerQuantity, setPickerQuantity] = useState<number>(1);
  const [pickerUnitPrice, setPickerUnitPrice] = useState<number>(0);
  const [pickerBonusAmount, setPickerBonusAmount] = useState<number>(0);
  const [pickerWarrantyActivated, setPickerWarrantyActivated] = useState<boolean>(true);
  const [pickerWarrantyMonths, setPickerWarrantyMonths] = useState<number>(12);

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('all');
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [showClassicSelect, setShowClassicSelect] = useState<boolean>(false);
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close suggestion dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const POPULAR_SEARCH_KEYWORDS = [
    'Máy lạnh Daikin',
    'Tủ lạnh Inverter',
    'Máy giặt Panasonic',
    'Smart Tivi Samsung',
    'Quạt đứng Senko',
    'Nồi chiên Sunhouse',
    'Bếp điện từ',
    'LG Inverter',
    'Casper',
  ];

  // Helper to highlight matching keyword tokens in product names
  const highlightKeywordMatch = (text: string, query: string) => {
    if (!query || !query.trim()) return <span>{text}</span>;
    const rawTokens = query.trim().split(/\s+/).filter(Boolean);
    if (rawTokens.length === 0) return <span>{text}</span>;

    try {
      const escapedTokens = rawTokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const regex = new RegExp(`(${escapedTokens.join('|')})`, 'gi');
      const parts = text.split(regex);
      return (
        <span>
          {parts.map((part, i) =>
            rawTokens.some((t) => removeVietnameseTones(t) === removeVietnameseTones(part)) ? (
              <mark key={i} className="bg-amber-200 text-slate-950 font-black px-0.5 rounded">
                {part}
              </mark>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </span>
      );
    } catch {
      return <span>{text}</span>;
    }
  };

  // Brand Extractor Helper
  const getProductBrand = (product: Product): string => {
    if ((product as any).brand && typeof (product as any).brand === 'string' && (product as any).brand.trim()) {
      return (product as any).brand.trim();
    }
    const name = (product.name || '').toLowerCase();
    const storedBrands = getBrands();
    for (const b of storedBrands) {
      if (name.includes(b.name.toLowerCase())) {
        return b.name;
      }
    }
    if (name.includes('samsung')) return 'Samsung';
    if (name.includes('lg')) return 'LG';
    if (name.includes('apple') || name.includes('iphone') || name.includes('ipad') || name.includes('macbook')) return 'Apple';
    if (name.includes('dell')) return 'Dell';
    if (name.includes('panasonic')) return 'Panasonic';
    if (name.includes('daikin')) return 'Daikin';
    if (name.includes('sony')) return 'Sony';
    if (name.includes('toshiba')) return 'Toshiba';
    if (name.includes('marshall')) return 'Marshall';
    if (name.includes('casper')) return 'Casper';
    if (name.includes('aqua')) return 'Aqua';
    if (name.includes('sanaky')) return 'Sanaky';
    if (name.includes('sharp')) return 'Sharp';
    if (name.includes('xiaomi')) return 'Xiaomi';
    if (name.includes('asus')) return 'Asus';
    if (name.includes('hp')) return 'HP';
    if (name.includes('lenovo')) return 'Lenovo';
    return 'Khác';
  };

  // Derive categories and brands dynamically from master list AND products
  const masterCategories = getCategories().map((c) => c.name.trim()).filter(Boolean);
  const masterBrands = getBrands().map((b) => b.name.trim()).filter(Boolean);

  const availableCategories = Array.from(
    new Set([...masterCategories, ...localProducts.map((p) => p.category?.trim()).filter(Boolean)])
  );

  const availableBrands = Array.from(
    new Set([...masterBrands, ...localProducts.map((p) => getProductBrand(p)).filter(Boolean)])
  );

  // Accent-tolerant multi-keyword matching for Vietnamese
  const matchProductKeywords = (product: Product, query: string, brand: string): boolean => {
    if (!query || !query.trim()) return true;
    const normalizedQuery = removeVietnameseTones(query.trim());
    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

    const targetText = removeVietnameseTones(
      `${product.name} ${product.sku} ${product.category} ${brand} ${product.description || ''}`
    );

    return queryTokens.every((token) => targetText.includes(token));
  };

  // Filtered Products List
  const filteredProducts = localProducts
    .filter((p) => {
      if (selectedCategoryFilter !== 'all' && p.category !== selectedCategoryFilter) {
        return false;
      }
      const brand = getProductBrand(p);
      if (selectedBrandFilter !== 'all' && brand !== selectedBrandFilter) {
        return false;
      }
      if (productSearchQuery.trim()) {
        return matchProductKeywords(p, productSearchQuery, brand);
      }
      return true;
    })
    .sort((a, b) => {
      // Prioritize items with stock > 0
      if ((a.stock || 0) > 0 && (b.stock || 0) <= 0) return -1;
      if ((a.stock || 0) <= 0 && (b.stock || 0) > 0) return 1;
      return (b.stock || 0) - (a.stock || 0);
    });

  // Toast / feedback message when quick adding products
  const [quickAddFeedback, setQuickAddFeedback] = useState<string | null>(null);

  // Quick Add 1 Unit directly to order items (instant 1-tap mobile experience)
  const handleQuickAddOne = (prod: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (prod.stock <= 0) {
      alert(`Sản phẩm "${prod.name}" đã hết hàng trong kho!`);
      return;
    }

    const existingIndex = selectedItems.findIndex((item) => item.productId === prod.id);
    const existingQty = existingIndex !== -1 ? selectedItems[existingIndex].quantity : 0;
    const requestedQty = existingQty + 1;

    if (requestedQty > prod.stock) {
      alert(`Số lượng tồn kho của "${prod.name}" chỉ còn ${prod.stock} chiếc!`);
      return;
    }

    if (existingIndex !== -1) {
      const updated = [...selectedItems];
      updated[existingIndex].quantity = requestedQty;
      setSelectedItems(updated);
    } else {
      const newItem: OrderItem = {
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        price: prod.price,
        quantity: 1,
        isWarrantyActivated: prod.isWarrantyEligible,
        warrantyMonths: prod.isWarrantyEligible ? (prod.warrantyMonths || 12) : 0,
        activationBonusAmount: prod.isWarrantyEligible ? (prod.activationBonusAmount || 0) : 0,
      };
      setSelectedItems([...selectedItems, newItem]);
    }

    setQuickAddFeedback(`+1 "${prod.name}" đã thêm vào đơn!`);
    setTimeout(() => {
      setQuickAddFeedback(null);
    }, 2500);
  };

  // Select product for customization tray
  const handleSelectProductToCustomize = (prod: Product) => {
    setSelectedProductId(prod.id);
    setPickerUnitPrice(prod.price);
    setPickerQuantity(1);
    setPickerWarrantyActivated(prod.isWarrantyEligible);
    setPickerWarrantyMonths(prod.warrantyMonths || 12);
    setPickerBonusAmount(prod.activationBonusAmount || 0);
  };

  // Pre-fill default price, warranty months, and bonus into editable picker fields when selectedProductId changes
  useEffect(() => {
    if (selectedProductId) {
      const prod = localProducts.find((p) => p.id === selectedProductId);
      if (prod) {
        setPickerUnitPrice(prod.price);
        setPickerBonusAmount(prod.activationBonusAmount || 0);
        setPickerWarrantyMonths(prod.warrantyMonths || 12);
        setPickerWarrantyActivated(prod.isWarrantyEligible);
      }
    } else {
      setPickerUnitPrice(0);
      setPickerBonusAmount(0);
      setPickerWarrantyMonths(12);
    }
  }, [selectedProductId, localProducts]);

  // Quick Add New Product Modal State
  const [showQuickAddModal, setShowQuickAddModal] = useState<boolean>(false);
  const [quickName, setQuickName] = useState('');
  const [quickSku, setQuickSku] = useState('');
  const [quickPrice, setQuickPrice] = useState<string>('5000000');
  const [quickStock, setQuickStock] = useState<string>('10');
  const [quickCategory, setQuickCategory] = useState('Khác');
  const [quickBrand, setQuickBrand] = useState('Khác');
  const [quickWarrantyMonths, setQuickWarrantyMonths] = useState<number>(12);
  const [quickBonusAmount, setQuickBonusAmount] = useState<string>('50000');
  const [quickBuyQuantity, setQuickBuyQuantity] = useState<number>(1);

  // Success Notification state
  const [createdOrderResult, setCreatedOrderResult] = useState<any | null>(null);

  // Sync state when editingOrder prop updates
  useEffect(() => {
    if (editingOrder) {
      setEmployeeId(editingOrder.employeeId);
      setEmployeeName(editingOrder.employeeName);
      setCustomerName(editingOrder.customerName);
      setCustomerPhone(editingOrder.customerPhone);
      setDeliveryAddress(editingOrder.deliveryAddress);
      setDeliveryDate(editingOrder.deliveryDate);
      setDeliveryTime(editingOrder.deliveryTime);
      setDeliveryStaffId(editingOrder.deliveryStaffId || 'NV004');
      setDeliveryStaffName(editingOrder.deliveryStaffName || 'Phạm Quốc Việt');
      setDeliveryStaffPhone(editingOrder.deliveryStaffPhone || '0977118899');
      setStatus(editingOrder.status);
      setNotes(editingOrder.notes || '');
      setSelectedItems(editingOrder.items || []);
      setShippingFee(editingOrder.shippingFee || 0);
      setPrepaidAmount(editingOrder.prepaidAmount || 0);
    }
  }, [editingOrder]);

  // Live Predicted Order Code
  const predictedOrderCode = getNextOrderCodeForEmployee(employeeId);

  // Handle Employee Change
  const handleEmployeeSelectChange = (empId: string) => {
    const found = staffList.find((s) => s.employeeId === empId);
    if (found) {
      setEmployeeId(found.employeeId);
      setEmployeeName(found.employeeName);
    } else {
      setEmployeeId(empId);
    }
  };

  // Handle Delivery Staff Change
  const handleDeliveryStaffSelectChange = (empId: string) => {
    const found = staffList.find((s) => s.employeeId === empId);
    if (found) {
      setDeliveryStaffId(found.employeeId);
      setDeliveryStaffName(found.employeeName);
      setDeliveryStaffPhone(found.phone);
    }
  };

  // Add Item to Order
  const handleAddItem = () => {
    if (!selectedProductId) return;

    const prod = localProducts.find((p) => p.id === selectedProductId);
    if (!prod) return;

    if (prod.stock <= 0) {
      alert(`Sản phẩm "${prod.name}" đã hết hàng trong kho!`);
      return;
    }

    const finalUnitPrice = pickerUnitPrice >= 0 ? pickerUnitPrice : prod.price;

    // Check existing in cart
    const existingIndex = selectedItems.findIndex((item) => item.productId === prod.id);
    const existingQty = existingIndex !== -1 ? selectedItems[existingIndex].quantity : 0;
    const requestedQty = existingQty + pickerQuantity;

    if (requestedQty > prod.stock) {
      alert(`Số lượng tồn kho của "${prod.name}" chỉ còn ${prod.stock} chiếc!`);
      return;
    }

    if (existingIndex !== -1) {
      // Update existing item quantity & selling price & warranty & bonus
      const updated = [...selectedItems];
      updated[existingIndex].quantity = requestedQty;
      updated[existingIndex].price = finalUnitPrice;
      updated[existingIndex].isWarrantyActivated = pickerWarrantyActivated;
      updated[existingIndex].warrantyMonths = pickerWarrantyActivated ? pickerWarrantyMonths : 0;
      updated[existingIndex].activationBonusAmount = pickerWarrantyActivated ? pickerBonusAmount : 0;
      setSelectedItems(updated);
    } else {
      // Add new order item with custom unit price, warranty duration and custom bonus
      const newItem: OrderItem = {
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        price: finalUnitPrice,
        quantity: pickerQuantity,
        isWarrantyActivated: pickerWarrantyActivated,
        warrantyMonths: pickerWarrantyActivated ? pickerWarrantyMonths : 0,
        activationBonusAmount: pickerWarrantyActivated ? pickerBonusAmount : 0,
      };
      setSelectedItems([...selectedItems, newItem]);
    }

    // Reset picker
    setSelectedProductId('');
    setPickerQuantity(1);
    setPickerUnitPrice(0);
    setPickerBonusAmount(0);
    setPickerWarrantyMonths(12);
  };

  // Quick Add Unlisted Product directly to Inventory & Order
  const handleQuickAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim() || !quickPrice || Number(quickPrice) <= 0) {
      alert('Vui lòng nhập tên sản phẩm và đơn giá bán hợp lệ!');
      return;
    }

    const priceNum = Number(quickPrice);
    const stockNum = Math.max(1, Number(quickStock) || 10);
    const buyQty = Math.min(Math.max(1, quickBuyQuantity), stockNum);
    const warrantyM = Number(quickWarrantyMonths) || 0;
    const bonusNum = Number(quickBonusAmount) || 0;
    const generatedSku = quickSku.trim() ? quickSku.trim().toUpperCase() : `SP-${Date.now().toString().slice(-6)}`;

    // 1. Auto-save product into Inventory Database
    const savedProd = saveProduct({
      name: quickName.trim(),
      sku: generatedSku,
      price: priceNum,
      stock: stockNum,
      category: quickCategory.trim() || 'Khác',
      brand: quickBrand.trim() || 'Khác',
      isWarrantyEligible: warrantyM > 0,
      warrantyMonths: warrantyM,
      activationBonusAmount: bonusNum,
    });

    // 2. Update local state list
    const updatedProductsList = getProducts();
    setLocalProducts(updatedProductsList);

    // 3. Add to current order items automatically
    const newItem: OrderItem = {
      productId: savedProd.id,
      productName: savedProd.name,
      sku: savedProd.sku,
      price: savedProd.price,
      quantity: buyQty,
      isWarrantyActivated: savedProd.isWarrantyEligible,
      warrantyMonths: savedProd.warrantyMonths || 0,
      activationBonusAmount: savedProd.isWarrantyEligible ? savedProd.activationBonusAmount || 0 : 0,
    };

    setSelectedItems((prev) => [...prev, newItem]);

    // Reset & close quick add form
    setShowQuickAddModal(false);
    setQuickName('');
    setQuickSku('');
    setQuickPrice('5000000');
    setQuickStock('10');
    setQuickBuyQuantity(1);
  };

  const handleRemoveItem = (index: number) => {
    const updated = selectedItems.filter((_, i) => i !== index);
    setSelectedItems(updated);
  };

  const handleToggleItemWarranty = (index: number) => {
    const updated = [...selectedItems];
    const item = updated[index];
    const nextActivated = !item.isWarrantyActivated;
    item.isWarrantyActivated = nextActivated;

    // Pre-fill default bonus from product if activating and amount is not set
    if (nextActivated && (!item.activationBonusAmount || item.activationBonusAmount === 0)) {
      const prod = localProducts.find((p) => p.id === item.productId);
      if (prod && prod.isWarrantyEligible) {
        item.activationBonusAmount = prod.activationBonusAmount || 0;
      }
    }

    setSelectedItems(updated);
  };

  const handleUpdateItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    const item = selectedItems[index];
    const prod = localProducts.find((p) => p.id === item.productId);

    if (prod && newQty > prod.stock) {
      alert(`Tồn kho tối đa cho "${prod.name}" là ${prod.stock} chiếc!`);
      return;
    }

    const updated = [...selectedItems];
    updated[index].quantity = newQty;
    setSelectedItems(updated);
  };

  // Custom price override per order item
  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    if (newPrice < 0) return;
    const updated = [...selectedItems];
    updated[index].price = newPrice;
    setSelectedItems(updated);
  };

  // Custom warranty activation bonus per order item
  const handleUpdateItemBonus = (index: number, newBonus: number) => {
    if (newBonus < 0) return;
    const updated = [...selectedItems];
    updated[index].activationBonusAmount = newBonus;
    setSelectedItems(updated);
  };

  // Custom warranty duration override per order line item
  const handleUpdateItemWarrantyMonths = (index: number, newMonths: number) => {
    if (newMonths < 0) return;
    const updated = [...selectedItems];
    updated[index].warrantyMonths = newMonths;
    if (newMonths > 0) {
      updated[index].isWarrantyActivated = true;
    } else {
      updated[index].isWarrantyActivated = false;
    }
    setSelectedItems(updated);
  };

  // Calculations
  const subtotal = selectedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalAmount = subtotal + (shippingFee || 0);
  const remainingAmount = Math.max(0, totalAmount - (prepaidAmount || 0));
  const totalBonusEarned = selectedItems.reduce((acc, item) => {
    if (item.isWarrantyActivated) {
      return acc + (item.activationBonusAmount || 0) * item.quantity;
    }
    return acc;
  }, 0);

  // Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
      alert('Vui lòng điền đầy đủ Thông tin Khách hàng (Tên, SĐT, Địa chỉ)!');
      return;
    }

    if (selectedItems.length === 0) {
      alert('Đơn hàng phải có ít nhất 1 sản phẩm!');
      return;
    }

    // Save/Update Order & automatically recalculate stock & bonus
    const savedOrder = saveOrder({
      id: editingOrder ? editingOrder.id : undefined,
      orderCode: editingOrder ? editingOrder.orderCode : undefined,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      deliveryLat,
      deliveryLng,
      employeeId: employeeId.trim().toUpperCase(),
      employeeName: employeeName.trim(),
      items: selectedItems,
      subtotal,
      shippingFee,
      prepaidAmount,
      totalAmount,
      remainingAmount,
      deliveryDate,
      deliveryTime,
      deliveryStaffId,
      deliveryStaffName,
      deliveryStaffPhone,
      deliveryNotes: editingOrder
        ? `Cập nhật chỉnh sửa đơn hàng`
        : `Lên đơn & phân công cho Shipper ${deliveryStaffName}`,
      status,
      notes: notes.trim(),
    });

    setCreatedOrderResult(savedOrder);
    onOrderCreated(savedOrder);
  };

  const handleResetForm = () => {
    setCreatedOrderResult(null);
    setCustomerName('');
    setCustomerPhone('');
    setDeliveryAddress('');
    setDeliveryLat(undefined);
    setDeliveryLng(undefined);
    setSelectedItems([]);
    setNotes('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-28 sm:pb-12 animate-in fade-in duration-200">
      {/* Title Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-0">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            {editingOrder ? (
              <Edit className="w-6 h-6 text-amber-600" />
            ) : (
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            )}
            <span>
              {editingOrder
                ? `Chỉnh Sửa Đơn Hàng: ${editingOrder.orderCode}`
                : 'Lên Đơn Hàng Mới (Create Sales Order)'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {editingOrder
              ? 'Chỉnh sửa sản phẩm, số lượng, giá bán, phí vận chuyển, tiền đặt cọc và thông tin giao hàng.'
              : 'Lập đơn hàng, lên lịch giao hàng, tự động trừ tồn kho và ghi nhận thưởng kích hoạt bảo hành cho nhân viên.'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {editingOrder && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="text-xs font-bold text-slate-700 hover:bg-slate-200 bg-slate-100 px-3.5 py-2 rounded-xl transition-colors"
            >
              Hủy sửa
            </button>
          )}
          <button
            type="button"
            onClick={onNavigateToOrders}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 px-3.5 py-2 rounded-xl transition-colors"
          >
            Xem lịch sử đơn
          </button>
        </div>
      </div>

      {/* Success Modal / Banner after creation */}
      {createdOrderResult ? (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 shadow-lg animate-in zoom-in-95 duration-200 relative z-0">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                TẠO ĐƠN HÀNG THÀNH CÔNG!
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-1">Mã đơn: {createdOrderResult.orderCode}</h3>
              <p className="text-xs text-slate-600 mt-1">
                Tồn kho đã được tự động khấu trừ. Nhân viên <strong className="text-slate-900">{createdOrderResult.employeeName} ({createdOrderResult.employeeId})</strong> được cộng{' '}
                <strong className="text-emerald-700">{formatVND(createdOrderResult.totalBonusEarned)}</strong> tiền thưởng kích hoạt bảo hành.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onOrderCreated(createdOrderResult)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 shadow-md transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Xem & In Phiếu Giao Hàng</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetForm}
                  className="bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors"
                >
                  Tạo đơn hàng khác
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column (2 Cols): Staff, Customer Info, Items Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Sales Employee Creator Info */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 relative z-0">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  <h3 className="font-extrabold text-slate-900 text-sm">1. Thông tin Nhân viên Lập đơn (Employee Info)</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-blue-800 font-extrabold bg-blue-100 px-3 py-1 rounded-xl border border-blue-300 font-mono">
                    Mã đơn sẽ tạo: {predictedOrderCode}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mã Nhân Viên (Employee ID) *</label>
                  <select
                    value={employeeId}
                    onChange={(e) => handleEmployeeSelectChange(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-bold text-slate-900"
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.employeeId}>
                        {s.employeeId} - {s.employeeName} ({s.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên Nhân Viên *</label>
                  <input
                    type="text"
                    required
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-800 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 2. Customer Info Section */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 relative z-0">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <User className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">2. Thông tin Khách hàng nhận hàng</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên khách hàng *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Nguyễn Thị Mai"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại liên hệ *</label>
                  <input
                    type="tel"
                    required
                    placeholder="VD: 0988123456"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <VietnamAddressMapPicker
                    address={deliveryAddress}
                    onAddressChange={(newAddr) => setDeliveryAddress(newAddr)}
                    lat={deliveryLat}
                    lng={deliveryLng}
                    onCoordinatesChange={(newLat, newLng) => {
                      setDeliveryLat(newLat);
                      setDeliveryLng(newLng);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 3. Product Selection & Cart */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 relative z-0">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                  <h3 className="font-extrabold text-slate-900 text-sm">3. Chọn Sản phẩm vào Đơn ({selectedItems.length})</h3>
                </div>

                {/* Quick Add Product Button */}
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-2xs flex items-center space-x-1.5 transition-all"
                >
                  <PackagePlus className="w-4 h-4" />
                  <span>+ Thêm Nhanh SP Mới Vừa Nhập</span>
                </button>
              </div>

              {/* Quick Add Feedback Toast */}
              {quickAddFeedback && (
                <div className="bg-emerald-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
                  <Check className="w-4 h-4 shrink-0 text-emerald-200" />
                  <span className="flex-1">{quickAddFeedback}</span>
                </div>
              )}

              {/* Mobile-First Keyword Search Bar with Instant Suggestion Dropdown Board */}
              <div className="space-y-2.5">
                <div ref={searchContainerRef} className="relative z-30">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-600">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="Tìm theo từ khóa tên SP, model, SKU (VD: tủ lạnh, 400l, samsung, ip15...)"
                      value={productSearchQuery}
                      onFocus={() => setIsSearchFocused(true)}
                      onChange={(e) => {
                        setProductSearchQuery(e.target.value);
                        setIsSearchFocused(true);
                      }}
                      className="w-full text-xs sm:text-sm pl-10 pr-32 py-3 bg-white border-2 border-blue-400 hover:border-blue-500 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-xl font-medium text-slate-900 placeholder:text-slate-400 transition-all shadow-xs"
                    />
                    <div className="absolute inset-y-0 right-0 pr-2 flex items-center space-x-1.5">
                      {productSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setProductSearchQuery('');
                            setIsSearchFocused(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                          title="Xóa tìm kiếm"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsSearchFocused(!isSearchFocused)}
                        className={`text-[10px] sm:text-[11px] font-extrabold px-2 py-1 rounded-lg transition-colors flex items-center gap-1 border ${
                          isSearchFocused
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                        }`}
                        title="Bật / tắt bản gợi ý sản phẩm"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>Gợi ý ({filteredProducts.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* BẢN GỢI Ý SẢN PHẨM CÓ LIÊN QUAN (SUGGESTION BOARD DROPDOWN) */}
                  {isSearchFocused && (
                    <div
                      onMouseDown={(e) => e.stopPropagation()}
                      className="absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border-2 border-blue-500 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ring-4 ring-blue-500/10"
                    >
                      {/* Top Header of the Suggestion Board */}
                      <div className="bg-slate-900 text-white px-3.5 py-2.5 flex items-center justify-between">
                        <div className="flex items-center space-x-2 min-w-0">
                          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-extrabold text-xs block text-white truncate">
                              Bản Gợi Ý Sản Phẩm Có Liên Quan
                            </span>
                            <span className="text-[10px] text-slate-300 block truncate">
                              {productSearchQuery.trim()
                                ? `Khớp với từ khóa "${productSearchQuery}" • ${filteredProducts.length} sản phẩm`
                                : `Gợi ý sản phẩm kho phổ biến • ${filteredProducts.length} sản phẩm`}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsSearchFocused(false)}
                          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors shrink-0 text-xs font-bold flex items-center gap-1"
                          title="Đóng bản gợi ý"
                        >
                          <X className="w-4 h-4" />
                          <span className="hidden sm:inline">Đóng</span>
                        </button>
                      </div>

                      {/* Quick Popular Keywords Chips */}
                      <div className="bg-slate-100/90 px-3 py-2 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                        <span className="text-[10px] font-black text-slate-500 flex items-center gap-1 shrink-0 uppercase tracking-wider">
                          <TrendingUp className="w-3 h-3 text-blue-600" />
                          Tìm nhanh:
                        </span>
                        {POPULAR_SEARCH_KEYWORDS.map((kw) => (
                          <button
                            key={kw}
                            type="button"
                            onClick={() => {
                              setProductSearchQuery(kw);
                              setIsSearchFocused(true);
                            }}
                            className={`px-2 py-0.5 rounded-md font-bold shrink-0 transition-colors text-[10px] border ${
                              productSearchQuery === kw
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-200'
                            }`}
                          >
                            {kw}
                          </button>
                        ))}
                      </div>

                      {/* Suggestions List Body */}
                      {filteredProducts.length === 0 ? (
                        <div className="p-6 text-center space-y-2">
                          <AlertCircle className="w-7 h-7 text-amber-500 mx-auto" />
                          <p className="text-xs font-bold text-slate-800">
                            Chưa tìm thấy sản phẩm gợi ý nào cho từ khóa "{productSearchQuery}"
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Bạn có thể bấm thêm nhanh sản phẩm mới bên dưới để lưu vào kho và chọn vào đơn!
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setShowQuickAddModal(true);
                              setIsSearchFocused(false);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors shadow-2xs mt-1"
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                            <span>+ Thêm Nhanh SP Mới Vừa Nhập</span>
                          </button>
                        </div>
                      ) : (
                        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 p-1">
                          {filteredProducts.slice(0, 8).map((p) => {
                            const inCartItem = selectedItems.find((i) => i.productId === p.id);
                            const brand = getProductBrand(p);
                            const isOutOfStock = p.stock <= 0;
                            const isLowStock = p.stock > 0 && p.stock <= 3;

                            return (
                              <div
                                key={p.id}
                                className={`p-2.5 sm:p-3 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-blue-50/70 ${
                                  isOutOfStock ? 'opacity-65 bg-slate-50' : 'bg-white'
                                }`}
                              >
                                {/* Left Item Info */}
                                <div className="min-w-0 flex-1 space-y-1">
                                  {/* Badges */}
                                  <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                                    <span className="bg-slate-100 text-slate-800 font-bold px-1.5 py-0.5 rounded">
                                      {brand}
                                    </span>
                                    <span className="bg-blue-50 text-blue-700 font-medium px-1.5 py-0.5 rounded">
                                      {p.category}
                                    </span>
                                    <span className="text-slate-400 font-mono">SKU: {p.sku}</span>

                                    {/* Stock badge */}
                                    {isOutOfStock ? (
                                      <span className="bg-rose-100 text-rose-800 font-black px-1.5 py-0.5 rounded text-[9px]">
                                        Hết hàng
                                      </span>
                                    ) : isLowStock ? (
                                      <span className="bg-amber-100 text-amber-900 font-black px-1.5 py-0.5 rounded text-[9px]">
                                        Sắp hết: {p.stock}
                                      </span>
                                    ) : (
                                      <span className="bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded text-[9px]">
                                        Còn {p.stock}
                                      </span>
                                    )}

                                    {inCartItem && (
                                      <span className="bg-emerald-600 text-white font-black px-1.5 py-0.5 rounded text-[9px] flex items-center gap-0.5">
                                        <Check className="w-2.5 h-2.5" />
                                        <span>Đã chọn: {inCartItem.quantity}</span>
                                      </span>
                                    )}
                                  </div>

                                  {/* Product Title with Keyword Highlight */}
                                  <div className="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug">
                                    {highlightKeywordMatch(p.name, productSearchQuery)}
                                  </div>

                                  {/* Price & Recency */}
                                  <div className="flex items-baseline space-x-2 text-xs">
                                    <span className="font-black text-blue-700 text-sm">
                                      {formatVND(p.price)}
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      (Cập nhật giá: {formatDateVI(p.priceUpdatedAt || p.createdAt)})
                                    </span>
                                  </div>
                                </div>

                                {/* Right 1-Tap Action Buttons */}
                                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                  <button
                                    type="button"
                                    disabled={isOutOfStock}
                                    onClick={() => handleQuickAddOne(p)}
                                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-xs py-2 px-3 rounded-xl shadow-xs flex items-center space-x-1 active:scale-95 transition-all"
                                    title="Thêm ngay 1 sản phẩm vào đơn hàng"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>+ Thêm ngay</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleSelectProductToCustomize(p);
                                      setIsSearchFocused(false);
                                    }}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2 px-2.5 rounded-xl border border-slate-300 flex items-center space-x-1 transition-all"
                                    title="Chỉnh sửa đơn giá, số lượng và bảo hành cho đơn này"
                                  >
                                    <SlidersHorizontal className="w-3 h-3" />
                                    <span>Tùy chỉnh</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Footer of Suggestion Board */}
                      <div className="bg-slate-50 px-3.5 py-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 text-slate-600 font-medium">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>Bấm <strong>"+ Thêm ngay"</strong> để chốt nhanh vào đơn hàng!</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => setIsSearchFocused(false)}
                          className="text-blue-600 hover:underline font-bold text-xs flex items-center gap-1"
                        >
                          <span>Xem dạng thẻ đầy đủ</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Tìm siêu tốc: Gõ tiếng Việt có dấu/không dấu, hỗ trợ nhiều từ khóa.</span>
                  </span>
                  {(selectedCategoryFilter !== 'all' || selectedBrandFilter !== 'all' || productSearchQuery.trim() !== '') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryFilter('all');
                        setSelectedBrandFilter('all');
                        setProductSearchQuery('');
                      }}
                      className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 hover:underline ml-2 shrink-0"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Xóa lọc</span>
                    </button>
                  )}
                </div>

                {/* Quick Filter Chips (1-tap selection on mobile) */}
                <div className="space-y-1.5 pt-1">
                  {/* Category Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0 mr-0.5">
                      Danh mục:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors ${
                        selectedCategoryFilter === 'all'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Tất cả ({localProducts.length})
                    </button>
                    {availableCategories.slice(0, 10).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategoryFilter(cat === selectedCategoryFilter ? 'all' : cat)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors ${
                          selectedCategoryFilter === cat
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Brand Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0 mr-0.5">
                      Hãng:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedBrandFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors ${
                        selectedBrandFilter === 'all'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Tất cả ({availableBrands.length})
                    </button>
                    {availableBrands.slice(0, 10).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setSelectedBrandFilter(b === selectedBrandFilter ? 'all' : b)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors ${
                          selectedBrandFilter === b
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Matching Products Grid / Results Feed */}
              <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/90 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Sản phẩm kho khớp từ khóa ({filteredProducts.length} SP)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowClassicSelect(!showClassicSelect)}
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>{showClassicSelect ? 'Ẩn bộ chọn cũ' : 'Bộ chọn thả xuống'}</span>
                  </button>
                </div>

                {/* Classic Dropdown if user prefers */}
                {showClassicSelect && (
                  <div className="p-3 bg-white border border-blue-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Chọn trực tiếp từ danh sách thả xuống:
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                    >
                      <option value="">-- Chọn sản phẩm có sẵn ({filteredProducts.length}) --</option>
                      {filteredProducts.map((p) => (
                        <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                          {p.name} (SKU: {p.sku}) - [Tồn: {p.stock}] - {formatVND(p.price)} (Cập nhật: {formatDateVI(p.priceUpdatedAt || p.createdAt)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {filteredProducts.length === 0 ? (
                  <div className="text-center py-8 px-4 bg-white rounded-xl border border-dashed border-slate-300 space-y-2">
                    <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">
                      Không tìm thấy sản phẩm nào khớp với từ khóa "{productSearchQuery}"
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Bạn có thể xóa từ khóa hoặc bấm nút dưới để thêm nhanh sản phẩm mới vào kho!
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowQuickAddModal(true)}
                      className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"
                    >
                      <PackagePlus className="w-3.5 h-3.5" />
                      <span>+ Thêm Nhanh SP Mới Vừa Nhập</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto p-1 pr-1.5">
                    {filteredProducts.map((p) => {
                      const inCartItem = selectedItems.find((i) => i.productId === p.id);
                      const brand = getProductBrand(p);
                      const isOutOfStock = p.stock <= 0;
                      const isLowStock = p.stock > 0 && p.stock <= 3;
                      const isSelectedForCustomize = selectedProductId === p.id;

                      return (
                        <div
                          key={p.id}
                          className={`p-3 rounded-xl border transition-all flex flex-col justify-between space-y-2.5 bg-white ${
                            isSelectedForCustomize
                              ? 'border-blue-500 ring-2 ring-blue-400/40 shadow-sm'
                              : 'border-slate-200 hover:border-blue-300 shadow-2xs'
                          } ${isOutOfStock ? 'opacity-60 bg-slate-50' : ''}`}
                        >
                          {/* Badges row */}
                          <div className="flex items-center justify-between gap-1 text-[10px]">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                                {brand}
                              </span>
                              <span className="bg-blue-50 text-blue-700 font-medium px-1.5 py-0.5 rounded">
                                {p.category}
                              </span>
                              <span className="text-slate-400 font-mono">SKU: {p.sku}</span>
                            </div>

                            {/* Stock Status Badge */}
                            {isOutOfStock ? (
                              <span className="bg-rose-100 text-rose-800 font-extrabold px-1.5 py-0.5 rounded text-[10px] shrink-0">
                                Hết hàng
                              </span>
                            ) : isLowStock ? (
                              <span className="bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.5 rounded text-[10px] shrink-0">
                                Sắp hết ({p.stock})
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded text-[10px] shrink-0">
                                Còn {p.stock}
                              </span>
                            )}
                          </div>

                          {/* Product Name */}
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-2">
                              {p.name}
                            </h4>
                          </div>

                          {/* Price & Recency */}
                          <div className="flex items-baseline justify-between pt-1 border-t border-slate-100">
                            <div>
                              <span className="text-sm sm:text-base font-black text-blue-700">
                                {formatVND(p.price)}
                              </span>
                              <p className="text-[10px] text-slate-500">
                                Cập nhật: {formatDateVI(p.priceUpdatedAt || p.createdAt)}
                              </p>
                            </div>

                            {inCartItem && (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-full">
                                Đã có {inCartItem.quantity}
                              </span>
                            )}
                          </div>

                          {/* Quick Action Buttons for Phone & Desktop */}
                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            <button
                              type="button"
                              disabled={isOutOfStock}
                              onClick={(e) => handleQuickAddOne(p, e)}
                              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs py-2 px-2.5 rounded-xl shadow-2xs flex items-center justify-center space-x-1 active:scale-95 transition-all"
                              title="Thêm nhanh 1 sản phẩm vào đơn"
                            >
                              <Plus className="w-3.5 h-3.5 shrink-0" />
                              <span>+ Thêm 1</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSelectProductToCustomize(p)}
                              className={`text-xs font-bold py-2 px-2.5 rounded-xl border transition-all flex items-center justify-center space-x-1 ${
                                isSelectedForCustomize
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                              }`}
                              title="Tùy chỉnh số lượng, đơn giá bán và bảo hành"
                            >
                              <SlidersHorizontal className="w-3 h-3 shrink-0" />
                              <span>{isSelectedForCustomize ? 'Đang sửa' : 'Tùy chỉnh'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Active Customizer Tray (when user clicks "Tùy chỉnh" on any product) */}
              {selectedProductId && (() => {
                const targetProd = localProducts.find((p) => p.id === selectedProductId);
                if (!targetProd) return null;
                return (
                  <div className="bg-gradient-to-br from-blue-50/90 to-indigo-50/90 p-4 rounded-2xl border-2 border-blue-300 space-y-3.5 shadow-xs animate-in zoom-in-95 duration-150">
                    <div className="flex items-start justify-between gap-2 border-b border-blue-200/80 pb-2.5">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                          Tùy chỉnh sản phẩm vào đơn
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-sm mt-1">
                          {targetProd.name} <span className="font-mono text-xs text-slate-500">(SKU: {targetProd.sku})</span>
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedProductId('')}
                        className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-white transition-colors"
                        title="Đóng tùy chỉnh"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      {/* Editable Selling Price Field */}
                      <div className="sm:col-span-6">
                        <label className="block text-[11px] font-black text-blue-950 mb-1 flex items-center justify-between">
                          <span>Đơn giá bán cho đơn này (VNĐ) *</span>
                          <span className="text-[10px] text-blue-600 font-semibold">(Giá gốc: {formatVND(targetProd.price)})</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="10000"
                          value={pickerUnitPrice || ''}
                          onChange={(e) => setPickerUnitPrice(Math.max(0, Number(e.target.value)))}
                          className="w-full text-xs px-3.5 py-2.5 border-2 border-blue-400 rounded-xl focus:ring-2 focus:ring-blue-500 font-black text-blue-950 bg-white"
                        />
                        {pickerUnitPrice !== targetProd.price && (
                          <p className="text-[10px] font-bold text-amber-700 mt-1">
                            {pickerUnitPrice > targetProd.price
                              ? `Tăng ${formatVND(pickerUnitPrice - targetProd.price)} so với giá niêm yết`
                              : `Giảm ${formatVND(targetProd.price - pickerUnitPrice)} so với giá niêm yết`}
                          </p>
                        )}
                      </div>

                      {/* Quantity Stepper */}
                      <div className="sm:col-span-6">
                        <label className="block text-[11px] font-black text-blue-950 mb-1">
                          Số lượng mua (Tồn kho: {targetProd.stock}) *
                        </label>
                        <div className="flex items-center space-x-2">
                          <div className="inline-flex items-center border border-blue-300 rounded-xl bg-white overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => setPickerQuantity(Math.max(1, pickerQuantity - 1))}
                              className="w-9 h-9 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:bg-slate-200 font-bold"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={targetProd.stock}
                              value={pickerQuantity}
                              onChange={(e) => setPickerQuantity(Math.max(1, Math.min(targetProd.stock, Number(e.target.value))))}
                              className="w-14 text-center font-extrabold text-xs text-slate-900 border-x border-slate-200 py-2"
                            />
                            <button
                              type="button"
                              onClick={() => setPickerQuantity(Math.min(targetProd.stock, pickerQuantity + 1))}
                              className="w-9 h-9 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:bg-slate-200 font-bold text-blue-600"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="text-xs font-black text-blue-900">
                            = {formatVND(pickerUnitPrice * pickerQuantity)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Warranty & Bonus row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-blue-200 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-blue-200 shadow-2xs">
                          <label className="inline-flex items-center space-x-1.5 cursor-pointer text-blue-900 font-bold">
                            <input
                              type="checkbox"
                              checked={pickerWarrantyActivated}
                              onChange={(e) => setPickerWarrantyActivated(e.target.checked)}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                            <span>Bảo hành:</span>
                          </label>

                          {pickerWarrantyActivated && (
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                min="0"
                                value={pickerWarrantyMonths}
                                onChange={(e) => setPickerWarrantyMonths(Math.max(0, Number(e.target.value)))}
                                className="w-12 text-center py-0.5 px-1 border border-blue-400 rounded-md font-bold text-blue-900 bg-white text-xs focus:ring-1 focus:ring-blue-500"
                              />
                              <span className="font-bold text-blue-900 text-[11px]">Tháng</span>
                            </div>
                          )}
                        </div>

                        {pickerWarrantyActivated && (
                          <span className="text-emerald-700 font-bold bg-emerald-100/90 px-2.5 py-1.5 rounded-xl border border-emerald-300 flex items-center space-x-1 text-xs">
                            <Award className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Thưởng: +{formatVND(pickerBonusAmount * pickerQuantity)}</span>
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md flex items-center space-x-1.5 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Thêm vào đơn ({formatVND(pickerUnitPrice * pickerQuantity)})</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Selected Item List */}
              {selectedItems.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl space-y-2 bg-slate-50/50">
                  <p className="font-bold text-slate-600">Chưa chọn sản phẩm nào vào đơn.</p>
                  <p className="text-[11px] text-slate-500">
                    Gõ từ khóa ở trên hoặc bấm nút <strong className="text-emerald-600 font-bold">+ Thêm 1</strong> từ kết quả tìm kiếm để lên đơn nhanh!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Mobile Card List for Phones */}
                  <div className="block sm:hidden space-y-3">
                    {selectedItems.map((item, idx) => (
                      <div key={idx} className="bg-slate-50/90 border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-2xs">
                        {/* Title & Delete */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">{item.productName}</p>
                            <span className="text-[10px] text-slate-500 font-mono">SKU: {item.sku}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors"
                            title="Xóa sản phẩm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Stepper & Price */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/80 items-center">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">Số lượng:</label>
                            <div className="inline-flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQuantity(idx, Math.max(1, item.quantity - 1))}
                                className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:bg-slate-200 font-bold"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItemQuantity(idx, Number(e.target.value))}
                                className="w-10 text-center font-extrabold text-xs text-slate-900 border-x border-slate-200 py-1"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQuantity(idx, item.quantity + 1)}
                                className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:bg-slate-200 font-bold text-blue-600"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="text-right">
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">Đơn giá bán:</label>
                            <input
                              type="number"
                              min="0"
                              step="10000"
                              value={item.price}
                              onChange={(e) => handleUpdateItemPrice(idx, Number(e.target.value))}
                              className="w-full text-right py-1 px-2 border border-blue-300 rounded-lg font-black text-blue-900 bg-white text-xs"
                            />
                          </div>
                        </div>

                        {/* Total for this line */}
                        <div className="flex items-center justify-between bg-blue-50/70 p-2 rounded-lg border border-blue-100 text-xs">
                          <span className="font-bold text-slate-700 text-[11px]">Thành tiền:</span>
                          <span className="font-black text-blue-800 text-sm">{formatVND(item.price * item.quantity)}</span>
                        </div>

                        {/* Warranty & Bonus toggles */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-xs">
                          <button
                            type="button"
                            onClick={() => handleToggleItemWarranty(idx)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center space-x-1.5 transition-colors ${
                              item.isWarrantyActivated
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-slate-200 text-slate-600 border-slate-300'
                            }`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{item.isWarrantyActivated ? `Bảo hành ${item.warrantyMonths}T` : 'Không BH'}</span>
                          </button>

                          {item.isWarrantyActivated && (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center space-x-1">
                              <Award className="w-3 h-3 text-emerald-600" />
                              <span>Thưởng: +{formatVND((item.activationBonusAmount || 0) * item.quantity)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View for Larger Screens */}
                  <div className="hidden sm:block overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs min-w-[650px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                          <th className="py-2.5 px-3">Tên sản phẩm</th>
                          <th className="py-2.5 px-3 text-center">Số lượng</th>
                          <th className="py-2.5 px-3 text-right">Giá bán (VNĐ)</th>
                          <th className="py-2.5 px-3 text-center">Bảo hành & Thưởng</th>
                          <th className="py-2.5 px-3 text-right">Thành tiền</th>
                          <th className="py-2.5 px-3 text-center">Xóa</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {selectedItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3">
                              <p className="font-extrabold text-slate-900">{item.productName}</p>
                              <p className="text-[10px] text-slate-500 font-mono">SKU: {item.sku}</p>
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItemQuantity(idx, Number(e.target.value))}
                                className="w-14 text-center py-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 font-bold bg-white"
                              />
                            </td>

                            {/* Explicit Editable Selling Price Field */}
                            <td className="py-2.5 px-3 text-right">
                              <div className="inline-flex flex-col items-end">
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">Giá bán:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="10000"
                                    value={item.price}
                                    onChange={(e) => handleUpdateItemPrice(idx, Number(e.target.value))}
                                    className="w-32 text-right py-1 px-2 border border-blue-300 rounded-lg font-extrabold text-blue-900 bg-blue-50/80 focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs transition-all"
                                  />
                                  <span className="font-bold text-slate-500 text-[11px]">đ</span>
                                </div>
                                <span className="text-[9px] text-blue-600 font-medium mt-0.5">Giá bán tùy chỉnh đơn này</span>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <div className="flex flex-col items-center space-y-1">
                                <button
                                  type="button"
                                  onClick={() => handleToggleItemWarranty(idx)}
                                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-colors inline-flex items-center space-x-1 ${
                                    item.isWarrantyActivated
                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                      : 'bg-slate-100 text-slate-500 border-slate-300'
                                  }`}
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>{item.isWarrantyActivated ? 'Kích hoạt BH' : 'Tắt BH'}</span>
                                </button>

                                {/* Editable Warranty Duration Input per order line item */}
                                <div className="flex items-center space-x-1 mt-0.5">
                                  <span className="text-[10px] font-bold text-slate-600 whitespace-nowrap">Thời hạn:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.warrantyMonths}
                                    onChange={(e) => handleUpdateItemWarrantyMonths(idx, Number(e.target.value))}
                                    className="w-16 text-center py-0.5 px-1 border border-blue-300 rounded font-bold text-blue-900 bg-blue-50/80 focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs"
                                  />
                                  <span className="text-[10px] font-bold text-slate-600">Tháng</span>
                                </div>

                                {item.isWarrantyActivated && (
                                  <div className="flex items-center space-x-1 mt-0.5">
                                    <span className="text-[10px] font-extrabold text-emerald-800 whitespace-nowrap">
                                      Thưởng:
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="5000"
                                      value={item.activationBonusAmount}
                                      onChange={(e) => handleUpdateItemBonus(idx, Number(e.target.value))}
                                      className="w-22 text-right py-0.5 px-1.5 border border-emerald-400 rounded-md font-extrabold text-emerald-900 bg-emerald-50/90 focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs"
                                    />
                                    <span className="text-[10px] font-bold text-emerald-700">đ/SP</span>
                                  </div>
                                )}
                              </div>
                            </td>

                            <td className="py-2.5 px-3 text-right font-extrabold text-blue-700">
                              {formatVND(item.price * item.quantity)}
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (1 Col): Delivery Scheduling & Summary */}
          <div className="space-y-6 lg:sticky lg:top-6 self-start">
            {/* Delivery Scheduler */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 relative z-0">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">4. Lịch Giao Hàng (Schedule)</h3>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ngày giao hàng *</label>
                <input
                  type="date"
                  required
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Thời gian / Khung giờ giao *</label>
                <select
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-900"
                >
                  <option value="08:00 - 10:00">08:00 - 10:00 (Sáng)</option>
                  <option value="09:00 - 11:30">09:00 - 11:30 (Sáng)</option>
                  <option value="13:30 - 15:30">13:30 - 15:30 (Chiều)</option>
                  <option value="15:30 - 18:00">15:30 - 18:00 (Chiều)</option>
                  <option value="18:00 - 20:30">18:00 - 20:30 (Tối)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nhân viên Giao hàng (Shipper Assignment) *
                </label>
                <select
                  value={deliveryStaffId}
                  onChange={(e) => handleDeliveryStaffSelectChange(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-blue-50/50 font-bold text-blue-900"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.employeeId}>
                      {s.employeeId} - {s.employeeName} {s.role === 'Delivery' ? '(Giao hàng)' : `(${s.role})`}
                    </option>
                  ))}
                </select>
                {deliveryStaffPhone && (
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">
                    SĐT Shipper: <span className="font-bold text-slate-800">{deliveryStaffPhone}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Trạng thái lộ trình ban đầu</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as OrderStatus)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-bold text-slate-900"
                >
                  <option value="pending_pickup">Chờ lấy hàng (Pending Pickup)</option>
                  <option value="in_transit">Đang giao hàng (In Transit)</option>
                  <option value="delivered">Giao thành công (Delivered)</option>
                  <option value="failed">Giao thất bại (Delivery Failed)</option>
                  <option value="cancelled">Đã hủy (Cancelled)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú đơn hàng</label>
                <textarea
                  rows={2}
                  placeholder="Yêu cầu riêng của khách hàng..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                ></textarea>
              </div>
            </div>

            {/* Order Value & Financial Summary */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl border border-slate-800 space-y-4 relative z-0">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="font-extrabold text-sm text-white">5. Tổng kết & Thanh toán COD</h3>
                {editingOrder && (
                  <span className="bg-amber-500 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                    Chỉnh sửa đơn
                  </span>
                )}
              </div>

              {/* Explicit Numerical Inputs for Shipping Fee & Prepaid Amount */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Phí vận chuyển (VNĐ):</span>
                    <span className="text-[10px] text-blue-400 font-semibold">+ Cộng vào đơn</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    placeholder="VD: 30000"
                    value={shippingFee || ''}
                    onChange={(e) => setShippingFee(Math.max(0, Number(e.target.value)))}
                    className="w-full text-xs px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl font-extrabold text-blue-300 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Số tiền đã thanh toán trước (Đặt cọc/Trả trước - VNĐ):</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">- Trừ tiền COD</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    placeholder="VD: 500000"
                    value={prepaidAmount || ''}
                    onChange={(e) => setPrepaidAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full text-xs px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl font-extrabold text-emerald-300 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-2 text-xs pt-3 border-t border-slate-800">
                <div className="flex justify-between text-slate-300">
                  <span>Tổng tiền hàng (Subtotal):</span>
                  <span className="font-bold text-white">{formatVND(subtotal)}</span>
                </div>

                <div className="flex justify-between text-slate-300">
                  <span>Phí vận chuyển:</span>
                  <span className="font-bold text-blue-300">+{formatVND(shippingFee || 0)}</span>
                </div>

                <div className="flex justify-between items-baseline pt-2 border-t border-slate-800">
                  <span className="font-extrabold text-slate-200">Tổng giá trị đơn hàng:</span>
                  <span className="text-lg font-black text-blue-400">{formatVND(totalAmount)}</span>
                </div>

                <div className="flex justify-between text-slate-300 pt-1">
                  <span>Đã thanh toán trước (Trả trước):</span>
                  <span className="font-bold text-emerald-400">-{formatVND(prepaidAmount || 0)}</span>
                </div>

                {/* Remaining Amount to Collect (COD Card) */}
                <div className="bg-slate-800/90 p-3.5 rounded-xl border border-amber-500/50 mt-2 space-y-1 relative z-0">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-amber-400 text-xs">Số tiền còn lại cần thu (COD):</span>
                    <span className="text-lg font-black text-amber-300">{formatVND(remainingAmount)}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Số tiền Shipper sẽ trực tiếp thu từ khách hàng khi giao.
                  </p>
                </div>

                <div className="flex justify-between text-emerald-400 font-bold pt-2 border-t border-slate-800">
                  <span className="flex items-center">
                    <Award className="w-3.5 h-3.5 inline mr-1 text-emerald-400" />
                    Thưởng kích hoạt BH (NV {employeeId}):
                  </span>
                  <span>+{formatVND(totalBonusEarned)}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingOrder ? 'LƯU CẬP NHẬT ĐƠN HÀNG' : 'XÁC NHẬN TẠO ĐƠN HÀNG'}</span>
                </button>

                {editingOrder && onCancelEdit && (
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded-xl transition-colors"
                  >
                    Hủy chỉnh sửa
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* STICKY BOTTOM ACTION BAR FOR MOBILE PHONES */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 p-3 shadow-2xl flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1.5 text-xs text-slate-300 truncate">
                <span className="bg-blue-600 text-white font-black px-1.5 py-0.5 rounded text-[10px] shrink-0">
                  {selectedItems.reduce((acc, i) => acc + i.quantity, 0)} SP
                </span>
                <span className="truncate">
                  Tổng: <strong className="text-blue-400 font-extrabold">{formatVND(totalAmount)}</strong>
                </span>
              </div>
              <div className="text-[11px] text-amber-300 font-black mt-0.5 truncate">
                Thu COD: {formatVND(remainingAmount)}
              </div>
            </div>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/40 flex items-center space-x-1.5 transition-all shrink-0"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingOrder ? 'LƯU ĐƠN' : 'TẠO ĐƠN HÀNG'}</span>
            </button>
          </div>
        </form>
      )}
      {/* QUICK ADD NEW UNLISTED PRODUCT MODAL */}
      {showQuickAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <PackagePlus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-sm">Thêm Nhanh Sản Phẩm Mới (Lưu Kho & Chọn Vào Đơn)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleQuickAddProductSubmit} className="p-5 space-y-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-800 text-[11px] font-medium">
                Sản phẩm này sẽ tự động lưu vào <strong>Kho Hàng (Inventory)</strong> cho các lần lên đơn sau và chọn ngay vào đơn hàng hiện tại.
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên sản phẩm *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Smart Tivi LG OLED 55 inch 4K K8"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã SKU</label>
                  <input
                    type="text"
                    placeholder="VD: TV-LG-55OLED"
                    value={quickSku}
                    onChange={(e) => setQuickSku(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Danh mục sản phẩm</label>
                  <input
                    type="text"
                    list="quick-add-categories-list"
                    placeholder="VD: Tivi, Máy hút mùi..."
                    value={quickCategory}
                    onChange={(e) => setQuickCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                  <datalist id="quick-add-categories-list">
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hãng / Thương hiệu</label>
                  <input
                    type="text"
                    list="quick-add-brands-list"
                    placeholder="VD: Samsung, BOSCH..."
                    value={quickBrand}
                    onChange={(e) => setQuickBrand(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                  <datalist id="quick-add-brands-list">
                    {availableBrands.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giá bán đơn vị (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="10000"
                    value={quickPrice}
                    onChange={(e) => setQuickPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số lượng nhập kho ban đầu</label>
                  <input
                    type="number"
                    min="1"
                    value={quickStock}
                    onChange={(e) => setQuickStock(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">Bảo hành (tháng)</label>
                  <div className="flex items-center space-x-1.5">
                    <select
                      value={[0, 1, 3, 6, 12, 18, 24, 36, 48, 60].includes(quickWarrantyMonths) ? quickWarrantyMonths : 'custom'}
                      onChange={(e) => {
                        if (e.target.value !== 'custom') {
                          setQuickWarrantyMonths(Number(e.target.value));
                        }
                      }}
                      className="text-xs px-2.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value={0}>Không BH</option>
                      <option value={1}>1 tháng</option>
                      <option value={3}>3 tháng</option>
                      <option value={6}>6 tháng</option>
                      <option value={12}>12 tháng</option>
                      <option value={18}>18 tháng</option>
                      <option value={24}>24 tháng</option>
                      <option value={36}>36 tháng</option>
                      <option value={48}>48 tháng</option>
                      <option value={60}>60 tháng</option>
                      <option value="custom">Tùy chỉnh...</option>
                    </select>

                    <input
                      type="number"
                      min="0"
                      value={quickWarrantyMonths}
                      onChange={(e) => setQuickWarrantyMonths(Math.max(0, Number(e.target.value)))}
                      className="w-20 text-center px-2 py-2 border border-emerald-400 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-xs bg-white text-emerald-900"
                      placeholder="Số tháng"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thưởng kích hoạt BH (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={quickBonusAmount}
                    onChange={(e) => setQuickBonusAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="block font-bold text-slate-700 mb-1">Số lượng mua vào đơn hàng này</label>
                <input
                  type="number"
                  min="1"
                  value={quickBuyQuantity}
                  onChange={(e) => setQuickBuyQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-extrabold text-slate-900 bg-slate-50"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
                >
                  <PackagePlus className="w-4 h-4" />
                  <span>Lưu Vào Kho & Chọn Vào Đơn</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

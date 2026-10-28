import {
  Product,
  Order,
  OrderItem,
  Staff,
  StoreInfo,
  OrderStatus,
  EmployeeBonusSummary,
  DeliveryLog,
  CategoryItem,
  BrandItem,
  PaymentLog,
  PriceChangeRecord,
  StockChangeRecord,
} from '../types';
import { INITIAL_PRODUCTS, INITIAL_ORDERS, INITIAL_STAFF, INITIAL_STORE_INFO, INITIAL_CATEGORIES, INITIAL_BRANDS } from '../data/initialData';

export const getOrderStatusLabel = (status: OrderStatus): string => {
  switch (status) {
    case 'pending':
    case 'pending_pickup':
      return 'Chờ lấy hàng';
    case 'delivering':
    case 'in_transit':
      return 'Đang giao hàng';
    case 'completed':
    case 'delivered':
      return 'Giao thành công';
    case 'failed':
      return 'Giao thất bại';
    case 'cancelled':
      return 'Đã hủy';
    default:
      return status;
  }
};

const STORAGE_KEYS = {
  PRODUCTS: 'ordermanager_products_v5',
  ORDERS: 'ordermanager_orders_v5',
  STAFF: 'ordermanager_staff_v5',
  STORE: 'ordermanager_store_v5',
  ACTIVE_STAFF_ID: 'ordermanager_active_staff_id_v5',
  CATEGORIES: 'ordermanager_categories_v5',
  BRANDS: 'ordermanager_brands_v5',
};

// Event listener mechanism for reactivity
type StorageListener = () => void;
const listeners: Set<StorageListener> = new Set();

export const subscribeToStorage = (listener: StorageListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

// Helper formatters
export const formatVND = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDateVI = (dateString: string): string => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const formatDateTimeVI = (isoString: string): string => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
};

export const removeVietnameseTones = (str: string): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};

/**
 * Calculate Great-Circle distance (Haversine formula) in kilometers between two GPS coordinates
 */
export const calculateDistanceKm = (
  lat1?: number,
  lon1?: number,
  lat2?: number,
  lon2?: number
): number => {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return 0;
  }
  if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
    return 0;
  }
  try {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return Number(dist.toFixed(1));
  } catch {
    return 0;
  }
};

/**
 * Estimate travel time in minutes for delivery in urban traffic (~2.8 min/km + 6 mins buffer)
 */
export const estimateTravelTimeMinutes = (distanceKm: number): number => {
  if (distanceKm <= 0) return 10;
  return Math.round(distanceKm * 2.8 + 6);
};

/**
 * Generate native Google Maps directions URL for shipper mobile navigation
 */
export const getGoogleMapsDirectionsUrl = (
  originLat?: number,
  originLng?: number,
  destAddressOrLat?: string | number,
  destLng?: number
): string => {
  if (typeof originLat === 'number' && typeof originLng === 'number' && typeof destAddressOrLat === 'number' && typeof destLng === 'number') {
    return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destAddressOrLat},${destLng}&travelmode=driving`;
  }
  const dest = typeof destAddressOrLat === 'string' ? encodeURIComponent(destAddressOrLat) : `${destAddressOrLat},${destLng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
};

/**
 * Generate native OpenStreetMap directions URL (100% Free, worldwide coverage including Vietnam)
 */
export const getOsmDirectionsUrl = (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): string => {
  // Use graphhopper_car which supports Vietnam routes globally (never fossgis_osrm_car which only covers Germany/Europe)
  return `https://www.openstreetmap.org/directions?engine=graphhopper_car&route=${originLat}%2C${originLng}%3B${destLat}%2C${destLng}`;
};

/**
 * Generate direct OpenStreetMap pin link centered at exact coordinates in Vietnam
 */
export const getOsmLocationUrl = (lat: number, lng: number): string => {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
};

export interface RoadStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  streetName: string;
}

export interface RealRoadRoute {
  distanceKm: number;
  durationMinutes: number;
  coordinates: [number, number][]; // [lat, lng] array for Leaflet polyline
  steps: RoadStep[];
}

/**
 * Fetch real street-following driving route & turn-by-turn steps from free OSRM engine
 */
export const fetchRealRoadRoute = async (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<RealRoadRoute | null> => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) return null;

    const route = data.routes[0];
    const distanceKm = Number((route.distance / 1000).toFixed(1));
    const durationMinutes = Math.max(1, Math.round(route.duration / 60));

    // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
    const coordinates: [number, number][] = (route.geometry?.coordinates || []).map(
      (c: [number, number]) => [c[1], c[0]]
    );

    const steps: RoadStep[] = [];
    if (route.legs && route.legs[0] && Array.isArray(route.legs[0].steps)) {
      route.legs[0].steps.forEach((st: any) => {
        const type = st.maneuver?.type || '';
        const modifier = st.maneuver?.modifier || '';
        const street = st.name || '';
        let action = 'Đi tiếp';

        if (type === 'depart') action = 'Bắt đầu xuất phát';
        else if (type === 'arrive') action = 'Đến điểm nhận hàng của khách';
        else if (modifier === 'left' || modifier === 'sharp left') action = 'Rẽ trái vào';
        else if (modifier === 'right' || modifier === 'sharp right') action = 'Rẽ phải vào';
        else if (modifier === 'slight left') action = 'Chếch sang trái vào';
        else if (modifier === 'slight right') action = 'Chếch sang phải vào';
        else if (modifier === 'straight') action = 'Đi thẳng theo';
        else if (type === 'roundabout') action = 'Đi qua vòng xoay vào';

        const instr = street ? `${action} ${street}` : action;
        steps.push({
          instruction: instr,
          distanceMeters: Math.round(st.distance || 0),
          durationSeconds: Math.round(st.duration || 0),
          streetName: street,
        });
      });
    }

    return {
      distanceKm,
      durationMinutes,
      coordinates,
      steps,
    };
  } catch (err) {
    console.warn('Could not fetch OSRM route:', err);
    return null;
  }
};


/**
 * Nearest-Neighbor TSP optimization for ordering delivery stops
 * starts from startPos (Shipper current GPS or Warehouse) and iteratively visits the nearest remaining stop.
 */
export const optimizeDeliveryRouteSequence = <T extends { deliveryLat?: number; deliveryLng?: number; id: string }>(
  startPos: [number, number],
  items: T[]
): T[] => {
  if (!items || items.length <= 1) return items;

  const remaining = [...items];
  const ordered: T[] = [];
  let currentPos = startPos;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let shortestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i];
      const lat = item.deliveryLat ?? currentPos[0];
      const lng = item.deliveryLng ?? currentPos[1];
      const dist = calculateDistanceKm(currentPos[0], currentPos[1], lat, lng);
      if (dist < shortestDist) {
        shortestDist = dist;
        nearestIdx = i;
      }
    }

    const nextStop = remaining.splice(nearestIdx, 1)[0];
    ordered.push(nextStop);
    currentPos = [nextStop.deliveryLat ?? currentPos[0], nextStop.deliveryLng ?? currentPos[1]];
  }

  return ordered;
};


// --- PRODUCTS ---
export const getProducts = (): Product[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (data) {
      const parsed: Product[] = JSON.parse(data);
      // Ensure all products have required price audit and stock audit fields populated
      return parsed.map((p) => {
        const costPrice = p.costPrice !== undefined ? p.costPrice : Math.round((p.price || 0) * 0.78);
        const priceUpdatedAt = p.priceUpdatedAt || p.createdAt || new Date().toISOString();
        const priceHistory = Array.isArray(p.priceHistory) ? p.priceHistory : [];
        const stockUpdatedAt = p.stockUpdatedAt || p.createdAt || new Date().toISOString();
        const stockHistory = Array.isArray(p.stockHistory) ? p.stockHistory : [];

        return {
          ...p,
          costPrice,
          priceUpdatedAt,
          priceHistory,
          stockUpdatedAt,
          stockHistory,
        };
      });
    }
  } catch (e) {
    console.error('Error reading products from storage', e);
  }
  // Initialize default
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
  return INITIAL_PRODUCTS;
};

/**
 * Resets inventory back to the 328 products from the file TON_13-101_b069d2c8.csv
 * with the 6 strict categories: Tivi, Tủ lạnh, Máy giặt, Quạt, Máy lạnh, Gia dụng.
 */
export const reloadInventoryFromReport = (): Product[] => {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
  localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(INITIAL_BRANDS));
  notifyListeners();
  return INITIAL_PRODUCTS;
};

export const saveProduct = (
  productData: Omit<Product, 'id' | 'createdAt'> & { id?: string }
): Product => {
  const products = getProducts();
  const nowStr = new Date().toISOString();
  let savedProduct: Product;

  if (productData.id) {
    // Edit existing product
    const index = products.findIndex((p) => p.id === productData.id);
    if (index !== -1) {
      const oldProd = products[index];
      const existingHistory = Array.isArray(oldProd.priceHistory) ? [...oldProd.priceHistory] : [];
      const existingStockHistory = Array.isArray(oldProd.stockHistory) ? [...oldProd.stockHistory] : [];

      const priceChanged = productData.price !== undefined && productData.price !== oldProd.price;
      const costPriceChanged = productData.costPrice !== undefined && productData.costPrice !== oldProd.costPrice;

      // Determine price update date
      let finalPriceUpdatedAt = oldProd.priceUpdatedAt || nowStr;
      let finalPriceUpdatedBy = oldProd.priceUpdatedBy;
      let finalPriceNote = oldProd.priceNote;

      if (priceChanged || costPriceChanged || productData.priceUpdatedAt) {
        finalPriceUpdatedAt = productData.priceUpdatedAt || nowStr;
        finalPriceUpdatedBy = productData.priceUpdatedBy || oldProd.priceUpdatedBy || 'Quản lý kho';
        finalPriceNote = productData.priceNote || oldProd.priceNote || 'Cập nhật giá bán sản phẩm';

        // Add to price history
        const newRecord: PriceChangeRecord = {
          id: `ph-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          oldPrice: oldProd.price,
          newPrice: productData.price !== undefined ? productData.price : oldProd.price,
          oldCostPrice: oldProd.costPrice,
          newCostPrice: productData.costPrice !== undefined ? productData.costPrice : oldProd.costPrice,
          changedAt: finalPriceUpdatedAt,
          changedBy: finalPriceUpdatedBy,
          reason: finalPriceNote,
        };
        existingHistory.unshift(newRecord);
      }

      // Check stock changes
      let finalStockUpdatedAt = oldProd.stockUpdatedAt || nowStr;
      if (productData.stock !== undefined && productData.stock !== oldProd.stock) {
        finalStockUpdatedAt = nowStr;
        const stockDiff = productData.stock - oldProd.stock;
        existingStockHistory.unshift({
          id: `sh-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          oldStock: oldProd.stock,
          newStock: productData.stock,
          changeAmount: stockDiff,
          type: stockDiff > 0 ? 'import' : 'manual_update',
          changedAt: nowStr,
          changedBy: productData.priceUpdatedBy || 'Quản lý kho',
          note: stockDiff > 0 ? `Nhập thêm kho +${stockDiff}` : `Điều chỉnh kiểm kho ${stockDiff}`,
        });
      }

      savedProduct = {
        ...oldProd,
        ...productData,
        costPrice: productData.costPrice !== undefined ? productData.costPrice : oldProd.costPrice,
        priceUpdatedAt: finalPriceUpdatedAt,
        priceUpdatedBy: finalPriceUpdatedBy,
        priceNote: finalPriceNote,
        priceHistory: existingHistory,
        stockUpdatedAt: finalStockUpdatedAt,
        stockHistory: existingStockHistory,
      };
      products[index] = savedProduct;
    } else {
      const priceDate = productData.priceUpdatedAt || nowStr;
      savedProduct = {
        ...productData,
        id: `prod-${Date.now()}`,
        costPrice: productData.costPrice !== undefined ? productData.costPrice : Math.round((productData.price || 0) * 0.78),
        createdAt: nowStr,
        priceUpdatedAt: priceDate,
        priceUpdatedBy: productData.priceUpdatedBy || 'Quản lý kho',
        priceNote: productData.priceNote || 'Khởi tạo sản phẩm mới vào kho',
        priceHistory: [
          {
            id: `ph-${Date.now()}`,
            oldPrice: productData.price,
            newPrice: productData.price,
            oldCostPrice: productData.costPrice,
            newCostPrice: productData.costPrice,
            changedAt: priceDate,
            changedBy: productData.priceUpdatedBy || 'Quản lý kho',
            reason: 'Thiết lập giá ban đầu khi thêm vào kho',
          },
        ],
        stockUpdatedAt: nowStr,
        stockHistory: [
          {
            id: `sh-${Date.now()}`,
            oldStock: 0,
            newStock: productData.stock || 0,
            changeAmount: productData.stock || 0,
            type: 'import',
            changedAt: nowStr,
            note: 'Nhập kho lô đầu tiên',
          },
        ],
      };
      products.push(savedProduct);
    }
  } else {
    // Add new product
    const priceDate = productData.priceUpdatedAt || nowStr;
    savedProduct = {
      ...productData,
      id: `prod-${Date.now()}`,
      costPrice: productData.costPrice !== undefined ? productData.costPrice : Math.round((productData.price || 0) * 0.78),
      createdAt: nowStr,
      priceUpdatedAt: priceDate,
      priceUpdatedBy: productData.priceUpdatedBy || 'Quản lý kho',
      priceNote: productData.priceNote || 'Khởi tạo sản phẩm mới vào kho',
      priceHistory: [
        {
          id: `ph-${Date.now()}`,
          oldPrice: productData.price,
          newPrice: productData.price,
          oldCostPrice: productData.costPrice,
          newCostPrice: productData.costPrice,
          changedAt: priceDate,
          changedBy: productData.priceUpdatedBy || 'Quản lý kho',
          reason: 'Thiết lập giá ban đầu khi thêm vào kho',
        },
      ],
      stockUpdatedAt: nowStr,
      stockHistory: [
        {
          id: `sh-${Date.now()}`,
          oldStock: 0,
          newStock: productData.stock || 0,
          changeAmount: productData.stock || 0,
          type: 'import',
          changedAt: nowStr,
          note: 'Nhập kho lô đầu tiên',
        },
      ],
    };
    products.unshift(savedProduct);
  }

  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  notifyListeners();
  return savedProduct;
};

/**
 * Fast / Quick Update specifically for Warehouse Product Stock, Selling Price, Cost Price, and Price Update Date
 */
export const quickUpdateProductStockAndPrice = (
  productId: string,
  updates: {
    stock?: number;
    price?: number;
    costPrice?: number;
    priceUpdatedAt?: string;
    priceNote?: string;
    updatedBy?: string;
    stockNote?: string;
  }
): Product | null => {
  const products = getProducts();
  const index = products.findIndex((p) => p.id === productId);
  if (index === -1) return null;

  const current = products[index];
  const nowStr = new Date().toISOString();
  const priceDate = updates.priceUpdatedAt || nowStr;
  const user = updates.updatedBy || 'Quản lý kho';

  const priceChanged = updates.price !== undefined && updates.price !== current.price;
  const costChanged = updates.costPrice !== undefined && updates.costPrice !== current.costPrice;
  const stockChanged = updates.stock !== undefined && updates.stock !== current.stock;

  const updatedPriceHistory = [...(current.priceHistory || [])];
  if (priceChanged || costChanged || updates.priceUpdatedAt) {
    updatedPriceHistory.unshift({
      id: `ph-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      oldPrice: current.price,
      newPrice: updates.price !== undefined ? updates.price : current.price,
      oldCostPrice: current.costPrice,
      newCostPrice: updates.costPrice !== undefined ? updates.costPrice : current.costPrice,
      changedAt: priceDate,
      changedBy: user,
      reason: updates.priceNote || (priceChanged ? 'Cập nhật giá bán sản phẩm' : 'Xác nhận lại ngày hiệu lực giá'),
    });
  }

  const updatedStockHistory = [...(current.stockHistory || [])];
  if (stockChanged && updates.stock !== undefined) {
    const diff = updates.stock - current.stock;
    updatedStockHistory.unshift({
      id: `sh-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      oldStock: current.stock,
      newStock: updates.stock,
      changeAmount: diff,
      type: diff > 0 ? 'import' : 'manual_update',
      changedAt: nowStr,
      changedBy: user,
      note: updates.stockNote || (diff > 0 ? `Nhập thêm kho (+${diff})` : `Điều chỉnh kiểm kê (${diff})`),
    });
  }

  const updatedProduct: Product = {
    ...current,
    stock: updates.stock !== undefined ? updates.stock : current.stock,
    price: updates.price !== undefined ? updates.price : current.price,
    costPrice: updates.costPrice !== undefined ? updates.costPrice : current.costPrice,
    priceUpdatedAt: (priceChanged || costChanged || updates.priceUpdatedAt) ? priceDate : current.priceUpdatedAt,
    priceUpdatedBy: user,
    priceNote: updates.priceNote || current.priceNote,
    priceHistory: updatedPriceHistory,
    stockUpdatedAt: stockChanged ? nowStr : current.stockUpdatedAt,
    stockHistory: updatedStockHistory,
  };

  products[index] = updatedProduct;
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  notifyListeners();
  return updatedProduct;
};

export const deleteProduct = (id: string): boolean => {
  const products = getProducts();
  const filtered = products.filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(filtered));
  notifyListeners();
  return true;
};

/**
 * Export product list and price audit history to CSV
 */
export const exportProductPriceAuditAsCsv = (productsToExport?: Product[]) => {
  const products = productsToExport || getProducts();
  const headers = [
    'Mã SKU',
    'Tên sản phẩm',
    'Danh mục',
    'Hãng / Thương hiệu',
    'Tồn kho (chiếc)',
    'Giá bán hiện tại (VNĐ)',
    'Giá vốn / nhập (VNĐ)',
    'Biên lợi nhuận (%)',
    'Ngày cập nhật giá',
    'Người cập nhật giá',
    'Ghi chú cập nhật giá',
    'Số lần thay đổi giá',
    'Mức thưởng KHBH (VNĐ)',
    'Thời hạn BH (Tháng)',
  ];

  const rows = products.map((p) => {
    const cost = p.costPrice || 0;
    const margin = p.price > 0 && cost > 0 ? (((p.price - cost) / p.price) * 100).toFixed(1) + '%' : 'N/A';
    const priceDate = p.priceUpdatedAt ? p.priceUpdatedAt.slice(0, 10) : '';
    const historyCount = (p.priceHistory || []).length;

    return [
      `"${p.sku}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category || ''}"`,
      `"${p.brand || ''}"`,
      p.stock,
      p.price,
      cost,
      `"${margin}"`,
      `"${priceDate}"`,
      `"${(p.priceUpdatedBy || '').replace(/"/g, '""')}"`,
      `"${(p.priceNote || '').replace(/"/g, '""')}"`,
      historyCount,
      p.activationBonusAmount || 0,
      p.warrantyMonths || 0,
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `OrderManager_KiemSoatGiaKho_${new Date().toISOString().slice(0, 10)}.csv`);
  link.click();
  URL.revokeObjectURL(url);
};

// --- STAFF ---
export const getStaff = (): Staff[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STAFF);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error reading staff', e);
  }
  localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(INITIAL_STAFF));
  return INITIAL_STAFF;
};

export const getActiveStaff = (): Staff => {
  const staffList = getStaff();
  const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_STAFF_ID);
  const found = staffList.find((s) => s.id === activeId || s.employeeId === activeId);
  return found || staffList[0];
};

export const setActiveStaff = (staffId: string) => {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_STAFF_ID, staffId);
  notifyListeners();
};

export const saveStaff = (staffData: Omit<Staff, 'id'> & { id?: string }): Staff => {
  const staffList = getStaff();
  let savedStaff: Staff;

  if (staffData.id) {
    const index = staffList.findIndex((s) => s.id === staffData.id);
    if (index !== -1) {
      savedStaff = { ...staffList[index], ...staffData };
      staffList[index] = savedStaff;
    } else {
      savedStaff = { ...staffData, id: `staff-${Date.now()}` };
      staffList.push(savedStaff);
    }
  } else {
    savedStaff = { ...staffData, id: `staff-${Date.now()}` };
    staffList.push(savedStaff);
  }

  localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staffList));
  notifyListeners();
  return savedStaff;
};

// --- ORDERS ---
export const getOrders = (): Order[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (data) {
      const parsed: Order[] = JSON.parse(data);
      // Ensure all orders have store and delivery coordinates and debt/payment fields populated
      return parsed.map((o, idx) => {
        const subtotal = o.subtotal !== undefined
          ? o.subtotal
          : (o.items || []).reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
        const shippingFee = o.shippingFee !== undefined ? o.shippingFee : 0;
        const totalAmount = o.totalAmount !== undefined ? o.totalAmount : subtotal + shippingFee;
        const prepaidAmount = o.prepaidAmount !== undefined ? o.prepaidAmount : 0;
        const remainingAmount = o.remainingAmount !== undefined
          ? o.remainingAmount
          : Math.max(0, totalAmount - prepaidAmount);

        let paymentStatus = o.paymentStatus;
        if (!paymentStatus) {
          if (remainingAmount <= 0) paymentStatus = 'paid';
          else if (prepaidAmount > 0) paymentStatus = 'partial';
          else paymentStatus = 'unpaid';
        }

        const paymentMethod = o.paymentMethod || (prepaidAmount > 0 ? 'bank_transfer' : 'cod');
        const isDeliveredOrDone = o.status === 'delivered' || o.status === 'completed';
        const codSettledToShop = o.codSettledToShop !== undefined
          ? o.codSettledToShop
          : (paymentStatus === 'paid' && isDeliveredOrDone);

        // Calculate default debtDueDate if not specified
        let debtDueDate = o.debtDueDate;
        if (!debtDueDate && remainingAmount > 0) {
          const baseDate = o.deliveryDate ? new Date(o.deliveryDate) : new Date(o.createdAt || Date.now());
          baseDate.setDate(baseDate.getDate() + 7);
          debtDueDate = baseDate.toISOString().slice(0, 10);
        }

        return {
          ...o,
          subtotal,
          shippingFee,
          totalAmount,
          prepaidAmount,
          remainingAmount,
          paymentStatus,
          paymentMethod,
          codSettledToShop,
          debtDueDate,
          paymentLogs: o.paymentLogs || (prepaidAmount > 0 ? [
            {
              id: `pay-init-${o.id}`,
              receiptCode: `PT-${(o.orderCode || '').replace(/[^0-9A-Z]/g, '')}-01`,
              date: o.createdAt || new Date().toISOString(),
              amount: prepaidAmount,
              method: 'bank_transfer',
              note: 'Đặt cọc / Thanh toán trước khi lên đơn',
              receivedBy: o.employeeName || 'Kế toán bán hàng',
            }
          ] : []),
          storeLat: o.storeLat || 10.7698,
          storeLng: o.storeLng || 106.6897,
          deliveryLat: o.deliveryLat || (10.775 + (idx % 6) * 0.006),
          deliveryLng: o.deliveryLng || (10.695 + (idx % 6) * 0.007),
        };
      });
    }
  } catch (e) {
    console.error('Error reading orders', e);
  }
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
  return INITIAL_ORDERS;
};

export const getNextOrderCodeForEmployee = (employeeId: string): string => {
  const orders = getOrders();
  const todayStr = new Date().toISOString().slice(0, 10);
  const empId = (employeeId || 'NV001').trim().toUpperCase();

  const empOrdersToday = orders.filter((o) => {
    const oDate = (o.createdAt || '').slice(0, 10);
    return (o.employeeId || '').toUpperCase() === empId && oDate === todayStr;
  });

  const countToday = empOrdersToday.length + 1;
  const seqStr = countToday < 10 ? `0${countToday}` : `${countToday}`;
  return `${empId}-${seqStr}`;
};

export const createOrder = (orderData: Omit<Order, 'id' | 'orderCode' | 'createdAt' | 'updatedAt' | 'totalBonusEarned'>): Order => {
  const orders = getOrders();
  const products = getProducts();

  // Generate order code strictly using format: [Mã NV]-[Số Lần Lên Đơn Trong Ngày]
  const orderCode = getNextOrderCodeForEmployee(orderData.employeeId);

  // Calculate totals and financial metrics
  const itemsSubtotal = orderData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = orderData.shippingFee || 0;
  const prepaidAmount = orderData.prepaidAmount || 0;
  const totalAmount = itemsSubtotal + shippingFee;
  const remainingAmount = Math.max(0, totalAmount - prepaidAmount);

  // Calculate total bonus earned
  let totalBonusEarned = 0;
  orderData.items.forEach((item) => {
    if (item.isWarrantyActivated) {
      totalBonusEarned += (item.activationBonusAmount || 0) * item.quantity;
    }
  });

  const initialLog: DeliveryLog = {
    id: `log-${Date.now()}-1`,
    timestamp: new Date().toISOString(),
    status: orderData.status,
    note: orderData.deliveryStaffName
      ? `Đã tạo đơn hàng & phân công giao cho Shipper ${orderData.deliveryStaffName} (${orderData.deliveryStaffId})`
      : 'Đã khởi tạo đơn hàng, chờ phân công giao hàng',
    updatedBy: orderData.employeeId,
  };

  let safeDeliveryLat = orderData.deliveryLat;
  let safeDeliveryLng = orderData.deliveryLng;

  // Auto-correct if lat & lng were inverted (Vietnam lat: ~8.5-23.4, lng: ~102.1-109.5)
  if (typeof safeDeliveryLat === 'number' && typeof safeDeliveryLng === 'number') {
    if (safeDeliveryLat > 50 && safeDeliveryLng < 30) {
      const temp = safeDeliveryLat;
      safeDeliveryLat = safeDeliveryLng;
      safeDeliveryLng = temp;
    }
  }

  const newOrder: Order = {
    ...orderData,
    id: `ord-${Date.now()}`,
    orderCode,
    storeLat: orderData.storeLat || 10.7698,
    storeLng: orderData.storeLng || 106.6897,
    deliveryLat: typeof safeDeliveryLat === 'number' && Number.isFinite(safeDeliveryLat) ? safeDeliveryLat : 10.7825,
    deliveryLng: typeof safeDeliveryLng === 'number' && Number.isFinite(safeDeliveryLng) ? safeDeliveryLng : 106.7050,
    subtotal: itemsSubtotal,
    shippingFee,
    prepaidAmount,
    totalAmount,
    remainingAmount,
    totalBonusEarned,
    deliveryLogs: orderData.deliveryLogs || [initialLog],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Deduct stock for each item in the created order automatically!
  const updatedProducts = products.map((prod) => {
    const orderItem = orderData.items.find((item) => item.productId === prod.id);
    if (orderItem) {
      const newStock = Math.max(0, prod.stock - orderItem.quantity);
      return { ...prod, stock: newStock };
    }
    return prod;
  });

  // Save updated products and new order
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
  orders.unshift(newOrder);
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));

  notifyListeners();
  return newOrder;
};

// Full save/update order with automatic stock recalculation & adjustment
export const saveOrder = (
  orderData: Omit<Order, 'createdAt' | 'updatedAt' | 'totalBonusEarned'> & { id?: string }
): Order => {
  if (!orderData.id) {
    return createOrder(orderData);
  }

  const orders = getOrders();
  const products = getProducts();
  const existingIndex = orders.findIndex((o) => o.id === orderData.id);

  if (existingIndex === -1) {
    return createOrder(orderData);
  }

  const oldOrder = orders[existingIndex];
  let updatedProducts = [...products];

  // 1. Restore stock for items in the old order
  oldOrder.items.forEach((oldItem) => {
    const pIdx = updatedProducts.findIndex((p) => p.id === oldItem.productId);
    if (pIdx !== -1) {
      updatedProducts[pIdx] = {
        ...updatedProducts[pIdx],
        stock: updatedProducts[pIdx].stock + oldItem.quantity,
      };
    }
  });

  // 2. Deduct stock for items in the new order
  orderData.items.forEach((newItem) => {
    const pIdx = updatedProducts.findIndex((p) => p.id === newItem.productId);
    if (pIdx !== -1) {
      updatedProducts[pIdx] = {
        ...updatedProducts[pIdx],
        stock: Math.max(0, updatedProducts[pIdx].stock - newItem.quantity),
      };
    }
  });

  // 3. Recalculate totals and bonus
  const itemsSubtotal = orderData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = orderData.shippingFee || 0;
  const prepaidAmount = orderData.prepaidAmount || 0;
  const totalAmount = itemsSubtotal + shippingFee;
  const remainingAmount = Math.max(0, totalAmount - prepaidAmount);

  let totalBonusEarned = 0;
  orderData.items.forEach((item) => {
    if (item.isWarrantyActivated) {
      totalBonusEarned += (item.activationBonusAmount || 0) * item.quantity;
    }
  });

  // 4. Update delivery log if status or shipper changed
  const existingLogs = oldOrder.deliveryLogs || [];
  let updatedLogs = [...existingLogs];
  if (
    oldOrder.status !== orderData.status ||
    oldOrder.deliveryStaffId !== orderData.deliveryStaffId
  ) {
    const newLog: DeliveryLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      status: orderData.status,
      note: `Đã cập nhật đơn hàng thành công (Trạng thái: ${getOrderStatusLabel(
        orderData.status
      )})`,
      updatedBy: orderData.employeeId || 'NV Quản Lý',
    };
    updatedLogs.push(newLog);
  }

  const updatedOrder: Order = {
    ...oldOrder,
    ...orderData,
    subtotal: itemsSubtotal,
    shippingFee,
    prepaidAmount,
    totalAmount,
    remainingAmount,
    totalBonusEarned,
    deliveryLogs: updatedLogs,
    updatedAt: new Date().toISOString(),
  };

  orders[existingIndex] = updatedOrder;

  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));

  notifyListeners();
  return updatedOrder;
};

export const updateOrderStatus = (orderId: string, status: OrderStatus): Order | null => {
  return updateOrderDeliveryDetails(orderId, { status });
};

export const updateOrderDeliveryDetails = (
  orderId: string,
  updates: {
    status?: OrderStatus;
    deliveryStaffId?: string;
    deliveryStaffName?: string;
    deliveryStaffPhone?: string;
    deliveryNotes?: string;
    newLogNote?: string;
    updatedBy?: string;
  }
): Order | null => {
  const orders = getOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) return null;

  const currentOrder = orders[index];
  const newStatus = updates.status || currentOrder.status;

  // Append new log entry if status changed or note was added
  const existingLogs = currentOrder.deliveryLogs || [];
  let newLogs = [...existingLogs];

  if (updates.newLogNote || updates.status !== currentOrder.status || updates.deliveryStaffId !== currentOrder.deliveryStaffId) {
    const statusText = getOrderStatusLabel(newStatus);
    const logNote = updates.newLogNote
      ? updates.newLogNote
      : `Trạng thái chuyển sang: [${statusText}]${updates.deliveryStaffName ? ` - Phân công: ${updates.deliveryStaffName}` : ''}`;

    const newLog: DeliveryLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      status: newStatus,
      note: logNote,
      updatedBy: updates.updatedBy || currentOrder.employeeId || 'Hệ thống',
    };
    newLogs.push(newLog);
  }

  orders[index] = {
    ...currentOrder,
    status: newStatus,
    deliveryStaffId: updates.deliveryStaffId !== undefined ? updates.deliveryStaffId : currentOrder.deliveryStaffId,
    deliveryStaffName: updates.deliveryStaffName !== undefined ? updates.deliveryStaffName : currentOrder.deliveryStaffName,
    deliveryStaffPhone: updates.deliveryStaffPhone !== undefined ? updates.deliveryStaffPhone : currentOrder.deliveryStaffPhone,
    deliveryNotes: updates.deliveryNotes !== undefined ? updates.deliveryNotes : currentOrder.deliveryNotes,
    deliveryLogs: newLogs,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  notifyListeners();
  return orders[index];
};

export const deleteOrder = (orderId: string): boolean => {
  const orders = getOrders();
  const filtered = orders.filter((o) => o.id !== orderId);
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(filtered));
  notifyListeners();
  return true;
};

// --- STORE INFO ---
export const getStoreInfo = (): StoreInfo => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STORE);
    if (data) {
      const parsed: StoreInfo = JSON.parse(data);
      return {
        ...parsed,
        lat: parsed.lat || 10.7698,
        lng: parsed.lng || 106.6897,
      };
    }
  } catch (e) {
    console.error('Error reading store info', e);
  }
  localStorage.setItem(STORAGE_KEYS.STORE, JSON.stringify(INITIAL_STORE_INFO));
  return INITIAL_STORE_INFO;
};

export const updateStoreInfo = (info: StoreInfo) => {
  localStorage.setItem(STORAGE_KEYS.STORE, JSON.stringify(info));
  notifyListeners();
};

// --- WARRANTY ACTIVATION BONUS CALCULATOR ---
export const getEmployeeBonusSummaries = (): EmployeeBonusSummary[] => {
  const orders = getOrders();
  const staffList = getStaff();

  // Create a map by employeeId
  const map = new Map<string, EmployeeBonusSummary>();

  // Ensure all registered staff appear in the report
  staffList.forEach((staff) => {
    map.set(staff.employeeId, {
      employeeId: staff.employeeId,
      employeeName: staff.employeeName,
      totalOrders: 0,
      completedOrders: 0,
      totalSalesValue: 0,
      totalWarrantyItemsActivated: 0,
      totalBonusEarned: 0,
    });
  });

  orders.forEach((order) => {
    const empId = order.employeeId || 'KDV';
    const empName = order.employeeName || 'Không xác định';

    if (!map.has(empId)) {
      map.set(empId, {
        employeeId: empId,
        employeeName: empName,
        totalOrders: 0,
        completedOrders: 0,
        totalSalesValue: 0,
        totalWarrantyItemsActivated: 0,
        totalBonusEarned: 0,
      });
    }

    const summary = map.get(empId)!;
    summary.totalOrders += 1;
    if (order.status !== 'cancelled' && order.status !== 'failed') {
      summary.totalSalesValue += order.totalAmount;
    }
    if (order.status === 'completed' || order.status === 'delivered') {
      summary.completedOrders += 1;
    }

    // Count warranty activated items and calculate bonus
    order.items.forEach((item) => {
      if (item.isWarrantyActivated) {
        summary.totalWarrantyItemsActivated += item.quantity;
        summary.totalBonusEarned += (item.activationBonusAmount || 0) * item.quantity;
      }
    });
  });

  return Array.from(map.values()).sort((a, b) => b.totalBonusEarned - a.totalBonusEarned);
};

// --- CATEGORIES MANAGEMENT ---
export const getCategories = (): CategoryItem[] => {
  let categories: CategoryItem[] = [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (data) {
      categories = JSON.parse(data);
    } else {
      categories = [...INITIAL_CATEGORIES];
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    }
  } catch (e) {
    console.error('Error reading categories from storage', e);
    categories = [...INITIAL_CATEGORIES];
  }

  // Ensure any unique category present in existing products is included
  const products = getProducts();
  const existingCatNames = new Set(categories.map((c) => c.name.toLowerCase()));
  let hasNewFromProducts = false;

  products.forEach((p) => {
    if (p.category && !existingCatNames.has(p.category.trim().toLowerCase())) {
      categories.push({
        id: `cat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: p.category.trim(),
        description: 'Tự động trích xuất từ danh sách sản phẩm',
      });
      existingCatNames.add(p.category.trim().toLowerCase());
      hasNewFromProducts = true;
    }
  });

  if (hasNewFromProducts) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  }

  return categories;
};

export const saveCategory = (item: { name: string; description?: string; id?: string }): CategoryItem => {
  const list = getCategories();
  let saved: CategoryItem;

  if (item.id) {
    const idx = list.findIndex((c) => c.id === item.id);
    if (idx !== -1) {
      saved = { ...list[idx], ...item };
      list[idx] = saved;
    } else {
      saved = { id: `cat-${Date.now()}`, name: item.name.trim(), description: item.description?.trim() };
      list.push(saved);
    }
  } else {
    saved = { id: `cat-${Date.now()}`, name: item.name.trim(), description: item.description?.trim() };
    list.push(saved);
  }

  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(list));
  notifyListeners();
  return saved;
};

export const deleteCategory = (id: string): boolean => {
  const list = getCategories();
  const filtered = list.filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(filtered));
  notifyListeners();
  return true;
};

// --- BRANDS MANAGEMENT ---
export const getBrands = (): BrandItem[] => {
  let brands: BrandItem[] = [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BRANDS);
    if (data) {
      brands = JSON.parse(data);
    } else {
      brands = [...INITIAL_BRANDS];
      localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(brands));
    }
  } catch (e) {
    console.error('Error reading brands from storage', e);
    brands = [...INITIAL_BRANDS];
  }

  // Ensure any unique brand present in existing products is included
  const products = getProducts();
  const existingBrandNames = new Set(brands.map((b) => b.name.toLowerCase()));
  let hasNewFromProducts = false;

  products.forEach((p) => {
    if (p.brand && !existingBrandNames.has(p.brand.trim().toLowerCase())) {
      brands.push({
        id: `brand-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: p.brand.trim(),
        description: 'Tự động trích xuất từ danh sách sản phẩm',
      });
      existingBrandNames.add(p.brand.trim().toLowerCase());
      hasNewFromProducts = true;
    }
  });

  if (hasNewFromProducts) {
    localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(brands));
  }

  return brands;
};

export const saveBrand = (item: { name: string; description?: string; id?: string }): BrandItem => {
  const list = getBrands();
  let saved: BrandItem;

  if (item.id) {
    const idx = list.findIndex((b) => b.id === item.id);
    if (idx !== -1) {
      saved = { ...list[idx], ...item };
      list[idx] = saved;
    } else {
      saved = { id: `brand-${Date.now()}`, name: item.name.trim(), description: item.description?.trim() };
      list.push(saved);
    }
  } else {
    saved = { id: `brand-${Date.now()}`, name: item.name.trim(), description: item.description?.trim() };
    list.push(saved);
  }

  localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(list));
  notifyListeners();
  return saved;
};

export const deleteBrand = (id: string): boolean => {
  const list = getBrands();
  const filtered = list.filter((b) => b.id !== id);
  localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(filtered));
  notifyListeners();
  return true;
};

// Reset option
export const resetToDemoData = () => {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
  localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(INITIAL_STAFF));
  localStorage.setItem(STORAGE_KEYS.STORE, JSON.stringify(INITIAL_STORE_INFO));
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
  localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(INITIAL_BRANDS));
  localStorage.setItem(STORAGE_KEYS.ACTIVE_STAFF_ID, INITIAL_STAFF[0].id);
  notifyListeners();
};

// ==========================================
// DATA IMPORT, EXPORT & CAPACITY METRICS
// ==========================================

export interface StorageUsageStats {
  usedBytes: number;
  usedKb: number;
  totalQuotaBytes: number;
  totalQuotaMb: number;
  percentUsed: number;
  ordersCount: number;
  ordersBytes: number;
  productsCount: number;
  staffCount: number;
  estimatedRemainingOrders: number;
}

export const getStorageUsageStats = (): StorageUsageStats => {
  let totalBytes = 0;
  let ordersBytes = 0;

  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const val = localStorage.getItem(key) || '';
      const itemBytes = (key.length + val.length) * 2; // UTF-16 approx 2 bytes per char
      totalBytes += itemBytes;
      if (key === STORAGE_KEYS.ORDERS) {
        ordersBytes = itemBytes;
      }
    }
  }

  const quotaBytes = 5 * 1024 * 1024; // Standard 5MB browser quota
  const orders = getOrders();
  const products = getProducts();
  const staff = getStaff();

  // Average order size approx 400 - 600 bytes
  const avgOrderBytes = orders.length > 0 ? Math.max(300, Math.round(ordersBytes / orders.length)) : 450;
  const remainingBytes = Math.max(0, quotaBytes - totalBytes);
  const estimatedRemainingOrders = Math.floor(remainingBytes / avgOrderBytes);

  return {
    usedBytes: totalBytes,
    usedKb: parseFloat((totalBytes / 1024).toFixed(1)),
    totalQuotaBytes: quotaBytes,
    totalQuotaMb: 5,
    percentUsed: parseFloat(((totalBytes / quotaBytes) * 100).toFixed(2)),
    ordersCount: orders.length,
    ordersBytes,
    productsCount: products.length,
    staffCount: staff.length,
    estimatedRemainingOrders,
  };
};

/**
 * Import a list of orders into the storage.
 * @param newOrders List of orders to import.
 * @param mode 'append' (add to existing) or 'overwrite' (replace all).
 * @returns { success: boolean; importedCount: number; message: string }
 */
export const importOrdersData = (
  newOrders: Partial<Order>[],
  mode: 'append' | 'overwrite' = 'append'
): { success: boolean; importedCount: number; message: string } => {
  if (!Array.isArray(newOrders) || newOrders.length === 0) {
    return { success: false, importedCount: 0, message: 'Dữ liệu không hợp lệ hoặc danh sách rỗng.' };
  }

  const existingOrders = mode === 'append' ? getOrders() : [];
  const existingCodes = new Set(existingOrders.map((o) => o.orderCode));
  const staffList = getStaff();
  const storeInfo = getStoreInfo();

  let importedCount = 0;
  const processedOrders: Order[] = [];

  newOrders.forEach((raw, idx) => {
    // Generate valid id
    const id = raw.id || `ord-imp-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`;

    // Ensure non-duplicate order code
    let orderCode = (raw.orderCode || '').trim();
    if (!orderCode) {
      const empId = raw.employeeId || 'NV001';
      orderCode = `${empId}-OLD-${String(idx + 1).padStart(3, '0')}`;
    } else if (mode === 'append' && existingCodes.has(orderCode)) {
      orderCode = `${orderCode}-${Date.now().toString().slice(-4)}`;
    }
    existingCodes.add(orderCode);

    // Items array validation
    const rawItems = Array.isArray(raw.items) && raw.items.length > 0 ? raw.items : [];
    const items: OrderItem[] = rawItems.length > 0
      ? rawItems.map((it, itIdx) => ({
          productId: it.productId || `prod-imp-${itIdx}`,
          productName: it.productName || 'Sản phẩm nạp',
          sku: it.sku || `SKU-${itIdx}`,
          price: it.price || 1000000,
          quantity: it.quantity || 1,
          isWarrantyActivated: it.isWarrantyActivated ?? true,
          warrantyMonths: it.warrantyMonths ?? 12,
          activationBonusAmount: it.activationBonusAmount ?? 100000,
        }))
      : [
          {
            productId: 'prod-1',
            productName: 'iPhone 15 Pro Max 256GB Titurium',
            sku: 'IP15PM-256',
            price: 29990000,
            quantity: 1,
            isWarrantyActivated: true,
            warrantyMonths: 12,
            activationBonusAmount: 150000,
          },
        ];

    const subtotal = raw.subtotal || items.reduce((s: number, it: OrderItem) => s + (it.price || 0) * (it.quantity || 1), 0);
    const shippingFee = raw.shippingFee ?? 30000;
    const prepaidAmount = raw.prepaidAmount ?? 0;
    const totalAmount = raw.totalAmount || (subtotal + shippingFee);
    const remainingAmount = raw.remainingAmount ?? Math.max(0, totalAmount - prepaidAmount);

    let totalBonusEarned = 0;
    items.forEach((it) => {
      if (it.isWarrantyActivated) {
        totalBonusEarned += (it.activationBonusAmount || 0) * (it.quantity || 1);
      }
    });

    const storeLat = raw.storeLat ?? storeInfo.lat ?? 10.7698;
    const storeLng = raw.storeLng ?? storeInfo.lng ?? 106.6897;

    // Delivery coordinates with HCMC fallback jitter if missing
    const deliveryLat = raw.deliveryLat ?? (10.772 + (idx % 10) * 0.005);
    const deliveryLng = raw.deliveryLng ?? (10.690 + (idx % 10) * 0.006);

    const empId = raw.employeeId || 'NV001';
    const foundStaff = staffList.find((s) => s.employeeId === empId);
    const employeeName = raw.employeeName || (foundStaff ? foundStaff.employeeName : 'Nguyễn Văn An');

    const createdAt = raw.createdAt || new Date(Date.now() - (idx + 1) * 86400000 * 3).toISOString();
    const dateStr = createdAt.slice(0, 10);

    const order: Order = {
      id,
      orderCode,
      customerName: raw.customerName || `Khách hàng cũ #${idx + 1}`,
      customerPhone: raw.customerPhone || `090${String(1000000 + idx).slice(0, 7)}`,
      deliveryAddress: raw.deliveryAddress || 'Số 120 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP.HCM',
      deliveryLat,
      deliveryLng,
      storeLat,
      storeLng,
      employeeId: empId,
      employeeName,
      items,
      subtotal,
      shippingFee,
      prepaidAmount,
      totalAmount,
      remainingAmount,
      totalBonusEarned,
      paymentStatus: raw.paymentStatus || (remainingAmount <= 0 ? 'paid' : prepaidAmount > 0 ? 'partial' : 'unpaid'),
      paymentMethod: raw.paymentMethod || (prepaidAmount > 0 ? 'bank_transfer' : 'cod'),
      debtDueDate: raw.debtDueDate || (remainingAmount > 0 ? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) : undefined),
      codSettledToShop: raw.codSettledToShop !== undefined ? raw.codSettledToShop : (remainingAmount <= 0),
      paymentLogs: raw.paymentLogs || (prepaidAmount > 0 ? [{
        id: `pay-import-${id}`,
        receiptCode: `PT-IMP-${idx + 1}`,
        date: createdAt,
        amount: prepaidAmount,
        method: 'bank_transfer',
        note: 'Tiền đã thanh toán / cọc trước',
        receivedBy: employeeName,
      }] : []),
      deliveryDate: raw.deliveryDate || dateStr,
      deliveryTime: raw.deliveryTime || '09:00 - 11:30',
      deliveryStaffId: raw.deliveryStaffId || 'NV004',
      deliveryStaffName: raw.deliveryStaffName || 'Phạm Quốc Việt',
      deliveryStaffPhone: raw.deliveryStaffPhone || '0977118899',
      deliveryNotes: raw.deliveryNotes || 'Đơn hàng cũ đã nhập vào hệ thống',
      deliveryLogs: raw.deliveryLogs || [
        {
          id: `log-${Date.now()}-${idx}`,
          timestamp: createdAt,
          status: (raw.status as OrderStatus) || 'delivered',
          note: 'Đã hoàn tất giao hàng thành công',
          updatedBy: raw.deliveryStaffName || 'Phạm Quốc Việt',
        },
      ],
      estimatedDeliveryWindow: raw.estimatedDeliveryWindow || 'Sáng (08:00 - 12:00)',
      status: (raw.status as OrderStatus) || 'delivered',
      notes: raw.notes || 'Dữ liệu đơn hàng cũ được nạp vào hệ thống',
      createdAt,
      updatedAt: raw.updatedAt || createdAt,
    };

    processedOrders.push(order);
    importedCount++;
  });

  const finalOrders = mode === 'append' ? [...existingOrders, ...processedOrders] : processedOrders;

  try {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(finalOrders));
    notifyListeners();
    return {
      success: true,
      importedCount,
      message: `Đã nạp thành công ${importedCount} đơn hàng vào hệ thống!`,
    };
  } catch (err) {
    console.error('Failed to save imported orders', err);
    return {
      success: false,
      importedCount: 0,
      message: 'Lỗi bộ nhớ: Dữ liệu quá lớn vượt quá dung lượng cho phép của trình duyệt.',
    };
  }
};

export const getStaffList = (): Staff[] => {
  return getStaff();
};

export const saveStaffList = (staffList: Staff[]) => {
  localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staffList));
  notifyListeners();
};

export const saveOrders = (orders: Order[]) => {
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  notifyListeners();
};

export const saveProducts = (products: Product[]) => {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  notifyListeners();
};

export const saveStoreInfo = (info: StoreInfo) => {
  updateStoreInfo(info);
};

/**
 * Generate 15 rich historical orders from past months for testing and demo reporting
 */
export const generateHistoricalOrders = (): Order[] => {
  const storeInfo = getStoreInfo();
  const staffList = getStaff();
  const sLat = storeInfo.lat || 10.7698;
  const sLng = storeInfo.lng || 106.6897;

  const mockHistoricalData: any[] = [
    {
      orderCode: 'NV001-H01',
      customerName: 'Trịnh Thùy Linh',
      customerPhone: '0903881223',
      deliveryAddress: '320 Hai Bà Trưng, Phường Tân Định, Quận 1, TP.HCM',
      deliveryLat: 10.7915,
      deliveryLng: 106.6908,
      employeeId: 'NV001',
      employeeName: 'Nguyễn Văn An',
      status: 'delivered',
      createdAt: '2026-08-15T09:30:00.000Z',
      items: [
        {
          productId: 'prod-1',
          productName: 'iPhone 15 Pro Max 256GB Titurium',
          sku: 'IP15PM-256',
          price: 29990000,
          quantity: 1,
          isWarrantyActivated: true,
          activationBonusAmount: 150000,
        },
      ],
    },
    {
      orderCode: 'NV002-H02',
      customerName: 'Bùi Anh Tuấn',
      customerPhone: '0912445588',
      deliveryAddress: '15 Tôn Đức Thắng, Phường Bến Nghé, Quận 1, TP.HCM',
      deliveryLat: 10.7769,
      deliveryLng: 106.7061,
      employeeId: 'NV002',
      employeeName: 'Trần Thị Bình',
      status: 'delivered',
      createdAt: '2026-08-20T14:15:00.000Z',
      items: [
        {
          productId: 'prod-2',
          productName: 'Laptop Dell XPS 13 Plus 9320 Core i7',
          sku: 'DELL-XPS13',
          price: 35500000,
          quantity: 1,
          isWarrantyActivated: true,
          activationBonusAmount: 250000,
        },
      ],
    },
    {
      orderCode: 'NV001-H03',
      customerName: 'Lương Minh Trí',
      customerPhone: '0988771122',
      deliveryAddress: '88 Nguyễn Đình Chiểu, Phường Đa Kao, Quận 1, TP.HCM',
      deliveryLat: 10.7852,
      deliveryLng: 106.6985,
      employeeId: 'NV001',
      employeeName: 'Nguyễn Văn An',
      status: 'delivered',
      createdAt: '2026-08-28T10:00:00.000Z',
      items: [
        {
          productId: 'prod-4',
          productName: 'Tai nghe Apple AirPods Pro 2 MagSafe (USB-C)',
          sku: 'APP2-USBC',
          price: 5690000,
          quantity: 2,
          isWarrantyActivated: true,
          activationBonusAmount: 50000,
        },
      ],
    },
    {
      orderCode: 'NV002-H04',
      customerName: 'Đỗ Hải Đăng',
      customerPhone: '0933445566',
      deliveryAddress: '54 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM',
      deliveryLat: 10.7745,
      deliveryLng: 106.7022,
      employeeId: 'NV002',
      employeeName: 'Trần Thị Bình',
      status: 'delivered',
      createdAt: '2026-09-02T16:20:00.000Z',
      items: [
        {
          productId: 'prod-3',
          productName: 'Smart TV Samsung 4K 55 inch QLED',
          sku: 'SS-TV55-4K',
          price: 14200000,
          quantity: 1,
          isWarrantyActivated: true,
          activationBonusAmount: 200000,
        },
      ],
    },
    {
      orderCode: 'NV001-H05',
      customerName: 'Vũ Thị Thanh Thảo',
      customerPhone: '0977889900',
      deliveryAddress: '246 Pasteur, Phường Võ Thị Sáu, Quận 3, TP.HCM',
      deliveryLat: 10.7891,
      deliveryLng: 106.6872,
      employeeId: 'NV001',
      employeeName: 'Nguyễn Văn An',
      status: 'delivered',
      createdAt: '2026-09-10T11:45:00.000Z',
      items: [
        {
          productId: 'prod-5',
          productName: 'Bàn phím cơ Logitech MX Mechanical Wireless',
          sku: 'LOGI-MX-MECH',
          price: 3890000,
          quantity: 1,
          isWarrantyActivated: false,
          activationBonusAmount: 0,
        },
      ],
    },
    {
      orderCode: 'NV002-H06',
      customerName: 'Mai Quốc Huy',
      customerPhone: '0902113355',
      deliveryAddress: '123 CMT8, Phường 5, Quận 3, TP.HCM',
      deliveryLat: 10.7812,
      deliveryLng: 106.6789,
      employeeId: 'NV002',
      employeeName: 'Trần Thị Bình',
      status: 'delivered',
      createdAt: '2026-09-18T13:30:00.000Z',
      items: [
        {
          productId: 'prod-1',
          productName: 'iPhone 15 Pro Max 256GB Titurium',
          sku: 'IP15PM-256',
          price: 29990000,
          quantity: 1,
          isWarrantyActivated: true,
          activationBonusAmount: 150000,
        },
        {
          productId: 'prod-4',
          productName: 'Tai nghe Apple AirPods Pro 2 MagSafe (USB-C)',
          sku: 'APP2-USBC',
          price: 5690000,
          quantity: 1,
          isWarrantyActivated: true,
          activationBonusAmount: 50000,
        },
      ],
    },
    {
      orderCode: 'NV001-H07',
      customerName: 'Phan Thị Mai Lan',
      customerPhone: '0918776655',
      deliveryAddress: '72 Lê Thánh Tôn, Phường Bến Nghé, Quận 1, TP.HCM',
      deliveryLat: 10.7772,
      deliveryLng: 106.7029,
      employeeId: 'NV001',
      employeeName: 'Nguyễn Văn An',
      status: 'delivered',
      createdAt: '2026-09-25T15:10:00.000Z',
      items: [
        {
          productId: 'prod-2',
          productName: 'Laptop Dell XPS 13 Plus 9320 Core i7',
          sku: 'DELL-XPS13',
          price: 35500000,
          quantity: 1,
          isWarrantyActivated: true,
          activationBonusAmount: 250000,
        },
      ],
    },
    {
      orderCode: 'NV002-H08',
      customerName: 'Nguyễn Tấn Đạt',
      customerPhone: '0938123987',
      deliveryAddress: '450 Điện Biên Phủ, Phường 21, Bình Thạnh, TP.HCM',
      deliveryLat: 10.7995,
      deliveryLng: 106.7145,
      employeeId: 'NV002',
      employeeName: 'Trần Thị Bình',
      status: 'delivered',
      createdAt: '2026-10-01T08:50:00.000Z',
      items: [
        {
          productId: 'prod-3',
          productName: 'Smart TV Samsung 4K 55 inch QLED',
          sku: 'SS-TV55-4K',
          price: 14200000,
          quantity: 2,
          isWarrantyActivated: true,
          activationBonusAmount: 200000,
        },
      ],
    },
    {
      orderCode: 'NV001-H09',
      customerName: 'Hà Thị Bích Ngọc',
      customerPhone: '0945678912',
      deliveryAddress: '68 Hoàng Diệu, Phường 12, Quận 4, TP.HCM',
      deliveryLat: 10.7635,
      deliveryLng: 106.7051,
      employeeId: 'NV001',
      employeeName: 'Nguyễn Văn An',
      status: 'delivered',
      createdAt: '2026-10-05T10:15:00.000Z',
      items: [
        {
          productId: 'prod-1',
          productName: 'iPhone 15 Pro Max 256GB Titurium',
          sku: 'IP15PM-256',
          price: 29990000,
          quantity: 1,
          isWarrantyActivated: true,
          activationBonusAmount: 150000,
        },
      ],
    },
    {
      orderCode: 'NV002-H10',
      customerName: 'Trần Đại Nghĩa',
      customerPhone: '0966332211',
      deliveryAddress: '19 Nguyễn Thị Minh Khai, Quận 1, TP.HCM',
      deliveryLat: 10.7871,
      deliveryLng: 106.7011,
      employeeId: 'NV002',
      employeeName: 'Trần Thị Bình',
      status: 'delivered',
      createdAt: '2026-10-08T16:00:00.000Z',
      items: [
        {
          productId: 'prod-4',
          productName: 'Tai nghe Apple AirPods Pro 2 MagSafe (USB-C)',
          sku: 'APP2-USBC',
          price: 5690000,
          quantity: 1,
          isWarrantyActivated: true,
          activationBonusAmount: 50000,
        },
      ],
    },
  ];

  return mockHistoricalData.map((raw: any, idx) => {
    const items: OrderItem[] = (raw.items || []).map((it: any) => ({
      productId: it.productId,
      productName: it.productName,
      sku: it.sku,
      price: it.price,
      quantity: it.quantity,
      isWarrantyActivated: it.isWarrantyActivated,
      warrantyMonths: it.warrantyMonths || 12,
      activationBonusAmount: it.activationBonusAmount || 0,
    }));

    const dateStr = raw.createdAt.slice(0, 10);
    const subtotal = items.reduce((s: number, it: OrderItem) => s + it.price * it.quantity, 0);

    return {
      id: `ord-hist-${idx + 1}`,
      orderCode: raw.orderCode || `NV001-H${idx + 1}`,
      customerName: raw.customerName,
      customerPhone: raw.customerPhone,
      deliveryAddress: raw.deliveryAddress,
      deliveryLat: raw.deliveryLat || 10.775,
      deliveryLng: raw.deliveryLng || 10.702,
      storeLat: sLat,
      storeLng: sLng,
      employeeId: raw.employeeId || 'NV001',
      employeeName: raw.employeeName || 'Nguyễn Văn An',
      items,
      subtotal,
      shippingFee: 30000,
      prepaidAmount: 0,
      totalAmount: subtotal + 30000,
      remainingAmount: subtotal + 30000,
      totalBonusEarned: items.reduce(
        (s: number, it: OrderItem) => s + (it.isWarrantyActivated ? (it.activationBonusAmount || 0) * it.quantity : 0),
        0
      ),
      deliveryDate: dateStr,
      deliveryTime: '09:00 - 11:30',
      deliveryStaffId: idx % 2 === 0 ? 'NV004' : 'NV005',
      deliveryStaffName: idx % 2 === 0 ? 'Phạm Quốc Việt' : 'Võ Văn Cường',
      deliveryStaffPhone: idx % 2 === 0 ? '0977118899' : '0909888777',
      deliveryNotes: 'Giao hàng hoàn tất theo lịch trình',
      deliveryLogs: [
        {
          id: `log-hist-${idx}`,
          timestamp: raw.createdAt,
          status: (raw.status as OrderStatus) || 'delivered',
          note: 'Khách đã nhận hàng và thanh toán đủ',
          updatedBy: idx % 2 === 0 ? 'Phạm Quốc Việt' : 'Võ Văn Cường',
        },
      ],
      estimatedDeliveryWindow: 'Sáng (08:00 - 12:00)',
      status: (raw.status as OrderStatus) || 'delivered',
      notes: 'Đơn hàng cũ lịch sử',
      createdAt: raw.createdAt,
      updatedAt: raw.createdAt,
    };
  });
};

/**
 * Export orders as JSON file download
 */
export const exportOrdersAsJson = () => {
  const orders = getOrders();
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(orders, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute('href', dataStr);
  dlAnchor.setAttribute('download', `OrderManager_Orders_${new Date().toISOString().slice(0, 10)}.json`);
  dlAnchor.click();
};

/**
 * Export orders as CSV file download (with UTF-8 BOM for Excel)
 */
export const exportOrdersAsCsv = () => {
  const orders = getOrders();
  const headers = [
    'Mã đơn',
    'Ngày tạo',
    'Khách hàng',
    'Số điện thoại',
    'Địa chỉ nhận hàng',
    'NV Bán hàng (Mã)',
    'NV Bán hàng (Tên)',
    'Shipper',
    'Sản phẩm',
    'Tiền hàng',
    'Phí ship',
    'Đã đặt cọc',
    'Tổng cộng',
    'Còn lại (COD)',
    'Hoa hồng bảo hành',
    'Trạng thái',
  ];

  const rows = orders.map((o) => {
    const itemsSummary = o.items.map((i) => `${i.productName} (x${i.quantity})`).join('; ');
    return [
      `"${o.orderCode}"`,
      `"${o.createdAt.slice(0, 10)}"`,
      `"${o.customerName.replace(/"/g, '""')}"`,
      `"${o.customerPhone}"`,
      `"${o.deliveryAddress.replace(/"/g, '""')}"`,
      `"${o.employeeId}"`,
      `"${o.employeeName}"`,
      `"${o.deliveryStaffName || ''}"`,
      `"${itemsSummary.replace(/"/g, '""')}"`,
      o.subtotal,
      o.shippingFee,
      o.prepaidAmount,
      o.totalAmount,
      o.remainingAmount,
      o.totalBonusEarned,
      `"${getOrderStatusLabel(o.status)}"`,
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `OrderManager_DonHang_${new Date().toISOString().slice(0, 10)}.csv`);
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Download sample CSV template for importing past orders
 */
export const downloadSampleTemplateCsv = () => {
  const sampleCsv =
    '\uFEFF' +
    'Mã đơn,Ngày tạo (YYYY-MM-DD),Khách hàng,Số điện thoại,Địa chỉ nhận hàng,Mã NV bán,Tên NV bán,Tên sản phẩm,Đơn giá,Số lượng,Phí ship,Đã cọc,Trạng thái\r\n' +
    'NV001-CU01,2026-08-10,Trần Văn Minh,0909123456,120 Hai Bà Trưng Q1 TP.HCM,NV001,Nguyễn Văn An,iPhone 15 Pro Max 256GB,29990000,1,30000,0,delivered\r\n' +
    'NV002-CU02,2026-08-15,Lê Thị Hằng,0912987654,45 Tôn Đức Thắng Q1 TP.HCM,NV002,Trần Thị Bình,Laptop Dell XPS 13 Plus,35500000,1,30000,5000000,delivered\r\n' +
    'NV001-CU03,2026-09-01,Phạm Văn Nam,0988654321,88 Nguyễn Đình Chiểu Q3 TP.HCM,NV001,Nguyễn Văn An,Smart TV Samsung 4K 55 inch,14200000,1,50000,0,delivered\r\n';

  const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'Mau_Nap_Don_Hang_Cu_OrderManager.csv');
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Record a debt payment for an order (Thu nợ / Ghi nhận thanh toán)
 */
export const recordDebtPayment = (
  orderId: string,
  payment: {
    amount: number;
    method: 'cash' | 'bank_transfer' | 'card' | 'momo_vnpay';
    note?: string;
    receivedBy: string;
    receiptCode?: string;
    date?: string;
  }
): Order | null => {
  const orders = getOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) return null;

  const currentOrder = orders[index];
  const paidAmount = Math.max(0, Number(payment.amount) || 0);
  if (paidAmount <= 0) return null;

  const receiptCode =
    payment.receiptCode && payment.receiptCode.trim()
      ? payment.receiptCode.trim().toUpperCase()
      : `PT-${Date.now().toString().slice(-6)}`;

  const newLog: PaymentLog = {
    id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    receiptCode,
    date: payment.date || new Date().toISOString(),
    amount: paidAmount,
    method: payment.method,
    note: payment.note || 'Thu hồi công nợ',
    receivedBy: payment.receivedBy || 'Kế toán',
  };

  const existingLogs = currentOrder.paymentLogs || [];
  const updatedPrepaid = (currentOrder.prepaidAmount || 0) + paidAmount;
  const updatedRemaining = Math.max(0, currentOrder.totalAmount - updatedPrepaid);

  let newPaymentStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
  if (updatedRemaining <= 0) {
    newPaymentStatus = 'paid';
  } else if (updatedPrepaid > 0) {
    newPaymentStatus = 'partial';
  }

  // If fully paid and status was delivered/completed, mark shipper COD as settled as well
  const isDelivered = currentOrder.status === 'delivered' || currentOrder.status === 'completed';
  const updatedCodSettled = newPaymentStatus === 'paid' && isDelivered ? true : currentOrder.codSettledToShop;

  const updatedOrder: Order = {
    ...currentOrder,
    prepaidAmount: updatedPrepaid,
    remainingAmount: updatedRemaining,
    paymentStatus: newPaymentStatus,
    codSettledToShop: updatedCodSettled,
    paymentLogs: [newLog, ...existingLogs],
    updatedAt: new Date().toISOString(),
  };

  orders[index] = updatedOrder;
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  notifyListeners();
  return updatedOrder;
};

/**
 * Update debt due date for an order (Cập nhật ngày hẹn trả nợ)
 */
export const updateOrderDebtDueDate = (orderId: string, debtDueDate: string): Order | null => {
  const orders = getOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) return null;

  const updatedOrder: Order = {
    ...orders[index],
    debtDueDate,
    updatedAt: new Date().toISOString(),
  };

  orders[index] = updatedOrder;
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  notifyListeners();
  return updatedOrder;
};

/**
 * Settle shipper COD for an order (Shipper nộp tiền COD về quỹ cửa hàng)
 */
export const settleShipperCod = (
  orderId: string,
  settledBy: string = 'Kế toán',
  note?: string
): Order | null => {
  const orders = getOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) return null;

  const currentOrder = orders[index];
  const nowStr = new Date().toISOString();

  let updatedPaymentLogs = currentOrder.paymentLogs || [];
  let updatedPrepaid = currentOrder.prepaidAmount || 0;
  let updatedRemaining = currentOrder.remainingAmount || 0;
  let updatedPaymentStatus = currentOrder.paymentStatus || 'unpaid';

  if (updatedRemaining > 0 && (currentOrder.status === 'delivered' || currentOrder.status === 'completed')) {
    const newReceipt: PaymentLog = {
      id: `cod-settle-${Date.now()}`,
      receiptCode: `PT-COD-${Date.now().toString().slice(-6)}`,
      date: nowStr,
      amount: updatedRemaining,
      method: 'cash',
      note: note || `Shipper ${currentOrder.deliveryStaffName || ''} nộp tiền COD về quỹ`,
      receivedBy: settledBy,
    };
    updatedPaymentLogs = [newReceipt, ...updatedPaymentLogs];
    updatedPrepaid += updatedRemaining;
    updatedRemaining = 0;
    updatedPaymentStatus = 'paid';
  }

  const updatedOrder: Order = {
    ...currentOrder,
    prepaidAmount: updatedPrepaid,
    remainingAmount: updatedRemaining,
    paymentStatus: updatedPaymentStatus,
    codSettledToShop: true,
    codSettledDate: nowStr,
    codSettledBy: settledBy,
    paymentLogs: updatedPaymentLogs,
    updatedAt: nowStr,
  };

  orders[index] = updatedOrder;
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  notifyListeners();
  return updatedOrder;
};

/**
 * Batch settle shipper COD for multiple orders
 */
export const batchSettleShipperCod = (orderIds: string[], settledBy: string = 'Kế toán'): number => {
  let count = 0;
  for (const id of orderIds) {
    if (settleShipperCod(id, settledBy)) {
      count++;
    }
  }
  return count;
};

/**
 * Export debt list as CSV
 */
export const exportDebtListAsCsv = (orders: Order[]) => {
  const headers = [
    'Mã đơn hàng',
    'Ngày đặt hàng',
    'Khách hàng',
    'Số điện thoại',
    'Địa chỉ nhận hàng',
    'Nhân viên bán',
    'Shipper phụ trách',
    'Tổng tiền đơn (VNĐ)',
    'Đã thanh toán / Cọc (VNĐ)',
    'Số tiền còn nợ (VNĐ)',
    'Hạn thanh toán',
    'Trạng thái nợ',
    'Trạng thái đơn hàng',
    'Shipper đã nộp COD',
  ];

  const todayStr = new Date().toISOString().slice(0, 10);

  const rows = orders.map((o) => {
    const isOverdue = (o.remainingAmount || 0) > 0 && o.debtDueDate && o.debtDueDate < todayStr;
    const debtStatusText =
      (o.remainingAmount || 0) <= 0
        ? 'Đã tất toán'
        : isOverdue
        ? 'Quá hạn thanh toán'
        : 'Trong hạn nợ';

    const codStatusText =
      (o.status === 'delivered' || o.status === 'completed')
        ? (o.codSettledToShop ? 'Đã nộp quỹ' : 'Shipper chưa nộp')
        : 'Chưa giao';

    return [
      `"${o.orderCode}"`,
      `"${(o.createdAt || '').slice(0, 10)}"`,
      `"${(o.customerName || '').replace(/"/g, '""')}"`,
      `"${o.customerPhone || ''}"`,
      `"${(o.deliveryAddress || '').replace(/"/g, '""')}"`,
      `"${o.employeeName || o.employeeId}"`,
      `"${o.deliveryStaffName || 'Chưa phân công'}"`,
      o.totalAmount || 0,
      o.prepaidAmount || 0,
      o.remainingAmount || 0,
      `"${o.debtDueDate || 'Không hẹn'}"`,
      `"${debtStatusText}"`,
      `"${getOrderStatusLabel(o.status)}"`,
      `"${codStatusText}"`,
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `OrderManager_SoCongNo_${new Date().toISOString().slice(0, 10)}.csv`);
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Export Revenue Report as CSV
 */
export const exportRevenueReportAsCsv = (periodLabel: string, orders: Order[]) => {
  const headers = [
    'Mã đơn hàng',
    'Ngày hoàn thành / Ngày đặt',
    'Khách hàng',
    'Số điện thoại',
    'Nhân viên bán',
    'Sản phẩm trong đơn',
    'Tiền hàng (Subtotal)',
    'Phí ship',
    'Tổng doanh thu đơn (VNĐ)',
    'Đã thu thực tế (VNĐ)',
    'Còn nợ (VNĐ)',
    'Thưởng kích hoạt BH (VNĐ)',
    'Hình thức thanh toán',
    'Trạng thái',
  ];

  const rows = orders.map((o) => {
    const itemsSummary = (o.items || [])
      .map((it) => `${it.productName} (x${it.quantity})`)
      .join('; ');

    return [
      `"${o.orderCode}"`,
      `"${(o.deliveryDate || o.createdAt || '').slice(0, 10)}"`,
      `"${(o.customerName || '').replace(/"/g, '""')}"`,
      `"${o.customerPhone || ''}"`,
      `"${o.employeeName || o.employeeId}"`,
      `"${itemsSummary.replace(/"/g, '""')}"`,
      o.subtotal || o.totalAmount,
      o.shippingFee || 0,
      o.totalAmount,
      o.prepaidAmount || 0,
      o.remainingAmount || 0,
      o.totalBonusEarned || 0,
      `"${o.paymentMethod || 'cod'}"`,
      `"${getOrderStatusLabel(o.status)}"`,
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `OrderManager_BaoCaoDoanhThu_${periodLabel}_${new Date().toISOString().slice(0, 10)}.csv`);
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Export Sales Team & Employee Revenue Report as CSV
 */
export const exportSalesTeamReportAsCsv = (
  periodLabel: string,
  staffStats: Array<{
    employeeId: string;
    employeeName: string;
    role: string;
    totalOrders: number;
    completedOrders: number;
    deliveringOrders: number;
    cancelledOrders: number;
    successRate: number;
    realizedRevenue: number;
    inFlightRevenue: number;
    totalRevenue: number;
    contributionShare: number;
    averageOrderValue: number;
    totalBonusEarned: number;
  }>
) => {
  const headers = [
    'Xếp hạng',
    'Mã NV',
    'Tên Nhân Viên',
    'Bộ phận / Vai trò',
    'Tổng số đơn',
    'Đơn hoàn thành',
    'Đơn đang giao',
    'Đơn hủy',
    'Tỷ lệ thành công (%)',
    'Doanh thu thực tế (VNĐ)',
    'Doanh thu đang giao (VNĐ)',
    'Tổng doanh thu tạo ra (VNĐ)',
    'Tỷ lệ đóng góp Team Sale (%)',
    'Giá trị TB / đơn AOV (VNĐ)',
    'Thưởng kích hoạt BH (VNĐ)',
  ];

  const rows = staffStats.map((s, idx) => {
    return [
      idx + 1,
      `"${s.employeeId}"`,
      `"${(s.employeeName || '').replace(/"/g, '""')}"`,
      `"${s.role}"`,
      s.totalOrders,
      s.completedOrders,
      s.deliveringOrders,
      s.cancelledOrders,
      `"${s.successRate}%"`,
      s.realizedRevenue,
      s.inFlightRevenue,
      s.totalRevenue,
      `"${s.contributionShare}%"`,
      Math.round(s.averageOrderValue),
      s.totalBonusEarned,
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `OrderManager_DoanhThu_TeamSale_${periodLabel}_${new Date().toISOString().slice(0, 10)}.csv`);
  link.click();
  URL.revokeObjectURL(url);
};


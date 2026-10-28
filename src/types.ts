export type OrderStatus =
  | 'pending'
  | 'pending_pickup'
  | 'delivering'
  | 'in_transit'
  | 'completed'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export interface DeliveryLog {
  id: string;
  timestamp: string; // ISO String or formatted timestamp
  status: OrderStatus;
  note: string;
  updatedBy?: string;
  location?: string;
}

export interface PriceChangeRecord {
  id: string;
  oldPrice: number;
  newPrice: number;
  oldCostPrice?: number;
  newCostPrice?: number;
  changedAt: string; // ISO String or YYYY-MM-DD
  changedBy?: string; // Tên hoặc Mã nhân viên cập nhật
  reason?: string; // Lý do thay đổi giá (VD: Hãng tăng giá, Đợt khuyến mãi, Cập nhật giá định kỳ...)
}

export interface StockChangeRecord {
  id: string;
  oldStock: number;
  newStock: number;
  changeAmount: number; // e.g. +10 hoặc -2
  type: 'import' | 'manual_update' | 'order_deduct' | 'audit_adjustment';
  changedAt: string;
  changedBy?: string;
  note?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
  price: number; // in VNĐ (Giá bán niêm yết hiện tại)
  costPrice?: number; // in VNĐ (Giá vốn / Giá nhập kho để tính lợi nhuận)
  category: string;
  brand?: string; // Brand / Manufacturer (Hãng sản xuất)
  isWarrantyEligible: boolean;
  warrantyMonths: number;
  activationBonusAmount: number; // Tiền thưởng kích hoạt bảo hành per unit (VNĐ)
  description?: string;
  minStockAlert?: number;
  createdAt: string;

  // Thuộc tính kiểm soát giá & biến động giá
  priceUpdatedAt?: string; // Ngày giờ cập nhật giá gần nhất (ISO String)
  priceUpdatedBy?: string; // Người cập nhật giá gần nhất
  priceNote?: string; // Ghi chú về lần đổi giá gần nhất
  priceHistory?: PriceChangeRecord[]; // Lịch sử các lần thay đổi giá

  // Thuộc tính kiểm soát kho
  stockUpdatedAt?: string; // Ngày giờ cập nhật số lượng kho gần nhất
  stockHistory?: StockChangeRecord[]; // Lịch sử biến động tồn kho
}

export interface CategoryItem {
  id: string;
  name: string;
  description?: string;
}

export interface BrandItem {
  id: string;
  name: string;
  description?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  price: number;
  quantity: number;
  isWarrantyActivated: boolean; // Trạng thái kích hoạt bảo hành
  warrantyMonths: number;
  activationBonusAmount: number; // Tiền thưởng kích hoạt thực tế cho mục này per unit
}

export interface Order {
  id: string;
  orderCode: string; // e.g. ORD-2026-001
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryLat?: number; // Vĩ độ điểm giao hàng của khách
  deliveryLng?: number; // Kinh độ điểm giao hàng của khách
  storeLat?: number; // Vĩ độ kho/cửa hàng
  storeLng?: number; // Kinh độ kho/cửa hàng
  departureLocationId?: string; // ID điểm xuất phát đã chọn
  departureLocationName?: string; // Tên điểm xuất phát (Kho Chính, Chi nhánh...)
  departureAddress?: string; // Địa chỉ điểm xuất phát
  employeeId: string; // Mã nhân viên (e.g. NV001)
  employeeName: string; // Tên nhân viên (e.g. Nguyễn Văn Minh)
  items: OrderItem[];
  subtotal?: number; // Tổng giá tiền hàng (VNĐ)
  shippingFee?: number; // Phí vận chuyển (VNĐ)
  prepaidAmount?: number; // Số tiền đã thanh toán trước / đặt cọc (VNĐ)
  totalAmount: number; // Tổng giá trị đơn hàng = subtotal + shippingFee (VNĐ)
  remainingAmount?: number; // Số tiền còn lại cần thu COD = totalAmount - prepaidAmount
  totalBonusEarned: number; // Tổng tiền thưởng kích hoạt bảo hành đơn này (VNĐ)
  deliveryDate: string; // YYYY-MM-DD
  deliveryTime: string; // e.g., "09:00 - 11:30"
  deliveryStaffId?: string; // Mã NV giao hàng (e.g. NV004)
  deliveryStaffName?: string; // Tên NV giao hàng (e.g. Phạm Quốc Việt)
  deliveryStaffPhone?: string; // SĐT NV giao hàng
  deliveryNotes?: string; // Ghi chú lộ trình giao hàng
  deliveryLogs?: DeliveryLog[]; // Lịch sử lộ trình cập nhật
  estimatedDeliveryWindow?: string; // Khung giờ dự kiến
  paymentStatus?: 'paid' | 'partial' | 'unpaid'; // Trạng thái thanh toán công nợ
  paymentMethod?: 'cod' | 'bank_transfer' | 'cash' | 'card' | 'installment' | 'debt'; // Hình thức thanh toán chính
  debtDueDate?: string; // Hạn chót thanh toán công nợ (YYYY-MM-DD)
  codSettledToShop?: boolean; // Shipper đã nộp tiền COD về quỹ cửa hàng chưa
  codSettledDate?: string; // Ngày giờ shipper nộp COD
  codSettledBy?: string; // Người xác nhận nhận tiền COD
  paymentLogs?: PaymentLog[]; // Lịch sử các lần thu nợ / đặt cọc
  status: OrderStatus;
  notes?: string;
  createdAt: string; // ISO String
  updatedAt: string;
}

export interface PaymentLog {
  id: string;
  receiptCode?: string; // Mã phiếu thu (PT-001)
  date: string; // ISO String or YYYY-MM-DD
  amount: number; // Số tiền đã thu (VNĐ)
  method: 'cash' | 'bank_transfer' | 'card' | 'momo_vnpay';
  note?: string; // Ghi chú thu tiền
  receivedBy: string; // Người thu tiền (Kế toán / Nhân viên)
}

export interface Staff {
  id: string;
  employeeId: string; // Mã nhân viên UNIQUE
  employeeName: string; // Tên nhân viên
  role: 'Admin' | 'Sales' | 'Delivery';
  email: string;
  phone: string;
  avatar?: string;
}

export interface EmployeeBonusSummary {
  employeeId: string;
  employeeName: string;
  totalOrders: number;
  completedOrders: number;
  totalSalesValue: number;
  totalWarrantyItemsActivated: number;
  totalBonusEarned: number; // VNĐ
}

export interface DepartureLocation {
  id: string;
  name: string; // e.g. "Kho Chính - KDC Hiệp Ân (Quận 8)"
  address: string; // "89 Đường Số 1, Khu Dân Cư Hiệp Ân, Phường 5, Quận 8, TP. Hồ Chí Minh"
  lat: number;
  lng: number;
  phone?: string;
  isDefault?: boolean;
  notes?: string;
  createdAt?: string;
}

export interface StoreInfo {
  name: string;
  phone: string;
  address: string;
  taxCode: string;
  website: string;
  bankAccount?: string;
  bankName?: string;
  bankOwner?: string;
  lat?: number;
  lng?: number;
}

export interface DeliveryTrip {
  id: string;
  tripCode: string; // e.g. CG-2026-001
  departureLocationId?: string;
  departureLocationName: string;
  departureAddress: string;
  departureLat: number;
  departureLng: number;
  shipperId?: string;
  shipperName?: string;
  shipperPhone?: string;
  orderIds: string[]; // Array of order IDs in exact stop sequence [order1, order2, ...]
  status: 'planning' | 'in_transit' | 'completed' | 'cancelled';
  totalDistanceKm: number;
  totalDurationMins: number;
  totalCodAmount: number;
  totalItemsCount: number;
  notes?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}



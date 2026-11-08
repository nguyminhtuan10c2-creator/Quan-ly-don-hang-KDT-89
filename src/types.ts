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

export interface DistributorQuote {
  id: string;
  distributorName: string; // Tên Nhà phân phối / Đại lý báo giá (VD: NPP Daikin, Chợ Lớn, Tân Viễn Đông...)
  quoteDate: string; // Ngày cập nhật / hỏi giá (YYYY-MM-DD hoặc ISO)
  quotedPrice: number; // Giá báo niêm yết từ NPP cho 1 con (VNĐ)
  minQuantity: number; // Số lượng tối thiểu để được giá này (VD: 1 con, 3 con, 5 con...)
  giftDescription?: string; // Tên quà tặng kèm (VD: Tặng lò vi sóng, tặng quạt đứng...)
  giftValue?: number; // Tổng giá trị quà quy đổi thành tiền mặt (VNĐ)
  netCostPerUnit: number; // Giá nhập thực tế trên 1 sản phẩm sau khi trừ quà = quotedPrice - (giftValue / minQuantity)
  inStockAtDistributor?: boolean; // Tình trạng hàng bên NPP: Còn hàng / Hết hàng / Chờ đặt 1-2 ngày
  contactPerson?: string; // Tên / SĐT nhân viên NPP báo giá (VD: Anh Hải Daikin - 0909...)
  note?: string; // Ghi chú (VD: Lấy 5 con chiết khấu trừ quà, bao ship kho...)
  createdAt: string;
  updatedBy?: string;
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

  // Thuộc tính theo dõi Báo giá Nhà phân phối & Giá đi hỏi (Distributor Quotes & Inquiry)
  distributorName?: string; // Tên nhà phân phối chính / gần nhất báo giá (VD: NPP Daikin, Chợ Lớn...)
  distributorQuoteDate?: string; // Ngày báo giá gần nhất của NPP (YYYY-MM-DD)
  distributorBasePrice?: number; // Giá báo gốc từ NPP (VNĐ)
  distributorMinQuantity?: number; // Bậc số lượng áp dụng (VD: 5 con)
  distributorGiftDesc?: string; // Tên quà tặng kèm nếu có (VD: Tặng lò vi sóng 1tr5)
  distributorGiftValue?: number; // Giá trị quà quy đổi (VNĐ)
  distributorNetCost?: number; // Giá nhập thực tế sau khi trừ quà chiết khấu = Giá gốc - (Quà / SL)
  distributorQuotes?: DistributorQuote[]; // Lịch sử / Danh sách các báo giá từ nhiều NPP để so sánh
  isOrderOnDemand?: boolean; // Đánh dấu: Hàng đi hỏi giá / Hàng đặt theo yêu cầu (không nhất thiết có sẵn trong kho)
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

// ========================================================
// KDT PRICE HUB – TRUNG TÂM DỮ LIỆU BÁO GIÁ NHÀ CUNG CẤP
// ========================================================

export interface PriceProduct {
  id: string; // Unique ID (e.g. pr-1731...)
  internalCode: string; // Mã sản phẩm nội bộ (tự sinh, VD: KDT-PR-001)
  code?: string; // Alias for internalCode
  name: string; // Tên sản phẩm
  model: string; // Mã hàng / Model / Part Number
  brand: string; // Thương hiệu (Daikin, Casper, Samsung, Bosch...)
  origin?: string; // Xuất xứ (Nhật Bản, Thái Lan, Việt Nam, Trung Quốc...)
  specifications?: string; // Thông số kỹ thuật (Công suất, kích thước, điện áp...)
  specification?: string; // Alias for specifications
  packingSpec?: string; // Quy cách (Bộ, Thùng, Cái...)
  unit: string; // Đơn vị tính (Bộ, Cái, Chiếc, Mét, Cuộn...)
  category: string; // Nhóm sản phẩm (Điện lạnh, Điện máy, Gia dụng, Thiết bị điện...)
  image?: string; // Hình ảnh sản phẩm (base64 hoặc URL)
  imageUrl?: string; // Alias for image
  attachmentUrl?: string; // File tài liệu kỹ thuật đính kèm
  technicalDocUrl?: string; // Alias for attachmentUrl
  attachmentName?: string;
  notes?: string; // Ghi chú sản phẩm
  createdBy: string; // Người tạo (Tên Sale)
  createdAt: string; // ISO String
  updatedAt: string; // ISO String

  // Optional link to warehouse inventory
  linkedInventoryProductId?: string; // ID sản phẩm trong kho KDT (nếu người dùng chủ động liên kết)
  linkedInventoryProductName?: string;
  linkedInventoryProductSku?: string;
}

export interface Supplier {
  id: string; // Unique ID (e.g. sup-1731...)
  code: string; // Mã nhà cung cấp (VD: NCC-DAIKIN-01)
  name: string; // Tên nhà cung cấp / Nhà phân phối
  contactPerson?: string; // Người liên hệ / Sale phụ trách
  phone?: string; // Số điện thoại
  email?: string; // Email
  address?: string; // Địa chỉ kho / văn phòng
  website?: string; // Website
  productGroups?: string[]; // Nhóm hàng cung cấp
  categories?: string[]; // Alias for productGroups
  paymentTerms?: string; // Điều kiện thanh toán (Công nợ 30 ngày, Thanh toán 100% trước khi giao...)
  notes?: string; // Ghi chú hợp tác, chính sách chiết khấu
  isActive: boolean; // Trạng thái hoạt động (true: Đang giao dịch, false: Tạm ngừng)
  createdAt: string;
  updatedAt: string;
}

export interface QuotationItem {
  id: string;
  quotationId: string;
  productId: string; // ID sản phẩm trong PriceProduct
  productName: string;
  productModel?: string;
  unit: string;
  quotedPrice: number; // Giá nhà cung cấp báo niêm yết (VNĐ hoặc nguyên tệ)
  currency?: string;
  discountPercent?: number; // Chiết khấu % (0 - 100)
  discountAmount?: number; // Chiết khấu tiền mặt (VNĐ)
  giftDescription?: string; // Tên quà tặng kèm (VD: Tặng lò vi sóng, tặng quạt...)
  giftValue?: number; // Tổng giá trị quà quy đổi thành tiền mặt (VNĐ)
  minQuantity: number; // Số lượng tối thiểu để được giá (MOQ, mặc định 1)
  vatPercent?: number; // Thuế VAT % (0, 8, 10...)
  vatAmount?: number; // Số tiền VAT
  shippingFee?: number; // Phí vận chuyển
  freightCost?: number; // Alias for shippingFee
  otherFees?: number; // Phụ phí khác (bốc xếp, lắp đặt...)
  otherCost?: number; // Alias for otherFees
  netPricePerUnit: number; // Giá sau chiết khấu thực tế trên 1 sản phẩm
  netPrice?: number; // Alias for netPricePerUnit
  totalEstimatedCost: number; // Tổng giá dự kiến gồm VAT + ship nếu có
  estimatedTotalCost?: number; // Alias for totalEstimatedCost
  deliveryDays?: number; // Thời gian giao hàng (ngày)
  leadTimeDays?: number; // Alias for deliveryDays
  stockStatus: 'in_stock' | 'order' | 'out_of_stock' | 'unconfirmed' | 'pre_order'; // Tình trạng hàng bên NCC
  notes?: string;
}

export interface QuotationAttachment {
  id: string;
  name?: string;
  fileName?: string;
  url?: string;
  fileUrl?: string;
  size?: number;
  fileSize?: number;
  type?: string;
  fileType?: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface SupplierQuotation {
  id: string; // Unique ID (e.g. quote-1731...)
  quotationCode: string; // Mã báo giá (VD: BG-2026-001)
  supplierId: string; // Liên kết nhà cung cấp
  supplierName: string;
  supplierCode?: string;
  supplierContact?: string;
  supplierPhone?: string;
  quoteDate: string; // Ngày hỏi giá (YYYY-MM-DD)
  expiryDate?: string; // Hạn hiệu lực báo giá (YYYY-MM-DD)
  validUntil?: string; // Alias for expiryDate
  currency: string; // Đơn vị tiền tệ (mặc định 'VNĐ')
  exchangeRate?: number; // Tỷ giá nếu ngoại tệ
  paymentTerms?: string; // Điều kiện thanh toán
  deliveryDays?: number; // Thời gian giao hàng dự kiến
  deliveryMethod?: string; // Giao tại kho KDT / Lấy tại kho NCC
  deliveryTerms?: string; // Alias for deliveryMethod
  status: 'valid' | 'expired' | 'negotiating'; // Hiệu lực báo giá
  notes?: string;
  createdBy: string; // Nhân viên hỏi giá (Sale)
  attachments?: QuotationAttachment[]; // File báo giá gốc đính kèm
  items: QuotationItem[]; // Danh sách các sản phẩm báo giá
  createdAt: string;
  updatedAt: string;
}

export interface QuotationAuditLog {
  id: string;
  quotationId?: string;
  productId?: string;
  supplierId?: string;
  action: 'create' | 'update' | 'delete' | 'merge_product' | 'import_file' | 'link_inventory';
  description: string;
  changedBy: string;
  changedAt: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  fieldChanged?: string;
  oldValue?: any;
  newValue?: any;
  reason?: string;
}

export interface QuotationImportPreviewRow {
  rowIndex: number;
  productName: string;
  rawProductName?: string;
  productModel?: string;
  rawModel?: string;
  brand?: string;
  category?: string;
  unit: string;
  quotedPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  netPrice?: number;
  minQuantity: number;
  stockStatus?: 'in_stock' | 'order' | 'out_of_stock' | 'unconfirmed' | 'pre_order';
  notes?: string;
  matchedProductId?: string; // ID sản phẩm gợi ý nếu đã có
  matchedProductName?: string;
  matchScore?: number; // Độ khớp tên/model
  isNewProduct: boolean; // Người dùng chọn tạo sản phẩm mới hay ghép
  isValid: boolean;
  hasError?: boolean;
  isMatched?: boolean;
  createNewIfMissing?: boolean;
  validationError?: string;
  errorMessage?: string;
}

export interface QuotationImportJob {
  id: string;
  fileName: string;
  fileType: 'xlsx' | 'xls' | 'csv' | 'pdf';
  fileData?: string; // Base64 backup nếu cần
  supplierId?: string;
  supplierName?: string;
  importedAt: string;
  importedBy: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  status: 'preview' | 'completed' | 'cancelled';
}



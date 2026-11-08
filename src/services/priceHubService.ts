import {
  PriceProduct,
  Supplier,
  SupplierQuotation,
  QuotationItem,
  QuotationAuditLog,
  QuotationImportJob,
  QuotationImportPreviewRow,
} from '../types';
import * as XLSX from 'xlsx';
import { db } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';

// Storage Keys
export const PRICE_HUB_KEYS = {
  PRODUCTS: 'kdt89_price_products',
  SUPPLIERS: 'kdt89_price_suppliers',
  QUOTATIONS: 'kdt89_price_quotations',
  AUDIT_LOGS: 'kdt89_price_audit_logs',
  IMPORT_JOBS: 'kdt89_price_import_jobs',
};

// Event emitter / listener pattern for reactive state updates
type PriceHubListener = () => void;
const listeners = new Set<PriceHubListener>();

export const subscribeToPriceHub = (listener: PriceHubListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notifyListeners = () => {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error('Error in PriceHub listener: ', e);
    }
  });
};

// Formatting Helpers
export const formatVNDCurrency = (amount: number): string => {
  if (isNaN(amount) || amount === null || amount === undefined) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDateTimeVI = (dateInput?: string | Date): string => {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch (e) {
    return String(dateInput);
  }
};

// ========================================================
// 1. INITIAL SEED DATA (Thực tế, phong phú)
// ========================================================

const SEED_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    code: 'NCC-DAIKIN-MN',
    name: 'NPP Daikin Miền Nam',
    contactPerson: 'Anh Trần Hữu Hải (Sale Trưởng)',
    phone: '0903112233',
    email: 'hai.tran@daikin-distributor.vn',
    address: 'KCN Tân Bình, Tây Thạnh, Tân Phú, TP.HCM',
    website: 'https://daikin.com.vn',
    productGroups: ['Máy lạnh', 'Điều hòa trung tâm', 'Linh kiện Daikin'],
    paymentTerms: 'Công nợ 30 ngày, chiết khấu 2% thanh toán ngay',
    notes: 'Đại lý phân phối cấp 1 Daikin chính hãng, hỗ trợ giao kho KDT miễn phí từ 5 bộ.',
    isActive: true,
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'sup-2',
    code: 'NCC-CASPER-MN',
    name: 'NPP Casper Miền Nam',
    contactPerson: 'Chị Lê Thị Bích Trâm',
    phone: '0908776655',
    email: 'tram.le@casper-electric.vn',
    address: 'Tòa nhà Landmark 81, Bình Thạnh, TP.HCM',
    website: 'https://casper-electric.com',
    productGroups: ['Máy lạnh', 'Tivi', 'Máy giặt', 'Tủ lạnh'],
    paymentTerms: 'Thanh toán trước 50%, 50% khi nhận hàng',
    notes: 'Chính sách bảo hành 1 đổi 1 trong 1 năm cho máy lạnh Casper, tặng kèm combo quà theo tháng.',
    isActive: true,
    createdAt: '2026-08-15T09:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
  },
  {
    id: 'sup-3',
    code: 'NCC-TANVIENDONG',
    name: 'NPP Tân Viễn Đông (Điện Lạnh Tổng Hợp)',
    contactPerson: 'Anh Nguyễn Hoàng Long',
    phone: '0913998877',
    email: 'long.nh@tanviendong.com.vn',
    address: '345 Lý Thường Kiệt, Phường 6, Quận Tân Bình, TP.HCM',
    website: 'https://tanviendong.com.vn',
    productGroups: ['Máy lạnh', 'Tủ lạnh', 'Máy giặt', 'Gia dụng'],
    paymentTerms: 'Gối đầu 1 đơn hàng, hạn mức 200 triệu',
    notes: 'Nguồn hàng phong phú nhiều hãng Daikin, Panasonic, LG, Casper. Giá cạnh tranh cho đơn lấy số lượng lớn.',
    isActive: true,
    createdAt: '2026-09-01T08:30:00.000Z',
    updatedAt: '2026-11-04T14:00:00.000Z',
  },
  {
    id: 'sup-4',
    code: 'NCC-CHOLON-DL',
    name: 'NPP Chợ Lớn Sỉ',
    contactPerson: 'Anh Võ Văn Nam',
    phone: '0938223344',
    email: 'nam.vo@cholon-si.com',
    address: 'Quận 5, TP.HCM',
    website: 'https://dienmaycholon.vn',
    productGroups: ['Tivi', 'Tủ lạnh', 'Máy giặt', 'Quạt', 'Gia dụng'],
    paymentTerms: 'Thanh toán tiền mặt hoặc chuyển khoản trước khi lấy hàng',
    notes: 'Chuyên xả kho model mới và model tồn giá tốt.',
    isActive: true,
    createdAt: '2026-09-10T11:00:00.000Z',
    updatedAt: '2026-11-05T09:30:00.000Z',
  },
  {
    id: 'sup-5',
    code: 'NCC-FPT-SYNNEX',
    name: 'NPP Synnex FPT',
    contactPerson: 'Chị Đỗ Thu Hà',
    phone: '0909665544',
    email: 'hadt@synnexfpt.com.vn',
    address: 'Khu Công Nghệ Cao, TP. Thủ Đức, TP.HCM',
    website: 'https://synnexfpt.com',
    productGroups: ['Tivi', 'Gia dụng thông minh', 'Điện tử'],
    paymentTerms: 'Bảo lãnh ngân hàng, công nợ 45 ngày',
    notes: 'Nhà phân phối chính thức Xiaomi, Philips, Sharp.',
    isActive: true,
    createdAt: '2026-09-20T10:00:00.000Z',
    updatedAt: '2026-11-02T16:00:00.000Z',
  },
];

const SEED_PRICE_PRODUCTS: PriceProduct[] = [
  {
    id: 'pr-1',
    internalCode: 'KDT-PR-001',
    name: 'Máy lạnh Daikin Inverter 1.0 HP FTKF25XVMV',
    model: 'FTKF25XVMV',
    brand: 'Daikin',
    origin: 'Việt Nam',
    specifications: 'Công suất 1 HP - 9.200 BTU, Gas R32, Tiết kiệm điện Inverter, Lọc khí Streamer',
    packingSpec: 'Bộ (1 dàn lạnh + 1 dàn nóng)',
    unit: 'Bộ',
    category: 'Máy lạnh',
    notes: 'Model bán chạy mùa nóng, khách dự án và nhà phố hay hỏi.',
    createdBy: 'Nguyễn Văn Minh (Sales)',
    createdAt: '2026-10-15T09:00:00.000Z',
    updatedAt: '2026-11-05T10:00:00.000Z',
    linkedInventoryProductId: 'prod-40',
    linkedInventoryProductName: 'Máy lạnh Daikin Inverter 1 HP FTKF25XVMV',
    linkedInventoryProductSku: 'DK-FTKF25',
  },
  {
    id: 'pr-2',
    internalCode: 'KDT-PR-002',
    name: 'Máy lạnh Daikin Inverter 1.5 HP FTKF35XVMV',
    model: 'FTKF35XVMV',
    brand: 'Daikin',
    origin: 'Việt Nam',
    specifications: 'Công suất 1.5 HP - 11.900 BTU, Gas R32, Inverter chuẩn A+++',
    packingSpec: 'Bộ',
    unit: 'Bộ',
    category: 'Máy lạnh',
    notes: 'Dành cho phòng ngủ lớn 15-20m2.',
    createdBy: 'Nguyễn Văn Minh (Sales)',
    createdAt: '2026-10-18T10:00:00.000Z',
    updatedAt: '2026-11-06T09:00:00.000Z',
  },
  {
    id: 'pr-3',
    internalCode: 'KDT-PR-003',
    name: 'Máy lạnh Casper Inverter 1.0 HP TC-09IS36 (Model 2026)',
    model: 'TC-09IS36',
    brand: 'Casper',
    origin: 'Thái Lan',
    specifications: 'Công suất 1 HP, Inverter i-Saving, Dàn tản nhiệt đồng mạ vàng chống ăn mòn',
    packingSpec: 'Bộ',
    unit: 'Bộ',
    category: 'Máy lạnh',
    notes: 'Phân khúc giá rẻ cho phòng trọ, căn hộ cho thuê.',
    createdBy: 'Trần Thị Thu Thảo (Sales)',
    createdAt: '2026-10-20T14:00:00.000Z',
    updatedAt: '2026-11-06T11:00:00.000Z',
  },
  {
    id: 'pr-4',
    internalCode: 'KDT-PR-004',
    name: 'Smart Tivi Samsung 4K 65 inch Crystal UHD UA65DU8000',
    model: 'UA65DU8000KXXV',
    brand: 'Samsung',
    origin: 'Việt Nam',
    specifications: 'Màn hình 65 inch 4K, Bộ xử lý Crystal 4K, Thiết kế AirSlim thanh mảnh',
    packingSpec: 'Thùng 1 cái',
    unit: 'Cái',
    category: 'Tivi',
    notes: 'Mẫu Tivi phòng khách phổ biến nhất cuối năm.',
    createdBy: 'Nguyễn Văn Minh (Sales)',
    createdAt: '2026-10-22T08:00:00.000Z',
    updatedAt: '2026-11-07T15:00:00.000Z',
  },
  {
    id: 'pr-5',
    internalCode: 'KDT-PR-005',
    name: 'Tủ lạnh LG Inverter 335 lít Linear GN-D332BL',
    model: 'GN-D332BL',
    brand: 'LG',
    origin: 'Indonesia',
    specifications: 'Dung tích 335L, DoorCooling+ làm lạnh từ cánh tủ, Inverter Linear tiết kiệm 32% điện',
    packingSpec: 'Thùng 1 cái',
    unit: 'Cái',
    category: 'Tủ lạnh',
    notes: 'Màu đen kim loại sang trọng, ngăn đá trên.',
    createdBy: 'Lê Hoàng Long (Quản lý)',
    createdAt: '2026-10-25T11:00:00.000Z',
    updatedAt: '2026-11-04T16:00:00.000Z',
  },
  {
    id: 'pr-6',
    internalCode: 'KDT-PR-006',
    name: 'Vòng bi công nghiệp SKF 6205-2RSH/C3',
    model: '6205-2RSH/C3',
    brand: 'SKF',
    origin: 'Pháp / Thụy Điển',
    specifications: 'Đường kính trong 25mm, ngoài 52mm, dày 15mm, nắp cao su chống bụi nước 2 bên, khe hở C3',
    packingSpec: 'Hộp 1 cái / Thùng 10 cái',
    unit: 'Cái',
    category: 'Thiết bị công nghiệp',
    notes: 'Sản phẩm hỏi giá chuyên biệt cho xưởng cơ khí đối tác KDT. Chưa từng tồn kho.',
    createdBy: 'Nguyễn Văn Minh (Sales)',
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-06T09:30:00.000Z',
  },
];

const SEED_QUOTATIONS: SupplierQuotation[] = [
  // Báo giá 1: NPP Daikin Miền Nam báo máy lạnh Daikin ngày 01/11
  {
    id: 'quote-1',
    quotationCode: 'BG-2026-DK01',
    supplierId: 'sup-1',
    supplierName: 'NPP Daikin Miền Nam',
    supplierContact: 'Anh Trần Hữu Hải (Sale Trưởng)',
    supplierPhone: '0903112233',
    quoteDate: '2026-11-01',
    expiryDate: '2026-11-30',
    currency: 'VNĐ',
    paymentTerms: 'Công nợ 30 ngày',
    deliveryDays: 1,
    deliveryMethod: 'Giao tận kho KDT',
    status: 'valid',
    notes: 'Bảng giá đại lý đầu tháng 11/2026.',
    createdBy: 'Nguyễn Văn Minh (Sales)',
    createdAt: '2026-11-01T08:30:00.000Z',
    updatedAt: '2026-11-01T08:30:00.000Z',
    items: [
      {
        id: 'qi-1',
        quotationId: 'quote-1',
        productId: 'pr-1',
        productName: 'Máy lạnh Daikin Inverter 1.0 HP FTKF25XVMV',
        productModel: 'FTKF25XVMV',
        unit: 'Bộ',
        quotedPrice: 9150000,
        discountPercent: 0,
        discountAmount: 150000,
        giftDescription: 'Tặng combo 2m ống đồng',
        giftValue: 250000,
        minQuantity: 5,
        netPricePerUnit: 8950000, // 9.150.000 - 150k - (250k / 5) = 8.950.000đ
        totalEstimatedCost: 8950000,
        deliveryDays: 1,
        stockStatus: 'in_stock',
        notes: 'Sẵn hàng kho Tân Bình, lấy từ 5 bộ bao ship.',
      },
      {
        id: 'qi-2',
        quotationId: 'quote-1',
        productId: 'pr-2',
        productName: 'Máy lạnh Daikin Inverter 1.5 HP FTKF35XVMV',
        productModel: 'FTKF35XVMV',
        unit: 'Bộ',
        quotedPrice: 11800000,
        discountPercent: 2,
        discountAmount: 0,
        giftDescription: 'Tặng lò vi sóng Sharp trị giá 1tr5 khi lấy 5 bộ',
        giftValue: 1500000,
        minQuantity: 5,
        netPricePerUnit: 11264000, // 11.800.000 * 0.98 - (1.500.000 / 5 = 300.000) = 11.264.000đ
        totalEstimatedCost: 11264000,
        deliveryDays: 1,
        stockStatus: 'in_stock',
        notes: 'Bậc 5 bộ chiết khấu tốt nhất.',
      },
    ],
  },

  // Báo giá 2: NPP Tân Viễn Đông báo giá máy lạnh Daikin & Casper ngày 05/11 (Cạnh tranh)
  {
    id: 'quote-2',
    quotationCode: 'BG-2026-TVD01',
    supplierId: 'sup-3',
    supplierName: 'NPP Tân Viễn Đông (Điện Lạnh Tổng Hợp)',
    supplierContact: 'Anh Nguyễn Hoàng Long',
    supplierPhone: '0913998877',
    quoteDate: '2026-11-05',
    expiryDate: '2026-11-25',
    currency: 'VNĐ',
    paymentTerms: 'Gối đầu 1 đơn',
    deliveryDays: 2,
    deliveryMethod: 'Giao tận nơi',
    status: 'valid',
    notes: 'Báo giá nhanh qua Zalo cho Sale Minh.',
    createdBy: 'Nguyễn Văn Minh (Sales)',
    createdAt: '2026-11-05T10:15:00.000Z',
    updatedAt: '2026-11-05T10:15:00.000Z',
    items: [
      {
        id: 'qi-3',
        quotationId: 'quote-2',
        productId: 'pr-1',
        productName: 'Máy lạnh Daikin Inverter 1.0 HP FTKF25XVMV',
        productModel: 'FTKF25XVMV',
        unit: 'Bộ',
        quotedPrice: 9050000,
        discountPercent: 1.5,
        discountAmount: 0,
        minQuantity: 3,
        netPricePerUnit: 8914250, // 9.050.000 * 0.985 = 8.914.250đ
        totalEstimatedCost: 8914250,
        deliveryDays: 2,
        stockStatus: 'in_stock',
        notes: 'Giá tốt hơn NPP chính 35.000đ/con, MOQ 3 bộ.',
      },
      {
        id: 'qi-4',
        quotationId: 'quote-2',
        productId: 'pr-2',
        productName: 'Máy lạnh Daikin Inverter 1.5 HP FTKF35XVMV',
        productModel: 'FTKF35XVMV',
        unit: 'Bộ',
        quotedPrice: 11650000,
        discountPercent: 1,
        discountAmount: 0,
        minQuantity: 1,
        netPricePerUnit: 11533500, // 11.650.000 * 0.99
        totalEstimatedCost: 11533500,
        deliveryDays: 1,
        stockStatus: 'in_stock',
        notes: 'Không cần lấy combo quà, giá net trực tiếp cho 1 bộ.',
      },
      {
        id: 'qi-5',
        quotationId: 'quote-2',
        productId: 'pr-3',
        productName: 'Máy lạnh Casper Inverter 1.0 HP TC-09IS36 (Model 2026)',
        productModel: 'TC-09IS36',
        unit: 'Bộ',
        quotedPrice: 5200000,
        discountPercent: 0,
        discountAmount: 100000,
        minQuantity: 5,
        netPricePerUnit: 5100000,
        totalEstimatedCost: 5100000,
        deliveryDays: 2,
        stockStatus: 'in_stock',
      },
    ],
  },

  // Báo giá 3: NPP Casper Miền Nam báo Casper ngày 06/11
  {
    id: 'quote-3',
    quotationCode: 'BG-2026-CASPER02',
    supplierId: 'sup-2',
    supplierName: 'NPP Casper Miền Nam',
    supplierContact: 'Chị Lê Thị Bích Trâm',
    supplierPhone: '0908776655',
    quoteDate: '2026-11-06',
    expiryDate: '2026-12-05',
    currency: 'VNĐ',
    paymentTerms: 'CK 50% trước',
    deliveryDays: 1,
    deliveryMethod: 'Giao kho KDT',
    status: 'valid',
    notes: 'Chính sách kích cầu mùa đông của hãng Casper.',
    createdBy: 'Trần Thị Thu Thảo (Sales)',
    createdAt: '2026-11-06T11:30:00.000Z',
    updatedAt: '2026-11-06T11:30:00.000Z',
    items: [
      {
        id: 'qi-6',
        quotationId: 'quote-3',
        productId: 'pr-3',
        productName: 'Máy lạnh Casper Inverter 1.0 HP TC-09IS36 (Model 2026)',
        productModel: 'TC-09IS36',
        unit: 'Bộ',
        quotedPrice: 5150000,
        discountPercent: 0,
        discountAmount: 0,
        giftDescription: 'Tặng ấm đun siêu tốc Casper trị giá 250k khi mua từ 3 bộ',
        giftValue: 750000,
        minQuantity: 3,
        netPricePerUnit: 4900000, // 5.150.000 - (750.000 / 3 = 250.000) = 4.900.000đ
        totalEstimatedCost: 4900000,
        deliveryDays: 1,
        stockStatus: 'in_stock',
        notes: 'Giá Net rẻ nhất thị trường hiện nay.',
      },
    ],
  },

  // Báo giá 4: So sánh Vòng bi SKF 6205 giữa 2 nhà cung cấp chuyên phụ tùng
  {
    id: 'quote-4',
    quotationCode: 'BG-2026-SKF-A',
    supplierId: 'sup-3',
    supplierName: 'NPP Tân Viễn Đông (Điện Lạnh Tổng Hợp)',
    supplierContact: 'Anh Nguyễn Hoàng Long',
    quoteDate: '2026-11-06',
    expiryDate: '2026-11-20',
    currency: 'VNĐ',
    paymentTerms: 'Thanh toán tiền mặt',
    deliveryDays: 3,
    status: 'valid',
    notes: 'Hỏi giá theo yêu cầu khách cơ khí.',
    createdBy: 'Nguyễn Văn Minh (Sales)',
    createdAt: '2026-11-06T14:00:00.000Z',
    updatedAt: '2026-11-06T14:00:00.000Z',
    items: [
      {
        id: 'qi-7',
        quotationId: 'quote-4',
        productId: 'pr-6',
        productName: 'Vòng bi công nghiệp SKF 6205-2RSH/C3',
        productModel: '6205-2RSH/C3',
        unit: 'Cái',
        quotedPrice: 185000,
        discountPercent: 5,
        minQuantity: 10,
        netPricePerUnit: 175750, // 185.000 * 0.95 = 175.750đ
        totalEstimatedCost: 175750,
        deliveryDays: 3,
        stockStatus: 'order',
        notes: 'Hàng đặt 2-3 ngày có.',
      },
    ],
  },
];

const SEED_AUDIT_LOGS: QuotationAuditLog[] = [
  {
    id: 'log-1',
    quotationId: 'quote-1',
    action: 'create',
    description: 'Tạo mới báo giá BG-2026-DK01 từ NPP Daikin Miền Nam',
    changedBy: 'Nguyễn Văn Minh (Sales)',
    changedAt: '2026-11-01T08:30:00.000Z',
    reason: 'Nhập báo giá định kỳ đầu tháng',
  },
  {
    id: 'log-2',
    quotationId: 'quote-2',
    action: 'create',
    description: 'Tạo mới báo giá BG-2026-TVD01 từ NPP Tân Viễn Đông',
    changedBy: 'Nguyễn Văn Minh (Sales)',
    changedAt: '2026-11-05T10:15:00.000Z',
    reason: 'Khách hỏi giá máy lạnh 1.0HP & 1.5HP',
  },
  {
    id: 'log-3',
    quotationId: 'quote-3',
    action: 'create',
    description: 'Tạo mới báo giá BG-2026-CASPER02 từ NPP Casper Miền Nam',
    changedBy: 'Trần Thị Thu Thảo (Sales)',
    changedAt: '2026-11-06T11:30:00.000Z',
    reason: 'So sánh giá Casper với Tân Viễn Đông',
  },
];

// ========================================================
// 2. HELPER CALCULATORS & FORMATTERS
// ========================================================

/**
 * Tính toán giá Net sau khi trừ chiết khấu % và chiết khấu tiền / trừ quà
 */
export const calculateNetPrice = (params: {
  quotedPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  giftValue?: number;
  minQuantity?: number;
}): number => {
  const base = Math.max(0, params.quotedPrice || 0);
  const minQty = Math.max(1, params.minQuantity || 1);
  const giftDiscountPerUnit = params.giftValue ? Math.round(params.giftValue / minQty) : 0;
  const cashDiscount = params.discountAmount || 0;

  let priceAfterPercent = base;
  if (params.discountPercent && params.discountPercent > 0) {
    const pct = Math.min(100, Math.max(0, params.discountPercent));
    priceAfterPercent = Math.round(base * (1 - pct / 100));
  }

  const finalNet = priceAfterPercent - cashDiscount - giftDiscountPerUnit;
  return Math.max(0, finalNet);
};

/**
 * Tính tổng chi phí dự kiến gồm thuế VAT, vận chuyển và phụ phí
 */
export const calculateTotalEstimatedCost = (params: {
  netPricePerUnit: number;
  vatPercent?: number;
  shippingFee?: number;
  otherFees?: number;
}): number => {
  const net = Math.max(0, params.netPricePerUnit || 0);
  const vat = params.vatPercent ? Math.round((net * params.vatPercent) / 100) : 0;
  const ship = params.shippingFee || 0;
  const other = params.otherFees || 0;
  return net + vat + ship + other;
};

// ========================================================
// 3. STORAGE GETTERS & SETTERS (Local + Firestore Bridge)
// ========================================================

export const getPriceProducts = (): PriceProduct[] => {
  const stored = localStorage.getItem(PRICE_HUB_KEYS.PRODUCTS);
  if (!stored) {
    localStorage.setItem(PRICE_HUB_KEYS.PRODUCTS, JSON.stringify(SEED_PRICE_PRODUCTS));
    return SEED_PRICE_PRODUCTS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return SEED_PRICE_PRODUCTS;
  }
};

export const savePriceProducts = (products: PriceProduct[]) => {
  localStorage.setItem(PRICE_HUB_KEYS.PRODUCTS, JSON.stringify(products));
  notifyListeners();
};

export const getSuppliers = (): Supplier[] => {
  const stored = localStorage.getItem(PRICE_HUB_KEYS.SUPPLIERS);
  if (!stored) {
    localStorage.setItem(PRICE_HUB_KEYS.SUPPLIERS, JSON.stringify(SEED_SUPPLIERS));
    return SEED_SUPPLIERS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return SEED_SUPPLIERS;
  }
};

export const saveSuppliers = (suppliers: Supplier[]) => {
  localStorage.setItem(PRICE_HUB_KEYS.SUPPLIERS, JSON.stringify(suppliers));
  notifyListeners();
};

export const getQuotations = (): SupplierQuotation[] => {
  const stored = localStorage.getItem(PRICE_HUB_KEYS.QUOTATIONS);
  if (!stored) {
    localStorage.setItem(PRICE_HUB_KEYS.QUOTATIONS, JSON.stringify(SEED_QUOTATIONS));
    return SEED_QUOTATIONS;
  }
  try {
    const list: SupplierQuotation[] = JSON.parse(stored);
    return list.map((q) => ({
      ...q,
      items: Array.isArray(q.items) ? q.items : [],
    }));
  } catch {
    return SEED_QUOTATIONS;
  }
};

export const saveQuotations = (quotations: SupplierQuotation[]) => {
  localStorage.setItem(PRICE_HUB_KEYS.QUOTATIONS, JSON.stringify(quotations));
  notifyListeners();
};

export const getAuditLogs = (): QuotationAuditLog[] => {
  const stored = localStorage.getItem(PRICE_HUB_KEYS.AUDIT_LOGS);
  if (!stored) {
    localStorage.setItem(PRICE_HUB_KEYS.AUDIT_LOGS, JSON.stringify(SEED_AUDIT_LOGS));
    return SEED_AUDIT_LOGS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return SEED_AUDIT_LOGS;
  }
};

export const addAuditLog = (logData: Omit<QuotationAuditLog, 'id' | 'changedAt'>) => {
  const logs = getAuditLogs();
  const newLog: QuotationAuditLog = {
    ...logData,
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    changedAt: new Date().toISOString(),
  };
  logs.unshift(newLog);
  localStorage.setItem(PRICE_HUB_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, 300))); // Keep last 300 logs
};

// ========================================================
// 4. MODULE A – DASHBOARD ANALYTICS & METRICS
// ========================================================

export interface PriceHubDashboardStats {
  totalPriceProducts: number;
  totalSuppliers: number;
  newQuotesThisMonth: number;
  expiringQuotesCount: number;
  expiredQuotesCount: number;
  staleProductsCount: number; // Chưa có báo giá trong 30 ngày
  notablePriceChanges: {
    productId: string;
    productName: string;
    supplierName: string;
    oldPrice: number;
    newPrice: number;
    changeAmount: number;
    changePercent: number;
    quoteDate: string;
  }[];
  topCompetitiveSuppliers: {
    supplierId: string;
    supplierName: string;
    totalQuotes: number;
    lowestPriceCount: number;
    competitiveRate: number;
  }[];
}

export const getPriceHubDashboardStats = (filters?: {
  supplierId?: string;
  category?: string;
  staffName?: string;
  month?: string; // YYYY-MM
}): PriceHubDashboardStats => {
  const products = getPriceProducts();
  const suppliers = getSuppliers().filter((s) => s.isActive);
  const quotations = getQuotations();

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Filter quotations if specified
  const filteredQuotations = quotations.filter((q) => {
    if (filters?.supplierId && q.supplierId !== filters.supplierId) return false;
    if (filters?.staffName && q.createdBy !== filters.staffName) return false;
    if (filters?.month && !q.quoteDate.startsWith(filters.month)) return false;
    return true;
  });

  // Calculate new quotes this month
  const newQuotesThisMonth = filteredQuotations.filter((q) => q.quoteDate.startsWith(currentMonthStr)).length;

  // Expiring and expired quotes
  let expiringQuotesCount = 0;
  let expiredQuotesCount = 0;
  filteredQuotations.forEach((q) => {
    if (q.expiryDate) {
      const exp = new Date(q.expiryDate);
      const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        expiredQuotesCount++;
      } else if (diffDays <= 15) {
        expiringQuotesCount++;
      }
    }
  });

  // Stale products count (> 30 days without quote)
  const productLastQuoteMap = new Map<string, Date>();
  quotations.forEach((q) => {
    const qDate = new Date(q.quoteDate);
    q.items.forEach((item) => {
      const existing = productLastQuoteMap.get(item.productId);
      if (!existing || qDate > existing) {
        productLastQuoteMap.set(item.productId, qDate);
      }
    });
  });

  let staleProductsCount = 0;
  products.forEach((p) => {
    const lastDate = productLastQuoteMap.get(p.id);
    if (!lastDate) {
      staleProductsCount++;
    } else {
      const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 30) staleProductsCount++;
    }
  });

  // Notable price changes detection
  const notablePriceChanges: PriceHubDashboardStats['notablePriceChanges'] = [];
  products.forEach((p) => {
    // Gather all quote items for this product sorted by date
    const itemsWithDate: { item: QuotationItem; quote: SupplierQuotation }[] = [];
    quotations.forEach((q) => {
      q.items.forEach((item) => {
        if (item.productId === p.id) {
          itemsWithDate.push({ item, quote: q });
        }
      });
    });

    itemsWithDate.sort((a, b) => new Date(b.quote.quoteDate).getTime() - new Date(a.quote.quoteDate).getTime());

    if (itemsWithDate.length >= 2) {
      const newest = itemsWithDate[0];
      const previous = itemsWithDate[1];
      const oldPrice = previous.item.netPricePerUnit;
      const newPrice = newest.item.netPricePerUnit;
      if (oldPrice > 0 && oldPrice !== newPrice) {
        const changeAmount = newPrice - oldPrice;
        const changePercent = Number(((changeAmount / oldPrice) * 100).toFixed(1));
        if (Math.abs(changePercent) >= 2) {
          notablePriceChanges.push({
            productId: p.id,
            productName: p.name,
            supplierName: newest.quote.supplierName,
            oldPrice,
            newPrice,
            changeAmount,
            changePercent,
            quoteDate: newest.quote.quoteDate,
          });
        }
      }
    }
  });

  // Competitive suppliers calculation
  const supplierLowestCountMap = new Map<string, number>();
  const supplierTotalQuotesMap = new Map<string, number>();

  products.forEach((p) => {
    let lowestNet = Infinity;
    let lowestSupplierId: string | null = null;

    quotations.forEach((q) => {
      q.items.forEach((item) => {
        if (item.productId === p.id) {
          supplierTotalQuotesMap.set(q.supplierId, (supplierTotalQuotesMap.get(q.supplierId) || 0) + 1);
          if (item.netPricePerUnit < lowestNet) {
            lowestNet = item.netPricePerUnit;
            lowestSupplierId = q.supplierId;
          }
        }
      });
    });

    if (lowestSupplierId) {
      supplierLowestCountMap.set(lowestSupplierId, (supplierLowestCountMap.get(lowestSupplierId) || 0) + 1);
    }
  });

  const topCompetitiveSuppliers: PriceHubDashboardStats['topCompetitiveSuppliers'] = suppliers
    .map((s) => {
      const totalQuotes = supplierTotalQuotesMap.get(s.id) || 0;
      const lowestCount = supplierLowestCountMap.get(s.id) || 0;
      const competitiveRate = totalQuotes > 0 ? Math.round((lowestCount / totalQuotes) * 100) : 0;
      return {
        supplierId: s.id,
        supplierName: s.name,
        totalQuotes,
        lowestPriceCount: lowestCount,
        competitiveRate,
      };
    })
    .filter((s) => s.totalQuotes > 0)
    .sort((a, b) => b.competitiveRate - a.competitiveRate)
    .slice(0, 5);

  return {
    totalPriceProducts: products.length,
    totalSuppliers: suppliers.length,
    newQuotesThisMonth,
    expiringQuotesCount,
    expiredQuotesCount,
    staleProductsCount,
    notablePriceChanges: notablePriceChanges.slice(0, 8),
    topCompetitiveSuppliers,
  };
};

// ========================================================
// 5. MODULE B – PRICE PRODUCTS CRUD & MERGE
// ========================================================

export const savePriceProduct = (
  productData: Partial<PriceProduct> & { name: string },
  staffName: string = 'Nhân viên Sale'
): PriceProduct => {
  const products = getPriceProducts();
  const nowStr = new Date().toISOString();

  if (productData.id) {
    // Edit existing product
    const index = products.findIndex((p) => p.id === productData.id);
    if (index !== -1) {
      const old = products[index];
      const updated: PriceProduct = {
        ...old,
        ...productData,
        model: productData.model?.trim() || old.model || '',
        specifications: productData.specifications?.trim() || productData.specification?.trim() || old.specifications,
        unit: productData.unit?.trim() || old.unit || 'Cái',
        category: productData.category?.trim() || old.category || 'Khác',
        updatedAt: nowStr,
      };
      products[index] = updated;
      savePriceProducts(products);

      addAuditLog({
        productId: updated.id,
        action: 'update',
        description: `Chỉnh sửa thông tin sản phẩm hỏi giá: ${updated.name}`,
        changedBy: staffName,
        oldValues: old,
        newValues: updated,
      });

      return updated;
    }
  }

  // Generate internal code KDT-PR-XXX
  const maxNum = products.reduce((max, p) => {
    const match = p.internalCode?.match(/KDT-PR-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > max ? num : max;
    }
    return max;
  }, 0);
  const nextCode = `KDT-PR-${String(maxNum + 1).padStart(3, '0')}`;

  const newProd: PriceProduct = {
    id: `pr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    internalCode: nextCode,
    name: productData.name.trim(),
    model: productData.model?.trim() || '',
    brand: productData.brand?.trim() || 'Chính hãng',
    origin: productData.origin?.trim() || undefined,
    specifications: productData.specifications?.trim() || productData.specification?.trim() || undefined,
    packingSpec: productData.packingSpec?.trim() || undefined,
    unit: productData.unit?.trim() || 'Cái',
    category: productData.category?.trim() || 'Khác',
    image: productData.image || productData.imageUrl || undefined,
    attachmentUrl: productData.attachmentUrl || productData.technicalDocUrl || undefined,
    attachmentName: productData.attachmentName || undefined,
    notes: productData.notes?.trim() || undefined,
    createdBy: staffName,
    createdAt: nowStr,
    updatedAt: nowStr,
    linkedInventoryProductId: productData.linkedInventoryProductId || undefined,
    linkedInventoryProductName: productData.linkedInventoryProductName || undefined,
    linkedInventoryProductSku: productData.linkedInventoryProductSku || undefined,
  };

  products.unshift(newProd);
  savePriceProducts(products);

  addAuditLog({
    productId: newProd.id,
    action: 'create',
    description: `Thêm sản phẩm hỏi giá mới: ${newProd.name} (${newProd.internalCode})`,
    changedBy: staffName,
    newValues: newProd,
  });

  return newProd;
};

export const deletePriceProduct = (id: string, staffName: string = 'Nhân viên Sale'): boolean => {
  const products = getPriceProducts();
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return false;

  const target = products[index];
  products.splice(index, 1);
  savePriceProducts(products);

  addAuditLog({
    productId: id,
    action: 'delete',
    description: `Xóa sản phẩm hỏi giá: ${target.name} (${target.internalCode})`,
    changedBy: staffName,
    oldValues: target,
  });

  return true;
};

/**
 * Gộp sản phẩm trùng sau xác nhận của người dùng:
 * Toàn bộ lịch sử báo giá của sourceProduct sẽ chuyển sang targetProduct!
 */
export const mergePriceProducts = (
  targetProductId: string,
  sourceProductId: string,
  staffName: string = 'Nhân viên Sale'
): boolean => {
  if (targetProductId === sourceProductId) return false;

  const products = getPriceProducts();
  const target = products.find((p) => p.id === targetProductId);
  const source = products.find((p) => p.id === sourceProductId);
  if (!target || !source) return false;

  // Update all quotations referencing sourceProductId to targetProductId
  const quotations = getQuotations();
  let updatedCount = 0;

  quotations.forEach((q) => {
    q.items.forEach((item) => {
      if (item.productId === sourceProductId) {
        item.productId = targetProductId;
        item.productName = target.name;
        item.productModel = target.model;
        updatedCount++;
      }
    });
  });

  saveQuotations(quotations);

  // Remove source product
  const remaining = products.filter((p) => p.id !== sourceProductId);
  savePriceProducts(remaining);

  addAuditLog({
    productId: targetProductId,
    action: 'merge_product',
    description: `Gộp sản phẩm trùng: Gộp "${source.name}" (${source.internalCode}) vào "${target.name}" (${target.internalCode}). Đã chuyển ${updatedCount} dòng báo giá.`,
    changedBy: staffName,
    oldValues: { sourceId: source.id, sourceName: source.name },
    newValues: { targetId: target.id, targetName: target.name },
  });

  return true;
};

/**
 * Liên kết hoặc hủy liên kết một sản phẩm hỏi giá với sản phẩm tồn kho KDT
 */
export const linkPriceProductToInventory = (
  priceProductId: string,
  inventoryProductId: string | null,
  staffName: string = 'Nhân viên Sale'
): boolean => {
  const products = getPriceProducts();
  const prod = products.find((p) => p.id === priceProductId);
  if (!prod) return false;

  const oldLinked = prod.linkedInventoryProductId;
  prod.linkedInventoryProductId = inventoryProductId || undefined;
  prod.updatedAt = new Date().toISOString();

  savePriceProducts(products);

  addAuditLog({
    productId: priceProductId,
    action: 'link_inventory',
    description: inventoryProductId
      ? `Liên kết sản phẩm hỏi giá "${prod.name}" với kho KDT ID: ${inventoryProductId}`
      : `Hủy liên kết kho KDT cho sản phẩm "${prod.name}"`,
    changedBy: staffName,
    oldValues: { linkedInventoryProductId: oldLinked },
    newValues: { linkedInventoryProductId: inventoryProductId },
  });

  notifyListeners();
  return true;
};

// ========================================================
// 6. MODULE C – SUPPLIERS CRUD & METRICS
// ========================================================

export const saveSupplier = (
  supplierData: Partial<Supplier> & { name: string },
  staffName: string = 'Nhân viên Sale'
): Supplier => {
  const suppliers = getSuppliers();
  const nowStr = new Date().toISOString();

  if (supplierData.id) {
    const index = suppliers.findIndex((s) => s.id === supplierData.id);
    if (index !== -1) {
      const old = suppliers[index];
      const updated: Supplier = {
        ...old,
        ...supplierData,
        productGroups: supplierData.productGroups || supplierData.categories || old.productGroups || [],
        categories: supplierData.categories || supplierData.productGroups || old.categories || [],
        updatedAt: nowStr,
      };
      suppliers[index] = updated;
      saveSuppliers(suppliers);

      addAuditLog({
        supplierId: updated.id,
        action: 'update',
        description: `Chỉnh sửa thông tin nhà cung cấp: ${updated.name}`,
        changedBy: staffName,
        oldValues: old,
        newValues: updated,
      });

      return updated;
    }
  }

  // Generate code NCC-XXX
  const maxNum = suppliers.reduce((max, s) => {
    const match = s.code?.match(/NCC-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > max ? num : max;
    }
    return max;
  }, 0);
  const nextCode = `NCC-${String(maxNum + 1).padStart(3, '0')}`;

  const newSup: Supplier = {
    id: `sup-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    code: supplierData.code?.trim().toUpperCase() || nextCode,
    name: supplierData.name.trim(),
    contactPerson: supplierData.contactPerson?.trim() || undefined,
    phone: supplierData.phone?.trim() || undefined,
    email: supplierData.email?.trim() || undefined,
    address: supplierData.address?.trim() || undefined,
    website: supplierData.website?.trim() || undefined,
    productGroups: supplierData.productGroups || supplierData.categories || [],
    categories: supplierData.categories || supplierData.productGroups || [],
    paymentTerms: supplierData.paymentTerms?.trim() || undefined,
    notes: supplierData.notes?.trim() || undefined,
    isActive: supplierData.isActive !== undefined ? supplierData.isActive : true,
    createdAt: nowStr,
    updatedAt: nowStr,
  };

  suppliers.unshift(newSup);
  saveSuppliers(suppliers);

  addAuditLog({
    supplierId: newSup.id,
    action: 'create',
    description: `Thêm nhà cung cấp mới: ${newSup.name} (${newSup.code})`,
    changedBy: staffName,
    newValues: newSup,
  });

  return newSup;
};

export const deactivateSupplier = (id: string, staffName: string = 'Nhân viên Sale'): boolean => {
  const suppliers = getSuppliers();
  const index = suppliers.findIndex((s) => s.id === id);
  if (index === -1) return false;

  suppliers[index].isActive = false;
  suppliers[index].updatedAt = new Date().toISOString();
  saveSuppliers(suppliers);

  addAuditLog({
    supplierId: id,
    action: 'update',
    description: `Tạm ngừng hoạt động nhà cung cấp: ${suppliers[index].name} (Bảo toàn toàn bộ lịch sử báo giá)`,
    changedBy: staffName,
  });

  return true;
};

// ========================================================
// 7. MODULE D & E – QUOTATIONS CRUD, AUDIT & HISTORY
// ========================================================

export const saveQuotation = (
  quotationData: Omit<SupplierQuotation, 'id' | 'createdAt' | 'updatedAt' | 'quotationCode'> & {
    id?: string;
    quotationCode?: string;
  },
  staffName: string = 'Nhân viên Sale'
): SupplierQuotation => {
  const quotations = getQuotations();
  const nowStr = new Date().toISOString();

  // Normalize items and compute calculated net costs
  const processedItems: QuotationItem[] = quotationData.items.map((item, idx) => {
    const net = calculateNetPrice({
      quotedPrice: item.quotedPrice,
      discountPercent: item.discountPercent,
      discountAmount: item.discountAmount,
      giftValue: item.giftValue,
      minQuantity: item.minQuantity,
    });

    const totalEst = calculateTotalEstimatedCost({
      netPricePerUnit: net,
      vatPercent: item.vatPercent,
      shippingFee: item.shippingFee,
      otherFees: item.otherFees,
    });

    return {
      ...item,
      id: item.id || `qi-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
      minQuantity: Math.max(1, item.minQuantity || 1),
      netPricePerUnit: net,
      totalEstimatedCost: totalEst,
      stockStatus: item.stockStatus || 'in_stock',
    };
  });

  if (quotationData.id) {
    // Edit existing quotation
    const index = quotations.findIndex((q) => q.id === quotationData.id);
    if (index !== -1) {
      const old = quotations[index];
      const updated: SupplierQuotation = {
        ...old,
        ...quotationData,
        items: processedItems,
        updatedAt: nowStr,
      };
      quotations[index] = updated;
      saveQuotations(quotations);

      addAuditLog({
        quotationId: updated.id,
        supplierId: updated.supplierId,
        action: 'update',
        description: `Chỉnh sửa báo giá ${updated.quotationCode} từ NCC ${updated.supplierName} (${updated.items.length} sản phẩm)`,
        changedBy: staffName,
        oldValues: old,
        newValues: updated,
      });

      return updated;
    }
  }

  // Generate quotation code BG-YYYY-XXX
  const currentYear = new Date().getFullYear();
  const yearQuotes = quotations.filter((q) => q.quotationCode?.startsWith(`BG-${currentYear}`));
  const maxNum = yearQuotes.reduce((max, q) => {
    const match = q.quotationCode?.match(new RegExp(`BG-${currentYear}-(\\d+)`));
    if (match) {
      const num = parseInt(match[1], 10);
      return num > max ? num : max;
    }
    return max;
  }, 0);
  const nextCode = quotationData.quotationCode || `BG-${currentYear}-${String(maxNum + 1).padStart(3, '0')}`;

  const newQuote: SupplierQuotation = {
    ...quotationData,
    id: `quote-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    quotationCode: nextCode,
    items: processedItems,
    currency: quotationData.currency || 'VNĐ',
    status: quotationData.status || 'valid',
    createdBy: quotationData.createdBy || staffName,
    createdAt: nowStr,
    updatedAt: nowStr,
  };

  quotations.unshift(newQuote);
  saveQuotations(quotations);

  addAuditLog({
    quotationId: newQuote.id,
    supplierId: newQuote.supplierId,
    action: 'create',
    description: `Tạo báo giá mới ${newQuote.quotationCode} từ NCC ${newQuote.supplierName} (Ngày: ${newQuote.quoteDate}, ${newQuote.items.length} sản phẩm)`,
    changedBy: staffName,
    newValues: newQuote,
  });

  return newQuote;
};

// ========================================================
// 8. MODULE F – PRICE COMPARISON MATRIX FOR A PRODUCT
// ========================================================

export interface ProductPriceComparisonRow {
  supplierId: string;
  supplierName: string;
  contactPerson?: string;
  phone?: string;
  quoteDate: string;
  expiryDate?: string;
  quotedPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  giftDescription?: string;
  giftValue?: number;
  minQuantity: number;
  netPricePerUnit: number; // Giá sau chiết khấu (để xếp hạng)
  totalEstimatedCost: number; // Gồm VAT + ship nếu có
  isLowestPrice: boolean;
  isExpired: boolean;
  isStale: boolean; // Báo giá > 30 ngày
  stockStatus: 'in_stock' | 'order' | 'out_of_stock' | 'unconfirmed';
  deliveryDays?: number;
  paymentTerms?: string;
  notes?: string;
  quotationId: string;
  quotationCode: string;
  historyQuotesCount: number; // Số lần NCC này từng báo giá cho sản phẩm này
}

export interface PriceComparisonEntry {
  item: QuotationItem;
  quote: SupplierQuotation;
  supplier: Supplier;
  isLowestNetPrice: boolean;
  priceDifference: number;
  rank: number;
}

export const getProductPriceComparison = (
  productId: string,
  quotationsList?: SupplierQuotation[],
  suppliersList?: Supplier[]
): any => {
  const quotations = quotationsList || getQuotations();
  const suppliers = suppliersList || getSuppliers();

  // Find all quotation items matching this product
  interface QuoteMatch {
    quote: SupplierQuotation;
    item: QuotationItem;
    supplier: Supplier;
  }
  const matches: QuoteMatch[] = [];

  quotations.forEach((q) => {
    const sup = suppliers.find((s) => s.id === q.supplierId) || {
      id: q.supplierId,
      code: q.supplierCode || 'NCC',
      name: q.supplierName,
      isActive: true,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    };

    q.items.forEach((item) => {
      if (item.productId === productId) {
        matches.push({ quote: q, item, supplier: sup });
      }
    });
  });

  if (matches.length === 0) {
    const emptyResult: any = [];
    emptyResult.productId = productId;
    emptyResult.bestSupplierQuote = undefined;
    emptyResult.allQuotes = [];
    return emptyResult;
  }

  // Sort matches by netPrice ascending (lowest price first)
  matches.sort((a, b) => {
    const netA = a.item.netPrice !== undefined ? a.item.netPrice : a.item.netPricePerUnit || 0;
    const netB = b.item.netPrice !== undefined ? b.item.netPrice : b.item.netPricePerUnit || 0;
    return netA - netB;
  });

  const lowestNet =
    matches[0].item.netPrice !== undefined
      ? matches[0].item.netPrice
      : matches[0].item.netPricePerUnit || 0;

  const allQuotes: PriceComparisonEntry[] = matches.map((m, idx) => {
    const curNet =
      m.item.netPrice !== undefined ? m.item.netPrice : m.item.netPricePerUnit || 0;
    return {
      item: {
        ...m.item,
        netPrice: curNet,
      },
      quote: m.quote,
      supplier: m.supplier,
      isLowestNetPrice: idx === 0,
      priceDifference: curNet - lowestNet,
      rank: idx + 1,
    };
  });

  const result: any = [...allQuotes];
  result.productId = productId;
  result.bestSupplierQuote = allQuotes[0];
  result.allQuotes = allQuotes;
  return result;
};

// ========================================================
// 9. MODULE G – FAST SEARCH & LOOKUP ENGINE
// ========================================================

export interface FastLookupResult {
  product: PriceProduct;
  latestPrice?: number;
  lowestActivePrice?: number;
  latestSupplierName?: string;
  latestQuoteDate?: string;
  totalSuppliersCount: number;
  totalQuotesCount: number;
  discountNote?: string;
  stockStatus?: 'in_stock' | 'order' | 'out_of_stock' | 'unconfirmed';
}

export const searchFastPriceHub = (
  query: string,
  productsList?: PriceProduct[],
  quotationsList?: SupplierQuotation[],
  suppliersList?: Supplier[],
  filters?: { brand?: string; category?: string } | string
): any[] => {
  const products = productsList || getPriceProducts();
  const quotations = quotationsList || getQuotations();
  const suppliers = suppliersList || getSuppliers();

  let categoryFilter: string | undefined;
  let brandFilter: string | undefined;

  if (typeof filters === 'string') {
    categoryFilter = filters;
  } else if (filters) {
    categoryFilter = filters.category;
    brandFilter = filters.brand;
  }

  const qLower = query.toLowerCase().trim();

  const matchedProducts = products.filter((p) => {
    if (categoryFilter && categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    if (brandFilter && brandFilter !== 'all' && p.brand !== brandFilter) return false;
    if (!qLower) return true;
    return (
      p.name.toLowerCase().includes(qLower) ||
      (p.code || p.internalCode || '').toLowerCase().includes(qLower) ||
      (p.model || '').toLowerCase().includes(qLower) ||
      (p.brand || '').toLowerCase().includes(qLower) ||
      (p.origin || '').toLowerCase().includes(qLower) ||
      (p.specifications || p.specification || '').toLowerCase().includes(qLower)
    );
  });

  const now = new Date();

  return matchedProducts.map((p) => {
    interface MatchRecord {
      q: SupplierQuotation;
      item: QuotationItem;
      supplier: Supplier;
    }
    const matches: MatchRecord[] = [];

    quotations.forEach((q) => {
      const sup = suppliers.find((s) => s.id === q.supplierId) || {
        id: q.supplierId,
        code: q.supplierCode || 'NCC',
        name: q.supplierName,
        isActive: true,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      };

      q.items.forEach((item) => {
        if (item.productId === p.id) {
          matches.push({ q, item, supplier: sup });
        }
      });
    });

    // Sort by net price ascending for bestQuote
    const sortedByPrice = [...matches].sort((a, b) => {
      const netA = a.item.netPrice !== undefined ? a.item.netPrice : a.item.netPricePerUnit || 0;
      const netB = b.item.netPrice !== undefined ? b.item.netPrice : b.item.netPricePerUnit || 0;
      return netA - netB;
    });

    // Sort by quoteDate descending for latestQuote
    const sortedByDate = [...matches].sort(
      (a, b) => new Date(b.q.quoteDate).getTime() - new Date(a.q.quoteDate).getTime()
    );

    const bestMatch = sortedByPrice[0];
    const latestMatch = sortedByDate[0];

    const supplierSet = new Set<string>();
    matches.forEach((m) => supplierSet.add(m.q.supplierId));

    const isStale = bestMatch
      ? Math.floor((now.getTime() - new Date(bestMatch.q.quoteDate).getTime()) / (1000 * 60 * 60 * 24)) > 30
      : false;

    const bestQuoteObj = bestMatch
      ? {
          netPrice:
            bestMatch.item.netPrice !== undefined
              ? bestMatch.item.netPrice
              : bestMatch.item.netPricePerUnit || 0,
          quoteDate: bestMatch.q.quoteDate,
          stockStatus: bestMatch.item.stockStatus,
          leadTimeDays: bestMatch.item.deliveryDays || bestMatch.item.leadTimeDays,
        }
      : undefined;

    const latestQuoteObj = latestMatch
      ? {
          netPrice:
            latestMatch.item.netPrice !== undefined
              ? latestMatch.item.netPrice
              : latestMatch.item.netPricePerUnit || 0,
          quoteDate: latestMatch.q.quoteDate,
          stockStatus: latestMatch.item.stockStatus,
          leadTimeDays: latestMatch.item.deliveryDays || latestMatch.item.leadTimeDays,
        }
      : undefined;

    return {
      product: p,
      bestQuote: bestQuoteObj,
      latestQuote: latestQuoteObj,
      bestSupplier: bestMatch ? bestMatch.supplier : undefined,
      isStale,
      totalQuotesCount: matches.length,
      suppliersCount: supplierSet.size,
      totalSuppliersCount: supplierSet.size,
      latestPrice: latestQuoteObj?.netPrice,
      lowestActivePrice: bestQuoteObj?.netPrice,
      latestSupplierName: latestMatch?.q.supplierName,
      latestQuoteDate: latestMatch?.q.quoteDate,
      stockStatus: bestMatch?.item.stockStatus,
    };
  });
};

// ========================================================
// 10. MODULE D (IMPORT TOOL) – EXCEL / CSV / PDF PARSER
// ========================================================

/**
 * Fuzzy score calculator between two strings (0 to 1)
 */
const calculateMatchScore = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;

  // Word token overlap
  const words1 = str1.toLowerCase().split(/\s+/).filter(Boolean);
  const words2 = str2.toLowerCase().split(/\s+/).filter(Boolean);
  const common = words1.filter((w) => words2.includes(w));
  return Number((common.length / Math.max(words1.length, words2.length)).toFixed(2));
};

/**
 * Đọc file Excel / CSV và tạo danh sách xem trước (Preview)
 */
export const parseExcelOrCsvFile = async (
  file: File,
  existingProductsList?: PriceProduct[],
  suppliersList?: Supplier[]
): Promise<any> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to JSON array of objects
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  const existingProducts = existingProductsList || getPriceProducts();
  const suppliers = suppliersList || getSuppliers();

  let detectedSupplierId: string | undefined;
  const fileNameLower = file.name.toLowerCase();
  for (const s of suppliers) {
    if (fileNameLower.includes(s.name.toLowerCase()) || (s.code && fileNameLower.includes(s.code.toLowerCase()))) {
      detectedSupplierId = s.id;
      break;
    }
  }

  const previewRows: QuotationImportPreviewRow[] = [];

  rawRows.forEach((row, idx) => {
    // Intelligently map common column header variations in Vietnamese & English
    const getVal = (keys: string[]): any => {
      for (const k of keys) {
        const foundKey = Object.keys(row).find((rk) => rk.toLowerCase().trim() === k.toLowerCase().trim());
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') {
          return row[foundKey];
        }
      }
      return '';
    };

    const name = String(getVal(['Tên sản phẩm', 'Tên hàng', 'Tên mặt hàng', 'Product Name', 'Item Name', 'Mô tả', 'Description']) || '').trim();
    const model = String(getVal(['Mã hàng', 'Model', 'Part Number', 'Mã SKU', 'Mã hiệu', 'SKU', 'Item Code']) || '').trim();
    const brand = String(getVal(['Hãng', 'Thương hiệu', 'Brand', 'Hãng sản xuất']) || '').trim();
    const unit = String(getVal(['ĐVT', 'Đơn vị tính', 'Unit', 'ĐVTính']) || 'Cái').trim();
    const rawPrice = getVal(['Đơn giá', 'Giá báo', 'Giá bán', 'Price', 'Quoted Price', 'Đơn giá niêm yết', 'Giá']);
    const rawDiscount = getVal(['Chiết khấu', 'CK %', 'Discount %', 'CK', 'Discount']);
    const rawQty = getVal(['Số lượng tối thiểu', 'MOQ', 'Số lượng', 'Min Quantity', 'Bậc SL', 'SL']);
    const rawNotes = getVal(['Ghi chú', 'Notes', 'Tình trạng', 'Tình trạng hàng']);

    // Parse numeric price
    let parsedPrice = 0;
    if (typeof rawPrice === 'number') {
      parsedPrice = rawPrice;
    } else if (typeof rawPrice === 'string') {
      const clean = rawPrice.replace(/[^0-9]/g, '');
      parsedPrice = clean ? parseInt(clean, 10) : 0;
    }

    // Parse discount percent
    let parsedDiscountPct = 0;
    if (typeof rawDiscount === 'number') {
      parsedDiscountPct = rawDiscount <= 1 ? rawDiscount * 100 : rawDiscount;
    } else if (typeof rawDiscount === 'string') {
      const clean = rawDiscount.replace(/[^0-9.]/g, '');
      parsedDiscountPct = clean ? parseFloat(clean) : 0;
    }

    const parsedMinQty = typeof rawQty === 'number' && rawQty > 0 ? rawQty : parseInt(String(rawQty).replace(/[^0-9]/g, ''), 10) || 1;

    // Validate line
    if (!name && !model && parsedPrice === 0) {
      return; // Skip empty row
    }

    let validationError = '';
    if (!name && !model) {
      validationError = 'Thiếu tên sản phẩm hoặc mã model';
    } else if (parsedPrice <= 0) {
      validationError = 'Đơn giá phải lớn hơn 0';
    }

    // Attempt fuzzy match with existing price products catalog
    let bestMatch: PriceProduct | null = null;
    let highestScore = 0;

    existingProducts.forEach((ep) => {
      let score = 0;
      if (model && ep.model) {
        score = Math.max(score, calculateMatchScore(model, ep.model) * 1.2);
      }
      if (name && ep.name) {
        score = Math.max(score, calculateMatchScore(name, ep.name));
      }
      if (score > highestScore && score >= 0.5) {
        highestScore = score;
        bestMatch = ep;
      }
    });

    const net = Math.round(parsedPrice * (1 - parsedDiscountPct / 100));

    previewRows.push({
      rowIndex: idx + 1,
      productName: name || model,
      rawProductName: name || model,
      productModel: model || undefined,
      rawModel: model || undefined,
      brand: brand || bestMatch?.brand || 'Chính hãng',
      category: bestMatch?.category || 'Khác',
      unit: unit || bestMatch?.unit || 'Cái',
      quotedPrice: parsedPrice,
      discountPercent: parsedDiscountPct > 0 ? parsedDiscountPct : undefined,
      netPrice: net,
      minQuantity: parsedMinQty,
      notes: rawNotes ? String(rawNotes) : undefined,
      matchedProductId: bestMatch?.id,
      matchedProductName: bestMatch?.name,
      matchScore: highestScore > 0 ? Number(highestScore.toFixed(2)) : undefined,
      isNewProduct: !bestMatch,
      createNewIfMissing: !bestMatch,
      isMatched: !!bestMatch,
      isValid: !validationError,
      hasError: !!validationError,
      validationError: validationError || undefined,
      errorMessage: validationError || undefined,
    });
  });

  const resultObj: any = [...previewRows];
  resultObj.rows = previewRows;
  resultObj.detectedSupplierId = detectedSupplierId;
  return resultObj;
};

/**
 * Thực thi import dữ liệu sau khi người dùng đã xem trước và xác nhận
 */
export const executeQuotationImport = (
  params: any,
  productsList?: PriceProduct[],
  suppliersList?: Supplier[],
  staffName?: string
): any => {
  const staff = staffName || params.staffName || 'Nhân viên Sale';
  const suppliers = suppliersList || getSuppliers();
  const supplier = suppliers.find((s) => s.id === params.supplierId);
  const supplierName = supplier?.name || 'Nhà cung cấp đối tác';

  const rows: QuotationImportPreviewRow[] = params.confirmedRows || params.rows || [];
  let createdCount = 0;
  const quotationItems: QuotationItem[] = [];

  rows.forEach((row: any, idx: number) => {
    if (row.hasError || (row.quotedPrice || 0) <= 0) return;

    let targetProductId = row.matchedProductId;

    // If marked as new product or no match, create a new PriceProduct in catalog
    if (row.createNewIfMissing || row.isNewProduct || !targetProductId) {
      const created = savePriceProduct(
        {
          name: row.rawProductName || row.productName,
          model: row.rawModel || row.productModel || '',
          brand: row.brand || 'Chính hãng',
          unit: row.unit || 'Cái',
          category: row.category || 'Khác',
          notes: `Tự động tạo từ import file: ${params.fileName}`,
        },
        staff
      );
      targetProductId = created.id;
      createdCount++;
    }

    const net = calculateNetPrice({
      quotedPrice: row.quotedPrice,
      discountPercent: row.discountPercent,
      discountAmount: row.discountAmount,
      minQuantity: row.minQuantity,
    });

    quotationItems.push({
      id: `qi-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
      quotationId: '',
      productId: targetProductId,
      productName: row.rawProductName || row.productName,
      productModel: row.rawModel || row.productModel,
      unit: row.unit || 'Cái',
      quotedPrice: row.quotedPrice,
      discountPercent: row.discountPercent,
      discountAmount: row.discountAmount,
      minQuantity: row.minQuantity || 1,
      netPricePerUnit: net,
      netPrice: net,
      totalEstimatedCost: net,
      stockStatus: row.stockStatus || 'in_stock',
      notes: row.notes,
    });
  });

  // Save quotation
  const savedQuote = saveQuotation(
    {
      supplierId: params.supplierId,
      supplierName,
      supplierContact: supplier?.contactPerson,
      supplierPhone: supplier?.phone,
      quoteDate: params.quoteDate,
      expiryDate: params.expiryDate,
      currency: params.currency || 'VNĐ',
      status: 'valid',
      notes: `Nhập tự động từ file ${params.fileName} (${quotationItems.length} sản phẩm)`,
      createdBy: staff,
      items: quotationItems,
    },
    staff
  );

  return {
    ...savedQuote,
    quotation: savedQuote,
    createdProductsCount: createdCount,
  };
};

// ========================================================
// EXPORT ALIASES & COMPONENT HELPER WRAPPERS
// ========================================================
export const getSupplierQuotations = getQuotations;
export const saveSupplierQuotation = saveQuotation;
export const getQuotationAuditLogs = (quotationId?: string): QuotationAuditLog[] => {
  const allLogs = getAuditLogs();
  if (!quotationId) return allLogs;
  return allLogs.filter((log) => log.quotationId === quotationId);
};
export const deleteSupplier = deactivateSupplier;

export const calculateQuotationItemNetPrice = (params: {
  quotedPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  giftValue?: number;
  minQuantity?: number;
}): number => {
  return calculateNetPrice(params);
};

export const calculateItemEstimatedCost = (params: {
  netPrice: number;
  vatPercent?: number;
  freightCost?: number;
  otherCost?: number;
}): number => {
  return calculateTotalEstimatedCost({
    netPricePerUnit: params.netPrice,
    vatPercent: params.vatPercent,
    shippingFee: params.freightCost,
    otherFees: params.otherCost,
  });
};

export const getSupplierStats = (
  supplierId: string,
  quotationsList?: SupplierQuotation[],
  productsList?: PriceProduct[]
) => {
  const allQ = quotationsList || getQuotations();
  const supplierQ = allQ.filter((q) => q.supplierId === supplierId);
  const prodIds = new Set<string>();
  supplierQ.forEach((q) => {
    q.items.forEach((it) => prodIds.add(it.productId));
  });

  return {
    quotesCount: supplierQ.length,
    productsCount: prodIds.size,
  };
};

export const updateSupplierQuotationWithAudit = (
  quotationId: string,
  updates: Partial<SupplierQuotation>,
  staffName: string = 'Nhân viên Sale',
  reason: string = 'Cập nhật thông tin báo giá'
): SupplierQuotation | null => {
  const quotations = getQuotations();
  const index = quotations.findIndex((q) => q.id === quotationId);
  if (index === -1) return null;

  const old = quotations[index];
  const updated: SupplierQuotation = {
    ...old,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  quotations[index] = updated;
  saveQuotations(quotations);

  addAuditLog({
    quotationId,
    supplierId: updated.supplierId,
    action: 'update',
    description: `Cập nhật báo giá đợt #${updated.id.slice(0, 8)} (${updated.supplierName}): ${reason}`,
    changedBy: staffName,
    oldValues: old,
    newValues: updated,
  });

  return updated;
};

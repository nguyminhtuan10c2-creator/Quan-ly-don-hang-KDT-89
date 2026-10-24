import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  UploadCloud,
  Download,
  FileSpreadsheet,
  FileCode,
  HardDrive,
  Info,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Layers,
  ArrowRight,
  Copy,
  FileText,
  Cloud,
  ShieldCheck,
  Check,
  Loader2,
} from 'lucide-react';
import { Order } from '../types';
import {
  getStorageUsageStats,
  StorageUsageStats,
  importOrdersData,
  generateHistoricalOrders,
  exportOrdersAsJson,
  exportOrdersAsCsv,
  downloadSampleTemplateCsv,
  formatVND,
  formatDateVI,
} from '../services/storageService';
import {
  syncAllToFirebase,
  pullFromFirebase,
  subscribeToSyncStatus,
  FirebaseSyncStatus,
} from '../services/firebaseService';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'capacity' | 'export' | 'firebase'>('firebase');
  const [stats, setStats] = useState<StorageUsageStats | null>(null);
  const [cloudStatus, setCloudStatus] = useState<FirebaseSyncStatus>({
    isConfigured: true,
    isConnected: true,
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
    totalSyncedOrders: 0,
  });
  const [importMode, setImportMode] = useState<'append' | 'overwrite'>('append');
  const [pasteContent, setPasteContent] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      refreshStats();
      setStatusMessage(null);
    }
    const unsub = subscribeToSyncStatus((status) => {
      setCloudStatus(status);
    });
    return unsub;
  }, [isOpen]);

  const refreshStats = () => {
    setStats(getStorageUsageStats());
  };

  const handleSyncToCloud = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await syncAllToFirebase();
      setStatusMessage({
        type: 'success',
        text: `Đã đồng bộ thành công ${res.count} đơn hàng, kho sản phẩm và nhân sự lên Firebase Firestore Cloud!`,
      });
      refreshStats();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Lỗi đồng bộ Firebase: ${err.message || 'Không thể ghi dữ liệu'}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePullFromCloud = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await pullFromFirebase();
      setStatusMessage({
        type: 'success',
        text: `Đã tải về thành công ${res.ordersCount} đơn hàng từ Firebase Firestore Cloud!`,
      });
      refreshStats();
      onDataChanged();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Lỗi tải dữ liệu từ Firebase: ${err.message || 'Không thể đọc dữ liệu'}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  // Handle Quick Load 10 Historical Orders
  const handleLoadHistoricalPack = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const historicalOrders = generateHistoricalOrders();
      const res = importOrdersData(historicalOrders, importMode);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Đã nạp thành công ${res.importedCount} đơn hàng cũ (tháng 8, 9, 10) vào hệ thống!`,
        });
        refreshStats();
        onDataChanged();
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
      setIsProcessing(false);
    }, 200);
  };

  // Parse CSV text into partial Order objects
  const parseCsvToOrders = (csvText: string): Partial<Order>[] => {
    const lines = csvText.trim().split(/\r\n|\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
    const orders: Partial<Order>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle simple CSV splitting with quotes support
      const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
      const values: string[] = [];
      let match;
      while ((match = regex.exec(line)) !== null) {
        let val = match[1] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1).replace(/""/g, '"');
        }
        values.push(val.trim());
        if (regex.lastIndex >= line.length) break;
      }

      const orderCode = values[0] || `OLD-${Date.now()}-${i}`;
      const createdAt = values[1] ? new Date(values[1]).toISOString() : new Date().toISOString();
      const customerName = values[2] || `Khách hàng cũ ${i}`;
      const customerPhone = values[3] || '0900000000';
      const deliveryAddress = values[4] || 'TP. Hồ Chí Minh';
      const employeeId = values[5] || 'NV001';
      const employeeName = values[6] || 'Nguyễn Văn An';
      const productName = values[7] || 'Sản phẩm mẫu';
      const price = parseFloat(values[8]) || 1000000;
      const quantity = parseInt(values[9], 10) || 1;
      const shippingFee = parseFloat(values[10]) || 30000;
      const prepaidAmount = parseFloat(values[11]) || 0;
      const status = values[12] || 'delivered';

      orders.push({
        orderCode,
        createdAt,
        customerName,
        customerPhone,
        deliveryAddress,
        employeeId,
        employeeName,
        shippingFee,
        prepaidAmount,
        status: status as any,
        items: [
          {
            productId: `prod-old-${i}`,
            productName,
            sku: `OLD-SKU-${i}`,
            price,
            quantity,
            isWarrantyActivated: true,
            warrantyMonths: 12,
            activationBonusAmount: 100000,
          },
        ],
      });
    }

    return orders;
  };

  // Handle file upload (.json or .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        let ordersToImport: Partial<Order>[] = [];

        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content);
          ordersToImport = Array.isArray(parsed) ? parsed : [parsed];
        } else if (file.name.endsWith('.csv') || file.type.includes('csv')) {
          ordersToImport = parseCsvToOrders(content);
        } else {
          // Attempt JSON parse first, fallback to CSV
          try {
            ordersToImport = JSON.parse(content);
          } catch {
            ordersToImport = parseCsvToOrders(content);
          }
        }

        if (ordersToImport.length === 0) {
          setStatusMessage({
            type: 'error',
            text: 'Không đọc được dữ liệu đơn hàng nào từ file. Vui lòng kiểm tra định dạng.',
          });
          setIsProcessing(false);
          return;
        }

        const res = importOrdersData(ordersToImport, importMode);
        if (res.success) {
          setStatusMessage({
            type: 'success',
            text: `Đã nạp thành công ${res.importedCount} đơn hàng từ file "${file.name}"!`,
          });
          refreshStats();
          onDataChanged();
        } else {
          setStatusMessage({ type: 'error', text: res.message });
        }
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          text: `Lỗi đọc file: ${err.message || 'Dữ liệu không đúng cú pháp JSON/CSV.'}`,
        });
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // Handle manual paste text import
  const handlePasteImport = () => {
    if (!pasteContent.trim()) {
      setStatusMessage({ type: 'error', text: 'Vui lòng dán dữ liệu JSON hoặc CSV vào ô văn bản.' });
      return;
    }

    setIsProcessing(true);
    try {
      let ordersToImport: Partial<Order>[] = [];
      const trimmed = pasteContent.trim();

      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        ordersToImport = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        ordersToImport = parseCsvToOrders(trimmed);
      }

      if (ordersToImport.length === 0) {
        setStatusMessage({
          type: 'error',
          text: 'Không phân tích được đơn hàng nào. Hãy kiểm tra định dạng JSON hoặc bảng CSV.',
        });
        setIsProcessing(false);
        return;
      }

      const res = importOrdersData(ordersToImport, importMode);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Đã nạp thành công ${res.importedCount} đơn hàng từ dữ liệu vừa dán!`,
        });
        setPasteContent('');
        refreshStats();
        onDataChanged();
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Lỗi phân tích: ${err.message || 'Cú pháp không hợp lệ.'}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-xl">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                Nạp Dữ Liệu Đơn Hàng Cũ & Quản Lý Dung Lượng
              </h3>
              <p className="text-xs text-slate-300">
                Nạp đơn hàng lịch sử, kiểm tra sức chứa bộ nhớ, sao lưu và xuất dữ liệu Excel/JSON
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('firebase')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'firebase'
                ? 'bg-white text-amber-600 border-amber-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
            }`}
          >
            <Cloud className="w-4 h-4 text-amber-500" />
            <span>Firebase Cloud</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'import'
                ? 'bg-white text-blue-600 border-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Nạp Đơn Hàng Cũ (Import)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('capacity')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'capacity'
                ? 'bg-white text-blue-600 border-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Dung Lượng Lưu Trữ ({stats ? `${stats.percentUsed}%` : '5MB'})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'export'
                ? 'bg-white text-blue-600 border-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Sao Lưu & Xuất File (Export)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Message Notification */}
          {statusMessage && (
            <div
              className={`p-4 rounded-xl flex items-start space-x-3 text-xs ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="font-semibold">{statusMessage.text}</div>
            </div>
          )}

          {/* TAB 1: IMPORT DATA */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              {/* Mode Selection */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-extrabold text-slate-700 flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Chế độ nạp dữ liệu:</span>
                </span>
                <div className="flex items-center space-x-4 text-xs font-semibold">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Gộp thêm vào danh sách (Khuyên dùng)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer text-amber-700">
                    <input
                      type="radio"
                      name="importMode"
                      value="overwrite"
                      checked={importMode === 'overwrite'}
                      onChange={() => setImportMode('overwrite')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>Ghi đè (Thay thế toàn bộ)</span>
                  </label>
                </div>
              </div>

              {/* Option 1: 1-Click Load 10 Demo Historical Orders */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="bg-blue-600 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                      Khuyên Dùng
                    </span>
                    <h4 className="font-extrabold text-sm text-slate-900 flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span>Nạp nhanh gói 10 đơn hàng cũ mẫu (Historical Pack)</span>
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 max-w-xl">
                    Tự động nạp 10 đơn hàng thực tế trải dài từ tháng 8, 9, 10 với đầy đủ doanh số,
                    kích hoạt bảo hành, hoa hồng nhân viên (NV001, NV002) và tọa độ bản đồ TP.HCM để bạn kiểm tra báo cáo ngay lập tức.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleLoadHistoricalPack}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-xs flex items-center space-x-2 shrink-0 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>Nạp 10 Đơn Mẫu Ngay</span>
                </button>
              </div>

              {/* Option 2: Upload File (CSV or JSON) */}
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center bg-slate-50/60 transition-colors">
                <input
                  type="file"
                  id="orderFileInput"
                  accept=".json,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="orderFileInput"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shadow-xs">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <span className="font-extrabold text-sm text-slate-800">
                    Tải lên file dữ liệu đơn hàng (.JSON hoặc .CSV)
                  </span>
                  <span className="text-xs text-slate-500 max-w-md">
                    Chọn file xuất từ hệ thống cũ, KiotViet, Haravan, Sapo hoặc bảng tính Excel để nạp vào hệ thống.
                  </span>
                  <span className="inline-block mt-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold px-4 py-1.5 rounded-xl transition-colors">
                    Chọn file từ máy tính
                  </span>
                </label>

                {/* Download Sample CSV Template Link */}
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-center space-x-2 text-xs">
                  <span className="text-slate-500">Chưa có file mẫu?</span>
                  <button
                    type="button"
                    onClick={downloadSampleTemplateCsv}
                    className="font-extrabold text-blue-600 hover:text-blue-800 underline flex items-center space-x-1"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Tải File Mẫu Excel/CSV Chuẩn (.csv)</span>
                  </button>
                </div>
              </div>

              {/* Option 3: Paste text directly */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-700 flex items-center space-x-1.5">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>Hoặc dán trực tiếp nội dung JSON / CSV vào đây:</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Hỗ trợ JSON Array hoặc các dòng CSV</span>
                </div>
                <textarea
                  rows={4}
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder={`Ví dụ định dạng CSV:\nNV001-CU01,2026-08-10,Trần Văn Minh,0909123456,120 Hai Bà Trưng Q1 TP.HCM,NV001,Nguyễn Văn An,iPhone 15 Pro Max,29990000,1,30000,0,delivered\n\nHoặc định dạng JSON:\n[{"orderCode": "NV001-01", "customerName": "Lê Văn A", ...}]`}
                  className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!pasteContent.trim() || isProcessing}
                    onClick={handlePasteImport}
                    className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-xs font-extrabold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    Xác nhận nạp dữ liệu từ ô dán
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STORAGE CAPACITY */}
          {activeTab === 'capacity' && stats && (
            <div className="space-y-6">
              {/* Answer Header Card */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg space-y-3">
                <div className="flex items-center space-x-2">
                  <HardDrive className="w-5 h-5 text-blue-400" />
                  <h4 className="font-extrabold text-sm text-slate-100">
                    Dung Lượng & Giới Hạn Lưu Trữ Của Hệ Thống
                  </h4>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Ứng dụng hiện lưu trữ dữ liệu an toàn trên thiết bị thông qua <strong className="text-blue-300">LocalStorage</strong> của trình duyệt với hạn mức tiêu chuẩn là <strong className="text-white">5.0 MB (5,120 KB)</strong>.
                </p>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-300">
                      Đã sử dụng: <strong className="text-emerald-400">{stats.usedKb} KB</strong> / {stats.totalQuotaMb} MB
                    </span>
                    <span className="text-blue-300">{stats.percentUsed}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(1, Math.min(100, stats.percentUsed))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Capacity Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="text-xs text-slate-500 font-bold">Số đơn hàng hiện có</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{stats.ordersCount} đơn</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Chiếm: ~{(stats.ordersBytes / 1024).toFixed(1)} KB
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="text-xs text-slate-500 font-bold">Sức chứa tối đa ước tính</div>
                  <div className="text-2xl font-black text-blue-600 mt-1">
                    ~15,000 – 30,000
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">đơn hàng đầy đủ chi tiết</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="text-xs text-slate-500 font-bold">Số đơn còn nạp thêm được</div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    +{stats.estimatedRemainingOrders.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">đơn hàng nữa trong 5MB</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="text-xs text-slate-500 font-bold">Sản phẩm & Nhân viên</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {stats.productsCount} SP / {stats.staffCount} NV
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Chiếm lượng bộ nhớ rất nhỏ</div>
                </div>
              </div>

              {/* Explanatory FAQ & Upgrade Options */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5 space-y-3">
                <h5 className="text-xs font-black text-blue-900 uppercase tracking-wide flex items-center space-x-1.5">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span>Giải đáp chi tiết: Data lưu trữ được bao nhiêu?</span>
                </h5>

                <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
                  <div className="flex items-start space-x-2">
                    <span className="font-extrabold text-blue-700 shrink-0">1. Đơn hàng chiếm bao nhiêu dung lượng?</span>
                    <span>
                      Mỗi đơn hàng đầy đủ (gồm mã đơn, tên khách, số điện thoại, địa chỉ, tọa độ GPS, danh sách mặt hàng, tiền cọc, shipper, hoa hồng) chỉ chiếm khoảng <strong>0.3 KB – 0.5 KB</strong> dạng text.
                    </span>
                  </div>

                  <div className="flex items-start space-x-2">
                    <span className="font-extrabold text-blue-700 shrink-0">2. Cửa hàng bán được bao lâu trong 5MB?</span>
                    <span>
                      Với tốc độ 30 – 50 đơn/ngày, 5MB bộ nhớ có thể lưu liên tục trong <strong>hơn 1.5 đến 2 năm</strong> mà không lo đầy bộ nhớ.
                    </span>
                  </div>

                  <div className="flex items-start space-x-2">
                    <span className="font-extrabold text-blue-700 shrink-0">3. Nếu muốn lưu trữ không giới hạn?</span>
                    <span>
                      Bạn có thể xuất file Excel/JSON sao lưu định kỳ, hoặc yêu cầu tích hợp <strong>Cơ sở dữ liệu đám mây (Firebase Firestore / Cloud SQL Postgres)</strong> để lưu trữ hàng triệu đơn hàng, đồng bộ nhiều thiết bị và phân quyền nhân viên thời gian thực.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BACKUP & EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    Xuất & Sao Lưu Dữ Liệu Đơn Hàng (Backup)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tải về toàn bộ dữ liệu đơn hàng về máy tính để báo cáo kế toán hoặc sao lưu định kỳ.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Export Excel CSV */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        <span className="font-extrabold text-xs text-slate-900">
                          Xuất file Excel / CSV (.csv)
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Định dạng chuẩn mở được ngay trên Microsoft Excel, Google Sheets. Tự động hỗ trợ font tiếng Việt (UTF-8 BOM).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={exportOrdersAsCsv}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold py-2 px-3 rounded-lg flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Tải File Excel (.csv)</span>
                    </button>
                  </div>

                  {/* Export JSON */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <FileCode className="w-5 h-5 text-blue-600" />
                        <span className="font-extrabold text-xs text-slate-900">
                          Xuất file Sao Lưu JSON (.json)
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Lưu trữ toàn vẹn cấu trúc dữ liệu gồm tọa độ GPS, lịch sử logs giao hàng, dùng để nạp lại vào máy khác bất cứ lúc nào.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={exportOrdersAsJson}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold py-2 px-3 rounded-lg flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Tải Bản Sao Lưu (.json)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sample Template Section */}
              <div className="bg-slate-100/80 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileSpreadsheet className="w-5 h-5 text-slate-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-800">File Mẫu Nhập Liệu Đơn Hàng Cũ</span>
                    <p className="text-[11px] text-slate-500">Dùng để điền đơn hàng cũ từ sổ sách/file Excel trước khi nạp</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleTemplateCsv}
                  className="bg-white hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Tải Mẫu .csv
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: FIREBASE CLOUD SYNC & BACKUP                      */}
          {/* ======================================================== */}
          {activeTab === 'firebase' && (
            <div className="space-y-6">
              {/* Cloud Connection Overview Card */}
              <div className="bg-gradient-to-r from-amber-900/90 to-amber-950 p-6 rounded-2xl text-white shadow-md border border-amber-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-amber-500 rounded-xl text-slate-950 shadow-md">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-amber-200">
                        Cơ Sở Dữ Liệu Firebase Cloud Đã Kết Nối
                      </h4>
                      <p className="text-xs text-amber-100/80">
                        Lưu trữ trực tuyến cho chuỗi bán hàng KDT-89 Appliance
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Trạng thái: Trực Tuyến (Online)</span>
                    </span>
                    <span className="text-xs text-amber-200/90 bg-amber-800/60 px-2.5 py-1 rounded-full font-mono border border-amber-700/60">
                      Project: second-spanner-gvxch
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end justify-center text-xs text-amber-200/90 space-y-1 bg-amber-950/60 p-3.5 rounded-xl border border-amber-800/60">
                  <div className="flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-emerald-300">Bảo mật Firestore ABAC Rules: Đã kích hoạt</span>
                  </div>
                  <p className="text-[11px] text-amber-300/70">
                    Lần đồng bộ gần nhất: {cloudStatus.lastSyncedAt || 'Chưa đồng bộ'}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Sync to Cloud / Pull from Cloud */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Sync Local to Cloud */}
                <div className="bg-white p-5 rounded-xl border-2 border-amber-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-amber-400 transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="font-black text-sm text-slate-900">
                          1. Đẩy Dữ Liệu Lên Cloud (Push to Cloud)
                        </h5>
                        <span className="text-[11px] text-slate-500">
                          Đồng bộ toàn bộ đơn hàng, kho sản phẩm và nhân sự lên Firebase
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Lưu trữ vĩnh viễn trên Cloud Firebase. Khi đổi trình duyệt, dùng máy tính khác hoặc máy tính bảng của shipper, dữ liệu vẫn được bảo toàn trọn vẹn.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncToCloud}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang đẩy dữ liệu lên Firebase...</span>
                      </>
                    ) : (
                      <>
                        <Cloud className="w-4 h-4" />
                        <span>Đẩy Toàn Bộ Dữ Liệu Lên Firebase</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 2. Pull from Cloud to Local */}
                <div className="bg-white p-5 rounded-xl border-2 border-blue-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-blue-400 transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                        <Download className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="font-black text-sm text-slate-900">
                          2. Tải Dữ Liệu Về Máy (Pull from Cloud)
                        </h5>
                        <span className="text-[11px] text-slate-500">
                          Đồng bộ dữ liệu mới nhất từ Firebase về máy hiện tại
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Hữu ích khi bạn mở ứng dụng trên một thiết bị mới hoặc muốn khôi phục lại các đơn hàng và danh mục sản phẩm đã được lưu trữ trên Firebase Cloud trước đó.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handlePullFromCloud}
                    disabled={isProcessing}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang tải về từ Firebase...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Tải Dữ Liệu Từ Firebase Về Máy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Cloud Information & Safeguards */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
                <div className="flex items-center space-x-2 text-slate-800 font-bold">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span>Thông tin kỹ thuật cấu hình:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block">Database ID:</span>
                    <span className="font-mono font-medium text-slate-800 break-all">ai-studio-ordermanager-926266d5-3b1e-41d1-837e-20a3b3e8a991</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block">Auth Domain:</span>
                    <span className="font-mono font-medium text-slate-800">second-spanner-gvxch.firebaseapp.com</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <HardDrive className="w-4 h-4 text-slate-400" />
            <span>
              Bộ nhớ trình duyệt: {stats ? `${stats.usedKb} KB / 5 MB` : 'Sẵn sàng'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

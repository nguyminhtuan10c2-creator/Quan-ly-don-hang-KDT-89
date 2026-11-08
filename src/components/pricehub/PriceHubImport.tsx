import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Info,
  RefreshCw,
  Plus,
  Trash2,
  FileCheck,
  Download,
} from 'lucide-react';
import { PriceProduct, Supplier, QuotationImportPreviewRow } from '../../types';
import {
  parseExcelOrCsvFile,
  executeQuotationImport,
  formatVNDCurrency,
} from '../../services/priceHubService';

interface PriceHubImportProps {
  products: PriceProduct[];
  suppliers: Supplier[];
  onRefresh: () => void;
  onSuccess: (quotationId: string) => void;
}

export const PriceHubImport: React.FC<PriceHubImportProps> = ({
  products,
  suppliers,
  onRefresh,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Supplier & Date metadata for the import
  const [supplierId, setSupplierId] = useState('');
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [createdBy, setCreatedBy] = useState('Sale KDT');

  // Preview data
  const [previewRows, setPreviewRows] = useState<QuotationImportPreviewRow[]>([]);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    matched: number;
    newProducts: number;
    errors: number;
  } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsParsing(true);
    setParseError(null);

    try {
      const parsed = await parseExcelOrCsvFile(file, products, suppliers);
      setPreviewRows(parsed.rows);

      // Auto-select detected supplier if found
      if (parsed.detectedSupplierId && !supplierId) {
        setSupplierId(parsed.detectedSupplierId);
      }

      // Compute statistics
      const total = parsed.rows.length;
      const matched = parsed.rows.filter((r) => r.isMatched && !r.hasError).length;
      const newProducts = parsed.rows.filter((r) => !r.isMatched && !r.hasError && r.createNewIfMissing).length;
      const errors = parsed.rows.filter((r) => r.hasError).length;

      setImportSummary({ total, matched, newProducts, errors });
    } catch (err: any) {
      setParseError(err?.message || 'Không thể đọc file. Vui lòng kiểm tra định dạng.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleRowChange = (index: number, field: keyof QuotationImportPreviewRow, value: any) => {
    setPreviewRows((prev) => {
      const copy = [...prev];
      const row = { ...copy[index], [field]: value };

      // Recalculate net if price or discount changed
      if (field === 'quotedPrice' || field === 'discountPercent') {
        const p = Number(row.quotedPrice) || 0;
        const d = Number(row.discountPercent) || 0;
        row.netPrice = Math.round(p * (1 - d / 100));
      }

      if (field === 'matchedProductId') {
        const matched = products.find((p) => p.id === value);
        if (matched) {
          row.isMatched = true;
          row.matchedProductName = matched.name;
          row.createNewIfMissing = false;
        } else {
          row.isMatched = false;
          row.matchedProductName = undefined;
          row.createNewIfMissing = true;
        }
      }

      copy[index] = row;
      return copy;
    });
  };

  const handleToggleCreateNew = (index: number) => {
    setPreviewRows((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        createNewIfMissing: !copy[index].createNewIfMissing,
      };
      return copy;
    });
  };

  const handleRemoveRow = (index: number) => {
    setPreviewRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExecuteImport = () => {
    if (!supplierId) {
      alert('Vui lòng chọn Nhà cung cấp của file báo giá này!');
      return;
    }

    if (previewRows.length === 0) {
      alert('Không có dữ liệu hợp lệ để import!');
      return;
    }

    const validRows = previewRows.filter((r) => !r.hasError && (r.quotedPrice || 0) > 0);
    if (validRows.length === 0) {
      alert('Tất cả các dòng đều bị lỗi hoặc không có đơn giá hợp lệ!');
      return;
    }

    const selectedSupplier = suppliers.find((s) => s.id === supplierId);
    if (!selectedSupplier) {
      alert('Không tìm thấy nhà cung cấp đã chọn!');
      return;
    }

    const result = executeQuotationImport(
      {
        fileName: selectedFile?.name || 'import_file.xlsx',
        fileSize: selectedFile?.size || 0,
        detectedSupplierId: selectedSupplier.id,
        supplierId: selectedSupplier.id,
        quoteDate: new Date(quoteDate).toISOString(),
        rows: previewRows,
      },
      products,
      suppliers,
      createdBy
    );

    alert(
      `Đã import thành công!\n- ${result.createdProductsCount} sản phẩm hỏi giá mới đã tạo\n- 1 đợt báo giá chính thức với ${result.quotation.items.length} món được lưu.`
    );

    onRefresh();
    onSuccess(result.quotation.id);
  };

  const handleDownloadSampleExcel = () => {
    // Generate a quick CSV sample template for users
    const sampleCsv = `Tên sản phẩm,Mã hàng / Model,Thương hiệu,Đơn vị tính,Đơn giá NPP,Chiết khấu %,Quy cách,Tình trạng
Vòng bi bạc đạn SKF 6205-2RSH,6205-2RSH,SKF,Cái,85000,12,Dày 15mm,Có sẵn
Aptomat khối MCCB 3P 100A,A9N18360,Schneider,Cái,420000,15,Dòng cắt 25kA,Đặt hàng 2 ngày
Dây curoa Bando B-52,B-52,Bando,Sợi,65000,8,Bản B,Có sẵn`;

    const blob = new Blob(['\uFEFF' + sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Mau_import_bao_gia_KDT.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold mb-2">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            MODULE D (IMPORT): NHẬN DIỆN & ĐỐI SOÁT FILE EXCEL / CSV / PDF
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Import Bảng Báo Giá Nhà Phân Phối
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-2xl">
            Tải lên bảng giá Excel, CSV hoặc PDF từ nhà cung cấp. Hệ thống tự động nhận diện cột, đối soát mã hàng và hiển thị bảng kiểm tra Preview trước khi lưu chính thức.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadSampleExcel}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4 text-slate-600" />
          Tải file mẫu Excel / CSV
        </button>
      </div>

      {/* Upload Zone */}
      <div className="bg-white rounded-2xl p-6 border-2 border-dashed border-slate-300 hover:border-blue-500 transition-colors text-center shadow-sm">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.pdf"
          onChange={handleFileChange}
          className="hidden"
          id="fileImportInput"
        />

        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
          <Upload className="w-8 h-8" />
        </div>

        <h3 className="text-base font-bold text-slate-800 mb-1">
          {selectedFile ? selectedFile.name : 'Chọn hoặc kéo thả file bảng giá vào đây'}
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
          Hỗ trợ file Excel (.xlsx, .xls), CSV hoặc văn bản PDF. Hệ thống nhận diện tự động các cột Tên, Model, Giá, Chiết khấu.
        </p>

        <label
          htmlFor="fileImportInput"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
        >
          <Upload className="w-4 h-4" />
          {selectedFile ? 'Chọn lại file khác' : 'Chọn file từ máy tính'}
        </label>

        {isParsing && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-blue-600">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Đang đọc và phân tích cấu trúc bảng giá...
          </div>
        )}

        {parseError && (
          <div className="mt-4 p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-rose-200 max-w-md mx-auto">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {parseError}
          </div>
        )}
      </div>

      {/* Preview Screen (Strictly enforced: no auto-save before user preview & verification!) */}
      {previewRows.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5 animate-in fade-in duration-200">
          {/* Supplier and Date selection */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              Thông Tin Báo Giá Chung Cho Đợt Import Này
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nhà cung cấp <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn nhà cung cấp phát hành bảng giá --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.code}] {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ngày áp dụng</label>
                <input
                  type="date"
                  value={quoteDate}
                  onChange={(e) => setQuoteDate(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Người nhập</label>
                <input
                  type="text"
                  value={createdBy}
                  onChange={(e) => setCreatedBy(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Import Summary Badges */}
          {importSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Tổng số dòng</span>
                <strong className="text-slate-900 text-sm">{previewRows.length} dòng</strong>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <span className="text-emerald-600 block text-[10px]">Đã khớp SP có sẵn</span>
                <strong className="text-emerald-700 text-sm">
                  {previewRows.filter((r) => r.isMatched && !r.hasError).length} sản phẩm
                </strong>
              </div>
              <div className="bg-purple-50 p-3 rounded-xl border border-purple-200">
                <span className="text-purple-600 block text-[10px]">Sản phẩm mới sẽ tạo</span>
                <strong className="text-purple-700 text-sm">
                  {previewRows.filter((r) => !r.isMatched && !r.hasError && r.createNewIfMissing).length} sản phẩm
                </strong>
              </div>
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                <span className="text-rose-600 block text-[10px]">Dòng lỗi cần kiểm tra</span>
                <strong className="text-rose-700 text-sm">
                  {previewRows.filter((r) => r.hasError).length} dòng
                </strong>
              </div>
            </div>
          )}

          {/* Table Preview */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[460px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-100 z-10 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Tên trong file</th>
                    <th className="py-2.5 px-3">Model / Part</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Đối soát SP hệ thống</th>
                    <th className="py-2.5 px-3 text-right">Giá báo (VNĐ)</th>
                    <th className="py-2.5 px-3 text-center">CK %</th>
                    <th className="py-2.5 px-3 text-right">Giá Net</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    <th className="py-2.5 px-2 text-right">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50 transition-colors ${
                        row.hasError ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      <td className="py-2 px-3 font-mono text-slate-400">{row.rowIndex}</td>

                      {/* Raw Name */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={row.rawProductName}
                          onChange={(e) => handleRowChange(idx, 'rawProductName', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold"
                        />
                      </td>

                      {/* Raw Model */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={row.rawModel || ''}
                          onChange={(e) => handleRowChange(idx, 'rawModel', e.target.value)}
                          className="w-28 px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                        />
                      </td>

                      {/* Matched Product Select */}
                      <td className="py-2 px-3">
                        <select
                          value={row.matchedProductId || ''}
                          onChange={(e) => handleRowChange(idx, 'matchedProductId', e.target.value)}
                          className={`w-full px-2 py-1 rounded text-xs font-medium border ${
                            row.isMatched
                              ? 'border-emerald-300 bg-emerald-50/50 text-emerald-800'
                              : 'border-slate-300 bg-white text-slate-700'
                          }`}
                        >
                          <option value="">+ Tạo mới: "{row.rawProductName}"</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.code}] {p.name} {p.model ? `(${p.model})` : ''}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Quoted Price */}
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="1000"
                          value={row.quotedPrice || 0}
                          onChange={(e) =>
                            handleRowChange(idx, 'quotedPrice', Number(e.target.value) || 0)
                          }
                          className="w-24 px-2 py-1 text-right bg-white border border-slate-200 rounded text-xs font-bold text-slate-800"
                        />
                      </td>

                      {/* Discount % */}
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={row.discountPercent || 0}
                          onChange={(e) =>
                            handleRowChange(idx, 'discountPercent', Number(e.target.value) || 0)
                          }
                          className="w-14 px-1 py-1 text-center bg-white border border-slate-200 rounded text-xs font-bold text-indigo-700"
                        />
                      </td>

                      {/* Net Price */}
                      <td className="py-2 px-3 text-right font-black text-emerald-600">
                        {formatVNDCurrency(row.netPrice || 0)}
                      </td>

                      {/* Status */}
                      <td className="py-2 px-3 text-center">
                        {row.hasError ? (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded"
                            title={row.errorMessage}
                          >
                            <XCircle className="w-3 h-3" />
                            Lỗi
                          </span>
                        ) : row.isMatched ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" />
                            Đã khớp
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                            <Sparkles className="w-3 h-3" />
                            Tạo mới
                          </span>
                        )}
                      </td>

                      {/* Remove row */}
                      <td className="py-2 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                          title="Bỏ qua dòng này"
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

          {/* Action Confirmation Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-200">
            <div className="text-xs text-slate-500">
              * Vui lòng kiểm tra kỹ danh sách. Sau khi xác nhận, toàn bộ bản ghi sẽ được lưu vào lịch sử báo giá chính thức.
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setPreviewRows([])}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleExecuteImport}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-black shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <FileCheck className="w-4 h-4" />
                Xác Nhận Import Vào Hệ Thống
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

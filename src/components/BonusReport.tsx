import React, { useState } from 'react';
import { Award, Users, ShieldCheck, DollarSign, Download, Filter, Search, CheckCircle2, RefreshCw } from 'lucide-react';
import { EmployeeBonusSummary } from '../types';
import { formatVND } from '../services/storageService';

interface BonusReportProps {
  bonusSummaries: EmployeeBonusSummary[];
}

export const BonusReport: React.FC<BonusReportProps> = ({ bonusSummaries }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Total Calculations
  const totalBonusAll = bonusSummaries.reduce((acc, curr) => acc + curr.totalBonusEarned, 0);
  const totalActivatedProducts = bonusSummaries.reduce((acc, curr) => acc + curr.totalWarrantyItemsActivated, 0);
  const totalCompletedOrders = bonusSummaries.reduce((acc, curr) => acc + curr.completedOrders, 0);

  const topStaff = bonusSummaries.length > 0 ? bonusSummaries[0] : null;

  const filteredSummaries = bonusSummaries.filter(
    (s) =>
      s.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportCSV = () => {
    const headers = ['Ma_Nhan_Vien', 'Ten_Nhan_Vien', 'Tong_Don_Hang', 'Don_Hoan_Thanh', 'So_SP_Kich_Hoat_BH', 'Tong_Tien_Thuong_VND'];
    const rows = filteredSummaries.map((s) => [
      s.employeeId,
      `"${s.employeeName}"`,
      s.totalOrders,
      s.completedOrders,
      s.totalWarrantyItemsActivated,
      s.totalBonusEarned,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Bao_Cao_Thuong_Kich_Hoat_BH_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <Award className="w-6 h-6 text-emerald-600" />
            <span>Báo cáo Tiền Thưởng Kích Hoạt Bảo Hành (Warranty Bonus Report)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng hợp và đối soát hoa hồng kích hoạt bảo hành cho từng Mã nhân viên (Employee ID) phục vụ chi trả thưởng.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center space-x-2 shadow-md shadow-emerald-500/20 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Xuất Báo Cáo CSV</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-lg">
          <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Tổng tiền thưởng đã ghi nhận</p>
          <h3 className="text-2xl font-black mt-1">{formatVND(totalBonusAll)}</h3>
          <p className="text-[11px] text-emerald-200 mt-3 flex items-center">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            Chi trả tự động theo Mã Nhân Viên
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Số sản phẩm đã kích hoạt BH</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{totalActivatedProducts} sản phẩm</h3>
          <p className="text-[11px] text-slate-500 mt-3">
            Từ {totalCompletedOrders} đơn hàng đã xuất
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">NV Dẫn đầu mức thưởng</p>
          {topStaff ? (
            <div>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                {topStaff.employeeName} ({topStaff.employeeId})
              </h3>
              <p className="text-xs font-extrabold text-emerald-600 mt-1">{formatVND(topStaff.totalBonusEarned)}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-2">Chưa có dữ liệu</p>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo Mã nhân viên (Mã NV) hoặc Tên nhân viên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Employee Bonus Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 text-sm">
            Bảng chi tiết tiền thưởng theo Mã Nhân Viên (Employee ID)
          </h3>
          <span className="text-xs text-slate-500">{filteredSummaries.length} nhân viên</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Mã Nhân Viên</th>
                <th className="py-3 px-4">Họ và Tên</th>
                <th className="py-3 px-4 text-center">Tổng số đơn</th>
                <th className="py-3 px-4 text-center">Đơn thành công</th>
                <th className="py-3 px-4 text-center">Số SP kích hoạt BH</th>
                <th className="py-3 px-4 text-right">Tổng Doanh số</th>
                <th className="py-3 px-4 text-right">Tổng Tiền Thưởng (VNĐ)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Không tìm thấy nhân viên nào.
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((emp) => (
                  <tr key={emp.employeeId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-black">
                      <span className="bg-blue-900 text-white font-extrabold px-2.5 py-1 rounded-md text-xs shadow-xs border border-blue-800">
                        {emp.employeeId}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">{emp.employeeName}</td>

                    <td className="py-3.5 px-4 text-center font-semibold text-slate-700">{emp.totalOrders} đơn</td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
                        {emp.completedOrders} đơn
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-blue-700">
                      {emp.totalWarrantyItemsActivated} SP
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium text-slate-700">{formatVND(emp.totalSalesValue)}</td>

                    <td className="py-3.5 px-4 text-right font-black text-emerald-700 text-sm">
                      {formatVND(emp.totalBonusEarned)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

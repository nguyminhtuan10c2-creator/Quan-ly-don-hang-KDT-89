import React, { useState } from 'react';
import { X, UserCheck, Plus, Shield, User, Check, Edit3 } from 'lucide-react';
import { Staff } from '../types';
import { getStaff, getActiveStaff, setActiveStaff, saveStaff } from '../services/storageService';

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StaffModal: React.FC<StaffModalProps> = ({ isOpen, onClose }) => {
  const [staffList, setStaffList] = useState<Staff[]>(getStaff());
  const activeStaff = getActiveStaff();
  const [isAdding, setIsAdding] = useState(false);

  // New staff form state
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [role, setRole] = useState<'Sales' | 'Admin' | 'Delivery'>('Sales');
  const [phone, setPhone] = useState('');

  if (!isOpen) return null;

  const handleSelectStaff = (staff: Staff) => {
    setActiveStaff(staff.id);
    onClose();
  };

  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId.trim() || !employeeName.trim()) {
      alert('Vui lòng nhập Mã nhân viên và Họ tên!');
      return;
    }

    // Check duplicate employee ID
    const exists = staffList.some((s) => s.employeeId.toLowerCase() === employeeId.trim().toLowerCase());
    if (exists) {
      alert(`Mã nhân viên ${employeeId} đã tồn tại trong hệ thống!`);
      return;
    }

    const newStaff = saveStaff({
      employeeId: employeeId.trim().toUpperCase(),
      employeeName: employeeName.trim(),
      role,
      email: `${employeeId.toLowerCase()}@ordermanager.vn`,
      phone: phone.trim() || '0900000000',
    });

    setStaffList(getStaff());
    setActiveStaff(newStaff.id);
    setIsAdding(false);
    setEmployeeId('');
    setEmployeeName('');
    setPhone('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base">Tài khoản & Nhân viên bán hàng</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Active Account Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                {activeStaff.employeeId}
              </div>
              <div>
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Tài khoản đang đăng nhập</p>
                <p className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                  <span>{activeStaff.employeeName}</span>
                  <span className="text-xs font-normal text-slate-500">({activeStaff.role})</span>
                </p>
              </div>
            </div>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-lg border border-emerald-300">
              Hoạt động
            </span>
          </div>

          {/* List of Available Staff */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Chọn nhân viên tạo đơn ({staffList.length})
              </h4>
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAdding ? 'Hủy' : 'Thêm NV mới'}</span>
              </button>
            </div>

            {/* Add Staff Form */}
            {isAdding ? (
              <form onSubmit={handleAddStaffSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 mb-4">
                <p className="text-xs font-bold text-slate-700">Tạo thông tin Nhân viên mới</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mã nhân viên (Mã NV) *</label>
                    <input
                      type="text"
                      placeholder="VD: NV005"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Họ và tên *</label>
                    <input
                      type="text"
                      placeholder="VD: Ngô Văn Minh"
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Chức vụ</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      <option value="Sales">Sales (Bán hàng)</option>
                      <option value="Admin">Admin (Quản lý)</option>
                      <option value="Delivery">Giao hàng</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Số điện thoại</label>
                    <input
                      type="text"
                      placeholder="0901234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
                >
                  Lưu & Đăng nhập ngay
                </button>
              </form>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {staffList.map((staff) => {
                  const isCurrent = staff.id === activeStaff.id;
                  return (
                    <div
                      key={staff.id}
                      onClick={() => handleSelectStaff(staff)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isCurrent
                          ? 'bg-blue-50/90 border-blue-300 shadow-xs ring-1 ring-blue-400'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-xs ${
                            isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {staff.employeeId}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-sm text-slate-900">{staff.employeeName}</span>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              Mã: {staff.employeeId}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {staff.role} • {staff.phone}
                          </p>
                        </div>
                      </div>

                      {isCurrent ? (
                        <div className="bg-blue-600 text-white p-1 rounded-full">
                          <Check className="w-4 h-4" />
                        </div>
                      ) : (
                        <span className="text-xs text-blue-600 font-medium hover:underline">Chuyển sang</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="text-xs font-semibold px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

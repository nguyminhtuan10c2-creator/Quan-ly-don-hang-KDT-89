import React, { useState } from 'react';
import { PackageCheck, User, RefreshCw, Store, ShieldCheck, UserCheck, Database, HardDrive } from 'lucide-react';
import { getActiveStaff, getStoreInfo, resetToDemoData } from '../services/storageService';
import { StaffModal } from './StaffModal';

interface HeaderProps {
  onNavigate: (tab: string) => void;
  onOpenDataManagement?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, onOpenDataManagement }) => {
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const activeStaff = getActiveStaff();
  const storeInfo = getStoreInfo();

  const handleReset = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục dữ liệu mẫu ban đầu không?')) {
      resetToDemoData();
    }
  };

  return (
    <>
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Store Title */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
              <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center text-white">
                <PackageCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent">
                    OrderManager
                  </span>
                  <span className="bg-blue-900/80 text-blue-300 text-xs px-2 py-0.5 rounded-full border border-blue-700/50 font-medium">
                    v2.5
                  </span>
                </div>
                <p className="text-xs text-slate-400 flex items-center space-x-1">
                  <Store className="w-3 h-3 inline mr-1 text-slate-400" />
                  <span>{storeInfo.name}</span>
                </p>
              </div>
            </div>

            {/* Quick Actions & Staff Profile */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Data & Storage Management Button */}
              {onOpenDataManagement && (
                <button
                  onClick={onOpenDataManagement}
                  title="Nạp dữ liệu đơn hàng cũ & Quản lý dung lượng"
                  className="flex items-center space-x-1.5 text-xs font-bold text-blue-300 hover:text-white bg-blue-950/80 hover:bg-blue-900 px-3 py-1.5 rounded-xl border border-blue-800/80 transition-colors shadow-xs"
                >
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden md:inline">Nạp & Quản lý Data</span>
                  <span className="md:hidden">Data</span>
                </button>
              )}

              {/* Reset Data Button */}
              <button
                onClick={handleReset}
                title="Khôi phục dữ liệu thử nghiệm ban đầu"
                className="hidden lg:flex items-center space-x-1 text-xs text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700/60 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset Mẫu</span>
              </button>

              {/* Active Staff Account Badge */}
              <button
                onClick={() => setIsStaffModalOpen(true)}
                className="flex items-center space-x-3 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl px-3 py-1.5 transition-all text-left group"
              >
                <div className="relative">
                  {activeStaff.avatar ? (
                    <img
                      src={activeStaff.avatar}
                      alt={activeStaff.employeeName}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/40"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600/30 text-blue-300 flex items-center justify-center font-bold text-xs border border-blue-500/40">
                      {activeStaff.employeeId}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900"></span>
                </div>

                <div className="hidden sm:block">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-blue-400 bg-blue-950/80 px-1.5 py-0.2 rounded border border-blue-800/60">
                      {activeStaff.employeeId}
                    </span>
                    <span className="text-xs font-semibold text-white group-hover:text-blue-200 transition-colors">
                      {activeStaff.employeeName}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 flex items-center space-x-1">
                    <UserCheck className="w-3 h-3 text-emerald-400 mr-0.5" />
                    <span>NV Bán hàng (Nhấn để đổi)</span>
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Staff switcher modal */}
      {isStaffModalOpen && (
        <StaffModal isOpen={isStaffModalOpen} onClose={() => setIsStaffModalOpen(false)} />
      )}
    </>
  );
};

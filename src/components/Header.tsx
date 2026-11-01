import React, { useState, useEffect } from 'react';
import { PackageCheck, User, RefreshCw, Store, ShieldCheck, UserCheck, Database, HardDrive, Cloud, CheckCircle, Loader2 } from 'lucide-react';
import { getActiveStaff, getStoreInfo, resetToDemoData } from '../services/storageService';
import { StaffModal } from './StaffModal';
import { syncAllToFirebase, subscribeToSyncStatus, FirebaseSyncStatus } from '../services/firebaseService';

interface HeaderProps {
  onNavigate: (tab: string) => void;
  onOpenDataManagement?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, onOpenDataManagement }) => {
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<FirebaseSyncStatus>({
    isConfigured: true,
    isConnected: true,
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
    totalSyncedOrders: 0,
  });
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const activeStaff = getActiveStaff();
  const storeInfo = getStoreInfo();

  useEffect(() => {
    const unsub = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
    });
    return unsub;
  }, []);

  const handleQuickCloudSync = async () => {
    try {
      setSyncMessage('Đang đồng bộ...');
      const res = await syncAllToFirebase();
      setSyncMessage(`Đã đồng bộ ${res.count} đơn lên Cloud!`);
      setTimeout(() => setSyncMessage(null), 3000);
    } catch (err: any) {
      setSyncMessage('Lỗi đồng bộ');
      setTimeout(() => setSyncMessage(null), 3500);
    }
  };

  const handleReset = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục dữ liệu mẫu ban đầu không?')) {
      resetToDemoData();
    }
  };

  return (
    <>
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 no-print overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo & Store Title */}
            <div className="flex items-center space-x-2 sm:space-x-3 cursor-pointer shrink-0" onClick={() => onNavigate('dashboard')}>
              <div className="h-9 w-9 sm:h-11 sm:w-auto bg-white/10 p-1 rounded-xl border border-slate-700/60 shadow-lg flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src="/assets/aistudio/logo_Cty_KDT-10_d91b9dae.png"
                  alt="KDT-89 Logo"
                  className="h-7 w-7 sm:h-9 sm:w-auto object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-sm sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-amber-200 bg-clip-text text-transparent truncate">
                    KDT-89 <span className="hidden sm:inline">Logistics</span>
                  </span>
                  <span className="hidden md:inline bg-amber-500/20 text-amber-300 text-[10px] sm:text-xs px-2 py-0.5 rounded-full border border-amber-500/30 font-medium shrink-0">
                    dienmaykdt89.com
                  </span>
                </div>
                <p className="hidden sm:flex text-xs text-slate-400 items-center truncate">
                  <Store className="w-3 h-3 inline mr-1 text-slate-400 shrink-0" />
                  <span className="truncate">{storeInfo.name}</span>
                </p>
              </div>
            </div>

            {/* Quick Actions & Staff Profile */}
            <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
              {/* Firebase Cloud Sync Button */}
              <button
                type="button"
                onClick={handleQuickCloudSync}
                disabled={syncStatus.isSyncing}
                title={`Đồng bộ cơ sở dữ liệu Firebase Cloud${syncStatus.lastSyncedAt ? ' - Lần cuối: ' + syncStatus.lastSyncedAt : ''}`}
                className="flex items-center space-x-1 sm:space-x-1.5 text-xs font-bold text-amber-300 hover:text-white bg-amber-950/70 hover:bg-amber-900/90 px-2 sm:px-3 py-1.5 rounded-xl border border-amber-700/60 transition-colors shadow-xs"
              >
                {syncStatus.isSyncing ? (
                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                ) : (
                  <Cloud className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span className="hidden sm:inline">
                  {syncMessage || (syncStatus.isSyncing ? 'Đang lưu...' : 'Cloud Firebase')}
                </span>
                <span className="sm:hidden text-[11px]">
                  {syncStatus.isSyncing ? '...' : 'Sync'}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-slate-900 shrink-0 animate-pulse" title="Đã kết nối Firebase" />
              </button>

              {/* Data & Storage Management Button */}
              {onOpenDataManagement && (
                <button
                  type="button"
                  onClick={onOpenDataManagement}
                  title="Nạp dữ liệu đơn hàng cũ & Quản lý dung lượng"
                  className="hidden sm:flex items-center space-x-1.5 text-xs font-bold text-blue-300 hover:text-white bg-blue-950/80 hover:bg-blue-900 px-3 py-1.5 rounded-xl border border-blue-800/80 transition-colors shadow-xs"
                >
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden md:inline">Nạp & Quản lý Data</span>
                  <span className="md:hidden">Data</span>
                </button>
              )}

              {/* Reset Data Button */}
              <button
                type="button"
                onClick={handleReset}
                title="Khôi phục dữ liệu thử nghiệm ban đầu"
                className="hidden lg:flex items-center space-x-1 text-xs text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700/60 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset</span>
              </button>

              {/* Active Staff Account Badge */}
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(true)}
                className="flex items-center space-x-1.5 sm:space-x-3 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 transition-all text-left group"
              >
                <div className="relative shrink-0">
                  {activeStaff.avatar ? (
                    <img
                      src={activeStaff.avatar}
                      alt={activeStaff.employeeName}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-blue-500/40"
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600/30 text-blue-300 flex items-center justify-center font-bold text-[11px] sm:text-xs border border-blue-500/40">
                      {activeStaff.employeeId}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900"></span>
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
                    <span>NV Bán hàng</span>
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

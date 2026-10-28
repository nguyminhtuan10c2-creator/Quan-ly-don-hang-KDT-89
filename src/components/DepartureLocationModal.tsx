import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Building2,
  Plus,
  Trash2,
  Edit2,
  Check,
  Star,
  Phone,
  Compass,
  AlertCircle,
  Navigation,
  ExternalLink,
} from 'lucide-react';
import { DepartureLocation } from '../types';
import {
  getDepartureLocations,
  saveDepartureLocation,
  deleteDepartureLocation,
  setDefaultDepartureLocation,
} from '../services/storageService';
import { VietnamAddressMapPicker } from './VietnamAddressMapPicker';
import { isCoordinateInVietnam, DEFAULT_VIETNAM_COORDS } from '../services/geocodingService';

interface DepartureLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelected?: (location: DepartureLocation) => void;
  onLocationsUpdated?: (locations: DepartureLocation[]) => void;
  initialMode?: 'add' | 'manage';
}

export const DepartureLocationModal: React.FC<DepartureLocationModalProps> = ({
  isOpen,
  onClose,
  onLocationSelected,
  onLocationsUpdated,
  initialMode = 'add',
}) => {
  const [locations, setLocations] = useState<DepartureLocation[]>([]);
  const [mode, setMode] = useState<'add' | 'manage'>(initialMode);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [lat, setLat] = useState<number>(10.7418); // Default to District 8 Hiệp Ân warehouse
  const [lng, setLng] = useState<number>(106.6722);
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadLocations();
      setMode(initialMode);
      resetForm();
    }
  }, [isOpen, initialMode]);

  const loadLocations = () => {
    const list = getDepartureLocations();
    setLocations(list);
    return list;
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setAddress('89 Đường Số 1, Khu Dân Cư Hiệp Ân, Phường 5, Quận 8, TP. Hồ Chí Minh');
    setLat(10.7418);
    setLng(106.6722);
    setIsDefault(false);
    setNotes('');
    setEditingId(null);
    setErrorMessage(null);
  };

  const handleStartEdit = (loc: DepartureLocation) => {
    setEditingId(loc.id);
    setName(loc.name);
    setPhone(loc.phone || '');
    setAddress(loc.address);
    setLat(loc.lat);
    setLng(loc.lng);
    setIsDefault(!!loc.isDefault);
    setNotes(loc.notes || '');
    setMode('add');
    setErrorMessage(null);
  };

  const handleApplyPreset = (preset: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    phone?: string;
  }) => {
    setName(preset.name);
    setAddress(preset.address);
    setLat(preset.lat);
    setLng(preset.lng);
    if (preset.phone) setPhone(preset.phone);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Vui lòng nhập Tên địa điểm xuất phát / kho hàng!');
      return;
    }

    if (!address.trim()) {
      setErrorMessage('Vui lòng nhập Địa chỉ chi tiết điểm xuất phát!');
      return;
    }

    if (!isCoordinateInVietnam(lat, lng)) {
      setErrorMessage('Tọa độ GPS phải nằm trong lãnh thổ Việt Nam.');
      return;
    }

    const saved = saveDepartureLocation({
      id: editingId || undefined,
      name: name.trim(),
      phone: phone.trim() || undefined,
      address: address.trim(),
      lat,
      lng,
      isDefault,
      notes: notes.trim() || undefined,
    });

    const updatedList = loadLocations();
    if (onLocationsUpdated) {
      onLocationsUpdated(updatedList);
    }
    if (onLocationSelected) {
      onLocationSelected(saved);
    }

    resetForm();
    setMode('manage');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (locations.length <= 1) {
      alert('Hệ thống phải có ít nhất 1 điểm xuất phát / kho hàng!');
      return;
    }
    if (window.confirm('Bạn có chắc chắn muốn xóa địa điểm xuất phát này?')) {
      deleteDepartureLocation(id);
      const updatedList = loadLocations();
      if (onLocationsUpdated) {
        onLocationsUpdated(updatedList);
      }
    }
  };

  const handleSetDefault = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDefaultDepartureLocation(id);
    const updatedList = loadLocations();
    if (onLocationsUpdated) {
      onLocationsUpdated(updatedList);
    }
  };

  const handleSelectLocation = (loc: DepartureLocation) => {
    if (onLocationSelected) {
      onLocationSelected(loc);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                {editingId ? 'Chỉnh Sửa Địa Điểm Xuất Phát' : mode === 'add' ? 'Thêm Địa Điểm Xuất Phát / Kho Hàng' : 'Danh Sách Địa Điểm Xuất Phát'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Thiết lập vị trí đầu chuyến đi để tính cung đường & cự ly giao hàng chính xác
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center border-b border-slate-200 px-5 pt-3 bg-slate-50 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMode('add');
              if (!editingId) resetForm();
            }}
            className={`pb-2.5 text-xs font-bold px-3 border-b-2 transition-all flex items-center space-x-1.5 ${
              mode === 'add'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{editingId ? 'Chỉnh sửa' : 'Thêm địa điểm mới'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('manage');
              setEditingId(null);
            }}
            className={`pb-2.5 text-xs font-bold px-3 border-b-2 transition-all flex items-center space-x-1.5 ${
              mode === 'manage'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Tất cả điểm xuất phát ({locations.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-300 text-rose-800 px-3.5 py-2 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {mode === 'add' ? (
            <form onSubmit={handleSave} className="space-y-4">
              {/* Quick Presets */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                  📍 Gợi ý vị trí kho nhanh (Bấm để điền mẫu):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyPreset({
                        name: 'Kho Chính - KDC Hiệp Ân (Quận 8)',
                        address: '89 Đường Số 1, Khu Dân Cư Hiệp Ân, Phường 5, Quận 8, TP. Hồ Chí Minh',
                        lat: 10.7418,
                        lng: 106.6722,
                        phone: '1900 6868 - 0988.123.456',
                      })
                    }
                    className="text-[11px] bg-white border border-blue-300 text-blue-800 hover:bg-blue-50 px-2.5 py-1 rounded-lg font-bold transition-colors shadow-2xs"
                  >
                    🏢 Kho Hiệp Ân Q.8 (Kho chính)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyPreset({
                        name: 'Showroom Trung Tâm (Quận 1)',
                        address: 'Số 188 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
                        lat: 10.7698,
                        lng: 106.6897,
                        phone: '0903.112.233',
                      })
                    }
                    className="text-[11px] bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 px-2.5 py-1 rounded-lg font-semibold transition-colors"
                  >
                    🏬 Showroom Q.1
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyPreset({
                        name: 'Kho Trung Chuyển (Bình Tân)',
                        address: '150 Đường Số 7, Phường An Lạc A, Quận Bình Tân, TP. Hồ Chí Minh',
                        lat: 10.7516,
                        lng: 106.6115,
                        phone: '0909.888.777',
                      })
                    }
                    className="text-[11px] bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 px-2.5 py-1 rounded-lg font-semibold transition-colors"
                  >
                    📦 Kho Tây Bình Tân
                  </button>
                </div>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên điểm xuất phát / Kho hàng <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Kho Chính KDC Hiệp Ân Q.8"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số điện thoại liên hệ / Hotline kho
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 0988.123.456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Address Map Picker Component */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Địa chỉ & Tọa độ bản đồ OpenStreetMap <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Tìm địa chỉ hoặc bấm trực tiếp trên bản đồ để xác định vị trí đầu xuất phát chính xác từng ngõ ngách.
                </p>
                <VietnamAddressMapPicker
                  initialAddress={address}
                  initialLat={lat}
                  initialLng={lng}
                  onLocationSelect={(res) => {
                    setAddress(res.address);
                    setLat(res.lat);
                    setLng(res.lng);
                  }}
                  height="260px"
                  placeholder="Nhập địa chỉ kho (VD: 89 đường số 01 hiệp ân q8 hcm)..."
                />
              </div>

              {/* Coordinates display & Default checkbox */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center space-x-2 text-xs">
                  <span className="font-mono bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700 font-bold border border-slate-200">
                    GPS: {lat.toFixed(5)}, {lng.toFixed(5)}
                  </span>
                  <a
                    href={`https://www.google.com/maps?q=${lat},${lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-bold flex items-center space-x-0.5 text-[11px]"
                  >
                    <span>Xem Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <label className="flex items-center space-x-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Đặt làm điểm xuất phát mặc định cho toàn hệ thống</span>
                </label>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (editingId) {
                      setEditingId(null);
                      setMode('manage');
                    } else {
                      onClose();
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingId ? 'Cập nhật điểm xuất phát' : 'Lưu địa điểm xuất phát'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 font-semibold">
                  Chọn một điểm xuất phát để bắt đầu chuyến đi hoặc đặt làm mặc định:
                </p>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setMode('add');
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm mới</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {locations.map((loc) => {
                  return (
                    <div
                      key={loc.id}
                      onClick={() => handleSelectLocation(loc)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        loc.isDefault
                          ? 'bg-blue-50/60 border-blue-300 shadow-2xs ring-1 ring-blue-300'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-sm text-slate-900">{loc.name}</span>
                          {loc.isDefault && (
                            <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center space-x-1">
                              <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
                              <span>Mặc định</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{loc.address}</span>
                        </p>

                        <div className="flex items-center space-x-3 text-[11px] text-slate-500 font-mono">
                          <span>
                            GPS: {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                          </span>
                          {loc.phone && <span>SĐT: {loc.phone}</span>}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectLocation(loc);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-2xs"
                          title="Chọn làm gốc xuất phát cho chuyến đi này"
                        >
                          Chọn làm điểm đầu
                        </button>

                        {!loc.isDefault && (
                          <button
                            type="button"
                            onClick={(e) => handleSetDefault(loc.id, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Đặt làm điểm xuất phát mặc định"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(loc);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Chỉnh sửa thông tin địa điểm này"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {locations.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(loc.id, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Xóa địa điểm này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

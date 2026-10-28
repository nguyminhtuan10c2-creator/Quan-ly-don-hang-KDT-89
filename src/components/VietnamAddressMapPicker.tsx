import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Search,
  CheckCircle2,
  AlertCircle,
  Locate,
  Navigation,
  Compass,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  geocodeVietnamAddress,
  reverseGeocodeVietnam,
  isCoordinateInVietnam,
  GeocodingResult,
  DEFAULT_VIETNAM_COORDS,
} from '../services/geocodingService';

// Custom Marker for Delivery Point
const customDeliveryPin = L.divIcon({
  className: 'custom-delivery-pin',
  html: `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
      <div style="background: #e11d48; color: #ffffff; padding: 4px 8px; border-radius: 9999px; font-weight: 800; font-size: 11px; box-shadow: 0 4px 12px rgba(225,29,72,0.5); border: 2px solid #ffffff; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #ffffff;"></span>
        <span>Điểm giao hàng</span>
      </div>
      <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #e11d48;"></div>
      <div style="width: 10px; height: 10px; background: rgba(225,29,72,0.3); border-radius: 50%; margin-top: -4px;"></div>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
  popupAnchor: [0, -38],
});

interface VietnamAddressMapPickerProps {
  address: string;
  onAddressChange: (newAddress: string) => void;
  lat?: number;
  lng?: number;
  onCoordinatesChange: (lat: number, lng: number) => void;
}

// Map Event Listener for Clicking on the Map
function MapClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (isCoordinateInVietnam(e.latlng.lat, e.latlng.lng)) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Map Recenter Controller
function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (map && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
      map.flyTo(center, Math.max(map.getZoom(), 14), { duration: 0.6 });
      map.invalidateSize();
    }
  }, [center[0], center[1], map]);
  return null;
}

export const VietnamAddressMapPicker: React.FC<VietnamAddressMapPickerProps> = ({
  address,
  onAddressChange,
  lat,
  lng,
  onCoordinatesChange,
}) => {
  const [showMap, setShowMap] = useState<boolean>(true);
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Default coordinate in Vietnam
  const validLat = isCoordinateInVietnam(lat, lng) ? lat! : DEFAULT_VIETNAM_COORDS.hcmc.lat;
  const validLng = isCoordinateInVietnam(lat, lng) ? lng! : DEFAULT_VIETNAM_COORDS.hcmc.lng;
  const currentPos: [number, number] = [validLat, validLng];

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Handle typing in address input with Vietnam Geocoding Autocomplete
  const handleAddressInputChange = (val: string) => {
    onAddressChange(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (val.trim().length >= 3) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await geocodeVietnamAddress(val);
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        } catch {
          setSuggestions([]);
        } finally {
          setIsSearching(false);
        }
      }, 450);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
    }
  };

  // Select a suggestion
  const handleSelectSuggestion = (item: GeocodingResult) => {
    onAddressChange(item.displayName);
    onCoordinatesChange(item.lat, item.lng);
    setShowSuggestions(false);
    setStatusNotice(`Đã định vị thành công tại: ${item.displayName}`);
    setTimeout(() => setStatusNotice(null), 4000);
  };

  // Handle map click
  const handleMapClick = async (clickedLat: number, clickedLng: number) => {
    onCoordinatesChange(clickedLat, clickedLng);
    setStatusNotice('Đang cập nhật địa chỉ từ điểm đã chọn trên bản đồ...');
    try {
      const resolvedAddress = await reverseGeocodeVietnam(clickedLat, clickedLng);
      onAddressChange(resolvedAddress);
      setStatusNotice(`Đã chọn điểm: ${resolvedAddress}`);
    } catch {
      setStatusNotice(`Tọa độ: ${clickedLat.toFixed(5)}, ${clickedLng.toFixed(5)}`);
    }
    setTimeout(() => setStatusNotice(null), 4000);
  };

  // Quick jump to major Vietnam cities
  const handleQuickJump = (cityKey: keyof typeof DEFAULT_VIETNAM_COORDS) => {
    const target = DEFAULT_VIETNAM_COORDS[cityKey];
    onCoordinatesChange(target.lat, target.lng);
    onAddressChange(`${target.name}, Việt Nam`);
    setStatusNotice(`Đã chuyển bản đồ đến ${target.name}`);
    setTimeout(() => setStatusNotice(null), 3000);
  };

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Address Input & Search Bar */}
      <div className="relative">
        <label className="block text-xs font-bold text-slate-700 mb-1">
          Địa chỉ giao hàng chi tiết (Tự động nhận diện bản đồ Việt Nam) *
        </label>
        <div className="relative">
          <input
            type="text"
            required
            placeholder="VD: Số 254 Nguyễn Văn Cừ, Quận 1, TP.HCM hoặc gõ Quận/Huyện..."
            value={address}
            onChange={(e) => handleAddressInputChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            className="w-full text-xs pl-3.5 pr-20 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
          />

          <div className="absolute right-2 top-2 flex items-center space-x-1">
            {isSearching && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
            {address && (
              <button
                type="button"
                onClick={() => {
                  onAddressChange('');
                  setSuggestions([]);
                }}
                className="text-slate-400 hover:text-slate-600 p-0.5"
                title="Xóa địa chỉ"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => handleAddressInputChange(address)}
              className="text-blue-600 hover:text-blue-700 p-1"
              title="Tìm kiếm địa chỉ"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Vietnam Geocoding Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-blue-200 z-50 overflow-hidden max-h-60 overflow-y-auto animate-in fade-in duration-150">
            <div className="bg-blue-50 px-3 py-1.5 text-[10px] font-extrabold uppercase text-blue-800 tracking-wider flex items-center justify-between border-b border-blue-100">
              <span className="flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-rose-500" />
                <span>Gợi ý địa chỉ tại Việt Nam (Bấm để chọn)</span>
              </span>
              <span className="text-slate-400 font-normal">Toàn quốc (VN)</span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {suggestions.map((item, idx) => (
                <button
                  key={`${item.lat}-${item.lng}-${idx}`}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/70 transition-colors flex items-start space-x-2 group cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 group-hover:text-blue-700 text-xs truncate">
                      {item.displayName}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Tọa độ: {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Status Notice */}
      {statusNotice && (
        <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 animate-in fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* Map Picker Toggle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-extrabold text-slate-800">
            Tọa độ giao hàng: {validLat.toFixed(4)}, {validLng.toFixed(4)}
          </span>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
            Việt Nam
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          className="font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 text-xs cursor-pointer"
        >
          <span>{showMap ? 'Thu gọn bản đồ' : 'Mở bản đồ chấm điểm'}</span>
          {showMap ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Interactive Map Picker Area */}
      {showMap && (
        <div className="border border-slate-300 rounded-2xl overflow-hidden bg-white shadow-xs space-y-2">
          {/* Quick city jump toolbar */}
          <div className="bg-slate-100 px-3 py-2 flex flex-wrap items-center gap-1.5 text-[11px] border-b border-slate-200">
            <span className="text-slate-500 font-bold mr-1 flex items-center space-x-1">
              <Compass className="w-3 h-3 text-blue-600" />
              <span>Chuyển nhanh:</span>
            </span>
            <button
              type="button"
              onClick={() => handleQuickJump('hcmc')}
              className="bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-2 py-0.5 rounded font-bold border border-slate-200 cursor-pointer"
            >
              TP.HCM
            </button>
            <button
              type="button"
              onClick={() => handleQuickJump('hanoi')}
              className="bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-2 py-0.5 rounded font-bold border border-slate-200 cursor-pointer"
            >
              Hà Nội
            </button>
            <button
              type="button"
              onClick={() => handleQuickJump('danang')}
              className="bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-2 py-0.5 rounded font-bold border border-slate-200 cursor-pointer"
            >
              Đà Nẵng
            </button>
            <button
              type="button"
              onClick={() => handleQuickJump('binhduong')}
              className="bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-2 py-0.5 rounded font-bold border border-slate-200 cursor-pointer"
            >
              Bình Dương
            </button>
            <button
              type="button"
              onClick={() => handleQuickJump('dongnai')}
              className="bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-2 py-0.5 rounded font-bold border border-slate-200 cursor-pointer"
            >
              Đồng Nai
            </button>
            <button
              type="button"
              onClick={() => handleQuickJump('cantho')}
              className="bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-2 py-0.5 rounded font-bold border border-slate-200 cursor-pointer"
            >
              Cần Thơ
            </button>
          </div>

          {/* Leaflet Map Frame */}
          <div className="h-64 sm:h-72 w-full relative z-0">
            <MapContainer
              center={currentPos}
              zoom={14}
              minZoom={5}
              maxBounds={[[8.0, 102.0], [24.0, 110.0]]}
              scrollWheelZoom={false}
              className="w-full h-full z-0"
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />

              <MapCenterController center={currentPos} />
              <MapClickHandler onLocationSelect={handleMapClick} />

              <Marker
                position={currentPos}
                icon={customDeliveryPin}
                draggable={true}
                eventHandlers={{
                  dragend: (e) => {
                    const marker = e.target;
                    const position = marker.getLatLng();
                    if (isCoordinateInVietnam(position.lat, position.lng)) {
                      handleMapClick(position.lat, position.lng);
                    }
                  },
                }}
              >
                <Popup>
                  <div className="text-xs p-1">
                    <p className="font-bold text-rose-700">Điểm Giao Hàng</p>
                    <p className="text-slate-700 text-[11px] mt-0.5">{address || 'Chưa có địa chỉ'}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {validLat.toFixed(5)}, {validLng.toFixed(5)}
                    </p>
                    <p className="text-[10px] text-blue-600 font-bold mt-1">
                      (Có thể kéo ghim này đến đúng số nhà/hẻm)
                    </p>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>

          <div className="p-2 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-200">
            <span>💡 Nhấn vào bất kỳ đâu trên bản đồ hoặc kéo ghim đỏ để chọn vị trí chính xác.</span>
            <span className="font-semibold text-slate-600">Phạm vi: Việt Nam</span>
          </div>
        </div>
      )}
    </div>
  );
};

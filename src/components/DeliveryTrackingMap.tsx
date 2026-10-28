import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Order, StoreInfo } from '../types';
import { getStoreInfo, getOrderStatusLabel } from '../services/storageService';
import { isCoordinateInVietnam, DEFAULT_VIETNAM_COORDS } from '../services/geocodingService';
import {
  Store,
  MapPin,
  Truck,
  Navigation,
  ExternalLink,
  Maximize2,
  Layers,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

// Fix default Leaflet marker assets if needed
try {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
} catch {
  // Ignore in SSR/testing
}

// Vector HTML DivIcons: 100% resilient, no dependence on external Github image assets
export const createStoreMarkerIcon = (label: string = 'Kho hàng') => {
  return L.divIcon({
    className: 'custom-store-pin',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); pointer-events: auto;">
        <div style="background: #2563eb; color: #ffffff; padding: 4px 8px; border-radius: 9999px; font-weight: 800; font-size: 11px; box-shadow: 0 4px 10px rgba(0,0,0,0.35); border: 2px solid #ffffff; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
          <svg style="width: 12px; height: 12px;" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h16v2H4V4zm0 4h16l-2 10H6L4 8zm4 12h8v2H8v-2z"/></svg>
          <span>${label}</span>
        </div>
        <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #2563eb; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.25));"></div>
        <div style="width: 8px; height: 8px; background: rgba(37,99,235,0.4); border-radius: 50%; margin-top: -3px;"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -38],
  });
};

export const createCustomerMarkerIcon = (label: string = 'Khách nhận') => {
  return L.divIcon({
    className: 'custom-customer-pin',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); pointer-events: auto;">
        <div style="background: #e11d48; color: #ffffff; padding: 4px 8px; border-radius: 9999px; font-weight: 800; font-size: 11px; box-shadow: 0 4px 10px rgba(0,0,0,0.35); border: 2px solid #ffffff; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
          <svg style="width: 12px; height: 12px;" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          <span>${label}</span>
        </div>
        <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #e11d48; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.25));"></div>
        <div style="width: 8px; height: 8px; background: rgba(225,29,72,0.4); border-radius: 50%; margin-top: -3px;"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -38],
  });
};

// Fallback image-based markers for backward compatibility
export const storeMarkerIcon = createStoreMarkerIcon('Kho xuất phát');
export const customerMarkerIcon = createCustomerMarkerIcon('Khách nhận');

export interface DeliveryTrackingMapProps {
  order?: Order;
  storeInfo?: StoreInfo;
  storePos?: [number, number];
  customerPos?: [number, number];
  storeLat?: number;
  storeLng?: number;
  customerLat?: number;
  customerLng?: number;
}

// Map Tile Layers (100% Free - NO API KEY REQUIRED)
const TILE_LAYERS = {
  osm: {
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  esriStreet: {
    name: 'Đường phố (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    subdomains: '',
    attribution: '&copy; Esri, DeLorme, NAVTEQ, USGS',
  },
  satellite: {
    name: 'Ảnh Vệ Tinh (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    subdomains: '',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
  },
};

/**
 * MapRecenterHelper:
 * Automatically calculates and sets the map bounds so both the store
 * and customer markers are always fully visible on initial load,
 * modal render transitions, and container resize.
 */
export function MapRecenterHelper({
  storePos,
  customerPos,
  onMapReady,
}: {
  storePos: [number, number];
  customerPos: [number, number];
  onMapReady?: (map: L.Map) => void;
}) {
  const map = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (!map) return;
    if (onMapReady) {
      onMapReady(map);
    }

    const fitMapToBounds = () => {
      try {
        map.invalidateSize();
        // Validate coordinates
        if (
          Number.isFinite(storePos[0]) &&
          Number.isFinite(storePos[1]) &&
          Number.isFinite(customerPos[0]) &&
          Number.isFinite(customerPos[1])
        ) {
          const bounds = L.latLngBounds([storePos, customerPos]);
          // If points are identical or very close, pad bounds
          if (
            Math.abs(storePos[0] - customerPos[0]) < 0.0001 &&
            Math.abs(storePos[1] - customerPos[1]) < 0.0001
          ) {
            const padded = bounds.pad(0.04);
            map.fitBounds(padded, { padding: [50, 50], maxZoom: 15 });
          } else if (bounds.isValid()) {
            map.fitBounds(bounds, {
              padding: [50, 50],
              maxZoom: 15,
              animate: hasFittedRef.current,
            });
          }
          hasFittedRef.current = true;
        }
      } catch (err) {
        console.warn('Map fitBounds warning:', err);
      }
    };

    // Staggered fits to guarantee proper bounds when modal transitions finish
    fitMapToBounds();
    const t1 = setTimeout(fitMapToBounds, 100);
    const t2 = setTimeout(fitMapToBounds, 300);
    const t3 = setTimeout(fitMapToBounds, 600);

    // Watch resize
    let resizeObserver: ResizeObserver | null = null;
    try {
      const container = map.getContainer();
      if (typeof ResizeObserver !== 'undefined' && container) {
        resizeObserver = new ResizeObserver(() => {
          fitMapToBounds();
        });
        resizeObserver.observe(container);
      }
    } catch {
      // Ignore
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [map, storePos[0], storePos[1], customerPos[0], customerPos[1]]);

  return null;
}

// Approximate distance calculation in km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): string {
  try {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d.toFixed(1);
  } catch {
    return '0.0';
  }
}

/**
 * MapComponent / DeliveryTrackingMap:
 * Automatically calculates and sets the map bounds so both the store and customer
 * markers are always fully visible on initial load.
 */
const InnerMapComponent: React.FC<DeliveryTrackingMapProps> = ({
  order,
  storeInfo: propStoreInfo,
  storePos: propStorePos,
  customerPos: propCustomerPos,
  storeLat: propStoreLat,
  storeLng: propStoreLng,
  customerLat: propCustomerLat,
  customerLng: propCustomerLng,
}) => {
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [tileSource, setTileSource] = useState<'osm' | 'esriStreet' | 'satellite'>('osm');
  const [mapError, setMapError] = useState<boolean>(false);

  const storeInfo = propStoreInfo || getStoreInfo();

  // Safely extract Store coordinates with robust fallbacks
  const storeLat = Number(
    propStorePos?.[0] ?? propStoreLat ?? order?.storeLat ?? storeInfo.lat ?? 10.7698
  );
  const rawStoreLng = Number(
    propStorePos?.[1] ?? propStoreLng ?? order?.storeLng ?? storeInfo.lng ?? 106.6897
  );
  let safeStoreLat = Number.isFinite(storeLat) ? storeLat : DEFAULT_VIETNAM_COORDS.hcmc.lat;
  let safeStoreLng = Number.isFinite(rawStoreLng) ? rawStoreLng : DEFAULT_VIETNAM_COORDS.hcmc.lng;

  // Auto-correct if lat & lng were inverted
  if (!isCoordinateInVietnam(safeStoreLat, safeStoreLng)) {
    if (isCoordinateInVietnam(safeStoreLng, safeStoreLat)) {
      const temp = safeStoreLat;
      safeStoreLat = safeStoreLng;
      safeStoreLng = temp;
    } else {
      safeStoreLat = DEFAULT_VIETNAM_COORDS.hcmc.lat;
      safeStoreLng = DEFAULT_VIETNAM_COORDS.hcmc.lng;
    }
  }
  const storePos: [number, number] = [safeStoreLat, safeStoreLng];

  // Safely extract Customer coordinates with robust fallbacks in Vietnam
  const rawCustomerLat = Number(
    propCustomerPos?.[0] ?? propCustomerLat ?? order?.deliveryLat ?? 10.7781
  );
  const rawCustomerLng = Number(
    propCustomerPos?.[1] ?? propCustomerLng ?? order?.deliveryLng ?? 106.7015
  );
  let safeCustomerLat = Number.isFinite(rawCustomerLat) ? rawCustomerLat : 10.7781;
  let safeCustomerLng = Number.isFinite(rawCustomerLng) ? rawCustomerLng : 106.7015;

  if (!isCoordinateInVietnam(safeCustomerLat, safeCustomerLng)) {
    if (isCoordinateInVietnam(safeCustomerLng, safeCustomerLat)) {
      const temp = safeCustomerLat;
      safeCustomerLat = safeCustomerLng;
      safeCustomerLng = temp;
    } else {
      safeCustomerLat = 10.7781;
      safeCustomerLng = 106.7015;
    }
  }
  const customerPos: [number, number] = [safeCustomerLat, safeCustomerLng];

  // Center coordinate for map initialization
  const centerPos: [number, number] = [
    (safeStoreLat + safeCustomerLat) / 2,
    (safeStoreLng + safeCustomerLng) / 2,
  ];

  // Check if status is "Đang giao hàng"
  const isDelivering =
    order?.status === 'delivering' ||
    order?.status === 'in_transit' ||
    (order?.status ? getOrderStatusLabel(order.status) === 'Đang giao hàng' : true);

  // Distance estimation
  const distanceKm = calculateDistanceKm(safeStoreLat, safeStoreLng, safeCustomerLat, safeCustomerLng);

  // Manual recenter button handler
  const handleRecenterBounds = () => {
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.invalidateSize();
        const bounds = L.latLngBounds([storePos, customerPos]);
        if (
          Math.abs(storePos[0] - customerPos[0]) < 0.0001 &&
          Math.abs(storePos[1] - customerPos[1]) < 0.0001
        ) {
          const padded = bounds.pad(0.04);
          mapInstanceRef.current.fitBounds(padded, { padding: [50, 50], maxZoom: 15 });
        } else if (bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
      } catch (err) {
        console.warn('Manual recenter warning:', err);
      }
    }
  };

  const selectedTile = TILE_LAYERS[tileSource];

  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 text-white shadow-xl flex flex-col">
      {/* 1. Header Bar */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Navigation className="w-4 h-4 text-blue-400 animate-pulse" />
          <span className="font-extrabold text-xs tracking-wide uppercase text-slate-200">
            Bản Đồ Giao Hàng (OpenStreetMap / Leaflet)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Tile layer selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => setTileSource('osm')}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                tileSource === 'osm' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              OpenStreetMap
            </button>
            <button
              type="button"
              onClick={() => setTileSource('esriStreet')}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                tileSource === 'esriStreet' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Đường phố
            </button>
            <button
              type="button"
              onClick={() => setTileSource('satellite')}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                tileSource === 'satellite' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Vệ tinh
            </button>
          </div>

          <button
            type="button"
            onClick={handleRecenterBounds}
            title="Tự động căn chỉnh bản đồ vừa 2 điểm"
            className="text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1 rounded-md flex items-center space-x-1 transition-colors"
          >
            <Maximize2 className="w-3 h-3 text-blue-400" />
            <span>Vừa Khung</span>
          </button>

          {order ? (
            isDelivering ? (
              <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 border border-amber-800 px-2.5 py-1 rounded-full flex items-center shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping mr-1.5" />
                Đang giao
              </span>
            ) : (
              <span className="text-[10px] font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-full">
                {getOrderStatusLabel(order.status)}
              </span>
            )
          ) : null}

          <span className="text-[10px] font-bold text-blue-300 bg-blue-950/80 border border-blue-800 px-2 py-1 rounded-md">
            ~{distanceKm} km
          </span>
        </div>
      </div>

      {/* 2. Customer Address Banner */}
      <div className="bg-slate-900/90 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-start space-x-2 max-w-xl">
          <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] font-extrabold uppercase text-rose-400 tracking-wider mr-2">
              Khách hàng:
            </span>
            <span className="font-bold text-slate-200">
              {order?.customerName || 'Khách nhận'} {order?.customerPhone ? `(${order.customerPhone})` : ''}
            </span>
            <p className="text-slate-300 text-[11px] truncate max-w-md mt-0.5">
              {order?.deliveryAddress || 'Địa chỉ giao hàng'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href={`https://www.google.com/maps/dir/?api=1&origin=${safeStoreLat},${safeStoreLng}&destination=${safeCustomerLat},${safeCustomerLng}&travelmode=driving`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-lg flex items-center space-x-1 transition-colors"
            title="Dẫn đường xe máy / ô tô trên Google Maps"
          >
            <Navigation className="w-3 h-3 text-emerald-400" />
            <span>Chỉ đường Google Maps</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>

          <a
            href={`https://www.openstreetmap.org/?mlat=${safeCustomerLat}&mlon=${safeCustomerLng}#map=16/${safeCustomerLat}/${safeCustomerLng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold text-blue-400 hover:text-blue-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-lg flex items-center space-x-1 transition-colors"
            title="Xem vị trí khách hàng trên OpenStreetMap Việt Nam"
          >
            <span>Bản đồ OSM</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
        </div>
      </div>

      {/* 3. Map Container */}
      <div className="relative w-full h-[320px] bg-slate-950 select-none z-0">
        {mapError ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-900">
            <AlertTriangle className="w-10 h-10 text-amber-400 mb-2" />
            <h5 className="font-bold text-slate-200 text-sm">Không thể tải khung bản đồ trực tuyến</h5>
            <p className="text-slate-400 text-xs mt-1 max-w-md">
              Có thể do kết nối mạng chậm. Bạn có thể mở trực tiếp bằng Google Maps hoặc thử tải lại.
            </p>
            <div className="mt-3 flex space-x-2">
              <button
                type="button"
                onClick={() => setMapError(false)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Thử tải lại</span>
              </button>
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${safeStoreLat},${safeStoreLng}&destination=${safeCustomerLat},${safeCustomerLng}&travelmode=driving`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center space-x-1"
              >
                <span>Mở Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : (
          <MapContainer
            center={centerPos}
            zoom={13}
            minZoom={5}
            maxBounds={[[8.0, 102.0], [24.0, 110.0]]}
            scrollWheelZoom={false}
            className="w-full h-full z-0"
            style={{ height: '100%', width: '100%', minHeight: '320px' }}
          >
            {/* Dynamic Tile Layer */}
            <TileLayer
              key={tileSource}
              attribution={selectedTile.attribution}
              url={selectedTile.url}
              subdomains={selectedTile.subdomains}
            />

            {/* Recenter and fit bounds automatically */}
            <MapRecenterHelper
              storePos={storePos}
              customerPos={customerPos}
              onMapReady={(map) => {
                mapInstanceRef.current = map;
              }}
            />

            {/* 1. Store Marker */}
            <Marker position={storePos} icon={createStoreMarkerIcon(storeInfo.name || 'Kho hàng')}>
              <Popup className="leaflet-popup-custom">
                <div className="text-slate-900 text-xs p-1 space-y-1">
                  <div className="font-black text-blue-700 flex items-center space-x-1 border-b border-slate-200 pb-1">
                    <Store className="w-3.5 h-3.5" />
                    <span>Kho / Cửa Hàng Xuất Phát</span>
                  </div>
                  <p className="font-bold text-slate-800 text-[11px]">{storeInfo.name}</p>
                  <p className="text-slate-600 text-[10px] leading-tight">{storeInfo.address}</p>
                  <div className="text-[9px] text-slate-500 font-mono pt-0.5">
                    Tọa độ: {safeStoreLat.toFixed(4)}, {safeStoreLng.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </Marker>

            {/* 2. Customer Delivery Address Marker */}
            <Marker
              position={customerPos}
              icon={createCustomerMarkerIcon(order?.customerName || 'Khách nhận')}
            >
              <Popup className="leaflet-popup-custom">
                <div className="text-slate-900 text-xs p-1 space-y-1">
                  <div className="font-black text-rose-700 flex items-center space-x-1 border-b border-slate-200 pb-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Điểm Nhận Hàng Của Khách</span>
                  </div>
                  <p className="font-bold text-slate-800 text-[11px]">{order?.customerName || 'Khách nhận'}</p>
                  <p className="text-slate-600 text-[10px] leading-tight">{order?.deliveryAddress || ''}</p>
                  {order?.customerPhone && (
                    <p className="text-slate-700 text-[10px]">
                      SĐT: <span className="font-bold">{order.customerPhone}</span>
                    </p>
                  )}
                  <div className="text-[9px] text-slate-500 font-mono pt-0.5">
                    Tọa độ: {safeCustomerLat.toFixed(4)}, {safeCustomerLng.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </Marker>

            {/* 3. Polyline Connecting Store and Customer */}
            {isDelivering && (
              <Polyline
                positions={[storePos, customerPos]}
                pathOptions={{
                  color: '#2563eb',
                  weight: 4,
                  opacity: 0.85,
                  dashArray: '8, 8',
                }}
              >
                <Popup>
                  <div className="text-slate-900 text-xs p-1">
                    <span className="font-bold text-blue-600">Lộ trình vận chuyển mô phỏng</span>
                    <p className="text-[10px] text-slate-600">
                      Kho hàng &rarr; Khách hàng (~{distanceKm} km)
                    </p>
                  </div>
                </Popup>
              </Polyline>
            )}
          </MapContainer>
        )}

        {/* Small floating map legend */}
        <div className="absolute bottom-2 left-2 z-[400] bg-slate-900/90 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-slate-700 text-[10px] flex items-center space-x-3 shadow-md pointer-events-auto">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
            <span className="text-slate-300 font-medium">Kho hàng</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
            <span className="text-slate-300 font-medium">Điểm giao</span>
          </div>
          {isDelivering && (
            <div className="flex items-center space-x-1">
              <span className="w-4 h-0.5 bg-blue-400 inline-block border-t border-dashed border-white"></span>
              <span className="text-blue-300 font-bold">Lộ trình</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Footer info */}
      <div className="bg-slate-950 p-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center space-x-2">
          <Truck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>
            Shipper: <strong className="text-slate-200">{order?.deliveryStaffName || 'Phạm Quốc Việt'}</strong>
            {order?.deliveryStaffPhone && (
              <span className="text-blue-400 font-mono ml-1.5">({order.deliveryStaffPhone})</span>
            )}
          </span>
        </div>

        <div className="flex items-center space-x-2 text-[10px]">
          <span>
            Kho:{' '}
            <span className="font-mono text-slate-300">
              {safeStoreLat.toFixed(3)}, {safeStoreLng.toFixed(3)}
            </span>
          </span>
          <span className="text-slate-600">|</span>
          <span>
            Khách:{' '}
            <span className="font-mono text-slate-300">
              {safeCustomerLat.toFixed(3)}, {safeCustomerLng.toFixed(3)}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

export const SafeMapComponent: React.FC<DeliveryTrackingMapProps> = (props) => {
  const [retryKey, setRetryKey] = useState<number>(0);

  return (
    <div key={retryKey} className="w-full">
      <InnerMapComponent {...props} />
    </div>
  );
};

// Aliases for compatibility
export { SafeMapComponent as MapComponent };
export const DeliveryTrackingMap = SafeMapComponent;



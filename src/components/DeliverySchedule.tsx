import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Truck,
  MapPin,
  Calendar,
  Clock,
  Phone,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  ArrowRight,
  Printer,
  ChevronDown,
  Layers,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Send,
  User,
  ShoppingBag,
  DollarSign,
  Compass,
  Check,
  X,
  FileText,
  Maximize2,
  Minimize2,
  Route,
  ArrowUpDown,
  PhoneCall,
  Locate,
  Navigation2,
  Sparkles,
  Milestone,
  CornerUpRight,
  ChevronRight,
  Volume2,
  Building2,
  Plus,
  Home,
  CheckSquare,
  Square,
  PackageCheck,
  ListOrdered,
  Boxes,
  Trash2,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Order, OrderStatus, StoreInfo, Staff, DepartureLocation, DeliveryTrip } from '../types';
import {
  formatVND,
  formatDateVI,
  formatDateTimeVI,
  getOrderStatusLabel,
  getStoreInfo,
  getStaff,
  updateOrderDeliveryDetails,
  calculateDistanceKm,
  estimateTravelTimeMinutes,
  getGoogleMapsDirectionsUrl,
  getMultiStopGoogleMapsUrl,
  getOsmDirectionsUrl,
  optimizeDeliveryRouteSequence,
  fetchRealRoadRoute,
  fetchMultiStopRealRoadRoute,
  RealRoadRoute,
  getDepartureLocations,
  getActiveDepartureLocation,
  setActiveDepartureLocation,
  getDeliveryTrips,
  deleteDeliveryTrip,
} from '../services/storageService';
import {
  isCoordinateInVietnam,
  DEFAULT_VIETNAM_COORDS,
  geocodeVietnamAddress,
  resolveCoordinatesFromAddress,
} from '../services/geocodingService';
import { deleteTripFromFirebase } from '../services/firebaseService';
import { DepartureLocationModal } from './DepartureLocationModal';
import { DeliveryBatchModal } from './DeliveryBatchModal';

// Fix Leaflet icons
try {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
} catch {
  // Ignore
}

// Custom DivIcons for Store, Shipper Live GPS, and Delivery Stops
const createStoreDivIcon = (storeName: string = 'Kho xuất phát') => {
  return L.divIcon({
    className: 'custom-store-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background: #1e3a8a; color: #ffffff; padding: 4px 10px; border-radius: 9999px; font-weight: 800; font-size: 11px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); border: 2px solid #60a5fa; white-space: nowrap; display: flex; align-items: center; gap: 5px;">
          <svg style="width: 14px; height: 14px;" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h16v2H4V4zm0 4h16l-2 10H6L4 8zm4 12h8v2H8v-2z"/></svg>
          <span>${storeName}</span>
        </div>
        <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #1e3a8a;"></div>
        <div style="width: 8px; height: 8px; background: rgba(30,58,138,0.5); border-radius: 50%; margin-top: -3px;"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -36],
  });
};

const createShipperLiveGpsDivIcon = (label: string = 'Vị trí của bạn (Shipper)') => {
  return L.divIcon({
    className: 'custom-shipper-live-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background: #0284c7; color: #ffffff; padding: 4px 10px; border-radius: 9999px; font-weight: 800; font-size: 11px; box-shadow: 0 4px 14px rgba(2,132,199,0.6); border: 2.5px solid #ffffff; white-space: nowrap; display: flex; align-items: center; gap: 5px;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #38bdf8; box-shadow: 0 0 8px #38bdf8;"></span>
          <span>${label}</span>
        </div>
        <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #0284c7;"></div>
        <div style="width: 22px; height: 22px; background: rgba(2,132,199,0.3); border: 2px solid #0284c7; border-radius: 50%; margin-top: -8px;"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -36],
  });
};

const createStopDivIcon = (stopNumber: number, status: OrderStatus) => {
  let bgColor = '#2563eb'; // blue default
  let borderColor = '#ffffff';

  if (status === 'completed' || status === 'delivered') {
    bgColor = '#059669'; // emerald green
  } else if (status === 'delivering' || status === 'in_transit') {
    bgColor = '#d97706'; // amber
  } else if (status === 'failed') {
    bgColor = '#e11d48'; // red
  }

  return L.divIcon({
    className: 'custom-stop-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background: ${bgColor}; color: #ffffff; width: 28px; height: 28px; border-radius: 50%; font-weight: 900; font-size: 13px; box-shadow: 0 4px 10px rgba(0,0,0,0.35); border: 2.5px solid ${borderColor}; display: flex; align-items: center; justify-content: center;">
          ${stopNumber}
        </div>
        <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid ${bgColor};"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -32],
  });
};

// Map Bounds Helper Component
function MultiStopMapRecenter({
  storePos,
  shipperPos,
  stops,
  selectedOrder,
  roadRouteCoords,
}: {
  storePos: [number, number];
  shipperPos?: [number, number] | null;
  stops: Array<{ pos: [number, number]; orderId: string }>;
  selectedOrder?: Order | null;
  roadRouteCoords?: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    map.invalidateSize();

    // If active road route is available, zoom to fit the route exactly
    if (roadRouteCoords && roadRouteCoords.length > 1) {
      try {
        const routeBounds = L.latLngBounds(roadRouteCoords);
        if (routeBounds.isValid()) {
          map.fitBounds(routeBounds.pad(0.15), { padding: [50, 50], maxZoom: 16 });
          return;
        }
      } catch {
        // fallback
      }
    }

    if (selectedOrder && selectedOrder.deliveryLat && selectedOrder.deliveryLng) {
      // Focus on selected order
      map.flyTo([selectedOrder.deliveryLat, selectedOrder.deliveryLng], 15, { duration: 0.8 });
      return;
    }

    const points: [number, number][] = [];
    if (isCoordinateInVietnam(storePos[0], storePos[1])) {
      points.push(storePos);
    } else {
      points.push([DEFAULT_VIETNAM_COORDS.hcmc.lat, DEFAULT_VIETNAM_COORDS.hcmc.lng]);
    }

    if (shipperPos && isCoordinateInVietnam(shipperPos[0], shipperPos[1])) {
      points.push(shipperPos);
    }

    stops.forEach((s) => {
      if (Number.isFinite(s.pos[0]) && Number.isFinite(s.pos[1]) && isCoordinateInVietnam(s.pos[0], s.pos[1])) {
        points.push(s.pos);
      }
    });

    if (points.length > 1) {
      try {
        const bounds = L.latLngBounds(points);
        if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.12), { padding: [40, 40], maxZoom: 15 });
        }
      } catch (err) {
        console.warn('fitBounds error', err);
      }
    } else {
      map.setView(points[0] || [DEFAULT_VIETNAM_COORDS.hcmc.lat, DEFAULT_VIETNAM_COORDS.hcmc.lng], 13);
    }
  }, [map, storePos, shipperPos, stops, selectedOrder, roadRouteCoords]);

  return null;
}

interface DeliveryScheduleProps {
  orders: Order[];
  onSelectOrderForSlip: (order: Order) => void;
  onSelectOrderForDetail: (order: Order) => void;
}

export const DeliverySchedule: React.FC<DeliveryScheduleProps> = ({
  orders,
  onSelectOrderForSlip,
  onSelectOrderForDetail,
}) => {
  const storeInfo = getStoreInfo();
  const staffList = getStaff();
  const deliveryStaffList = staffList.filter((s) => s.role === 'Delivery');

  // Departure Locations (Điểm xuất phát) State
  const [departureLocations, setDepartureLocations] = useState<DepartureLocation[]>(getDepartureLocations());
  const initialActiveDeparture = getActiveDepartureLocation();
  const [selectedDepartureId, setSelectedDepartureId] = useState<string>(initialActiveDeparture.id);
  const [isDepartureModalOpen, setIsDepartureModalOpen] = useState<boolean>(false);
  const [departureModalMode, setDepartureModalMode] = useState<'add' | 'manage'>('add');

  const activeDeparture = useMemo(() => {
    const found = departureLocations.find((l) => l.id === selectedDepartureId);
    return found || departureLocations[0] || initialActiveDeparture;
  }, [departureLocations, selectedDepartureId, initialActiveDeparture]);

  const storeLat = activeDeparture.lat || 10.7418;
  const storeLng = activeDeparture.lng || 106.6722;
  const storePos: [number, number] = [storeLat, storeLng];

  // Shipper GPS Location State
  const [shipperLocation, setShipperLocation] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
    locatedAt?: string;
  } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  // Turn-by-Turn Navigation & Real Road Route State
  const [activeNavOrder, setActiveNavOrder] = useState<Order | null>(null);
  const [realRoadRoute, setRealRoadRoute] = useState<RealRoadRoute | null>(null);
  const [isLoadingRoadRoute, setIsLoadingRoadRoute] = useState<boolean>(false);

  // Multi-Stop Bundled Trip Real Road Route (OSRM with real street bends and turns)
  const [multiStopRoadRoute, setMultiStopRoadRoute] = useState<RealRoadRoute | null>(null);
  const [isLoadingMultiStopRoute, setIsLoadingMultiStopRoute] = useState<boolean>(false);
  const [previewTrip, setPreviewTrip] = useState<DeliveryTrip | null>(null);
  const [showTurnListModal, setShowTurnListModal] = useState<boolean>(false);

  // Date filters
  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'today' | 'tomorrow' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<string>(todayStr);

  // Filters
  const [selectedShipper, setSelectedShipper] = useState<string>('all');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('pending_active'); // default: active deliveries
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'optimized_trip' | 'distance_asc' | 'time_asc' | 'cod_desc'>('optimized_trip');

  // UI state
  const [showMap, setShowMap] = useState<boolean>(true);
  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);
  const [tileLayerType, setTileLayerType] = useState<'osm' | 'esri' | 'satellite'>('osm');

  // Quick Status Update Modal state
  const [statusUpdateTarget, setStatusUpdateTarget] = useState<Order | null>(null);
  const [newStatusChoice, setNewStatusChoice] = useState<OrderStatus>('delivering');
  const [shipperNoteInput, setShipperNoteInput] = useState<string>('');
  const [assignedShipperId, setAssignedShipperId] = useState<string>('');

  // Delivery Batch (Ghép Đơn Giao Hàng) State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [batchModalInitialTrip, setBatchModalInitialTrip] = useState<DeliveryTrip | null>(null);
  const [checkedOrderIdsForBatch, setCheckedOrderIdsForBatch] = useState<string[]>([]);
  const [deliveryTrips, setDeliveryTrips] = useState<DeliveryTrip[]>(getDeliveryTrips());

  const refreshDeliveryTrips = () => {
    setDeliveryTrips(getDeliveryTrips());
  };

  const handleToggleOrderForBatch = (orderId: string) => {
    setCheckedOrderIdsForBatch((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleOpenBatchWithSelected = () => {
    setBatchModalInitialTrip(null);
    setIsBatchModalOpen(true);
  };

  // Toggle visual route lines on map
  const [showTripRoutePolyline, setShowTripRoutePolyline] = useState<boolean>(true);

  // In-app Trip Deletion Modal State
  const [tripToDelete, setTripToDelete] = useState<{ id: string; tripCode: string; orderCount: number } | null>(null);
  const [revertOrdersOnDelete, setRevertOrdersOnDelete] = useState<boolean>(true);
  const [isDeletingTrip, setIsDeletingTrip] = useState<boolean>(false);
  const [tripNoticeMessage, setTripNoticeMessage] = useState<string | null>(null);

  // Auto-dismiss trip notice
  useEffect(() => {
    if (tripNoticeMessage) {
      const timer = setTimeout(() => setTripNoticeMessage(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [tripNoticeMessage]);

  const handleRequestDeleteTrip = (id: string, tripCode: string, orderCount: number) => {
    setTripToDelete({ id, tripCode, orderCount });
  };

  const handleConfirmDeleteTrip = async () => {
    if (!tripToDelete) return;
    setIsDeletingTrip(true);
    try {
      const result = deleteDeliveryTrip(tripToDelete.id, revertOrdersOnDelete);
      await deleteTripFromFirebase(tripToDelete.id);
      setDeliveryTrips(getDeliveryTrips());
      setTripNoticeMessage(`Đã xóa thành công lộ trình chuyến [${tripToDelete.tripCode}]! ${
        result.revertedCount > 0 ? `Đã hoàn lại ${result.revertedCount} đơn về trạng thái Chờ giao.` : ''
      }`);
      setTripToDelete(null);
    } catch (err) {
      console.error('Error deleting trip from schedule', err);
      setTripNoticeMessage('Lỗi khi xóa lộ trình. Vui lòng thử lại.');
    } finally {
      setIsDeletingTrip(false);
    }
  };

  // Handle Shipper Live GPS Detection
  const handleDetectShipperLocation = () => {
    if (!navigator.geolocation) {
      setLocationNotice('Trình duyệt không hỗ trợ Geolocation GPS.');
      return;
    }

    setIsLocating(true);
    setLocationNotice(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setShipperLocation({
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy),
          locatedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
        setSelectedDepartureId('shipper_gps');
        setIsLocating(false);
        setLocationNotice(`Đã định vị vị trí của bạn (Sai số ~${Math.round(accuracy)}m). Lộ trình đã được tối ưu từ vị trí này!`);
        setTimeout(() => setLocationNotice(null), 5000);
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Không thể lấy vị trí GPS. ';
        if (err.code === 1) msg += 'Bạn chưa cấp quyền truy cập vị trí trên trình duyệt.';
        else if (err.code === 2) msg += 'Không xác định được tín hiệu GPS.';
        else if (err.code === 3) msg += 'Quá thời gian lấy vị trí GPS.';
        setLocationNotice(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  // Origin point for routing: Shipper's live GPS if selected, otherwise chosen departure location
  const activeOriginPos: [number, number] = useMemo(() => {
    if (selectedDepartureId === 'shipper_gps' && shipperLocation && Number.isFinite(shipperLocation.lat) && Number.isFinite(shipperLocation.lng)) {
      return [shipperLocation.lat, shipperLocation.lng];
    }
    return [activeDeparture.lat, activeDeparture.lng];
  }, [selectedDepartureId, shipperLocation, activeDeparture]);

  const activeOriginLabel = useMemo(() => {
    if (selectedDepartureId === 'shipper_gps') {
      return 'Vị trí của bạn (Shipper Live GPS)';
    }
    return activeDeparture.name;
  }, [selectedDepartureId, activeDeparture]);

  const activeOriginAddress = useMemo(() => {
    if (selectedDepartureId === 'shipper_gps') {
      return shipperLocation ? `Tọa độ GPS: ${shipperLocation.lat.toFixed(5)}, ${shipperLocation.lng.toFixed(5)}` : 'Đang định vị GPS...';
    }
    return activeDeparture.address;
  }, [selectedDepartureId, shipperLocation, activeDeparture]);

  // Calculate & enrich orders with distance and duration from active origin
  const enrichedOrders = useMemo(() => {
    return orders.map((order) => {
      let custLat = order.deliveryLat;
      let custLng = order.deliveryLng;

      // Auto-correct if address is in District 7 / Phú Thuận but coordinates mistakenly pointed to District 1 (> 10.765)
      const addrLower = (order.deliveryAddress || '').toLowerCase();
      const isQ7Address =
        addrLower.includes('phú thuận') ||
        addrLower.includes('phu thuan') ||
        addrLower.includes('q7') ||
        addrLower.includes('quận 7') ||
        addrLower.includes('q.7');

      if (isQ7Address) {
        if (!custLat || custLat > 10.765 || !isCoordinateInVietnam(custLat, custLng)) {
          const resolved = resolveCoordinatesFromAddress(order.deliveryAddress);
          custLat = resolved ? resolved.lat : 10.7295;
          custLng = resolved ? resolved.lng : 106.7350;
        }
      } else if (!isCoordinateInVietnam(custLat, custLng)) {
        if (typeof custLat === 'number' && typeof custLng === 'number' && isCoordinateInVietnam(custLng, custLat)) {
          const temp = custLat;
          custLat = custLng;
          custLng = temp;
        } else {
          const resolved = resolveCoordinatesFromAddress(order.deliveryAddress);
          if (resolved) {
            custLat = resolved.lat;
            custLng = resolved.lng;
          } else {
            custLat = storeLat + 0.008;
            custLng = storeLng + 0.008;
          }
        }
      }

      // Distance from current location (or store)
      const distanceKm = calculateDistanceKm(activeOriginPos[0], activeOriginPos[1], custLat, custLng);
      const estMinutes = estimateTravelTimeMinutes(distanceKm);

      // OpenStreetMap directions URL (100% Free, no API Key needed)
      const osmDirectionsUrl = getOsmDirectionsUrl(activeOriginPos[0], activeOriginPos[1], custLat, custLng);
      // Native navigation URL for phone Google Maps App
      const directionsUrl = getGoogleMapsDirectionsUrl(activeOriginPos[0], activeOriginPos[1], custLat, custLng);

      return {
        ...order,
        deliveryLat: custLat,
        deliveryLng: custLng,
        distanceKm,
        estMinutes,
        osmDirectionsUrl,
        directionsUrl,
      };
    });
  }, [orders, storeLat, storeLng, activeOriginPos]);

  // Handle Starting In-App Turn-By-Turn Navigation for a specific order
  const handleInspectRoadRoute = async (order: Order) => {
    setActiveNavOrder(order);
    setFocusedOrderId(order.id);
    setShowMap(true);
    setIsLoadingRoadRoute(true);
    setRealRoadRoute(null);

    const startLat = activeOriginPos[0];
    const startLng = activeOriginPos[1];
    const destLat = order.deliveryLat || (storeLat + 0.01);
    const destLng = order.deliveryLng || (storeLng + 0.01);

    const route = await fetchRealRoadRoute(startLat, startLng, destLat, destLng);
    setRealRoadRoute(route);
    setIsLoadingRoadRoute(false);
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return enrichedOrders.filter((order) => {
      const orderDeliveryDate = (order.deliveryDate || order.createdAt || '').slice(0, 10);

      // Date Filter
      if (dateFilterMode === 'today' && orderDeliveryDate !== todayStr) return false;
      if (dateFilterMode === 'tomorrow' && orderDeliveryDate !== tomorrowStr) return false;
      if (dateFilterMode === 'custom' && orderDeliveryDate !== customDate) return false;

      // Shipper Filter
      if (selectedShipper !== 'all') {
        if (selectedShipper === 'unassigned') {
          if (order.deliveryStaffId) return false;
        } else if (order.deliveryStaffId !== selectedShipper) {
          return false;
        }
      }

      // Time Slot Filter
      if (selectedTimeSlot !== 'all') {
        const timeText = (order.deliveryTime || order.estimatedDeliveryWindow || '').toLowerCase();
        if (selectedTimeSlot === 'morning' && !timeText.includes('sáng') && !timeText.includes('08:') && !timeText.includes('09:') && !timeText.includes('10:') && !timeText.includes('11:')) return false;
        if (selectedTimeSlot === 'afternoon' && !timeText.includes('chiều') && !timeText.includes('13:') && !timeText.includes('14:') && !timeText.includes('15:') && !timeText.includes('16:')) return false;
        if (selectedTimeSlot === 'evening' && !timeText.includes('tối') && !timeText.includes('18:') && !timeText.includes('19:') && !timeText.includes('20:')) return false;
      }

      // Status Filter
      if (selectedStatus === 'pending_active') {
        // Active orders that need attention (Chờ lấy hàng & Đang giao)
        if (order.status !== 'pending' && order.status !== 'pending_pickup' && order.status !== 'delivering' && order.status !== 'in_transit') return false;
      } else if (selectedStatus !== 'all') {
        if (selectedStatus === 'pending_pickup' && order.status !== 'pending' && order.status !== 'pending_pickup') return false;
        if (selectedStatus === 'in_transit' && order.status !== 'delivering' && order.status !== 'in_transit') return false;
        if (selectedStatus === 'delivered' && order.status !== 'completed' && order.status !== 'delivered') return false;
        if (selectedStatus === 'failed' && order.status !== 'failed' && order.status !== 'cancelled') return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = (order.orderCode || '').toLowerCase().includes(q);
        const matchCust = (order.customerName || '').toLowerCase().includes(q);
        const matchPhone = (order.customerPhone || '').includes(q);
        const matchAddress = (order.deliveryAddress || '').toLowerCase().includes(q);
        const matchShipper = (order.deliveryStaffName || '').toLowerCase().includes(q);
        const matchItems = (order.items || []).some((it) => it.productName.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q));

        if (!matchCode && !matchCust && !matchPhone && !matchAddress && !matchShipper && !matchItems) {
          return false;
        }
      }

      return true;
    });
  }, [
    enrichedOrders,
    dateFilterMode,
    customDate,
    selectedShipper,
    selectedTimeSlot,
    selectedStatus,
    searchQuery,
    todayStr,
    tomorrowStr,
  ]);

  // Sorted Orders for Routing Sequence & Smart Trip Optimization
  const sortedOrders = useMemo(() => {
    if (sortBy === 'optimized_trip') {
      // Smart Trip Sequence: Nearest-Neighbor from active origin (Shipper GPS or Warehouse)
      return optimizeDeliveryRouteSequence(activeOriginPos, filteredOrders);
    }
    if (sortBy === 'distance_asc') {
      return [...filteredOrders].sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    }
    if (sortBy === 'cod_desc') {
      return [...filteredOrders].sort((a, b) => (b.remainingAmount || 0) - (a.remainingAmount || 0));
    }
    // time_asc: Sort by delivery time slot
    return [...filteredOrders].sort((a, b) => {
      const timeA = `${a.deliveryDate || ''} ${a.deliveryTime || ''}`;
      const timeB = `${b.deliveryDate || ''} ${b.deliveryTime || ''}`;
      return timeA.localeCompare(timeB);
    });
  }, [filteredOrders, sortBy, activeOriginPos]);

  // Overall KPIs for the active filter
  const {
    totalOrdersCount,
    pendingPickupCount,
    inTransitCount,
    deliveredCount,
    failedCount,
    totalCodToCollect,
    totalDistanceKm,
  } = useMemo(() => {
    let pending = 0;
    let transit = 0;
    let delivered = 0;
    let failed = 0;
    let cod = 0;
    let totalDist = 0;

    sortedOrders.forEach((o) => {
      if (o.status === 'completed' || o.status === 'delivered') delivered++;
      else if (o.status === 'delivering' || o.status === 'in_transit') transit++;
      else if (o.status === 'failed' || o.status === 'cancelled') failed++;
      else pending++;

      if (o.status !== 'completed' && o.status !== 'delivered') {
        cod += o.remainingAmount || 0;
      }
      totalDist += o.distanceKm || 0;
    });

    return {
      totalOrdersCount: sortedOrders.length,
      pendingPickupCount: pending,
      inTransitCount: transit,
      deliveredCount: delivered,
      failedCount: failed,
      totalCodToCollect: cod,
      totalDistanceKm: Number(totalDist.toFixed(1)),
    };
  }, [sortedOrders]);

  // Map stops points
  const mapStops = useMemo(() => {
    return sortedOrders.map((o) => ({
      orderId: o.id,
      pos: [o.deliveryLat, o.deliveryLng] as [number, number],
      order: o,
    }));
  }, [sortedOrders]);

  // Sequential Connected Route Polyline coordinates for the entire trip
  const tripRoutePolylineCoords = useMemo(() => {
    const coords: [number, number][] = [activeOriginPos];
    sortedOrders.forEach((o) => {
      coords.push([o.deliveryLat, o.deliveryLng]);
    });
    return coords;
  }, [activeOriginPos, sortedOrders]);

  // Fetch Multi-stop real road route (OSRM street-level bends and turns)
  useEffect(() => {
    let isCancelled = false;

    let stopsToRoute: Array<{ lat: number; lng: number; label?: string }> = [];
    let startLat = activeOriginPos[0];
    let startLng = activeOriginPos[1];

    if (previewTrip) {
      startLat = previewTrip.departureLat || activeOriginPos[0];
      startLng = previewTrip.departureLng || activeOriginPos[1];
      const tripOrders = (previewTrip.orderIds || [])
        .map((id) => orders.find((o) => o.id === id))
        .filter(Boolean) as Order[];

      stopsToRoute = tripOrders.map((ord, idx) => ({
        lat: ord.deliveryLat || 10.7418,
        lng: ord.deliveryLng || 106.6722,
        label: `Điểm ${idx + 1} (${ord.orderCode} - ${ord.customerName})`,
      }));
    } else if (sortBy === 'optimized_trip' && sortedOrders.length > 0) {
      stopsToRoute = sortedOrders.slice(0, 10).map((ord, idx) => ({
        lat: ord.deliveryLat || 10.7418,
        lng: ord.deliveryLng || 106.6722,
        label: `Điểm ${idx + 1} (${ord.orderCode} - ${ord.customerName})`,
      }));
    }

    if (stopsToRoute.length > 0) {
      setIsLoadingMultiStopRoute(true);
      fetchMultiStopRealRoadRoute(startLat, startLng, stopsToRoute)
        .then((res) => {
          if (!isCancelled) {
            setMultiStopRoadRoute(res);
            setIsLoadingMultiStopRoute(false);
          }
        })
        .catch(() => {
          if (!isCancelled) setIsLoadingMultiStopRoute(false);
        });
    } else {
      setMultiStopRoadRoute(null);
    }

    return () => {
      isCancelled = true;
    };
  }, [previewTrip, sortBy, sortedOrders, activeOriginPos, orders]);

  // Quick Action Handler: Open Status Update Modal
  const handleOpenStatusModal = (order: Order, suggestedStatus?: OrderStatus) => {
    setStatusUpdateTarget(order);
    setNewStatusChoice(suggestedStatus || order.status);
    setAssignedShipperId(order.deliveryStaffId || deliveryStaffList[0]?.employeeId || 'NV004');
    setShipperNoteInput('');
  };

  const handleSaveStatusModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusUpdateTarget) return;

    const chosenStaff = staffList.find((s) => s.employeeId === assignedShipperId);

    updateOrderDeliveryDetails(statusUpdateTarget.id, {
      status: newStatusChoice,
      deliveryStaffId: assignedShipperId,
      deliveryStaffName: chosenStaff?.employeeName || statusUpdateTarget.deliveryStaffName,
      deliveryStaffPhone: chosenStaff?.phone || statusUpdateTarget.deliveryStaffPhone,
      newLogNote: shipperNoteInput.trim() || undefined,
      updatedBy: chosenStaff?.employeeName || 'Bên Vận Chuyển',
    });

    setStatusUpdateTarget(null);
  };

  const focusedOrder = useMemo(() => {
    return sortedOrders.find((o) => o.id === focusedOrderId) || null;
  }, [sortedOrders, focusedOrderId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs tracking-wider uppercase mb-1">
            <Truck className="w-4 h-4 text-amber-400" />
            <span>Chỉ Đường & Điều Phối Lộ Trình Shipper</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center space-x-3">
            <span>Lịch Trình & Chỉ Đường Giao Hàng</span>
            <span className="text-xs bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-full font-bold">
              {sortedOrders.length} Điểm Giao
            </span>
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Hỗ trợ bên vận chuyển <strong>định vị GPS</strong>, bấm <strong>dẫn đường giọng nói trên điện thoại</strong>, xem <strong>hướng dẫn từng ngã rẽ trực tiếp</strong> và tự động <strong>sắp xếp thứ tự các điểm dừng tối ưu</strong> theo cung đường thật.
          </p>
        </div>

        {/* Live GPS & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 no-print">
          {/* Button: Định vị vị trí hiện tại của tôi (Shipper GPS) */}
          <button
            onClick={handleDetectShipperLocation}
            disabled={isLocating}
            className={`font-black text-xs px-3.5 py-2.5 rounded-xl flex items-center space-x-2 transition-all shadow-md border ${
              shipperLocation
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
                : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400'
            }`}
            title="Định vị tọa độ GPS của bạn để sắp xếp thứ tự lộ trình từ vị trí hiện tại"
          >
            {isLocating ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Locate className="w-4 h-4 text-amber-300" />
            )}
            <span>
              {isLocating
                ? 'Đang dò GPS...'
                : shipperLocation
                ? `Đã định vị (${shipperLocation.lat.toFixed(3)}, ${shipperLocation.lng.toFixed(3)})`
                : '📍 Định vị vị trí của tôi (GPS)'}
            </span>
          </button>

          {/* Button: Ghép đơn giao hàng (Tạo chuyến) */}
          <button
            onClick={() => {
              setBatchModalInitialTrip(null);
              setCheckedOrderIdsForBatch([]);
              setIsBatchModalOpen(true);
            }}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5 transition-all shadow-md"
            title="Ghép nhiều đơn hàng cho 1 shipper chạy từ kho qua Điểm 1 rồi Điểm 2"
          >
            <Boxes className="w-4 h-4 text-slate-950" />
            <span>+ Ghép Đơn Giao Hàng</span>
          </button>

          {/* Button: Quản lý các chuyến ghép */}
          {deliveryTrips.length > 0 && (
            <button
              onClick={() => {
                setBatchModalInitialTrip(null);
                setIsBatchModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5 transition-all shadow-xs border border-indigo-400/50"
              title="Xem danh sách các chuyến ghép đơn đã tạo"
            >
              <Layers className="w-4 h-4" />
              <span>Chuyến ghép ({deliveryTrips.length})</span>
            </button>
          )}

          <button
            onClick={() => setShowMap(!showMap)}
            className={`font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5 transition-all shadow-xs border ${
              showMap
                ? 'bg-slate-800 text-white border-slate-700'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>{showMap ? 'Ẩn bản đồ' : 'Hiện bản đồ'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5 transition-all"
            title="In bảng kê lịch giao hàng"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">In lịch trình</span>
          </button>
        </div>
      </div>

      {/* EXPLANATION BANNER: Điểm dừng 1, 2, 3, 4 trên bản đồ là gì? */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50 border-2 border-blue-200 rounded-2xl p-4 sm:p-5 text-slate-800 shadow-xs space-y-2 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs font-black text-xs">
              1-4
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 flex items-center space-x-2">
                <span>Điểm dừng 1, 2, 3, 4 trên bản đồ là gì?</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                  Thứ tự lộ trình giao hàng liên tục
                </span>
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Trên bản đồ, điểm <strong>🏢 KHO (Hiệp Ân Q8)</strong> là nơi xuất phát. Các số tròn{' '}
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-black mx-1">1</span>,{' '}
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-black mx-1">2</span>,{' '}
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-black mx-1">3</span>...
                chính là <strong>thứ tự các điểm dừng trả hàng cho khách</strong>. Hệ thống tự động sắp xếp theo khoảng cách tối ưu để Shipper đi từ kho ➔ giao khách 1 ➔ tiếp tục tới khách 2 ➔ khách 3 trên cùng tuyến đường mà không bị chạy vòng vèo, tiết kiệm tối đa xăng và thời gian.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setBatchModalInitialTrip(null);
                setCheckedOrderIdsForBatch([]);
                setIsBatchModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center space-x-1.5 shadow-xs transition-transform active:scale-95"
            >
              <Boxes className="w-4 h-4" />
              <span>Ghép đơn giao hàng ngay</span>
            </button>
          </div>
        </div>
      </div>

      {/* GPS Notification Toast if active */}
      {locationNotice && (
        <div className="bg-blue-900/90 border border-blue-600 text-blue-100 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{locationNotice}</span>
          </div>
          <button
            onClick={() => setLocationNotice(null)}
            className="text-blue-300 hover:text-white ml-2 text-xs font-bold"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Starting Location (Origin Point) & Route Setup Bar */}
      <div className="bg-white p-5 rounded-2xl border-2 border-blue-500/30 shadow-md space-y-3 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center space-x-1">
                <Building2 className="w-3 h-3" />
                <span>Vị Trí Đầu (Điểm Xuất Phát)</span>
              </span>
              <span className="text-slate-400 text-xs hidden sm:inline">• Điểm bắt đầu tính quãng đường & dẫn đường</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="text-base sm:text-lg font-black text-slate-900 flex items-center space-x-1.5">
                <span>{activeOriginLabel}</span>
              </span>
              {selectedDepartureId !== 'shipper_gps' && activeDeparture.isDefault && (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-300">
                  Kho Mặc Định
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 flex items-center space-x-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>{activeOriginAddress}</span>
            </p>
          </div>

          {/* Quick Action Buttons for Departure Points */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setDepartureModalMode('add');
                setIsDepartureModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm địa điểm xuất phát</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDepartureModalMode('manage');
                setIsDepartureModalOpen(true);
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center space-x-1.5"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Quản lý điểm ({departureLocations.length})</span>
            </button>
          </div>
        </div>

        {/* Departure Point Switcher Pills */}
        <div className="pt-2 border-t border-slate-100 flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 uppercase tracking-wider">
            Chọn điểm xuất phát:
          </span>
          {departureLocations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => {
                setSelectedDepartureId(loc.id);
                setActiveDepartureLocation(loc.id);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center space-x-1.5 border ${
                selectedDepartureId === loc.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="truncate max-w-[190px]">{loc.name}</span>
            </button>
          ))}

          {/* Shipper Live GPS Pill */}
          <button
            type="button"
            onClick={() => {
              if (!shipperLocation) {
                handleDetectShipperLocation();
              } else {
                setSelectedDepartureId('shipper_gps');
              }
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center space-x-1.5 border ${
              selectedDepartureId === 'shipper_gps'
                ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200'
            }`}
          >
            <Navigation2 className="w-3.5 h-3.5" />
            <span>Vị trí của tôi (GPS)</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards for Delivery Team */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Deliveries */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng đơn cần xử lý</span>
          <p className="text-xl font-black text-slate-900 mt-1">{totalOrdersCount} <span className="text-xs font-normal text-slate-500">đơn</span></p>
          <p className="text-[10px] text-slate-500">Lịch trình đã lọc</p>
        </div>

        {/* In Transit */}
        <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Đang trên đường giao</span>
          <p className="text-xl font-black text-blue-800 mt-1">{inTransitCount} <span className="text-xs font-normal text-blue-600">đơn</span></p>
          <p className="text-[10px] text-blue-600">Shipper đang giao</p>
        </div>

        {/* Pending Pickup */}
        <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Chờ lấy hàng xuất kho</span>
          <p className="text-xl font-black text-amber-800 mt-1">{pendingPickupCount} <span className="text-xs font-normal text-amber-600">đơn</span></p>
          <p className="text-[10px] text-amber-600">Sẵn sàng tại kho</p>
        </div>

        {/* Delivered Success */}
        <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Giao thành công</span>
          <p className="text-xl font-black text-emerald-800 mt-1">{deliveredCount} <span className="text-xs font-normal text-emerald-600">đơn</span></p>
          <p className="text-[10px] text-emerald-600">Khách đã nhận</p>
        </div>

        {/* Total COD remaining */}
        <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Tiền COD cần thu</span>
          <p className="text-base font-black text-rose-800 mt-1 truncate" title={formatVND(totalCodToCollect)}>
            {formatVND(totalCodToCollect)}
          </p>
          <p className="text-[10px] text-rose-600">Phải thu & nộp quỹ</p>
        </div>

        {/* Total Distance */}
        <div className="bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Tổng quãng đường</span>
          <p className="text-xl font-black text-indigo-800 mt-1">
            {totalDistanceKm} <span className="text-xs font-normal text-indigo-600">km</span>
          </p>
          <p className="text-[10px] text-indigo-600">
            {shipperLocation ? 'Từ vị trí của bạn' : 'Từ kho hàng'}
          </p>
        </div>
      </div>

      {/* Filter and Schedule Control Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 no-print">
        {/* Date Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-slate-500 flex items-center space-x-1 mr-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Ngày giao:</span>
          </span>

          <button
            onClick={() => setDateFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
              dateFilterMode === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ngày ({enrichedOrders.length})
          </button>

          <button
            onClick={() => setDateFilterMode('today')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1 ${
              dateFilterMode === 'today'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Hôm nay ({formatDateVI(todayStr)})</span>
          </button>

          <button
            onClick={() => setDateFilterMode('tomorrow')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
              dateFilterMode === 'tomorrow'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Ngày mai ({formatDateVI(tomorrowStr)})
          </button>

          <button
            onClick={() => setDateFilterMode('custom')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1 ${
              dateFilterMode === 'custom'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Chọn ngày cụ thể</span>
          </button>

          {dateFilterMode === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-2.5 py-1 text-xs border border-blue-400 rounded-lg bg-blue-50 text-blue-900 font-bold focus:outline-none"
            />
          )}
        </div>

        {/* Dropdowns & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Trip Sequencing Mode */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-blue-700 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Sắp xếp lộ trình chuyến đi:</span>
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-blue-50/60 border border-blue-300 rounded-xl px-3 py-2 font-black text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="optimized_trip">✨ Tối ưu chuyến đi (Gần nhất liên tiếp)</option>
              <option value="distance_asc">Theo cự ly (Gần xuất phát → Xa)</option>
              <option value="time_asc">Theo giờ hẹn giao (Sớm → Muộn)</option>
              <option value="cod_desc">Theo số tiền COD (Nhiều → Ít)</option>
            </select>
          </div>

          {/* Shipper Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 flex items-center space-x-1">
              <User className="w-3 h-3 text-blue-600" />
              <span>Shipper phụ trách:</span>
            </label>
            <select
              value={selectedShipper}
              onChange={(e) => setSelectedShipper(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả Shipper ({deliveryStaffList.length})</option>
              {deliveryStaffList.map((s) => (
                <option key={s.id} value={s.employeeId}>
                  {s.employeeName} ({s.employeeId})
                </option>
              ))}
              <option value="unassigned">Chưa phân công Shipper</option>
            </select>
          </div>

          {/* Time Slot Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 flex items-center space-x-1">
              <Clock className="w-3 h-3 text-amber-600" />
              <span>Khung giờ giao:</span>
            </label>
            <select
              value={selectedTimeSlot}
              onChange={(e) => setSelectedTimeSlot(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả khung giờ</option>
              <option value="morning">Sáng (08:00 - 12:00)</option>
              <option value="afternoon">Chiều (13:00 - 17:00)</option>
              <option value="evening">Tối (18:00 - 21:00)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 flex items-center space-x-1">
              <Filter className="w-3 h-3 text-indigo-600" />
              <span>Trạng thái giao:</span>
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending_active">Đơn cần giao (Chờ lấy & Đang giao)</option>
              <option value="all">Tất cả trạng thái</option>
              <option value="pending_pickup">Chờ lấy hàng xuất kho</option>
              <option value="in_transit">Đang vận chuyển</option>
              <option value="delivered">Giao thành công</option>
              <option value="failed">Giao thất bại / Hoãn</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 flex items-center space-x-1">
              <Search className="w-3 h-3 text-slate-400" />
              <span>Tìm kiếm đơn:</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Tên khách, SĐT, mã đơn, địa chỉ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Smart Trip Manifest Bar */}
      {sortBy === 'optimized_trip' && sortedOrders.length > 0 && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 rounded-2xl shadow-md border border-blue-700/60 no-print">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-extrabold text-sm block">
                  Kế hoạch Lộ trình Chuyến đi ({sortedOrders.length} điểm dừng)
                </span>
                <span className="text-blue-200 text-[11px]">
                  Xuất phát: <strong>{shipperLocation ? 'Vị trí hiện tại của bạn (GPS)' : storeInfo.name}</strong> ➔ Lần lượt giao các điểm gần nhất để tiết kiệm xăng và thời gian.
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="bg-blue-800/80 border border-blue-600 px-3 py-1.5 rounded-xl font-mono font-bold text-blue-100">
                Tổng cự ly: {totalDistanceKm} km
              </span>
            </div>
          </div>

          {/* Quick stop sequence pill chain */}
          <div className="mt-3 flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px]">
            <span className="bg-blue-950 px-2.5 py-1 rounded-lg font-bold border border-blue-700 shrink-0 flex items-center space-x-1">
              <MapPin className="w-3 h-3 text-amber-400" />
              <span>{shipperLocation ? 'Vị trí bạn' : 'Kho'}</span>
            </span>

            {sortedOrders.slice(0, 8).map((ord, i) => (
              <React.Fragment key={ord.id}>
                <ArrowRight className="w-3 h-3 text-blue-400 shrink-0" />
                <button
                  type="button"
                  onClick={() => handleInspectRoadRoute(ord)}
                  className={`px-2 py-1 rounded-lg font-bold border transition-all shrink-0 flex items-center space-x-1 ${
                    focusedOrderId === ord.id
                      ? 'bg-amber-500 text-slate-950 border-amber-300 font-black'
                      : ord.status === 'completed' || ord.status === 'delivered'
                      ? 'bg-emerald-900/80 text-emerald-200 border-emerald-600'
                      : 'bg-blue-800/70 text-blue-100 border-blue-600 hover:bg-blue-700'
                  }`}
                  title="Bấm để xem chỉ đường tới đơn này"
                >
                  <span className="font-black text-[10px]">#{i + 1}</span>
                  <span className="truncate max-w-[80px]">{ord.customerName.split(' ').slice(-1)[0]}</span>
                </button>
              </React.Fragment>
            ))}

            {sortedOrders.length > 8 && (
              <span className="text-blue-300 font-bold px-1 shrink-0">
                +{sortedOrders.length - 8} điểm nữa...
              </span>
            )}
          </div>
        </div>
      )}

      {/* Interactive Turn-By-Turn Navigation Drawer / Road Guidance Panel */}
      {activeNavOrder && (
        <div className="bg-slate-900 text-white rounded-2xl border-2 border-blue-500 p-5 shadow-2xl space-y-4 animate-in slide-in-from-top-4 no-print">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                <Navigation className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-blue-800 text-blue-200 px-2 py-0.5 rounded">
                    Chỉ đường trực tiếp
                  </span>
                  <span className="font-mono text-xs text-slate-400">{activeNavOrder.orderCode}</span>
                </div>
                <h3 className="text-base font-black text-white mt-0.5">
                  Đang chỉ đường tới: {activeNavOrder.customerName}
                </h3>
                <p className="text-xs text-slate-300 flex items-center space-x-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{activeNavOrder.deliveryAddress}</span>
                </p>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => {
                setActiveNavOrder(null);
                setRealRoadRoute(null);
              }}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700"
              title="Đóng chỉ đường"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Metrics & Call to Action Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Cự ly lái xe thực tế:</span>
              <span className="text-base font-black text-blue-400">
                {realRoadRoute ? `${realRoadRoute.distanceKm} km` : `${activeNavOrder.distanceKm} km`}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Thời gian ước tính:</span>
              <span className="text-base font-black text-emerald-400">
                ~{realRoadRoute ? `${realRoadRoute.durationMinutes} phút` : `${activeNavOrder.estMinutes} phút`}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Tiền COD thu hộ:</span>
              <span className="text-base font-black text-amber-400">
                {formatVND(activeNavOrder.remainingAmount || 0)}
              </span>
            </div>
          </div>

          {/* Direct Navigation Launchers (THE MOST IMPORTANT THING FOR SHIPPERS) */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {/* 1. Mở App Google Maps Dẫn Đường Giọng Nói (No API Key Required, opens Google Maps app directly) */}
            <a
              href={activeNavOrder.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm px-5 py-3 rounded-xl inline-flex items-center space-x-2 shadow-lg transition-transform active:scale-95 flex-1 justify-center"
            >
              <Volume2 className="w-5 h-5 text-amber-300 animate-bounce" />
              <span>Bật Dẫn Đường Giọng Nói (Mở App Google Maps)</span>
              <ExternalLink className="w-4 h-4 text-emerald-200" />
            </a>

            {/* 2. OpenStreetMap Link */}
            <a
              href={activeNavOrder.osmDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-4 py-3 rounded-xl inline-flex items-center space-x-2 transition-colors"
            >
              <Navigation className="w-4 h-4 text-blue-400" />
              <span>Mở OpenStreetMap</span>
            </a>

            {/* 3. Gọi điện thoại cho khách */}
            <a
              href={`tel:${activeNavOrder.customerPhone}`}
              className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-4 py-3 rounded-xl inline-flex items-center space-x-1.5 transition-colors"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Gọi {activeNavOrder.customerPhone}</span>
            </a>
          </div>

          {/* Step-by-Step Turn Instructions List */}
          {isLoadingRoadRoute ? (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center text-xs text-blue-300 flex items-center justify-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
              <span>Đang tính toán các ngã rẽ và đường đi thực tế...</span>
            </div>
          ) : realRoadRoute && realRoadRoute.steps.length > 0 ? (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                <span className="flex items-center space-x-1.5">
                  <Milestone className="w-3.5 h-3.5 text-blue-400" />
                  <span>Hướng Dẫn Từng Ngã Rẽ Trên Cung Đường ({realRoadRoute.steps.length} chặng):</span>
                </span>
                <span className="text-blue-400">Theo dữ liệu đường phố OSRM</span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2 divide-y divide-slate-800/80">
                {realRoadRoute.steps.map((st, i) => (
                  <div key={i} className="pt-1.5 flex items-start justify-between text-xs text-slate-200">
                    <div className="flex items-start space-x-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-blue-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-semibold">{st.instruction}</p>
                        {st.streetName && <p className="text-[10px] text-slate-400 font-medium">Tên đường: {st.streetName}</p>}
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-blue-300 font-bold shrink-0 ml-2">
                      {st.distanceMeters >= 1000 ? `${(st.distanceMeters / 1000).toFixed(1)} km` : `${st.distanceMeters} m`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Interactive Leaflet & OpenStreetMap Delivery Route Map */}
      {showMap && (
        <div id="delivery-map-section" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden no-print">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <Compass className="w-4 h-4 text-blue-600" />
              <span className="font-extrabold text-slate-900">
                Bản Đồ Lộ Trình OpenStreetMap / Leaflet ({mapStops.length} điểm dừng)
              </span>
              <span className="text-[11px] text-slate-500 hidden md:inline">
                • 100% Miễn phí, hoạt động trực tiếp không cần API key
              </span>
            </div>

            {/* Tile selector & Map Legend */}
            <div className="flex items-center space-x-2 text-[11px]">
              {/* Tile layer selector */}
              <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg">
                <button
                  onClick={() => setTileLayerType('osm')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    tileLayerType === 'osm' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  OpenStreetMap
                </button>
                <button
                  onClick={() => setTileLayerType('esri')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    tileLayerType === 'esri' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Đường phố
                </button>
                <button
                  onClick={() => setTileLayerType('satellite')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    tileLayerType === 'satellite' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Vệ tinh
                </button>
              </div>

              {/* Toggle connecting route lines on map */}
              <button
                type="button"
                onClick={() => setShowTripRoutePolyline(!showTripRoutePolyline)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center space-x-1 transition-all ${
                  showTripRoutePolyline
                    ? 'bg-blue-600 text-white shadow-2xs hover:bg-blue-700'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-300'
                }`}
                title={showTripRoutePolyline ? 'Bấm để ẩn đường kẻ nối lộ trình' : 'Bấm để hiện đường kẻ nối lộ trình'}
              >
                <Route className="w-3 h-3" />
                <span>{showTripRoutePolyline ? 'Đường lộ trình: BẬT' : 'Đường lộ trình: TẮT'}</span>
              </button>

              {shipperLocation && (
                <span className="flex items-center space-x-1 bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping inline-block" />
                  <span>GPS của bạn</span>
                </span>
              )}
            </div>
          </div>

          {/* BANNER LỘ TRÌNH NGÃ RẼ ĐƯỜNG BỘ THỰC TẾ (OSRM) */}
          {(previewTrip || (sortBy === 'optimized_trip' && sortedOrders.length > 0)) && (
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-blue-700/60 text-xs">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/30 border border-blue-400/50 flex items-center justify-center text-blue-300 shrink-0">
                  <Route className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-sm">
                      {previewTrip ? `Lộ trình ngã rẽ Chuyến ${previewTrip.tripCode}` : 'Lộ trình đa điểm theo ngã rẽ thực tế (OSRM)'}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      isLoadingMultiStopRoute
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                    }`}>
                      {isLoadingMultiStopRoute ? 'Đang tính ngã rẽ...' : 'Bám sát mạng lưới đường bộ'}
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-200 mt-0.5">
                    {previewTrip
                      ? `Kho ➔ ${previewTrip.orderIds.length} điểm dừng · ${multiStopRoadRoute ? `Cự ly đường bộ: ~${multiStopRoadRoute.distanceKm} km (~${multiStopRoadRoute.durationMinutes} phút)` : 'Đang tải đường đi...'}`
                      : `Đường đi uốn lượn theo từng con đường & ngã rẽ qua các điểm giao`}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {multiStopRoadRoute && multiStopRoadRoute.steps && multiStopRoadRoute.steps.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowTurnListModal(true)}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-lg flex items-center space-x-1.5 transition-all shadow-sm active:scale-95"
                    title="Xem chi tiết các ngã rẽ trên đường"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>Xem {multiStopRoadRoute.steps.length} ngã rẽ</span>
                  </button>
                )}

                {previewTrip && (
                  <button
                    type="button"
                    onClick={() => setPreviewTrip(null)}
                    className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-blue-200 border border-white/20 rounded-lg text-xs font-bold transition-colors"
                    title="Trở về xem toàn bộ đơn trên map"
                  >
                    ✕ Tắt xem chuyến này
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="h-[380px] sm:h-[460px] w-full relative z-0">
            <MapContainer
              center={activeOriginPos}
              zoom={13}
              minZoom={5}
              maxBounds={[[8.0, 102.0], [24.0, 110.0]]}
              scrollWheelZoom={true}
              style={{ width: '100%', height: '100%' }}
            >
              {/* 100% Free OpenStreetMap & Esri Tiles - NO API KEY REQUIRED */}
              {tileLayerType === 'osm' ? (
                <TileLayer
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
              ) : tileLayerType === 'esri' ? (
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                  attribution='&copy; Esri, DeLorme, NAVTEQ, USGS'
                />
              ) : (
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution='&copy; Esri, Maxar, Earthstar Geographics'
                />
              )}

              <MultiStopMapRecenter
                storePos={storePos}
                shipperPos={shipperLocation ? [shipperLocation.lat, shipperLocation.lng] : null}
                stops={mapStops}
                selectedOrder={focusedOrder}
                roadRouteCoords={
                  activeNavOrder && realRoadRoute?.coordinates
                    ? realRoadRoute.coordinates
                    : multiStopRoadRoute?.coordinates
                }
              />

              {/* 1. Departure Origin Marker */}
              <Marker position={activeOriginPos} icon={createStoreDivIcon(activeOriginLabel)}>
                <Popup>
                  <div className="p-2 space-y-1 text-xs">
                    <p className="font-black text-blue-900 flex items-center space-x-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>{activeOriginLabel}</span>
                    </p>
                    <p className="text-[11px] text-slate-600">{activeOriginAddress}</p>
                    <p className="text-[11px] text-blue-700 font-bold">📍 Vị trí đầu xuất phát của chuyến đi</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      GPS: {activeOriginPos[0].toFixed(5)}, {activeOriginPos[1].toFixed(5)}
                    </p>
                  </div>
                </Popup>
              </Marker>

              {/* 2. Shipper Live Location Marker (If GPS enabled) */}
              {shipperLocation && (
                <Marker
                  position={[shipperLocation.lat, shipperLocation.lng]}
                  icon={createShipperLiveGpsDivIcon('Vị trí của bạn (Shipper)')}
                >
                  <Popup>
                    <div className="p-2 space-y-1 text-xs">
                      <p className="font-black text-sky-700 flex items-center space-x-1">
                        <Navigation2 className="w-3.5 h-3.5" />
                        <span>Vị Trí Hiện Tại Của Bạn (Shipper)</span>
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Tọa độ: {shipperLocation.lat.toFixed(5)}, {shipperLocation.lng.toFixed(5)}
                      </p>
                      {shipperLocation.accuracy && (
                        <p className="text-[10px] text-slate-500">Độ chính xác GPS: ±{shipperLocation.accuracy} mét</p>
                      )}
                      <p className="text-[10px] text-emerald-700 font-bold">
                        Đang làm gốc để tính cự ly & sắp xếp chuyến đi!
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* 3. Delivery Stop Markers */}
              {sortedOrders.map((ord, idx) => {
                const stopNum = idx + 1;
                const pos: [number, number] = [ord.deliveryLat, ord.deliveryLng];

                return (
                  <Marker
                    key={ord.id}
                    position={pos}
                    icon={createStopDivIcon(stopNum, ord.status)}
                    eventHandlers={{
                      click: () => handleInspectRoadRoute(ord),
                    }}
                  >
                    <Popup>
                      <div className="p-2 space-y-2 text-xs min-w-[220px]">
                        <div className="flex items-center justify-between">
                          <span className="bg-blue-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full">
                            Điểm dừng #{stopNum}
                          </span>
                          <span className="font-mono font-bold text-slate-700">{ord.orderCode}</span>
                        </div>

                        <div>
                          <p className="font-extrabold text-slate-900 text-sm">{ord.customerName}</p>
                          <a
                            href={`tel:${ord.customerPhone}`}
                            className="text-blue-600 font-bold text-xs flex items-center space-x-1 hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{ord.customerPhone}</span>
                          </a>
                          <p className="text-[11px] text-slate-600 mt-1">{ord.deliveryAddress}</p>
                        </div>

                        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200 text-[11px] flex justify-between">
                          <span>Khoảng cách:</span>
                          <strong className="text-blue-700">{ord.distanceKm} km (~{ord.estMinutes}p)</strong>
                        </div>

                        <div className="bg-amber-50 p-1.5 rounded-lg border border-amber-200 text-[11px] flex justify-between">
                          <span>Thu COD:</span>
                          <strong className="text-rose-700">{formatVND(ord.remainingAmount || 0)}</strong>
                        </div>

                        <div className="flex flex-col gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleInspectRoadRoute(ord)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center justify-center space-x-1"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Xem chỉ đường chi tiết</span>
                          </button>

                          <a
                            href={ord.directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-600 text-white text-[11px] font-bold py-1 px-3 rounded-lg flex items-center justify-center space-x-1 hover:bg-emerald-700"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Mở Dẫn đường GPS (Google Maps)</span>
                          </a>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* 4. Real Road Driving Polyline (Bends along actual streets and turns!) */}
              {activeNavOrder && realRoadRoute && realRoadRoute.coordinates.length > 0 ? (
                <Polyline
                  positions={realRoadRoute.coordinates}
                  color="#2563eb"
                  weight={6}
                  opacity={0.9}
                />
              ) : showTripRoutePolyline && multiStopRoadRoute && multiStopRoadRoute.coordinates.length > 0 ? (
                <>
                  {/* Glowing background */}
                  <Polyline
                    positions={multiStopRoadRoute.coordinates}
                    color="#60a5fa"
                    weight={10}
                    opacity={0.35}
                  />
                  {/* Sharp driving line */}
                  <Polyline
                    positions={multiStopRoadRoute.coordinates}
                    color="#1d4ed8"
                    weight={6}
                    opacity={0.95}
                  />
                </>
              ) : showTripRoutePolyline && tripRoutePolylineCoords.length > 1 ? (
                /* Sequential Trip Polyline Fallback */
                <Polyline
                  positions={tripRoutePolylineCoords}
                  color="#2563eb"
                  weight={4}
                  opacity={0.8}
                  dashArray="8, 6"
                />
              ) : null}
            </MapContainer>
          </div>
        </div>
      )}

      {/* CÁC CHUYẾN GHÉP ĐƠN ĐÃ TẠO & QUẢN LÝ / XÓA LỘ TRÌNH TRỰC TIẾP */}
      {deliveryTrips.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-md p-5 space-y-4 no-print">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-xs">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center space-x-2">
                  <span>Lộ Trình Các Chuyến Ghép Đơn Đã Tạo</span>
                  <span className="bg-indigo-100 text-indigo-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {deliveryTrips.length} chuyến
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Bạn có thể xem đường đi, in bảng kê, hoặc bấm <strong>"Xóa lộ trình"</strong> để hủy chuyến và đưa đơn về trạng thái Chờ giao.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setBatchModalInitialTrip(null);
                setCheckedOrderIdsForBatch([]);
                setIsBatchModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-xs transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tạo thêm chuyến mới</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {deliveryTrips.map((t) => {
              const tripOrders = (t.orderIds || [])
                .map((id) => orders.find((o) => o.id === id))
                .filter(Boolean) as Order[];

              const stopsCoords = tripOrders.map((ord) => ({
                lat: ord.deliveryLat || 10.7418,
                lng: ord.deliveryLng || 106.6722,
                address: ord.deliveryAddress,
                orderCode: ord.orderCode,
              }));

              const gMapsUrl = getMultiStopGoogleMapsUrl(
                t.departureLat || 10.7418,
                t.departureLng || 106.6722,
                stopsCoords
              );

              return (
                <div
                  key={t.id}
                  className="bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-300 rounded-xl p-4 transition-all space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-black text-sm text-indigo-900 bg-white border border-indigo-200 px-3 py-1 rounded-lg shadow-2xs">
                        {t.tripCode}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                          t.status === 'in_transit'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : t.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-blue-100 text-blue-800 border-blue-300'
                        }`}
                      >
                        {t.status === 'in_transit'
                          ? '🚚 Đang đi giao'
                          : t.status === 'completed'
                          ? '✅ Đã hoàn thành'
                          : '📋 Đang lên kế hoạch'}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
                        {t.createdAt?.slice(0, 10)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewTrip(t);
                          setShowMap(true);
                          const el = document.getElementById('delivery-map-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs active:scale-95 ${
                          previewTrip?.id === t.id
                            ? 'bg-blue-700 text-white ring-2 ring-blue-300'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                        title="Chiếu đường đi và từng ngã rẽ thực tế của chuyến này lên bản đồ"
                      >
                        <Route className="w-3.5 h-3.5" />
                        <span>{previewTrip?.id === t.id ? 'Đang chiếu ngã rẽ' : 'Xem lộ trình ngã rẽ'}</span>
                      </button>

                      {gMapsUrl && (
                        <a
                          href={gMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-2xs transition-colors"
                          title="Mở Google Maps dẫn đường cả chuyến"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Google Maps</span>
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setBatchModalInitialTrip(t);
                          setIsBatchModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-colors"
                        title="Xem chi tiết & Sửa chuyến"
                      >
                        Chi tiết / Sửa
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRequestDeleteTrip(t.id, t.tripCode, t.orderIds.length)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs active:scale-95"
                        title="Xóa / Hủy bỏ hoàn toàn lộ trình chuyến này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa lộ trình</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-white p-3 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-slate-400 font-semibold block text-[11px]">Kho xuất phát:</span>
                      <span className="font-bold text-slate-800">{t.departureLocationName || 'Kho 89 Hiệp Ân Q8'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[11px]">Shipper giao:</span>
                      <span className="font-bold text-slate-800">
                        {t.shipperName || 'Chưa phân công'} {t.shipperPhone ? `(${t.shipperPhone})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[11px]">Số đơn & COD thu hộ:</span>
                      <span className="font-black text-emerald-600">
                        {t.orderIds.length} đơn ({t.totalDistanceKm || 0} km) · {formatVND(t.totalCodAmount || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Stops breadcrumb */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
                    <span className="font-bold text-slate-500 text-[11px]">Thứ tự dừng:</span>
                    <span className="bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded text-[11px]">
                      Kho Q8
                    </span>
                    {tripOrders.map((ord, idx) => (
                      <React.Fragment key={ord.id}>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="bg-white border border-slate-300 text-slate-800 font-semibold px-2 py-0.5 rounded text-[11px]">
                          #{idx + 1}: {ord.orderCode} ({ord.customerName})
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delivery Schedule Timeline & Order Cards */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center space-x-2">
              <Route className="w-5 h-5 text-blue-600" />
              <span>Thứ Tự Giao Hàng & Chi Tiết Các Điểm Dừng</span>
              <span className="text-xs bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded-full">
                {sortedOrders.length} điểm
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              {sortBy === 'optimized_trip'
                ? 'Đã tối ưu thứ tự lộ trình theo nguyên tắc điểm gần nhất liên tiếp'
                : sortBy === 'distance_asc'
                ? 'Sắp xếp theo cự ly gần nhất trước'
                : sortBy === 'cod_desc'
                ? 'Sắp xếp theo số tiền COD nhiều nhất trước'
                : 'Sắp xếp theo giờ hẹn giao sớm nhất'}
            </p>
          </div>

          <div className="text-xs font-semibold text-slate-500">
            Tổng khoảng cách: <strong className="text-blue-700">{totalDistanceKm} km</strong>
          </div>
        </div>

        {/* Empty state */}
        {sortedOrders.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-xs">
            <Truck className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-extrabold text-slate-800">Không có đơn giao hàng nào phù hợp</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Không tìm thấy đơn hàng nào cần giao theo ngày, khung giờ hoặc nhân viên shipper đã chọn. Hãy thử thay đổi bộ lọc.
            </p>
            <button
              onClick={() => {
                setDateFilterMode('all');
                setSelectedShipper('all');
                setSelectedTimeSlot('all');
                setSelectedStatus('all');
                setSearchQuery('');
              }}
              className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs px-4 py-2 rounded-xl border border-blue-200 transition-colors inline-flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Đặt lại bộ lọc</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {sortedOrders.map((order, idx) => {
              const stopNum = idx + 1;
              const isSelected = focusedOrderId === order.id;

              return (
                <div
                  key={order.id}
                  onClick={() => handleInspectRoadRoute(order)}
                  className={`bg-white rounded-2xl border transition-all p-5 shadow-xs space-y-4 hover:shadow-md cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Top Bar: Stop number, Distance Badge, Delivery Window, Status */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Checkbox for batch selection */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleOrderForBatch(order.id);
                        }}
                        className={`p-1.5 rounded-xl border flex items-center justify-center transition-all ${
                          checkedOrderIdsForBatch.includes(order.id)
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 border-slate-300 text-slate-400 hover:text-slate-700'
                        }`}
                        title="Tích chọn để ghép đơn này vào chuyến giao hàng đa điểm"
                      >
                        {checkedOrderIdsForBatch.includes(order.id) ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      {/* Stop Sequence Badge */}
                      <span className="bg-slate-900 text-white font-black text-xs px-3 py-1 rounded-xl shadow-xs flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        <span>Điểm dừng #{stopNum}</span>
                      </span>

                      {/* Distance & Duration Badge */}
                      <span className="bg-blue-50 text-blue-800 border border-blue-200 font-extrabold text-xs px-3 py-1 rounded-xl flex items-center space-x-1.5">
                        <Navigation className="w-3.5 h-3.5 text-blue-600" />
                        <span>Khoảng cách: <strong>{order.distanceKm} km</strong></span>
                        <span className="text-slate-400">•</span>
                        <span>Ước tính: ~{order.estMinutes} phút</span>
                      </span>

                      {/* Delivery Date & Time Window */}
                      <span className="bg-amber-50 text-amber-900 border border-amber-200 font-bold text-xs px-3 py-1 rounded-xl flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        <span>{formatDateVI(order.deliveryDate)}</span>
                        <Clock className="w-3.5 h-3.5 text-amber-600 ml-1" />
                        <span>{order.deliveryTime || 'Giờ hành chính'}</span>
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-xs font-black px-3 py-1 rounded-full border inline-flex items-center space-x-1 ${
                          order.status === 'completed' || order.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : order.status === 'delivering' || order.status === 'in_transit'
                            ? 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse'
                            : order.status === 'failed' || order.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {order.status === 'delivering' || order.status === 'in_transit' ? (
                          <Truck className="w-3.5 h-3.5 mr-1" />
                        ) : order.status === 'completed' || order.status === 'delivered' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        ) : null}
                        <span>{getOrderStatusLabel(order.status)}</span>
                      </span>

                      <span className="font-mono text-xs font-extrabold text-slate-500">
                        {order.orderCode}
                      </span>
                    </div>
                  </div>

                  {/* Main Grid: Customer & Address | Items | COD & Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Column 1: Customer Info & Clear Navigation Launchers */}
                    <div className="space-y-2">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Khách nhận hàng</p>
                        <h3 className="text-base font-black text-slate-900">{order.customerName}</h3>
                      </div>

                      {/* Phone & Direct Call button */}
                      <div className="flex items-center space-x-2">
                        <a
                          href={`tel:${order.customerPhone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl flex items-center space-x-1.5 shadow-xs transition-transform active:scale-95"
                          title="Bấm để gọi điện cho khách hàng ngay"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>Gọi {order.customerPhone}</span>
                        </a>
                      </div>

                      {/* Detailed Address & Clear Direction Buttons */}
                      <div className="pt-1">
                        <p className="text-xs text-slate-700 font-medium leading-relaxed flex items-start space-x-1.5">
                          <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <span>{order.deliveryAddress}</span>
                        </p>

                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          {/* 1. Mở Dẫn Đường Giọng Nói (Mở App Google Maps trên điện thoại - 100% Free) */}
                          <a
                            href={order.directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl inline-flex items-center space-x-1.5 shadow-xs transition-colors"
                            title="Bấm để mở ứng dụng Google Maps dẫn đường giọng nói tiếng Việt trên điện thoại"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Dẫn đường GPS (Mở App)</span>
                            <ExternalLink className="w-3 h-3 ml-0.5" />
                          </a>

                          {/* 2. Xem Chỉ Đường & Từng Ngã Rẽ Trên Web */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspectRoadRoute(order);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl inline-flex items-center space-x-1 shadow-xs transition-colors"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Lộ trình & Ngã rẽ</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Items in Order & Special Delivery Notes */}
                    <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1 mb-1.5">
                          <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                          <span>Sản phẩm trong kiện hàng:</span>
                        </p>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                          {(order.items || []).map((it, i) => (
                            <div key={i} className="text-xs flex items-center justify-between">
                              <span className="font-bold text-slate-800 truncate mr-2">
                                • {it.productName}
                              </span>
                              <span className="bg-white border border-slate-200 px-2 py-0.2 rounded text-[11px] font-black text-blue-700 shrink-0">
                                x{it.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Delivery Notes */}
                      {order.deliveryNotes && (
                        <div className="border-t border-slate-200 pt-2">
                          <p className="text-[10px] font-bold text-amber-700 uppercase">Ghi chú giao hàng:</p>
                          <p className="text-xs text-slate-700 italic mt-0.5">{order.deliveryNotes}</p>
                        </div>
                      )}

                      {/* Shipper assigned */}
                      <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Shipper:</span>
                        <span className="font-extrabold text-slate-900">
                          {order.deliveryStaffName || 'Chưa phân công'} {order.deliveryStaffPhone && `(${order.deliveryStaffPhone})`}
                        </span>
                      </div>
                    </div>

                    {/* Column 3: Payment & COD Collection + Quick Actions */}
                    <div className="space-y-3 flex flex-col justify-between">
                      {/* COD Collection Card */}
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-baseline text-xs">
                          <span className="text-slate-500">Tổng giá trị đơn:</span>
                          <span className="font-extrabold text-slate-800">{formatVND(order.totalAmount)}</span>
                        </div>

                        {order.prepaidAmount && order.prepaidAmount > 0 ? (
                          <div className="flex justify-between items-baseline text-xs text-slate-500">
                            <span>Khách đã cọc trước:</span>
                            <span className="font-bold text-emerald-700">-{formatVND(order.prepaidAmount)}</span>
                          </div>
                        ) : null}

                        <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700">Số tiền cần thu COD:</span>
                          <span
                            className={`text-base font-black ${
                              (order.remainingAmount || 0) > 0 ? 'text-rose-700' : 'text-emerald-700'
                            }`}
                          >
                            {(order.remainingAmount || 0) > 0 ? formatVND(order.remainingAmount || 0) : '0 đ (Đã thanh toán)'}
                          </span>
                        </div>
                      </div>

                      {/* Quick 1-Tap Action Buttons for Shipper */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 no-print">
                        {order.status === 'pending' || order.status === 'pending_pickup' ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenStatusModal(order, 'delivering');
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-xs transition-all"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Bắt đầu đi giao</span>
                          </button>
                        ) : order.status === 'delivering' || order.status === 'in_transit' ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenStatusModal(order, 'delivered');
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-xs transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Giao thành công</span>
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenStatusModal(order);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl border border-slate-200 transition-colors"
                        >
                          Cập nhật trạng thái
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectOrderForSlip(order);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-2.5 py-2 rounded-xl border border-slate-200 transition-colors"
                          title="In phiếu giao hàng"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCheckedOrderIdsForBatch([order.id]);
                            setBatchModalInitialTrip(null);
                            setIsBatchModalOpen(true);
                          }}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs px-2.5 py-2 rounded-xl border border-indigo-200 transition-colors flex items-center space-x-1"
                          title="Ghép đơn này vào chuyến giao hàng đa điểm"
                        >
                          <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="hidden sm:inline">Ghép đơn</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectOrderForDetail(order);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-2.5 py-2 rounded-xl border border-slate-200 transition-colors"
                          title="Xem chi tiết đầy đủ đơn hàng"
                        >
                          Chi tiết →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FLOATING ACTION BAR: Khi tích chọn 1 hoặc nhiều đơn */}
        {checkedOrderIdsForBatch.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 max-w-xl w-[92vw] animate-in slide-in-from-bottom-4">
            <div className="flex items-center space-x-2 text-xs">
              <span className="w-6 h-6 rounded-full bg-blue-500 text-white font-black flex items-center justify-center text-xs shadow-xs">
                {checkedOrderIdsForBatch.length}
              </span>
              <span className="font-bold">Đã chọn {checkedOrderIdsForBatch.length} đơn hàng</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleOpenBatchWithSelected}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center space-x-1.5 transition-transform active:scale-95"
              >
                <Truck className="w-4 h-4 text-slate-950" />
                <span>Ghép thành chuyến giao</span>
              </button>

              <button
                type="button"
                onClick={() => setCheckedOrderIdsForBatch([])}
                className="text-xs text-slate-400 hover:text-white font-semibold px-2 py-1"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Status Update Modal for Shipper */}
      {statusUpdateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-base">Cập Nhật Trạng Thái Giao Hàng</h3>
              </div>
              <button
                onClick={() => setStatusUpdateTarget(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStatusModal} className="p-6 space-y-4 text-xs">
              {/* Order summary */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="font-mono font-bold text-blue-700">{statusUpdateTarget.orderCode}</span>
                  <p className="font-extrabold text-slate-900 text-sm">{statusUpdateTarget.customerName}</p>
                  <p className="text-slate-500">{statusUpdateTarget.deliveryAddress}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400">Cần thu COD</span>
                  <p className="text-sm font-black text-rose-700">
                    {formatVND(statusUpdateTarget.remainingAmount || 0)}
                  </p>
                </div>
              </div>

              {/* Status choice */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Chọn trạng thái vận chuyển mới:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStatusChoice('in_transit')}
                    className={`p-2.5 rounded-xl font-bold border text-left flex items-center space-x-2 transition-all ${
                      newStatusChoice === 'in_transit' || newStatusChoice === 'delivering'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    <span>Đang giao hàng</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewStatusChoice('delivered')}
                    className={`p-2.5 rounded-xl font-bold border text-left flex items-center space-x-2 transition-all ${
                      newStatusChoice === 'delivered' || newStatusChoice === 'completed'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Giao thành công</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewStatusChoice('pending_pickup')}
                    className={`p-2.5 rounded-xl font-bold border text-left flex items-center space-x-2 transition-all ${
                      newStatusChoice === 'pending_pickup' || newStatusChoice === 'pending'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Chờ lấy hàng</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewStatusChoice('failed')}
                    className={`p-2.5 rounded-xl font-bold border text-left flex items-center space-x-2 transition-all ${
                      newStatusChoice === 'failed' || newStatusChoice === 'cancelled'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Giao thất bại / Hoãn</span>
                  </button>
                </div>
              </div>

              {/* Shipper selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Shipper thực hiện giao đơn này:</label>
                <select
                  value={assignedShipperId}
                  onChange={(e) => setAssignedShipperId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {deliveryStaffList.map((s) => (
                    <option key={s.id} value={s.employeeId}>
                      {s.employeeName} ({s.employeeId} - SĐT: {s.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Note input */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú của Shipper / Lý do:</label>
                <textarea
                  rows={2}
                  placeholder="VD: Đã giao xong và nhận tiền đủ, khách hẹn lại 16h chiều, khách đang họp..."
                  value={shipperNoteInput}
                  onChange={(e) => setShipperNoteInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStatusUpdateTarget(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl transition-colors shadow-xs"
                >
                  Lưu cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add & Manage Departure Locations */}
      <DepartureLocationModal
        isOpen={isDepartureModalOpen}
        onClose={() => setIsDepartureModalOpen(false)}
        initialMode={departureModalMode}
        onLocationsUpdated={(list) => {
          setDepartureLocations(list);
        }}
        onLocationSelected={(loc) => {
          setSelectedDepartureId(loc.id);
          setActiveDepartureLocation(loc.id);
          setIsDepartureModalOpen(false);
        }}
      />

      {/* Modal: Ghép đơn giao hàng (Multi-Stop Trip Dispatcher) */}
      <DeliveryBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => {
          setIsBatchModalOpen(false);
          setCheckedOrderIdsForBatch([]);
          setBatchModalInitialTrip(null);
        }}
        preselectedOrderIds={checkedOrderIdsForBatch}
        initialTrip={batchModalInitialTrip}
        onTripUpdated={() => {
          refreshDeliveryTrips();
        }}
      />

      {/* FEEDBACK TOAST NOTICE */}
      {tripNoticeMessage && (
        <div className="fixed bottom-6 right-6 z-60 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs flex items-center space-x-3 animate-in slide-in-from-bottom-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-semibold">{tripNoticeMessage}</span>
          <button
            onClick={() => setTripNoticeMessage(null)}
            className="text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* IN-APP CONFIRMATION MODAL FOR DELETING TRIP */}
      {tripToDelete && (
        <div className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-slate-900">
                  Xác nhận xóa lộ trình chuyến giao hàng
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Mã lộ trình: <strong className="text-rose-600 font-mono text-sm">{tripToDelete.tripCode}</strong>
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 leading-relaxed">
              Bạn có chắc chắn muốn xóa hoàn toàn lộ trình chuyến này không? Chuyến đang gồm{' '}
              <strong>{tripToDelete.orderCount} đơn hàng ghép</strong>.
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <label className="flex items-start space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={revertOrdersOnDelete}
                  onChange={(e) => setRevertOrdersOnDelete(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-700 font-medium">
                  <strong>Hoàn lại các đơn hàng về trạng thái "Chờ giao"</strong> để bạn có thể sắp xếp hoặc ghép vào các chuyến khác sau này (khuyên dùng).
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingTrip}
                onClick={() => setTripToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingTrip}
                onClick={handleConfirmDeleteTrip}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingTrip ? 'Đang xóa...' : 'Xác nhận xóa lộ trình'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT TỪNG NGÃ RẼ TRÊN LỘ TRÌNH (TURN-BY-TURN INSTRUCTIONS) */}
      {showTurnListModal && multiStopRoadRoute && (
        <div className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                  <Navigation2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">
                    Chi Tiết Từng Ngã Rẽ Trên Lộ Trình
                  </h3>
                  <p className="text-[11px] text-blue-200">
                    Tổng cự ly thực tế: <strong>{multiStopRoadRoute.distanceKm} km</strong> · Thời gian dự kiến: <strong>~{multiStopRoadRoute.durationMinutes} phút</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowTurnListModal(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50">
              {multiStopRoadRoute.steps.map((st, idx) => {
                const isLegHeader = st.instruction.startsWith('Chặng');
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs transition-all flex items-start space-x-3 ${
                      isLegHeader
                        ? 'bg-blue-900 text-white border-blue-700 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-800 hover:border-blue-300'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {isLegHeader ? (
                        <span className="w-6 h-6 rounded-full bg-blue-700 border border-blue-400 flex items-center justify-center font-black text-[10px] text-white">
                          🏁
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-blue-600 font-mono font-bold text-[10px] flex items-center justify-center border border-slate-300">
                          {idx + 1}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`leading-relaxed ${isLegHeader ? 'font-black text-sm' : 'font-semibold'}`}>
                        {st.instruction}
                      </p>
                      {!isLegHeader && st.distanceMeters > 0 && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Đoạn này: {st.distanceMeters >= 1000 ? `${(st.distanceMeters / 1000).toFixed(1)} km` : `${st.distanceMeters} m`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 border-t border-slate-200 bg-white flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowTurnListModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

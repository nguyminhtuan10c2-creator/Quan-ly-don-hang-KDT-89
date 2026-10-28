import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Truck,
  MapPin,
  Calendar,
  Clock,
  Phone,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Printer,
  ChevronDown,
  Layers,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  User,
  ShoppingBag,
  DollarSign,
  Compass,
  Check,
  FileText,
  Route,
  ArrowUpDown,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Building2,
  Share2,
  ListOrdered,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Order, Staff, DepartureLocation, DeliveryTrip } from '../types';
import {
  formatVND,
  formatDateVI,
  formatDateTimeVI,
  getOrderStatusLabel,
  getStaff,
  getOrders,
  getActiveDepartureLocation,
  getDepartureLocations,
  calculateDistanceKm,
  estimateTravelTimeMinutes,
  optimizeDeliveryRouteSequence,
  getMultiStopGoogleMapsUrl,
  fetchMultiStopRealRoadRoute,
  getDeliveryTrips,
  saveDeliveryTrip,
  deleteDeliveryTrip,
  updateDeliveryTripStatus,
  getNextTripCode,
  RealRoadRoute,
} from '../services/storageService';
import { resolveCoordinatesFromAddress } from '../services/geocodingService';
import { deleteTripFromFirebase } from '../services/firebaseService';

// Custom icons for modal map
const createBatchStoreDivIcon = (name: string = 'Kho') => {
  return L.divIcon({
    className: 'custom-batch-store-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background: #1e3a8a; color: #ffffff; padding: 3px 8px; border-radius: 9999px; font-weight: 800; font-size: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.4); border: 1.5px solid #60a5fa; white-space: nowrap;">
          🏢 ${name}
        </div>
        <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid #1e3a8a;"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -28],
  });
};

const createBatchStopDivIcon = (stopNum: number) => {
  return L.divIcon({
    className: 'custom-batch-stop-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background: #2563eb; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; font-weight: 900; font-size: 11px; box-shadow: 0 3px 8px rgba(0,0,0,0.35); border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center;">
          ${stopNum}
        </div>
        <div style="width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 5px solid #2563eb;"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -26],
  });
};

function BatchMapRecenter({
  originPos,
  stops,
  routeCoords,
}: {
  originPos: [number, number];
  stops: Array<{ lat: number; lng: number }>;
  routeCoords?: [number, number][];
}) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    map.invalidateSize();
    if (routeCoords && routeCoords.length > 1) {
      try {
        const bounds = L.latLngBounds(routeCoords);
        if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.12), { padding: [30, 30], maxZoom: 15 });
          return;
        }
      } catch {}
    }
    const points: [number, number][] = [originPos, ...stops.map((s) => [s.lat, s.lng] as [number, number])];
    if (points.length > 1) {
      try {
        const bounds = L.latLngBounds(points);
        if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.15), { padding: [30, 30], maxZoom: 15 });
        }
      } catch {}
    }
  }, [map, originPos, stops, routeCoords]);
  return null;
}

interface DeliveryBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedOrderIds?: string[];
  initialTrip?: DeliveryTrip | null;
  onTripUpdated?: () => void;
}

export const DeliveryBatchModal: React.FC<DeliveryBatchModalProps> = ({
  isOpen,
  onClose,
  preselectedOrderIds = [],
  initialTrip = null,
  onTripUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'tripsList' | 'print'>('create');
  const [orders, setOrders] = useState<Order[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [departureLocations, setDepartureLocations] = useState<DepartureLocation[]>([]);
  const [allTrips, setAllTrips] = useState<DeliveryTrip[]>([]);

  // Form State for creating / editing trip
  const [tripId, setTripId] = useState<string | null>(null);
  const [tripCode, setTripCode] = useState<string>('');
  const [selectedDepartureId, setSelectedDepartureId] = useState<string>('');
  const [selectedShipperId, setSelectedShipperId] = useState<string>('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [orderedStops, setOrderedStops] = useState<Order[]>([]);
  const [tripNotes, setTripNotes] = useState<string>('');
  const [tripStatus, setTripStatus] = useState<DeliveryTrip['status']>('planning');

  // Preview route data
  const [roadRoute, setRoadRoute] = useState<RealRoadRoute | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false);
  const [showTurnDetails, setShowTurnDetails] = useState<boolean>(false);

  // Active trip for printing
  const [printTrip, setPrintTrip] = useState<DeliveryTrip | null>(null);

  // In-app Trip Deletion Modal State (No window.confirm!)
  const [tripToDelete, setTripToDelete] = useState<{ id: string; tripCode: string; orderCount: number } | null>(null);
  const [revertOrdersOnDelete, setRevertOrdersOnDelete] = useState<boolean>(true);
  const [isDeletingTrip, setIsDeletingTrip] = useState<boolean>(false);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Auto dismiss feedback toast
  useEffect(() => {
    if (feedbackToast) {
      const timer = setTimeout(() => setFeedbackToast(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [feedbackToast]);

  // Load initial datasets
  useEffect(() => {
    if (isOpen) {
      const ords = getOrders();
      const stf = getStaff();
      const deps = getDepartureLocations();
      const activeDep = getActiveDepartureLocation();
      const trips = getDeliveryTrips();

      setOrders(ords);
      setStaffList(stf);
      setDepartureLocations(deps);
      setAllTrips(trips);

      if (initialTrip) {
        // Editing existing trip
        setTripId(initialTrip.id);
        setTripCode(initialTrip.tripCode);
        setSelectedDepartureId(initialTrip.departureLocationId || activeDep.id);
        setSelectedShipperId(initialTrip.shipperId || '');
        setSelectedOrderIds(initialTrip.orderIds);
        setTripNotes(initialTrip.notes || '');
        setTripStatus(initialTrip.status);

        // Map orderIds to actual Order objects in stop order
        const stops = initialTrip.orderIds
          .map((id) => ords.find((o) => o.id === id))
          .filter((o): o is Order => !!o);
        setOrderedStops(stops);
        setActiveTab('create');
      } else {
        // New trip
        setTripId(null);
        setTripCode(getNextTripCode());
        setSelectedDepartureId(activeDep.id);

        // Pre-select shipper from first preselected order if available
        let defaultShipperId = '';
        if (preselectedOrderIds.length > 0) {
          const firstOrd = ords.find((o) => o.id === preselectedOrderIds[0]);
          if (firstOrd?.deliveryStaffId) {
            defaultShipperId = firstOrd.deliveryStaffId;
          }
        }
        if (!defaultShipperId) {
          const defaultDriver = stf.find((s) => s.role === 'Delivery') || stf[0];
          defaultShipperId = defaultDriver ? defaultDriver.employeeId : '';
        }
        setSelectedShipperId(defaultShipperId);

        const initialSelected = preselectedOrderIds.length > 0 ? preselectedOrderIds : [];
        setSelectedOrderIds(initialSelected);

        const stops = initialSelected
          .map((id) => ords.find((o) => o.id === id))
          .filter((o): o is Order => !!o);
        setOrderedStops(stops);
        setTripNotes('');
        setTripStatus('planning');
        setActiveTab('create');
      }
    }
  }, [isOpen, initialTrip, preselectedOrderIds]);

  // Current active warehouse location
  const currentDeparture = useMemo(() => {
    return (
      departureLocations.find((l) => l.id === selectedDepartureId) ||
      departureLocations.find((l) => l.isDefault) ||
      departureLocations[0] || {
        id: 'dep-default',
        name: 'KHO CHÍNH (KDC HIỆP ÂN - QUẬN 8)',
        address: '89 Đường Số 1, Khu Dân Cư Hiệp Ân, Phường 5, Quận 8, TP. Hồ Chí Minh',
        lat: 10.7418,
        lng: 106.6722,
      }
    );
  }, [departureLocations, selectedDepartureId]);

  // Current selected shipper
  const currentShipper = useMemo(() => {
    return staffList.find((s) => s.employeeId === selectedShipperId);
  }, [staffList, selectedShipperId]);

  // Available orders for bundling (undelivered or already in this trip)
  const availableOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        selectedOrderIds.includes(o.id) ||
        o.status === 'pending' ||
        o.status === 'pending_pickup' ||
        o.status === 'delivering' ||
        o.status === 'in_transit'
    );
  }, [orders, selectedOrderIds]);

  // Sync orderedStops when selectedOrderIds change
  const handleToggleOrderSelection = (orderId: string) => {
    if (selectedOrderIds.includes(orderId)) {
      // Remove
      setSelectedOrderIds((prev) => prev.filter((id) => id !== orderId));
      setOrderedStops((prev) => prev.filter((o) => o.id !== orderId));
    } else {
      // Add
      const ord = orders.find((o) => o.id === orderId);
      if (ord) {
        setSelectedOrderIds((prev) => [...prev, orderId]);
        setOrderedStops((prev) => [...prev, ord]);
      }
    }
  };

  // Reorder stops up
  const handleMoveStopUp = (index: number) => {
    if (index <= 0) return;
    setOrderedStops((prev) => {
      const updated = [...prev];
      const temp = updated[index - 1];
      updated[index - 1] = updated[index];
      updated[index] = temp;
      setSelectedOrderIds(updated.map((o) => o.id));
      return updated;
    });
  };

  // Reorder stops down
  const handleMoveStopDown = (index: number) => {
    if (index >= orderedStops.length - 1) return;
    setOrderedStops((prev) => {
      const updated = [...prev];
      const temp = updated[index + 1];
      updated[index + 1] = updated[index];
      updated[index] = temp;
      setSelectedOrderIds(updated.map((o) => o.id));
      return updated;
    });
  };

  // Auto-optimize stops with TSP (Nearest Neighbor from current warehouse)
  const handleOptimizeStops = () => {
    if (orderedStops.length <= 1) return;
    const warehousePos: [number, number] = [currentDeparture.lat, currentDeparture.lng];
    const optimized = optimizeDeliveryRouteSequence(warehousePos, orderedStops);
    setOrderedStops(optimized);
    setSelectedOrderIds(optimized.map((o) => o.id));
  };

  const getSafeStopCoords = (ord: Order): { lat: number; lng: number } => {
    const addr = (ord.deliveryAddress || '').toLowerCase();
    const isQ7 = addr.includes('phú thuận') || addr.includes('phu thuan') || addr.includes('q7') || addr.includes('quận 7') || addr.includes('q.7');
    if (isQ7) {
      if (!ord.deliveryLat || ord.deliveryLat > 10.765) {
        const res = resolveCoordinatesFromAddress(ord.deliveryAddress);
        return { lat: res ? res.lat : 10.7295, lng: res ? res.lng : 106.7350 };
      }
    }
    if (ord.deliveryLat && ord.deliveryLng) {
      return { lat: ord.deliveryLat, lng: ord.deliveryLng };
    }
    const res = resolveCoordinatesFromAddress(ord.deliveryAddress);
    return { lat: res ? res.lat : 10.7418, lng: res ? res.lng : 106.6722 };
  };

  // Trip metrics calculation
  const tripMetrics = useMemo(() => {
    let totalCod = 0;
    let totalItems = 0;

    orderedStops.forEach((o) => {
      totalCod += o.remainingAmount || 0;
      (o.items || []).forEach((it) => {
        totalItems += it.quantity || 1;
      });
    });

    let totalDistKm = 0;
    let currentLat = currentDeparture.lat;
    let currentLng = currentDeparture.lng;

    orderedStops.forEach((stop) => {
      const coords = getSafeStopCoords(stop);
      totalDistKm += calculateDistanceKm(currentLat, currentLng, coords.lat, coords.lng);
      currentLat = coords.lat;
      currentLng = coords.lng;
    });

    const totalDurationMins = estimateTravelTimeMinutes(totalDistKm) + orderedStops.length * 10; // 10 mins delivery per stop

    return {
      totalOrders: orderedStops.length,
      totalCod,
      totalItems,
      totalDistKm: Number(totalDistKm.toFixed(1)),
      totalDurationMins,
    };
  }, [orderedStops, currentDeparture]);

  // Fetch real road route preview when stops change
  useEffect(() => {
    let isMounted = true;
    if (orderedStops.length > 0) {
      setIsLoadingRoute(true);
      const stopsPayload = orderedStops.map((s, idx) => {
        const coords = getSafeStopCoords(s);
        return {
          lat: coords.lat,
          lng: coords.lng,
          label: `Điểm ${idx + 1} (${s.orderCode})`,
        };
      });

      fetchMultiStopRealRoadRoute(currentDeparture.lat, currentDeparture.lng, stopsPayload)
        .then((route) => {
          if (isMounted) {
            setRoadRoute(route);
            setIsLoadingRoute(false);
          }
        })
        .catch(() => {
          if (isMounted) setIsLoadingRoute(false);
        });
    } else {
      setRoadRoute(null);
    }

    return () => {
      isMounted = false;
    };
  }, [orderedStops, currentDeparture]);

  // Multi-stop Google Maps URL
  const googleMapsUrl = useMemo(() => {
    if (orderedStops.length === 0) return '';
    const stopsCoords = orderedStops.map((s) => getSafeStopCoords(s));
    return getMultiStopGoogleMapsUrl(currentDeparture.lat, currentDeparture.lng, stopsCoords);
  }, [orderedStops, currentDeparture]);

  // Save or Update Trip
  const handleSaveTrip = (startDelivery: boolean = false) => {
    if (orderedStops.length === 0) {
      setFeedbackToast({
        type: 'warning',
        message: 'Vui lòng chọn ít nhất 1 đơn hàng để ghép chuyến.',
      });
      return;
    }

    const newStatus: DeliveryTrip['status'] = startDelivery ? 'in_transit' : tripStatus;

    const saved = saveDeliveryTrip({
      id: tripId || undefined,
      tripCode: tripCode || undefined,
      departureLocationId: currentDeparture.id,
      departureLocationName: currentDeparture.name,
      departureAddress: currentDeparture.address,
      departureLat: currentDeparture.lat,
      departureLng: currentDeparture.lng,
      shipperId: currentShipper?.employeeId,
      shipperName: currentShipper?.employeeName,
      shipperPhone: currentShipper?.phone,
      orderIds: orderedStops.map((o) => o.id),
      status: newStatus,
      totalDistanceKm: roadRoute?.distanceKm || tripMetrics.totalDistKm,
      totalDurationMins: roadRoute?.durationMinutes || tripMetrics.totalDurationMins,
      totalCodAmount: tripMetrics.totalCod,
      totalItemsCount: tripMetrics.totalItems,
      notes: tripNotes,
    });

    if (startDelivery) {
      updateDeliveryTripStatus(saved.id, 'in_transit');
    }

    // Refresh lists
    setAllTrips(getDeliveryTrips());
    setOrders(getOrders());
    if (onTripUpdated) onTripUpdated();

    setFeedbackToast({
      type: 'success',
      message: startDelivery
        ? `Đã tạo & bắt đầu chuyến giao ${saved.tripCode}! Tất cả ${saved.orderIds.length} đơn đã chuyển sang trạng thái Đang giao.`
        : `Đã lưu lộ trình chuyến giao hàng ${saved.tripCode} thành công!`,
    });

    setActiveTab('tripsList');
  };

  // Request Delete trip (opens in-app modal)
  const handleRequestDeleteTrip = (id: string, code: string, orderCount: number) => {
    setTripToDelete({ id, tripCode: code, orderCount });
  };

  // Execute actual deletion of trip
  const handleConfirmDeleteTrip = async () => {
    if (!tripToDelete) return;
    setIsDeletingTrip(true);
    try {
      const result = deleteDeliveryTrip(tripToDelete.id, revertOrdersOnDelete);
      await deleteTripFromFirebase(tripToDelete.id);

      setAllTrips(getDeliveryTrips());
      setOrders(getOrders());
      if (onTripUpdated) onTripUpdated();

      // If user was currently editing this trip, reset form and go to tripsList
      if (tripId === tripToDelete.id) {
        setTripId(null);
        setTripCode(getNextTripCode());
        setSelectedOrderIds([]);
        setOrderedStops([]);
        setActiveTab('tripsList');
      }

      setFeedbackToast({
        type: 'success',
        message: `Đã xóa thành công lộ trình chuyến [${tripToDelete.tripCode}]! ${
          result.revertedCount > 0 ? `Đã hoàn lại ${result.revertedCount} đơn về trạng thái Chờ giao.` : ''
        }`,
      });
      setTripToDelete(null);
    } catch (err) {
      console.error('Error deleting trip', err);
      setFeedbackToast({
        type: 'warning',
        message: 'Có lỗi xảy ra khi xóa lộ trình. Vui lòng thử lại.',
      });
    } finally {
      setIsDeletingTrip(false);
    }
  };

  // Handle open print preview
  const handleOpenPrint = (trip: DeliveryTrip) => {
    setPrintTrip(trip);
    setActiveTab('print');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black tracking-tight">GHÉP ĐƠN GIAO HÀNG (ĐIỀU VẬN ĐA ĐIỂM)</h2>
                <span className="bg-blue-400/20 border border-blue-300/30 text-blue-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  Kho 89 Hiệp Ân Q8
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5">
                Gộp nhiều đơn cho 1 shipper chạy từ kho qua Điểm 1 → Điểm 2 → Điểm N và tối ưu hóa đường đi ngắn nhất
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL NAVIGATION TABS */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2.5 font-bold text-sm border-b-2 flex items-center space-x-2 transition-all ${
              activeTab === 'create'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{tripId ? 'Chỉnh sửa chuyến ghép' : 'Tạo chuyến ghép đơn mới'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tripsList')}
            className={`px-4 py-2.5 font-bold text-sm border-b-2 flex items-center space-x-2 transition-all ${
              activeTab === 'tripsList'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Danh sách chuyến ghép ({allTrips.length})</span>
          </button>

          {printTrip && (
            <button
              type="button"
              onClick={() => setActiveTab('print')}
              className={`px-4 py-2.5 font-bold text-sm border-b-2 flex items-center space-x-2 transition-all ${
                activeTab === 'print'
                  ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Bảng kê điều vận ({printTrip.tripCode})</span>
            </button>
          )}
        </div>

        {/* ========================================================= */}
        {/* TAB 1: TẠO HOẶC CHỈNH SỬA CHUYẾN GHÉP ĐƠN */}
        {/* ========================================================= */}
        {activeTab === 'create' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Hướng dẫn nguyên lý chặng 1 2 3 */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3 text-amber-900 text-xs sm:text-sm">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950">
                  💡 Quy trình ghép đơn giao hàng đa điểm (Multi-Stop Trip):
                </p>
                <p className="mt-1 text-amber-800 leading-relaxed">
                  Shipper xuất phát từ <strong>Kho bên anh ({currentDeparture.name})</strong> → tới{' '}
                  <strong>Điểm dừng 1 (Đơn 1)</strong> → tiếp tục tới <strong>Điểm dừng 2 (Đơn 2)</strong> → các
                  điểm tiếp theo. Hệ thống tự tính toán tổng quãng đường (km), tiền COD cần thu và hỗ trợ mở Google
                  Maps dẫn đường liên hoàn 1 chạm cho Shipper.
                </p>
              </div>
            </div>

            {/* Config: Mã chuyến, Kho xuất phát & Shipper */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {/* Mã chuyến */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Mã chuyến ghép:
                  </label>
                  {tripId && (
                    <button
                      type="button"
                      onClick={() => handleRequestDeleteTrip(tripId, tripCode, orderedStops.length)}
                      className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center space-x-1 transition-colors"
                      title="Xóa lộ trình chuyến này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa lộ trình này</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={tripCode}
                  onChange={(e) => setTripCode(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-black text-slate-900 focus:ring-2 focus:ring-blue-500"
                  placeholder="CG-202610-001"
                />
              </div>

              {/* Điểm xuất phát (Kho) */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Kho xuất phát:</span>
                  <span className="text-[10px] text-blue-600 font-semibold">Chặng 0</span>
                </label>
                <select
                  value={selectedDepartureId}
                  onChange={(e) => setSelectedDepartureId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                >
                  {departureLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.isDefault ? '(Mặc định)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1 truncate" title={currentDeparture.address}>
                  📍 {currentDeparture.address}
                </p>
              </div>

              {/* Shipper */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Shipper phụ trách chuyến:
                </label>
                <select
                  value={selectedShipperId}
                  onChange={(e) => setSelectedShipperId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chưa chỉ định Shipper --</option>
                  {staffList.map((st) => (
                    <option key={st.id} value={st.employeeId}>
                      {st.employeeName} ({st.employeeId}) - {st.role === 'Delivery' ? 'Giao hàng' : st.role}
                    </option>
                  ))}
                </select>
                {currentShipper && (
                  <p className="text-[11px] text-emerald-600 mt-1 flex items-center space-x-1">
                    <Phone className="w-3 h-3" />
                    <span>SĐT: {currentShipper.phone}</span>
                  </p>
                )}
              </div>
            </div>

            {/* 2 Cột: Chọn đơn ghép & Thứ tự chặng dừng */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* CỘT TRÁI: DANH SÁCH ĐƠN HÀNG SẴN SÀNG GHÉP (5 Cột) */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-800 flex items-center space-x-2">
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                    <span>1. Chọn đơn đưa vào chuyến ({selectedOrderIds.length} đã chọn)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedOrderIds.length === availableOrders.length) {
                        setSelectedOrderIds([]);
                        setOrderedStops([]);
                      } else {
                        const allIds = availableOrders.map((o) => o.id);
                        setSelectedOrderIds(allIds);
                        setOrderedStops([...availableOrders]);
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold"
                  >
                    {selectedOrderIds.length === availableOrders.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                  </button>
                </div>

                <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                  {availableOrders.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Không có đơn hàng nào chờ giao trong danh sách.
                    </div>
                  ) : (
                    availableOrders.map((ord) => {
                      const isSelected = selectedOrderIds.includes(ord.id);
                      return (
                        <div
                          key={ord.id}
                          onClick={() => handleToggleOrderSelection(ord.id)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-50 border-blue-400 shadow-xs ring-1 ring-blue-400'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // handled by div click
                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                              />
                              <span className="font-black text-slate-900">{ord.orderCode}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                  ord.status === 'delivering' || ord.status === 'in_transit'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {getOrderStatusLabel(ord.status)}
                              </span>
                            </div>
                            <span className="font-black text-emerald-600">
                              COD: {formatVND(ord.remainingAmount || 0)}
                            </span>
                          </div>

                          <div className="mt-1.5 space-y-0.5 pl-6">
                            <p className="font-bold text-slate-800">
                              👤 {ord.customerName} - 📞 {ord.customerPhone}
                            </p>
                            <p className="text-slate-600 text-[11px] truncate" title={ord.deliveryAddress}>
                              📍 {ord.deliveryAddress}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* CỘT PHẢI: THỨ TỰ CÁC CHẶNG DỪNG CỦA CHUYẾN (7 Cột) */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-800 flex items-center space-x-2">
                    <Route className="w-4 h-4 text-indigo-600" />
                    <span>2. Thứ tự lộ trình giao (Kho → Điểm 1 → Điểm 2...)</span>
                  </h3>

                  {orderedStops.length > 1 && (
                    <button
                      type="button"
                      onClick={handleOptimizeStops}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-2xs"
                      title="Tự động sắp xếp các điểm dừng theo quãng đường ngắn nhất từ kho"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Tối ưu thứ tự (TSP)</span>
                    </button>
                  )}
                </div>

                {/* Danh sách các chặng theo thứ tự */}
                <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                  {/* CHẶNG 0: KHO XUẤT PHÁT */}
                  <div className="p-3 rounded-xl bg-blue-900 text-white border border-blue-700 flex items-center justify-between shadow-xs">
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 rounded-full bg-blue-700 border border-blue-400 flex items-center justify-center font-black text-xs text-white">
                        KHO
                      </div>
                      <div>
                        <div className="font-bold text-xs flex items-center space-x-2">
                          <span>{currentDeparture.name}</span>
                          <span className="text-[10px] bg-blue-800 px-1.5 py-0.2 rounded text-blue-200">
                            Điểm xuất phát
                          </span>
                        </div>
                        <p className="text-[11px] text-blue-200 truncate max-w-[320px]">
                          {currentDeparture.address}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-blue-200">Km 0.0</span>
                  </div>

                  {/* CÁC ĐIỂM DỪNG TIẾP THEO (1, 2, 3...) */}
                  {orderedStops.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-300 rounded-xl bg-white">
                      Chưa có đơn hàng nào được chọn. Hãy tích chọn đơn bên trái để đưa vào chuyến này.
                    </div>
                  ) : (
                    orderedStops.map((stop, index) => {
                      return (
                        <div
                          key={stop.id}
                          className="p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-300 shadow-2xs flex items-center justify-between gap-2"
                        >
                          <div className="flex items-start space-x-3 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                              {index + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="font-black text-xs text-slate-900">{stop.orderCode}</span>
                                <span className="font-bold text-xs text-slate-800">· {stop.customerName}</span>
                                <span className="text-[11px] text-slate-500">({stop.customerPhone})</span>
                              </div>
                              <p className="text-[11px] text-slate-600 truncate mt-0.5" title={stop.deliveryAddress}>
                                📍 {stop.deliveryAddress}
                              </p>
                              <div className="flex items-center space-x-3 mt-1 text-[11px]">
                                <span className="font-bold text-emerald-600">
                                  Thu COD: {formatVND(stop.remainingAmount || 0)}
                                </span>
                                <span className="text-slate-400">·</span>
                                <span className="text-slate-600">
                                  Kiện hàng:{' '}
                                  {(stop.items || []).map((it) => `${it.productName} (x${it.quantity})`).join(', ')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Up / Down Controls */}
                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveStopUp(index)}
                              disabled={index === 0}
                              className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${
                                index === 0
                                  ? 'text-slate-300 border-slate-100 cursor-not-allowed'
                                  : 'text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                              title="Chuyển lên trước"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveStopDown(index)}
                              disabled={index === orderedStops.length - 1}
                              className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${
                                index === orderedStops.length - 1
                                  ? 'text-slate-300 border-slate-100 cursor-not-allowed'
                                  : 'text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                              title="Chuyển xuống sau"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* THỐNG KÊ TỔNG QUAN CHUYẾN */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-4 rounded-xl shadow-xs">
              <div>
                <p className="text-[11px] text-slate-300 font-bold uppercase">Tổng số đơn ghép:</p>
                <p className="text-xl font-black text-white mt-0.5">{tripMetrics.totalOrders} Đơn</p>
                <p className="text-[10px] text-blue-300">({tripMetrics.totalItems} sản phẩm)</p>
              </div>

              <div>
                <p className="text-[11px] text-slate-300 font-bold uppercase">Tổng quãng đường:</p>
                <p className="text-xl font-black text-amber-400 mt-0.5">
                  ~{roadRoute ? roadRoute.distanceKm : tripMetrics.totalDistKm} km
                </p>
                <p className="text-[10px] text-amber-200">
                  {roadRoute ? 'Lộ trình đường bộ OSRM' : 'Đường thẳng dự tính'}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-300 font-bold uppercase">Ước tính thời gian:</p>
                <p className="text-xl font-black text-cyan-300 mt-0.5">
                  ~{roadRoute ? roadRoute.durationMinutes : tripMetrics.totalDurationMins} phút
                </p>
                <p className="text-[10px] text-cyan-200">(Bao gồm thời gian giao)</p>
              </div>

              <div>
                <p className="text-[11px] text-slate-300 font-bold uppercase">Tổng tiền COD cần thu:</p>
                <p className="text-xl font-black text-emerald-400 mt-0.5">
                  {formatVND(tripMetrics.totalCod)}
                </p>
                <p className="text-[10px] text-emerald-200">Shipper nộp lại quỹ</p>
              </div>
            </div>

            {/* BẢN ĐỒ LỘ TRÌNH NGÃ RẼ ĐƯỜNG BỘ NGAY TRONG MODAL */}
            {orderedStops.length > 0 && (
              <div className="bg-white rounded-2xl border-2 border-indigo-200 overflow-hidden shadow-xs space-y-0">
                <div className="p-3 bg-gradient-to-r from-blue-900 to-indigo-950 text-white flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <Route className="w-4 h-4 text-amber-400" />
                    <span className="font-extrabold text-sm">
                      Bản đồ Lộ Trình & Ngã Rẽ Thực Tế (Kho Q8 ➔ {orderedStops.length} điểm dừng)
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      isLoadingRoute
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                    }`}>
                      {isLoadingRoute ? 'Đang vẽ ngã rẽ...' : 'Bám sát mạng lưới đường bộ OSRM'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowTurnDetails(!showTurnDetails)}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-blue-200 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors border border-white/20"
                    >
                      <ListOrdered className="w-3.5 h-3.5 text-amber-300" />
                      <span>{showTurnDetails ? 'Ẩn danh sách ngã rẽ' : `Xem chi tiết ngã rẽ (${roadRoute?.steps?.length || 0})`}</span>
                    </button>
                  </div>
                </div>

                <div className="h-[280px] w-full relative z-0">
                  <MapContainer
                    center={[currentDeparture.lat, currentDeparture.lng]}
                    zoom={13}
                    scrollWheelZoom={false}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <TileLayer
                      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />

                    <BatchMapRecenter
                      originPos={[currentDeparture.lat, currentDeparture.lng]}
                      stops={orderedStops.map((s) => getSafeStopCoords(s))}
                      routeCoords={roadRoute?.coordinates}
                    />

                    {/* Marker Kho */}
                    <Marker
                      position={[currentDeparture.lat, currentDeparture.lng]}
                      icon={createBatchStoreDivIcon(currentDeparture.name)}
                    >
                      <Popup>
                        <div className="p-1 text-xs">
                          <strong>🏢 {currentDeparture.name}</strong>
                          <p className="text-[11px] text-slate-500">{currentDeparture.address}</p>
                          <p className="text-[10px] text-blue-600 font-bold">Điểm xuất phát (Km 0.0)</p>
                        </div>
                      </Popup>
                    </Marker>

                    {/* Markers Điểm dừng */}
                    {orderedStops.map((stop, idx) => {
                      const coords = getSafeStopCoords(stop);
                      return (
                        <Marker
                          key={stop.id}
                          position={[coords.lat, coords.lng]}
                          icon={createBatchStopDivIcon(idx + 1)}
                        >
                          <Popup>
                            <div className="p-1 text-xs">
                              <strong>Điểm dừng #{idx + 1}: {stop.orderCode}</strong>
                              <p className="text-slate-800 font-semibold">{stop.customerName} ({stop.customerPhone})</p>
                              <p className="text-[11px] text-slate-500">{stop.deliveryAddress}</p>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}

                    {/* Real Road Polyline with turns and curves */}
                    {roadRoute && roadRoute.coordinates.length > 0 && (
                      <>
                        <Polyline
                          positions={roadRoute.coordinates}
                          color="#60a5fa"
                          weight={9}
                          opacity={0.35}
                        />
                        <Polyline
                          positions={roadRoute.coordinates}
                          color="#1d4ed8"
                          weight={5}
                          opacity={0.95}
                        />
                      </>
                    )}
                  </MapContainer>
                </div>

                {/* Danh sách các ngã rẽ chi tiết (nếu người dùng bấm xem) */}
                {showTurnDetails && roadRoute && roadRoute.steps && (
                  <div className="p-3 bg-slate-50 border-t border-slate-200 max-h-[220px] overflow-y-auto space-y-1.5 text-xs">
                    <p className="font-bold text-slate-800 mb-1">
                      Chi tiết hướng dẫn ngã rẽ & lộ trình di chuyển:
                    </p>
                    {roadRoute.steps.map((st, sIdx) => {
                      const isLeg = st.instruction.startsWith('Chặng');
                      return (
                        <div
                          key={sIdx}
                          className={`p-2 rounded-lg flex items-start space-x-2.5 ${
                            isLeg
                              ? 'bg-blue-900 text-white font-black shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className={`font-mono text-[10px] mt-0.5 shrink-0 ${isLeg ? 'text-amber-300' : 'text-slate-400'}`}>
                            #{sIdx + 1}
                          </span>
                          <span className="flex-1 leading-relaxed">{st.instruction}</span>
                          {!isLeg && st.distanceMeters > 0 && (
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              {st.distanceMeters >= 1000 ? `${(st.distanceMeters / 1000).toFixed(1)} km` : `${st.distanceMeters} m`}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Ghi chú chuyến */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Ghi chú điều vận cho Shipper:
              </label>
              <textarea
                value={tripNotes}
                onChange={(e) => setTripNotes(e.target.value)}
                placeholder="Ví dụ: Đơn 1 giao trước 11h, Đơn 2 khách dặn gọi trước khi đến 15 phút..."
                rows={2}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: DANH SÁCH CÁC CHUYẾN GHÉP ĐÃ TẠO */}
        {/* ========================================================= */}
        {activeTab === 'tripsList' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">Danh Sách Các Chuyến Giao Hàng Ghép Đơn</h3>
                <p className="text-xs text-slate-500">
                  Quản lý các chuyến giao hàng multi-stop, theo dõi tiến độ và in bảng kê
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTripId(null);
                  setTripCode(getNextTripCode());
                  setSelectedOrderIds([]);
                  setOrderedStops([]);
                  setActiveTab('create');
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo chuyến mới</span>
              </button>
            </div>

            {allTrips.length === 0 ? (
              <div className="p-12 text-center text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <Truck className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-600 text-sm">Chưa có chuyến ghép đơn nào</p>
                <p className="text-xs text-slate-400 mt-1">
                  Bấm nút "Tạo chuyến mới" ở trên để gộp các đơn hàng cho Shipper đi giao
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {allTrips.map((t) => {
                  const tripOrders = (t.orderIds || [])
                    .map((id) => orders.find((o) => o.id === id))
                    .filter((o): o is Order => !!o);

                  const stopsCoords = tripOrders.map((o) => ({
                    lat: o.deliveryLat || 10.775,
                    lng: o.deliveryLng || 10.702,
                  }));
                  const gMapsUrl = getMultiStopGoogleMapsUrl(t.departureLat, t.departureLng, stopsCoords);

                  return (
                    <div
                      key={t.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center space-x-3">
                          <span className="font-black text-sm text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                            {t.tripCode}
                          </span>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                              t.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : t.status === 'in_transit'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {t.status === 'completed'
                              ? 'Đã hoàn tất'
                              : t.status === 'in_transit'
                              ? 'Đang trên đường giao'
                              : 'Kế hoạch chờ xuất kho'}
                          </span>
                          <span className="text-xs text-slate-500">
                            Tạo lúc: {formatDateTimeVI(t.createdAt)}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          {/* Google Maps link */}
                          <a
                            href={gMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-2xs"
                            title="Mở Google Maps dẫn đường cả chuyến"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Bản đồ lộ trình</span>
                          </a>

                          {/* Print Manifest */}
                          <button
                            type="button"
                            onClick={() => handleOpenPrint(t)}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center space-x-1"
                            title="In bảng kê điều vận cho Shipper"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>In bảng kê</span>
                          </button>

                          {/* Edit / View Details */}
                          <button
                            type="button"
                            onClick={() => {
                              setTripId(t.id);
                              setTripCode(t.tripCode);
                              setSelectedDepartureId(t.departureLocationId || '');
                              setSelectedShipperId(t.shipperId || '');
                              setSelectedOrderIds(t.orderIds);
                              setTripNotes(t.notes || '');
                              setTripStatus(t.status);
                              setOrderedStops(tripOrders);
                              setActiveTab('create');
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                          >
                            Sửa
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleRequestDeleteTrip(t.id, t.tripCode, t.orderIds.length)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors shadow-2xs"
                            title="Xóa / Hủy lộ trình chuyến này"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </div>

                      {/* Thông tin chuyến & danh sách đơn */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl">
                        <div>
                          <p className="text-slate-500 font-semibold">Kho xuất phát:</p>
                          <p className="font-bold text-slate-800">{t.departureLocationName}</p>
                          <p className="text-[11px] text-slate-500 truncate">{t.departureAddress}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 font-semibold">Shipper phụ trách:</p>
                          <p className="font-bold text-slate-800">
                            {t.shipperName || 'Chưa phân công'} {t.shipperPhone ? `(${t.shipperPhone})` : ''}
                          </p>
                          <p className="text-[11px] text-blue-600 font-bold">
                            Tổng {t.orderIds.length} đơn ghép · {t.totalDistanceKm} km
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 font-semibold">Tổng tiền COD thu hộ:</p>
                          <p className="font-black text-emerald-600 text-sm">
                            {formatVND(t.totalCodAmount || 0)}
                          </p>
                          {t.notes && <p className="text-[11px] text-slate-500 truncate">Note: {t.notes}</p>}
                        </div>
                      </div>

                      {/* Các điểm dừng cụ thể */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] font-bold text-slate-500 mr-1">Các chặng:</span>
                        <span className="text-[11px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                          Kho Q8
                        </span>
                        {tripOrders.map((ord, idx) => (
                          <React.Fragment key={ord.id}>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                              Điểm {idx + 1}: {ord.orderCode} ({ord.customerName})
                            </span>
                          </React.Fragment>
                        ))}
                      </div>

                      {/* Nút chuyển trạng thái nhanh */}
                      <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                        {t.status === 'planning' && (
                          <button
                            type="button"
                            onClick={() => {
                              updateDeliveryTripStatus(t.id, 'in_transit');
                              setAllTrips(getDeliveryTrips());
                              setOrders(getOrders());
                              if (onTripUpdated) onTripUpdated();
                            }}
                            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-2xs"
                          >
                            Bắt đầu giao chuyến này
                          </button>
                        )}
                        {t.status === 'in_transit' && (
                          <button
                            type="button"
                            onClick={() => {
                              updateDeliveryTripStatus(t.id, 'completed');
                              setAllTrips(getDeliveryTrips());
                              setOrders(getOrders());
                              if (onTripUpdated) onTripUpdated();
                              setFeedbackToast({
                                type: 'success',
                                message: `Đã đánh dấu hoàn thành tất cả đơn trong chuyến [${t.tripCode}]!`,
                              });
                            }}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs"
                          >
                            Đánh dấu đã hoàn thành toàn bộ chuyến
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: BẢNG KÊ ĐIỀU VẬN IN ẤN (TRIP MANIFEST PRINT) */}
        {/* ========================================================= */}
        {activeTab === 'print' && printTrip && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
            {/* Thanh công cụ in */}
            <div className="mb-4 flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 print:hidden shadow-xs">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xs text-slate-700">Chuyến: {printTrip.tripCode}</span>
                <span className="text-xs text-slate-500">({printTrip.orderIds.length} đơn hàng ghép)</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>In bảng kê này (A4)</span>
                </button>
              </div>
            </div>

            {/* VÙNG IN KHỔ A4 */}
            <div className="max-w-[800px] mx-auto bg-white p-8 sm:p-10 shadow-lg border border-slate-200 text-black font-sans text-xs leading-normal print:shadow-none print:border-none print:p-0">
              {/* Header phiếu in */}
              <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 border border-slate-300 rounded-lg p-1 flex items-center justify-center shrink-0">
                    <img
                      src="/assets/aistudio/logo_Cty_KDT-10_d91b9dae.png"
                      alt="Logo KDT"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="text-base font-black uppercase tracking-tight">KHO ĐIỆN MÁY KDT-89</h1>
                    <p className="text-[11px] text-slate-700">
                      89 Đường Số 1, KDC Hiệp Ân, Phường 5, Quận 8, TP. Hồ Chí Minh
                    </p>
                    <p className="text-[11px] text-slate-700">Hotline: 0909.888.777 · MST: 0318999888</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-black text-blue-900">{printTrip.tripCode}</p>
                  <p className="text-[11px] text-slate-600">Ngày in: {formatDateTimeVI(new Date().toISOString())}</p>
                </div>
              </div>

              {/* Tiêu đề bảng kê */}
              <div className="text-center my-4">
                <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">
                  BẢNG KÊ ĐIỀU VẬN - CHUYẾN GIAO HÀNG GHÉP ĐƠN
                </h2>
                <p className="text-xs text-slate-600 italic">
                  (Lộ trình giao hàng đa điểm: Kho xuất phát → Điểm 1 → Điểm 2 → ...)
                </p>
              </div>

              {/* Thông tin chuyến & Shipper */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-3 rounded-lg mb-4 text-xs">
                <div>
                  <p>
                    <strong className="text-slate-900">Kho xuất phát:</strong> {printTrip.departureLocationName}
                  </p>
                  <p className="text-slate-600 mt-0.5">{printTrip.departureAddress}</p>
                  <p className="mt-1">
                    <strong className="text-slate-900">Tổng chặng dừng:</strong> {printTrip.orderIds.length} Điểm
                  </p>
                </div>
                <div>
                  <p>
                    <strong className="text-slate-900">Shipper phụ trách:</strong>{' '}
                    {printTrip.shipperName || 'Chưa chỉ định'}
                  </p>
                  <p className="mt-0.5">
                    <strong className="text-slate-900">SĐT Shipper:</strong>{' '}
                    {printTrip.shipperPhone || '.....................'}
                  </p>
                  <p className="mt-1">
                    <strong className="text-slate-900">Tổng quãng đường dự tính:</strong>{' '}
                    {printTrip.totalDistanceKm} km
                  </p>
                </div>
              </div>

              {/* BẢNG CHI TIẾT CÁC ĐIỂM DỪNG */}
              <table className="w-full border-collapse border border-black text-[11px] mb-4">
                <thead>
                  <tr className="bg-slate-100 border-b border-black text-center font-bold">
                    <th className="border border-black p-1.5 w-10">Thứ tự</th>
                    <th className="border border-black p-1.5 w-24">Mã đơn</th>
                    <th className="border border-black p-1.5">Khách hàng & SĐT</th>
                    <th className="border border-black p-1.5">Địa chỉ giao hàng</th>
                    <th className="border border-black p-1.5 w-24">Tiền COD cần thu</th>
                    <th className="border border-black p-1.5 w-28">Ký nhận của khách</th>
                  </tr>
                </thead>
                <tbody>
                  {printTrip.orderIds.map((ordId, idx) => {
                    const ord = orders.find((o) => o.id === ordId);
                    if (!ord) return null;
                    return (
                      <tr key={ord.id} className="border-b border-black">
                        <td className="border border-black p-2 text-center font-black">
                          Điểm {idx + 1}
                        </td>
                        <td className="border border-black p-2 font-bold">{ord.orderCode}</td>
                        <td className="border border-black p-2">
                          <p className="font-bold">{ord.customerName}</p>
                          <p className="text-slate-700">{ord.customerPhone}</p>
                        </td>
                        <td className="border border-black p-2 text-[10px]">
                          {ord.deliveryAddress}
                          <p className="text-slate-500 italic mt-0.5">
                            Kiện:{' '}
                            {(ord.items || []).map((it) => `${it.productName} (x${it.quantity})`).join(', ')}
                          </p>
                        </td>
                        <td className="border border-black p-2 text-right font-black text-black">
                          {formatVND(ord.remainingAmount || 0)}
                        </td>
                        <td className="border border-black p-2 text-center text-slate-400 italic">
                          (Ký & ghi họ tên)
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="font-black bg-slate-50 border-t-2 border-black">
                    <td colSpan={4} className="border border-black p-2 text-right uppercase">
                      Tổng tiền COD Shipper cần nộp lại quỹ cửa hàng:
                    </td>
                    <td className="border border-black p-2 text-right font-black text-black">
                      {formatVND(printTrip.totalCodAmount || 0)}
                    </td>
                    <td className="border border-black p-2"></td>
                  </tr>
                </tbody>
              </table>

              {/* Chữ ký bàn giao */}
              <div className="grid grid-cols-3 text-center text-xs mt-6 pt-2">
                <div>
                  <p className="font-bold uppercase">Người Lập Bảng</p>
                  <p className="text-[10px] text-slate-500 italic">(Ký, họ tên)</p>
                  <div className="h-16"></div>
                </div>
                <div>
                  <p className="font-bold uppercase">Thủ Kho Xuất Hàng</p>
                  <p className="text-[10px] text-slate-500 italic">(Ký, xác nhận đủ kiện)</p>
                  <div className="h-16"></div>
                </div>
                <div>
                  <p className="font-bold uppercase">Shipper Nhận Đơn</p>
                  <p className="text-[10px] text-slate-500 italic">(Ký, nhận hàng & COD)</p>
                  <div className="h-16"></div>
                  <p className="font-bold text-xs">{printTrip.shipperName || ''}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-600">
            {activeTab === 'create' && tripId && (
              <button
                type="button"
                onClick={() => handleRequestDeleteTrip(tripId, tripCode, orderedStops.length)}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-2xs mr-2"
                title="Hủy / Xóa hoàn toàn lộ trình chuyến này"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Hủy / Xóa lộ trình chuyến này</span>
              </button>
            )}

            {activeTab === 'create' && googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center space-x-1.5 shadow-2xs"
                title="Mở Google Maps chỉ dẫn shipper chạy liên tục từ kho đến điểm 1 rồi điểm 2"
              >
                <Navigation className="w-4 h-4" />
                <span>Mở Google Maps dẫn đường cả chuyến</span>
              </a>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-colors"
            >
              Đóng
            </button>

            {activeTab === 'create' && (
              <>
                <button
                  type="button"
                  onClick={() => handleSaveTrip(false)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
                >
                  Lưu kế hoạch chuyến
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveTrip(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center space-x-1.5"
                >
                  <Truck className="w-4 h-4" />
                  <span>Lưu & Bắt đầu giao</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* FEEDBACK TOAST BANNER */}
        {feedbackToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-65 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs flex items-center space-x-3 animate-in slide-in-from-top-3">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              feedbackToast.type === 'success' ? 'bg-emerald-400' : 'bg-amber-400'
            }`} />
            <span className="font-semibold">{feedbackToast.message}</span>
            <button
              onClick={() => setFeedbackToast(null)}
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
      </div>
    </div>
  );
};

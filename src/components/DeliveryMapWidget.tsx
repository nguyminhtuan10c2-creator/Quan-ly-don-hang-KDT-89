import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Truck,
  ShieldCheck,
  CheckCircle,
  Clock,
  AlertCircle,
  Phone,
  RefreshCw,
  Zap,
  Compass,
  Copy,
  Check,
  Route,
  ChevronRight,
  Info
} from 'lucide-react';
import { Order, OrderStatus } from '../types';

interface DeliveryMapWidgetProps {
  order?: Order;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryStaffName?: string;
  deliveryStaffPhone?: string;
  status?: OrderStatus;
}

export interface TransportRoute {
  id: 'fastest' | 'eco' | 'shortest';
  name: string;
  shortLabel: string;
  distance: string;
  estimatedTime: string;
  trafficStatus: 'good' | 'moderate' | 'busy';
  trafficLabel: string;
  trafficColor: string;
  roadDescription: string;
  recommendedVehicle: string;
  controlX: number;
  controlY: number;
  pathGlowColor: string;
  pathStrokeColor: string;
}

export const DeliveryMapWidget: React.FC<DeliveryMapWidgetProps> = ({
  order,
  customerName,
  customerPhone,
  deliveryAddress,
  deliveryStaffName,
  deliveryStaffPhone,
  status,
}) => {
  const [mapZoom, setMapZoom] = useState<'normal' | 'zoomed'>('normal');
  const [selectedRouteId, setSelectedRouteId] = useState<'fastest' | 'eco' | 'shortest'>('fastest');
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [simulatedStep, setSimulatedStep] = useState<number>(0);

  // Extract values with fallbacks
  const finalCustomerName = customerName || order?.customerName || 'Khách hàng';
  const finalCustomerPhone = customerPhone || order?.customerPhone || '0901234567';
  const finalAddress =
    deliveryAddress || order?.deliveryAddress || '124 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh';
  const finalStaffName = deliveryStaffName || order?.deliveryStaffName || 'Phạm Quốc Việt';
  const finalStaffPhone = deliveryStaffPhone || order?.deliveryStaffPhone || '0977118899';
  const finalStatus: OrderStatus = status || order?.status || 'delivering';

  // Available Transport Routes for assigned delivery staff
  const routesList: TransportRoute[] = [
    {
      id: 'fastest',
      name: 'Tuyến 1: Đại Lộ Chính (Tuyến Nhanh)',
      shortLabel: 'Tuyến Nhanh',
      distance: '4.2 km',
      estimatedTime: '12 - 15 phút',
      trafficStatus: 'good',
      trafficLabel: 'Thông thoáng',
      trafficColor: 'text-emerald-400 bg-emerald-950/80 border-emerald-800',
      roadDescription: 'Qua Đại lộ Nguyễn Văn Linh & Trục Võ Văn Kiệt',
      recommendedVehicle: 'Xe máy / Xe tải nhỏ',
      controlX: 190,
      controlY: 200,
      pathGlowColor: '#3b82f6',
      pathStrokeColor: '#2563eb',
    },
    {
      id: 'eco',
      name: 'Tuyến 2: Đường Tránh Kẹt Xe (Nội Đô)',
      shortLabel: 'Tránh Kẹt Xe',
      distance: '4.8 km',
      estimatedTime: '18 - 22 phút',
      trafficStatus: 'moderate',
      trafficLabel: 'Xe vừa phải',
      trafficColor: 'text-amber-400 bg-amber-950/80 border-amber-800',
      roadDescription: 'Tránh ngã tư trọng điểm, qua đường Vành Đai Nội Bộ',
      recommendedVehicle: 'Xe máy / Xe ba gõ',
      controlX: 250,
      controlY: 100,
      pathGlowColor: '#f59e0b',
      pathStrokeColor: '#d97706',
    },
    {
      id: 'shortest',
      name: 'Tuyến 3: Lối Tắt Hẻm Thông (Ngắn Nhất)',
      shortLabel: 'Lối Tắt Hẻm',
      distance: '3.5 km',
      estimatedTime: '15 - 18 phút',
      trafficStatus: 'good',
      trafficLabel: 'Hẻm xe máy',
      trafficColor: 'text-blue-400 bg-blue-950/80 border-blue-800',
      roadDescription: 'Thông hẻm liên phường, tối ưu khoảng cách di chuyển',
      recommendedVehicle: 'Xe máy giao hàng',
      controlX: 120,
      controlY: 110,
      pathGlowColor: '#10b981',
      pathStrokeColor: '#059669',
    },
  ];

  const activeRoute = routesList.find((r) => r.id === selectedRouteId) || routesList[0];

  // Calculate progress based on order status
  let progressPercent = 15; // default for pending
  if (finalStatus === 'delivering' || finalStatus === 'in_transit') {
    progressPercent = 65;
  } else if (finalStatus === 'completed' || finalStatus === 'delivered') {
    progressPercent = 100;
  } else if (finalStatus === 'failed' || finalStatus === 'cancelled') {
    progressPercent = 35;
  }

  // Adjust coordinates based on zoom mode
  const startX = 65;
  const startY = 175;
  const endX = 335;
  const endY = 55;
  const controlX = activeRoute.controlX;
  const controlY = activeRoute.controlY;

  // Quad bezier position calculation for Shipper marker
  const t = progressPercent / 100;
  const currentX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * endX;
  const currentY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * endY;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(finalAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 text-white shadow-xl space-y-0">
      {/* 1. Header Bar with Address & GPS Status */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Navigation className="w-4 h-4 text-blue-400 animate-pulse" />
          <span className="font-extrabold text-xs tracking-wide uppercase text-slate-200">
            Bản đồ & Định vị Lộ trình Giao hàng
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1.5" />
            Tín hiệu GPS: Chuẩn
          </span>

          <button
            type="button"
            onClick={() => setMapZoom(mapZoom === 'normal' ? 'zoomed' : 'normal')}
            className="text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
          >
            {mapZoom === 'normal' ? 'Phóng to' : 'Thu nhỏ'}
          </button>
        </div>
      </div>

      {/* 2. Customer Delivery Address Box */}
      <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-start space-x-2.5 max-w-xl">
          <MapPin className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 animate-bounce" />
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-extrabold uppercase text-rose-400 tracking-wider">Địa chỉ giao nhận hàng:</span>
              <span className="font-bold text-slate-300">({finalCustomerName} - {finalCustomerPhone})</span>
            </div>
            <p className="font-extrabold text-slate-100 text-xs mt-0.5 leading-snug">{finalAddress}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyAddress}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-[11px] px-3 py-1.5 rounded-xl border border-slate-700 transition-all flex items-center space-x-1.5 shrink-0"
        >
          {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedAddress ? 'Đã sao chép!' : 'Copy địa chỉ'}</span>
        </button>
      </div>

      {/* 3. Transport Route Selector Tabs */}
      <div className="bg-slate-950 p-2.5 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
            <Route className="w-3.5 h-3.5 text-blue-400" />
            <span>Tùy chọn Tuyến đường Shipper di chuyển:</span>
          </span>
          <span className="text-[10px] text-blue-400 font-medium italic">Click để xem & đổi lộ trình</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {routesList.map((route) => {
            const isSelected = route.id === selectedRouteId;
            return (
              <button
                key={route.id}
                type="button"
                onClick={() => setSelectedRouteId(route.id)}
                className={`p-2 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-950/80 border-blue-500 text-white ring-2 ring-blue-500/40 shadow-lg'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`font-extrabold text-[11px] ${isSelected ? 'text-blue-300' : 'text-slate-300'}`}>
                    {route.shortLabel}
                  </span>
                  {isSelected && <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                </div>

                <div className="mt-1 flex items-baseline justify-between text-[10px]">
                  <span className="font-extrabold text-emerald-400">{route.distance}</span>
                  <span className="font-medium text-slate-400">{route.estimatedTime}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Simulated SVG Route Map Canvas */}
      <div
        className={`relative w-full bg-slate-950 overflow-hidden select-none transition-all duration-300 ${
          mapZoom === 'zoomed' ? 'h-80' : 'h-60'
        }`}
      >
        {/* Street Grid background */}
        <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
          <defs>
            <pattern id="street-grid" width="35" height="35" patternUnits="userSpaceOnUse">
              <path d="M 35 0 L 0 0 0 35" fill="none" stroke="#334155" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#street-grid)" />
        </svg>

        {/* Secondary Road Network Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-25 pointer-events-none">
          <path d="M 0,100 Q 200,80 400,120" stroke="#475569" strokeWidth="8" fill="none" />
          <path d="M 120,0 Q 150,120 180,240" stroke="#475569" strokeWidth="6" fill="none" />
          <path d="M 280,0 Q 260,140 320,240" stroke="#475569" strokeWidth="6" fill="none" />
          {/* Alternative Route shadow outlines */}
          {routesList.map((r) => (
            <path
              key={r.id}
              d={`M ${startX},${startY} Q ${r.controlX},${r.controlY} ${endX},${endY}`}
              fill="none"
              stroke={r.id === selectedRouteId ? 'none' : '#334155'}
              strokeWidth="3"
              strokeDasharray="4 4"
              opacity="0.5"
            />
          ))}
        </svg>

        {/* Interactive SVG Canvas */}
        <svg viewBox="0 0 400 230" className="w-full h-full relative z-10">
          <defs>
            <linearGradient id="activeRouteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor={activeRoute.pathGlowColor} />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Planned Base Route Track */}
          <path
            d={`M ${startX},${startY} Q ${controlX},${controlY} ${endX},${endY}`}
            fill="none"
            stroke="#1e293b"
            strokeWidth="9"
            strokeLinecap="round"
          />

          <path
            d={`M ${startX},${startY} Q ${controlX},${controlY} ${endX},${endY}`}
            fill="none"
            stroke="#334155"
            strokeWidth="5"
            strokeDasharray="6 4"
            strokeLinecap="round"
          />

          {/* Active Animated Route Path */}
          <path
            d={`M ${startX},${startY} Q ${controlX},${controlY} ${endX},${endY}`}
            fill="none"
            stroke="url(#activeRouteGrad)"
            strokeWidth="5"
            strokeDasharray="400"
            strokeDashoffset={400 - (400 * progressPercent) / 100}
            strokeLinecap="round"
            filter="url(#routeGlow)"
            className="transition-all duration-700 ease-out"
          />

          {/* Waypoint Midpoint Marker */}
          <g transform={`translate(${controlX}, ${controlY})`}>
            <circle r="5" fill="#f59e0b" opacity="0.8" />
            <circle r="2" fill="#ffffff" />
            <text y="-9" textAnchor="middle" fill="#fbbf24" fontSize="7" fontWeight="bold">
              Trạm Trung Chuyển
            </text>
          </g>

          {/* Origin Store Pin (188 Nguyễn Trãi) */}
          <g transform={`translate(${startX}, ${startY})`}>
            <circle r="12" fill="#1e3a8a" opacity="0.4" className="animate-ping" />
            <circle r="9" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="2" />
            <text y="3" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
              KHO
            </text>
            <text y="-14" textAnchor="middle" fill="#93c5fd" fontSize="8" fontWeight="bold">
              Kho OrderManager Q1
            </text>
          </g>

          {/* Destination Customer Pin */}
          <g transform={`translate(${endX}, ${endY})`}>
            <circle r="14" fill="#065f46" opacity="0.4" className="animate-pulse" />
            <circle r="10" fill="#059669" stroke="#34d399" strokeWidth="2" />
            <text y="3" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
              KH
            </text>
            <text y="-16" textAnchor="middle" fill="#a7f3d0" fontSize="8" fontWeight="bold">
              Điểm Giao Hàng
            </text>
          </g>

          {/* Moving Driver / Shipper Icon Marker */}
          <g transform={`translate(${currentX}, ${currentY})`} className="transition-all duration-700 ease-out">
            <circle r="18" fill="#3b82f6" opacity="0.3" className="animate-ping" />
            <circle r="12" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
            {/* Truck / Motorbike graphic inside */}
            <path
              d="M -5 -3 L 2 -3 L 5 0 L 5 4 L -5 4 Z M 3 4 A 1.5 1.5 0 1 1 3 4.1 M -3 4 A 1.5 1.5 0 1 1 -3 4.1"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            {/* Shipper Tooltip */}
            <rect x="-35" y="-28" width="70" height="14" rx="4" fill="#0f172a" opacity="0.9" stroke="#3b82f6" strokeWidth="1" />
            <text x="0" y="-18" textAnchor="middle" fill="#60a5fa" fontSize="7" fontWeight="extrabold">
              {finalStaffName.split(' ').slice(-1)[0]} ({progressPercent}%)
            </text>
          </g>
        </svg>

        {/* Live Route Overlay Info Box */}
        <div className="absolute bottom-3 left-3 right-3 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-700/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Khoảng cách & Thời gian</span>
              <span className="font-extrabold text-blue-400 text-xs">
                {activeRoute.distance} ({activeRoute.estimatedTime})
              </span>
            </div>

            <div className="border-l border-slate-700 pl-3">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Mật độ giao thông</span>
              <span className={`font-extrabold text-[11px] px-2 py-0.5 rounded border ${activeRoute.trafficColor}`}>
                {activeRoute.trafficLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-slate-300 font-medium">Lộ trình đang chọn:</span>
            <span className="bg-blue-900/80 text-blue-200 font-extrabold px-2.5 py-0.5 rounded border border-blue-700 text-[11px]">
              {activeRoute.name}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Driver Info & Route Details Footer */}
      <div className="bg-slate-950 p-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs shrink-0 shadow-md">
            <Truck className="w-5 h-5" />
          </div>

          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Shipper Đang Đảm Nhận</p>
            <p className="font-extrabold text-white flex items-center space-x-1.5">
              <span>{finalStaffName}</span>
              <span className="text-[10px] text-blue-400 font-mono">({order?.deliveryStaffId || 'NV004'})</span>
            </p>
            <p className="text-[10px] text-slate-400">Phương tiện: <strong className="text-slate-200">{activeRoute.recommendedVehicle}</strong></p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {finalStaffPhone && (
            <a
              href={`tel:${finalStaffPhone}`}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-1.5 rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors text-xs"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{finalStaffPhone}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

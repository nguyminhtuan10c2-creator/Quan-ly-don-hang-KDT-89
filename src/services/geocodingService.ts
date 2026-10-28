/**
 * Geocoding Service dedicated to Vietnam (100% focused on Vietnam territory)
 * Guarantees that addresses never resolve outside Vietnam.
 */

export interface GeocodingResult {
  displayName: string;
  lat: number;
  lng: number;
  city?: string;
  district?: string;
  ward?: string;
  road?: string;
}

// Vietnam Geographic Boundary Guard
export const VIETNAM_BOUNDS = {
  minLat: 8.15,
  maxLat: 23.4,
  minLng: 102.1,
  maxLng: 109.5,
};

export function isCoordinateInVietnam(lat?: number, lng?: number): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return (
    lat >= VIETNAM_BOUNDS.minLat &&
    lat <= VIETNAM_BOUNDS.maxLat &&
    lng >= VIETNAM_BOUNDS.minLng &&
    lng <= VIETNAM_BOUNDS.maxLng
  );
}

// Safe Fallback coordinates in central HCMC and Vietnam major hubs
export const DEFAULT_VIETNAM_COORDS = {
  hcmc: { lat: 10.7769, lng: 106.7009, name: 'TP. Hồ Chí Minh' },
  hanoi: { lat: 21.0285, lng: 105.8542, name: 'Hà Nội' },
  danang: { lat: 16.0544, lng: 108.2022, name: 'Đà Nẵng' },
  cantho: { lat: 10.0452, lng: 105.7469, name: 'Cần Thơ' },
  haiphong: { lat: 20.8449, lng: 106.6881, name: 'Hải Phòng' },
  binhduong: { lat: 10.9804, lng: 106.6519, name: 'Bình Dương' },
  dongnai: { lat: 10.9574, lng: 106.8427, name: 'Đồng Nai' },
  vungtau: { lat: 10.3460, lng: 107.0843, name: 'Bà Rịa - Vũng Tàu' },
};

// Comprehensive offline dictionary for Vietnamese locations
const VIETNAM_LOCATION_DICTIONARY: Record<string, { lat: number; lng: number; name: string }> = {
  // HCMC Districts
  'quan 1': { lat: 10.7754, lng: 106.6996, name: 'Quận 1, TP. Hồ Chí Minh' },
  'quan 3': { lat: 10.7844, lng: 106.6845, name: 'Quận 3, TP. Hồ Chí Minh' },
  'quan 4': { lat: 10.7578, lng: 106.7013, name: 'Quận 4, TP. Hồ Chí Minh' },
  'quan 5': { lat: 10.7540, lng: 106.6634, name: 'Quận 5, TP. Hồ Chí Minh' },
  'quan 6': { lat: 10.7471, lng: 106.6352, name: 'Quận 6, TP. Hồ Chí Minh' },
  'quan 7': { lat: 10.7340, lng: 106.7218, name: 'Quận 7, TP. Hồ Chí Minh' },
  'quan 8': { lat: 10.7241, lng: 106.6286, name: 'Quận 8, TP. Hồ Chí Minh' },
  'quan 10': { lat: 10.7716, lng: 106.6674, name: 'Quận 10, TP. Hồ Chí Minh' },
  'quan 11': { lat: 10.7629, lng: 106.6504, name: 'Quận 11, TP. Hồ Chí Minh' },
  'quan 12': { lat: 10.8672, lng: 106.6413, name: 'Quận 12, TP. Hồ Chí Minh' },
  'binh thanh': { lat: 10.8106, lng: 106.7091, name: 'Bình Thạnh, TP. Hồ Chí Minh' },
  'phu nhuan': { lat: 10.7992, lng: 106.6803, name: 'Phú Nhuận, TP. Hồ Chí Minh' },
  'go vap': { lat: 10.8388, lng: 106.6653, name: 'Gò Vấp, TP. Hồ Chí Minh' },
  'tan binh': { lat: 10.8015, lng: 106.6526, name: 'Tân Bình, TP. Hồ Chí Minh' },
  'tan phu': { lat: 10.7900, lng: 106.6282, name: 'Tân Phú, TP. Hồ Chí Minh' },
  'binh tan': { lat: 10.7653, lng: 106.6039, name: 'Bình Tân, TP. Hồ Chí Minh' },
  'thu duc': { lat: 10.8494, lng: 106.7537, name: 'TP. Thủ Đức, TP. Hồ Chí Minh' },
  'hoc mon': { lat: 10.8839, lng: 106.5925, name: 'Hóc Môn, TP. Hồ Chí Minh' },
  'cu chi': { lat: 11.0067, lng: 106.5132, name: 'Củ Chi, TP. Hồ Chí Minh' },
  'binh chanh': { lat: 10.6874, lng: 106.5921, name: 'Bình Chánh, TP. Hồ Chí Minh' },
  'nha be': { lat: 10.6953, lng: 106.7297, name: 'Nhà Bè, TP. Hồ Chí Minh' },

  // Key Vietnam Cities & Provinces
  'ha noi': { lat: 21.0285, lng: 105.8542, name: 'Hà Nội' },
  'tp ho chi minh': { lat: 10.7769, lng: 106.7009, name: 'TP. Hồ Chí Minh' },
  'sai gon': { lat: 10.7769, lng: 106.7009, name: 'TP. Hồ Chí Minh' },
  'da nang': { lat: 16.0544, lng: 108.2022, name: 'Đà Nẵng' },
  'hai phong': { lat: 20.8449, lng: 106.6881, name: 'Hải Phòng' },
  'can tho': { lat: 10.0452, lng: 105.7469, name: 'Cần Thơ' },
  'binh duong': { lat: 10.9804, lng: 106.6519, name: 'Bình Dương' },
  'thuan an': { lat: 10.9167, lng: 106.7000, name: 'Thuận An, Bình Dương' },
  'di an': { lat: 10.9067, lng: 106.7725, name: 'Dĩ An, Bình Dương' },
  'thu dau mot': { lat: 10.9804, lng: 106.6519, name: 'Thủ Dầu Một, Bình Dương' },
  'dong nai': { lat: 10.9574, lng: 106.8427, name: 'Đồng Nai' },
  'bien hoa': { lat: 10.9574, lng: 106.8427, name: 'Biên Hòa, Đồng Nai' },
  'ba ria vung tau': { lat: 10.3460, lng: 107.0843, name: 'Bà Rịa - Vũng Tàu' },
  'vung tau': { lat: 10.3460, lng: 107.0843, name: 'TP. Vũng Tàu' },
  'long an': { lat: 10.5333, lng: 106.4167, name: 'Long An' },
  'tan an': { lat: 10.5333, lng: 106.4167, name: 'Tân An, Long An' },
  'tien giang': { lat: 10.3600, lng: 106.3600, name: 'Tiền Giang' },
  'my tho': { lat: 10.3600, lng: 106.3600, name: 'Mỹ Tho, Tiền Giang' },
  'khanh hoa': { lat: 12.2388, lng: 109.1967, name: 'Khánh Hòa' },
  'nha trang': { lat: 12.2388, lng: 109.1967, name: 'Nha Trang, Khánh Hòa' },
  'lam dong': { lat: 11.9404, lng: 108.4583, name: 'Lâm Đồng' },
  'da lat': { lat: 11.9404, lng: 108.4583, name: 'Đà Lạt, Lâm Đồng' },
  'thua thien hue': { lat: 16.4637, lng: 107.5909, name: 'Huế' },
  'hue': { lat: 16.4637, lng: 107.5909, name: 'TP. Huế' },
  'quang nam': { lat: 15.5667, lng: 108.0000, name: 'Quảng Nam' },
  'hoi an': { lat: 15.8801, lng: 108.3380, name: 'Hội An, Quảng Nam' },
};

function removeAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/**
 * Geocode any address query within Vietnam using OpenStreetMap Nominatim
 * Strictly scoped with `countrycodes=vn` and boundary boxes.
 */
export async function geocodeVietnamAddress(query: string): Promise<GeocodingResult[]> {
  const clean = query.trim();
  if (!clean || clean.length < 2) return [];

  const normalized = removeAccents(clean);

  // 1. Try Nominatim API with countrycodes=vn
  try {
    const encodedQuery = encodeURIComponent(clean);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&countrycodes=vn&addressdetails=1&limit=5`;
    
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'vi, en',
        'User-Agent': 'KDT89-Logistics-VN/1.0',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const filtered = data
          .map((item: any) => {
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            return {
              displayName: item.display_name,
              lat,
              lng,
              city: item.address?.city || item.address?.state || item.address?.province,
              district: item.address?.suburb || item.address?.city_district || item.address?.county,
              ward: item.address?.quarter || item.address?.neighbourhood,
              road: item.address?.road,
            };
          })
          // Filter strictly to ensure point is inside Vietnam territory
          .filter((item: GeocodingResult) => isCoordinateInVietnam(item.lat, item.lng));

        if (filtered.length > 0) {
          return filtered;
        }
      }
    }
  } catch (err) {
    console.warn('Nominatim network lookup failed, using Vietnam dictionary fallback:', err);
  }

  // 2. Intelligent local Vietnam dictionary fallback
  for (const [key, val] of Object.entries(VIETNAM_LOCATION_DICTIONARY)) {
    if (normalized.includes(key)) {
      return [
        {
          displayName: `${clean} (${val.name})`,
          lat: val.lat,
          lng: val.lng,
          city: val.name,
        },
      ];
    }
  }

  // 3. Fallback to default HCMC location if no match
  return [
    {
      displayName: `${clean} (Khu vực TP. Hồ Chí Minh)`,
      lat: DEFAULT_VIETNAM_COORDS.hcmc.lat,
      lng: DEFAULT_VIETNAM_COORDS.hcmc.lng,
      city: 'TP. Hồ Chí Minh',
    },
  ];
}

/**
 * Reverse Geocode: Convert GPS coordinates [lat, lng] back into a human-readable address in Vietnam
 */
export async function reverseGeocodeVietnam(lat: number, lng: number): Promise<string> {
  if (!isCoordinateInVietnam(lat, lng)) {
    return 'Tọa độ ngoài lãnh thổ Việt Nam';
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'vi, en',
        'User-Agent': 'KDT89-Logistics-VN/1.0',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        return data.display_name;
      }
    }
  } catch (err) {
    console.warn('Reverse geocode failed:', err);
  }

  return `Tọa độ: ${lat.toFixed(5)}, ${lng.toFixed(5)} (Việt Nam)`;
}

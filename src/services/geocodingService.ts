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
  // District 7 (Quận 7) Specific Wards & Roads
  'phu thuan': { lat: 10.7295, lng: 106.7350, name: 'Phường Phú Thuận, Quận 7, TP. Hồ Chí Minh' },
  'duong phu thuan': { lat: 10.7315, lng: 106.7265, name: 'Đường Phú Thuận, Quận 7, TP. Hồ Chí Minh' },
  'huynh tan phat': { lat: 10.7325, lng: 106.7330, name: 'Huỳnh Tấn Phát, Quận 7, TP. Hồ Chí Minh' },
  'phu my hung': { lat: 10.7290, lng: 106.7130, name: 'Khu Đô Thị Phú Mỹ Hưng, Quận 7, TP. Hồ Chí Minh' },
  'nguyen van linh': { lat: 10.7310, lng: 106.7150, name: 'Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh' },
  'nguyen thi thap': { lat: 10.7445, lng: 106.7110, name: 'Nguyễn Thị Thập, Quận 7, TP. Hồ Chí Minh' },
  'tan thuan': { lat: 10.7550, lng: 106.7280, name: 'Tân Thuận, Quận 7, TP. Hồ Chí Minh' },
  'tan quy': { lat: 10.7480, lng: 106.7120, name: 'Tân Quy, Quận 7, TP. Hồ Chí Minh' },
  'tan kieng': { lat: 10.7510, lng: 106.7150, name: 'Tân Kiểng, Quận 7, TP. Hồ Chí Minh' },
  'tan phong': { lat: 10.7280, lng: 106.7050, name: 'Tân Phong, Quận 7, TP. Hồ Chí Minh' },
  'tan phu q7': { lat: 10.7320, lng: 106.7220, name: 'Tân Phú, Quận 7, TP. Hồ Chí Minh' },
  'binh thuan q7': { lat: 10.7430, lng: 106.7220, name: 'Bình Thuận, Quận 7, TP. Hồ Chí Minh' },
  'phu my q7': { lat: 10.7120, lng: 106.7310, name: 'Phú Mỹ, Quận 7, TP. Hồ Chí Minh' },
  'quan 7': { lat: 10.7340, lng: 106.7218, name: 'Quận 7, TP. Hồ Chí Minh' },
  'q7': { lat: 10.7340, lng: 106.7218, name: 'Quận 7, TP. Hồ Chí Minh' },
  'q.7': { lat: 10.7340, lng: 106.7218, name: 'Quận 7, TP. Hồ Chí Minh' },
  'q 7': { lat: 10.7340, lng: 106.7218, name: 'Quận 7, TP. Hồ Chí Minh' },

  // District 8 (Quận 8) Specific Wards & Roads
  'hiep an': { lat: 10.7418, lng: 106.6722, name: 'KDC Hiệp Ân, Phường 5, Quận 8, TP. Hồ Chí Minh' },
  'duong so 1 quan 8': { lat: 10.7418, lng: 106.6722, name: '89 Đường Số 1, KDC Hiệp Ân, Quận 8' },
  'pham hung': { lat: 10.7420, lng: 106.6730, name: 'Phạm Hùng, Quận 8, TP. Hồ Chí Minh' },
  'ta quang buu': { lat: 10.7410, lng: 106.6700, name: 'Tạ Quang Bửu, Quận 8, TP. Hồ Chí Minh' },
  'quan 8': { lat: 10.7418, lng: 106.6722, name: 'Quận 8, TP. Hồ Chí Minh' },
  'q8': { lat: 10.7418, lng: 106.6722, name: 'Quận 8, TP. Hồ Chí Minh' },
  'q.8': { lat: 10.7418, lng: 106.6722, name: 'Quận 8, TP. Hồ Chí Minh' },
  'q 8': { lat: 10.7418, lng: 106.6722, name: 'Quận 8, TP. Hồ Chí Minh' },

  // Other HCMC Districts & Abbreviations
  'quan 1': { lat: 10.7754, lng: 106.6996, name: 'Quận 1, TP. Hồ Chí Minh' },
  'q1': { lat: 10.7754, lng: 106.6996, name: 'Quận 1, TP. Hồ Chí Minh' },
  'q.1': { lat: 10.7754, lng: 106.6996, name: 'Quận 1, TP. Hồ Chí Minh' },
  'quan 3': { lat: 10.7844, lng: 106.6845, name: 'Quận 3, TP. Hồ Chí Minh' },
  'q3': { lat: 10.7844, lng: 106.6845, name: 'Quận 3, TP. Hồ Chí Minh' },
  'q.3': { lat: 10.7844, lng: 106.6845, name: 'Quận 3, TP. Hồ Chí Minh' },
  'quan 4': { lat: 10.7578, lng: 106.7013, name: 'Quận 4, TP. Hồ Chí Minh' },
  'q4': { lat: 10.7578, lng: 106.7013, name: 'Quận 4, TP. Hồ Chí Minh' },
  'q.4': { lat: 10.7578, lng: 106.7013, name: 'Quận 4, TP. Hồ Chí Minh' },
  'quan 5': { lat: 10.7540, lng: 106.6634, name: 'Quận 5, TP. Hồ Chí Minh' },
  'q5': { lat: 10.7540, lng: 106.6634, name: 'Quận 5, TP. Hồ Chí Minh' },
  'q.5': { lat: 10.7540, lng: 106.6634, name: 'Quận 5, TP. Hồ Chí Minh' },
  'quan 6': { lat: 10.7471, lng: 106.6352, name: 'Quận 6, TP. Hồ Chí Minh' },
  'q6': { lat: 10.7471, lng: 106.6352, name: 'Quận 6, TP. Hồ Chí Minh' },
  'q.6': { lat: 10.7471, lng: 106.6352, name: 'Quận 6, TP. Hồ Chí Minh' },
  'quan 10': { lat: 10.7716, lng: 106.6674, name: 'Quận 10, TP. Hồ Chí Minh' },
  'q10': { lat: 10.7716, lng: 106.6674, name: 'Quận 10, TP. Hồ Chí Minh' },
  'q.10': { lat: 10.7716, lng: 106.6674, name: 'Quận 10, TP. Hồ Chí Minh' },
  'quan 11': { lat: 10.7629, lng: 106.6504, name: 'Quận 11, TP. Hồ Chí Minh' },
  'q11': { lat: 10.7629, lng: 106.6504, name: 'Quận 11, TP. Hồ Chí Minh' },
  'q.11': { lat: 10.7629, lng: 106.6504, name: 'Quận 11, TP. Hồ Chí Minh' },
  'quan 12': { lat: 10.8672, lng: 106.6413, name: 'Quận 12, TP. Hồ Chí Minh' },
  'q12': { lat: 10.8672, lng: 106.6413, name: 'Quận 12, TP. Hồ Chí Minh' },
  'q.12': { lat: 10.8672, lng: 106.6413, name: 'Quận 12, TP. Hồ Chí Minh' },
  'binh thanh': { lat: 10.8106, lng: 106.7091, name: 'Bình Thạnh, TP. Hồ Chí Minh' },
  'phu nhuan': { lat: 10.7992, lng: 106.6803, name: 'Phú Nhuận, TP. Hồ Chí Minh' },
  'go vap': { lat: 10.8388, lng: 106.6653, name: 'Gò Vấp, TP. Hồ Chí Minh' },
  'tan binh': { lat: 10.8015, lng: 106.6526, name: 'Tân Bình, TP. Hồ Chí Minh' },
  'tan phu': { lat: 10.7900, lng: 106.6282, name: 'Tân Phú, TP. Hồ Chí Minh' },
  'binh tan': { lat: 10.7653, lng: 106.6039, name: 'Bình Tân, TP. Hồ Chí Minh' },
  'thu duc': { lat: 10.8494, lng: 106.7537, name: 'TP. Thủ Đức, TP. Hồ Chí Minh' },
  'quan 2': { lat: 10.7872, lng: 106.7498, name: 'Quận 2, TP. Thủ Đức' },
  'q2': { lat: 10.7872, lng: 106.7498, name: 'Quận 2, TP. Thủ Đức' },
  'quan 9': { lat: 10.8428, lng: 106.7944, name: 'Quận 9, TP. Thủ Đức' },
  'q9': { lat: 10.8428, lng: 106.7944, name: 'Quận 9, TP. Thủ Đức' },
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
  'dong nai': { lat: 10.9574, lng: 106.8427, name: 'Đồng Nai' },
  'long an': { lat: 10.5333, lng: 106.4167, name: 'Long An' },
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
 * Intelligent helper to extract precise district / ward coordinates from any Vietnamese address string
 */
export function resolveCoordinatesFromAddress(address: string): { lat: number; lng: number; districtName?: string } | null {
  if (!address || typeof address !== 'string') return null;
  const normalized = removeAccents(address).toLowerCase();

  // 1. Check District 7 & specific Q7 locations
  if (normalized.includes('phu thuan')) {
    return { lat: 10.7295, lng: 106.7350, districtName: 'Phường Phú Thuận, Quận 7' };
  }
  if (normalized.includes('huynh tan phat')) {
    return { lat: 10.7325, lng: 106.7330, districtName: 'Huỳnh Tấn Phát, Quận 7' };
  }
  if (normalized.includes('phu my hung')) {
    return { lat: 10.7290, lng: 106.7130, districtName: 'Phú Mỹ Hưng, Quận 7' };
  }
  if (/\b(q7|q\.7|quan 7|quận 7)\b/i.test(normalized) || normalized.includes('quan 7') || normalized.includes('q7') || normalized.includes('q.7')) {
    return { lat: 10.7340, lng: 106.7218, districtName: 'Quận 7' };
  }

  // 2. Check District 8 (Warehouse Area)
  if (normalized.includes('hiep an') || normalized.includes('duong so 1')) {
    return { lat: 10.7418, lng: 106.6722, districtName: 'KDC Hiệp Ân, Quận 8' };
  }
  if (/\b(q8|q\.8|quan 8|quận 8)\b/i.test(normalized) || normalized.includes('quan 8') || normalized.includes('q8') || normalized.includes('q.8')) {
    return { lat: 10.7418, lng: 106.6722, districtName: 'Quận 8' };
  }

  // 3. Other Districts
  if (/\b(q4|q\.4|quan 4|quận 4)\b/i.test(normalized)) {
    return { lat: 10.7578, lng: 106.7013, districtName: 'Quận 4' };
  }
  if (/\b(q5|q\.5|quan 5|quận 5)\b/i.test(normalized)) {
    return { lat: 10.7540, lng: 106.6634, districtName: 'Quận 5' };
  }
  if (/\b(q6|q\.6|quan 6|quận 6)\b/i.test(normalized)) {
    return { lat: 10.7471, lng: 106.6352, districtName: 'Quận 6' };
  }
  if (/\b(q10|q\.10|quan 10|quận 10)\b/i.test(normalized)) {
    return { lat: 10.7716, lng: 106.6674, districtName: 'Quận 10' };
  }
  if (/\b(q11|q\.11|quan 11|quận 11)\b/i.test(normalized)) {
    return { lat: 10.7629, lng: 106.6504, districtName: 'Quận 11' };
  }
  if (/\b(q3|q\.3|quan 3|quận 3)\b/i.test(normalized)) {
    return { lat: 10.7844, lng: 106.6845, districtName: 'Quận 3' };
  }
  if (normalized.includes('binh thanh')) {
    return { lat: 10.8106, lng: 106.7091, districtName: 'Bình Thạnh' };
  }
  if (normalized.includes('phu nhuan')) {
    return { lat: 10.7992, lng: 106.6803, districtName: 'Phú Nhuận' };
  }
  if (normalized.includes('go vap')) {
    return { lat: 10.8388, lng: 106.6653, districtName: 'Gò Vấp' };
  }
  if (normalized.includes('tan binh')) {
    return { lat: 10.8015, lng: 106.6526, districtName: 'Tân Bình' };
  }
  if (normalized.includes('tan phu') && !normalized.includes('tan phu q7')) {
    return { lat: 10.7900, lng: 106.6282, districtName: 'Tân Phú' };
  }
  if (normalized.includes('binh tan')) {
    return { lat: 10.7653, lng: 106.6039, districtName: 'Bình Tân' };
  }
  if (normalized.includes('thu duc') || normalized.includes('q2') || normalized.includes('q9')) {
    return { lat: 10.8494, lng: 106.7537, districtName: 'TP. Thủ Đức' };
  }
  if (normalized.includes('nha be')) {
    return { lat: 10.6953, lng: 106.7297, districtName: 'Nhà Bè' };
  }
  if (normalized.includes('binh chanh')) {
    return { lat: 10.6874, lng: 106.5921, districtName: 'Bình Chánh' };
  }
  if (/\b(q1|q\.1|quan 1|quận 1)\b/i.test(normalized)) {
    return { lat: 10.7754, lng: 106.6996, districtName: 'Quận 1' };
  }

  return null;
}

/**
 * Normalizes query string for Nominatim (expands abbreviations like q7 -> Quận 7)
 */
function expandQueryForSearch(raw: string): string {
  let q = raw.trim();
  q = q.replace(/\b(q\.?\s*7|quan\s*7|quận\s*7)\b/gi, 'Quận 7, TP. Hồ Chí Minh');
  q = q.replace(/\b(q\.?\s*8|quan\s*8|quận\s*8)\b/gi, 'Quận 8, TP. Hồ Chí Minh');
  q = q.replace(/\b(q\.?\s*4|quan\s*4|quận\s*4)\b/gi, 'Quận 4, TP. Hồ Chí Minh');
  q = q.replace(/\b(q\.?\s*5|quan\s*5|quận\s*5)\b/gi, 'Quận 5, TP. Hồ Chí Minh');
  q = q.replace(/\b(q\.?\s*6|quan\s*6|quận\s*6)\b/gi, 'Quận 6, TP. Hồ Chí Minh');
  q = q.replace(/\b(q\.?\s*1|quan\s*1|quận\s*1)\b/gi, 'Quận 1, TP. Hồ Chí Minh');
  q = q.replace(/\b(q\.?\s*3|quan\s*3|quận\s*3)\b/gi, 'Quận 3, TP. Hồ Chí Minh');
  return q;
}

/**
 * Geocode any address query within Vietnam using OpenStreetMap Nominatim
 * Strictly scoped with `countrycodes=vn` and boundary boxes.
 */
export async function geocodeVietnamAddress(query: string): Promise<GeocodingResult[]> {
  const clean = query.trim();
  if (!clean || clean.length < 2) return [];

  const results: GeocodingResult[] = [];
  const normalized = removeAccents(clean);

  // 1. High-priority local dictionary match (especially for Q7 / Phú Thuận)
  const resolved = resolveCoordinatesFromAddress(clean);
  if (resolved) {
    results.push({
      displayName: `${clean} (${resolved.districtName || 'Khu vực chính xác'})`,
      lat: resolved.lat,
      lng: resolved.lng,
      city: 'TP. Hồ Chí Minh',
      district: resolved.districtName,
    });
  }

  // 2. Try Nominatim API with expanded query
  try {
    const expanded = expandQueryForSearch(clean);
    const encodedQuery = encodeURIComponent(expanded);
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
        data.forEach((item: any) => {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          if (isCoordinateInVietnam(lat, lng)) {
            // Avoid duplicate if already resolved
            const isDup = results.some((r) => Math.abs(r.lat - lat) < 0.001 && Math.abs(r.lng - lng) < 0.001);
            if (!isDup) {
              results.push({
                displayName: item.display_name,
                lat,
                lng,
                city: item.address?.city || item.address?.state || item.address?.province,
                district: item.address?.suburb || item.address?.city_district || item.address?.county,
                ward: item.address?.quarter || item.address?.neighbourhood,
                road: item.address?.road,
              });
            }
          }
        });
      }
    }
  } catch (err) {
    console.warn('Nominatim network lookup failed:', err);
  }

  if (results.length > 0) {
    return results;
  }

  // 3. Fallback dictionary check
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

  // 4. Fallback to default HCMC location if no match
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

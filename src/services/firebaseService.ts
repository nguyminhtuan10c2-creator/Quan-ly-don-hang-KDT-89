import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Order, Product, Staff, StoreInfo, DepartureLocation, DeliveryTrip } from '../types';
import {
  getOrders,
  getProducts,
  getStaffList,
  getStoreInfo,
  getDepartureLocations,
  getDeliveryTrips,
  saveOrders,
  saveProducts,
  saveStaffList,
  saveStoreInfo,
  setEntityChangeHandler,
} from './storageService';

export interface FirebaseSyncStatus {
  isConfigured: boolean;
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;
  totalSyncedOrders: number;
}

let syncStatus: FirebaseSyncStatus = {
  isConfigured: true,
  isConnected: false,
  isSyncing: false,
  lastSyncedAt: localStorage.getItem('kdt89_firebase_last_sync'),
  error: null,
  totalSyncedOrders: 0,
};

type SyncStatusListener = (status: FirebaseSyncStatus) => void;
const listeners = new Set<SyncStatusListener>();

export const subscribeToSyncStatus = (listener: SyncStatusListener) => {
  listeners.add(listener);
  listener({ ...syncStatus });
  return () => {
    listeners.delete(listener);
  };
};

const notifySyncStatus = () => {
  listeners.forEach((fn) => fn({ ...syncStatus }));
};

// Wire automatic entity sync to Firestore whenever local data changes (mobile or desktop)
setEntityChangeHandler((entity, action, data) => {
  if (entity === 'order') {
    if (action === 'save') {
      saveOrderToFirebase(data).catch(() => {});
    } else if (action === 'delete') {
      deleteOrderFromFirebase(data).catch(() => {});
    }
  } else if (entity === 'product') {
    if (action === 'save') {
      saveProductToFirebase(data).catch(() => {});
    } else if (action === 'delete') {
      deleteProductFromFirebase(data).catch(() => {});
    }
  } else if (entity === 'trip') {
    if (action === 'save') {
      saveTripToFirebase(data).catch(() => {});
    } else if (action === 'delete') {
      deleteTripFromFirebase(data).catch(() => {});
    }
  }
});


/**
 * Upload all current local data (orders, products, staff, store info) to Firebase Firestore
 */
export async function syncAllToFirebase(): Promise<{ success: boolean; count: number }> {
  syncStatus.isSyncing = true;
  syncStatus.error = null;
  notifySyncStatus();

  try {
    const orders = getOrders();
    const products = getProducts();
    const staff = getStaffList();
    const store = getStoreInfo();

    // 1. Sync Store Info
    try {
      await setDoc(doc(db, 'storeSettings', 'info'), {
        name: store.name,
        phone: store.phone,
        address: store.address,
        taxCode: store.taxCode || '',
        website: store.website || '',
        bankAccount: store.bankAccount || '',
        bankName: store.bankName || '',
        bankOwner: store.bankOwner || '',
        lat: store.lat || 10.7418,
        lng: store.lng || 106.6722,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'storeSettings/info');
    }

    // 2. Sync Departure Locations (Kho hàng & Điểm xuất phát)
    const departureLocations = getDepartureLocations();
    for (const dep of departureLocations) {
      try {
        await setDoc(doc(db, 'departureLocations', dep.id), {
          id: String(dep.id),
          name: String(dep.name),
          address: String(dep.address),
          lat: Number(dep.lat || 10.7418),
          lng: Number(dep.lng || 106.6722),
          phone: String(dep.phone || ''),
          isDefault: Boolean(dep.isDefault),
          notes: String(dep.notes || ''),
          createdAt: String(dep.createdAt || new Date().toISOString()),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `departureLocations/${dep.id}`);
      }
    }

    // 3. Sync Orders
    for (const order of orders) {
      const cleanOrder = {
        id: String(order.id),
        orderCode: String(order.orderCode),
        customerName: String(order.customerName),
        customerPhone: String(order.customerPhone),
        deliveryAddress: String(order.deliveryAddress || ''),
        deliveryLat: typeof order.deliveryLat === 'number' ? order.deliveryLat : 0,
        deliveryLng: typeof order.deliveryLng === 'number' ? order.deliveryLng : 0,
        storeLat: typeof order.storeLat === 'number' ? order.storeLat : 10.7418,
        storeLng: typeof order.storeLng === 'number' ? order.storeLng : 106.6722,
        departureLocationId: String(order.departureLocationId || ''),
        departureLocationName: String(order.departureLocationName || ''),
        departureAddress: String(order.departureAddress || ''),
        employeeId: String(order.employeeId || ''),
        employeeName: String(order.employeeName || ''),
        totalAmount: Number(order.totalAmount || 0),
        subtotal: Number(order.subtotal || order.totalAmount || 0),
        shippingFee: Number(order.shippingFee || 0),
        prepaidAmount: Number(order.prepaidAmount || 0),
        remainingAmount: Number(order.remainingAmount || 0),
        deliveryDate: String(order.deliveryDate || ''),
        deliveryTime: String(order.deliveryTime || ''),
        deliveryStaffId: String(order.deliveryStaffId || ''),
        deliveryStaffName: String(order.deliveryStaffName || ''),
        deliveryStaffPhone: String(order.deliveryStaffPhone || ''),
        deliveryNotes: String(order.deliveryNotes || ''),
        paymentStatus: order.paymentStatus || 'unpaid',
        paymentMethod: String(order.paymentMethod || 'cod'),
        status: order.status || 'pending',
        notes: String(order.notes || ''),
        createdAt: String(order.createdAt || new Date().toISOString()),
        updatedAt: String(order.updatedAt || new Date().toISOString()),
      };

      try {
        await setDoc(doc(db, 'orders', cleanOrder.id), cleanOrder);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `orders/${cleanOrder.id}`);
      }
    }

    // 3. Sync Products
    for (const p of products) {
      const cleanProduct = {
        id: String(p.id),
        name: String(p.name),
        sku: String(p.sku),
        stock: Number(p.stock || 0),
        price: Number(p.price || 0),
        costPrice: Number(p.costPrice || 0),
        category: String(p.category || 'Thiết bị gia dụng'),
        brand: String(p.brand || 'KDT-89'),
        isWarrantyEligible: Boolean(p.isWarrantyEligible),
        warrantyMonths: Number(p.warrantyMonths || 12),
        activationBonusAmount: Number(p.activationBonusAmount || 0),
        description: String(p.description || ''),
        createdAt: String(p.createdAt || new Date().toISOString()),
      };

      try {
        await setDoc(doc(db, 'products', cleanProduct.id), cleanProduct);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `products/${cleanProduct.id}`);
      }
    }

    // 4. Sync Staff
    for (const s of staff) {
      const cleanStaff = {
        id: String(s.id),
        employeeId: String(s.employeeId),
        employeeName: String(s.employeeName),
        role: s.role || 'Sales',
        email: String(s.email || ''),
        phone: String(s.phone || ''),
        avatar: String(s.avatar || ''),
      };

      try {
        await setDoc(doc(db, 'staff', cleanStaff.id), cleanStaff);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `staff/${cleanStaff.id}`);
      }
    }

    // 5. Sync Delivery Trips
    const trips = getDeliveryTrips();
    for (const trip of trips) {
      const cleanTrip = {
        id: String(trip.id),
        tripCode: String(trip.tripCode),
        departureLocationId: String(trip.departureLocationId || ''),
        departureLocationName: String(trip.departureLocationName || ''),
        departureAddress: String(trip.departureAddress || ''),
        departureLat: Number(trip.departureLat || 10.7418),
        departureLng: Number(trip.departureLng || 106.6722),
        shipperId: String(trip.shipperId || ''),
        shipperName: String(trip.shipperName || ''),
        shipperPhone: String(trip.shipperPhone || ''),
        orderIds: Array.isArray(trip.orderIds) ? trip.orderIds : [],
        status: trip.status || 'planning',
        totalDistanceKm: Number(trip.totalDistanceKm || 0),
        totalDurationMins: Number(trip.totalDurationMins || 0),
        totalCodAmount: Number(trip.totalCodAmount || 0),
        totalItemsCount: Number(trip.totalItemsCount || 0),
        notes: String(trip.notes || ''),
        createdAt: String(trip.createdAt || new Date().toISOString()),
        startedAt: String(trip.startedAt || ''),
        completedAt: String(trip.completedAt || ''),
      };

      try {
        await setDoc(doc(db, 'deliveryTrips', cleanTrip.id), cleanTrip);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `deliveryTrips/${cleanTrip.id}`);
      }
    }

    const now = new Date().toLocaleString('vi-VN');
    localStorage.setItem('kdt89_firebase_last_sync', now);
    syncStatus.isConnected = true;
    syncStatus.isSyncing = false;
    syncStatus.lastSyncedAt = now;
    syncStatus.totalSyncedOrders = orders.length;
    notifySyncStatus();

    return { success: true, count: orders.length };
  } catch (error) {
    syncStatus.isSyncing = false;
    syncStatus.error = error instanceof Error ? error.message : 'Lỗi đồng bộ Firebase';
    notifySyncStatus();
    throw error;
  }
}

/**
 * Fetch and pull data from Firestore down into local store
 */
export async function pullFromFirebase(): Promise<{ success: boolean; ordersCount: number }> {
  syncStatus.isSyncing = true;
  syncStatus.error = null;
  notifySyncStatus();

  try {
    // 1. Orders
    const ordersSnap = await getDocs(collection(db, 'orders'));
    const remoteOrders: Order[] = [];
    ordersSnap.forEach((docSnap) => {
      remoteOrders.push(docSnap.data() as Order);
    });

    if (remoteOrders.length > 0) {
      saveOrders(remoteOrders);
    }

    // 2. Products
    const productsSnap = await getDocs(collection(db, 'products'));
    const remoteProducts: Product[] = [];
    productsSnap.forEach((docSnap) => {
      remoteProducts.push(docSnap.data() as Product);
    });

    if (remoteProducts.length > 0) {
      saveProducts(remoteProducts);
    }

    // 3. Staff
    const staffSnap = await getDocs(collection(db, 'staff'));
    const remoteStaff: Staff[] = [];
    staffSnap.forEach((docSnap) => {
      remoteStaff.push(docSnap.data() as Staff);
    });

    if (remoteStaff.length > 0) {
      saveStaffList(remoteStaff);
    }

    const now = new Date().toLocaleString('vi-VN');
    localStorage.setItem('kdt89_firebase_last_sync', now);
    syncStatus.isConnected = true;
    syncStatus.isSyncing = false;
    syncStatus.lastSyncedAt = now;
    syncStatus.totalSyncedOrders = remoteOrders.length;
    notifySyncStatus();

    return { success: true, ordersCount: remoteOrders.length };
  } catch (error) {
    syncStatus.isSyncing = false;
    syncStatus.error = error instanceof Error ? error.message : 'Lỗi tải từ Firebase';
    notifySyncStatus();
    throw error;
  }
}

/**
 * Delete a delivery trip from Firestore
 */
export async function deleteTripFromFirebase(tripId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'deliveryTrips', tripId));
    return true;
  } catch (err) {
    console.warn('Could not delete trip from Firebase Firestore:', err);
    return false;
  }
}

/**
 * Delete an order from Firestore
 */
export async function deleteOrderFromFirebase(orderId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'orders', orderId));
    return true;
  } catch (err) {
    console.warn('Could not delete order from Firebase Firestore:', err);
    return false;
  }
}

/**
 * Direct real-time sync single order to Firestore
 */
export async function saveOrderToFirebase(order: Order): Promise<boolean> {
  try {
    const cleanOrder = {
      id: String(order.id),
      orderCode: String(order.orderCode),
      customerName: String(order.customerName),
      customerPhone: String(order.customerPhone),
      deliveryAddress: String(order.deliveryAddress || ''),
      deliveryLat: typeof order.deliveryLat === 'number' ? order.deliveryLat : 0,
      deliveryLng: typeof order.deliveryLng === 'number' ? order.deliveryLng : 0,
      storeLat: typeof order.storeLat === 'number' ? order.storeLat : 10.7418,
      storeLng: typeof order.storeLng === 'number' ? order.storeLng : 106.6722,
      departureLocationId: String(order.departureLocationId || ''),
      departureLocationName: String(order.departureLocationName || ''),
      departureAddress: String(order.departureAddress || ''),
      employeeId: String(order.employeeId || ''),
      employeeName: String(order.employeeName || ''),
      totalAmount: Number(order.totalAmount || 0),
      subtotal: Number(order.subtotal || order.totalAmount || 0),
      shippingFee: Number(order.shippingFee || 0),
      prepaidAmount: Number(order.prepaidAmount || 0),
      remainingAmount: Number(order.remainingAmount || 0),
      deliveryDate: String(order.deliveryDate || ''),
      deliveryTime: String(order.deliveryTime || ''),
      deliveryStaffId: String(order.deliveryStaffId || ''),
      deliveryStaffName: String(order.deliveryStaffName || ''),
      deliveryStaffPhone: String(order.deliveryStaffPhone || ''),
      deliveryNotes: String(order.deliveryNotes || ''),
      paymentStatus: order.paymentStatus || 'unpaid',
      paymentMethod: String(order.paymentMethod || 'cod'),
      status: order.status || 'pending',
      notes: String(order.notes || ''),
      createdAt: String(order.createdAt || new Date().toISOString()),
      updatedAt: String(order.updatedAt || new Date().toISOString()),
      items: Array.isArray(order.items) ? order.items : [],
      deliveryLogs: Array.isArray(order.deliveryLogs) ? order.deliveryLogs : [],
      paymentLogs: Array.isArray(order.paymentLogs) ? order.paymentLogs : [],
    };
    await setDoc(doc(db, 'orders', cleanOrder.id), cleanOrder);
    return true;
  } catch (err) {
    console.warn('Could not sync order to Firebase:', err);
    return false;
  }
}

/**
 * Direct real-time sync single product to Firestore
 */
export async function saveProductToFirebase(product: Product): Promise<boolean> {
  try {
    const cleanProduct = {
      id: String(product.id),
      name: String(product.name),
      sku: String(product.sku),
      stock: Number(product.stock || 0),
      price: Number(product.price || 0),
      costPrice: Number(product.costPrice || 0),
      category: String(product.category || 'Thiết bị gia dụng'),
      brand: String(product.brand || 'KDT-89'),
      isWarrantyEligible: Boolean(product.isWarrantyEligible),
      warrantyMonths: Number(product.warrantyMonths || 12),
      activationBonusAmount: Number(product.activationBonusAmount || 0),
      description: String(product.description || ''),
      createdAt: String(product.createdAt || new Date().toISOString()),
      priceUpdatedAt: String(product.priceUpdatedAt || new Date().toISOString()),
      priceUpdatedBy: String(product.priceUpdatedBy || ''),
      priceNote: String(product.priceNote || ''),
      priceHistory: Array.isArray(product.priceHistory) ? product.priceHistory : [],
      stockUpdatedAt: String(product.stockUpdatedAt || new Date().toISOString()),
      stockHistory: Array.isArray(product.stockHistory) ? product.stockHistory : [],
    };
    await setDoc(doc(db, 'products', cleanProduct.id), cleanProduct);
    return true;
  } catch (err) {
    console.warn('Could not sync product to Firebase:', err);
    return false;
  }
}

/**
 * Direct real-time sync single delivery trip to Firestore
 */
export async function saveTripToFirebase(trip: DeliveryTrip): Promise<boolean> {
  try {
    const cleanTrip = {
      id: String(trip.id),
      tripCode: String(trip.tripCode),
      departureLocationId: String(trip.departureLocationId || ''),
      departureLocationName: String(trip.departureLocationName || ''),
      departureAddress: String(trip.departureAddress || ''),
      departureLat: Number(trip.departureLat || 10.7418),
      departureLng: Number(trip.departureLng || 106.6722),
      shipperId: String(trip.shipperId || ''),
      shipperName: String(trip.shipperName || ''),
      shipperPhone: String(trip.shipperPhone || ''),
      orderIds: Array.isArray(trip.orderIds) ? trip.orderIds : [],
      status: trip.status || 'planning',
      totalDistanceKm: Number(trip.totalDistanceKm || 0),
      totalDurationMins: Number(trip.totalDurationMins || 0),
      totalCodAmount: Number(trip.totalCodAmount || 0),
      totalItemsCount: Number(trip.totalItemsCount || 0),
      notes: String(trip.notes || ''),
      createdAt: String(trip.createdAt || new Date().toISOString()),
      startedAt: String(trip.startedAt || ''),
      completedAt: String(trip.completedAt || ''),
    };
    await setDoc(doc(db, 'deliveryTrips', cleanTrip.id), cleanTrip);
    return true;
  } catch (err) {
    console.warn('Could not sync trip to Firebase:', err);
    return false;
  }
}

/**
 * Delete product from Firestore
 */
export async function deleteProductFromFirebase(productId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'products', productId));
    return true;
  } catch (err) {
    console.warn('Could not delete product from Firestore:', err);
    return false;
  }
}

/**
 * Initialize 2-way real-time listeners for orders, products, and trips
 * Whenever an order is created on phone, desktop receives snapshot and updates immediately!
 */
let realtimeUnsubscribes: Array<() => void> = [];

export function initRealtimeFirestoreSync(onDataChange?: () => void) {
  if (realtimeUnsubscribes.length > 0) {
    return () => {};
  }

  try {
    // 1. Orders Listener
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      if (snapshot.empty) return;
      const remoteOrders: Order[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Order;
        if (data && data.id && data.orderCode) {
          remoteOrders.push(data);
        }
      });
      if (remoteOrders.length > 0) {
        remoteOrders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        localStorage.setItem('ordermanager_orders_v5', JSON.stringify(remoteOrders));
        syncStatus.isConnected = true;
        syncStatus.totalSyncedOrders = remoteOrders.length;
        syncStatus.lastSyncedAt = new Date().toLocaleTimeString('vi-VN');
        notifySyncStatus();
        if (onDataChange) onDataChange();
      }
    }, (err) => {
      console.warn('Realtime Orders sync listener notice:', err);
    });

    // 2. Products Listener
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      if (snapshot.empty) return;
      const remoteProducts: Product[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Product;
        if (data && data.id && data.name) {
          remoteProducts.push(data);
        }
      });
      if (remoteProducts.length > 0) {
        localStorage.setItem('ordermanager_products_v5', JSON.stringify(remoteProducts));
        if (onDataChange) onDataChange();
      }
    }, (err) => {
      console.warn('Realtime Products sync listener notice:', err);
    });

    // 3. Delivery Trips Listener
    const unsubTrips = onSnapshot(collection(db, 'deliveryTrips'), (snapshot) => {
      if (snapshot.empty) return;
      const remoteTrips: DeliveryTrip[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as DeliveryTrip;
        if (data && data.id && data.tripCode) {
          remoteTrips.push(data);
        }
      });
      if (remoteTrips.length > 0) {
        localStorage.setItem('ordermanager_delivery_trips_v5', JSON.stringify(remoteTrips));
        if (onDataChange) onDataChange();
      }
    }, (err) => {
      console.warn('Realtime Trips sync listener notice:', err);
    });

    realtimeUnsubscribes = [unsubOrders, unsubProducts, unsubTrips];

    return () => {
      realtimeUnsubscribes.forEach((unsub) => unsub());
      realtimeUnsubscribes = [];
    };
  } catch (err) {
    console.warn('Could not initialize Firestore realtime sync:', err);
    return () => {};
  }
}



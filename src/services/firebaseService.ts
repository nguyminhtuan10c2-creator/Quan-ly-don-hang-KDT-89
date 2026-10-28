import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Order, Product, Staff, StoreInfo, DepartureLocation } from '../types';
import {
  getOrders,
  getProducts,
  getStaffList,
  getStoreInfo,
  getDepartureLocations,
  saveOrders,
  saveProducts,
  saveStaffList,
  saveStoreInfo,
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

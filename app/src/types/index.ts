import type { Timestamp } from 'firebase/firestore';

export interface UserData {
  uid: string;
  name: string;
  email: string;
  nationalId: string;
  profileImageUrl: string;
  acceptedTerms: boolean;
  role: 'user' | 'admin';
  emailVerified: boolean;
  createdAt: Timestamp | null;
}

export interface Booking {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  startTime: Timestamp | null;
  endTime: Timestamp | null;
  deliveryOption: 'pickup' | 'delivery';
  deliveryLocation?: string;
  baseAmount: number;
  deliveryFee: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  paystackReference: string;
  bookingStatus: 'active' | 'completed' | 'cancelled';
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface AdminNotification {
  id: string;
  type: 'new_booking' | 'payment_received' | 'booking_expired';
  bookingId: string;
  userId: string;
  userName: string;
  message: string;
  read: boolean;
  createdAt: Timestamp | null;
}

export interface TimerState {
  userId: string;
  bookingId: string;
  startTime: Timestamp | null;
  endTime: Timestamp | null;
  isActive: boolean;
  updatedAt: Timestamp | null;
}

export interface PaystackConfig {
  publicKey: string;
  email: string;
  amount: number;
  reference: string;
  onSuccess: (reference: string) => void;
  onClose: () => void;
}

export interface BookingFormData {
  deliveryOption: 'pickup' | 'delivery';
  deliveryLocation: string;
  baseAmount: number;
}

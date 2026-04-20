# SolarGen - Solar Generator Booking Platform

## Database Schema (Firestore)

### Collection: `users`
```typescript
interface User {
  uid: string;                    // Firebase Auth UID
  name: string;                   // Full name
  email: string;                  // Email address
  nationalId: string;             // National Identity Number
  profileImageUrl: string;        // Firebase Storage URL
  acceptedTerms: boolean;         // Terms acceptance
  role: 'user' | 'admin';         // Role-based access
  emailVerified: boolean;         // Email verification status
  createdAt: Timestamp;           // Account creation time
}
```

### Collection: `bookings`
```typescript
interface Booking {
  id: string;                     // Auto-generated ID
  userId: string;                 // Reference to users.uid
  userName: string;               // Denormalized for admin view
  userEmail: string;              // Denormalized for admin view
  startTime: Timestamp;           // Server timestamp when payment succeeds
  endTime: Timestamp;             // startTime + 24 hours (calculated)
  deliveryOption: 'pickup' | 'delivery';
  deliveryLocation?: string;      // For dispatch delivery
  baseAmount: number;             // Base price (e.g., 5000)
  deliveryFee: number;            // 0 for pickup, 1000 for delivery
  totalAmount: number;            // baseAmount + deliveryFee
  paymentStatus: 'pending' | 'paid' | 'failed';
  paystackReference: string;      // Payment reference
  bookingStatus: 'active' | 'completed' | 'cancelled';
  createdAt: Timestamp;           // Server timestamp
  updatedAt: Timestamp;           // Server timestamp
}
```

### Collection: `adminNotifications`
```typescript
interface AdminNotification {
  id: string;                     // Auto-generated ID
  type: 'new_booking' | 'payment_received' | 'booking_expired';
  bookingId: string;              // Reference to bookings.id
  userId: string;                 // Reference to users.uid
  userName: string;               // Denormalized
  message: string;                // Human-readable notification
  read: boolean;                  // Read status
  createdAt: Timestamp;           // Server timestamp
}
```

### Collection: `timerState` (Server-persistent timer)
```typescript
interface TimerState {
  userId: string;                 // Reference to users.uid
  bookingId: string;              // Reference to bookings.id
  startTime: Timestamp;           // Server timestamp
  endTime: Timestamp;             // startTime + 24 hours
  isActive: boolean;              // Timer active status
  updatedAt: Timestamp;           // Server timestamp
}
```

## Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read: if request.auth != null && (request.auth.uid == userId || request.auth.token.role == 'admin');
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can only read/write their own bookings
    match /bookings/{bookingId} {
      allow read: if request.auth != null && (resource.data.userId == request.auth.uid || request.auth.token.role == 'admin');
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update: if request.auth != null && (resource.data.userId == request.auth.uid || request.auth.token.role == 'admin');
    }
    
    // Only admins can read adminNotifications
    match /adminNotifications/{notificationId} {
      allow read: if request.auth != null && request.auth.token.role == 'admin';
      allow create: if request.auth != null;
      allow update: if request.auth != null && request.auth.token.role == 'admin';
    }
    
    // Timer state - users own theirs, admins see all
    match /timerState/{timerId} {
      allow read: if request.auth != null && (resource.data.userId == request.auth.uid || request.auth.token.role == 'admin');
      allow create, update: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
  }
}
```

## Pages & Routes

### 1. Authentication Pages
- `/login` - Login with email/password
- `/register` - Registration with profile picture upload

### 2. User Dashboard (`/dashboard`)
Three-column layout:
- **Left Sidebar**: Device History (collection date, return date)
- **Center**: 24-hour countdown timer (server-persistent)
- **Right Header**: User profile image and name
- **Action**: "Book Solar Generator" button → confirmation → booking flow

### 3. Booking Flow (`/booking`)
- Delivery option selection (Pickup vs Delivery)
- Dynamic price calculation
- Paystack payment integration
- Success → starts timer, updates admin

### 4. Admin Dashboard (`/admin`) - PROTECTED
- All users table
- All bookings with payment status
- Delivery/pickup preferences
- Admin notifications

## Color Palette
- Background: `#1a1a2e` (dark navy)
- Card Background: `#16213e` (slightly lighter navy)
- Accent: `#0f3460` (deep blue)
- Highlight: `#e94560` (coral red for CTAs)
- Text Primary: `#ffffff` (white)
- Text Secondary: `#a0a0a0` (gray)
- Success: `#4ade80` (green)
- Warning: `#fbbf24` (amber)

## Typography
- Primary Font: Inter (sans-serif)
- Headings: Bold 700
- Body: Regular 400
- Timer: Monospace (JetBrains Mono or similar)

## Component Structure

### Layout Components
- `AppLayout` - Main layout with header
- `Header` - Top bar with profile
- `Sidebar` - Navigation sidebar

### Auth Components
- `LoginForm` - Email/password login
- `RegisterForm` - Full registration with image upload
- `EmailVerification` - Verification sent screen

### Dashboard Components
- `UsageSection` - Left sidebar with device history
- `CountdownTimer` - Center timer display
- `BookingButton` - CTA to start booking
- `UserProfile` - Top right profile display

### Booking Components
- `BookingForm` - Delivery option selection
- `PaystackPayment` - Payment integration
- `ConfirmationModal` - Booking confirmation

### Admin Components
- `AdminLayout` - Admin-specific layout
- `UsersTable` - All users list
- `BookingsTable` - All bookings with filters
- `StatsCards` - KPI overview

## Firebase Configuration (Client-Side)
```typescript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
```

## Payment Flow (Paystack)
1. User selects delivery option
2. Calculate total (base + delivery fee)
3. Initialize Paystack transaction
4. On success callback:
   - Create booking document with serverTimestamp()
   - Create timerState document
   - Create admin notification
   - Redirect to dashboard with active timer
5. On cancel/failure:
   - Show error message
   - Allow retry

## Timer Implementation (Server-Side)
1. When payment succeeds, write startTime as `serverTimestamp()`
2. Calculate endTime as startTime + 24 hours
3. Timer component reads from Firestore every 30 seconds
4. Display countdown: HH:MM:SS
5. When timer reaches 0, update bookingStatus to 'completed'
6. Security: Using server timestamp prevents client clock manipulation

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import {
  db,
  query,
  where,
  collection,
  onSnapshot,
  Timestamp,
} from '@/lib/firebase';
import type { Booking } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Zap,
  Clock,
  Calendar,
  Package,
  Truck,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  History,
} from 'lucide-react';

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ hours: 0, minutes: 0, seconds: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  // Fetch user's bookings
  useEffect(() => {
    if (!currentUser) return;

    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      const bookingsData: Booking[] = [];
      snapshot.forEach((doc) => {
        bookingsData.push({ id: doc.id, ...doc.data() } as Booking);
      });
      // Sort by createdAt desc
      bookingsData.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      setBookings(bookingsData);

      // Find active booking
      const active = bookingsData.find((b) => b.bookingStatus === 'active');
      setActiveBooking(active || null);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser]);

  // Timer countdown logic - reads from Firestore server timestamps
  const calculateTimeLeft = useCallback(() => {
    if (!activeBooking?.endTime) {
      return { hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    const now = Date.now();
    const endTime = (activeBooking.endTime as Timestamp).toMillis();
    const diff = endTime - now;

    if (diff <= 0) {
      return { hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { hours, minutes, seconds, total: diff };
  }, [activeBooking]);

  useEffect(() => {
    if (!activeBooking) return;

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [activeBooking, calculateTimeLeft]);

  const formatDate = (timestamp: Timestamp | null) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-NG', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'completed':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400 bg-green-400/10';
      case 'completed':
        return 'text-gray-400 bg-gray-400/10';
      case 'cancelled':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-yellow-400 bg-yellow-400/10';
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Banner */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back,{' '}
            <span className="text-[#e94560]">
              {currentUser?.displayName || 'User'}
            </span>
          </h1>
          <p className="text-gray-400">
            Manage your solar generator bookings and track your usage.
          </p>
        </div>

        {/* Main 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Usage Section (Device History) */}
          <div className="lg:col-span-3">
            <Card className="bg-[#16213e] border-[#0f3460]/50 h-full">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-[#e94560]" />
                  Usage History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-[#e94560] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No bookings yet</p>
                    <p className="text-gray-600 text-xs mt-1">
                      Your booking history will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="p-3 rounded-lg bg-[#1a1a2e] border border-[#0f3460]/30 hover:border-[#0f3460]/60 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              booking.bookingStatus
                            )}`}
                          >
                            {getStatusIcon(booking.bookingStatus)}
                            {booking.bookingStatus.charAt(0).toUpperCase() +
                              booking.bookingStatus.slice(1)}
                          </span>
                          <span className="text-xs text-gray-500">
                            ₦{booking.totalAmount?.toLocaleString()}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Calendar className="w-3 h-3" />
                            <span>Collect: {formatDate(booking.startTime)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>Return: {formatDate(booking.endTime)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            {booking.deliveryOption === 'pickup' ? (
                              <>
                                <Package className="w-3 h-3" />
                                <span>Office Pickup</span>
                              </>
                            ) : (
                              <>
                                <Truck className="w-3 h-3" />
                                <span>Delivery (+₦1,000)</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Center Column - Timer */}
          <div className="lg:col-span-6">
            <Card className="bg-[#16213e] border-[#0f3460]/50 h-full">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-lg font-semibold text-white flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5 text-[#e94560]" />
                  Active Timer
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center min-h-[400px]">
                {activeBooking ? (
                  <div className="text-center">
                    {/* Timer Display */}
                    <div className="mb-8">
                      <div className="flex items-center justify-center gap-4 mb-6">
                        {/* Hours */}
                        <div className="flex flex-col items-center">
                          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-[#1a1a2e] border-2 border-[#0f3460] flex items-center justify-center shadow-xl">
                            <span className="font-mono-timer text-4xl sm:text-5xl font-bold text-white">
                              {String(timeLeft.hours).padStart(2, '0')}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500 mt-2 font-medium">HOURS</span>
                        </div>

                        <span className="text-4xl sm:text-5xl font-bold text-[#e94560] -mt-6">:</span>

                        {/* Minutes */}
                        <div className="flex flex-col items-center">
                          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-[#1a1a2e] border-2 border-[#0f3460] flex items-center justify-center shadow-xl">
                            <span className="font-mono-timer text-4xl sm:text-5xl font-bold text-white">
                              {String(timeLeft.minutes).padStart(2, '0')}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500 mt-2 font-medium">MINUTES</span>
                        </div>

                        <span className="text-4xl sm:text-5xl font-bold text-[#e94560] -mt-6">:</span>

                        {/* Seconds */}
                        <div className="flex flex-col items-center">
                          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-[#1a1a2e] border-2 border-[#0f3460] flex items-center justify-center shadow-xl">
                            <span className="font-mono-timer text-4xl sm:text-5xl font-bold text-[#e94560]">
                              {String(timeLeft.seconds).padStart(2, '0')}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500 mt-2 font-medium">SECONDS</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full max-w-md mx-auto">
                        <div className="h-2 bg-[#1a1a2e] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#e94560] to-[#ff6b81] rounded-full transition-all duration-1000"
                            style={{
                              width: `${
                                activeBooking.startTime && activeBooking.endTime
                                  ? Math.max(
                                      0,
                                      Math.min(
                                        100,
                                        (timeLeft.total /
                                          ((activeBooking.endTime as Timestamp).toMillis() -
                                            (activeBooking.startTime as Timestamp).toMillis())) *
                                          100
                                      )
                                    )
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-gray-500">
                          <span>Started: {formatDate(activeBooking.startTime)}</span>
                          <span>Ends: {formatDate(activeBooking.endTime)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Booking Info */}
                    <div className="p-4 rounded-xl bg-[#1a1a2e] border border-[#0f3460]/30 inline-block">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          {activeBooking.deliveryOption === 'pickup' ? (
                            <Package className="w-4 h-4 text-[#e94560]" />
                          ) : (
                            <Truck className="w-4 h-4 text-[#e94560]" />
                          )}
                          <span className="text-gray-300">
                            {activeBooking.deliveryOption === 'pickup'
                              ? 'Office Pickup'
                              : 'Dispatch Delivery'}
                          </span>
                        </div>
                        <div className="w-px h-4 bg-[#0f3460]" />
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-gray-300">{activeBooking.paymentStatus}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-[#1a1a2e] border-2 border-[#0f3460] flex items-center justify-center mx-auto mb-6">
                      <Clock className="w-12 h-12 text-gray-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No Active Booking</h3>
                    <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                      You don't have an active solar generator rental. Book one now to get started.
                    </p>
                    <Button
                      onClick={() => navigate('/booking')}
                      className="bg-[#e94560] hover:bg-[#d63d56] text-white font-semibold px-8 py-6 rounded-lg transition-all hover-glow"
                    >
                      <Zap className="w-5 h-5 mr-2" />
                      Book Solar Generator
                      <ChevronRight className="w-5 h-5 ml-1" />
                    </Button>
                  </div>
                )}

                {/* Show Book Button even with active booking */}
                {activeBooking && (
                  <div className="mt-8">
                    <p className="text-sm text-gray-500 mb-4">
                      Need another generator? You can book again after this rental ends.
                    </p>
                    <Button
                      disabled
                      variant="outline"
                      className="border-[#0f3460] text-gray-500 cursor-not-allowed"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      New Booking (Unavailable)
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quick Actions & Info */}
          <div className="lg:col-span-3 space-y-6">
            {/* Quick Actions */}
            <Card className="bg-[#16213e] border-[#0f3460]/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => navigate('/booking')}
                  disabled={!!activeBooking}
                  className={`w-full font-semibold py-5 rounded-lg transition-all ${
                    activeBooking
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-[#e94560] hover:bg-[#d63d56] text-white hover-glow'
                  }`}
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Book Generator
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  className="w-full border-[#0f3460] text-gray-300 hover:bg-[#0f3460]/30 hover:text-white py-5"
                >
                  <History className="w-4 h-4 mr-2" />
                  View History
                </Button>
              </CardContent>
            </Card>

            {/* How It Works */}
            <Card className="bg-[#16213e] border-[#0f3460]/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-white">How It Works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { step: '1', title: 'Book', desc: 'Choose pickup or delivery' },
                    { step: '2', title: 'Pay', desc: 'Secure payment via Paystack' },
                    { step: '3', title: 'Collect', desc: 'Get your solar generator' },
                    { step: '4', title: 'Return', desc: 'Return within 24 hours' },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#e94560]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-[#e94560]">{item.step}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card className="bg-[#16213e] border-[#0f3460]/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-white">Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-400">
                  <p>Pickup Location:</p>
                  <p className="text-white font-medium">
                    Opposite Federal Polytechnic Oko Main Gate
                  </p>
                  <p className="pt-2">Delivery fee: ₦1,000</p>
                  <p className="text-[#e94560]">Rental duration: 24 hours</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

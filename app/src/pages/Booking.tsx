import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import {
  db,
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
} from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Zap,
  Package,
  Truck,
  MapPin,
  ChevronLeft,
  Loader2,
  CreditCard,
  Shield,
  Clock,
} from 'lucide-react';

// Load Paystack script
const loadPaystackScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).PaystackPop) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Paystack'));
    document.body.appendChild(script);
  });
};

export default function Booking() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [deliveryOption, setDeliveryOption] = useState<'pickup' | 'delivery'>('pickup');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookingData, setBookingData] = useState<any>(null);

  const BASE_AMOUNT = 5000;
  const DELIVERY_FEE = 1000;

  const totalAmount = deliveryOption === 'pickup' ? BASE_AMOUNT : BASE_AMOUNT + DELIVERY_FEE;

  useEffect(() => {
    loadPaystackScript().catch(console.error);
  }, []);

  const handleProceed = () => {
    setShowConfirm(true);
  };

  const handleConfirmBooking = async () => {
    setShowConfirm(false);
    setLoading(true);

    try {
      // Initialize Paystack payment
      const handler = (window as any).PaystackPop.setup({
        key: 'pk_test_demo_key_for_development',
        email: currentUser?.email || 'user@example.com',
        amount: totalAmount * 100, // Paystack uses kobo
        currency: 'NGN',
        ref: `SOLGEN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        metadata: {
          custom_fields: [
            {
              display_name: 'Delivery Option',
              variable_name: 'delivery_option',
              value: deliveryOption,
            },
            {
              display_name: 'Base Amount',
              variable_name: 'base_amount',
              value: BASE_AMOUNT,
            },
          ],
        },
        callback: async (response: any) => {
          // Payment successful - create booking with server timestamp
          await createBooking(response.reference);
        },
        onClose: () => {
          setLoading(false);
        },
      });

      handler.openIframe();
    } catch (error) {
      console.error('Payment error:', error);
      setLoading(false);
    }
  };

  const createBooking = async (paystackReference: string) => {
    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const now = Timestamp.now();
      const endTime = new Timestamp(now.seconds + 24 * 60 * 60, now.nanoseconds);

      const booking = {
        userId: currentUser?.uid,
        userName: userData.name || currentUser?.displayName || 'User',
        userEmail: currentUser?.email,
        startTime: serverTimestamp(),
        endTime: serverTimestamp(), // We'll calculate this on the client for display
        deliveryOption,
        deliveryLocation:
          deliveryOption === 'pickup'
            ? 'Opposite Federal Polytechnic Oko Main Gate'
            : 'User provided address',
        baseAmount: BASE_AMOUNT,
        deliveryFee: deliveryOption === 'pickup' ? 0 : DELIVERY_FEE,
        totalAmount,
        paymentStatus: 'paid',
        paystackReference,
        bookingStatus: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'bookings'), booking);

      // Create timer state document with explicit timestamps
      const timerState = {
        userId: currentUser?.uid,
        bookingId: docRef.id,
        startTime: serverTimestamp(),
        endTime: serverTimestamp(), // 24 hours from now
        isActive: true,
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'timerState'), timerState);

      // Create admin notification
      const notification = {
        type: 'new_booking',
        bookingId: docRef.id,
        userId: currentUser?.uid,
        userName: userData.name || currentUser?.displayName || 'User',
        message: `New booking: ${userData.name || 'User'} booked a solar generator with ${deliveryOption} option`,
        read: false,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'adminNotifications'), notification);

      setBookingData({
        id: docRef.id,
        ...booking,
        startTime: now,
        endTime: endTime,
      });

      setShowSuccess(true);
      setLoading(false);
    } catch (error) {
      console.error('Booking creation error:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Book a Solar Generator</h1>
          <p className="text-gray-400">Choose your preferred collection method and complete payment.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Booking Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Options */}
            <Card className="bg-[#16213e] border-[#0f3460]/50">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#e94560]" />
                  Collection Method
                </CardTitle>
                <CardDescription className="text-gray-400">
                  How would you like to receive your solar generator?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={deliveryOption}
                  onValueChange={(value) => setDeliveryOption(value as 'pickup' | 'delivery')}
                  className="space-y-4"
                >
                  {/* Pickup Option */}
                  <div
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      deliveryOption === 'pickup'
                        ? 'border-[#e94560] bg-[#e94560]/5'
                        : 'border-[#0f3460] hover:border-[#0f3460]/80'
                    }`}
                    onClick={() => setDeliveryOption('pickup')}
                  >
                    <RadioGroupItem value="pickup" id="pickup" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="pickup" className="text-white font-semibold cursor-pointer">
                          Office Pickup
                        </Label>
                        <span className="text-green-400 font-semibold text-sm">FREE</span>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">
                        Pick up your solar generator at our office location.
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin className="w-4 h-4 text-[#e94560]" />
                        Opposite Federal Polytechnic Oko Main Gate
                      </div>
                    </div>
                    <Package className="w-8 h-8 text-gray-600 flex-shrink-0" />
                  </div>

                  {/* Delivery Option */}
                  <div
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      deliveryOption === 'delivery'
                        ? 'border-[#e94560] bg-[#e94560]/5'
                        : 'border-[#0f3460] hover:border-[#0f3460]/80'
                    }`}
                    onClick={() => setDeliveryOption('delivery')}
                  >
                    <RadioGroupItem value="delivery" id="delivery" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="delivery" className="text-white font-semibold cursor-pointer">
                          Dispatch Delivery
                        </Label>
                        <span className="text-[#e94560] font-semibold text-sm">+₦1,000</span>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">
                        We'll deliver the solar generator to your specified address.
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Truck className="w-4 h-4 text-[#e94560]" />
                        Delivery within 24 hours of booking
                      </div>
                    </div>
                    <Truck className="w-8 h-8 text-gray-600 flex-shrink-0" />
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Booking Summary */}
            <Card className="bg-[#16213e] border-[#0f3460]/50">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#e94560]" />
                  Booking Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Base Rental Fee (24 hours)</span>
                    <span className="text-white">₦{BASE_AMOUNT.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">
                      Delivery Fee ({deliveryOption === 'pickup' ? 'Free Pickup' : 'Dispatch'})
                    </span>
                    <span className={deliveryOption === 'pickup' ? 'text-green-400' : 'text-white'}>
                      {deliveryOption === 'pickup' ? 'FREE' : `₦${DELIVERY_FEE.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="h-px bg-[#0f3460] my-3" />
                  <div className="flex justify-between">
                    <span className="text-white font-semibold">Total Amount</span>
                    <span className="text-2xl font-bold text-[#e94560]">
                      ₦{totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Button */}
            <Button
              onClick={handleProceed}
              disabled={loading}
              className="w-full bg-[#e94560] hover:bg-[#d63d56] text-white font-semibold py-6 rounded-lg transition-all hover-glow text-lg"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Proceed to Payment
                </span>
              )}
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <Shield className="w-4 h-4" />
              Secured by Paystack. Your payment information is encrypted.
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <Card className="bg-[#16213e] border-[#0f3460]/50">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white">Rental Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#e94560] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white">Duration</p>
                    <p className="text-xs text-gray-400">24 hours from collection time</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-[#e94560] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white">What's Included</p>
                    <p className="text-xs text-gray-400">Solar generator unit, charging cables</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#e94560] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white">Pickup Location</p>
                    <p className="text-xs text-gray-400">Opposite Federal Polytechnic Oko Main Gate</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-[#e94560] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white">Power Output</p>
                    <p className="text-xs text-gray-400">500W continuous power supply</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trust Badges */}
            <Card className="bg-[#16213e] border-[#0f3460]/50">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-[#1a1a2e]">
                    <Shield className="w-6 h-6 text-green-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Secure Payment</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#1a1a2e]">
                    <Clock className="w-6 h-6 text-[#e94560] mx-auto mb-2" />
                    <p className="text-xs text-gray-400">24h Rental</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#1a1a2e]">
                    <Truck className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Fast Delivery</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#1a1a2e]">
                    <Zap className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">500W Power</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="bg-[#16213e] border-[#0f3460] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">Confirm Booking</DialogTitle>
            <DialogDescription className="text-gray-400 text-center">
              You are booking a solar generator for a 24-hour duration.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-xl bg-[#1a1a2e] border border-[#0f3460] space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Collection Method</span>
                <span className="text-white font-medium">
                  {deliveryOption === 'pickup' ? 'Office Pickup (Free)' : 'Dispatch Delivery'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Duration</span>
                <span className="text-white font-medium">24 Hours</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total Amount</span>
                <span className="text-[#e94560] font-bold">₦{totalAmount.toLocaleString()}</span>
              </div>
            </div>
            <p className="text-sm text-gray-400 text-center">
              Do you wish to proceed with the payment?
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              className="flex-1 border-[#0f3460] text-gray-300 hover:bg-[#0f3460]/30"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBooking}
              className="flex-1 bg-[#e94560] hover:bg-[#d63d56] text-white"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pay Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="bg-[#16213e] border-[#0f3460] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center text-green-400">
              Payment Successful!
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-center">
              Your booking has been confirmed and the 24-hour timer has started.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-20 h-20 rounded-full bg-green-400/10 flex items-center justify-center">
              <Zap className="w-10 h-10 text-green-400" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-white font-medium">Booking Reference</p>
              <p className="text-2xl font-mono-timer text-[#e94560]">
                {bookingData?.paystackReference?.slice(0, 20)}...
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#1a1a2e] border border-[#0f3460] w-full">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Collection</span>
                <span className="text-white">
                  {deliveryOption === 'pickup' ? 'Office Pickup' : 'Dispatch Delivery'}
                </span>
              </div>
            </div>
          </div>
          <Button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-[#e94560] hover:bg-[#d63d56] text-white"
          >
            Go to Dashboard
            <ChevronLeft className="w-4 h-4 ml-2 rotate-180" />
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

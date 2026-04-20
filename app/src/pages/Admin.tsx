import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  db,
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from '@/lib/firebase';
import type { Booking, UserData, AdminNotification } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Users,
  ShoppingCart,
  Bell,
  TrendingUp,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function Admin() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBookings: 0,
    activeBookings: 0,
    totalRevenue: 0,
    pickupCount: 0,
    deliveryCount: 0,
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData: UserData[] = [];
      usersSnapshot.forEach((doc) => {
        usersData.push({ uid: doc.id, ...doc.data() } as UserData);
      });
      setUsers(usersData);

      // Fetch bookings
      const bookingsQuery = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookingsData: Booking[] = [];
      bookingsSnapshot.forEach((doc) => {
        bookingsData.push({ id: doc.id, ...doc.data() } as Booking);
      });
      setBookings(bookingsData);

      // Fetch notifications
      const notifQuery = query(collection(db, 'adminNotifications'), orderBy('createdAt', 'desc'));
      const notifSnapshot = await getDocs(notifQuery);
      const notifData: AdminNotification[] = [];
      notifSnapshot.forEach((doc) => {
        notifData.push({ id: doc.id, ...doc.data() } as AdminNotification);
      });
      setNotifications(notifData);

      // Calculate stats
      const activeBookings = bookingsData.filter((b) => b.bookingStatus === 'active');
      const totalRevenue = bookingsData
        .filter((b) => b.paymentStatus === 'paid')
        .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      const pickupCount = bookingsData.filter((b) => b.deliveryOption === 'pickup').length;
      const deliveryCount = bookingsData.filter((b) => b.deliveryOption === 'delivery').length;

      setStats({
        totalUsers: usersData.length,
        totalBookings: bookingsData.length,
        activeBookings: activeBookings.length,
        totalRevenue,
        pickupCount,
        deliveryCount,
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: Timestamp | null) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-400/10 text-green-400 hover:bg-green-400/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-gray-400/10 text-gray-400 hover:bg-gray-400/20">
            <Clock className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-400/10 text-red-400 hover:bg-red-400/20">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20">
            <AlertCircle className="w-3 h-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-400/10 text-green-400 hover:bg-green-400/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Paid
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-400/10 text-red-400 hover:bg-red-400/20">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
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
          <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">Manage users, bookings, and monitor platform activity.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-[#e94560] animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="bg-[#16213e] border-[#0f3460]/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Total Users</p>
                      <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-400/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#16213e] border-[#0f3460]/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Total Bookings</p>
                      <p className="text-2xl font-bold text-white">{stats.totalBookings}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-[#e94560]/10 flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-[#e94560]" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#16213e] border-[#0f3460]/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Active Rentals</p>
                      <p className="text-2xl font-bold text-green-400">{stats.activeBookings}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-green-400/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#16213e] border-[#0f3460]/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Total Revenue</p>
                      <p className="text-2xl font-bold text-[#e94560]">
                        ₦{stats.totalRevenue.toLocaleString()}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-yellow-400/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-yellow-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Delivery Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <Card className="bg-[#16213e] border-[#0f3460]/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Office Pickups</p>
                      <p className="text-2xl font-bold text-white">{stats.pickupCount}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-purple-400/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#16213e] border-[#0f3460]/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Dispatch Deliveries</p>
                      <p className="text-2xl font-bold text-white">{stats.deliveryCount}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-orange-400/10 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-orange-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="bookings" className="space-y-6">
              <TabsList className="bg-[#16213e] border border-[#0f3460]/50">
                <TabsTrigger
                  value="bookings"
                  className="data-[state=active]:bg-[#e94560] data-[state=active]:text-white"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Bookings
                </TabsTrigger>
                <TabsTrigger
                  value="users"
                  className="data-[state=active]:bg-[#e94560] data-[state=active]:text-white"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Users
                </TabsTrigger>
                <TabsTrigger
                  value="notifications"
                  className="data-[state=active]:bg-[#e94560] data-[state=active]:text-white"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Notifications
                </TabsTrigger>
              </TabsList>

              {/* Bookings Tab */}
              <TabsContent value="bookings">
                <Card className="bg-[#16213e] border-[#0f3460]/50">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-white">
                      All Bookings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {bookings.length === 0 ? (
                      <div className="text-center py-12">
                        <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500">No bookings yet</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-[#0f3460]">
                              <TableHead className="text-gray-400">User</TableHead>
                              <TableHead className="text-gray-400">Option</TableHead>
                              <TableHead className="text-gray-400">Amount</TableHead>
                              <TableHead className="text-gray-400">Payment</TableHead>
                              <TableHead className="text-gray-400">Status</TableHead>
                              <TableHead className="text-gray-400">Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {bookings.map((booking) => (
                              <TableRow key={booking.id} className="border-[#0f3460]/50">
                                <TableCell className="text-white font-medium">
                                  {booking.userName}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {booking.deliveryOption === 'pickup' ? (
                                      <>
                                        <Package className="w-4 h-4 text-purple-400" />
                                        <span className="text-gray-300 text-sm">Pickup</span>
                                      </>
                                    ) : (
                                      <>
                                        <Truck className="w-4 h-4 text-orange-400" />
                                        <span className="text-gray-300 text-sm">Delivery</span>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-white">
                                  ₦{booking.totalAmount?.toLocaleString()}
                                </TableCell>
                                <TableCell>{getPaymentBadge(booking.paymentStatus)}</TableCell>
                                <TableCell>{getStatusBadge(booking.bookingStatus)}</TableCell>
                                <TableCell className="text-gray-400 text-sm">
                                  {formatDate(booking.createdAt)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Users Tab */}
              <TabsContent value="users">
                <Card className="bg-[#16213e] border-[#0f3460]/50">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-white">All Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {users.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500">No users registered yet</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-[#0f3460]">
                              <TableHead className="text-gray-400">Name</TableHead>
                              <TableHead className="text-gray-400">Email</TableHead>
                              <TableHead className="text-gray-400">National ID</TableHead>
                              <TableHead className="text-gray-400">Role</TableHead>
                              <TableHead className="text-gray-400">Verified</TableHead>
                              <TableHead className="text-gray-400">Joined</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {users.map((user) => (
                              <TableRow key={user.uid} className="border-[#0f3460]/50">
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    {user.profileImageUrl ? (
                                      <img
                                        src={user.profileImageUrl}
                                        alt={user.name}
                                        className="w-8 h-8 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-[#0f3460] flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">
                                          {user.name?.charAt(0)?.toUpperCase()}
                                        </span>
                                      </div>
                                    )}
                                    <span className="text-white font-medium">{user.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-gray-300">{user.email}</TableCell>
                                <TableCell className="text-gray-300 font-mono text-sm">
                                  {user.nationalId}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={
                                      user.role === 'admin'
                                        ? 'bg-[#e94560]/10 text-[#e94560]'
                                        : 'bg-blue-400/10 text-blue-400'
                                    }
                                  >
                                    {user.role}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {user.emailVerified ? (
                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                  ) : (
                                    <XCircle className="w-5 h-5 text-red-400" />
                                  )}
                                </TableCell>
                                <TableCell className="text-gray-400 text-sm">
                                  {formatDate(user.createdAt)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications">
                <Card className="bg-[#16213e] border-[#0f3460]/50">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-white">
                      Admin Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {notifications.length === 0 ? (
                      <div className="text-center py-12">
                        <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500">No notifications yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 rounded-xl border transition-all ${
                              notification.read
                                ? 'bg-[#1a1a2e] border-[#0f3460]/30'
                                : 'bg-[#e94560]/5 border-[#e94560]/20'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  notification.type === 'new_booking'
                                    ? 'bg-[#e94560]/10'
                                    : notification.type === 'payment_received'
                                    ? 'bg-green-400/10'
                                    : 'bg-yellow-400/10'
                                }`}
                              >
                                {notification.type === 'new_booking' ? (
                                  <ShoppingCart className="w-4 h-4 text-[#e94560]" />
                                ) : notification.type === 'payment_received' ? (
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                ) : (
                                  <Clock className="w-4 h-4 text-yellow-400" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-white">{notification.message}</p>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="text-xs text-gray-500">
                                    From: {notification.userName}
                                  </span>
                                  <span className="text-xs text-gray-600">
                                    {formatDate(notification.createdAt)}
                                  </span>
                                </div>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 rounded-full bg-[#e94560] flex-shrink-0 mt-1" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}

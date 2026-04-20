import { Outlet, useNavigate, useLocation } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User, Shield, Zap } from 'lucide-react';

export default function Layout() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const userData = localStorage.getItem('userData');
  const parsedUser = userData ? JSON.parse(userData) : null;
  const isAdmin = parsedUser?.role === 'admin';

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('userData');
    navigate('/login');
  };

  // Don't show layout on auth pages
  if (location.pathname === '/login' || location.pathname === '/register') {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#16213e]/95 backdrop-blur-md border-b border-[#0f3460]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate('/dashboard')}
            >
              <div className="w-9 h-9 rounded-lg bg-coral flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                Solar<span className="text-[#e94560]">Gen</span>
              </span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => navigate('/dashboard')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  location.pathname === '/dashboard'
                    ? 'bg-[#e94560]/20 text-[#e94560]'
                    : 'text-gray-300 hover:text-white hover:bg-[#0f3460]/50'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/booking')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  location.pathname === '/booking'
                    ? 'bg-[#e94560]/20 text-[#e94560]'
                    : 'text-gray-300 hover:text-white hover:bg-[#0f3460]/50'
                }`}
              >
                Book Now
              </button>
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    location.pathname === '/admin'
                      ? 'bg-[#e94560]/20 text-[#e94560]'
                      : 'text-gray-300 hover:text-white hover:bg-[#0f3460]/50'
                  }`}
                >
                  Admin
                </button>
              )}
            </nav>

            {/* User Profile - Top Right */}
            <div className="flex items-center gap-3">
              {currentUser && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-3 px-3 py-1.5 rounded-full hover:bg-[#0f3460]/50 transition-all">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-white">
                          {parsedUser?.name || currentUser.displayName || 'User'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {isAdmin ? 'Administrator' : 'Member'}
                        </p>
                      </div>
                      <Avatar className="w-9 h-9 border-2 border-[#e94560]/30">
                        <AvatarImage
                          src={parsedUser?.profileImageUrl || currentUser.photoURL || ''}
                          alt={parsedUser?.name || 'User'}
                        />
                        <AvatarFallback className="bg-[#0f3460] text-white text-sm">
                          {(parsedUser?.name || currentUser.displayName || 'U')
                            .charAt(0)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 bg-[#16213e] border-[#0f3460]"
                  >
                    <div className="px-3 py-2 border-b border-[#0f3460]">
                      <p className="text-sm font-medium text-white">
                        {parsedUser?.name || currentUser.displayName || 'User'}
                      </p>
                      <p className="text-xs text-gray-400">{currentUser.email}</p>
                    </div>
                    {isAdmin && (
                      <DropdownMenuItem
                        onClick={() => navigate('/admin')}
                        className="text-gray-300 focus:text-white focus:bg-[#0f3460] cursor-pointer"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Admin Dashboard
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => navigate('/dashboard')}
                      className="text-gray-300 focus:text-white focus:bg-[#0f3460] cursor-pointer"
                    >
                      <User className="w-4 h-4 mr-2" />
                      My Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#0f3460]" />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-[#e94560] focus:text-[#e94560] focus:bg-[#e94560]/10 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}

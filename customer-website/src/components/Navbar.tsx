import { useAuth } from '@/context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, UtensilsCrossed, Mic, ClipboardList } from 'lucide-react';
import { useCart } from '@/hooks/useCart';

const NAV_ITEMS = [
  { to: '/', label: 'Menu', icon: UtensilsCrossed },
  { to: '/cart', label: 'Cart', icon: ShoppingCart },
  { to: '/voice', label: 'Voice Order', icon: Mic },
  { to: '/orders', label: 'My Orders', icon: ClipboardList },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Top navbar */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-zomato-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-4 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold">
              R
            </div>
            <span className="text-[15px] font-bold text-zomato-dark hidden sm:block">
              RestroAI
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-zomato-gray hover:text-zomato-dark hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {to === '/cart' && totalItems > 0 && (
                    <span className="bg-primary text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
                      {totalItems}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile cart badge */}
            <Link
              to="/cart"
              className="relative sm:hidden flex items-center text-zomato-dark hover:text-primary transition-colors"
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
                  {totalItems}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-zomato-gray hidden sm:block">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-gray-100 text-zomato-gray hover:text-primary transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
              >
                <User className="h-4 w-4" /> Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-zomato-border bg-white">
        <div className="flex justify-around py-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors ${
                  active ? 'text-primary' : 'text-zomato-gray'
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

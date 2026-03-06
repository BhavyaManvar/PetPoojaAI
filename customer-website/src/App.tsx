import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import MenuPage from '@/pages/Menu';
import LoginPage from '@/pages/Login';
import SignupPage from '@/pages/Signup';
import CheckoutPage from '@/pages/Checkout';
import OrdersPage from '@/pages/Orders';
import VoiceOrderPage from '@/pages/VoiceOrder';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main className="pb-16 sm:pb-0">
          <Routes>
            <Route path="/" element={<MenuPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/cart" element={<CheckoutPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/voice" element={<VoiceOrderPage />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}

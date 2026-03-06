import { useState } from 'react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { API, fetchJSON } from '@/lib/api';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, Minus, Plus, Trash2 } from 'lucide-react';

export default function CheckoutPage() {
  const { cart, addItem, removeItem, clearCart, totalAmount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<number | null>(null);
  const [error, setError] = useState('');

  const formatPrice = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const tax = Math.round(totalAmount * 0.05);
  const grandTotal = totalAmount + tax;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (cart.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetchJSON<{ order_id: number }>(API.orderPush, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((c) => ({ item_id: c.item_id, qty: c.qty })),
          order_source: 'online',
        }),
      });
      setOrderPlaced(res.order_id);
      clearCart();
    } catch {
      setError('Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (orderPlaced !== null) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-2xl shadow-card p-8 max-w-md w-full text-center"
        >
          <CheckCircle className="h-16 w-16 text-zomato-green mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-zomato-dark mb-2">Order Placed!</h2>
          <p className="text-zomato-gray mb-1">Order #{orderPlaced}</p>
          <p className="text-sm text-zomato-gray mb-6">Your food is being prepared</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-primary-600"
          >
            Back to Menu
          </Link>
        </motion.div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="bg-card rounded-2xl shadow-card p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-zomato-dark mb-2">Cart is empty</h2>
          <p className="text-zomato-gray text-sm mb-4">Add items from the menu first</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl text-sm font-semibold"
          >
            <ArrowLeft className="h-4 w-4" /> Browse Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-zomato-gray hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Menu
        </Link>

        <h1 className="text-2xl font-bold text-zomato-dark mb-6">Checkout</h1>

        <div className="grid gap-6 md:grid-cols-5">
          {/* Items */}
          <div className="md:col-span-3">
            <div className="bg-card rounded-2xl shadow-card p-5">
              <h3 className="font-semibold text-zomato-dark mb-4">Order Summary</h3>
              <div className="space-y-3">
                {cart.map((c) => (
                  <div key={c.item_id} className="flex items-center justify-between gap-3 pb-3 border-b border-zomato-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zomato-dark truncate">{c.item_name}</p>
                      <p className="text-xs text-zomato-gray">{formatPrice(c.price)} each</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => removeItem(c.item_id)} className="h-7 w-7 flex items-center justify-center rounded bg-gray-100">
                        {c.qty === 1 ? <Trash2 className="h-3.5 w-3.5 text-red-500" /> : <Minus className="h-3.5 w-3.5" />}
                      </button>
                      <span className="text-sm font-bold w-5 text-center">{c.qty}</span>
                      <button
                        onClick={() => addItem({ item_id: c.item_id, item_name: c.item_name, price: c.price })}
                        className="h-7 w-7 flex items-center justify-center rounded bg-primary text-white"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-sm font-semibold w-16 text-right">{formatPrice(c.price * c.qty)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="md:col-span-2">
            <form onSubmit={handlePlaceOrder} className="bg-card rounded-2xl shadow-card p-5">
              <h3 className="font-semibold text-zomato-dark mb-4">Your Details</h3>
              <div className="space-y-3 mb-4">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                  required
                  className="w-full rounded-lg border border-zomato-border px-4 py-3 text-sm outline-none focus:border-primary"
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone Number"
                  required
                  type="tel"
                  className="w-full rounded-lg border border-zomato-border px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="border-t border-zomato-border pt-4 space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-zomato-gray">Subtotal</span>
                  <span className="font-semibold">{formatPrice(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zomato-gray">Tax (5%)</span>
                  <span className="font-semibold">{formatPrice(tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-zomato-border">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(grandTotal)}</span>
                </div>
              </div>

              {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 mb-3">{error}</div>}

              {!user && (
                <div className="rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-700 mb-3">
                  Please <Link to="/login" className="font-semibold text-primary underline">sign in</Link> to place your order.
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !user}
                className="w-full bg-primary text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Placing Order...' : `Place Order — ${formatPrice(grandTotal)}`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

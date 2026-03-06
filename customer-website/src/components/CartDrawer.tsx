import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CartItem } from '@/hooks/useCart';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  addItem: (item: { item_id: number; item_name: string; price: number }) => void;
  removeItem: (itemId: number) => void;
  totalAmount: number;
}

export default function CartDrawer({ open, onClose, cart, addItem, removeItem, totalAmount }: CartDrawerProps) {
  const formatPrice = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card z-50 shadow-drawer flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-zomato-border">
              <h2 className="text-lg font-bold text-zomato-dark">Your Order</h2>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5 text-zomato-gray" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-zomato-gray">
                  <p>Cart is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((c) => (
                    <div key={c.item_id} className="flex items-center justify-between gap-3 pb-3 border-b border-zomato-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zomato-dark truncate">{c.item_name}</p>
                        <p className="text-xs text-zomato-gray">{formatPrice(c.price)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => removeItem(c.item_id)}
                          className="h-7 w-7 flex items-center justify-center rounded bg-gray-100 text-zomato-gray"
                        >
                          <Minus className="h-3.5 w-3.5" />
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
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-zomato-border p-5">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zomato-gray">Subtotal</span>
                  <span className="font-semibold">{formatPrice(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-zomato-gray">Tax (5%)</span>
                  <span className="font-semibold">{formatPrice(Math.round(totalAmount * 0.05))}</span>
                </div>
                <div className="flex justify-between text-lg font-bold mb-4">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(Math.round(totalAmount * 1.05))}</span>
                </div>
                <Link
                  to="/checkout"
                  onClick={onClose}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors"
                >
                  Proceed to Checkout <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

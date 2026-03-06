import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import { API, fetchJSON, formatCurrency } from '@/lib/api';
import { motion } from 'framer-motion';
import { Clock, Package, CheckCircle } from 'lucide-react';

interface OrderItem {
  item_id: number;
  item_name: string;
  qty: number;
  unit_price: number;
  line_total: number;
}

interface Order {
  order_id: number;
  total_price: number;
  status: string;
  order_source?: string;
  created_at?: string;
  items: OrderItem[];
}

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJSON<{ orders: Order[] }>(API.orderList(30))
      .then((data) => setOrders(data.orders))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-zomato-gray mb-4">Sign in to view your orders</p>
          <Link
            to="/login"
            className="bg-primary text-white px-6 py-3 rounded-xl text-sm font-semibold"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-zomato-dark mb-6">Your Orders</h1>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-2xl h-28 animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-zomato-gray">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No orders yet</p>
            <Link to="/" className="inline-block mt-4 text-primary text-sm font-semibold">
              Browse Menu &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order, i) => (
              <motion.div
                key={order.order_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl shadow-card p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zomato-dark">
                      Order #{order.order_id}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        order.status === 'completed'
                          ? 'bg-green-50 text-green-700'
                          : order.status === 'confirmed' || order.status === 'preparing'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-gray-100 text-zomato-gray'
                      }`}
                    >
                      {order.status === 'completed' ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      {order.status}
                    </span>
                  </div>
                  <p className="text-base font-bold text-primary">
                    {formatCurrency(order.total_price)}
                  </p>
                </div>

                {/* Item pills */}
                {order.items && order.items.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {order.items.map((item, idx) => (
                      <span
                        key={idx}
                        className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-zomato-dark"
                      >
                        {item.qty}x {item.item_name}
                        <span className="ml-1 text-zomato-gray">
                          {formatCurrency(item.line_total)}
                        </span>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-zomato-gray">
                  <span>{order.items?.length || 0} items</span>
                  <span>&middot;</span>
                  <span className="capitalize">{order.order_source || 'online'}</span>
                  {order.created_at && (
                    <>
                      <span>&middot;</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(order.created_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

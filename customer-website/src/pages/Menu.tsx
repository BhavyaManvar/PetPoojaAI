import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Minus, ShoppingCart, Leaf, Flame, X, ChevronRight, Settings2 } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import type { CartModifiers } from '@/hooks/useCart';
import { API, fetchJSON } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import CartDrawer from '@/components/CartDrawer';

interface MenuItem {
  item_id: number;
  item_name: string;
  category: string;
  price: number;
  is_veg: boolean;
  is_available: boolean;
  image_url: string;
}

interface MenuResponse {
  items: MenuItem[];
  categories: string[];
}

interface ModifiersData {
  sizes?: { name: string; price_add: number }[];
  spice_levels?: { name: string; price_add: number }[];
  addons?: { name: string; price_add: number }[];
}

// Cache modifiers per category
const modifierCache: Record<string, ModifiersData> = {};

async function fetchModifiers(category: string): Promise<ModifiersData> {
  if (modifierCache[category]) return modifierCache[category];
  try {
    const data = await fetchJSON<ModifiersData>(API.orderModifiers(category));
    modifierCache[category] = data;
    return data;
  } catch {
    return {};
  }
}

export default function MenuPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());
  const [cartOpen, setCartOpen] = useState(false);
  const [modifierItem, setModifierItem] = useState<MenuItem | null>(null);
  const [modData, setModData] = useState<ModifiersData>({});
  const [selSize, setSelSize] = useState('');
  const [selSpice, setSelSpice] = useState('');
  const [selAddons, setSelAddons] = useState<string[]>([]);
  const { cart, addItem, removeItem, totalItems, totalAmount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchJSON<MenuResponse>(API.menuItems())
      .then((data) => {
        setMenuItems(data.items);
        setCategories(['All', ...data.categories]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return menuItems.filter((item) => {
      const matchSearch = !search || item.item_name.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      return matchSearch && matchCat && item.is_available;
    });
  }, [menuItems, search, selectedCategory]);

  const getQty = (itemId: number) => cart.find((c) => c.item_id === itemId)?.qty || 0;

  const formatPrice = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  const openModifierModal = async (item: MenuItem) => {
    const mods = await fetchModifiers(item.category);
    if (mods.sizes || mods.spice_levels || mods.addons) {
      setModData(mods);
      setSelSize(mods.sizes?.[0]?.name || '');
      setSelSpice(mods.spice_levels?.[1]?.name || ''); // default Medium
      setSelAddons([]);
      setModifierItem(item);
    } else {
      // No modifiers — add directly
      addItem({
        item_id: item.item_id,
        item_name: item.item_name,
        price: item.price,
        image_url: item.image_url,
        category: item.category,
      });
    }
  };

  const addWithModifiers = () => {
    if (!modifierItem) return;
    const modifiers: CartModifiers = {};
    let modPrice = 0;
    if (selSize && modData.sizes) {
      modifiers.size = selSize;
      modPrice += modData.sizes.find((s) => s.name === selSize)?.price_add || 0;
    }
    if (selSpice && modData.spice_levels) {
      modifiers.spice = selSpice;
      modPrice += modData.spice_levels.find((s) => s.name === selSpice)?.price_add || 0;
    }
    if (selAddons.length > 0 && modData.addons) {
      modifiers.addons = selAddons;
      for (const a of selAddons) {
        modPrice += modData.addons.find((x) => x.name === a)?.price_add || 0;
      }
    }
    addItem({
      item_id: modifierItem.item_id,
      item_name: modifierItem.item_name,
      price: modifierItem.price,
      image_url: modifierItem.image_url,
      category: modifierItem.category,
      modifiers: Object.keys(modifiers).length > 0 ? modifiers : undefined,
      modifier_price: modPrice || undefined,
    });
    setModifierItem(null);
  };

  const toggleAddon = (name: string) => {
    setSelAddons((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  };

  const modExtraPrice = (() => {
    let p = 0;
    if (selSize && modData.sizes) p += modData.sizes.find((s) => s.name === selSize)?.price_add || 0;
    if (selSpice && modData.spice_levels) p += modData.spice_levels.find((s) => s.name === selSpice)?.price_add || 0;
    for (const a of selAddons) {
      p += modData.addons?.find((x) => x.name === a)?.price_add || 0;
    }
    return p;
  })();

  const fallbackImg = (itemName: string) => {
    const name = itemName.toLowerCase();
    const cat = name.includes('pizza') ? 'pizza'
      : name.includes('burger') ? 'burger'
      : name.includes('biryani') ? 'biryani'
      : name.includes('dosa') ? 'dosa'
      : name.includes('samosa') ? 'samosa'
      : name.includes('pasta') ? 'pasta'
      : name.includes('rice') ? 'rice'
      : name.includes('dessert') || name.includes('cake') ? 'dessert'
      : 'biryani';
    const num = (name.charCodeAt(0) % 9) + 1;
    return `https://foodish-api.com/images/${cat}/${cat}${num}.jpg`;
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-primary to-accent py-10 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">RestroAI Kitchen</h1>
          <p className="text-white/80 mt-2 text-base">Order delicious food, delivered fast</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6">
        {/* Search & filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zomato-gray" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for dishes..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-zomato-border bg-card text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary text-white border-primary'
                  : 'bg-card text-zomato-dark border-zomato-border hover:border-primary/40'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Two-column: menu + sidebar cart */}
        <div className="flex gap-6">
          {/* Menu grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-2xl h-64 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-zomato-gray">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">No items found</p>
                <p className="text-sm mt-1">Try a different search or category</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {filtered.map((item) => {
                    const qty = getQty(item.item_id);
                    return (
                      <motion.div
                        key={item.item_id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-card rounded-2xl shadow-card overflow-hidden hover:shadow-card-hover transition-shadow"
                      >
                        <div className="relative h-44 bg-zomato-light overflow-hidden">
                          <img
                            src={imgErrors.has(item.item_id) ? fallbackImg(item.item_name) : item.image_url}
                            alt={item.item_name}
                            className="w-full h-full object-cover"
                            onError={() => setImgErrors((prev) => new Set(prev).add(item.item_id))}
                            loading="lazy"
                          />
                          <div className="absolute top-3 left-3">
                            {item.is_veg ? (
                              <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-xs font-medium text-zomato-green">
                                <Leaf className="h-3 w-3" /> Veg
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-xs font-medium text-primary">
                                <Flame className="h-3 w-3" /> Non-Veg
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-zomato-dark text-[15px] truncate">
                                {item.item_name}
                              </h3>
                              <p className="text-xs text-zomato-gray mt-0.5">{item.category}</p>
                            </div>
                            <p className="font-bold text-zomato-dark text-lg">
                              {formatPrice(item.price)}
                            </p>
                          </div>
                          <div className="mt-3">
                            {qty === 0 ? (
                              <button
                                onClick={() => openModifierModal(item)}
                                className="w-full flex items-center justify-center gap-1.5 bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors"
                              >
                                <Plus className="h-4 w-4" /> ADD
                              </button>
                            ) : (
                              <div className="flex items-center justify-center gap-4 bg-primary-50 rounded-xl py-1.5">
                                <button
                                  onClick={() => removeItem(item.item_id)}
                                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-white shadow text-primary hover:bg-primary-50 transition-colors"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="text-lg font-bold text-primary w-8 text-center">
                                  {qty}
                                </span>
                                <button
                                  onClick={() =>
                                    addItem({
                                      item_id: item.item_id,
                                      item_name: item.item_name,
                                      price: item.price,
                                      image_url: item.image_url,
                                    })
                                  }
                                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-600 transition-colors"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Desktop sticky cart sidebar */}
          <div className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-6">
              <div className="bg-card rounded-2xl shadow-card p-5">
                <h3 className="font-bold text-lg text-zomato-dark mb-4 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" /> Your Order
                </h3>
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-zomato-gray">
                    <p className="text-sm">Your cart is empty</p>
                    <p className="text-xs mt-1">Add items to get started</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {cart.map((c) => (
                        <div key={c.item_id} className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zomato-dark truncate">{c.item_name}</p>
                            <p className="text-xs text-zomato-gray">{formatPrice(c.price)} × {c.qty}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => removeItem(c.item_id)}
                              className="h-6 w-6 flex items-center justify-center rounded bg-gray-100 text-zomato-gray hover:text-primary"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-sm font-semibold w-4 text-center">{c.qty}</span>
                            <button
                              onClick={() =>
                                addItem({ item_id: c.item_id, item_name: c.item_name, price: c.price })
                              }
                              className="h-6 w-6 flex items-center justify-center rounded bg-primary text-white"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="text-sm font-semibold text-zomato-dark w-16 text-right">
                            {formatPrice(c.price * c.qty)}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-zomato-border mt-4 pt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-zomato-gray">Subtotal</span>
                        <span className="font-semibold">{formatPrice(totalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-3">
                        <span className="text-zomato-gray">Tax (5%)</span>
                        <span className="font-semibold">{formatPrice(Math.round(totalAmount * 0.05))}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold mb-4">
                        <span>Total</span>
                        <span className="text-primary">{formatPrice(Math.round(totalAmount * 1.05))}</span>
                      </div>
                      <Link
                        to="/checkout"
                        className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors"
                      >
                        Checkout <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile floating cart button */}
      {totalItems > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full flex items-center justify-between bg-primary text-white py-4 px-6 rounded-2xl shadow-lg"
          >
            <span className="font-semibold">{totalItems} item{totalItems > 1 ? 's' : ''}</span>
            <span className="flex items-center gap-2 font-bold">
              {formatPrice(totalAmount)} <ChevronRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      )}

      {/* Mobile cart drawer */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        addItem={addItem}
        removeItem={removeItem}
        totalAmount={totalAmount}
      />

      {/* Modifier Selection Modal */}
      <AnimatePresence>
        {modifierItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setModifierItem(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-lg bg-card rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-5 border-b border-zomato-border flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-zomato-dark">{modifierItem.item_name}</h3>
                  <p className="text-sm text-zomato-gray">Customize your order</p>
                </div>
                <button onClick={() => setModifierItem(null)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5 text-zomato-gray" />
                </button>
              </div>

              <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
                {/* Size */}
                {modData.sizes && modData.sizes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-zomato-dark mb-2">Size</h4>
                    <div className="flex flex-wrap gap-2">
                      {modData.sizes.map((s) => (
                        <button
                          key={s.name}
                          onClick={() => setSelSize(s.name)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            selSize === s.name
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-zomato-dark border-zomato-border hover:border-primary/40'
                          }`}
                        >
                          {s.name} {s.price_add > 0 && <span className="opacity-70">+₹{s.price_add}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Spice Level */}
                {modData.spice_levels && modData.spice_levels.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-zomato-dark mb-2">Spice Level</h4>
                    <div className="flex flex-wrap gap-2">
                      {modData.spice_levels.map((s) => (
                        <button
                          key={s.name}
                          onClick={() => setSelSpice(s.name)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            selSpice === s.name
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-zomato-dark border-zomato-border hover:border-primary/40'
                          }`}
                        >
                          {s.name} {s.price_add > 0 && <span className="opacity-70">+₹{s.price_add}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add-ons */}
                {modData.addons && modData.addons.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-zomato-dark mb-2">Add-ons</h4>
                    <div className="space-y-2">
                      {modData.addons.map((a) => (
                        <button
                          key={a.name}
                          onClick={() => toggleAddon(a.name)}
                          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm border transition-colors ${
                            selAddons.includes(a.name)
                              ? 'bg-primary/5 border-primary text-primary font-medium'
                              : 'bg-white text-zomato-dark border-zomato-border hover:border-primary/40'
                          }`}
                        >
                          <span>{a.name}</span>
                          <span className="font-semibold">+₹{a.price_add}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-zomato-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-zomato-gray">Item total</span>
                  <span className="font-bold text-lg text-zomato-dark">
                    {formatPrice(modifierItem.price + modExtraPrice)}
                  </span>
                </div>
                <button
                  onClick={addWithModifiers}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Add to Order
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

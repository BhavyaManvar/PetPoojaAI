# PetPooja Voice Ordering — Database Schema Design

## Architecture Overview

```
┌─────────────┐     ┌───────────────┐     ┌──────────┐
│  customers   │────▶│ call_sessions  │────▶│  orders   │
│  (phone_no)  │     │  (transcript)  │     │ (totals)  │
└─────────────┘     └───────────────┘     └────┬─────┘
                                                │
                    ┌───────────────┐     ┌─────▼──────┐
                    │  menu_items    │◀────│ order_items │
                    │  (catalogue)   │     │ (line item) │
                    └──────┬────────┘     └────────────┘
                           │
              ┌────────────┼────────────┐
              ▼                         ▼
   ┌──────────────────┐     ┌───────────────┐
   │ menu_item_aliases │     │ upsell_rules   │
   │ (multilingual)    │     │ (AI prompts)   │
   └──────────────────┘     └───────────────┘

                    ┌───────────────┐
                    │  bill_events   │ ◀── audit log per order
                    └───────────────┘
```

---

## Table-by-Table Design Rationale

### 1. `customers`
| Decision | Rationale |
|---|---|
| **PK**: UUID | Globally unique, safe for distributed systems |
| **phone_number UNIQUE** | Primary identifier for voice callers; enables repeat-customer lookup |
| **language_pref** | Determines which alias set the AI agent uses for menu matching |
| **is_active soft-delete** | Don't destroy history — just deactivate |

### 2. `menu_items`
| Decision | Rationale |
|---|---|
| **price + cost_price** | Enables margin analytics (revenue − cost) without a separate table |
| **tax_percent per item** | Indian GST can vary by item category (5%, 12%, 18%) |
| **is_available flag** | Lets kitchen toggle items off during a call without deleting them |
| **CHECK constraints** | price ≥ 0, tax 0–100 — prevents bad data at DB level |

### 3. `menu_item_aliases`
| Decision | Rationale |
|---|---|
| **Separate table (1:N)** | A single menu item can have unlimited aliases across languages |
| **lang column** | Values: `en`, `hi`, `hinglish`, `gu` — filterable per call language |
| **pg_trgm GIN index** | Enables `%` fuzzy/trigram similarity search on alias_text for voice misheard words |
| **UNIQUE(alias_text, lang)** | Prevents duplicate aliases in the same language |

### 4. `call_sessions`
| Decision | Rationale |
|---|---|
| **retell_call_id nullable** | Session is created by our backend first; Retell webhook populates later |
| **phone_number snapshot** | Captures the number at call time even if customer record changes |
| **transcript TEXT** | Full call transcript stored for analytics / dispute resolution |
| **call_status CHECK enum** | `initiated → ringing → in_progress → completed/failed/cancelled` |
| **metadata JSONB** | Flexible store for Retell webhook payload, call duration, etc. |

### 5. `orders`
| Decision | Rationale |
|---|---|
| **Denormalized totals** | subtotal, tax_amount, discount_amount, grand_total — avoids re-computing on every dashboard read |
| **order_source enum** | `voice_call / pos / web / app` — enables channel-wise analytics |
| **order_status enum** | Full lifecycle from pending → delivered/cancelled/refunded |
| **currency field** | Defaults to INR; future-proof for multi-currency restaurants |

### 6. `order_items`
| Decision | Rationale |
|---|---|
| **item_name_snapshot** | Preserves the item name at order time — survives menu renames/deletions |
| **menu_item_id ON DELETE SET NULL** | If a menu item is removed, historical orders stay intact |
| **line_total stored** | `qty × unit_price × (1 + tax)` — avoids recalculation |

### 7. `bill_events`
| Decision | Rationale |
|---|---|
| **Immutable append-only log** | Every billing action (created, paid, refunded) is auditable |
| **metadata JSONB** | Stores payment gateway response, refund ID, etc. |
| **No UPDATE needed** | Events are never modified — only new events are inserted |

### 8. `upsell_rules`
| Decision | Rationale |
|---|---|
| **trigger → suggested pair** | "If customer orders X, suggest Y" — simple and effective |
| **suggested_text** | Pre-written script the AI agent reads aloud |
| **priority + is_active** | Sort by priority; toggle rules on/off without deleting |
| **UNIQUE(trigger, suggested)** | No duplicate rule pairs |

---

## Normalization

The schema is in **3NF** with one intentional denormalization:

- **orders.subtotal / tax_amount / grand_total** are derived from `order_items` but stored directly. This trades a small write overhead for significant read performance on dashboard queries that aggregate thousands of orders.

All other tables are fully normalized — no repeating groups, no transitive dependencies.

---

## Index Strategy

| Index | Purpose |
|---|---|
| `idx_customers_phone` | Fast customer lookup on incoming call |
| `idx_aliases_text_trgm` (GIN) | Fuzzy/trigram search for voice-to-menu matching |
| `idx_aliases_lang` | Filter aliases by call language |
| `idx_call_sessions_retell` (partial) | Webhook lookup — only indexed when not NULL |
| `idx_call_sessions_created DESC` | Recent calls on dashboard |
| `idx_orders_dashboard` (composite) | `(created_at DESC, order_status)` for latest-orders panel |
| `idx_orders_status` | Filter by pending/preparing/delivered |
| `idx_bill_events_created DESC` | Billing audit timeline |
| `idx_upsell_trigger` (partial) | Only active rules indexed |

---

## Future Module Integration Notes

### Order Parsing (Voice Agent → DB)
1. Incoming call → `INSERT INTO call_sessions`
2. Customer identified by phone → `SELECT FROM customers` or create new
3. AI extracts item names from transcript → fuzzy match against `menu_item_aliases` using trigram similarity
4. Matched items → `INSERT INTO orders` + `INSERT INTO order_items`
5. Totals computed and stored in `orders`

### Billing
1. Order confirmed → `INSERT INTO bill_events (event_type='bill_created')`
2. Payment received → `INSERT INTO bill_events (event_type='payment_received', metadata={gateway_response})`
3. Refund → `INSERT INTO bill_events (event_type='refund_initiated')` then `refund_completed`
4. Grand total = subtotal + tax - discount (stored in `orders` row)

### AI Voice Agent (Retell)
1. Retell webhook sends `retell_call_id` → `UPDATE call_sessions SET retell_call_id = ?`
2. Agent reads `menu_items WHERE is_available = TRUE` to build available menu
3. Agent reads `upsell_rules WHERE trigger_menu_item_id = ? AND is_active = TRUE` to offer upsells
4. Agent writes `call_sessions.transcript` at call end
5. Agent reads `menu_item_aliases WHERE lang = ?` to match spoken words

### Analytics Dashboard
```sql
-- Today's revenue
SELECT SUM(grand_total) FROM orders
WHERE created_at >= CURRENT_DATE AND order_status NOT IN ('cancelled','refunded');

-- Top 5 items (last 7 days)
SELECT oi.item_name_snapshot, SUM(oi.quantity) AS total_qty
FROM order_items oi JOIN orders o ON oi.order_id = o.id
WHERE o.created_at >= NOW() - INTERVAL '7 days'
GROUP BY oi.item_name_snapshot
ORDER BY total_qty DESC LIMIT 5;

-- Orders by channel
SELECT order_source, COUNT(*) FROM orders
WHERE created_at >= CURRENT_DATE
GROUP BY order_source;

-- Upsell conversion (requires future tracking column)
SELECT ur.suggested_text, COUNT(oi.id) AS times_added
FROM upsell_rules ur
LEFT JOIN order_items oi ON oi.menu_item_id = ur.suggested_menu_item_id
WHERE ur.is_active = TRUE
GROUP BY ur.suggested_text ORDER BY times_added DESC;
```

---

## File Inventory

| File | Purpose |
|---|---|
| `backend/app/db/schema.sql` | Raw SQL CREATE TABLE + indexes + triggers |
| `backend/app/db/seed.sql` | Sample menu items, aliases, upsell rules |
| `backend/app/db/database.py` | SQLAlchemy async engine + session factory |
| `backend/app/db/models.py` | SQLAlchemy ORM models for all 8 tables |
| `backend/app/db/__init__.py` | Package init |

---

## Quick Start

```bash
# 1. Create database
createdb petpooja

# 2. Run schema
psql -d petpooja -f backend/app/db/schema.sql

# 3. Seed data
psql -d petpooja -f backend/app/db/seed.sql

# 4. Set connection string
export DATABASE_URL="postgresql+asyncpg://postgres:password@localhost:5432/petpooja"
```

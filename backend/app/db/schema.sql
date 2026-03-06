-- =============================================================================
-- PetPooja Voice Ordering — PostgreSQL Schema
-- Restaurant phone-call ordering system
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for fuzzy alias search

-- ---------------------------------------------------------------------------
-- 1. CUSTOMERS
-- ---------------------------------------------------------------------------
-- Stores unique customers identified primarily by phone number.
-- A single customer may call many times; each call creates a call_session.
CREATE TABLE customers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number    VARCHAR(20)  NOT NULL,
    name            VARCHAR(120),
    email           VARCHAR(255),
    language_pref   VARCHAR(10)  DEFAULT 'en',          -- en / hi / gu
    notes           TEXT,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_customers_phone UNIQUE (phone_number)
);

CREATE INDEX idx_customers_phone ON customers (phone_number);

-- ---------------------------------------------------------------------------
-- 2. MENU ITEMS
-- ---------------------------------------------------------------------------
-- Canonical menu catalogue. price = selling price; cost_price for margin analysis.
CREATE TABLE menu_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    category        VARCHAR(100),
    price           NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    cost_price      NUMERIC(10,2) CHECK (cost_price >= 0),
    tax_percent     NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (tax_percent >= 0 AND tax_percent <= 100),
    is_available    BOOLEAN       NOT NULL DEFAULT TRUE,
    image_url       TEXT,
    description     TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_items_category ON menu_items (category);
CREATE INDEX idx_menu_items_available ON menu_items (is_available) WHERE is_available = TRUE;

-- ---------------------------------------------------------------------------
-- 3. MENU ITEM ALIASES  (multilingual matching)
-- ---------------------------------------------------------------------------
-- Multiple aliases per menu_item.  lang values: en, hi, hinglish, gu, etc.
-- AI voice agent uses these to fuzzy-match spoken words → canonical menu item.
CREATE TABLE menu_item_aliases (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id    UUID         NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    alias_text      VARCHAR(200) NOT NULL,
    lang            VARCHAR(10)  NOT NULL DEFAULT 'en',   -- en | hi | hinglish | gu
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_alias_text_lang UNIQUE (alias_text, lang)
);

CREATE INDEX idx_aliases_menu_item ON menu_item_aliases (menu_item_id);
CREATE INDEX idx_aliases_text_trgm ON menu_item_aliases USING gin (alias_text gin_trgm_ops);
CREATE INDEX idx_aliases_lang      ON menu_item_aliases (lang);

-- ---------------------------------------------------------------------------
-- 4. CALL SESSIONS
-- ---------------------------------------------------------------------------
-- One row per phone call. Linked to customer.
-- retell_call_id is populated once the Retell webhook fires.
CREATE TABLE call_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id     UUID         REFERENCES customers(id) ON DELETE SET NULL,
    phone_number    VARCHAR(20)  NOT NULL,                -- snapshot at call time
    retell_call_id  VARCHAR(120),                         -- nullable until Retell assigns
    language        VARCHAR(10)  NOT NULL DEFAULT 'en',
    transcript      TEXT,
    call_status     VARCHAR(30)  NOT NULL DEFAULT 'initiated'
                        CHECK (call_status IN (
                            'initiated','ringing','in_progress',
                            'completed','failed','cancelled'
                        )),
    started_at      TIMESTAMPTZ,
    ended_at        TIMESTAMPTZ,
    metadata        JSONB        DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_retell_call UNIQUE (retell_call_id)
);

CREATE INDEX idx_call_sessions_customer ON call_sessions (customer_id);
CREATE INDEX idx_call_sessions_phone    ON call_sessions (phone_number);
CREATE INDEX idx_call_sessions_retell   ON call_sessions (retell_call_id) WHERE retell_call_id IS NOT NULL;
CREATE INDEX idx_call_sessions_status   ON call_sessions (call_status);
CREATE INDEX idx_call_sessions_created  ON call_sessions (created_at DESC);

-- ---------------------------------------------------------------------------
-- 5. ORDERS
-- ---------------------------------------------------------------------------
-- One order per call session (or per manual POS entry).
-- Monetary fields are stored denormalised for fast dashboard reads.
CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id     UUID         REFERENCES customers(id) ON DELETE SET NULL,
    call_session_id UUID         REFERENCES call_sessions(id) ON DELETE SET NULL,
    order_source    VARCHAR(30)  NOT NULL DEFAULT 'voice_call'
                        CHECK (order_source IN ('voice_call','pos','web','app')),
    order_status    VARCHAR(30)  NOT NULL DEFAULT 'pending'
                        CHECK (order_status IN (
                            'pending','confirmed','preparing',
                            'ready','delivered','cancelled','refunded'
                        )),
    subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    grand_total     NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency        VARCHAR(3)    NOT NULL DEFAULT 'INR',
    notes           TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer      ON orders (customer_id);
CREATE INDEX idx_orders_call_session   ON orders (call_session_id);
CREATE INDEX idx_orders_status         ON orders (order_status);
CREATE INDEX idx_orders_source         ON orders (order_source);
CREATE INDEX idx_orders_created        ON orders (created_at DESC);
-- Dashboard composite: latest orders + status
CREATE INDEX idx_orders_dashboard      ON orders (created_at DESC, order_status);

-- ---------------------------------------------------------------------------
-- 6. ORDER ITEMS
-- ---------------------------------------------------------------------------
-- Line items for an order. item_name_snapshot preserves the name even if
-- the menu_item is later renamed or deleted.
CREATE TABLE order_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id            UUID         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id        UUID         REFERENCES menu_items(id) ON DELETE SET NULL,
    item_name_snapshot  VARCHAR(200) NOT NULL,
    quantity            INTEGER      NOT NULL CHECK (quantity > 0),
    unit_price          NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    tax_percent         NUMERIC(5,2)  NOT NULL DEFAULT 0,
    line_total          NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order     ON order_items (order_id);
CREATE INDEX idx_order_items_menu_item ON order_items (menu_item_id);

-- ---------------------------------------------------------------------------
-- 7. BILL EVENTS  (audit trail)
-- ---------------------------------------------------------------------------
-- Immutable log of billing lifecycle events (created, paid, refunded, etc.)
CREATE TABLE bill_events (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id    UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    event_type  VARCHAR(40) NOT NULL
                    CHECK (event_type IN (
                        'bill_created','payment_received','bill_updated',
                        'discount_applied','refund_initiated','refund_completed',
                        'tax_adjusted','manual_override'
                    )),
    message     TEXT,
    metadata    JSONB       DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bill_events_order   ON bill_events (order_id);
CREATE INDEX idx_bill_events_type    ON bill_events (event_type);
CREATE INDEX idx_bill_events_created ON bill_events (created_at DESC);

-- ---------------------------------------------------------------------------
-- 8. UPSELL RULES
-- ---------------------------------------------------------------------------
-- If a customer orders trigger_menu_item, the AI agent suggests
-- suggested_menu_item with the scripted suggested_text.
CREATE TABLE upsell_rules (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trigger_menu_item_id    UUID        NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    suggested_menu_item_id  UUID        NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    suggested_text          TEXT        NOT NULL,
    priority                INTEGER     NOT NULL DEFAULT 0,
    is_active               BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_upsell_pair UNIQUE (trigger_menu_item_id, suggested_menu_item_id)
);

CREATE INDEX idx_upsell_trigger  ON upsell_rules (trigger_menu_item_id) WHERE is_active = TRUE;
CREATE INDEX idx_upsell_priority ON upsell_rules (priority DESC);

-- ---------------------------------------------------------------------------
-- UPDATED_AT TRIGGER  (auto-update)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_menu_items_updated_at
    BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

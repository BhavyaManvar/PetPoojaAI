"""
SQLAlchemy ORM models — PetPooja Voice Ordering System.

All tables mirror the raw SQL in schema.sql.  Relationships are defined
for easy eager/lazy loading from future API routes.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.database import Base


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------
def _uuid_pk() -> Column:
    return Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


def _now() -> Column:
    return Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


def _updated() -> Column:
    return Column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


# ===========================================================================
# 1. CUSTOMERS
# ===========================================================================
class Customer(Base):
    __tablename__ = "customers"

    id = _uuid_pk()
    phone_number = Column(String(20), nullable=False, unique=True)
    name = Column(String(120))
    email = Column(String(255))
    language_pref = Column(String(10), default="en")
    notes = Column(Text)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = _now()
    updated_at = _updated()

    # relationships
    call_sessions = relationship("CallSession", back_populates="customer", lazy="selectin")
    orders = relationship("Order", back_populates="customer", lazy="selectin")

    __table_args__ = (
        Index("idx_customers_phone", "phone_number"),
    )


# ===========================================================================
# 2. MENU ITEMS
# ===========================================================================
class MenuItem(Base):
    __tablename__ = "menu_items"

    id = _uuid_pk()
    name = Column(String(200), nullable=False)
    category = Column(String(100))
    price = Column(Numeric(10, 2), nullable=False)
    cost_price = Column(Numeric(10, 2))
    tax_percent = Column(Numeric(5, 2), nullable=False, default=0)
    is_available = Column(Boolean, nullable=False, default=True)
    image_url = Column(Text)
    description = Column(Text)
    created_at = _now()
    updated_at = _updated()

    # relationships
    aliases = relationship("MenuItemAlias", back_populates="menu_item", cascade="all, delete-orphan", lazy="selectin")
    order_items = relationship("OrderItem", back_populates="menu_item", lazy="noload")
    upsell_triggers = relationship(
        "UpsellRule",
        foreign_keys="UpsellRule.trigger_menu_item_id",
        back_populates="trigger_item",
        lazy="noload",
    )
    upsell_suggestions = relationship(
        "UpsellRule",
        foreign_keys="UpsellRule.suggested_menu_item_id",
        back_populates="suggested_item",
        lazy="noload",
    )

    __table_args__ = (
        CheckConstraint("price >= 0", name="ck_menu_price_positive"),
        CheckConstraint("cost_price >= 0", name="ck_menu_cost_positive"),
        CheckConstraint("tax_percent >= 0 AND tax_percent <= 100", name="ck_menu_tax_range"),
        Index("idx_menu_items_category", "category"),
    )


# ===========================================================================
# 3. MENU ITEM ALIASES
# ===========================================================================
class MenuItemAlias(Base):
    __tablename__ = "menu_item_aliases"

    id = _uuid_pk()
    menu_item_id = Column(UUID(as_uuid=True), ForeignKey("menu_items.id", ondelete="CASCADE"), nullable=False)
    alias_text = Column(String(200), nullable=False)
    lang = Column(String(10), nullable=False, default="en")
    created_at = _now()

    menu_item = relationship("MenuItem", back_populates="aliases")

    __table_args__ = (
        UniqueConstraint("alias_text", "lang", name="uq_alias_text_lang"),
        Index("idx_aliases_menu_item", "menu_item_id"),
        Index("idx_aliases_lang", "lang"),
    )


# ===========================================================================
# 4. CALL SESSIONS
# ===========================================================================
class CallSession(Base):
    __tablename__ = "call_sessions"

    id = _uuid_pk()
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="SET NULL"))
    phone_number = Column(String(20), nullable=False)
    retell_call_id = Column(String(120), unique=True)
    language = Column(String(10), nullable=False, default="en")
    transcript = Column(Text)
    call_status = Column(
        String(30),
        nullable=False,
        default="initiated",
    )
    started_at = Column(DateTime(timezone=True))
    ended_at = Column(DateTime(timezone=True))
    metadata_ = Column("metadata", JSONB, default={})
    created_at = _now()

    # relationships
    customer = relationship("Customer", back_populates="call_sessions")
    order = relationship("Order", back_populates="call_session", uselist=False, lazy="selectin")

    __table_args__ = (
        CheckConstraint(
            "call_status IN ('initiated','ringing','in_progress','completed','failed','cancelled')",
            name="ck_call_status_enum",
        ),
        Index("idx_call_sessions_customer", "customer_id"),
        Index("idx_call_sessions_phone", "phone_number"),
        Index("idx_call_sessions_status", "call_status"),
        Index("idx_call_sessions_created", "created_at"),
    )


# ===========================================================================
# 5. ORDERS
# ===========================================================================
class Order(Base):
    __tablename__ = "orders"

    id = _uuid_pk()
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="SET NULL"))
    call_session_id = Column(UUID(as_uuid=True), ForeignKey("call_sessions.id", ondelete="SET NULL"))
    order_source = Column(String(30), nullable=False, default="voice_call")
    order_status = Column(String(30), nullable=False, default="pending")
    subtotal = Column(Numeric(12, 2), nullable=False, default=0)
    tax_amount = Column(Numeric(12, 2), nullable=False, default=0)
    discount_amount = Column(Numeric(12, 2), nullable=False, default=0)
    grand_total = Column(Numeric(12, 2), nullable=False, default=0)
    currency = Column(String(3), nullable=False, default="INR")
    notes = Column(Text)
    created_at = _now()
    updated_at = _updated()

    # relationships
    customer = relationship("Customer", back_populates="orders")
    call_session = relationship("CallSession", back_populates="order")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan", lazy="selectin")
    bill_events = relationship("BillEvent", back_populates="order", cascade="all, delete-orphan", lazy="selectin")

    __table_args__ = (
        CheckConstraint(
            "order_source IN ('voice_call','pos','web','app')",
            name="ck_order_source_enum",
        ),
        CheckConstraint(
            "order_status IN ('pending','confirmed','preparing','ready','delivered','cancelled','refunded')",
            name="ck_order_status_enum",
        ),
        Index("idx_orders_customer", "customer_id"),
        Index("idx_orders_call_session", "call_session_id"),
        Index("idx_orders_status", "order_status"),
        Index("idx_orders_source", "order_source"),
        Index("idx_orders_created", "created_at"),
        Index("idx_orders_dashboard", "created_at", "order_status"),
    )


# ===========================================================================
# 6. ORDER ITEMS
# ===========================================================================
class OrderItem(Base):
    __tablename__ = "order_items"

    id = _uuid_pk()
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    menu_item_id = Column(UUID(as_uuid=True), ForeignKey("menu_items.id", ondelete="SET NULL"))
    item_name_snapshot = Column(String(200), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    tax_percent = Column(Numeric(5, 2), nullable=False, default=0)
    line_total = Column(Numeric(12, 2), nullable=False, default=0)
    created_at = _now()

    # relationships
    order = relationship("Order", back_populates="items")
    menu_item = relationship("MenuItem", back_populates="order_items")

    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_order_item_qty_positive"),
        CheckConstraint("unit_price >= 0", name="ck_order_item_price_positive"),
        Index("idx_order_items_order", "order_id"),
        Index("idx_order_items_menu_item", "menu_item_id"),
    )


# ===========================================================================
# 7. BILL EVENTS
# ===========================================================================
class BillEvent(Base):
    __tablename__ = "bill_events"

    id = _uuid_pk()
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(40), nullable=False)
    message = Column(Text)
    metadata_ = Column("metadata", JSONB, default={})
    created_at = _now()

    order = relationship("Order", back_populates="bill_events")

    __table_args__ = (
        CheckConstraint(
            "event_type IN ('bill_created','payment_received','bill_updated',"
            "'discount_applied','refund_initiated','refund_completed',"
            "'tax_adjusted','manual_override')",
            name="ck_bill_event_type_enum",
        ),
        Index("idx_bill_events_order", "order_id"),
        Index("idx_bill_events_type", "event_type"),
        Index("idx_bill_events_created", "created_at"),
    )


# ===========================================================================
# 8. UPSELL RULES
# ===========================================================================
class UpsellRule(Base):
    __tablename__ = "upsell_rules"

    id = _uuid_pk()
    trigger_menu_item_id = Column(
        UUID(as_uuid=True),
        ForeignKey("menu_items.id", ondelete="CASCADE"),
        nullable=False,
    )
    suggested_menu_item_id = Column(
        UUID(as_uuid=True),
        ForeignKey("menu_items.id", ondelete="CASCADE"),
        nullable=False,
    )
    suggested_text = Column(Text, nullable=False)
    priority = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = _now()

    # relationships
    trigger_item = relationship("MenuItem", foreign_keys=[trigger_menu_item_id], back_populates="upsell_triggers")
    suggested_item = relationship("MenuItem", foreign_keys=[suggested_menu_item_id], back_populates="upsell_suggestions")

    __table_args__ = (
        UniqueConstraint("trigger_menu_item_id", "suggested_menu_item_id", name="uq_upsell_pair"),
        Index("idx_upsell_trigger", "trigger_menu_item_id"),
        Index("idx_upsell_priority", "priority"),
    )

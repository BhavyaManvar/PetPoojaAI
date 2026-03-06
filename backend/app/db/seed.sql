-- =============================================================================
-- PetPooja Voice Ordering — Seed Data
-- =============================================================================

-- ---- MENU ITEMS ----
INSERT INTO menu_items (id, name, category, price, cost_price, tax_percent, is_available) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Margherita Pizza',     'Pizza',      249.00, 90.00,  5.0, TRUE),
  ('a2222222-2222-2222-2222-222222222222', 'Paneer Tikka',         'Starters',   199.00, 70.00,  5.0, TRUE),
  ('a3333333-3333-3333-3333-333333333333', 'Masala Chai',          'Beverages',   49.00, 12.00,  5.0, TRUE),
  ('a4444444-4444-4444-4444-444444444444', 'Chicken Biryani',      'Main Course', 299.00,120.00, 5.0, TRUE),
  ('a5555555-5555-5555-5555-555555555555', 'Gulab Jamun (2 pcs)',  'Desserts',    89.00, 25.00,  5.0, TRUE);

-- ---- MULTILINGUAL ALIASES ----
INSERT INTO menu_item_aliases (menu_item_id, alias_text, lang) VALUES
  -- Margherita Pizza
  ('a1111111-1111-1111-1111-111111111111', 'Margherita Pizza',  'en'),
  ('a1111111-1111-1111-1111-111111111111', 'मार्गरीटा पिज़्ज़ा', 'hi'),
  ('a1111111-1111-1111-1111-111111111111', 'margherita pizza',  'hinglish'),
  -- Paneer Tikka
  ('a2222222-2222-2222-2222-222222222222', 'Paneer Tikka',      'en'),
  ('a2222222-2222-2222-2222-222222222222', 'पनीर टिक्का',       'hi'),
  -- Masala Chai
  ('a3333333-3333-3333-3333-333333333333', 'Masala Chai',       'en'),
  ('a3333333-3333-3333-3333-333333333333', 'मसाला चाय',         'hi'),
  -- Chicken Biryani
  ('a4444444-4444-4444-4444-444444444444', 'Chicken Biryani',   'en');

-- ---- UPSELL RULES ----
INSERT INTO upsell_rules (trigger_menu_item_id, suggested_menu_item_id, suggested_text, priority) VALUES
  -- If customer orders Margherita Pizza → suggest Masala Chai
  ('a1111111-1111-1111-1111-111111111111',
   'a3333333-3333-3333-3333-333333333333',
   'Would you like to add a hot Masala Chai with your pizza? Only ₹49!',
   10),
  -- If customer orders Chicken Biryani → suggest Gulab Jamun
  ('a4444444-4444-4444-4444-444444444444',
   'a5555555-5555-5555-5555-555555555555',
   'Our Gulab Jamun pairs perfectly with Biryani. Add 2 pieces for just ₹89?',
   10);

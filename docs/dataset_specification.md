# Dataset Specification — PetPooja AI Revenue Copilot

## File

`data/restaurant_ai_hybrid_dataset.xlsx`

## Sheets

### 1. `Menu_Items`

| Column         | Type    | Description                          | Example              |
|----------------|---------|--------------------------------------|----------------------|
| item_id        | int     | Unique menu item identifier          | 1                    |
| item_name      | string  | Display name of the item             | Paneer Tikka Pizza   |
| category       | string  | Menu category                        | Pizza                |
| price          | float   | Selling price (₹)                    | 350.0                |
| cost           | float   | Raw material / food cost (₹)         | 150.0                |
| is_veg         | bool    | Vegetarian flag                      | True                 |
| is_available   | bool    | Currently available in inventory     | True                 |

**Rows:** 30 items across 8 categories

**Categories:** Pizza, Sides, Burger, South Indian, Breads, Beverages, Main Course, Desserts, Starters, Rice

---

### 2. `Orders`

| Column         | Type     | Description                         | Example              |
|----------------|----------|-------------------------------------|----------------------|
| order_id       | int      | Unique order identifier             | 1001                 |
| customer_id    | int      | Customer identifier                 | 501                  |
| order_date     | datetime | Timestamp of order                  | 2025-03-15 12:30:00  |
| city           | string   | City of the restaurant outlet       | Ahmedabad            |
| outlet_id      | int      | Outlet/branch identifier            | 1                    |
| total_amount   | float    | Total billed amount (₹)             | 590.0                |
| payment_mode   | string   | Payment method                      | UPI                  |
| order_type     | string   | Dine-in / Takeaway / Delivery       | Dine-in              |

**Rows:** 1000 orders

**Cities:** Ahmedabad, Mumbai, Delhi, Bangalore, Pune, Jaipur, Hyderabad, Chennai

---

### 3. `Order_Items`

| Column         | Type    | Description                          | Example              |
|----------------|---------|--------------------------------------|----------------------|
| order_item_id  | int     | Unique line item identifier          | 1                    |
| order_id       | int     | FK → Orders.order_id                 | 1001                 |
| item_id        | int     | FK → Menu_Items.item_id              | 3                    |
| item_name      | string  | Denormalized item name               | Veg Burger           |
| quantity       | int     | Quantity ordered                     | 2                    |
| unit_price     | float   | Per-unit price at time of order      | 180.0                |
| line_total     | float   | quantity × unit_price                | 360.0                |

**Rows:** ~2500 line items (avg 2.5 items per order)

---

### 4. `Sales_Analytics`

| Column             | Type    | Description                        | Example              |
|--------------------|---------|------------------------------------|----------------------|
| item_id            | int     | FK → Menu_Items.item_id            | 1                    |
| item_name          | string  | Menu item name                     | Paneer Tikka Pizza   |
| total_qty_sold     | int     | Aggregate quantity sold            | 245                  |
| total_revenue      | float   | item revenue (₹)                   | 85750.0              |
| total_cost         | float   | item cost (₹)                      | 36750.0              |
| contribution_margin| float   | revenue - cost                     | 49000.0              |
| margin_pct         | float   | margin / revenue × 100             | 57.1                 |
| avg_daily_sales    | float   | Average daily quantity              | 3.4                  |
| category           | string  | Menu category                      | Pizza                |

**Rows:** 30 (one per menu item, pre-aggregated)

---

### 5. `Voice_Orders`

| Column         | Type    | Description                             | Example                          |
|----------------|---------|----------------------------------------|----------------------------------|
| voice_id       | int     | Unique voice input identifier          | 1                                |
| raw_text       | string  | Raw voice/text input                   | ek paneer pizza aur do coke      |
| language       | string  | Detected language                      | hi                               |
| parsed_items   | string  | JSON string of parsed items            | [{"item":"Paneer Pizza","qty":1}]|
| is_valid       | bool    | Whether parsing was successful         | True                             |
| timestamp      | datetime| When the voice order was received      | 2025-03-15 14:22:00              |

**Rows:** 200 sample voice inputs (English, Hindi, Hinglish mix)

---

## Generation

Run the generator script to create the Excel file:

```bash
cd data
python generate_dataset.py
```

## Notes

- All prices are in Indian Rupees (₹)
- The dataset is synthetic but mimics real restaurant PoS patterns
- `Order_Items` has intentional co-occurrence patterns to enable meaningful market basket analysis (e.g., Burger + Fries, Pizza + Coke)
- `Voice_Orders` includes multilingual inputs for robust NLP testing

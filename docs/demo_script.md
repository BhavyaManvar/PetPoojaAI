# Demo Script — PetPooja AI Revenue Copilot

## Prerequisites
- Backend running at `http://localhost:8000`
- Frontend running at `http://localhost:3000`
- Sample dataset loaded in `data/petpooja_dataset.xlsx`

---

## 1. Dashboard (30 sec)
1. Open the Next.js app at `http://localhost:3000`.
2. The **Dashboard** page loads automatically (redirect from `/`).
3. Walk through the four KPI cards: Total Revenue, Total Orders, Avg Order Value, Unique Items.
4. Show Revenue by City bar chart and Revenue by Order Type pie chart.
5. Scroll to Top 5 Items table.
6. *Talking point:* "One glance tells the restaurant owner how the business is doing today."

## 2. Menu Intelligence (60 sec)
1. Navigate to **Menu Intelligence** in the sidebar.
2. Show the **BCG Matrix** tab — point out the Star / Puzzle / Plow Horse / Dog quadrant badges.
3. Highlight contribution margin and qty sold columns.
4. Switch to the **Hidden Stars** tab — items with high margins but low sales.
5. Switch to the **Risk Items** tab — Dog-classified items that may need removal.
6. *Talking point:* "These are high-margin items that aren't selling — perfect candidates for promotion."

## 3. Combos & Upsell (60 sec)
1. Navigate to **Combos & Upsell**.
2. Show the top combo rules table (antecedent → consequent, confidence, lift, support).
3. Enter an item name (e.g., "Butter Chicken") in the **Upsell Finder** and click *Get Upsells*.
4. Show dual-strategy upsell results: combo-based and hidden star promotion.
5. *Talking point:* "Market basket analysis with mlxtend lets us auto-suggest add-ons at the PoS."

## 4. Voice Copilot (60 sec)
1. Navigate to **Voice Copilot**.
2. Type `"2 butter chicken aur 1 naan dena"` and click **Parse Order**.
3. Show the parsed items list with matched names, quantities, and fuzzy match scores.
4. Note the language badge (hi = Hindi detected).
5. Click **Push Order** and confirm in the modal.
6. *Talking point:* "Staff can enter orders in plain English or Hindi — RapidFuzz handles the matching."

## 5. API Demo (optional, 30 sec)
1. Open Swagger UI at `http://localhost:8000/docs`.
2. Try `GET /kpis` and `POST /voice/parse` live.
3. *Talking point:* "Every feature is API-first — ready for mobile or PoS hardware integration."

---

Total demo time: ~4 minutes.

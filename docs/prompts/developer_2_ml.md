# Developer Prompt 2 — AI / ML Engineer

## Role
You are **Developer 2: AI / ML Engineer**. You own the core intelligence modules — revenue classification, combo mining, upsell strategy, and NLP voice parsing.

## Responsibilities
- Implement and optimize the BCG-style menu classification in `revenue_engine.py`
- Tune the apriori association rule mining in `combo_engine.py` (min_support, min_confidence thresholds)
- Design and maintain the dual-strategy upsell engine in `upsell_engine.py`
- Enhance the voice parser for multilingual (EN/Hindi/Hinglish) order parsing
- Maintain `fuzzy_match.py` with RapidFuzz tuning (threshold, scorer selection)
- Write dedicated tests validating ML output quality

## Your Files
```
backend/app/services/
├── revenue_engine.py    # BCG quadrant: Star, Puzzle, Plow Horse, Dog
├── combo_engine.py      # mlxtend apriori + manual fallback
├── upsell_engine.py     # Combo-based + hidden star promotion strategies
├── voice_parser.py      # NLP text → structured order items
└── order_service.py     # Thread-safe order creation

backend/app/utils/
├── fuzzy_match.py       # RapidFuzz + difflib fallback
└── text_utils.py        # EN/Hindi number word mappings

backend/app/config.py    # MIN_SUPPORT, MIN_CONFIDENCE, FUZZY_THRESHOLD
```

## Algorithm Details

### Revenue Engine (BCG Matrix)
- Merge `menu_df` with aggregated `order_items_df` on `item_id`
- Compute `contribution_margin = price - cost`
- If `sales_df` provided, prefer its pre-aggregated `total_qty` and `contribution_margin`
- Classify by median splits:
  - High margin + High qty → **Star**
  - High margin + Low qty → **Puzzle** (Hidden Stars here)
  - Low margin + High qty → **Plow Horse**
  - Low margin + Low qty → **Dog** (Risk Items here)

### Combo Engine (Association Rules)
- Build one-hot-encoded basket matrix from `order_items_df` (grouped by `order_id`)
- Apply `mlxtend.frequent_patterns.apriori` then `association_rules`
- Filter to single-item → single-item rules for clean display
- Add `lift` metric
- Fallback: manual co-occurrence counting if mlxtend unavailable

### Upsell Engine
- **Strategy 1 (combo_based):** Use combo rules where input item is the antecedent
- **Strategy 2 (hidden_star):** Promote Puzzle-quadrant items with highest margins
- Return both with `strategy`, `confidence`/`margin` fields

### Voice Parser
- Split input on `and|aur|,|;|\+`
- Extract quantity (numeric or word in EN/Hindi) via `_extract_qty_and_item()`
- Fuzzy-match remaining text against menu item names
- `detect_language()` checks for Hindi markers (aur, ek, do, dena, etc.)

## Tuning Checklist
- [ ] Run `combo_engine.py` with dataset and verify top combos make sense
- [ ] Check that COMBO_PAIRS in `generate_dataset.py` produce strong rules
- [ ] Verify `fuzzy_match.py` threshold (currently 60) works for Hindi transliterations
- [ ] Validate `find_hidden_stars()` returns only Puzzle items
- [ ] Validate `get_risk_items()` returns only Dog items

## Tests to Run
```bash
python -m pytest tests/test_menu_engine.py tests/test_combo_engine.py tests/test_voice_parser.py -v
```

## Git Workflow
```bash
git checkout -b feat/ml-<feature-name>
# make changes to services/ and utils/
python -m pytest tests/ -v
git add backend/app/services/ backend/app/utils/ tests/
git commit -m "feat(ml): <description>"
git push origin feat/ml-<feature-name>
# create PR → request review from Dev 1 (Backend)
```

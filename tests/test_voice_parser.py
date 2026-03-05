"""Tests for the Voice Parser + Order Service pipeline.

Covers:
  - Quantity detection (English words, Hindi words, numeric)
  - Fuzzy item matching via RapidFuzz
  - Multilingual support (English, Hindi, Hinglish)
  - Structured order output
  - POS order generation / item resolution
"""

import pandas as pd
import pytest

from app.services.voice_parser import parse_voice_text, _extract_qty_and_item, detect_language, detect_intent, transcribe_audio
from app.services.order_service import resolve_items, create_order, build_pos_payload
from app.utils.fuzzy_match import best_match, best_match_with_score, top_matches

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

MOCK_MENU = [
    "Paneer Tikka Pizza",
    "Margherita Pizza",
    "Coke",
    "Garlic Bread",
    "Masala Dosa",
    "Veg Burger",
    "French Fries",
    "Butter Naan",
    "Lassi",
    "Paneer Butter Masala",
    "Dal Makhani",
]


@pytest.fixture()
def menu_df():
    return pd.DataFrame({
        "item_id": [1, 2, 12, 3, 7, 5, 11, 9, 13, 15, 16],
        "item_name": MOCK_MENU,
        "category": [
            "Pizza", "Pizza", "Beverages", "Sides", "South Indian",
            "Burger", "Sides", "Breads", "Beverages", "Main Course", "Main Course",
        ],
        "price": [350, 280, 60, 120, 150, 180, 130, 60, 80, 280, 220],
        "cost": [150, 110, 20, 36, 80, 100, 45, 20, 30, 120, 90],
    })


# ===================== TASK 1: QUANTITY DETECTION ===========================

class TestQuantityDetection:
    """Verify English word, Hindi word, and numeric quantity extraction."""

    def test_english_words(self):
        result = parse_voice_text("one paneer pizza and two coke", menu_items=MOCK_MENU)
        assert len(result) == 2
        assert result[0]["qty"] == 1
        assert result[1]["qty"] == 2

    def test_numeric_prefix(self):
        result = parse_voice_text("3 garlic bread, 1 masala dosa", menu_items=MOCK_MENU)
        assert len(result) == 2
        assert result[0]["qty"] == 3
        assert result[1]["qty"] == 1

    def test_hindi_number_words(self):
        result = parse_voice_text("ek butter naan aur do lassi", menu_items=MOCK_MENU)
        assert len(result) == 2
        assert result[0]["qty"] == 1
        assert result[1]["qty"] == 2

    def test_default_qty_when_omitted(self):
        result = parse_voice_text("coke", menu_items=MOCK_MENU)
        assert len(result) == 1
        assert result[0]["qty"] == 1

    def test_extract_qty_numeric(self):
        qty, text = _extract_qty_and_item("2 coke")
        assert qty == 2
        assert text == "coke"

    def test_extract_qty_word(self):
        qty, text = _extract_qty_and_item("three garlic bread")
        assert qty == 3
        assert text == "garlic bread"

    def test_extract_qty_hindi(self):
        qty, text = _extract_qty_and_item("teen masala dosa")
        assert qty == 3
        assert text == "masala dosa"

    def test_extract_qty_default(self):
        qty, text = _extract_qty_and_item("burger")
        assert qty == 1
        assert text == "burger"

    def test_larger_hindi_numbers(self):
        result = parse_voice_text("paanch coke", menu_items=MOCK_MENU)
        assert result[0]["qty"] == 5


# ===================== TASK 2: ITEM MATCHING (RapidFuzz) ====================

class TestItemMatching:
    """Verify fuzzy matching maps approximate text → exact menu item."""

    def test_exact_match(self):
        result = parse_voice_text("one coke", menu_items=MOCK_MENU)
        assert result[0]["item"] == "Coke"

    def test_fuzzy_match_paneer_pizza(self):
        result = parse_voice_text("one paneer pizza", menu_items=MOCK_MENU)
        assert result[0]["item"] == "Paneer Tikka Pizza"

    def test_fuzzy_match_garlic_bread(self):
        result = parse_voice_text("one garlic bread", menu_items=MOCK_MENU)
        assert result[0]["item"] == "Garlic Bread"

    def test_best_match_helper(self):
        assert best_match("paneer pizza", MOCK_MENU) == "Paneer Tikka Pizza"

    def test_best_match_with_score_returns_tuple(self):
        name, score = best_match_with_score("coke", MOCK_MENU)
        assert name == "Coke"
        assert score > 70

    def test_top_matches_returns_list(self):
        results = top_matches("pizza", MOCK_MENU, limit=3)
        assert isinstance(results, list)
        assert len(results) >= 1
        assert "item" in results[0]
        assert "score" in results[0]

    def test_no_match_below_threshold(self):
        assert best_match("xyznonexistent", MOCK_MENU, threshold=90) is None

    def test_empty_query(self):
        assert best_match("", MOCK_MENU) is None


# ===================== TASK 3: MULTILINGUAL SUPPORT =========================

class TestMultilingualSupport:
    """English, Hindi, and Hinglish voice orders."""

    def test_english_order(self):
        result = parse_voice_text("one paneer pizza and two coke", menu_items=MOCK_MENU)
        assert len(result) == 2
        assert result[0]["item"] == "Paneer Tikka Pizza"

    def test_hindi_order(self):
        result = parse_voice_text("ek butter naan aur do lassi", menu_items=MOCK_MENU)
        assert len(result) == 2
        assert result[0]["item"] == "Butter Naan"
        assert result[1]["item"] == "Lassi"

    def test_hinglish_order(self):
        result = parse_voice_text("ek paneer pizza aur two coke", menu_items=MOCK_MENU)
        assert len(result) == 2

    def test_detect_language_english(self):
        assert detect_language("two butter chicken and one naan") == "en"

    def test_detect_language_hindi(self):
        assert detect_language("ek paneer tikka aur do naan dena") == "hi"

    def test_detect_language_hinglish(self):
        assert detect_language("i want ek pizza aur two coke") == "hinglish"

    def test_sentence_wrapper_hindi(self):
        """'mujhe ... chahiye' style wrapping is handled."""
        result = parse_voice_text("mujhe ek coke chahiye", menu_items=MOCK_MENU)
        assert len(result) >= 1
        assert result[0]["item"] == "Coke"

    def test_sentence_wrapper_english(self):
        """'I want ...' style wrapping is handled."""
        result = parse_voice_text("I want one garlic bread", menu_items=MOCK_MENU)
        assert len(result) >= 1
        assert result[0]["item"] == "Garlic Bread"


# ===================== TASK 4: STRUCTURED ORDER OUTPUT ======================

class TestStructuredOrder:
    """Verify the output schema: [{item, qty}, ...]."""

    def test_basic_structure(self):
        result = parse_voice_text("one paneer pizza and two coke", menu_items=MOCK_MENU)
        for entry in result:
            assert "item" in entry
            assert "qty" in entry
            assert isinstance(entry["item"], str)
            assert isinstance(entry["qty"], int)

    def test_with_confidence(self):
        result = parse_voice_text(
            "one paneer pizza and two coke",
            menu_items=MOCK_MENU,
            include_confidence=True,
        )
        for entry in result:
            assert "confidence" in entry
            assert "original_text" in entry
            assert entry["confidence"] >= 0

    def test_empty_text(self):
        assert parse_voice_text("", menu_items=MOCK_MENU) == []

    def test_multi_item_order(self):
        result = parse_voice_text(
            "two paneer pizza, one garlic bread and three coke",
            menu_items=MOCK_MENU,
        )
        assert len(result) == 3
        assert result[0]["qty"] == 2
        assert result[1]["qty"] == 1
        assert result[2]["qty"] == 3


# ===================== TASK 5: POS ORDER GENERATOR ==========================

class TestPosOrderGenerator:
    """Verify resolve_items, create_order, and build_pos_payload."""

    def test_resolve_items(self, menu_df):
        parsed = [{"item": "Paneer Tikka Pizza", "qty": 1}, {"item": "Coke", "qty": 2}]
        resolved = resolve_items(parsed, menu_df)
        assert len(resolved) == 2
        assert resolved[0]["item_id"] == 1
        assert resolved[0]["item_name"] == "Paneer Tikka Pizza"
        assert resolved[1]["item_id"] == 12
        assert resolved[1]["qty"] == 2

    def test_resolve_fuzzy_name(self, menu_df):
        """Even slightly-off names should resolve via fuzzy match."""
        parsed = [{"item": "paneer pizza", "qty": 1}]
        resolved = resolve_items(parsed, menu_df)
        assert len(resolved) == 1
        assert resolved[0]["item_name"] == "Paneer Tikka Pizza"

    def test_create_order_structure(self, menu_df):
        items = [{"item_id": 1, "qty": 1}, {"item_id": 12, "qty": 2}]
        order = create_order(items, menu_df)
        assert "order_id" in order
        assert order["status"] == "confirmed"
        assert order["total_price"] == 350 + 60 * 2
        assert len(order["items"]) == 2

    def test_create_order_line_totals(self, menu_df):
        items = [{"item_id": 1, "qty": 3}]
        order = create_order(items, menu_df)
        assert order["items"][0]["line_total"] == 350 * 3

    def test_build_pos_payload(self, menu_df):
        resolved = [
            {"item_id": 1, "item_name": "Paneer Tikka Pizza", "qty": 1},
            {"item_id": 12, "item_name": "Coke", "qty": 2},
        ]
        payload = build_pos_payload(resolved, menu_df)
        assert "order_id" in payload
        assert payload["status"] == "confirmed"
        assert payload["total_price"] > 0
        assert len(payload["items"]) == 2

    def test_order_id_increments(self, menu_df):
        items = [{"item_id": 1, "qty": 1}]
        o1 = create_order(items, menu_df)
        o2 = create_order(items, menu_df)
        assert o2["order_id"] == o1["order_id"] + 1

    def test_unknown_item_id_skipped(self, menu_df):
        items = [{"item_id": 99999, "qty": 1}]
        order = create_order(items, menu_df)
        assert len(order["items"]) == 0
        assert order["total_price"] == 0.0


# ===================== TASK 6: FULL-DATASET VOICE TESTS =====================

class TestFullDatasetVoice:
    """End-to-end tests using the complete 200-item dataset menu."""

    @pytest.fixture(autouse=True)
    def _load_full_menu(self):
        from app.dependencies import get_dataframes
        dfs = get_dataframes()
        self.menu_df = dfs["menu"]
        self.full_menu = self.menu_df["item_name"].tolist()

    # -- Test 1: "I want french fries" → French Fries ×1 --
    def test_i_want_french_fries(self):
        result = parse_voice_text("I want french fries", menu_items=self.full_menu)
        assert len(result) == 1
        assert result[0]["item"] == "French Fries"
        assert result[0]["qty"] == 1

    # -- Test 2: "one paneer pizza and two coke" → Paneer Tikka Pizza ×1, Coke ×2 --
    def test_one_paneer_pizza_and_two_coke(self):
        result = parse_voice_text(
            "one paneer pizza and two coke", menu_items=self.full_menu,
        )
        assert len(result) == 2
        assert result[0]["item"] == "Paneer Tikka Pizza"
        assert result[0]["qty"] == 1
        assert result[1]["item"] == "Coke"
        assert result[1]["qty"] == 2

    # -- Test 3: "ek burger aur do coke" → Veg Burger ×1, Coke ×2 --
    #    (dataset has no "Chicken Burger"; closest match is "Veg Burger")
    def test_ek_burger_aur_do_coke(self):
        result = parse_voice_text(
            "ek burger aur do coke", menu_items=self.full_menu,
        )
        assert len(result) == 2
        assert result[0]["item"] == "Veg Burger"
        assert result[0]["qty"] == 1
        assert result[1]["item"] == "Coke"
        assert result[1]["qty"] == 2

    # -- POS order generation from Test 2 --
    def test_pos_order_from_voice(self):
        parsed = parse_voice_text(
            "one paneer pizza and two coke", menu_items=self.full_menu,
        )
        resolved = resolve_items(parsed, self.menu_df)
        order = build_pos_payload(resolved, self.menu_df)

        assert order["status"] == "confirmed"
        assert len(order["items"]) == 2
        assert order["items"][0]["item_id"] == 1   # Paneer Tikka Pizza
        assert order["items"][1]["item_id"] == 12  # Coke
        assert order["total_price"] == 350 + 60 * 2  # 470.0

    # -- Slot {a} correctly captures dataset items --
    def test_slot_capture_maps_to_dataset(self):
        """Verify that captured slot text fuzzy-matches to actual dataset items."""
        test_phrases = [
            ("I want french fries", "French Fries"),
            ("one paneer pizza", "Paneer Tikka Pizza"),
            ("ek coke", "Coke"),
            ("two garlic bread", "Garlic Bread"),
            ("mujhe ek butter naan chahiye", "Butter Naan"),
            ("aloo tiki", "Aloo Tikki Burger"),
        ]
        for phrase, expected_item in test_phrases:
            result = parse_voice_text(phrase, menu_items=self.full_menu)
            assert len(result) >= 1, f"No match for: {phrase}"
            assert result[0]["item"] == expected_item, (
                f"'{phrase}' matched '{result[0]['item']}', expected '{expected_item}'"
            )


# ===================== TASK 7: INTENT DETECTION =============================

class TestIntentDetection:
    """Verify rule-based intent detection."""

    def test_order_item_english(self):
        assert detect_intent("I want paneer pizza") == "ORDER_ITEM"

    def test_order_item_add(self):
        assert detect_intent("add fries") == "ORDER_ITEM"

    def test_order_item_plain(self):
        assert detect_intent("one paneer pizza and two coke") == "ORDER_ITEM"

    def test_remove_item_english(self):
        assert detect_intent("remove the coke") == "REMOVE_ITEM"

    def test_remove_item_cancel(self):
        assert detect_intent("cancel the fries") == "REMOVE_ITEM"

    def test_remove_item_hindi(self):
        assert detect_intent("coke hatao") == "REMOVE_ITEM"

    def test_remove_item_nahi(self):
        assert detect_intent("nahi chahiye coke") == "REMOVE_ITEM"

    def test_confirm_order_english(self):
        assert detect_intent("confirm order") == "CONFIRM_ORDER"

    def test_confirm_order_done(self):
        assert detect_intent("done") == "CONFIRM_ORDER"

    def test_confirm_order_place_order(self):
        assert detect_intent("place order") == "CONFIRM_ORDER"

    def test_confirm_order_hindi(self):
        assert detect_intent("bas ho gaya") == "CONFIRM_ORDER"

    def test_confirm_order_theek_hai(self):
        assert detect_intent("theek hai") == "CONFIRM_ORDER"


# ===================== TASK 8: SPEECH RECOGNITION INTERFACE =================

class TestSpeechRecognition:
    """Verify the transcribe_audio function raises correctly w/o library."""

    def test_missing_file_raises(self):
        """If speech_recognition is installed, missing file should error."""
        try:
            import speech_recognition
            with pytest.raises(FileNotFoundError):
                transcribe_audio("nonexistent_audio.wav")
        except ImportError:
            with pytest.raises(RuntimeError, match="speech_recognition"):
                transcribe_audio("nonexistent_audio.wav")

    def test_text_passthrough_skips_audio(self):
        """When text input is provided, we don't need audio processing."""
        result = parse_voice_text("one coke", menu_items=MOCK_MENU)
        assert len(result) == 1
        assert result[0]["item"] == "Coke"


# ===================== TASK 9: FULL PIPELINE END-TO-END =====================

class TestFullPipeline:
    """End-to-end: intent + parse + POS generation."""

    @pytest.fixture(autouse=True)
    def _load_full_menu(self):
        from app.dependencies import get_dataframes
        dfs = get_dataframes()
        self.menu_df = dfs["menu"]
        self.full_menu = self.menu_df["item_name"].tolist()

    def test_pipeline_test1(self):
        """'one paneer pizza and two coke' → full pipeline."""
        text = "one paneer pizza and two coke"
        intent = detect_intent(text)
        parsed = parse_voice_text(text, menu_items=self.full_menu)
        resolved = resolve_items(parsed, self.menu_df)
        order = build_pos_payload(resolved, self.menu_df)

        assert intent == "ORDER_ITEM"
        assert len(parsed) == 2
        assert parsed[0]["item"] == "Paneer Tikka Pizza"
        assert parsed[0]["qty"] == 1
        assert parsed[1]["item"] == "Coke"
        assert parsed[1]["qty"] == 2
        assert order["order_id"] > 0
        assert order["items"][0]["item_id"] == 1
        assert order["items"][1]["item_id"] == 12

    def test_pipeline_test2(self):
        """'ek burger aur do coke' → full pipeline."""
        text = "ek burger aur do coke"
        intent = detect_intent(text)
        language = detect_language(text)
        parsed = parse_voice_text(text, menu_items=self.full_menu)
        resolved = resolve_items(parsed, self.menu_df)
        order = build_pos_payload(resolved, self.menu_df)

        assert intent == "ORDER_ITEM"
        assert language == "hi"
        assert parsed[0]["item"] == "Veg Burger"
        assert parsed[0]["qty"] == 1
        assert parsed[1]["item"] == "Coke"
        assert parsed[1]["qty"] == 2
        assert len(order["items"]) == 2

    def test_pipeline_test3(self):
        """'I want french fries' → full pipeline."""
        text = "I want french fries"
        intent = detect_intent(text)
        parsed = parse_voice_text(text, menu_items=self.full_menu)
        resolved = resolve_items(parsed, self.menu_df)
        order = build_pos_payload(resolved, self.menu_df)

        assert intent == "ORDER_ITEM"
        assert len(parsed) == 1
        assert parsed[0]["item"] == "French Fries"
        assert parsed[0]["qty"] == 1
        assert order["items"][0]["item_id"] == 11

    def test_pipeline_response_shape(self):
        """Verify the combined response has both items and pos_payload."""
        text = "one paneer pizza and two coke"
        parsed = parse_voice_text(text, menu_items=self.full_menu, include_confidence=True)
        resolved = resolve_items(parsed, self.menu_df)
        order = build_pos_payload(resolved, self.menu_df)

        response = {
            "intent": detect_intent(text),
            "items": parsed,
            "pos_payload": {
                "order_id": order["order_id"],
                "items": [{"item_id": r["item_id"], "qty": r["qty"]} for r in resolved],
            },
            "language": detect_language(text),
        }

        assert "intent" in response
        assert "items" in response
        assert "pos_payload" in response
        assert response["intent"] == "ORDER_ITEM"
        assert len(response["items"]) == 2
        assert len(response["pos_payload"]["items"]) == 2
        assert response["pos_payload"]["items"][0]["item_id"] == 1
        assert response["pos_payload"]["items"][1]["item_id"] == 12

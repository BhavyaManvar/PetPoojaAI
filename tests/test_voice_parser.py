"""Tests for the Voice Parser."""

import pytest

from app.services.voice_parser import parse_voice_text, _extract_qty_and_item, detect_language

MOCK_MENU = [
    "Paneer Pizza", "Coke", "Garlic Bread", "Masala Dosa",
    "Veg Burger", "French Fries", "Butter Naan", "Lassi",
]


def test_simple_order():
    result = parse_voice_text("one paneer pizza and two coke", menu_items=MOCK_MENU)
    assert len(result) == 2
    assert result[0]["matched_name"] == "Paneer Pizza"
    assert result[0]["qty"] == 1
    assert result[1]["matched_name"] == "Coke"
    assert result[1]["qty"] == 2


def test_numeric_prefix():
    result = parse_voice_text("3 garlic bread, 1 masala dosa", menu_items=MOCK_MENU)
    assert len(result) == 2
    assert result[0]["qty"] == 3
    assert result[1]["qty"] == 1


def test_hindi_numbers():
    result = parse_voice_text("ek butter naan aur do lassi", menu_items=MOCK_MENU)
    assert len(result) == 2
    assert result[0]["qty"] == 1
    assert result[1]["qty"] == 2


def test_extract_qty_numeric():
    qty, text = _extract_qty_and_item("2 coke")
    assert qty == 2
    assert text == "coke"


def test_extract_qty_word():
    qty, text = _extract_qty_and_item("three garlic bread")
    assert qty == 3
    assert text == "garlic bread"


def test_extract_qty_default():
    qty, text = _extract_qty_and_item("burger")
    assert qty == 1
    assert text == "burger"


def test_detect_language_english():
    assert detect_language("two butter chicken") == "en"


def test_detect_language_hindi():
    assert detect_language("ek paneer tikka aur do naan dena") == "hi"

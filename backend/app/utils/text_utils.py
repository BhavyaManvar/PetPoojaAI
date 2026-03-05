"""Text utilities — number word mappings for multilingual parsing."""

# English and common Hindi/Hinglish number words
_WORD_MAP: dict[str, int] = {
    # English
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "a": 1, "an": 1,
    # Hindi / Hinglish
    "ek": 1, "do": 2, "teen": 3, "char": 4, "paanch": 5,
    "chhe": 6, "saat": 7, "aath": 8, "nau": 9, "das": 10,
}


def word_to_number(word: str) -> int | None:
    """Convert a number word to its integer value, or return None."""
    return _WORD_MAP.get(word.lower().strip())

"""Pydantic models for voice copilot endpoints."""

from pydantic import BaseModel


class VoiceInput(BaseModel):
    text: str


class ParsedItem(BaseModel):
    item: str
    qty: int


class VoiceParsedResponse(BaseModel):
    items: list[ParsedItem]

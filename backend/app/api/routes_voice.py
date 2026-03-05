"""Voice Copilot endpoints — natural language order parsing."""

from fastapi import APIRouter

from app.models.voice_models import VoiceInput, VoiceParsedResponse
from app.services.voice_parser import parse_voice_text

router = APIRouter()


@router.post("/parse", response_model=VoiceParsedResponse)
async def parse_voice(payload: VoiceInput):
    items = parse_voice_text(payload.text)
    return VoiceParsedResponse(items=items)

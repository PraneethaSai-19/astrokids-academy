"""Configurable LLM provider. Keys stay on the server; the browser only talks to FastAPI.

Supported AI_PROVIDER values:
  demo       - curated answers only (no network, no key)
  openai     - any OpenAI-compatible Chat Completions API (OpenAI, Groq, OpenRouter, Ollama, LM Studio ...)
  anthropic  - Anthropic Messages API (Claude)
"""
import logging

import httpx

from app.ai.demo_answers import find_curated_answer
from app.ai.prompts import SYSTEM_PROMPT
from app.core.config import Settings

log = logging.getLogger("astrokids.ai")

DEFAULT_MODELS = {"openai": "gpt-4o-mini", "anthropic": "claude-haiku-5-5"}
DEFAULT_BASE_URLS = {"openai": "https://api.openai.com/v1", "anthropic": "https://api.anthropic.com"}


class AIProviderError(RuntimeError):
    pass


def provider_status(settings: Settings) -> dict:
    provider = settings.ai_provider.lower()
    live = settings.live_ai_configured
    return {
        "mode": "live" if live else "demo",
        "provider": provider if live else "demo",
        "model": (settings.ai_model or DEFAULT_MODELS.get(provider, "")) if live else None,
    }


async def _call_openai(settings: Settings, history: list[dict], message: str) -> str:
    base = (settings.ai_base_url or DEFAULT_BASE_URLS["openai"]).rstrip("/")
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages += [{"role": h["role"], "content": h["content"]} for h in history]
    messages.append({"role": "user", "content": message})
    payload = {"model": settings.ai_model or DEFAULT_MODELS["openai"], "messages": messages,
               "max_tokens": settings.ai_max_tokens, "temperature": 0.6}
    async with httpx.AsyncClient(timeout=settings.ai_timeout_seconds) as client:
        r = await client.post(f"{base}/chat/completions", json=payload,
                              headers={"Authorization": f"Bearer {settings.ai_api_key}"})
    if r.status_code != 200:
        raise AIProviderError(f"OpenAI-compatible API returned {r.status_code}")
    return r.json()["choices"][0]["message"]["content"]


async def _call_anthropic(settings: Settings, history: list[dict], message: str) -> str:
    base = (settings.ai_base_url or DEFAULT_BASE_URLS["anthropic"]).rstrip("/")
    messages = [{"role": h["role"], "content": h["content"]} for h in history]
    messages.append({"role": "user", "content": message})
    payload = {"model": settings.ai_model or DEFAULT_MODELS["anthropic"], "system": SYSTEM_PROMPT,
               "messages": messages, "max_tokens": settings.ai_max_tokens}
    headers = {"x-api-key": settings.ai_api_key, "anthropic-version": "2023-06-01",
               "content-type": "application/json"}
    async with httpx.AsyncClient(timeout=settings.ai_timeout_seconds) as client:
        r = await client.post(f"{base}/v1/messages", json=payload, headers=headers)
    if r.status_code != 200:
        raise AIProviderError(f"Anthropic API returned {r.status_code}")
    data = r.json()
    return "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")


def _clean_history(history: list[dict]) -> list[dict]:
    """Keep the last few turns, alternating user/assistant, starting with a user turn."""
    out = []
    for h in history[-6:]:
        role = "assistant" if h.get("role") in ("bot", "assistant") else "user"
        content = str(h.get("content", ""))[:600]
        if not content:
            continue
        if out and out[-1]["role"] == role:
            out[-1]["content"] += "\n" + content
        else:
            out.append({"role": role, "content": content})
    while out and out[0]["role"] != "user":
        out.pop(0)
    if out and out[-1]["role"] == "user":  # the new message is appended after history
        out.pop()
    return out


async def generate_answer(settings: Settings, message: str, history: list[dict], allow_live: bool) -> dict:
    """Returns {answer, mode, matched_question?, notice?}."""
    if allow_live and settings.live_ai_configured:
        provider = settings.ai_provider.lower()
        try:
            fn = _call_anthropic if provider == "anthropic" else _call_openai
            text = await fn(settings, _clean_history(history), message)
            return {"answer": text, "mode": "live"}
        except (httpx.HTTPError, AIProviderError, KeyError, IndexError, ValueError) as exc:
            log.warning("Live AI failed, using curated answer: %s", exc)
            answer, matched = find_curated_answer(message)
            return {"answer": answer, "mode": "demo", "matched_question": matched,
                    "notice": "AstroBot's live radio is offline, so here is a curated answer."}
    answer, matched = find_curated_answer(message)
    return {"answer": answer, "mode": "demo", "matched_question": matched}

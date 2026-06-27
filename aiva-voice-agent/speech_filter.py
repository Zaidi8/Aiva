"""Aiva — Phase 5: strip leaked tool-call syntax from the spoken text stream.

llama-3.x on Groq is a strong tool-caller, but under pressure it intermittently
emits a tool call as TEXT instead of a real function call — and that text bleeds
into the TTS stream, so the caller literally hears "function check_availability…"
(Phase 5 bug #1). The model-side prompt rule ("never say function") reduces but
does not eliminate this, so we defend at the PIPELINE level: this filter scrubs
the assistant text just before it is synthesized to audio (in `Agent.tts_node`).

The known leak shapes from llama/Groq:
  <function=check_availability>{"date": "..."}</function>
  <tool_call>{"name": "...", "arguments": {...}}</tool_call>
  <|python_tag|>{"name": "book_appointment", "parameters": {...}}
  bare JSON: {"name": "...", "arguments": {...}}

This only affects what is SPOKEN — real tool calls travel a separate structured
channel (ChatChunk.delta.tool_calls) and are untouched, so tools still run.

Streaming correctness: LLM text arrives as many tiny chunks, so a tool tag can
be split across chunks ("<fu", "nct", "ion=…"). The hard case is an OPENING
block tag (`<function …>`): we must not strip it on its own, because its body
(the args) and its closing `</function>` arrive later and would leak. So
mid-stream we remove only fully-formed artifacts (a complete <tag>…</tag> block,
a standalone closing/python tag, or a balanced {…} call object) and hold the
tail from the first unresolved "<" / "{" until it closes. Only at end-of-stream
do we aggressively strip a dangling, never-closed marker.
"""

from __future__ import annotations

import re
from typing import AsyncIterable

_TOOL_NAMES = r"function|tool_call|tool_response|tool_calls"

# A complete <function …>…</function> / <tool_call>…</tool_call> block.
_TOOL_BLOCK_RE = re.compile(
    rf"<\s*({_TOOL_NAMES})\b[^>]*>.*?<\s*/\s*\1\s*>",
    re.IGNORECASE | re.DOTALL,
)
# Mid-stream: only standalone markers safe to remove without a body — a CLOSING
# tag, or the llama python-tag marker (its following {…} call is removed by the
# JSON rule). Opening block tags are deliberately NOT here (see module docstring).
_MIDSTREAM_TAG_RE = re.compile(
    rf"<\s*/\s*(?:{_TOOL_NAMES})\s*>|<\s*\|?python_tag\|?\s*>",
    re.IGNORECASE,
)
# End-of-stream only: any dangling tool tag, opened or closed, even without ">".
_TOOL_TAG_PARTIAL_RE = re.compile(
    rf"<\s*/?\s*(?:\|?python_tag\|?|{_TOOL_NAMES})\b[^>]*>?",
    re.IGNORECASE,
)
# End-of-stream only: a never-closed JSON call object trailing the text.
_TRAILING_JSON_RE = re.compile(
    r'\{[^{}]*"(?:arguments|parameters|name)"\s*:[\s\S]*$',
    re.IGNORECASE,
)
# A balanced JSON object is a leaked tool call if it carries one of these keys.
_CALL_KEY_RE = re.compile(r'"(?:arguments|parameters|name)"\s*:', re.IGNORECASE)


def _strip_json_calls(s: str) -> str:
    """Drop any complete, brace-balanced {...} object that looks like a tool call."""
    out: list[str] = []
    i, n = 0, len(s)
    while i < n:
        if s[i] == "{":
            depth, j = 0, i
            while j < n:
                if s[j] == "{":
                    depth += 1
                elif s[j] == "}":
                    depth -= 1
                    if depth == 0:
                        break
                j += 1
            if j < n:  # found the matching close brace
                span = s[i : j + 1]
                if _CALL_KEY_RE.search(span):
                    i = j + 1  # drop the whole tool-call object
                    continue
            # unmatched, or a benign object: fall through and emit char-by-char
        out.append(s[i])
        i += 1
    return "".join(out)


def scrub_text(s: str, *, final: bool = False) -> str:
    """Remove tool-call artifacts. Mid-stream removes only fully-formed artifacts;
    `final=True` (end of stream) also strips dangling, never-closed markers."""
    s = _TOOL_BLOCK_RE.sub(" ", s)
    s = _MIDSTREAM_TAG_RE.sub(" ", s)
    s = _strip_json_calls(s)
    if final:
        s = _TOOL_TAG_PARTIAL_RE.sub(" ", s)
        s = _TRAILING_JSON_RE.sub(" ", s)
    return s


async def sanitize_for_speech(text: AsyncIterable[str]) -> AsyncIterable[str]:
    """Filter an LLM text stream so leaked tool-call syntax is never synthesized.

    Streaming-safe: emits clean text as it arrives, but holds the tail from the
    first unresolved "<" or "{" until it closes (or the stream ends). Normal
    speech contains neither character, so ordinary replies stream without delay.
    """
    buffer = ""
    async for chunk in text:
        buffer = scrub_text(buffer + chunk)
        # Hold the tail from the earliest still-open marker; emit the clean prefix.
        marks = [p for p in (buffer.find("<"), buffer.find("{")) if p != -1]
        if marks:
            hold = min(marks)
            emit, buffer = buffer[:hold], buffer[hold:]
        else:
            emit, buffer = buffer, ""
        if emit:
            yield emit
    tail = scrub_text(buffer, final=True)
    if tail.strip():
        yield tail

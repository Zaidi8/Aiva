"""FallbackAdapter with a bounded recovery cooldown for rate-limited models.

Foreground generations are always delegated to LiveKit. Only background
recovery probes are skipped while a model's 429 cooldown is active.
"""

from __future__ import annotations

import logging
import time
from collections.abc import AsyncIterable
from typing import Any

from livekit.agents._exceptions import APIError, APIStatusError
from livekit.agents.llm import ChatChunk, ChatContext, LLM, LLMStream
from livekit.agents.llm.fallback_adapter import (
    DEFAULT_FALLBACK_API_CONNECT_OPTIONS,
    FallbackAdapter,
    FallbackLLMStream,
)
from livekit.agents.llm.tool_context import Tool, ToolChoice
from livekit.agents.types import APIConnectOptions, NOT_GIVEN, NotGivenOr

logger = logging.getLogger("aiva.rate_limit_fallback")

# Groq reports TPM limits over a one-minute window. This cooldown avoids
# repeated recovery generations within that window; adjust this constant here.
DEFAULT_RATE_LIMIT_COOLDOWN_SECONDS = 60.0


class RateLimitAwareFallbackAdapter(FallbackAdapter):
    """LiveKit fallback adapter that suppresses recovery probes after HTTP 429."""

    def __init__(
        self,
        llm: list[LLM],
        *,
        rate_limit_cooldown_seconds: float = DEFAULT_RATE_LIMIT_COOLDOWN_SECONDS,
        attempt_timeout: float = 5.0,
        max_retry_per_llm: int = 0,
        retry_interval: float = 0.5,
        retry_on_chunk_sent: bool = False,
    ) -> None:
        if rate_limit_cooldown_seconds < 0:
            raise ValueError("rate_limit_cooldown_seconds must be non-negative")
        super().__init__(
            llm,
            attempt_timeout=attempt_timeout,
            max_retry_per_llm=max_retry_per_llm,
            retry_interval=retry_interval,
            retry_on_chunk_sent=retry_on_chunk_sent,
        )
        self._rate_limit_cooldown_seconds = rate_limit_cooldown_seconds
        self._rate_limited_until: dict[int, float] = {}

    def _mark_rate_limited(self, model: LLM) -> None:
        index = self._llm_instances.index(model)
        self._rate_limited_until[index] = time.monotonic() + self._rate_limit_cooldown_seconds
        logger.info(
            "Model recovery cooldown started after HTTP 429",
            extra={
                "model": model.model,
                "model_index": index,
                "cooldown_seconds": self._rate_limit_cooldown_seconds,
            },
        )

    def _is_rate_limited(self, model: LLM) -> bool:
        index = self._llm_instances.index(model)
        until = self._rate_limited_until.get(index)
        if until is None:
            return False
        if time.monotonic() >= until:
            self._rate_limited_until.pop(index, None)
            return False
        return True

    def _clear_rate_limit(self, model: LLM) -> None:
        self._rate_limited_until.pop(self._llm_instances.index(model), None)

    def chat(
        self,
        *,
        chat_ctx: ChatContext,
        tools: list[Tool] | None = None,
        conn_options: APIConnectOptions = DEFAULT_FALLBACK_API_CONNECT_OPTIONS,
        parallel_tool_calls: NotGivenOr[bool] = NOT_GIVEN,
        tool_choice: NotGivenOr[ToolChoice] = NOT_GIVEN,
        extra_kwargs: NotGivenOr[dict[str, Any]] = NOT_GIVEN,
    ) -> LLMStream:
        # LiveKit 1.5.12's chat() hardcodes FallbackLLMStream; construct its
        # narrow subclass while preserving the exact call options and defaults.
        return RateLimitAwareFallbackStream(
            llm=self,
            conn_options=conn_options,
            chat_ctx=chat_ctx,
            tools=tools or [],
            parallel_tool_calls=parallel_tool_calls,
            tool_choice=tool_choice,
            extra_kwargs=extra_kwargs,
        )


class RateLimitAwareFallbackStream(FallbackLLMStream):
    async def _run(self) -> None:
        # Keep LiveKit's model-selection/fallback implementation intact. If a
        # foreground provider returned 429 and the adapter then exhausted its
        # normal fallback pass, make the outer LLMStream error non-retryable.
        # This prevents repeating the same Qwen -> GPT-OSS pass up to four times.
        self._foreground_rate_limit_error: APIStatusError | None = None
        try:
            await super()._run()
        except APIError as exc:
            rate_limit_error = self._foreground_rate_limit_error
            if rate_limit_error is None:
                raise

            logger.info(
                "Stopping outer LLM retry after provider HTTP 429",
                extra={
                    "request_id": rate_limit_error.request_id,
                    "status_code": rate_limit_error.status_code,
                },
            )
            raise APIStatusError(
                rate_limit_error.message,
                status_code=rate_limit_error.status_code,
                request_id=rate_limit_error.request_id,
                body=rate_limit_error.body,
                retryable=False,
            ) from exc

    async def _try_generate(
        self, *, llm: LLM, check_recovery: bool = False
    ) -> AsyncIterable[ChatChunk]:
        try:
            async for chunk in super()._try_generate(llm=llm, check_recovery=check_recovery):
                yield chunk
        except APIStatusError as exc:
            if exc.status_code == 429:
                adapter = self._fallback_adapter
                assert isinstance(adapter, RateLimitAwareFallbackAdapter)
                adapter._mark_rate_limited(llm)
                if not check_recovery:
                    self._foreground_rate_limit_error = exc
            raise
        else:
            # Clear only after the stream completed normally. Cancellation or
            # a failed/partially consumed stream leaves the suppression intact.
            adapter = self._fallback_adapter
            assert isinstance(adapter, RateLimitAwareFallbackAdapter)
            adapter._clear_rate_limit(llm)

    def _try_recovery(self, llm: LLM) -> None:
        adapter = self._fallback_adapter
        assert isinstance(adapter, RateLimitAwareFallbackAdapter)
        if adapter._is_rate_limited(llm):
            logger.info(
                "Skipping model recovery probe during HTTP 429 cooldown",
                extra={"model": llm.model, "model_index": adapter._llm_instances.index(llm)},
            )
            return
        super()._try_recovery(llm)

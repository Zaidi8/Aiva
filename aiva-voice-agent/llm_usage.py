"""Privacy-conscious, observational telemetry for the voice agent's LLM path.

Token counts split by request component are estimates (characters / 4). Provider
usage in LiveKit's LLMMetrics is recorded separately and remains authoritative.
No prompt, transcript, tool argument, or tool result text is written to logs.
"""

from __future__ import annotations

import asyncio
import contextvars
import hashlib
import json
import logging
import math
import re
import time
import uuid
from collections import Counter, deque
from dataclasses import dataclass, field
from typing import Any

from livekit.agents import llm
from livekit.agents._exceptions import APIStatusError
from livekit.agents.llm import ChatContext, FunctionCall, FunctionCallOutput
from livekit.agents.llm.tool_context import ToolContext

logger = logging.getLogger("aiva.llm_usage")

_CURRENT_REQUEST: contextvars.ContextVar["LogicalRequest | None"] = contextvars.ContextVar(
    "aiva_llm_logical_request", default=None
)
_CURRENT_ATTEMPT: contextvars.ContextVar["Attempt | None"] = contextvars.ContextVar(
    "aiva_llm_provider_attempt", default=None
)
_CURRENT_LIFECYCLE: contextvars.ContextVar[dict[str, Any] | None] = contextvars.ContextVar(
    "aiva_llm_attempt_lifecycle", default=None
)
_CURRENT_OUTER_RUN: contextvars.ContextVar[tuple[int, Any] | None] = contextvars.ContextVar(
    "aiva_llm_outer_run", default=None
)
_RECOVERY_TASK_IDS: dict[asyncio.Task[Any], str] = {}


def _estimate_tokens(characters: int) -> int:
    return math.ceil(characters / 4) if characters else 0


def _json_chars(value: Any) -> int:
    try:
        return len(json.dumps(value, ensure_ascii=False, separators=(",", ":"), default=str))
    except Exception:
        return 0


def _item_text(item: Any) -> str:
    if isinstance(item, FunctionCall):
        return item.name + item.arguments
    if isinstance(item, FunctionCallOutput):
        return str(item.output or "")
    text = getattr(item, "text_content", None)
    if isinstance(text, str):
        return text
    content = getattr(item, "content", None)
    return str(content or "")


def _safe_error(exc: Exception) -> dict[str, Any]:
    status = getattr(exc, "status_code", None)
    request_id = getattr(exc, "request_id", None)
    result: dict[str, Any] = {
        "error_type": type(exc).__name__,
        "provider_error_type": None,
        "error_code": None,
        "status": status,
        "request_id": request_id,
        "retryable": getattr(exc, "retryable", None),
        "provider_usage_available": False,
        "rate_limit": None,
    }
    quota_pattern = (
        r"Limit\s*:?\s*([\d,]+)(?:\s*TPM)?\s*,?\s+"
        r"Used\s*:?\s*([\d,]+)\s*,?\s+Requested\s*:?\s*([\d,]+)"
    )
    quota_text = ""
    if isinstance(exc, APIStatusError):
        body = getattr(exc, "body", None)
        if isinstance(body, dict):
            message = body.get("message")
            provider_type = body.get("type")
            if isinstance(provider_type, str):
                result["provider_error_type"] = provider_type[:100]
            if isinstance(message, str):
                quota_text = message

            code = body.get("code")
            if isinstance(code, str):
                result["error_code"] = code[:100]

            error = body.get("error")
            if result["error_code"] is None and isinstance(error, dict) and isinstance(error.get("code"), str):
                result["error_code"] = error["code"][:100]
            elif result["error_code"] is None and isinstance(error, str):
                result["error_code"] = error[:100]
    # Prefer the flattened body message; fall back to exception text for older
    # and non-APIStatusError formats. Only numeric quota values are retained.
    match = re.search(quota_pattern, quota_text or str(exc), flags=re.IGNORECASE)
    if match:
        result["rate_limit"] = {
            "limit": int(match.group(1).replace(",", "")),
            "used": int(match.group(2).replace(",", "")),
            "requested": int(match.group(3).replace(",", "")),
        }
    return result


@dataclass
class Attempt:
    logical: "LogicalRequest"
    attempt_id: str
    attempt_number: int
    fallback_number: int
    retry_number: int
    provider: str
    model: str
    model_role: str
    outer_run_index: int | None
    check_recovery: bool
    recovery_task_id: str | None
    model_available_at_start: bool | None
    attempt_type: str = "completion"
    started: float = field(default_factory=time.perf_counter)


@dataclass
class LogicalRequest:
    tracker: "LLMUsageTracker"
    logical_request_id: str
    turn_id: int
    started: float
    attempts: int = 0
    provider_attempts: list[dict[str, Any]] = field(default_factory=list)
    tool_calls: list[str] = field(default_factory=list)
    component: dict[str, Any] = field(default_factory=dict)


_ROLLING: deque[dict[str, Any]] = deque()
_ROLLING_LOCK = asyncio.Lock()


class LLMUsageTracker:
    def __init__(self, *, call_id: str, room_id: str, job_id: str) -> None:
        self.call_id = call_id
        self.room_id = room_id
        self.job_id = job_id
        self.turn_id = 0
        self.turn_lengths: dict[int, dict[str, Any]] = {}
        self.started = time.time()
        self.llms: list[Any] = []
        self.fallback_adapter: Any | None = None
        self.tools: list[Any] = []
        self.last_request: LogicalRequest | None = None
        self.counts: Counter[str] = Counter()
        self.token_totals: Counter[str] = Counter()
        self.component_totals: Counter[str] = Counter()
        self.tool_totals: Counter[str] = Counter()
        self.tool_durations: Counter[str] = Counter()
        self.max_input_tokens: int | None = None
        self.rate_limit_errors = 0
        self.other_errors = 0
        self.usage_requests = 0

    def begin_user_turn(self, text: str) -> int:
        self.turn_id += 1
        self.turn_lengths[self.turn_id] = {
            "user_message_length": len(text),
            "user_message_hash": hashlib.sha256(text.encode("utf-8")).hexdigest()[:16],
        }
        logger.info(
            "LLM_USER_TURN %s",
            json.dumps({
                "call_id": self.call_id,
                "room_id": self.room_id,
                "job_id": self.job_id,
                "turn_id": self.turn_id,
                **self.turn_lengths[self.turn_id],
            }, separators=(",", ":")),
        )
        return self.turn_id

    def attach_llms(self, llms: list[Any]) -> None:
        """Listen to the pinned provider metrics/errors and wrap chat() transparently."""
        self.llms = llms
        for fallback_number, model in enumerate(llms):
            original_chat = model.chat

            def observed_chat(instance: Any, *args: Any, _original=original_chat,
                              _model=model, _fallback=fallback_number, **kwargs: Any):
                logical = _CURRENT_REQUEST.get()
                if logical is not None:
                    logical.attempts += 1
                    lifecycle = _CURRENT_LIFECYCLE.get() or {}
                    check_recovery = bool(lifecycle.get("check_recovery", False))
                    attempt = Attempt(
                        logical=logical,
                        attempt_id=str(uuid.uuid4()),
                        attempt_number=logical.attempts,
                        fallback_number=_fallback,
                        # FallbackAdapter 1.5.12 sets each provider connection's
                        # max_retry to max_retry_per_llm (default 0).
                        retry_number=0,
                        provider=_provider_name(getattr(_model, "provider", "unknown")),
                        model=str(getattr(_model, "model", "unknown")),
                        model_role="primary" if _fallback == 0 else "fallback",
                        outer_run_index=lifecycle.get("outer_run_index"),
                        check_recovery=check_recovery,
                        recovery_task_id=(lifecycle or {}).get("recovery_task_id"),
                        model_available_at_start=(lifecycle or {}).get("model_available"),
                        attempt_type="recovery_probe" if check_recovery else "completion",
                    )
                    token = _CURRENT_ATTEMPT.set(attempt)
                    try:
                        stream = _original(*args, **kwargs)
                    finally:
                        _CURRENT_ATTEMPT.reset(token)
                    logical.provider_attempts.append({"attempt": attempt, "result": None})
                    for component_name in (
                        "system_prompt_tokens", "tool_definition_tokens",
                        "conversation_history_tokens", "tool_result_tokens",
                        "current_user_message_tokens", "estimated_input_tokens",
                    ):
                        self.component_totals[component_name] += int(
                            logical.component.get(component_name, 0)
                        )
                    try:
                        self._log_attempt_start(attempt)
                    except Exception:
                        logger.exception("Failed to log LLM attempt start")
                    return stream
                return _original(*args, **kwargs)

            # Instance-only wrapper; it delegates to the exact same bound method
            # with identical arguments and return value.
            model.chat = observed_chat.__get__(model, type(model))
            model.on("metrics_collected", self._safe_on_metrics)
            model.on("error", self._safe_on_error)

    def detach_llms(self) -> None:
        for model in self.llms:
            model.off("metrics_collected", self._safe_on_metrics)
            model.off("error", self._safe_on_error)
        adapter = self.fallback_adapter
        if adapter is not None:
            adapter.off("llm_availability_changed", self._safe_on_availability_changed)

    def attach_fallback_adapter(self, adapter: Any) -> None:
        """Observe 1.5.12 adapter lifecycle without changing its retry decisions."""
        self.fallback_adapter = adapter
        original_chat = adapter.chat

        def observed_adapter_chat(instance: Any, *args: Any, **kwargs: Any):
            stream = original_chat(*args, **kwargs)
            self._instrument_fallback_stream(stream)
            return stream

        adapter.chat = observed_adapter_chat.__get__(adapter, type(adapter))
        adapter.on("llm_availability_changed", self._safe_on_availability_changed)

    def _instrument_fallback_stream(self, stream: Any) -> None:
        original_run = stream._run
        original_try_generate = stream._try_generate
        original_try_recovery = stream._try_recovery

        async def observed_run(instance: Any) -> None:
            run_index = getattr(instance, "_aiva_outer_run_index", 0) + 1
            instance._aiva_outer_run_index = run_index
            run_token = _CURRENT_OUTER_RUN.set((run_index, instance))
            started = time.perf_counter()
            logical = _CURRENT_REQUEST.get()
            self._log_lifecycle_event("LLM_OUTER_RUN_START", logical, {
                "outer_run_index": run_index,
            })
            error: Exception | None = None
            try:
                await original_run()
            except Exception as exc:
                error = exc
                raise
            finally:
                self._log_lifecycle_event("LLM_OUTER_RUN_RESULT", logical, {
                    "outer_run_index": run_index,
                    "duration_ms": round((time.perf_counter() - started) * 1000, 2),
                    "success": error is None,
                    "error_type": type(error).__name__ if error else None,
                    "status": getattr(error, "status_code", None) if error else None,
                })
                _CURRENT_OUTER_RUN.reset(run_token)

        async def observed_try_generate(
            instance: Any, *, llm: Any, check_recovery: bool = False
        ):
            run = _CURRENT_OUTER_RUN.get()
            index = instance._fallback_adapter._llm_instances.index(llm)
            logical = _CURRENT_REQUEST.get()
            task = asyncio.current_task() if check_recovery else None
            recovery_id = _RECOVERY_TASK_IDS.get(task) if task is not None else None
            lifecycle = {
                "outer_run_index": run[0] if run else None,
                "check_recovery": check_recovery,
                "recovery_task_id": recovery_id,
                "model_role": "primary" if index == 0 else "fallback",
                "model_available": instance._fallback_adapter._status[index].available,
            }
            lifecycle_token = _CURRENT_LIFECYCLE.set(lifecycle)
            try:
                async for item in original_try_generate(
                    llm=llm, check_recovery=check_recovery
                ):
                    yield item
            finally:
                _CURRENT_LIFECYCLE.reset(lifecycle_token)

        def observed_try_recovery(instance: Any, model: Any) -> None:
            adapter = instance._fallback_adapter
            index = adapter._llm_instances.index(model)
            status = adapter._status[index]
            previous_task = status.recovering_task
            original_try_recovery(model)
            task = status.recovering_task
            if task is not None and task is not previous_task:
                recovery_id = str(uuid.uuid4())
                _RECOVERY_TASK_IDS[task] = recovery_id
                task.add_done_callback(lambda done: _RECOVERY_TASK_IDS.pop(done, None))
                self._log_lifecycle_event("LLM_RECOVERY_TASK_START", _CURRENT_REQUEST.get(), {
                    "outer_run_index": ( _CURRENT_OUTER_RUN.get() or (None, None) )[0],
                    "recovery_task_id": recovery_id,
                    "model_role": "primary" if index == 0 else "fallback",
                    "model": str(getattr(model, "model", "unknown")),
                    "model_available": status.available,
                })

        stream._run = observed_run.__get__(stream, type(stream))
        stream._try_generate = observed_try_generate.__get__(stream, type(stream))
        stream._try_recovery = observed_try_recovery.__get__(stream, type(stream))

    def _log_lifecycle_event(
        self, event_name: str, logical: LogicalRequest | None, fields: dict[str, Any]
    ) -> None:
        try:
            logger.info("%s %s", event_name, json.dumps({
                "timestamp": time.time(), "event": event_name,
                "call_id": self.call_id, "room_id": self.room_id, "job_id": self.job_id,
                "turn_id": logical.turn_id if logical else self.turn_id,
                "logical_request_id": logical.logical_request_id if logical else None,
                **fields,
            }, separators=(",", ":")))
        except Exception:
            logger.exception("Failed to record LLM lifecycle event")

    def _safe_on_availability_changed(self, event: Any) -> None:
        try:
            model = getattr(event, "llm", None)
            index = self.llms.index(model) if model in self.llms else -1
            task = asyncio.current_task()
            recovery_id = _RECOVERY_TASK_IDS.get(task) if task is not None else None
            self._log_lifecycle_event("LLM_MODEL_AVAILABILITY", _CURRENT_REQUEST.get(), {
                "model_role": "primary" if index == 0 else "fallback" if index > 0 else None,
                "model": str(getattr(model, "model", "unknown")),
                "model_available": bool(getattr(event, "available", False)),
                "outer_run_index": (_CURRENT_OUTER_RUN.get() or (None, None))[0],
                "check_recovery": recovery_id is not None,
                "recovery_task_id": recovery_id,
            })
        except Exception:
            logger.exception("Failed to record LLM model availability event")

    def _safe_on_metrics(self, metrics: Any) -> None:
        try:
            self._on_metrics(metrics)
        except Exception:
            logger.exception("Failed to record LLM metrics event")

    def _safe_on_error(self, error_event: Any) -> None:
        try:
            self._on_error(error_event)
        except Exception:
            logger.exception("Failed to record LLM error event")

    def _log_attempt_start(self, attempt: Attempt) -> None:
        logical = attempt.logical
        event = {
            "timestamp": time.time(), "event": "LLM_ATTEMPT_START",
            "call_id": self.call_id, "room_id": self.room_id, "job_id": self.job_id,
            "turn_id": logical.turn_id, "logical_request_id": logical.logical_request_id,
            "attempt_id": attempt.attempt_id, "attempt_number": attempt.attempt_number,
            "fallback_number": attempt.fallback_number, "retry_number": attempt.retry_number,
            "outer_run_index": attempt.outer_run_index,
            "check_recovery": attempt.check_recovery,
            "recovery_task_id": attempt.recovery_task_id,
            "model_role": attempt.model_role,
            "model_available_at_start": attempt.model_available_at_start,
            "attempt_type": attempt.attempt_type,
            "provider": attempt.provider, "model": attempt.model,
            "max_completion_tokens": _max_completion_tokens(self.llms[attempt.fallback_number]),
            **logical.component,
        }
        logger.info("LLM_ATTEMPT_START %s", json.dumps(event, separators=(",", ":")))

    def _find_attempt(self) -> Attempt | None:
        attempt = _CURRENT_ATTEMPT.get()
        if attempt is not None:
            return attempt
        # EventEmitter callbacks are normally invoked in the stream task context.
        # This fallback is for SDK event dispatches that do not preserve ContextVars.
        logical = self.last_request
        if logical and logical.provider_attempts:
            latest = logical.provider_attempts[-1]["attempt"]
            return latest
        return None

    def _on_metrics(self, metrics: Any) -> None:
        attempt = self._find_attempt()
        if attempt is None:
            return
        prompt = int(getattr(metrics, "prompt_tokens", 0) or 0)
        completion = int(getattr(metrics, "completion_tokens", 0) or 0)
        total = int(getattr(metrics, "total_tokens", 0) or 0)
        available = total > 0
        cached = int(getattr(metrics, "prompt_cached_tokens", 0) or 0)
        event = {
            "timestamp": time.time(), "event": "LLM_ATTEMPT_RESULT",
            "call_id": self.call_id, "room_id": self.room_id, "job_id": self.job_id,
            "turn_id": attempt.logical.turn_id,
            "logical_request_id": attempt.logical.logical_request_id,
            "attempt_id": attempt.attempt_id, "attempt_number": attempt.attempt_number,
            "fallback_number": attempt.fallback_number, "retry_number": attempt.retry_number,
            "outer_run_index": attempt.outer_run_index,
            "check_recovery": attempt.check_recovery,
            "recovery_task_id": attempt.recovery_task_id,
            "model_role": attempt.model_role,
            "model_available_at_start": attempt.model_available_at_start,
            "attempt_type": attempt.attempt_type,
            "provider": attempt.provider, "model": attempt.model,
            "max_completion_tokens": _max_completion_tokens(self.llms[attempt.fallback_number]),
            "request_id": getattr(metrics, "request_id", None),
            "status": None, "error_type": None, "error_code": None,
            "latency_ms": round(float(getattr(metrics, "duration", 0)) * 1000, 2),
            "time_to_first_token_ms": round(float(getattr(metrics, "ttft", 0)) * 1000, 2),
            "provider_input_tokens": prompt if available else None,
            "provider_cached_input_tokens": cached if available else None,
            "provider_uncached_input_tokens": max(0, prompt - cached) if available else None,
            "provider_output_tokens": completion if available else None,
            "provider_total_tokens": total if available else None,
            "provider_usage_available": available,
            "success": True,
            "tool_call": None,
            "tool_name": None,
        }
        self._record_attempt(attempt, event)

    def _on_error(self, error_event: Any) -> None:
        attempt = self._find_attempt()
        if attempt is None:
            return
        exc = getattr(error_event, "error", Exception("unknown"))
        safe = _safe_error(exc)
        elapsed = (time.perf_counter() - attempt.started) * 1000
        event = {
            "timestamp": time.time(), "event": "LLM_ATTEMPT_RESULT",
            "call_id": self.call_id, "room_id": self.room_id, "job_id": self.job_id,
            "turn_id": attempt.logical.turn_id,
            "logical_request_id": attempt.logical.logical_request_id,
            "attempt_id": attempt.attempt_id, "attempt_number": attempt.attempt_number,
            "fallback_number": attempt.fallback_number, "retry_number": attempt.retry_number,
            "outer_run_index": attempt.outer_run_index,
            "check_recovery": attempt.check_recovery,
            "recovery_task_id": attempt.recovery_task_id,
            "model_role": attempt.model_role,
            "model_available_at_start": attempt.model_available_at_start,
            "attempt_type": attempt.attempt_type,
            "provider": attempt.provider, "model": attempt.model,
            "status": safe["status"], "error_type": safe["error_type"],
            "error_code": safe["error_code"], "request_id": safe["request_id"],
            "retryable": safe["retryable"], "rate_limit": safe["rate_limit"],
            "latency_ms": round(elapsed, 2), "time_to_first_token_ms": None,
            "provider_input_tokens": None, "provider_output_tokens": None,
            "provider_cached_input_tokens": None, "provider_uncached_input_tokens": None,
            "provider_total_tokens": None, "provider_usage_available": False,
            "success": False, "tool_call": None, "tool_name": None,
        }
        self._record_attempt(attempt, event)

    def _record_attempt(self, attempt: Attempt, event: dict[str, Any]) -> None:
        for entry in attempt.logical.provider_attempts:
            if entry["attempt"] is attempt:
                entry["result"] = event
                break
        self.counts["llm_requests"] += 1
        if attempt.attempt_type == "recovery_probe":
            self.counts["recovery_probe_requests"] += 1
        else:
            self.counts["fallback_requests" if attempt.fallback_number else "primary_requests"] += 1
        if event["success"]:
            if event.get("provider_usage_available"):
                self.usage_requests += 1
            for key, metric in (("input_tokens", "provider_input_tokens"),
                                ("cached_input_tokens", "provider_cached_input_tokens"),
                                ("output_tokens", "provider_output_tokens"),
                                ("total_tokens", "provider_total_tokens")):
                value = event.get(metric)
                if value is not None:
                    self.token_totals[key] += value
            value = event.get("provider_input_tokens")
            if value is not None:
                self.max_input_tokens = max(self.max_input_tokens or 0, value)
        else:
            if event.get("status") == 429:
                self.rate_limit_errors += 1
            else:
                self.other_errors += 1
        logger.info("LLM_ATTEMPT_RESULT %s", json.dumps(event, separators=(",", ":")))
        rolling = {
            "time": time.time(), "call_id": self.call_id,
            "input": event.get("provider_input_tokens") or 0,
            "uncached_input": event.get("provider_uncached_input_tokens") or 0,
            "output": event.get("provider_output_tokens") or 0,
            "success": event["success"], "fallback": bool(attempt.fallback_number),
            "retry": bool(attempt.retry_number), "status": event.get("status"),
            "recovery_probe": attempt.attempt_type == "recovery_probe",
        }
        cutoff = rolling["time"] - 60
        while _ROLLING and _ROLLING[0]["time"] < cutoff:
            _ROLLING.popleft()
        _ROLLING.append(rolling)

    def begin_request(self, chat_ctx: ChatContext, tools: list[Any]) -> tuple[LogicalRequest, contextvars.Token]:
        self.counts["llm_logical_requests"] += 1
        logical = LogicalRequest(
            tracker=self,
            logical_request_id=str(uuid.uuid4()),
            turn_id=self.turn_id,
            started=time.perf_counter(),
        )
        logical.component = _request_components(chat_ctx, tools)
        self.last_request = logical
        token = _CURRENT_REQUEST.set(logical)
        logger.info("LLM_REQUEST %s", json.dumps({
            "timestamp": time.time(), "call_id": self.call_id, "room_id": self.room_id,
            "job_id": self.job_id, "turn_id": logical.turn_id,
            "logical_request_id": logical.logical_request_id,
            "attempt_id": None, "provider": None, "model": None,
            "status": None, "error_type": None, "error_code": None,
            "latency_ms": None, "time_to_first_token_ms": None,
            "provider_input_tokens": None, "provider_output_tokens": None,
            "provider_total_tokens": None, "provider_usage_available": None,
            "success": None, "tool_call": None, "tool_name": None,
            "attempt_number": None, "fallback_number": None, "retry_number": None,
            "attempt_type": None,
            "max_completion_tokens": None, **logical.component,
        }, separators=(",", ":")))
        return logical, token

    def end_request(self, token: contextvars.Token) -> None:
        _CURRENT_REQUEST.reset(token)

    def wrap_tools(self, tools: list[Any]) -> list[Any]:
        self.tools = tools
        for tool in tools:
            fn = getattr(tool, "_func", None)
            if fn is None or getattr(tool, "_aiva_usage_wrapped", False):
                continue

            async def observed(context: Any, *args: Any, _fn=fn,
                               _name=tool.info.name, **kwargs: Any) -> Any:
                started = time.perf_counter()
                error_type = None
                result_chars = 0
                success = False
                function_call = getattr(context, "function_call", None)
                call_id = getattr(function_call, "call_id", None)
                logical = self.last_request
                turn_id = logical.turn_id if logical else self.turn_id
                start_event = {
                    "timestamp": time.time(), "event": "LLM_TOOL_START",
                    "call_id": self.call_id, "room_id": self.room_id,
                    "job_id": self.job_id, "turn_id": turn_id,
                    "logical_request_id": logical.logical_request_id if logical else None,
                    "tool_call_id": call_id, "tool_name": _name,
                }
                logger.info("LLM_TOOL_START %s", json.dumps(start_event, separators=(",", ":")))
                try:
                    result = await _fn(context, *args, **kwargs)
                    result_chars = len(result) if isinstance(result, str) else _json_chars(result)
                    success = True
                    return result
                except Exception as exc:
                    error_type = type(exc).__name__
                    raise
                finally:
                    elapsed = (time.perf_counter() - started) * 1000
                    logical = self.last_request or logical
                    turn_id = logical.turn_id if logical else turn_id
                    if logical:
                        logical.tool_calls.append(_name)
                        last_attempt = next(
                            (entry["attempt"] for entry in reversed(logical.provider_attempts)
                             if entry.get("result") and entry["result"].get("success")),
                            None,
                        )
                        link_event = {
                            "timestamp": time.time(), "event": "LLM_TOOL_LINK",
                            "call_id": self.call_id, "room_id": self.room_id,
                            "job_id": self.job_id, "turn_id": turn_id,
                            "logical_request_id": logical.logical_request_id,
                            "attempt_id": last_attempt.attempt_id if last_attempt else None,
                            "tool_call_id": call_id, "tool_call": True,
                            "tool_name": _name,
                        }
                        logger.info("LLM_TOOL_LINK %s", json.dumps(link_event, separators=(",", ":")))
                    self.tool_totals[_name] += 1
                    self.tool_durations[_name] += int(elapsed)
                    event = {
                        "timestamp": time.time(), "event": "LLM_TOOL_RESULT",
                        "call_id": self.call_id, "room_id": self.room_id,
                        "job_id": self.job_id, "turn_id": turn_id,
                        "logical_request_id": logical.logical_request_id if logical else None,
                        "tool_call_id": call_id, "tool_name": _name,
                        "tool_call_started": True, "tool_call_completed": True,
                        "execution_time_ms": round(elapsed, 2),
                        "result_character_count": result_chars,
                        "result_token_estimate": _estimate_tokens(result_chars),
                        "success": success, "error_type": error_type,
                    }
                    logger.info("LLM_TOOL_RESULT %s", json.dumps(event, separators=(",", ":")))

            tool._func = observed
            tool._aiva_usage_wrapped = True
        return tools

    async def log_call_summary(self) -> None:
        now = time.time()
        async with _ROLLING_LOCK:
            while _ROLLING and now - _ROLLING[0]["time"] > 60:
                _ROLLING.popleft()
            roll = list(_ROLLING)
        roll_summary = {
            "requests": len(roll),
            "input_tokens": sum(item["input"] for item in roll),
            "uncached_input_tokens": sum(item["uncached_input"] for item in roll),
            "output_tokens": sum(item["output"] for item in roll),
            "total_tokens": sum(item["input"] + item["output"] for item in roll),
            "primary_requests": sum(not item["fallback"] for item in roll),
            "fallback_requests": sum(item["fallback"] for item in roll),
            "retry_requests": sum(item["retry"] for item in roll),
            "recovery_probe_requests": sum(item["recovery_probe"] for item in roll),
            "429_count": sum(item["status"] == 429 for item in roll),
            "scope": "worker-local observed completions; not organization usage",
        }
        n = self.counts["llm_requests"]
        summary = {
            "timestamp": now, "event": "LLM_CALL_SUMMARY", "call_id": self.call_id,
            "room_id": self.room_id, "job_id": self.job_id,
            "duration_seconds": round(now - self.started, 2),
            "user_turns": self.turn_id, **self.counts,
            "total_input_tokens": self.token_totals["input_tokens"],
            "cached_input_tokens": self.token_totals["cached_input_tokens"],
            "total_output_tokens": self.token_totals["output_tokens"],
            "total_tokens": self.token_totals["total_tokens"],
            "provider_usage_requests": self.usage_requests,
            "avg_input_tokens_per_request": round(self.token_totals["input_tokens"] / self.usage_requests, 1) if self.usage_requests else None,
            "max_input_tokens_per_request": self.max_input_tokens,
            "rate_limit_errors": self.rate_limit_errors,
            "other_errors": self.other_errors,
            "tool_calls": sum(self.tool_totals.values()),
            "tool_calls_by_name": dict(self.tool_totals),
            "tool_execution_ms_by_name": dict(self.tool_durations),
            "estimated_input_component_tokens": dict(self.component_totals),
            "last_60_seconds": roll_summary,
        }
        logger.info("LLM_CALL_SUMMARY %s", json.dumps(summary, separators=(",", ":")))


def _max_completion_tokens(model: Any) -> int | None:
    value = getattr(getattr(model, "_opts", None), "max_completion_tokens", None)
    return value if isinstance(value, int) else None


def _provider_name(value: Any) -> str:
    name = str(value or "unknown")
    return "groq" if "groq" in name.lower() else name


def _request_components(chat_ctx: ChatContext, tools: list[Any]) -> dict[str, Any]:
    items = list(getattr(chat_ctx, "items", []) or [])
    tool_schemas: list[dict[str, Any]] = []
    try:
        tool_schemas = ToolContext(tools=tools).parse_function_tools("openai", strict=True)
    except Exception:
        # Count only safe static metadata if provider schema conversion fails.
        tool_schemas = [{"name": getattr(getattr(t, "info", None), "name", "unknown"),
                         "description": getattr(getattr(t, "info", None), "description", None)}
                        for t in tools]
    tool_json = json.dumps(tool_schemas, ensure_ascii=False, separators=(",", ":"), default=str)
    system_parts: list[str] = []
    current_user = ""
    current_user_index = max((i for i, item in enumerate(items)
                              if getattr(item, "role", None) == "user"), default=-1)
    history_chars = user_hist_chars = assistant_chars = tool_call_chars = tool_result_chars = 0
    for i, item in enumerate(items):
        if isinstance(item, FunctionCallOutput):
            tool_result_chars += len(_item_text(item))
        elif isinstance(item, FunctionCall):
            tool_call_chars += len(_item_text(item))
        elif getattr(item, "role", None) == "system":
            system_parts.append(_item_text(item))
        elif i == current_user_index and getattr(item, "role", None) == "user":
            current_user = _item_text(item)
        else:
            chars = len(_item_text(item))
            history_chars += chars
            if getattr(item, "role", None) == "user":
                user_hist_chars += chars
            elif getattr(item, "role", None) == "assistant":
                assistant_chars += chars
    system_text = "\n".join(system_parts)
    component = {
        "system_prompt_characters": len(system_text),
        "system_prompt_tokens": _estimate_tokens(len(system_text)),
        "system_prompt_hash": hashlib.sha256(system_text.encode()).hexdigest()[:16] if system_text else None,
        "tool_count": len(tools),
        "tools": [getattr(getattr(t, "info", None), "name", getattr(t, "id", "unknown")) for t in tools],
        "tool_definition_characters": len(tool_json),
        "tool_definition_tokens": _estimate_tokens(len(tool_json)),
        "tool_definition_hash": hashlib.sha256(tool_json.encode()).hexdigest()[:16],
        "conversation_message_count": len(items),
        "conversation_history_characters": history_chars + tool_call_chars,
        "conversation_history_tokens": _estimate_tokens(history_chars + tool_call_chars),
        "user_message_count": sum(getattr(item, "role", None) == "user" for item in items),
        "assistant_message_count": sum(getattr(item, "role", None) == "assistant" for item in items),
        "tool_call_count": sum(isinstance(item, FunctionCall) for item in items),
        "tool_result_count": sum(isinstance(item, FunctionCallOutput) for item in items),
        "user_history_tokens": _estimate_tokens(user_hist_chars),
        "assistant_history_tokens": _estimate_tokens(assistant_chars),
        "tool_history_tokens": _estimate_tokens(tool_call_chars),
        "tool_result_characters": tool_result_chars,
        "tool_result_tokens": _estimate_tokens(tool_result_chars),
        "current_user_message_characters": len(current_user),
        "current_user_message_tokens": _estimate_tokens(len(current_user)),
        "estimated_input_tokens": _estimate_tokens(len(system_text)) + _estimate_tokens(len(tool_json))
            + _estimate_tokens(history_chars + tool_call_chars)
            + _estimate_tokens(tool_result_chars) + _estimate_tokens(len(current_user)),
        "token_estimate_method": "ceil(characters / 4); approximate only",
    }
    return component

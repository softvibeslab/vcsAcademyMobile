from __future__ import annotations

from dataclasses import dataclass
import json
import os
import urllib.error
import urllib.request
from typing import Any


SENSITIVE_TERMS = {
    "price": "pricing_guardrail",
    "pricing": "pricing_guardrail",
    "discount": "pricing_guardrail",
    "fee": "fee_disclosure_guardrail",
    "finance": "finance_guardrail",
    "hide": "hidden_fee_request",
}


@dataclass
class SmartAgentResult:
    response: str
    citations: list[str]
    recommended_actions: list[dict[str, Any]]
    risk_flags: list[str]
    confidence: float


class SmartAgentProvider:
    provider_name = "base"

    def answer(self, message: str, mode: str, user: dict[str, Any], knowledge: list[dict[str, Any]]) -> SmartAgentResult:
        raise NotImplementedError


class LocalKnowledgeProvider(SmartAgentProvider):
    provider_name = "local"

    def answer(self, message: str, mode: str, user: dict[str, Any], knowledge: list[dict[str, Any]]) -> SmartAgentResult:
        text = message.lower()
        risk_flags = self.detect_risks(text)
        matches = self.retrieve(text, knowledge)
        citations = [item["title"] for item in matches[:3]] or ["Blueprint knowledge base"]

        if "hidden_fee_request" in risk_flags:
            return SmartAgentResult(
                response=(
                    "No. Fees, pricing, incentives, and conditions must be disclosed clearly. "
                    "Use approved materials and practice a transparent explanation that confirms the guest understands."
                ),
                citations=citations,
                recommended_actions=[{"label": "Review compliance resources", "route": "Resources", "params": {"tag": "compliance"}}],
                risk_flags=risk_flags,
                confidence=0.92,
            )

        if risk_flags:
            return SmartAgentResult(
                response=(
                    "I can help you practice the approved transition, but I will not invent pricing, discounts, fees, or finance terms. "
                    "Open the approved resource or ask a manager before using sensitive material."
                ),
                citations=citations,
                recommended_actions=[{"label": "Open T.O. Pricing step", "route": "BlueprintStep", "params": {"step": 11}}],
                risk_flags=risk_flags,
                confidence=0.88,
            )

        if mode == "manager_assist" or "team" in text or "manager" in text:
            response = (
                "Open the leadership workspace, review pending roleplays first, then check readiness for the rep with the biggest coaching gap. "
                "Use rubric comments that are specific, observable, and tied to the Blueprint."
            )
            action = {"label": "Open Leadership Workspace", "route": "ManagerWorkspace", "params": {}}
        elif mode == "admin_content_assist" or "admin" in text or "audit" in text:
            response = (
                "Start with users, permissions, and sensitive resources. Keep pricing, fee, and finance content restricted, published only when approved, "
                "and verify audit events after each access change."
            )
            action = {"label": "Open Admin Workspace", "route": "AdminWorkspace", "params": {}}
        elif mode == "resource_search" or "resource" in text or "script" in text or "material" in text:
            response = (
                "Use approved resources only. Open the library, filter mentally by Blueprint step and sensitivity, and request access for restricted pricing or fee material."
            )
            action = {"label": "Open Resources", "route": "Resources", "params": {}}
        elif "step 5" in text or "pact" in text or "commit" in text:
            response = (
                "Step 5 is a commitment-setting moment, not pressure. Confirm that if the program makes sense and is affordable, "
                "the guest can make a clear yes/no decision today. Keep your tone calm and ask one clean confirmation question."
            )
            action = {"label": "Run Step 5 Roleplay", "route": "RoleplayLive", "params": {"blueprint_step": 5}}
        elif "roadmap" in text or "train first" in text or "next step" in text or "blueprint" in text:
            response = (
                "Open the Roadmap and work the current unlocked Blueprint step. Keep the sequence intact, finish the checklist, then run one roleplay tied to that step."
            )
            action = {"label": "Open Roadmap", "route": "Roadmap", "params": {}}
        elif "goal" in text or "goalsheet" in text or "closing" in text:
            response = (
                "Use the GoalSheet as an honest coaching record. Log tour outcome, sales outcome, volume, follow-ups, and one note "
                "about the Blueprint behavior that most affected the result."
            )
            action = {"label": "Open GoalSheet", "route": "GoalSheet", "params": {}}
        elif "roleplay" in text or "practice" in text:
            response = (
                "Choose one Blueprint moment, practice it out loud, submit the transcript, and ask your manager for rubric feedback. "
                "One focused repetition beats a generic practice session."
            )
            action = {"label": "Open Roleplay", "route": "RoleplayLive", "params": {}}
        else:
            resource_hint = matches[0]["summary"] if matches else "Stay aligned to the Blueprint and choose one behavior to practice immediately."
            response = f"{resource_hint} Next, convert that into one action you can practice on your next tour."
            action = {"label": "Open Roadmap", "route": "Roadmap", "params": {}}

        return SmartAgentResult(
            response=response,
            citations=citations,
            recommended_actions=[action],
            risk_flags=[],
            confidence=0.84 if matches else 0.76,
        )

    def detect_risks(self, text: str) -> list[str]:
        flags = []
        for term, flag in SENSITIVE_TERMS.items():
            if term in text and flag not in flags:
                flags.append(flag)
        if "hide" in text and "fee" in text and "hidden_fee_request" not in flags:
            flags.append("hidden_fee_request")
        return flags

    def retrieve(self, text: str, knowledge: list[dict[str, Any]]) -> list[dict[str, Any]]:
        tokens = {token.strip(".,!?():;").lower() for token in text.split() if len(token.strip(".,!?():;")) > 2}
        scored = []
        for item in knowledge:
            haystack = " ".join(
                str(value)
                for value in [
                    item.get("title", ""),
                    item.get("summary", ""),
                    item.get("body", ""),
                    " ".join(item.get("tags", [])),
                ]
            ).lower()
            score = sum(1 for token in tokens if token in haystack)
            if score:
                scored.append((score, item))
        scored.sort(key=lambda pair: pair[0], reverse=True)
        return [item for _, item in scored]


class OpenAIResponsesProvider(LocalKnowledgeProvider):
    provider_name = "openai"

    def __init__(self) -> None:
        self.api_key = os.environ.get("OPENAI_API_KEY", "").strip()
        self.model = os.environ.get("OPENAI_MODEL", "gpt-5.2").strip()
        self.timeout_seconds = float(os.environ.get("OPENAI_TIMEOUT_SECONDS", "12"))
        self.fallback = LocalKnowledgeProvider()

    def answer(self, message: str, mode: str, user: dict[str, Any], knowledge: list[dict[str, Any]]) -> SmartAgentResult:
        text = message.lower()
        risk_flags = self.detect_risks(text)
        matches = self.retrieve(text, knowledge)
        citations = [item["title"] for item in matches[:3]] or ["Blueprint knowledge base"]

        if risk_flags:
            return self.fallback.answer(message, mode, user, knowledge)

        if not self.api_key:
            result = self.fallback.answer(message, mode, user, knowledge)
            result.risk_flags = [*result.risk_flags, "openai_api_key_missing"]
            return result

        payload = {
            "model": self.model,
            "instructions": self.build_instructions(mode, user, matches),
            "input": message,
            "max_output_tokens": 520,
            "store": False,
        }
        request = urllib.request.Request(
            "https://api.openai.com/v1/responses",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                raw = response.read().decode("utf-8")
            data = json.loads(raw)
            answer_text = self.extract_output_text(data).strip()
            if not answer_text:
                raise RuntimeError("OpenAI response did not include output text")
            return SmartAgentResult(
                response=answer_text,
                citations=citations,
                recommended_actions=[self.recommended_action_for_mode(mode, message)],
                risk_flags=[],
                confidence=0.9,
            )
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError, RuntimeError):
            result = self.fallback.answer(message, mode, user, knowledge)
            result.risk_flags = [*result.risk_flags, "openai_provider_fallback"]
            return result

    def build_instructions(self, mode: str, user: dict[str, Any], matches: list[dict[str, Any]]) -> str:
        allowed_knowledge = [
            {
                "title": item.get("title", ""),
                "summary": item.get("summary", ""),
                "tags": item.get("tags", []),
            }
            for item in matches[:5]
        ]
        return (
            "You are Smart Agent for WL Sales Academy, a premium sales training coach. "
            "Give concise, practical coaching for the Blueprint of the Sale. "
            "Preserve the official Blueprint sequence. Never invent pricing, discounts, fees, finance terms, legal claims, or contractual terms. "
            "Never help hide fees or mislead a buyer. If sensitive terms are needed, redirect to approved resources and manager/T.O. review. "
            "When useful, structure the response as: short answer, why it matters, suggested words/action, next step. "
            f"Mode: {mode}. User roles: {', '.join(user.get('roles', []))}. "
            f"Allowed knowledge summaries: {json.dumps(allowed_knowledge, ensure_ascii=True)}"
        )

    def extract_output_text(self, data: dict[str, Any]) -> str:
        if isinstance(data.get("output_text"), str):
            return data["output_text"]
        chunks: list[str] = []
        for item in data.get("output", []):
            for content in item.get("content", []):
                text = content.get("text")
                if isinstance(text, str):
                    chunks.append(text)
        return "\n".join(chunks)

    def recommended_action_for_mode(self, mode: str, message: str) -> dict[str, Any]:
        text = f"{mode} {message}".lower()
        if "goal" in text:
            return {"label": "Open GoalSheet", "route": "GoalSheet", "params": {}}
        if "roleplay" in text or "practice" in text or "objection" in text:
            return {"label": "Open Roleplay", "route": "RoleplayLive", "params": {}}
        if "resource" in text or "script" in text:
            return {"label": "Open Resources", "route": "Resources", "params": {}}
        if "manager" in text or "team" in text:
            return {"label": "Open Leadership Workspace", "route": "ManagerWorkspace", "params": {}}
        if "admin" in text:
            return {"label": "Open Admin Workspace", "route": "AdminWorkspace", "params": {}}
        return {"label": "Open Roadmap", "route": "Roadmap", "params": {}}


class ZaiChatCompletionsProvider(LocalKnowledgeProvider):
    provider_name = "zai"

    def __init__(self) -> None:
        self.api_key = os.environ.get("ZAI_API_KEY", "").strip()
        self.model = os.environ.get("ZAI_MODEL", "glm-4.7").strip()
        self.base_url = os.environ.get("ZAI_BASE_URL", "https://api.z.ai/api/coding/paas/v4").strip().rstrip("/")
        self.timeout_seconds = float(os.environ.get("ZAI_TIMEOUT_SECONDS", "20"))
        self.thinking_type = os.environ.get("ZAI_THINKING", "disabled").strip()
        self.fallback = LocalKnowledgeProvider()

    def answer(self, message: str, mode: str, user: dict[str, Any], knowledge: list[dict[str, Any]]) -> SmartAgentResult:
        text = message.lower()
        risk_flags = self.detect_risks(text)
        matches = self.retrieve(text, knowledge)
        citations = [item["title"] for item in matches[:3]] or ["Blueprint knowledge base"]

        if risk_flags:
            return self.fallback.answer(message, mode, user, knowledge)

        if not self.api_key:
            result = self.fallback.answer(message, mode, user, knowledge)
            result.risk_flags = [*result.risk_flags, "zai_api_key_missing"]
            return result

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": self.build_system_prompt(mode, user, matches)},
                {"role": "user", "content": message},
            ],
            "temperature": 0.35,
            "max_tokens": 520,
            "stream": False,
            "thinking": {"type": self.thinking_type},
        }
        request = urllib.request.Request(
            f"{self.base_url}/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                raw = response.read().decode("utf-8")
            data = json.loads(raw)
            answer_text = self.extract_chat_text(data).strip()
            if not answer_text:
                raise RuntimeError("Z.ai response did not include message content")
            return SmartAgentResult(
                response=answer_text,
                citations=citations,
                recommended_actions=[self.recommended_action_for_mode(mode, message)],
                risk_flags=[],
                confidence=0.9,
            )
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError, RuntimeError):
            result = self.fallback.answer(message, mode, user, knowledge)
            result.risk_flags = [*result.risk_flags, "zai_provider_fallback"]
            return result

    def build_system_prompt(self, mode: str, user: dict[str, Any], matches: list[dict[str, Any]]) -> str:
        allowed_knowledge = [
            {
                "title": item.get("title", ""),
                "summary": item.get("summary", ""),
                "tags": item.get("tags", []),
            }
            for item in matches[:5]
        ]
        return (
            "You are Smart Agent for WL Sales Academy, a premium AI sales training coach inside a mobile app. "
            "Answer in the same language as the user. Be concise, practical, and role-aware. "
            "Coach the Blueprint of the Sale without changing the official sequence. "
            "Never invent pricing, discounts, fees, finance terms, legal claims, or contract terms. "
            "Never help hide fees or mislead a buyer. Redirect sensitive content to approved resources and manager/T.O. review. "
            "When useful, structure the answer as: short answer, suggested words/action, next step. "
            f"Mode: {mode}. User roles: {', '.join(user.get('roles', []))}. "
            f"Allowed knowledge summaries: {json.dumps(allowed_knowledge, ensure_ascii=True)}"
        )

    def extract_chat_text(self, data: dict[str, Any]) -> str:
        choices = data.get("choices", [])
        if not choices:
            return ""
        message = choices[0].get("message", {})
        content = message.get("content", "")
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            chunks = []
            for item in content:
                text = item.get("text") or item.get("content")
                if isinstance(text, str):
                    chunks.append(text)
            return "\n".join(chunks)
        return ""

    def recommended_action_for_mode(self, mode: str, message: str) -> dict[str, Any]:
        return OpenAIResponsesProvider().recommended_action_for_mode(mode, message)


def get_provider(name: str = "local") -> SmartAgentProvider:
    if name == "openai":
        return OpenAIResponsesProvider()
    if name in {"zai", "chat_z", "chat.z", "glm"}:
        return ZaiChatCompletionsProvider()
    return LocalKnowledgeProvider()


def provider_status(name: str = "local") -> dict[str, Any]:
    provider = get_provider(name)
    return {
        "provider": provider.provider_name,
        "requested_provider": name,
        "openai_configured": bool(os.environ.get("OPENAI_API_KEY", "").strip()),
        "openai_model": os.environ.get("OPENAI_MODEL", "gpt-5.2"),
        "zai_configured": bool(os.environ.get("ZAI_API_KEY", "").strip()),
        "zai_model": os.environ.get("ZAI_MODEL", "glm-4.7"),
        "zai_base_url": os.environ.get("ZAI_BASE_URL", "https://api.z.ai/api/coding/paas/v4"),
        "zai_thinking": os.environ.get("ZAI_THINKING", "disabled"),
    }

from __future__ import annotations

from dataclasses import dataclass
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
    def answer(self, message: str, mode: str, user: dict[str, Any], knowledge: list[dict[str, Any]]) -> SmartAgentResult:
        raise NotImplementedError


class LocalKnowledgeProvider(SmartAgentProvider):
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

        if "step 5" in text or "pact" in text or "commit" in text:
            response = (
                "Step 5 is a commitment-setting moment, not pressure. Confirm that if the program makes sense and is affordable, "
                "the guest can make a clear yes/no decision today. Keep your tone calm and ask one clean confirmation question."
            )
            action = {"label": "Run Step 5 Roleplay", "route": "RoleplayLive", "params": {"blueprint_step": 5}}
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


def get_provider(name: str = "local") -> SmartAgentProvider:
    if name != "local":
        return LocalKnowledgeProvider()
    return LocalKnowledgeProvider()

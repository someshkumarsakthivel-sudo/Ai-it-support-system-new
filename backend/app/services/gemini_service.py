from google import genai

from app.core.config import settings


MODEL_NAME = "gemini-3.6-flash"

client = genai.Client(
    api_key=settings.GEMINI_API_KEY
)


def analyze_ticket(
    title: str,
    description: str,
) -> dict:
    prompt = f"""
You are an IT support ticket analysis assistant.

Analyze the following support ticket.

Ticket title:
{title}

Ticket description:
{description}

Return ONLY valid JSON with exactly these fields:

{{
  "category": "string",
  "subcategory": "string",
  "priority": "LOW|MEDIUM|HIGH|CRITICAL",
  "sentiment": "POSITIVE|NEUTRAL|NEGATIVE",
  "summary": "string",
  "recommendation": "string",
  "confidence_score": 0.0
}}

Rules:

1. category should describe the main IT issue.
2. subcategory should be more specific when possible.
3. priority must be one of LOW, MEDIUM, HIGH, CRITICAL.
4. sentiment must be POSITIVE, NEUTRAL, or NEGATIVE.
5. summary should briefly describe the problem.
6. recommendation should suggest practical troubleshooting steps.
7. confidence_score must be between 0.0 and 1.0.
8. Do not include markdown.
9. Do not include additional fields.
"""

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
    )

    text = response.text.strip()

    if text.startswith("```"):
        text = text.replace("```json", "")
        text = text.replace("```", "")
        text = text.strip()

    import json

    result = json.loads(text)

    return result
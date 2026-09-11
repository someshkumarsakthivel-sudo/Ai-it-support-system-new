import json

from google import genai

from app.core.config import settings


MODEL_NAME = "gemini-3.6-flash"

client = genai.Client(
    api_key=settings.GEMINI_API_KEY
)


def analyze_ticket(
    title: str,
    description: str,
    knowledge_base_articles: list | None = None,
) -> dict:
    """
    Analyze an IT support ticket with optional Knowledge Base context.

    AI provides recommendations, but does not make system changes.
    """

    knowledge_base_articles = (
        knowledge_base_articles or []
    )

    if knowledge_base_articles:
        knowledge_base_context = "\n\n".join(
            [
                (
                    f"Article {index}:\n"
                    f"Title: {article.title}\n"
                    f"Content: {article.content}"
                )
                for index, article in enumerate(
                    knowledge_base_articles,
                    start=1,
                )
            ]
        )
    else:
        knowledge_base_context = (
            "No relevant Knowledge Base articles were found."
        )

    prompt = f"""
You are an IT support ticket analysis assistant.

Analyze the following support ticket.

Ticket title:
{title}

Ticket description:
{description}

Relevant Knowledge Base articles:
{knowledge_base_context}

Use the Knowledge Base articles as supporting context when they are relevant.

Important rules:

1. Do not assume that a Knowledge Base article is correct for the ticket
   unless its content is relevant.
2. Do not invent facts from Knowledge Base articles.
3. Prefer practical troubleshooting recommendations based on the
   available ticket information and relevant Knowledge Base content.
4. AI recommendations are advisory only. Do not claim that any action
   has already been performed.
5. If no Knowledge Base article is relevant, provide a recommendation
   based on the ticket information alone.

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

Rules for the JSON response:

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

    result = json.loads(text)

    return result
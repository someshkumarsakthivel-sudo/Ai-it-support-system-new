import re

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.knowledge_base import KnowledgeBaseArticle


STOP_WORDS = {
    "the",
    "and",
    "for",
    "with",
    "this",
    "that",
    "from",
    "have",
    "has",
    "had",
    "was",
    "were",
    "are",
    "is",
    "it",
    "my",
    "our",
    "your",
    "their",
    "they",
    "them",
    "can",
    "cannot",
    "could",
    "would",
    "should",
    "after",
    "before",
    "into",
    "then",
    "when",
    "where",
    "what",
    "why",
    "how",
    "user",
    "users",
    "issue",
    "issues",
    "problem",
    "problems",
    "help",
    "please",
    "unable",
    "not",
    "does",
    "doesnt",
    "did",
    "didnt",
    "need",
    "needs",
    "want",
    "wants",
    "working",
    "work",
    "works",
    "connection",
    "connect",
    "connecting",
    "connected",
    "error",
    "errors",
    "laptop",
    "computer",
    "device",
    "test",
    "testing",
    "verify",
    "verification",
}


TECHNICAL_KEYWORDS = {
    "vpn",
    "wifi",
    "wi-fi",
    "wireless",
    "network",
    "internet",
    "ethernet",
    "router",
    "password",
    "login",
    "authentication",
    "account",
    "email",
    "outlook",
    "printer",
    "printing",
    "driver",
    "software",
    "update",
    "windows",
    "mac",
    "linux",
    "server",
    "database",
    "application",
    "app",
    "browser",
    "chrome",
    "firefox",
    "office",
    "teams",
    "storage",
    "disk",
    "backup",
    "malware",
    "virus",
    "security",
    "firewall",
    "access",
    "remote",
    "rdp",
    "monitor",
    "keyboard",
    "mouse",
    "audio",
    "sound",
    "microphone",
    "camera",
    "bluetooth",
}


MINIMUM_RELEVANCE_SCORE = 8


def _extract_keywords(text: str) -> list[str]:
    """
    Extract meaningful keywords from ticket text.

    Generic words are removed so that unrelated articles
    are less likely to be selected.
    """

    if not text:
        return []

    normalized_text = text.lower()

    words = re.findall(
        r"[a-z0-9]+(?:-[a-z0-9]+)?",
        normalized_text,
    )

    keywords = []

    for word in words:
        if len(word) < 3:
            continue

        if word in STOP_WORDS:
            continue

        keywords.append(word)

    return list(dict.fromkeys(keywords))


def _keyword_score(
    article: KnowledgeBaseArticle,
    keywords: list[str],
) -> int:
    """
    Calculate how strongly a Knowledge Base article
    matches the ticket keywords.

    Strong technical matches receive higher scores.
    Exact title matches are preferred over content-only matches.
    """

    title = (article.title or "").lower()
    content = (article.content or "").lower()

    score = 0

    for keyword in keywords:
        title_match = keyword in title
        content_match = keyword in content
        technical_keyword = keyword in TECHNICAL_KEYWORDS

        if title_match:
            score += 5

        if content_match:
            score += 2

        if technical_keyword and title_match:
            score += 8

        elif technical_keyword and content_match:
            score += 4

    return score


def _has_strong_match(
    article: KnowledgeBaseArticle,
    keywords: list[str],
) -> bool:
    """
    Require stronger evidence that an article is relevant.

    An article is considered strongly relevant when:
    - at least one technical keyword appears in the title, or
    - at least two meaningful keywords appear in the article.
    """

    title = (article.title or "").lower()
    content = (article.content or "").lower()

    technical_title_match = any(
        keyword in title
        for keyword in keywords
        if keyword in TECHNICAL_KEYWORDS
    )

    if technical_title_match:
        return True

    meaningful_matches = sum(
        1
        for keyword in keywords
        if keyword in content
    )

    return meaningful_matches >= 2


def search_knowledge_base(
    title: str,
    description: str,
    db: Session,
    limit: int = 5,
) -> list[KnowledgeBaseArticle]:
    """
    Find published Knowledge Base articles relevant to an IT ticket.

    The search uses:
    - meaningful ticket keywords
    - technical keyword weighting
    - title weighting
    - content weighting
    - minimum relevance score
    - strong-match validation

    Unrelated articles are filtered out instead of returning
    any article that happens to share one generic word.
    """

    search_text = f"{title} {description}".strip()

    if not search_text:
        return []

    keywords = _extract_keywords(search_text)

    if not keywords:
        return []

    filters = []

    for keyword in keywords:
        pattern = f"%{keyword}%"

        filters.append(
            or_(
                KnowledgeBaseArticle.title.ilike(pattern),
                KnowledgeBaseArticle.content.ilike(pattern),
            )
        )

    articles = (
        db.query(KnowledgeBaseArticle)
        .filter(
            KnowledgeBaseArticle.is_published == True
        )
        .filter(
            or_(*filters)
        )
        .all()
    )

    scored_articles = []

    for article in articles:
        score = _keyword_score(
            article=article,
            keywords=keywords,
        )

        if score < MINIMUM_RELEVANCE_SCORE:
            continue

        if not _has_strong_match(
            article=article,
            keywords=keywords,
        ):
            continue

        scored_articles.append(
            (score, article)
        )

    scored_articles.sort(
        key=lambda item: (
            item[0],
            item[1].id,
        ),
        reverse=True,
    )

    return [
        article
        for _, article in scored_articles[:limit]
    ]
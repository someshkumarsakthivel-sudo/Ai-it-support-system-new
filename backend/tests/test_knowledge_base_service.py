from app.services.knowledge_base_service import (
    search_knowledge_base,
)


class FakeArticle:
    def __init__(
        self,
        article_id,
        title,
        content,
        is_published=True,
    ):
        self.id = article_id
        self.title = title
        self.content = content
        self.is_published = is_published


class FakeQuery:
    def __init__(self, articles):
        self.articles = articles

    def filter(self, *conditions):
        filtered_articles = self.articles

        for condition in conditions:
            condition_text = str(condition)

            if "is_published" in condition_text:
                filtered_articles = [
                    article
                    for article in filtered_articles
                    if article.is_published is True
                ]

        return FakeQuery(filtered_articles)

    def all(self):
        return self.articles


class FakeDB:
    def __init__(self, articles):
        self.articles = articles

    def query(self, model):
        return FakeQuery(self.articles)


def test_vpn_ticket_finds_vpn_article():
    articles = [
        FakeArticle(
            1,
            "How to Troubleshoot VPN Connection Issues",
            "Troubleshoot VPN connection problems, VPN client access, and credentials.",
        ),
        FakeArticle(
            2,
            "Printer Troubleshooting",
            "Steps for fixing printer and printing problems.",
        ),
    ]

    db = FakeDB(articles)

    results = search_knowledge_base(
        title="VPN connection problem",
        description="User cannot connect to VPN.",
        db=db,
        limit=5,
    )

    assert len(results) == 1
    assert results[0].title == (
        "How to Troubleshoot VPN Connection Issues"
    )


def test_notification_ticket_does_not_find_vpn_article():
    articles = [
        FakeArticle(
            1,
            "How to Troubleshoot VPN Connection Issues",
            "Troubleshoot VPN connection problems, VPN client access, and credentials.",
        ),
    ]

    db = FakeDB(articles)

    results = search_knowledge_base(
        title="Test notification from employee",
        description=(
            "This is a test ticket to verify "
            "admin notifications."
        ),
        db=db,
        limit=5,
    )

    assert results == []


def test_unpublished_article_is_not_returned():
    articles = [
        FakeArticle(
            1,
            "How to Troubleshoot VPN Connection Issues",
            "Troubleshoot VPN connection problems, VPN client access, and credentials.",
            is_published=False,
        ),
    ]

    db = FakeDB(articles)

    results = search_knowledge_base(
        title="VPN connection problem",
        description="User cannot connect to VPN.",
        db=db,
        limit=5,
    )

    assert results == []
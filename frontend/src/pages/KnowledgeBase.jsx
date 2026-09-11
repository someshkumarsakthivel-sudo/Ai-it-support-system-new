import { useEffect, useState } from "react";
import "./KnowledgeBase.css";
import {
  getKnowledgeBaseArticles,
  createKnowledgeBaseArticle,
  updateKnowledgeBaseArticle,
  updateKnowledgeBasePublishStatus,
  deleteKnowledgeBaseArticle,
  getCategories,
} from "../services/api";


function KnowledgeBase({ onBack }) {
  const user = JSON.parse(
    localStorage.getItem("user") ||
      sessionStorage.getItem("user") ||
      "{}"
  );

  const isAdmin = user.role_id === 3;

  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);

  const [selectedArticle, setSelectedArticle] =
    useState(null);

  const [searchText, setSearchText] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [showEditor, setShowEditor] =
    useState(false);

  const [editingArticleId, setEditingArticleId] =
    useState(null);

  const [articleTitle, setArticleTitle] =
    useState("");

  const [articleContent, setArticleContent] =
    useState("");

  const [articleCategoryId, setArticleCategoryId] =
    useState("");

  const [articlePublished, setArticlePublished] =
    useState(true);

  const [savingArticle, setSavingArticle] =
    useState(false);

  const [editorError, setEditorError] =
    useState("");

  const [editorSuccess, setEditorSuccess] =
    useState("");

  const [deletingArticleId, setDeletingArticleId] =
    useState(null);

  async function loadArticles() {
    try {
      setLoading(true);
      setError("");

      const accessToken =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!accessToken) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const data =
        await getKnowledgeBaseArticles(
          accessToken
        );

      setArticles(data);
    } catch (err) {
      setError(
        err.message ||
          "Failed to load Knowledge Base articles."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    if (!isAdmin) {
      return;
    }

    try {
      const accessToken =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!accessToken) {
        return;
      }

      const data =
        await getCategories(accessToken);

      setCategories(data);
    } catch {
      setCategories([]);
    }
  }

  useEffect(() => {
    loadArticles();
    loadCategories();
  }, []);

  const filteredArticles =
    articles.filter((article) => {
      const search =
        searchText.trim().toLowerCase();

      if (!search) {
        return true;
      }

      return (
        article.title
          .toLowerCase()
          .includes(search) ||
        article.content
          .toLowerCase()
          .includes(search)
      );
    });

  function getCategoryName(categoryId) {
    if (!categoryId) {
      return "Uncategorized";
    }

    const category = categories.find(
      (item) => item.id === categoryId
    );

    return category
      ? category.name
      : `Category ${categoryId}`;
  }

  function handleArticleClick(article) {
    setSelectedArticle(article);
  }

  function handleBackToArticles() {
    setSelectedArticle(null);
  }

  function resetEditor() {
    setShowEditor(false);
    setEditingArticleId(null);
    setArticleTitle("");
    setArticleContent("");
    setArticleCategoryId("");
    setArticlePublished(true);
    setEditorError("");
    setEditorSuccess("");
  }

  function handleCreateArticle() {
    setSelectedArticle(null);
    setEditingArticleId(null);
    setArticleTitle("");
    setArticleContent("");
    setArticleCategoryId("");
    setArticlePublished(true);
    setEditorError("");
    setEditorSuccess("");
    setShowEditor(true);
  }

  function handleEditArticle(article) {
    setSelectedArticle(null);
    setEditingArticleId(article.id);
    setArticleTitle(article.title);
    setArticleContent(article.content);
    setArticleCategoryId(
      article.category_id
        ? String(article.category_id)
        : ""
    );
    setArticlePublished(
      article.is_published
    );
    setEditorError("");
    setEditorSuccess("");
    setShowEditor(true);
  }

  async function handleSaveArticle(event) {
    event.preventDefault();

    const title =
      articleTitle.trim();

    const content =
      articleContent.trim();

    if (!title) {
      setEditorError(
        "Please enter an article title."
      );
      return;
    }

    if (title.length < 3) {
      setEditorError(
        "Article title must be at least 3 characters."
      );
      return;
    }

    if (!content) {
      setEditorError(
        "Please enter article content."
      );
      return;
    }

    if (content.length < 10) {
      setEditorError(
        "Article content must be at least 10 characters."
      );
      return;
    }

    try {
      setSavingArticle(true);
      setEditorError("");
      setEditorSuccess("");

      const accessToken =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!accessToken) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const articleData = {
        title,
        content,
        category_id:
          articleCategoryId === ""
            ? null
            : Number(articleCategoryId),
        is_published:
          articlePublished,
      };

      let savedArticle;

      if (editingArticleId) {
        savedArticle =
          await updateKnowledgeBaseArticle(
            accessToken,
            editingArticleId,
            articleData
          );
      } else {
        savedArticle =
          await createKnowledgeBaseArticle(
            accessToken,
            articleData
          );
      }

      setArticles((currentArticles) => {
        if (editingArticleId) {
          return currentArticles.map(
            (article) =>
              article.id ===
              savedArticle.id
                ? savedArticle
                : article
          );
        }

        return [
          savedArticle,
          ...currentArticles,
        ];
      });

      setSelectedArticle(
        savedArticle
      );

      setEditorSuccess(
        editingArticleId
          ? "Article updated successfully."
          : "Article created successfully."
      );

      setShowEditor(false);
    } catch (err) {
      setEditorError(
        err.message ||
          "Failed to save the article."
      );
    } finally {
      setSavingArticle(false);
    }
  }

  async function handleTogglePublish(article) {
    try {
      const accessToken =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!accessToken) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const updatedArticle =
        await updateKnowledgeBasePublishStatus(
          accessToken,
          article.id,
          !article.is_published
        );

      setArticles((currentArticles) =>
        currentArticles.map(
          (currentArticle) =>
            currentArticle.id ===
            updatedArticle.id
              ? updatedArticle
              : currentArticle
        )
      );

      if (
        selectedArticle?.id ===
        updatedArticle.id
      ) {
        setSelectedArticle(
          updatedArticle
        );
      }
    } catch (err) {
      setError(
        err.message ||
          "Failed to update article status."
      );
    }
  }

  async function handleDeleteArticle(article) {
    const confirmed = window.confirm(
      `Delete "${article.title}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingArticleId(
        article.id
      );
      setError("");

      const accessToken =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!accessToken) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      await deleteKnowledgeBaseArticle(
        accessToken,
        article.id
      );

      setArticles((currentArticles) =>
        currentArticles.filter(
          (currentArticle) =>
            currentArticle.id !==
            article.id
        )
      );

      setSelectedArticle(null);
    } catch (err) {
      setError(
        err.message ||
          "Failed to delete the article."
      );
    } finally {
      setDeletingArticleId(null);
    }
  }

  if (selectedArticle) {
    return (
      <div className="knowledge-base-page">
        <div className="knowledge-base-container">
          <div className="knowledge-base-topbar">
            <button
              type="button"
              className="kb-back-button"
              onClick={
                handleBackToArticles
              }
            >
              ← Back to articles
            </button>
          </div>

          <article className="kb-article-details">
            <div className="kb-article-header">
              <span className="kb-article-label">
                Knowledge Base
              </span>

              <h1>
                {selectedArticle.title}
              </h1>

              <div className="kb-article-meta">
                <span>
                  Updated{" "}
                  {new Date(
                    selectedArticle.updated_at
                  ).toLocaleDateString(
                    "en-IN",
                    {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }
                  )}
                </span>

                {isAdmin && (
                  <span
                    className={
                      selectedArticle.is_published
                        ? "kb-published-badge"
                        : "kb-unpublished-badge"
                    }
                  >
                    {selectedArticle.is_published
                      ? "Published"
                      : "Unpublished"}
                  </span>
                )}
              </div>
            </div>

            <div className="kb-article-content">
              {selectedArticle.content}
            </div>

            {isAdmin && (
              <div className="kb-article-admin-actions">
                <button
                  type="button"
                  className="kb-admin-button"
                  onClick={() =>
                    handleEditArticle(
                      selectedArticle
                    )
                  }
                >
                  Edit Article
                </button>

                <button
                  type="button"
                  className="kb-admin-button"
                  onClick={() =>
                    handleTogglePublish(
                      selectedArticle
                    )
                  }
                >
                  {selectedArticle.is_published
                    ? "Unpublish"
                    : "Publish"}
                </button>

                <button
                  type="button"
                  className="kb-admin-delete-button"
                  onClick={() =>
                    handleDeleteArticle(
                      selectedArticle
                    )
                  }
                  disabled={
                    deletingArticleId ===
                    selectedArticle.id
                  }
                >
                  {deletingArticleId ===
                  selectedArticle.id
                    ? "Deleting..."
                    : "Delete Article"}
                </button>
              </div>
            )}
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className="knowledge-base-page">
      <div className="knowledge-base-container">
        <div className="knowledge-base-topbar">
          <button
            type="button"
            className="kb-back-button"
            onClick={onBack}
          >
            ← Back to Dashboard
          </button>
        </div>

        <section className="kb-page-header">
          <div>
            <p className="kb-page-label">
              {isAdmin
                ? "Administration"
                : "Support Resources"}
            </p>

            <h1>
              Knowledge Base
            </h1>

            <p>
              {isAdmin
                ? "Create and manage troubleshooting articles for your support team."
                : "Find troubleshooting guides and helpful IT support information."}
            </p>
          </div>

          <div className="kb-header-actions">
            {isAdmin && (
              <button
                type="button"
                className="kb-create-button"
                onClick={
                  handleCreateArticle
                }
              >
                + New Article
              </button>
            )}

            <button
              type="button"
              className="kb-refresh-button"
              onClick={loadArticles}
              disabled={loading}
            >
              {loading
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>
        </section>

        {showEditor && isAdmin && (
          <section className="kb-editor-card">
            <div className="kb-editor-header">
              <div>
                <h2>
                  {editingArticleId
                    ? "Edit Article"
                    : "Create Article"}
                </h2>

                <p>
                  Keep troubleshooting
                  information clear and useful.
                </p>
              </div>

              <button
                type="button"
                className="kb-editor-close"
                onClick={resetEditor}
              >
                Close
              </button>
            </div>

            <form
              className="kb-editor-form"
              onSubmit={
                handleSaveArticle
              }
            >
              <label>
                <span>Title</span>

                <input
                  type="text"
                  value={articleTitle}
                  onChange={(event) =>
                    setArticleTitle(
                      event.target.value
                    )
                  }
                  maxLength={255}
                  placeholder="Article title"
                  disabled={
                    savingArticle
                  }
                />
              </label>

              <label>
                <span>Category</span>

                <select
                  value={
                    articleCategoryId
                  }
                  onChange={(event) =>
                    setArticleCategoryId(
                      event.target.value
                    )
                  }
                  disabled={
                    savingArticle
                  }
                >
                  <option value="">
                    No category
                  </option>

                  {categories.map(
                    (category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <span>Content</span>

                <textarea
                  value={articleContent}
                  onChange={(event) =>
                    setArticleContent(
                      event.target.value
                    )
                  }
                  rows={9}
                  placeholder="Write the troubleshooting guide..."
                  disabled={
                    savingArticle
                  }
                />
              </label>

              <label className="kb-publish-option">
                <input
                  type="checkbox"
                  checked={
                    articlePublished
                  }
                  onChange={(event) =>
                    setArticlePublished(
                      event.target.checked
                    )
                  }
                  disabled={
                    savingArticle
                  }
                />

                <span>
                  Publish article
                </span>
              </label>

              {editorError && (
                <div className="kb-editor-error">
                  {editorError}
                </div>
              )}

              {editorSuccess && (
                <div className="kb-editor-success">
                  {editorSuccess}
                </div>
              )}

              <div className="kb-editor-actions">
                <button
                  type="button"
                  className="kb-editor-cancel"
                  onClick={
                    resetEditor
                  }
                  disabled={
                    savingArticle
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="kb-editor-save"
                  disabled={
                    savingArticle
                  }
                >
                  {savingArticle
                    ? "Saving..."
                    : editingArticleId
                    ? "Save Changes"
                    : "Create Article"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="kb-search-card">
          <label htmlFor="kb-search">
            Search Knowledge Base
          </label>

          <input
            id="kb-search"
            type="text"
            value={searchText}
            onChange={(event) =>
              setSearchText(
                event.target.value
              )
            }
            placeholder="Search troubleshooting guides..."
          />
        </section>

        {error && (
          <div className="kb-page-error">
            {error}
          </div>
        )}

        {loading && (
          <div className="kb-state">
            <div className="kb-state-icon">
              ...
            </div>

            <h2>
              Loading articles...
            </h2>

            <p>
              Please wait while we load the
              Knowledge Base.
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          filteredArticles.length === 0 && (
            <div className="kb-state">
              <div className="kb-state-icon">
                ?
              </div>

              <h2>
                No articles found
              </h2>

              <p>
                {isAdmin
                  ? "Create your first Knowledge Base article."
                  : "Try a different search term."}
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          filteredArticles.length > 0 && (
            <section className="kb-article-grid">
              {filteredArticles.map(
                (article) => (
                  <div
                    className="kb-article-card-wrapper"
                    key={article.id}
                  >
                    <button
                      type="button"
                      className="kb-article-card"
                      onClick={() =>
                        handleArticleClick(
                          article
                        )
                      }
                    >
                      <div className="kb-card-icon">
                        K
                      </div>

                      <div className="kb-card-content">
                        <div className="kb-card-heading">
                          <h2>
                            {article.title}
                          </h2>

                          {isAdmin && (
                            <span
                              className={
                                article.is_published
                                  ? "kb-published-badge"
                                  : "kb-unpublished-badge"
                              }
                            >
                              {article.is_published
                                ? "Published"
                                : "Unpublished"}
                            </span>
                          )}
                        </div>

                        <p>
                          {article.content
                            .length >
                          150
                            ? `${article.content.slice(
                                0,
                                150
                              )}...`
                            : article.content}
                        </p>

                        <span>
                          View article →
                        </span>
                      </div>
                    </button>

                    {isAdmin && (
                      <div className="kb-card-admin-actions">
                        <button
                          type="button"
                          className="kb-small-action"
                          onClick={() =>
                            handleEditArticle(
                              article
                            )
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="kb-small-action"
                          onClick={() =>
                            handleTogglePublish(
                              article
                            )
                          }
                        >
                          {article.is_published
                            ? "Unpublish"
                            : "Publish"}
                        </button>

                        <button
                          type="button"
                          className="kb-small-delete-action"
                          onClick={() =>
                            handleDeleteArticle(
                              article
                            )
                          }
                          disabled={
                            deletingArticleId ===
                            article.id
                          }
                        >
                          {deletingArticleId ===
                          article.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    )}
                  </div>
                )
              )}
            </section>
          )}
      </div>
    </div>
  );
}

export default KnowledgeBase;
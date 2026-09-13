import { useEffect, useMemo, useState } from "react";

import { getCategories } from "../services/api";

import "./AdminCategories.css";

const LOCAL_API_BASE_URL = "http://127.0.0.1:8000";

const PRODUCTION_API_BASE_URL =
  "https://ai-it-support-system.onrender.com";

function getApiBaseUrl() {
  const hostname = window.location.hostname;

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  ) {
    return LOCAL_API_BASE_URL;
  }

  return PRODUCTION_API_BASE_URL;
}

function getStoredValue(key) {
  return (
    localStorage.getItem(key) ||
    sessionStorage.getItem(key) ||
    null
  );
}

function getInitial(name) {
  return (
    name?.trim()?.charAt(0)?.toUpperCase() ||
    "?"
  );
}

async function adminRequest(
  endpoint,
  options = {}
) {
  const accessToken =
    getStoredValue("access_token");

  if (!accessToken) {
    throw new Error(
      "Your login session has expired. Please log in again."
    );
  }

  const baseUrl = getApiBaseUrl();

  const response = await fetch(
    `${baseUrl}${endpoint}`,
    {
      ...options,
      headers: {
        ...(options.body
          ? {
              "Content-Type":
                "application/json",
            }
          : {}),
        Authorization: `Bearer ${accessToken}`,
        ...(options.headers || {}),
      },
    }
  );

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  const data =
    contentType.includes(
      "application/json"
    )
      ? await response.json()
      : null;

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        data?.message ||
        "The requested operation failed."
    );
  }

  return data;
}

function AdminCategories({ onBack }) {
  const [categories, setCategories] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [selectedCategory, setSelectedCategory] =
    useState(null);

  const [editingCategory, setEditingCategory] =
    useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    parent_id: "",
    is_active: true,
  });

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [saveMessage, setSaveMessage] =
    useState("");

  const loadCategories = async (
    isRefresh = false
  ) => {
    try {
      setError("");

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const accessToken =
        getStoredValue("access_token");

      if (!accessToken) {
        throw new Error(
          "Your login session has expired. Please log in again."
        );
      }

      const data =
        await getCategories(
          accessToken
        );

      setCategories(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      setError(
        err?.message ||
          "Unable to load categories."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const filteredCategories =
    useMemo(() => {
      const value = search
        .trim()
        .toLowerCase();

      return categories.filter(
        (category) =>
          !value ||
          String(category.id).includes(
            value
          ) ||
          String(category.name || "")
            .toLowerCase()
            .includes(value) ||
          String(
            category.description || ""
          )
            .toLowerCase()
            .includes(value)
      );
    }, [categories, search]);

  const activeCount =
    categories.filter(
      (category) =>
        category.is_active === true
    ).length;

  const inactiveCount =
    categories.filter(
      (category) =>
        category.is_active === false
    ).length;

  const parentCount =
    categories.filter(
      (category) =>
        !category.parent_id
    ).length;

  function getParentName(parentId) {
    if (!parentId) {
      return "—";
    }

    const parent =
      categories.find(
        (category) =>
          Number(category.id) ===
          Number(parentId)
      );

    return (
      parent?.name ||
      `Category #${parentId}`
    );
  }

  function openCreate() {
    setSelectedCategory(null);
    setEditingCategory(true);

    setForm({
      name: "",
      description: "",
      parent_id: "",
      is_active: true,
    });

    setError("");
    setSaveMessage("");
  }

  function openManage(category) {
    setSelectedCategory(category);
    setEditingCategory(false);

    setError("");
    setSaveMessage("");
  }

  function openEdit() {
    if (!selectedCategory) {
      return;
    }

    setForm({
      name:
        selectedCategory.name || "",

      description:
        selectedCategory.description ||
        "",

      parent_id:
        selectedCategory.parent_id
          ? String(
              selectedCategory.parent_id
            )
          : "",

      is_active:
        selectedCategory.is_active !==
        false,
    });

    setEditingCategory(true);

    setError("");
    setSaveMessage("");
  }

  function closePanel() {
    setSelectedCategory(null);
    setEditingCategory(false);

    setError("");
    setSaveMessage("");
  }

  async function saveCategory(event) {
    event.preventDefault();

    if (
      form.name.trim().length < 2
    ) {
      setError(
        "Category name must contain at least 2 characters."
      );

      return;
    }

    if (
      selectedCategory &&
      form.parent_id &&
      Number(form.parent_id) ===
        Number(selectedCategory.id)
    ) {
      setError(
        "A category cannot be its own parent."
      );

      return;
    }

    try {
      setSaving(true);
      setError("");
      setSaveMessage("");

      const payload = {
        name: form.name.trim(),

        description:
          form.description.trim() ||
          null,

        parent_id:
          form.parent_id
            ? Number(form.parent_id)
            : null,

        is_active:
          form.is_active,
      };

      if (selectedCategory) {
        const updated =
          await adminRequest(
            `/api/categories/${selectedCategory.id}`,
            {
              method: "PUT",
              body: JSON.stringify(
                payload
              ),
            }
          );

        setCategories(
          (current) =>
            current.map(
              (category) =>
                Number(category.id) ===
                Number(updated.id)
                  ? updated
                  : category
            )
        );

        setSelectedCategory(
          updated
        );

        setSaveMessage(
          "Category updated successfully."
        );
      } else {
        const created =
          await adminRequest(
            "/api/categories",
            {
              method: "POST",
              body: JSON.stringify(
                payload
              ),
            }
          );

        setCategories(
          (current) => [
            ...current,
            created,
          ]
        );

        setSelectedCategory(
          created
        );

        setSaveMessage(
          "Category created successfully."
        );
      }

      setEditingCategory(false);

      setForm({
        name: "",
        description: "",
        parent_id: "",
        is_active: true,
      });
    } catch (err) {
      setError(
        err?.message ||
          "Unable to save category."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(
    category
  ) {
    if (
      !window.confirm(
        `Delete "${category.name}"?`
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSaveMessage("");

      await adminRequest(
        `/api/categories/${category.id}`,
        {
          method: "DELETE",
        }
      );

      setCategories(
        (current) =>
          current.filter(
            (item) =>
              Number(item.id) !==
              Number(category.id)
          )
      );

      closePanel();

      await loadCategories(true);
    } catch (err) {
      setError(
        err?.message ||
          "Unable to delete category."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-categories-page">
      <div className="admin-categories-content">
        <header className="admin-categories-page-header">
          <div className="admin-categories-title-block">
            <button
              type="button"
              className="admin-categories-back-link"
              onClick={onBack}
            >
              ← Dashboard
            </button>

            <p className="admin-categories-eyebrow">
              Administration
            </p>

            <h1>
              Categories Management
            </h1>

            <p className="admin-categories-subtitle">
              Organize ticket classification
              with clear, reusable support
              categories.
            </p>
          </div>

          <div className="admin-categories-header-actions">
            <button
              type="button"
              className="admin-categories-secondary-button"
              onClick={() =>
                loadCategories(true)
              }
              disabled={refreshing}
            >
              {refreshing
                ? "Refreshing..."
                : "↻ Refresh"}
            </button>

            <button
              type="button"
              className="admin-categories-primary-button"
              onClick={openCreate}
            >
              + New Category
            </button>
          </div>
        </header>

        <section className="admin-categories-stat-grid">
          <div className="admin-categories-stat-card">
            <div className="admin-categories-stat-top">
              <span>
                Total Categories
              </span>

              <span className="admin-categories-stat-icon">
                C
              </span>
            </div>

            <strong>
              {categories.length}
            </strong>

            <span>
              Configured categories
            </span>
          </div>

          <div className="admin-categories-stat-card">
            <div className="admin-categories-stat-top">
              <span>Active</span>

              <span className="admin-categories-stat-icon">
                ✓
              </span>
            </div>

            <strong>
              {activeCount}
            </strong>

            <span>
              Available for ticket creation
            </span>
          </div>

          <div className="admin-categories-stat-card">
            <div className="admin-categories-stat-top">
              <span>Inactive</span>

              <span className="admin-categories-stat-icon">
                −
              </span>
            </div>

            <strong>
              {inactiveCount}
            </strong>

            <span>
              Currently disabled
            </span>
          </div>

          <div className="admin-categories-stat-card">
            <div className="admin-categories-stat-top">
              <span>
                Parent Categories
              </span>

              <span className="admin-categories-stat-icon">
                P
              </span>
            </div>

            <strong>
              {parentCount}
            </strong>

            <span>
              Top-level categories
            </span>
          </div>
        </section>

        <section className="admin-categories-directory">
          <div className="admin-categories-directory-header">
            <div>
              <h2>
                Category Directory
              </h2>

              <p>
                Showing{" "}
                <strong>
                  {
                    filteredCategories.length
                  }
                </strong>{" "}
                of {categories.length}{" "}
                categories
              </p>
            </div>

            <div className="admin-categories-summary">
              <span>
                Active categories{" "}
                <strong>
                  {activeCount}
                </strong>
              </span>
            </div>
          </div>

          <div className="admin-categories-filters">
            <div>
              <label htmlFor="category-search">
                Search categories
              </label>

              <input
                id="category-search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search by name or description"
              />
            </div>
          </div>

          {error && (
            <div className="admin-categories-error">
              <strong>
                Unable to complete request
              </strong>

              <span>
                {error}
              </span>
            </div>
          )}

          {saveMessage &&
            !editingCategory && (
              <div className="admin-categories-success">
                {saveMessage}
              </div>
            )}

          {loading ? (
            <div className="admin-categories-state">
              <div className="admin-categories-spinner" />

              <h3>
                Loading categories...
              </h3>

              <p>
                Fetching the latest ticket
                categories.
              </p>
            </div>
          ) : filteredCategories.length ===
            0 ? (
            <div className="admin-categories-state">
              <div className="admin-categories-empty-icon">
                C
              </div>

              <h3>
                {categories.length
                  ? "No categories match your search"
                  : "No categories found"}
              </h3>

              <p>
                {categories.length
                  ? "Try another search term."
                  : "Create your first ticket category to get started."}
              </p>

              {!categories.length && (
                <button
                  type="button"
                  className="admin-categories-primary-button"
                  onClick={
                    openCreate
                  }
                >
                  + Create Category
                </button>
              )}
            </div>
          ) : (
            <div className="admin-categories-table-wrap">
              <table className="admin-categories-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Parent</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCategories.map(
                    (category) => (
                      <tr
                        key={
                          category.id
                        }
                      >
                        <td>
                          <span className="admin-categories-id">
                            #{category.id}
                          </span>
                        </td>

                        <td>
                          <div className="admin-categories-user">
                            <div className="admin-categories-avatar">
                              {getInitial(
                                category.name
                              )}
                            </div>

                            <div>
                              <strong>
                                {
                                  category.name
                                }
                              </strong>

                              <span>
                                Category #
                                {
                                  category.id
                                }
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="admin-categories-description">
                            {category.description ||
                              "No description"}
                          </span>
                        </td>

                        <td>
                          <span className="admin-categories-parent">
                            {getParentName(
                              category.parent_id
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`admin-categories-status ${
                              category.is_active
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            <span className="admin-categories-status-dot" />

                            {category.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="admin-categories-manage-button"
                            onClick={() =>
                              openManage(
                                category
                              )
                            }
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selectedCategory &&
        !editingCategory && (
          <div className="admin-categories-overlay">
            <aside className="admin-categories-side-panel">
              <div className="admin-categories-panel-header">
                <div>
                  <p>
                    Category Details
                  </p>

                  <h2>
                    {
                      selectedCategory.name
                    }
                  </h2>
                </div>

                <button
                  type="button"
                  className="admin-categories-close"
                  onClick={
                    closePanel
                  }
                  aria-label="Close category details"
                >
                  ×
                </button>
              </div>

              <div className="admin-categories-profile">
                <div className="admin-categories-large-avatar">
                  {getInitial(
                    selectedCategory.name
                  )}
                </div>

                <div>
                  <strong>
                    {
                      selectedCategory.name
                    }
                  </strong>

                  <span>
                    Category #
                    {
                      selectedCategory.id
                    }
                  </span>
                </div>
              </div>

              <div className="admin-categories-detail-list">
                <div>
                  <span>
                    Description
                  </span>

                  <strong>
                    {selectedCategory.description ||
                      "No description"}
                  </strong>
                </div>

                <div>
                  <span>
                    Parent
                  </span>

                  <strong>
                    {getParentName(
                      selectedCategory.parent_id
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Status
                  </span>

                  <strong>
                    {selectedCategory.is_active
                      ? "Active"
                      : "Inactive"}
                  </strong>
                </div>
              </div>

              {saveMessage && (
                <div className="admin-categories-success">
                  {saveMessage}
                </div>
              )}

              <div className="admin-categories-panel-actions">
                <button
                  type="button"
                  className="admin-categories-secondary-button"
                  onClick={
                    closePanel
                  }
                >
                  Close
                </button>

                <button
                  type="button"
                  className="admin-categories-primary-button"
                  onClick={
                    openEdit
                  }
                >
                  Edit Category
                </button>

                <button
                  type="button"
                  className="admin-categories-danger-button"
                  onClick={() =>
                    deleteCategory(
                      selectedCategory
                    )
                  }
                  disabled={saving}
                >
                  {saving
                    ? "Deleting..."
                    : "Delete Category"}
                </button>
              </div>
            </aside>
          </div>
        )}

      {editingCategory && (
        <div className="admin-categories-overlay">
          <div className="admin-categories-edit-modal">
            <div className="admin-categories-panel-header">
              <div>
                <p>
                  Category Management
                </p>

                <h2>
                  {selectedCategory
                    ? "Edit Category"
                    : "Create Category"}
                </h2>
              </div>

              <button
                type="button"
                className="admin-categories-close"
                onClick={
                  closePanel
                }
                disabled={saving}
                aria-label="Close category form"
              >
                ×
              </button>
            </div>

            <form
              className="admin-categories-form"
              onSubmit={
                saveCategory
              }
            >
              <div className="admin-categories-field">
                <label htmlFor="category-name">
                  Category name
                </label>

                <input
                  id="category-name"
                  value={
                    form.name
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event
                        .target
                        .value,
                    })
                  }
                  placeholder="Network"
                  disabled={saving}
                  autoFocus
                />
              </div>

              <div className="admin-categories-field">
                <label htmlFor="category-description">
                  Description{" "}
                  <span>
                    Optional
                  </span>
                </label>

                <textarea
                  id="category-description"
                  value={
                    form.description
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description:
                        event.target
                          .value,
                    })
                  }
                  placeholder="Network and connectivity issues"
                  rows={5}
                  disabled={saving}
                />
              </div>

              <div className="admin-categories-field">
                <label htmlFor="category-parent">
                  Parent category{" "}
                  <span>
                    Optional
                  </span>
                </label>

                <select
                  id="category-parent"
                  value={
                    form.parent_id
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      parent_id:
                        event.target
                          .value,
                    })
                  }
                  disabled={saving}
                >
                  <option value="">
                    No parent category
                  </option>

                  {categories
                    .filter(
                      (category) =>
                        category.id !==
                        selectedCategory?.id
                    )
                    .map(
                      (category) => (
                        <option
                          key={
                            category.id
                          }
                          value={
                            category.id
                          }
                        >
                          {
                            category.name
                          }
                        </option>
                      )
                    )}
                </select>

                <small>
                  Use a parent category only
                  when this is a more specific
                  sub-category.
                </small>
              </div>

              <div className="admin-categories-field">
                <label htmlFor="category-status">
                  Status
                </label>

                <select
                  id="category-status"
                  value={
                    form.is_active
                      ? "ACTIVE"
                      : "INACTIVE"
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      is_active:
                        event.target
                          .value ===
                        "ACTIVE",
                    })
                  }
                  disabled={saving}
                >
                  <option value="ACTIVE">
                    Active
                  </option>

                  <option value="INACTIVE">
                    Inactive
                  </option>
                </select>

                <small>
                  Inactive categories will not
                  be available for new ticket
                  creation.
                </small>
              </div>

              {error && (
                <div className="admin-categories-edit-error">
                  {error}
                </div>
              )}

              {saveMessage && (
                <div className="admin-categories-success">
                  {saveMessage}
                </div>
              )}

              <div className="admin-categories-form-footer">
                <button
                  type="button"
                  className="admin-categories-secondary-button"
                  onClick={
                    closePanel
                  }
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-categories-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : selectedCategory
                    ? "Update Category"
                    : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminCategories;
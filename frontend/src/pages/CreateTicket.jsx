import { useEffect, useState } from "react";
import "./CreateTicket.css";
import {
  createTicket,
  getCategories,
} from "../services/api";

function CreateTicket({ onCancel }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [categoryId, setCategoryId] = useState("");

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] =
    useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCategories() {
      try {
        setLoadingCategories(true);
        setError("");

        const accessToken =
          localStorage.getItem("access_token") ||
          sessionStorage.getItem("access_token");

        if (!accessToken) {
          throw new Error(
            "Your session has expired. Please log in again."
          );
        }

        const data = await getCategories(
          accessToken
        );

        const activeCategories = data.filter(
          (category) => category.is_active
        );

        setCategories(activeCategories);
      } catch (err) {
        setError(
          err.message ||
            "Failed to load categories."
        );
      } finally {
        setLoadingCategories(false);
      }
    }

    loadCategories();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const accessToken =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!accessToken) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const ticketData = {
        title: title.trim(),
        description: description.trim(),
        category_id: categoryId
          ? Number(categoryId)
          : null,
        priority,
      };

      const createdTicket = await createTicket(
        accessToken,
        ticketData
      );

      console.log(
        "Ticket created successfully:",
        createdTicket
      );

      alert(
        `Ticket ${createdTicket.ticket_number} created successfully.`
      );

      onCancel();
    } catch (err) {
      setError(
        err.message ||
          "Failed to create ticket. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="create-ticket-page">
      <div className="create-ticket-container">
        <div className="create-ticket-header">
          <div>
            <p className="page-label">IT Support</p>

            <h1>Create a New Ticket</h1>

            <p className="page-description">
              Describe your IT issue and our support
              team will help you resolve it.
            </p>
          </div>

          <button
            type="button"
            className="cancel-button"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
        </div>

        <div className="create-ticket-card">
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h2>Issue Details</h2>

              <p>
                Provide as much information as possible
                about the problem.
              </p>
            </div>

            {error && (
              <div className="form-error">
                <strong>
                  Unable to create ticket
                </strong>

                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="ticket-title">
                Ticket title
              </label>

              <input
                id="ticket-title"
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="Example: Unable to connect to company VPN"
                minLength={3}
                maxLength={255}
                required
                disabled={loading}
              />

              <span className="field-help">
                Give your issue a short, clear title.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="ticket-description">
                Description
              </label>

              <textarea
                id="ticket-description"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Describe what happened, when the issue started, and any troubleshooting steps you have already tried."
                minLength={5}
                rows={7}
                required
                disabled={loading}
              />

              <span className="field-help">
                Include useful details so the support
                engineer can investigate the issue.
              </span>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="ticket-category">
                  Category
                </label>

                <select
                  id="ticket-category"
                  value={categoryId}
                  onChange={(event) =>
                    setCategoryId(
                      event.target.value
                    )
                  }
                  disabled={
                    loading ||
                    loadingCategories
                  }
                >
                  <option value="">
                    {loadingCategories
                      ? "Loading categories..."
                      : "Select a category"}
                  </option>

                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>

                <span className="field-help">
                  Select the category that best
                  matches your IT issue.
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="ticket-priority">
                  Priority
                </label>

                <select
                  id="ticket-priority"
                  value={priority}
                  onChange={(event) =>
                    setPriority(
                      event.target.value
                    )
                  }
                  disabled={loading}
                >
                  <option value="LOW">
                    Low
                  </option>

                  <option value="MEDIUM">
                    Medium
                  </option>

                  <option value="HIGH">
                    High
                  </option>

                  <option value="CRITICAL">
                    Critical
                  </option>
                </select>

                <span className="field-help">
                  Choose the urgency of your issue.
                </span>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="submit-ticket-button"
                disabled={
                  loading ||
                  loadingCategories
                }
              >
                {loading
                  ? "Creating Ticket..."
                  : "Create Ticket"}
              </button>
            </div>
          </form>
        </div>

        <div className="security-note">
          <strong>Before you submit</strong>

          <span>
            Do not include passwords, authentication
            codes, or other sensitive credentials in
            your ticket description.
          </span>
        </div>
      </div>
    </div>
  );
}

export default CreateTicket;
import { useEffect, useRef, useState } from "react";

import "./TicketDetails.css";

import {
  getTicket,
  getCategories,
  getTicketComments,
  createTicketComment,
  getTicketAttachments,
  uploadTicketAttachment,
  downloadTicketAttachment,
  updateTicketStatus,
  rateTicket,
  analyzeTicketWithAI,
} from "../services/api";

import AdminAssignment from "./AdminAssignment";

function TicketDetails({ ticketId, onBack }) {
  const storedUser =
    localStorage.getItem("user") ||
    sessionStorage.getItem("user") ||
    "{}";

  let user = {};

  try {
    user = JSON.parse(storedUser);
  } catch {
    user = {};
  }

  const [ticket, setTicket] = useState(null);
  const [categories, setCategories] = useState([]);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);

  const [commentText, setCommentText] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);

  const [selectedRating, setSelectedRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");

  const [submittingRating, setSubmittingRating] = useState(false);

  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuccess, setAiSuccess] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);
  const [loadingAttachments, setLoadingAttachments] = useState(true);

  const [submittingComment, setSubmittingComment] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [downloadingAttachmentId, setDownloadingAttachmentId] =
    useState(null);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [showAssignment, setShowAssignment] = useState(false);

  const [error, setError] = useState("");
  const [commentError, setCommentError] = useState("");
  const [attachmentError, setAttachmentError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [ratingError, setRatingError] = useState("");
  const [ratingSuccess, setRatingSuccess] = useState("");

  const fileInputRef = useRef(null);

  const canUseInternalComments =
    user.role_id === 2 || user.role_id === 3;

  const canUseAI =
    user.role_id === 1 ||
    user.role_id === 2 ||
    user.role_id === 3;

  const isTicketCreator =
    ticket &&
    ticket.created_by === user.user_id;

  const hasExistingRating =
    ticket &&
    ticket.rating !== null &&
    ticket.rating !== undefined;

  const canRateTicket =
    user.role_id === 1 &&
    isTicketCreator &&
    (ticket?.status === "RESOLVED" ||
      ticket?.status === "CLOSED");

  const canShowAIAnalysis =
    canUseAI && ticket !== null;

  const allowedExtensions = [
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".txt",
    ".csv",
    ".docx",
  ];

  async function loadComments(accessToken) {
    try {
      setLoadingComments(true);
      setCommentError("");

      const commentData =
        await getTicketComments(
          accessToken,
          ticketId
        );

      setComments(
        Array.isArray(commentData)
          ? commentData
          : []
      );
    } catch (err) {
      setCommentError(
        err.message ||
          "Failed to load ticket activity."
      );
    } finally {
      setLoadingComments(false);
    }
  }

  async function loadAttachments(accessToken) {
    try {
      setLoadingAttachments(true);
      setAttachmentError("");

      const attachmentData =
        await getTicketAttachments(
          accessToken,
          ticketId
        );

      setAttachments(
        Array.isArray(attachmentData)
          ? attachmentData
          : []
      );
    } catch (err) {
      setAttachmentError(
        err.message ||
          "Failed to load attachments."
      );
    } finally {
      setLoadingAttachments(false);
    }
  }

  useEffect(() => {
    async function loadTicketDetails() {
      try {
        setLoading(true);
        setError("");
        setAiError("");
        setAiSuccess("");
        setStatusError("");
        setCommentError("");
        setAttachmentError("");
        setRatingError("");
        setRatingSuccess("");

        const accessToken =
          localStorage.getItem("access_token") ||
          sessionStorage.getItem("access_token");

        if (!accessToken) {
          throw new Error(
            "Your session has expired. Please log in again."
          );
        }

        const ticketData =
          await getTicket(
            accessToken,
            ticketId
          );

        setTicket(ticketData);

        if (
          user.role_id === 1 &&
          ticketData.created_by === user.user_id
        ) {
          setSelectedRating(
            ticketData.rating || 0
          );

          setFeedbackText(
            ticketData.feedback || ""
          );
        } else {
          setSelectedRating(0);
          setFeedbackText("");
        }

        try {
          const categoryData =
            await getCategories(
              accessToken
            );

          setCategories(
            Array.isArray(categoryData)
              ? categoryData
              : []
          );
        } catch {
          setCategories([]);
        }

        await loadComments(accessToken);
        await loadAttachments(accessToken);
      } catch (err) {
        console.error(err);

        setError(
          err.message ||
            "Failed to load ticket details."
        );
      } finally {
        setLoading(false);
      }
    }

    if (ticketId) {
      loadTicketDetails();
    }
  }, [ticketId]);

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

  function formatDate(dateString) {
    if (!dateString) {
      return "—";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatStatus(status) {
    if (!status) {
      return "—";
    }

    return status.replaceAll("_", " ");
  }

  function formatFileSize(fileSize) {
    if (fileSize === null || fileSize === undefined) {
      return "—";
    }

    if (fileSize < 1024) {
      return `${fileSize} B`;
    }

    if (fileSize < 1024 * 1024) {
      return `${(fileSize / 1024).toFixed(1)} KB`;
    }

    return `${(
      fileSize /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  function formatConfidence(score) {
    if (
      score === null ||
      score === undefined
    ) {
      return "—";
    }

    const numericScore = Number(score);

    if (!Number.isFinite(numericScore)) {
      return "—";
    }

    const percentage =
      numericScore <= 1
        ? numericScore * 100
        : numericScore;

    return `${Math.min(
      100,
      Math.max(0, Math.round(percentage))
    )}%`;
  }

  function getPriorityClass(priority) {
    if (!priority) {
      return "";
    }

    return `priority-${priority.toLowerCase()}`;
  }

  function getStatusClass(status) {
    if (!status) {
      return "";
    }

    return `status-${status.toLowerCase()}`;
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    setAttachmentError("");
    setSelectedFile(null);

    if (!file) {
      return;
    }

    const extension =
      "." +
      file.name
        .split(".")
        .pop()
        .toLowerCase();

    if (
      !allowedExtensions.includes(
        extension
      )
    ) {
      setAttachmentError(
        "File type not allowed. Allowed types: PDF, PNG, JPG, JPEG, TXT, CSV, DOCX."
      );

      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setAttachmentError(
        "File size cannot exceed 10 MB."
      );

      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  async function handleFileUpload(event) {
    event.preventDefault();

    if (!selectedFile) {
      setAttachmentError(
        "Please select a file first."
      );
      return;
    }

    try {
      setUploadingFile(true);
      setAttachmentError("");

      const accessToken =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!accessToken) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      await uploadTicketAttachment(
        accessToken,
        ticketId,
        selectedFile
      );

      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadAttachments(accessToken);
    } catch (err) {
      setAttachmentError(
        err.message ||
          "Failed to upload attachment."
      );
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleDownloadAttachment(
    attachment
  ) {
    try {
      setDownloadingAttachmentId(
        attachment.id
      );

      setAttachmentError("");

      const accessToken =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!accessToken) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      await downloadTicketAttachment(
        accessToken,
        ticketId,
        attachment.id,
        attachment.file_name
      );
    } catch (err) {
      setAttachmentError(
        err.message ||
          "Failed to download attachment."
      );
    } finally {
      setDownloadingAttachmentId(null);
    }
  }

  async function handleCommentSubmit(event) {
    event.preventDefault();

    const trimmedComment =
      commentText.trim();

    if (!trimmedComment) {
      setCommentError(
        "Please enter a comment."
      );
      return;
    }

    try {
      setSubmittingComment(true);
      setCommentError("");

      const accessToken =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!accessToken) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      await createTicketComment(
        accessToken,
        ticketId,
        {
          comment: trimmedComment,
          is_internal:
            canUseInternalComments
              ? isInternal
              : false,
        }
      );

      setCommentText("");
      setIsInternal(false);

      await loadComments(accessToken);
    } catch (err) {
      setCommentError(
        err.message ||
          "Failed to add comment."
      );
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleRatingSubmit(event) {
    event.preventDefault();

    if (!selectedRating) {
      setRatingError(
        "Please select a rating from 1 to 5 stars."
      );
      return;
    }

    try {
      setSubmittingRating(true);
      setRatingError("");
      setRatingSuccess("");

      const accessToken =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!accessToken) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const updatedTicket =
        await rateTicket(
          accessToken,
          ticketId,
          {
            rating: selectedRating,
            feedback: feedbackText,
          }
        );

      setTicket(updatedTicket);

      setRatingSuccess(
        "Thank you for rating our support."
      );
    } catch (err) {
      setRatingError(
        err.message ||
          "Failed to submit your rating."
      );
    } finally {
      setSubmittingRating(false);
    }
  }

  async function handleAIAnalysis() {
    try {
      setAnalyzingAI(true);
      setAiError("");
      setAiSuccess("");

      const accessToken =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!accessToken) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const result =
        await analyzeTicketWithAI(
          accessToken,
          ticketId
        );

      setAiAnalysis(result);

      setAiSuccess(
        "AI analysis completed successfully."
      );
    } catch (err) {
      setAiError(
        err.message ||
          "Failed to analyze this ticket with AI."
      );
    } finally {
      setAnalyzingAI(false);
    }
  }

  async function handleStatusChange(
    newStatus
  ) {
    try {
      setUpdatingStatus(true);
      setStatusError("");

      const accessToken =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!accessToken) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const updatedTicket =
        await updateTicketStatus(
          accessToken,
          ticketId,
          newStatus
        );

      setTicket(updatedTicket);

      alert(
        `Ticket status changed to ${formatStatus(
          updatedTicket.status
        )}.`
      );
    } catch (err) {
      setStatusError(
        err.message ||
          "Failed to update ticket status."
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  function handleAssignmentComplete(
    updatedTicket
  ) {
    setShowAssignment(false);
    setTicket(updatedTicket);
  }

  function getStatusActions() {
    if (!ticket) {
      return [];
    }

    /* EMPLOYEE */

    if (user.role_id === 1) {
      if (
        ticket.status === "OPEN" ||
        ticket.status === "ASSIGNED" ||
        ticket.status === "IN_PROGRESS" ||
        ticket.status === "PENDING"
      ) {
        return [
          {
            status: "CANCELLED",
            label: "Cancel Ticket",
          },
        ];
      }

      if (
        ticket.status === "RESOLVED" ||
        ticket.status === "CLOSED" ||
        ticket.status === "CANCELLED"
      ) {
        return [
          {
            status: "REOPENED",
            label: "Reopen Ticket",
          },
        ];
      }
    }

    /* SUPPORT ENGINEER */

    if (user.role_id === 2) {
      if (ticket.status === "ASSIGNED") {
        return [
          {
            status: "IN_PROGRESS",
            label: "Start Working",
          },
        ];
      }

      if (ticket.status === "IN_PROGRESS") {
        return [
          {
            status: "PENDING",
            label: "Set Pending",
          },
          {
            status: "RESOLVED",
            label: "Resolve Ticket",
          },
        ];
      }

      if (ticket.status === "PENDING") {
        return [
          {
            status: "IN_PROGRESS",
            label: "Resume Work",
          },
        ];
      }

      if (
        ticket.status === "RESOLVED" ||
        ticket.status === "CLOSED"
      ) {
        return [
          {
            status: "REOPENED",
            label: "Reopen Ticket",
          },
        ];
      }

      if (ticket.status === "REOPENED") {
        return [
          {
            status: "IN_PROGRESS",
            label: "Start Working Again",
          },
        ];
      }
    }

    /* ADMINISTRATOR */

    if (user.role_id === 3) {
      if (ticket.status === "OPEN") {
        return [
          {
            status: "CANCELLED",
            label: "Cancel Ticket",
          },
        ];
      }

      if (ticket.status === "ASSIGNED") {
        return [
          {
            status: "IN_PROGRESS",
            label: "Start Working",
          },
          {
            status: "CANCELLED",
            label: "Cancel Ticket",
          },
        ];
      }

      if (ticket.status === "IN_PROGRESS") {
        return [
          {
            status: "PENDING",
            label: "Set Pending",
          },
          {
            status: "RESOLVED",
            label: "Resolve Ticket",
          },
          {
            status: "CANCELLED",
            label: "Cancel Ticket",
          },
        ];
      }

      if (ticket.status === "PENDING") {
        return [
          {
            status: "IN_PROGRESS",
            label: "Resume Work",
          },
          {
            status: "CANCELLED",
            label: "Cancel Ticket",
          },
        ];
      }

      if (ticket.status === "RESOLVED") {
        return [
          {
            status: "CLOSED",
            label: "Close Ticket",
          },
          {
            status: "REOPENED",
            label: "Reopen Ticket",
          },
        ];
      }

      if (ticket.status === "CLOSED") {
        return [
          {
            status: "REOPENED",
            label: "Reopen Ticket",
          },
        ];
      }

      if (ticket.status === "REOPENED") {
        return [
          {
            status: "ASSIGNED",
            label: "Assign Again",
          },
          {
            status: "IN_PROGRESS",
            label: "Start Working",
          },
          {
            status: "CANCELLED",
            label: "Cancel Ticket",
          },
        ];
      }

      if (ticket.status === "CANCELLED") {
        return [
          {
            status: "REOPENED",
            label: "Reopen Ticket",
          },
        ];
      }
    }

    return [];
  }

  if (loading) {
    return (
      <main className="ticket-details-page">
        <div className="ticket-card">
          <div className="loading-state">
            Loading ticket details...
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="ticket-details-page">
        <div className="ticket-page-header">
          <button
            type="button"
            className="secondary-button"
            onClick={onBack}
          >
            ← Back to Dashboard
          </button>

          <div>
            <h1>Ticket Details</h1>
            <p>
              Unable to load this support request.
            </p>
          </div>
        </div>

        <section className="ticket-card">
          <div className="error-message">
            {error}
          </div>

          <div className="empty-state">
            <button
              type="button"
              className="primary-button"
              onClick={onBack}
            >
              Back to Dashboard
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!ticket) {
    return null;
  }

  if (
    showAssignment &&
    user.role_id === 3
  ) {
    return (
      <AdminAssignment
        ticketId={ticketId}
        onBack={() =>
          setShowAssignment(false)
        }
        onAssigned={
          handleAssignmentComplete
        }
      />
    );
  }

  const statusActions =
    getStatusActions();

  return (
    <main className="ticket-details-page">
      <div className="ticket-page-header">
        <button
          type="button"
          className="secondary-button"
          onClick={onBack}
        >
          ← Back to Dashboard
        </button>

        <div>
          <h1>Ticket Details</h1>
          <p>
            View, manage, and track this support request.
          </p>
        </div>
      </div>

      {/* Ticket Summary */}

      <section className="ticket-card ticket-summary-card">
        <div className="ticket-summary-header">
          <div>
            <span className="ticket-number">
              {ticket.ticket_number}
            </span>

            <h2>{ticket.title}</h2>
          </div>

          <div className="ticket-summary-badges">
            <span
              className={`status-badge ${getStatusClass(
                ticket.status
              )}`}
            >
              {formatStatus(ticket.status)}
            </span>

            <span
              className={`priority-badge ${getPriorityClass(
                ticket.priority
              )}`}
            >
              {ticket.priority}
            </span>
          </div>
        </div>

        <div className="ticket-summary-grid">
          <div className="ticket-summary-item">
            <span className="ticket-summary-label">
              Category
            </span>

            <strong>
              {getCategoryName(
                ticket.category_id
              )}
            </strong>
          </div>

          <div className="ticket-summary-item">
            <span className="ticket-summary-label">
              Created By
            </span>

            <strong>
              User #{ticket.created_by}
            </strong>
          </div>

          <div className="ticket-summary-item">
            <span className="ticket-summary-label">
              Assigned To
            </span>

            <strong>
              {ticket.assigned_to
                ? `User #${ticket.assigned_to}`
                : "Unassigned"}
            </strong>
          </div>

          <div className="ticket-summary-item">
            <span className="ticket-summary-label">
              Support Team
            </span>

            <strong>
              {ticket.team_id
                ? `Team #${ticket.team_id}`
                : "Not assigned"}
            </strong>
          </div>
        </div>
      </section>

      {/* Admin Assignment */}

      {user.role_id === 3 && (
        <section className="ticket-card">
          <div className="ticket-card-header">
            <div>
              <h2>Ticket Assignment</h2>

              <p>
                Assign this ticket to a support engineer and team.
              </p>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                setShowAssignment(true)
              }
            >
              Assign Ticket
            </button>
          </div>
        </section>
      )}

      {/* Status Actions */}

      {statusActions.length > 0 && (
        <section className="ticket-card">
          <div className="ticket-card-header">
            <div>
              <h2>Ticket Actions</h2>

              <p>
                Available actions for your role.
              </p>
            </div>
          </div>

          <div className="ticket-action-row">
            {statusActions.map((action) => (
              <button
                key={action.status}
                type="button"
                className="primary-button"
                onClick={() =>
                  handleStatusChange(
                    action.status
                  )
                }
                disabled={updatingStatus}
              >
                {updatingStatus
                  ? "Updating..."
                  : action.label}
              </button>
            ))}
          </div>

          {statusError && (
            <div className="error-message">
              {statusError}
            </div>
          )}
        </section>
      )}

      {/* Issue Description */}

      <section className="ticket-card">
        <div className="ticket-card-header">
          <div>
            <h2>Issue Description</h2>

            <p>
              Details provided when the ticket was created.
            </p>
          </div>
        </div>

        <div className="ticket-description">
          {ticket.description}
        </div>
      </section>

      {/* AI Analysis */}

      {canShowAIAnalysis && (
        <section className="ticket-card ticket-ai-card">
          <div className="ai-card-header">
            <div>
              <span className="ai-card-kicker">
                AI ASSISTANT
              </span>

              <h2>AI Analysis</h2>

              <p>
                AI-generated insights to help understand and troubleshoot this ticket.
              </p>
            </div>

            <button
              type="button"
              className="primary-button ai-analyze-button"
              onClick={handleAIAnalysis}
              disabled={analyzingAI}
            >
              {analyzingAI
                ? "Analyzing..."
                : aiAnalysis
                  ? "Analyze Again"
                  : "Analyze Ticket"}
            </button>
          </div>

          <div className="ticket-ai-content">
            {aiError && (
              <div className="ai-analysis-error">
                <div className="ai-status-icon">
                  !
                </div>

                <div>
                  <strong>
                    AI analysis unavailable
                  </strong>

                  <p>{aiError}</p>
                </div>
              </div>
            )}

            {aiSuccess && !aiError && (
              <div className="ai-analysis-success">
                <div className="ai-status-icon">
                  ✓
                </div>

                <div>
                  <strong>
                    Analysis ready
                  </strong>

                  <p>{aiSuccess}</p>
                </div>
              </div>
            )}

            {!aiAnalysis &&
              !analyzingAI &&
              !aiError && (
                <div className="ai-empty-state">
                  <div className="ai-empty-icon">
                    AI
                  </div>

                  <h3>
                    No AI analysis yet
                  </h3>

                  <p>
                    Run AI analysis to get category,
                    priority, sentiment, summary,
                    and troubleshooting recommendations.
                  </p>
                </div>
              )}

            {analyzingAI && (
              <div className="ai-loading-indicator">
                Analyzing ticket information...
              </div>
            )}

            {aiAnalysis && !analyzingAI && (
              <div className="ai-analysis-result">
                <div className="ai-metadata-grid">
                  <div className="ai-metadata-item">
                    <span className="ai-metadata-label">
                      Category
                    </span>

                    <span className="ai-metadata-value">
                      {aiAnalysis.category || "—"}
                    </span>
                  </div>

                  <div className="ai-metadata-item">
                    <span className="ai-metadata-label">
                      Subcategory
                    </span>

                    <span className="ai-metadata-value">
                      {aiAnalysis.subcategory || "—"}
                    </span>
                  </div>

                  <div className="ai-metadata-item">
                    <span className="ai-metadata-label">
                      Priority
                    </span>

                    <span
                      className={`ai-priority-badge ${getPriorityClass(
                        aiAnalysis.priority
                      )}`}
                    >
                      {aiAnalysis.priority || "—"}
                    </span>
                  </div>

                  <div className="ai-metadata-item">
                    <span className="ai-metadata-label">
                      Sentiment
                    </span>

                    <span
                      className={`ai-sentiment-badge ${
                        aiAnalysis.sentiment
                          ? `sentiment-${aiAnalysis.sentiment.toLowerCase()}`
                          : ""
                      }`}
                    >
                      {aiAnalysis.sentiment || "—"}
                    </span>
                  </div>

                  <div className="ai-metadata-item ai-confidence">
                    <div className="ai-confidence-top">
                      <span className="ai-metadata-label">
                        Confidence
                      </span>

                      <strong>
                        {formatConfidence(
                          aiAnalysis.confidence_score
                        )}
                      </strong>
                    </div>

                    <div className="ai-confidence-track">
                      <div
                        className="ai-confidence-fill"
                        style={{
                          width: `${(() => {
                            const value =
                              Number(
                                aiAnalysis.confidence_score
                              );

                            if (
                              !Number.isFinite(value)
                            ) {
                              return 0;
                            }

                            const percentage =
                              value <= 1
                                ? value * 100
                                : value;

                            return Math.min(
                              100,
                              Math.max(
                                0,
                                percentage
                              )
                            );
                          })()}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="ai-metadata-item">
                    <span className="ai-metadata-label">
                      Model
                    </span>

                    <span className="ai-metadata-value ai-model-value">
                      {aiAnalysis.model_name || "—"}
                    </span>
                  </div>
                </div>

                <div className="ai-text-section">
                  <h3 className="ai-section-heading">
                    <span className="ai-section-marker" />
                    Summary
                  </h3>

                  <p>
                    {aiAnalysis.summary ||
                      "No summary provided."}
                  </p>
                </div>

                <div className="ai-text-section">
                  <h3 className="ai-section-heading">
                    <span className="ai-section-marker" />
                    Recommendation
                  </h3>

                  <p>
                    {aiAnalysis.recommendation ||
                      "No recommendation provided."}
                  </p>
                </div>

                <div className="ai-disclaimer">
                  <strong>
                    AI-assisted guidance
                  </strong>

                  <span>
                    Review the recommendation before
                    taking action. AI output is advisory
                    and should not replace human support
                    judgment.
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Employee Rating */}

      {canRateTicket && (
        <section className="ticket-card">
          <div className="ticket-card-header">
            <div>
              <h2>Rate Support</h2>

              <p>
                Share your experience with the support team.
              </p>
            </div>
          </div>

          {hasExistingRating ? (
            <div className="rating-submitted">
              <div className="rating-display">
                <span className="rating-score">
                  {ticket.rating}/5
                </span>

                <span>
                  Support rating submitted
                </span>
              </div>

              {ticket.feedback && (
                <p>
                  {ticket.feedback}
                </p>
              )}
            </div>
          ) : (
            <form
              className="rating-form"
              onSubmit={handleRatingSubmit}
            >
              <label
                className="form-label"
                htmlFor="ticket-rating"
              >
                How would you rate the support you received?
              </label>

              <div className="rating-star-selector">
                {[1, 2, 3, 4, 5].map(
                  (star) => (
                    <button
                      key={star}
                      type="button"
                      className={
                        star <= selectedRating
                          ? "rating-star-button selected"
                          : "rating-star-button"
                      }
                      onClick={() =>
                        setSelectedRating(star)
                      }
                      aria-label={`${star} star${
                        star > 1 ? "s" : ""
                      }`}
                    >
                      ★
                    </button>
                  )
                )}
              </div>

              <textarea
                className="form-control"
                value={feedbackText}
                onChange={(event) =>
                  setFeedbackText(
                    event.target.value
                  )
                }
                placeholder="Tell us about your support experience (optional)"
                maxLength={2000}
                rows={4}
                disabled={submittingRating}
              />

              {ratingError && (
                <div className="error-message">
                  {ratingError}
                </div>
              )}

              {ratingSuccess && (
                <div className="info-message">
                  {ratingSuccess}
                </div>
              )}

              <button
                type="submit"
                className="primary-button"
                disabled={
                  submittingRating ||
                  !selectedRating
                }
              >
                {submittingRating
                  ? "Submitting..."
                  : "Submit Rating"}
              </button>
            </form>
          )}
        </section>
      )}

      {/* Activity */}

      <section className="ticket-card">
        <div className="ticket-card-header">
          <div>
            <h2>Activity</h2>

            <p>
              Comments and updates related to this ticket.
            </p>
          </div>
        </div>

        {loadingComments ? (
          <div className="loading-state">
            Loading activity...
          </div>
        ) : commentError ? (
          <div className="error-message">
            {commentError}
          </div>
        ) : comments.length === 0 ? (
          <div className="empty-state">
            No activity yet.
          </div>
        ) : (
          <div className="comment-list">
            {comments.map((comment) => (
              <article
                className="comment-item"
                key={comment.id}
              >
                <div className="comment-header">
                  <strong>
                    User #
                    {comment.user_id}
                  </strong>

                  <span>
                    {formatDate(
                      comment.created_at
                    )}
                  </span>
                </div>

                {comment.is_internal && (
                  <span className="internal-comment-badge">
                    Internal
                  </span>
                )}

                <p>
                  {comment.comment}
                </p>
              </article>
            ))}
          </div>
        )}

        <form
          className="comment-form"
          onSubmit={handleCommentSubmit}
        >
          <label
            className="form-label"
            htmlFor="ticket-comment"
          >
            Add a comment
          </label>

          <textarea
            id="ticket-comment"
            className="form-control"
            value={commentText}
            onChange={(event) =>
              setCommentText(
                event.target.value
              )
            }
            placeholder="Write a comment..."
            maxLength={5000}
            rows={5}
            disabled={submittingComment}
          />

          {canUseInternalComments && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(event) =>
                  setIsInternal(
                    event.target.checked
                  )
                }
                disabled={submittingComment}
              />

              <span>
                Internal comment
              </span>
            </label>
          )}

          {commentError && (
            <div className="error-message">
              {commentError}
            </div>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={
              submittingComment ||
              !commentText.trim()
            }
          >
            {submittingComment
              ? "Adding..."
              : "Add Comment"}
          </button>
        </form>
      </section>

      {/* Attachments */}

      <section className="ticket-card">
        <div className="ticket-card-header">
          <div>
            <h2>Attachments</h2>

            <p>
              Upload screenshots and files related to this ticket.
            </p>
          </div>
        </div>

        {loadingAttachments ? (
          <div className="loading-state">
            Loading attachments...
          </div>
        ) : attachmentError &&
          attachments.length === 0 ? (
          <div className="error-message">
            {attachmentError}
          </div>
        ) : attachments.length === 0 ? (
          <div className="empty-state">
            No attachments yet.
          </div>
        ) : (
          <div className="attachment-list">
            {attachments.map((attachment) => (
              <div
                className="attachment-item"
                key={attachment.id}
              >
                <div>
                  <strong>
                    {attachment.file_name}
                  </strong>

                  <span>
                    {formatFileSize(
                      attachment.file_size
                    )}{" "}
                    · Uploaded by User #
                    {attachment.uploaded_by}
                  </span>
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    handleDownloadAttachment(
                      attachment
                    )
                  }
                  disabled={
                    downloadingAttachmentId ===
                    attachment.id
                  }
                >
                  {downloadingAttachmentId ===
                  attachment.id
                    ? "Downloading..."
                    : "Download"}
                </button>
              </div>
            ))}
          </div>
        )}

        <form
          className="comment-form"
          onSubmit={handleFileUpload}
        >
          <label
            className="form-label"
            htmlFor="ticket-attachment"
          >
            Upload a file
          </label>

          <input
            id="ticket-attachment"
            ref={fileInputRef}
            type="file"
            className="form-control"
            onChange={handleFileChange}
            disabled={uploadingFile}
            accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.docx"
          />

          <span className="upload-help">
            Allowed: PDF, PNG, JPG, JPEG, TXT, CSV, DOCX · Maximum 10 MB
          </span>

          {attachmentError && (
            <div className="error-message">
              {attachmentError}
            </div>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={
              uploadingFile ||
              !selectedFile
            }
          >
            {uploadingFile
              ? "Uploading..."
              : "Upload File"}
          </button>
        </form>
      </section>

      {/* Ticket Information */}

      <section className="ticket-card">
        <div className="ticket-card-header">
          <div>
            <h2>Ticket Information</h2>

            <p>
              System information associated with this ticket.
            </p>
          </div>
        </div>

        <div className="ticket-info-grid">
          <div>
            <span>Ticket ID</span>
            <strong>{ticket.id}</strong>
          </div>

          <div>
            <span>Ticket Number</span>
            <strong>
              {ticket.ticket_number}
            </strong>
          </div>

          <div>
            <span>Created At</span>
            <strong>
              {formatDate(
                ticket.created_at
              )}
            </strong>
          </div>

          <div>
            <span>Updated At</span>
            <strong>
              {formatDate(
                ticket.updated_at
              )}
            </strong>
          </div>

          <div>
            <span>Resolved At</span>
            <strong>
              {formatDate(
                ticket.resolved_at
              )}
            </strong>
          </div>

          <div>
            <span>Closed At</span>
            <strong>
              {formatDate(
                ticket.closed_at
              )}
            </strong>
          </div>
        </div>
      </section>
    </main>
  );
}

export default TicketDetails;

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

import AdminAssignment from "../components/AdminAssignment";

function TicketDetails({ ticketId, onBack }) {
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
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

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

  const [currentTime, setCurrentTime] = useState(new Date());

  const fileInputRef = useRef(null);

  const getAccessToken = () => {
    return (
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token")
    );
  };

  const getStoredUser = () => {
    const storedUser =
      localStorage.getItem("user") ||
      sessionStorage.getItem("user");

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser);
    } catch {
      return null;
    }
  };

  const user = getStoredUser();
  const accessToken = getAccessToken();

  const canUseInternalComments =
    user?.role_id === 2 || user?.role_id === 3;

  const canUseAI =
    user?.role_id === 1 ||
    user?.role_id === 2 ||
    user?.role_id === 3;

  const isTicketCreator =
    ticket &&
    user &&
    ticket.created_by === user.user_id;

  const hasExistingRating =
    ticket &&
    ticket.rating !== null &&
    ticket.rating !== undefined;

  const canRateTicket =
    user?.role_id === 1 &&
    isTicketCreator &&
    (ticket?.status === "RESOLVED" ||
      ticket?.status === "CLOSED");

  const canShowAIAnalysis =
    canUseAI && ticket !== null;

  const allowedFileExtensions = [
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".txt",
    ".csv",
    ".docx",
  ];

  // ----------------------------------------
  // Live Clock For SLA
  // ----------------------------------------

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // ----------------------------------------
  // Convert Backend UTC Timestamp
  // ----------------------------------------

  const parseBackendDate = (dateValue) => {
    if (!dateValue) {
      return null;
    }

    if (dateValue instanceof Date) {
      return dateValue;
    }

    const value = String(dateValue);

    /*
     * Backend currently stores UTC timestamps without a timezone suffix.
     * Example:
     *
     * 2026-09-11T17:19:20
     *
     * Add Z so JavaScript correctly interprets the value as UTC.
     */
    if (
      !value.endsWith("Z") &&
      !value.includes("+") &&
      !/[+-]\d{2}:\d{2}$/.test(value)
    ) {
      return new Date(`${value}Z`);
    }

    return new Date(value);
  };

  // ----------------------------------------
  // Back to Dashboard
  // ----------------------------------------

  const handleBackToDashboard = () => {
    if (onBack) {
      onBack();
    }
  };

  // ----------------------------------------
  // Load Comments
  // ----------------------------------------

  const loadComments = async () => {
    if (!ticketId || !accessToken) {
      return;
    }

    setLoadingComments(true);
    setCommentError("");

    try {
      const response = await getTicketComments(
        accessToken,
        ticketId
      );

      setComments(response || []);
    } catch (err) {
      setCommentError(
        err?.message || "Failed to load comments."
      );
    } finally {
      setLoadingComments(false);
    }
  };

  // ----------------------------------------
  // Load Attachments
  // ----------------------------------------

  const loadAttachments = async () => {
    if (!ticketId || !accessToken) {
      return;
    }

    setLoadingAttachments(true);
    setAttachmentError("");

    try {
      const response = await getTicketAttachments(
        accessToken,
        ticketId
      );

      setAttachments(response || []);
    } catch (err) {
      setAttachmentError(
        err?.message || "Failed to load attachments."
      );
    } finally {
      setLoadingAttachments(false);
    }
  };

  // ----------------------------------------
  // Load Ticket
  // ----------------------------------------

  useEffect(() => {
    const loadTicketData = async () => {
      if (!ticketId) {
        setError("Ticket ID is missing.");
        setLoading(false);
        return;
      }

      if (!accessToken) {
        setError(
          "Authentication token is missing. Please log in again."
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const [
          ticketResponse,
          categoriesResponse,
        ] = await Promise.all([
          getTicket(accessToken, ticketId),
          getCategories(accessToken),
        ]);

        setTicket(ticketResponse);
        setCategories(categoriesResponse || []);

        if (
          ticketResponse.rating !== null &&
          ticketResponse.rating !== undefined
        ) {
          setSelectedRating(ticketResponse.rating);
        }

        if (ticketResponse.feedback) {
          setFeedbackText(ticketResponse.feedback);
        }

        await Promise.all([
          loadComments(),
          loadAttachments(),
        ]);
      } catch (err) {
        setError(
          err?.message ||
            "Failed to load ticket details."
        );
      } finally {
        setLoading(false);
      }
    };

    loadTicketData();
  }, [ticketId, accessToken]);

  // ----------------------------------------
  // Category
  // ----------------------------------------

  const getCategoryName = (categoryId) => {
    if (!categoryId) {
      return "Not specified";
    }

    const category = categories.find(
      (item) => item.id === categoryId
    );

    return category
      ? category.name
      : `Category #${categoryId}`;
  };

  // ----------------------------------------
  // Date
  // ----------------------------------------

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "N/A";
    }

    const date = parseBackendDate(dateValue);

    if (!date || Number.isNaN(date.getTime())) {
      return String(dateValue);
    }

    return date.toLocaleString();
  };

  // ----------------------------------------
  // Status
  // ----------------------------------------

  const formatStatus = (status) => {
    if (!status) {
      return "Unknown";
    }

    return status
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  // ----------------------------------------
  // File Size
  // ----------------------------------------

  const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) {
      return "0 Bytes";
    }

    const sizes = [
      "Bytes",
      "KB",
      "MB",
      "GB",
    ];

    const index = Math.floor(
      Math.log(bytes) / Math.log(1024)
    );

    return `${(
      bytes / Math.pow(1024, index)
    ).toFixed(2)} ${sizes[index]}`;
  };

  // ----------------------------------------
  // AI Confidence
  // ----------------------------------------

  const formatConfidence = (score) => {
    if (
      score === null ||
      score === undefined
    ) {
      return "N/A";
    }

    return `${(
      Number(score) * 100
    ).toFixed(0)}%`;
  };

  // ----------------------------------------
  // Priority Class
  // ----------------------------------------

  const getPriorityClass = (priority) => {
    switch (priority) {
      case "CRITICAL":
        return "priority-critical";

      case "HIGH":
        return "priority-high";

      case "MEDIUM":
        return "priority-medium";

      case "LOW":
        return "priority-low";

      default:
        return "";
    }
  };

  // ----------------------------------------
  // Status Class
  // ----------------------------------------

  const getStatusClass = (status) => {
    switch (status) {
      case "OPEN":
        return "status-open";

      case "ASSIGNED":
        return "status-assigned";

      case "IN_PROGRESS":
        return "status-in-progress";

      case "PENDING":
        return "status-pending";

      case "RESOLVED":
        return "status-resolved";

      case "CLOSED":
        return "status-closed";

      case "REOPENED":
        return "status-reopened";

      case "CANCELLED":
        return "status-cancelled";

      default:
        return "";
    }
  };

  // ----------------------------------------
  // SLA Status
  // ----------------------------------------

  const getSLAStatusText = (
    value,
    deadline
  ) => {
    if (value === true) {
      return "Met";
    }

    if (value === false) {
      return "Breached";
    }

    if (!deadline) {
      return "Pending";
    }

    const deadlineDate =
      parseBackendDate(deadline);

    if (
      !deadlineDate ||
      Number.isNaN(deadlineDate.getTime())
    ) {
      return "Pending";
    }

    if (
      currentTime.getTime() >=
      deadlineDate.getTime()
    ) {
      return "Breached";
    }

    return "Pending";
  };

  const getSLAStatusClass = (
    value,
    deadline
  ) => {
    const status = getSLAStatusText(
      value,
      deadline
    );

    if (status === "Met") {
      return "sla-status-met";
    }

    if (status === "Breached") {
      return "sla-status-breached";
    }

    return "sla-status-pending";
  };

  // ----------------------------------------
  // SLA Remaining Time
  // ----------------------------------------

  const getSLARemainingText = (
    value,
    deadline
  ) => {
    if (value === true) {
      return "SLA completed";
    }

    if (!deadline) {
      return "No deadline available";
    }

    const deadlineDate =
      parseBackendDate(deadline);

    if (
      !deadlineDate ||
      Number.isNaN(deadlineDate.getTime())
    ) {
      return "Invalid deadline";
    }

    const difference =
      deadlineDate.getTime() -
      currentTime.getTime();

    if (difference <= 0) {
      return "Deadline exceeded";
    }

    const totalMinutes = Math.floor(
      difference / (1000 * 60)
    );

    const days = Math.floor(
      totalMinutes / (60 * 24)
    );

    const hours = Math.floor(
      (totalMinutes % (60 * 24)) / 60
    );

    const minutes =
      totalMinutes % 60;

    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }

    return `${minutes}m remaining`;
  };

  // ----------------------------------------
  // File Selection
  // ----------------------------------------

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const fileName =
      file.name.toLowerCase();

    const isAllowed =
      allowedFileExtensions.some(
        (extension) =>
          fileName.endsWith(extension)
      );

    if (!isAllowed) {
      setAttachmentError(
        "File type is not allowed. Allowed types: PDF, PNG, JPG, JPEG, TXT, CSV, DOCX."
      );

      event.target.value = "";
      setSelectedFile(null);

      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setAttachmentError(
        "File size must be 10 MB or less."
      );

      event.target.value = "";
      setSelectedFile(null);

      return;
    }

    setAttachmentError("");
    setSelectedFile(file);
  };

  // ----------------------------------------
  // Upload Attachment
  // ----------------------------------------

  const handleUpload = async () => {
    if (!accessToken) {
      setAttachmentError(
        "Authentication token is missing. Please log in again."
      );
      return;
    }

    if (!selectedFile) {
      setAttachmentError(
        "Please select a file first."
      );
      return;
    }

    setUploadingFile(true);
    setAttachmentError("");

    try {
      await uploadTicketAttachment(
        accessToken,
        ticketId,
        selectedFile
      );

      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadAttachments();
    } catch (err) {
      setAttachmentError(
        err?.message ||
          "Failed to upload attachment."
      );
    } finally {
      setUploadingFile(false);
    }
  };

  // ----------------------------------------
  // Download Attachment
  // ----------------------------------------

  const handleDownloadAttachment = async (
    attachment
  ) => {
    if (!accessToken) {
      setAttachmentError(
        "Authentication token is missing. Please log in again."
      );
      return;
    }

    setDownloadingAttachmentId(
      attachment.id
    );

    setAttachmentError("");

    try {
      await downloadTicketAttachment(
        accessToken,
        ticketId,
        attachment.id,
        attachment.file_name ||
          attachment.filename ||
          "attachment"
      );
    } catch (err) {
      setAttachmentError(
        err?.message ||
          "Failed to download attachment."
      );
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  // ----------------------------------------
  // Comment Submit
  // ----------------------------------------

  const handleCommentSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!accessToken) {
      setCommentError(
        "Authentication token is missing. Please log in again."
      );
      return;
    }

    if (!commentText.trim()) {
      setCommentError(
        "Comment cannot be empty."
      );
      return;
    }

    setSubmittingComment(true);
    setCommentError("");

    try {
      await createTicketComment(
        accessToken,
        ticketId,
        {
          comment: commentText.trim(),
          is_internal: canUseInternalComments
            ? isInternal
            : false,
        }
      );

      setCommentText("");
      setIsInternal(false);

      await loadComments();
    } catch (err) {
      setCommentError(
        err?.message ||
          "Failed to add comment."
      );
    } finally {
      setSubmittingComment(false);
    }
  };

  // ----------------------------------------
  // Rating Submit
  // ----------------------------------------

  const handleRatingSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!accessToken) {
      setRatingError(
        "Authentication token is missing. Please log in again."
      );
      return;
    }

    if (!selectedRating) {
      setRatingError(
        "Please select a rating."
      );
      return;
    }

    setSubmittingRating(true);
    setRatingError("");
    setRatingSuccess("");

    try {
      const updatedTicket =
        await rateTicket(
          accessToken,
          ticketId,
          {
            rating: selectedRating,
            feedback:
              feedbackText.trim() ||
              null,
          }
        );

      setTicket(updatedTicket);

      setRatingSuccess(
        "Thank you. Your rating has been submitted."
      );
    } catch (err) {
      setRatingError(
        err?.message ||
          "Failed to submit rating."
      );
    } finally {
      setSubmittingRating(false);
    }
  };

  // ----------------------------------------
  // AI Analysis
  // ----------------------------------------

  const handleAIAnalysis = async () => {
    if (!accessToken) {
      setAiError(
        "Authentication token is missing. Please log in again."
      );
      return;
    }

    setAnalyzingAI(true);
    setAiError("");
    setAiSuccess("");

    try {
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
      const errorMessage =
        err?.message || "";

      if (
        errorMessage.includes("429") ||
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        errorMessage.toLowerCase().includes("quota")
      ) {
        setAiError(
          "AI service quota reached. Please try again later."
        );
      } else {
        setAiError(
          errorMessage ||
            "Failed to analyze the ticket with AI."
        );
      }
    } finally {
      setAnalyzingAI(false);
    }
  };

  // ----------------------------------------
  // Status Actions
  // ----------------------------------------

  const getStatusActions = () => {
    if (!ticket || !user) {
      return [];
    }

    const actions = [];

    // Employee
    if (user.role_id === 1) {
      if (ticket.status === "RESOLVED") {
        actions.push("CLOSED");
        actions.push("REOPENED");
      }

      if (ticket.status === "CLOSED") {
        actions.push("REOPENED");
      }

      return actions;
    }

    // Support Engineer
    if (user.role_id === 2) {
      if (
        ticket.status === "ASSIGNED" &&
        ticket.assigned_to === user.user_id
      ) {
        actions.push("IN_PROGRESS");
      }

      if (
        ticket.status === "IN_PROGRESS" &&
        ticket.assigned_to === user.user_id
      ) {
        actions.push("PENDING");
        actions.push("RESOLVED");
      }

      if (
        ticket.status === "PENDING" &&
        ticket.assigned_to === user.user_id
      ) {
        actions.push("IN_PROGRESS");
      }

      if (
        ticket.status === "REOPENED" &&
        ticket.assigned_to === user.user_id
      ) {
        actions.push("IN_PROGRESS");
      }

      return actions;
    }

    // Administrator
    if (user.role_id === 3) {
      switch (ticket.status) {
        case "OPEN":
          actions.push("CANCELLED");
          break;

        case "ASSIGNED":
          actions.push("IN_PROGRESS");
          actions.push("CANCELLED");
          break;

        case "IN_PROGRESS":
          actions.push("PENDING");
          actions.push("RESOLVED");
          actions.push("CANCELLED");
          break;

        case "PENDING":
          actions.push("IN_PROGRESS");
          actions.push("CANCELLED");
          break;

        case "RESOLVED":
          actions.push("CLOSED");
          actions.push("REOPENED");
          break;

        case "CLOSED":
          actions.push("REOPENED");
          break;

        case "REOPENED":
          actions.push("ASSIGNED");
          actions.push("IN_PROGRESS");
          actions.push("CANCELLED");
          break;

        case "CANCELLED":
          actions.push("REOPENED");
          break;

        default:
          break;
      }
    }

    return actions;
  };

  // ----------------------------------------
  // Status Change
  // ----------------------------------------

  const handleStatusChange = async (
    newStatus
  ) => {
    if (!accessToken) {
      setStatusError(
        "Authentication token is missing. Please log in again."
      );
      return;
    }

    setUpdatingStatus(true);
    setStatusError("");

    try {
      const updatedTicket =
        await updateTicketStatus(
          accessToken,
          ticketId,
          newStatus
        );

      setTicket(updatedTicket);

      if (
        newStatus === "RESOLVED" ||
        newStatus === "CLOSED"
      ) {
        setRatingSuccess("");
        setRatingError("");
      }
    } catch (err) {
      setStatusError(
        err?.message ||
          "Failed to update ticket status."
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ----------------------------------------
  // Assignment Complete
  // ----------------------------------------

  const handleAssignmentComplete =
    async () => {
      setShowAssignment(false);

      if (!accessToken) {
        return;
      }

      try {
        const updatedTicket =
          await getTicket(
            accessToken,
            ticketId
          );

        setTicket(updatedTicket);
      } catch (err) {
        setError(
          err?.message ||
            "Failed to refresh ticket."
        );
      }
    };

  // ----------------------------------------
  // Loading
  // ----------------------------------------

  if (loading) {
    return (
      <div className="ticket-details-page">
        <div className="ticket-details-loading">
          Loading ticket details...
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // Error
  // ----------------------------------------

  if (error) {
    return (
      <div className="ticket-details-page">
        <div className="ticket-details-error">
          {error}
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // Ticket Not Found
  // ----------------------------------------

  if (!ticket) {
    return (
      <div className="ticket-details-page">
        <div className="ticket-details-error">
          Ticket not found.
        </div>
      </div>
    );
  }

  const statusActions =
    getStatusActions();

  const responseSLAStatus =
    getSLAStatusText(
      ticket.sla_response_met,
      ticket.sla_response_deadline
    );

  const resolutionSLAStatus =
    getSLAStatusText(
      ticket.sla_resolution_met,
      ticket.sla_resolution_deadline
    );

  return (
    <div className="ticket-details-page">
      <div className="ticket-details-container">

        {/* Back to Dashboard */}

        <div
          style={{
            marginBottom: "20px",
          }}
        >
          <button
            type="button"
            onClick={handleBackToDashboard}
            style={{
              background: "transparent",
              border: "none",
              padding: "0",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              color: "inherit",
            }}
          >
            ← Dashboard
          </button>
        </div>

        {/* Header */}

        <div className="ticket-details-header">
          <div>
            <h1>
              Ticket #{ticket.id}
            </h1>

            <p className="ticket-details-title">
              {ticket.title}
            </p>
          </div>

          <div className="ticket-header-badges">
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
              {ticket.priority || "N/A"}
            </span>
          </div>
        </div>

        {/* Ticket Summary */}

        <div className="ticket-summary-grid">
          <div className="ticket-summary-card">
            <span>
              Category
            </span>

            <strong>
              {getCategoryName(
                ticket.category_id
              )}
            </strong>
          </div>

          <div className="ticket-summary-card">
            <span>
              Created
            </span>

            <strong>
              {formatDate(
                ticket.created_at
              )}
            </strong>
          </div>

          <div className="ticket-summary-card">
            <span>
              Updated
            </span>

            <strong>
              {formatDate(
                ticket.updated_at
              )}
            </strong>
          </div>

          <div className="ticket-summary-card">
            <span>
              Assigned To
            </span>

            <strong>
              {ticket.assigned_to
                ? `User #${ticket.assigned_to}`
                : "Unassigned"}
            </strong>
          </div>
        </div>

        {/* SLA Information */}

        <div className="ticket-section sla-section">
          <div className="ticket-section-header">
            <div>
              <h2>
                SLA Information
              </h2>

              <p>
                Service Level Agreement deadlines
                and compliance status for this ticket.
              </p>
            </div>
          </div>

          <div className="ticket-summary-grid">

            {/* Response Deadline */}

            <div className="ticket-summary-card">
              <span>
                Response Deadline
              </span>

              <strong>
                {formatDate(
                  ticket.sla_response_deadline
                )}
              </strong>

              <small>
                {getSLARemainingText(
                  ticket.sla_response_met,
                  ticket.sla_response_deadline
                )}
              </small>
            </div>

            {/* Resolution Deadline */}

            <div className="ticket-summary-card">
              <span>
                Resolution Deadline
              </span>

              <strong>
                {formatDate(
                  ticket.sla_resolution_deadline
                )}
              </strong>

              <small>
                {getSLARemainingText(
                  ticket.sla_resolution_met,
                  ticket.sla_resolution_deadline
                )}
              </small>
            </div>

            {/* Response SLA */}

            <div className="ticket-summary-card">
              <span>
                Response SLA
              </span>

              <strong
                className={getSLAStatusClass(
                  ticket.sla_response_met,
                  ticket.sla_response_deadline
                )}
              >
                {responseSLAStatus}
              </strong>
            </div>

            {/* Resolution SLA */}

            <div className="ticket-summary-card">
              <span>
                Resolution SLA
              </span>

              <strong
                className={getSLAStatusClass(
                  ticket.sla_resolution_met,
                  ticket.sla_resolution_deadline
                )}
              >
                {resolutionSLAStatus}
              </strong>
            </div>
          </div>
        </div>

        {/* Admin Assignment */}

        {user?.role_id === 3 && (
          <div className="ticket-section">
            <div className="ticket-section-header">
              <div>
                <h2>
                  Assignment
                </h2>

                <p>
                  Assign this ticket to a
                  support engineer.
                </p>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setShowAssignment(
                    (current) => !current
                  )
                }
              >
                {showAssignment
                  ? "Hide Assignment"
                  : "Manage Assignment"}
              </button>
            </div>

            {showAssignment && (
              <AdminAssignment
                ticket={ticket}
                onAssignmentComplete={
                  handleAssignmentComplete
                }
              />
            )}
          </div>
        )}

        {/* Status Actions */}

        {statusActions.length > 0 && (
          <div className="ticket-section">
            <div className="ticket-section-header">
              <div>
                <h2>
                  Status Actions
                </h2>

                <p>
                  Update the current ticket
                  status.
                </p>
              </div>
            </div>

            <div className="status-actions">
              {statusActions.map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    className="secondary-button"
                    disabled={updatingStatus}
                    onClick={() =>
                      handleStatusChange(
                        status
                      )
                    }
                  >
                    {updatingStatus
                      ? "Updating..."
                      : `Mark ${formatStatus(
                          status
                        )}`}
                  </button>
                )
              )}
            </div>

            {statusError && (
              <div className="inline-error">
                {statusError}
              </div>
            )}
          </div>
        )}

        {/* Issue Description */}

        <div className="ticket-section">
          <div className="ticket-section-header">
            <div>
              <h2>
                Issue Description
              </h2>
            </div>
          </div>

          <div className="ticket-description">
            {ticket.description}
          </div>
        </div>

        {/* AI Analysis */}

        {canShowAIAnalysis && (
          <div className="ticket-section ai-analysis-section">
            <div className="ticket-section-header">
              <div>
                <h2>
                  AI Analysis
                </h2>

                <p>
                  AI-generated classification,
                  sentiment, summary, and
                  troubleshooting recommendations.
                </p>
              </div>

              <button
                type="button"
                className="primary-button"
                disabled={analyzingAI}
                onClick={handleAIAnalysis}
              >
                {analyzingAI
                  ? "Analyzing..."
                  : aiAnalysis
                  ? "Analyze Again"
                  : "Analyze Ticket"}
              </button>
            </div>

            {aiError && (
              <div className="inline-error">
                {aiError}
              </div>
            )}

            {aiSuccess && (
              <div className="inline-success">
                {aiSuccess}
              </div>
            )}

            {!aiAnalysis &&
              !analyzingAI &&
              !aiError && (
                <div className="ai-empty-state">
                  <p>
                    Click “Analyze Ticket” to
                    generate an AI-assisted
                    analysis.
                  </p>

                  <p>
                    AI recommendations are
                    advisory and should be
                    reviewed by a human support
                    engineer.
                  </p>
                </div>
              )}

            {analyzingAI && (
              <div className="ai-loading-state">
                <p>
                  Gemini is analyzing the
                  ticket and checking relevant
                  Knowledge Base articles...
                </p>
              </div>
            )}

            {aiAnalysis &&
              !analyzingAI && (
                <div className="ai-analysis-result">

                  <div className="ai-analysis-grid">

                    <div className="ai-analysis-card">
                      <span>
                        Category
                      </span>

                      <strong>
                        {aiAnalysis.category ||
                          "N/A"}
                      </strong>
                    </div>

                    <div className="ai-analysis-card">
                      <span>
                        Subcategory
                      </span>

                      <strong>
                        {aiAnalysis.subcategory ||
                          "N/A"}
                      </strong>
                    </div>

                    <div className="ai-analysis-card">
                      <span>
                        Priority
                      </span>

                      <strong
                        className={getPriorityClass(
                          aiAnalysis.priority
                        )}
                      >
                        {aiAnalysis.priority ||
                          "N/A"}
                      </strong>
                    </div>

                    <div className="ai-analysis-card">
                      <span>
                        Sentiment
                      </span>

                      <strong>
                        {aiAnalysis.sentiment ||
                          "N/A"}
                      </strong>
                    </div>

                    <div className="ai-analysis-card">
                      <span>
                        Confidence
                      </span>

                      <strong>
                        {formatConfidence(
                          aiAnalysis.confidence_score
                        )}
                      </strong>
                    </div>

                    <div className="ai-analysis-card">
                      <span>
                        Model
                      </span>

                      <strong>
                        {aiAnalysis.model_name ||
                          "N/A"}
                      </strong>
                    </div>
                  </div>

                  <div className="ai-text-section">
                    <h3>
                      Summary
                    </h3>

                    <p>
                      {aiAnalysis.summary ||
                        "No summary available."}
                    </p>
                  </div>

                  <div className="ai-text-section">
                    <h3>
                      Recommendation
                    </h3>

                    <p>
                      {aiAnalysis.recommendation ||
                        "No recommendation available."}
                    </p>
                  </div>

                  <div className="ai-text-section">
                    <h3>
                      Knowledge Base Articles Used
                    </h3>

                    {Array.isArray(
                      aiAnalysis.knowledge_base_articles
                    ) &&
                    aiAnalysis
                      .knowledge_base_articles
                      .length > 0 ? (
                      <div className="ai-kb-list">
                        {aiAnalysis
                          .knowledge_base_articles
                          .map(
                            (article) => (
                              <div
                                className="ai-kb-item"
                                key={article.id}
                              >
                                <span className="ai-kb-id">
                                  KB #{article.id}
                                </span>

                                <strong className="ai-kb-title">
                                  {article.title}
                                </strong>
                              </div>
                            )
                          )}
                      </div>
                    ) : (
                      <p>
                        No Knowledge Base articles
                        were used for this analysis.
                      </p>
                    )}
                  </div>

                  <div className="ai-disclaimer">
                    AI-generated information is
                    advisory only. Support engineers
                    should verify the recommendation
                    before taking action.
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Rating */}

        {canRateTicket && (
          <div className="ticket-section">
            <div className="ticket-section-header">
              <div>
                <h2>
                  Rate Support
                </h2>

                <p>
                  Tell us about your support
                  experience.
                </p>
              </div>
            </div>

            {hasExistingRating ? (
              <div className="rating-display">
                <div>
                  <strong>
                    Your Rating
                  </strong>

                  <div className="rating-stars">
                    {"★".repeat(
                      ticket.rating
                    )}

                    {"☆".repeat(
                      5 - ticket.rating
                    )}
                  </div>
                </div>

                {ticket.feedback && (
                  <div className="rating-feedback">
                    <strong>
                      Feedback
                    </strong>

                    <p>
                      {ticket.feedback}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <form
                className="rating-form"
                onSubmit={
                  handleRatingSubmit
                }
              >
                <div className="rating-options">
                  {[1, 2, 3, 4, 5].map(
                    (rating) => (
                      <button
                        key={rating}
                        type="button"
                        className={
                          selectedRating === rating
                            ? "rating-star selected"
                            : "rating-star"
                        }
                        onClick={() =>
                          setSelectedRating(
                            rating
                          )
                        }
                      >
                        ★
                      </button>
                    )
                  )}
                </div>

                <textarea
                  value={feedbackText}
                  onChange={(event) =>
                    setFeedbackText(
                      event.target.value
                    )
                  }
                  placeholder="Optional feedback"
                  rows={4}
                />

                {ratingError && (
                  <div className="inline-error">
                    {ratingError}
                  </div>
                )}

                {ratingSuccess && (
                  <div className="inline-success">
                    {ratingSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  className="primary-button"
                  disabled={submittingRating}
                >
                  {submittingRating
                    ? "Submitting..."
                    : "Submit Rating"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Activity & Comments */}

        <div className="ticket-section">
          <div className="ticket-section-header">
            <div>
              <h2>
                Activity & Comments
              </h2>
            </div>
          </div>

          {commentError && (
            <div className="inline-error">
              {commentError}
            </div>
          )}

          {loadingComments ? (
            <div className="ticket-loading-small">
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div className="ticket-empty-state">
              No comments yet.
            </div>
          ) : (
            <div className="comments-list">
              {comments.map(
                (comment) => (
                  <div
                    className="comment-item"
                    key={comment.id}
                  >
                    <div className="comment-header">
                      <strong>
                        {comment.user_name ||
                          `User #${comment.user_id}`}
                      </strong>

                      {comment.is_internal && (
                        <span className="internal-comment-badge">
                          Internal
                        </span>
                      )}

                      <span>
                        {formatDate(
                          comment.created_at
                        )}
                      </span>
                    </div>

                    <div className="comment-body">
                      {comment.comment}
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          <form
            className="comment-form"
            onSubmit={
              handleCommentSubmit
            }
          >
            <textarea
              value={commentText}
              onChange={(event) =>
                setCommentText(
                  event.target.value
                )
              }
              placeholder="Write a comment..."
              rows={4}
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
                />

                Internal comment
              </label>
            )}

            <button
              type="submit"
              className="primary-button"
              disabled={submittingComment}
            >
              {submittingComment
                ? "Adding..."
                : "Add Comment"}
            </button>
          </form>
        </div>

        {/* Attachments */}

        <div className="ticket-section">
          <div className="ticket-section-header">
            <div>
              <h2>
                Attachments
              </h2>

              <p>
                Upload supporting files related
                to this ticket.
              </p>
            </div>
          </div>

          {attachmentError && (
            <div className="inline-error">
              {attachmentError}
            </div>
          )}

          <div className="attachment-upload">
            <input
              ref={fileInputRef}
              type="file"
              onChange={
                handleFileChange
              }
            />

            {selectedFile && (
              <div className="selected-file">
                Selected:{" "}
                <strong>
                  {selectedFile.name}
                </strong>
              </div>
            )}

            <button
              type="button"
              className="primary-button"
              disabled={
                uploadingFile ||
                !selectedFile
              }
              onClick={handleUpload}
            >
              {uploadingFile
                ? "Uploading..."
                : "Upload File"}
            </button>
          </div>

          {loadingAttachments ? (
            <div className="ticket-loading-small">
              Loading attachments...
            </div>
          ) : attachments.length === 0 ? (
            <div className="ticket-empty-state">
              No attachments.
            </div>
          ) : (
            <div className="attachments-list">
              {attachments.map(
                (attachment) => (
                  <div
                    className="attachment-item"
                    key={attachment.id}
                  >
                    <div>
                      <strong>
                        {attachment.file_name ||
                          attachment.filename ||
                          "Attachment"}
                      </strong>

                      <span>
                        {formatFileSize(
                          attachment.file_size
                        )}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="secondary-button"
                      disabled={
                        downloadingAttachmentId ===
                        attachment.id
                      }
                      onClick={() =>
                        handleDownloadAttachment(
                          attachment
                        )
                      }
                    >
                      {downloadingAttachmentId ===
                      attachment.id
                        ? "Downloading..."
                        : "Download"}
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Ticket Information */}

        <div className="ticket-section">
          <div className="ticket-section-header">
            <div>
              <h2>
                Ticket Information
              </h2>
            </div>
          </div>

          <div className="ticket-information-grid">
            <div>
              <span>
                Ticket ID
              </span>

              <strong>
                #{ticket.id}
              </strong>
            </div>

            <div>
              <span>
                Created By
              </span>

              <strong>
                User #{ticket.created_by}
              </strong>
            </div>

            <div>
              <span>
                Category
              </span>

              <strong>
                {getCategoryName(
                  ticket.category_id
                )}
              </strong>
            </div>

            <div>
              <span>
                Status
              </span>

              <strong>
                {formatStatus(
                  ticket.status
                )}
              </strong>
            </div>

            <div>
              <span>
                Priority
              </span>

              <strong>
                {ticket.priority || "N/A"}
              </strong>
            </div>

            <div>
              <span>
                Created At
              </span>

              <strong>
                {formatDate(
                  ticket.created_at
                )}
              </strong>
            </div>

            <div>
              <span>
                Updated At
              </span>

              <strong>
                {formatDate(
                  ticket.updated_at
                )}
              </strong>
            </div>

            <div>
              <span>
                Assigned Engineer
              </span>

              <strong>
                {ticket.assigned_to
                  ? `User #${ticket.assigned_to}`
                  : "Unassigned"}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TicketDetails;
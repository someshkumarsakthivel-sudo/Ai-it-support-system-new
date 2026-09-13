import { useEffect, useState } from "react";

import "./AdminDashboard.css";

import {
  getTickets,
  getUsers,
  getTeams,
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/api";

import AdminTickets from "./AdminTickets";
import AdminUsers from "./AdminUsers";
import AdminAssignment from "./AdminAssignment";
import TicketDetails from "./TicketDetails";
import KnowledgeBase from "./KnowledgeBase";
import CreateTicket from "./CreateTicket";

function AdminDashboard() {
  const user = JSON.parse(
    localStorage.getItem("user") ||
      sessionStorage.getItem("user") ||
      "{}"
  );

  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);

  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] =
    useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] = useState("dashboard");
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [showCreateTicket, setShowCreateTicket] = useState(false);

  const [managementTeams, setManagementTeams] = useState([]);
  const [managementCategories, setManagementCategories] = useState([]);
  const [teamForm, setTeamForm] = useState({
    name: "",
    description: "",
  });
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    parent_id: "",
  });
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [managementLoading, setManagementLoading] = useState(false);
  const [managementSaving, setManagementSaving] = useState(false);
  const [managementError, setManagementError] = useState("");
  const [managementMessage, setManagementMessage] = useState("");

  async function loadNotifications() {
    try {
      const accessToken =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!accessToken) {
        return;
      }

      // Get all notifications from the backend.
      // We calculate unread count locally so one failed request
      // cannot prevent the notification list from loading.
      const notificationData = await getMyNotifications(accessToken);

      const notificationList = Array.isArray(notificationData)
        ? notificationData
        : [];

      setNotifications(notificationList);

      const unreadCount = notificationList.filter(
        (notification) => notification.is_read === false
      ).length;

      setUnreadNotificationCount(unreadCount);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }

  async function loadAdminData() {
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

      const [ticketData, userData, teamData] =
        await Promise.all([
          getTickets(accessToken),
          getUsers(accessToken),
          getTeams(accessToken),
        ]);

      setTickets(
        Array.isArray(ticketData) ? ticketData : []
      );

      setUsers(
        Array.isArray(userData) ? userData : []
      );

      setTeams(
        Array.isArray(teamData) ? teamData : []
      );

      // Load notifications separately.
      await loadNotifications();
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Failed to load admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user");

    window.location.reload();
  }

  function handleOpenTickets() {
    setSelectedTicketId(null);
    setShowCreateTicket(false);
    setCurrentPage("tickets");
  }

  function handleOpenUsers() {
    setSelectedTicketId(null);
    setShowCreateTicket(false);
    setCurrentPage("users");
  }

  function handleOpenTeams() {
    setSelectedTicketId(null);
    setShowCreateTicket(false);
    setManagementError("");
    setManagementMessage("");
    setCurrentPage("teams");
  }

  function handleOpenCategories() {
    setSelectedTicketId(null);
    setShowCreateTicket(false);
    setManagementError("");
    setManagementMessage("");
    setCurrentPage("categories");
  }

  async function managementApiRequest(endpoint, options = {}) {
    const accessToken =
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token");

    if (!accessToken) {
      throw new Error(
        "Your session has expired. Please log in again."
      );
    }

    const response = await fetch(
      `https://ai-it-support-system.onrender.com${endpoint}`,
      {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          ...(options.headers || {}),
        },
      }
    );

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
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

  async function loadManagementTeams() {
    try {
      setManagementLoading(true);
      setManagementError("");
      const accessToken =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      const data = await getTeams(accessToken);
      setManagementTeams(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setManagementError(
        err?.message || "Failed to load teams."
      );
    } finally {
      setManagementLoading(false);
    }
  }

  async function loadManagementCategories() {
    try {
      setManagementLoading(true);
      setManagementError("");
      const accessToken =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      const data = await getCategories(accessToken);
      setManagementCategories(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(err);
      setManagementError(
        err?.message || "Failed to load categories."
      );
    } finally {
      setManagementLoading(false);
    }
  }

  useEffect(() => {
    if (currentPage === "teams") {
      loadManagementTeams();
    }

    if (currentPage === "categories") {
      loadManagementCategories();
    }
  }, [currentPage]);

  async function handleSaveTeam() {
    if (!teamForm.name.trim()) {
      setManagementError("Team name is required.");
      return;
    }

    try {
      setManagementSaving(true);
      setManagementError("");
      setManagementMessage("");

      const payload = {
        name: teamForm.name.trim(),
        description: teamForm.description.trim() || null,
      };

      if (editingTeamId) {
        await managementApiRequest(
          `/api/teams/${editingTeamId}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );
        setManagementMessage("Team updated successfully.");
      } else {
        await managementApiRequest("/api/teams", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setManagementMessage("Team created successfully.");
      }

      setTeamForm({ name: "", description: "" });
      setEditingTeamId(null);
      await loadManagementTeams();
      await loadAdminData();
    } catch (err) {
      console.error(err);
      setManagementError(
        err?.message || "Unable to save team."
      );
    } finally {
      setManagementSaving(false);
    }
  }

  function startEditTeam(team) {
    setEditingTeamId(team.id);
    setTeamForm({
      name: team.name || "",
      description: team.description || "",
    });
    setManagementError("");
    setManagementMessage("");
  }

  function cancelEditTeam() {
    setEditingTeamId(null);
    setTeamForm({ name: "", description: "" });
    setManagementError("");
    setManagementMessage("");
  }

  async function handleDeleteTeam(teamId) {
    if (!window.confirm("Delete this team?")) {
      return;
    }

    try {
      setManagementSaving(true);
      setManagementError("");
      setManagementMessage("");

      await managementApiRequest(`/api/teams/${teamId}`, {
        method: "DELETE",
      });

      setManagementMessage("Team deleted successfully.");
      await loadManagementTeams();
      await loadAdminData();
    } catch (err) {
      console.error(err);
      setManagementError(
        err?.message || "Unable to delete team."
      );
    } finally {
      setManagementSaving(false);
    }
  }

  async function handleSaveCategory() {
    if (!categoryForm.name.trim()) {
      setManagementError("Category name is required.");
      return;
    }

    try {
      setManagementSaving(true);
      setManagementError("");
      setManagementMessage("");

      const payload = {
        name: categoryForm.name.trim(),
        description:
          categoryForm.description.trim() || null,
        parent_id: categoryForm.parent_id
          ? Number(categoryForm.parent_id)
          : null,
      };

      if (editingCategoryId) {
        await managementApiRequest(
          `/api/categories/${editingCategoryId}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );
        setManagementMessage(
          "Category updated successfully."
        );
      } else {
        await managementApiRequest("/api/categories", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setManagementMessage(
          "Category created successfully."
        );
      }

      setCategoryForm({
        name: "",
        description: "",
        parent_id: "",
      });
      setEditingCategoryId(null);
      await loadManagementCategories();
      await loadAdminData();
    } catch (err) {
      console.error(err);
      setManagementError(
        err?.message || "Unable to save category."
      );
    } finally {
      setManagementSaving(false);
    }
  }

  function startEditCategory(category) {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name || "",
      description: category.description || "",
      parent_id: category.parent_id
        ? String(category.parent_id)
        : "",
    });
    setManagementError("");
    setManagementMessage("");
  }

  function cancelEditCategory() {
    setEditingCategoryId(null);
    setCategoryForm({
      name: "",
      description: "",
      parent_id: "",
    });
    setManagementError("");
    setManagementMessage("");
  }

  async function handleDeleteCategory(categoryId) {
    if (!window.confirm("Delete this category?")) {
      return;
    }

    try {
      setManagementSaving(true);
      setManagementError("");
      setManagementMessage("");

      await managementApiRequest(
        `/api/categories/${categoryId}`,
        {
          method: "DELETE",
        }
      );

      setManagementMessage(
        "Category deleted successfully."
      );
      await loadManagementCategories();
      await loadAdminData();
    } catch (err) {
      console.error(err);
      setManagementError(
        err?.message || "Unable to delete category."
      );
    } finally {
      setManagementSaving(false);
    }
  }

  function handleOpenKnowledgeBase() {
    setSelectedTicketId(null);
    setShowCreateTicket(false);
    setCurrentPage("knowledge-base");
  }

  function handleOpenTicket(ticketId) {
    setShowCreateTicket(false);
    setSelectedTicketId(ticketId);
    setCurrentPage("ticket-details");
  }

  function handleAssignTicket(ticketId) {
    setShowCreateTicket(false);
    setSelectedTicketId(ticketId);
    setCurrentPage("assignment");
  }

  function handleOpenCreateTicket() {
    setSelectedTicketId(null);
    setShowCreateTicket(true);
  }

  function handleCreateTicketCancel() {
    setShowCreateTicket(false);
    setSelectedTicketId(null);
    setCurrentPage("dashboard");

    loadAdminData();
  }

  function handleBackFromTickets() {
    setSelectedTicketId(null);
    setShowCreateTicket(false);
    setCurrentPage("dashboard");

    loadAdminData();
  }

  function handleBackFromUsers() {
    setSelectedTicketId(null);
    setShowCreateTicket(false);
    setCurrentPage("dashboard");

    loadAdminData();
  }

  function handleBackFromKnowledgeBase() {
    setSelectedTicketId(null);
    setShowCreateTicket(false);
    setCurrentPage("dashboard");
  }

  function handleBackFromTicketDetails() {
    setSelectedTicketId(null);
    setShowCreateTicket(false);
    setCurrentPage("tickets");

    loadAdminData();
  }

  function handleBackFromAssignment() {
    setSelectedTicketId(null);
    setShowCreateTicket(false);
    setCurrentPage("tickets");

    loadAdminData();
  }

  function handleAssignmentComplete(updatedTicket) {
    setSelectedTicketId(null);
    setShowCreateTicket(false);
    setCurrentPage("tickets");

    setTickets((currentTickets) =>
      currentTickets.map((ticket) =>
        ticket.id === updatedTicket.id
          ? updatedTicket
          : ticket
      )
    );

    loadAdminData();
  }

  async function handleNotificationClick(notification) {
    try {
      const accessToken =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!accessToken) {
        return;
      }

      if (!notification.is_read) {
        await markNotificationAsRead(
          accessToken,
          notification.id
        );

        setNotifications((currentNotifications) =>
          currentNotifications.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  is_read: true,
                  read_at: new Date().toISOString(),
                }
              : item
          )
        );

        setUnreadNotificationCount((currentCount) =>
          Math.max(currentCount - 1, 0)
        );
      }

      setShowNotifications(false);

      if (notification.ticket_id) {
        handleOpenTicket(notification.ticket_id);
      }
    } catch (err) {
      console.error(
        "Failed to mark notification as read:",
        err
      );
    }
  }

  async function handleMarkAllNotificationsAsRead() {
    try {
      const accessToken =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!accessToken) {
        return;
      }

      if (unreadNotificationCount === 0) {
        return;
      }

      await markAllNotificationsAsRead(accessToken);

      const readTime = new Date().toISOString();

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          is_read: true,
          read_at:
            notification.read_at || readTime,
        }))
      );

      setUnreadNotificationCount(0);
    } catch (err) {
      console.error(
        "Failed to mark all notifications as read:",
        err
      );
    }
  }

  function formatDate(dateString) {
    if (!dateString) {
      return "-";
    }

    return new Date(dateString).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  function formatNotificationTime(dateString) {
    if (!dateString) {
      return "";
    }

    return new Date(dateString).toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  function getNotificationIcon(notificationType) {
    if (notificationType === "NEW_TICKET") {
      return "T";
    }

    if (notificationType === "TICKET_ASSIGNED") {
      return "A";
    }

    if (notificationType === "TICKET_STATUS_CHANGED") {
      return "S";
    }

    return "!";
  }

  const totalTickets = tickets.length;

  const openTickets = tickets.filter(
    (ticket) => ticket.status === "OPEN"
  ).length;

  const inProgressTickets = tickets.filter(
    (ticket) => ticket.status === "IN_PROGRESS"
  ).length;

  const resolvedTickets = tickets.filter(
    (ticket) => ticket.status === "RESOLVED"
  ).length;

  const assignedTickets = tickets.filter(
    (ticket) => ticket.status === "ASSIGNED"
  ).length;

  const pendingTickets = tickets.filter(
    (ticket) => ticket.status === "PENDING"
  ).length;

  const closedTickets = tickets.filter(
    (ticket) => ticket.status === "CLOSED"
  ).length;

  const unassignedTickets = tickets.filter(
    (ticket) =>
      ticket.assigned_to === null ||
      ticket.assigned_to === undefined
  ).length;

  const activeUsers = users.filter(
    (item) => item.is_active
  ).length;

  const activeEngineers = users.filter(
    (item) =>
      item.role_id === 2 &&
      item.is_active === true
  ).length;

  const criticalTickets = tickets.filter(
    (ticket) => ticket.priority === "CRITICAL"
  ).length;

  const highPriorityTickets = tickets.filter(
    (ticket) => ticket.priority === "HIGH"
  ).length;

  const mediumPriorityTickets = tickets.filter(
    (ticket) => ticket.priority === "MEDIUM"
  ).length;

  const lowPriorityTickets = tickets.filter(
    (ticket) => ticket.priority === "LOW"
  ).length;

  const responseSLAMet = tickets.filter(
    (ticket) => ticket.sla_response_met === true
  ).length;

  const responseSLABreached = tickets.filter(
    (ticket) =>
      ticket.sla_response_met === false ||
      (
        ticket.sla_response_met !== true &&
        ticket.sla_response_deadline &&
        new Date(ticket.sla_response_deadline).getTime() < Date.now()
      )
  ).length;

  const resolutionSLAMet = tickets.filter(
    (ticket) => ticket.sla_resolution_met === true
  ).length;

  const resolutionSLABreached = tickets.filter(
    (ticket) =>
      ticket.sla_resolution_met === false ||
      (
        ticket.sla_resolution_met !== true &&
        ticket.sla_resolution_deadline &&
        new Date(ticket.sla_resolution_deadline).getTime() < Date.now()
      )
  ).length;

  const slaMetTotal =
    responseSLAMet + resolutionSLAMet;

  const slaBreachedTotal =
    responseSLABreached + resolutionSLABreached;

  const maxStatusCount = Math.max(
    openTickets,
    assignedTickets,
    inProgressTickets,
    pendingTickets,
    resolvedTickets,
    closedTickets,
    1
  );

  const maxPriorityCount = Math.max(
    criticalTickets,
    highPriorityTickets,
    mediumPriorityTickets,
    lowPriorityTickets,
    1
  );

  const maxSLACount = Math.max(
    slaMetTotal,
    slaBreachedTotal,
    1
  );

  if (
    loading &&
    currentPage === "dashboard" &&
    !showCreateTicket
  ) {
    return (
      <div className="admin-dashboard-page">
        <div className="admin-dashboard-loading">
          <div className="admin-loading-icon">
            IT
          </div>

          <h2>
            Loading dashboard...
          </h2>

          <p>
            Loading tickets, users and teams.
          </p>
        </div>
      </div>
    );
  }

  if (
    error &&
    currentPage === "dashboard" &&
    !showCreateTicket
  ) {
    return (
      <div className="admin-dashboard-page">
        <div className="admin-dashboard-container">
          <div className="admin-dashboard-error">
            <div className="admin-error-icon">
              !
            </div>

            <h2>
              Unable to load dashboard
            </h2>

            <p>{error}</p>

            <button
              type="button"
              className="admin-refresh-button"
              onClick={loadAdminData}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showCreateTicket) {
    return (
      <CreateTicket
        onCancel={handleCreateTicketCancel}
      />
    );
  }

  if (currentPage === "tickets") {
    return (
      <AdminTickets
        onBack={handleBackFromTickets}
        onOpenTicket={handleOpenTicket}
        onAssignTicket={handleAssignTicket}
      />
    );
  }

  if (currentPage === "users") {
    return (
      <AdminUsers
        onBack={handleBackFromUsers}
      />
    );
  }

  if (currentPage === "teams") {
    return (
      <div className="admin-dashboard-page">
        <header className="admin-dashboard-header">
          <div className="admin-brand">
            <div className="admin-logo">IT</div>
            <div>
              <h1>AI IT Support</h1>
              <span>Ticket Management System</span>
            </div>
          </div>

          <div className="admin-header-user">
            <div className="admin-user-info">
              <strong>{user.name || "System Admin"}</strong>
              <span>Administrator</span>
            </div>
            <button
              type="button"
              className="admin-logout-button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        <main className="admin-dashboard-container">
          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <p className="admin-welcome-label">Administration</p>
                <h3>Teams Management</h3>
                <p>Manage support teams.</p>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="admin-panel-action"
                  onClick={loadManagementTeams}
                  disabled={managementLoading}
                >
                  Refresh
                </button>
                <button
                  type="button"
                  className="admin-panel-action"
                  onClick={() => setCurrentPage("dashboard")}
                >
                  ← Dashboard
                </button>
              </div>
            </div>

            {managementError && (
              <div className="admin-dashboard-error" style={{ marginBottom: "16px" }}>
                {managementError}
              </div>
            )}

            {managementMessage && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: "#ecfdf5",
                  color: "#065f46",
                  border: "1px solid #a7f3d0",
                }}
              >
                {managementMessage}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(280px, 360px) 1fr",
                gap: "24px",
              }}
            >
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  padding: "18px",
                  background: "#ffffff",
                }}
              >
                <h4>{editingTeamId ? "Edit Team" : "Create Team"}</h4>

                <label style={{ display: "block", marginTop: "14px", fontSize: "13px" }}>
                  Team name
                </label>
                <input
                  type="text"
                  value={teamForm.name}
                  onChange={(event) =>
                    setTeamForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="IT Support"
                  style={{
                    width: "100%",
                    marginTop: "6px",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                  }}
                />

                <label style={{ display: "block", marginTop: "14px", fontSize: "13px" }}>
                  Description
                </label>
                <textarea
                  value={teamForm.description}
                  onChange={(event) =>
                    setTeamForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="General IT support team"
                  style={{
                    width: "100%",
                    marginTop: "6px",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    resize: "vertical",
                  }}
                />

                <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                  <button
                    type="button"
                    className="admin-refresh-button"
                    onClick={handleSaveTeam}
                    disabled={managementSaving}
                  >
                    {managementSaving
                      ? "Saving..."
                      : editingTeamId
                        ? "Update Team"
                        : "Create Team"}
                  </button>

                  {editingTeamId && (
                    <button
                      type="button"
                      className="admin-panel-action"
                      onClick={cancelEditTeam}
                      disabled={managementSaving}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h4 style={{ marginBottom: "14px" }}>
                  Teams ({managementTeams.length})
                </h4>

                {managementLoading ? (
                  <p>Loading teams...</p>
                ) : managementTeams.length === 0 ? (
                  <div className="admin-empty-state">
                    <div className="admin-empty-icon">T</div>
                    <h4>No teams found</h4>
                    <p>Create your first support team.</p>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: "12px",
                    }}
                  >
                    {managementTeams.map((team) => (
                      <div
                        key={team.id}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: "12px",
                          padding: "16px",
                          background: "#ffffff",
                        }}
                      >
                        <strong>{team.name}</strong>
                        <p style={{ margin: "6px 0 12px", color: "#6b7280" }}>
                          {team.description || "No description"}
                        </p>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            className="admin-panel-action"
                            onClick={() => startEditTeam(team)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-refresh-button"
                            onClick={() => handleDeleteTeam(team.id)}
                            disabled={managementSaving}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (currentPage === "categories") {
    return (
      <div className="admin-dashboard-page">
        <header className="admin-dashboard-header">
          <div className="admin-brand">
            <div className="admin-logo">IT</div>
            <div>
              <h1>AI IT Support</h1>
              <span>Ticket Management System</span>
            </div>
          </div>

          <div className="admin-header-user">
            <div className="admin-user-info">
              <strong>{user.name || "System Admin"}</strong>
              <span>Administrator</span>
            </div>
            <button
              type="button"
              className="admin-logout-button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        <main className="admin-dashboard-container">
          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <p className="admin-welcome-label">Administration</p>
                <h3>Categories Management</h3>
                <p>Manage ticket categories.</p>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="admin-panel-action"
                  onClick={loadManagementCategories}
                  disabled={managementLoading}
                >
                  Refresh
                </button>
                <button
                  type="button"
                  className="admin-panel-action"
                  onClick={() => setCurrentPage("dashboard")}
                >
                  ← Dashboard
                </button>
              </div>
            </div>

            {managementError && (
              <div className="admin-dashboard-error" style={{ marginBottom: "16px" }}>
                {managementError}
              </div>
            )}

            {managementMessage && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: "#ecfdf5",
                  color: "#065f46",
                  border: "1px solid #a7f3d0",
                }}
              >
                {managementMessage}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(280px, 360px) 1fr",
                gap: "24px",
              }}
            >
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  padding: "18px",
                  background: "#ffffff",
                }}
              >
                <h4>
                  {editingCategoryId
                    ? "Edit Category"
                    : "Create Category"}
                </h4>

                <label style={{ display: "block", marginTop: "14px", fontSize: "13px" }}>
                  Category name
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Network"
                  style={{
                    width: "100%",
                    marginTop: "6px",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                  }}
                />

                <label style={{ display: "block", marginTop: "14px", fontSize: "13px" }}>
                  Description
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Network and connectivity issues"
                  style={{
                    width: "100%",
                    marginTop: "6px",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    resize: "vertical",
                  }}
                />

                <label style={{ display: "block", marginTop: "14px", fontSize: "13px" }}>
                  Parent category (optional)
                </label>
                <select
                  value={categoryForm.parent_id}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      parent_id: event.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    marginTop: "6px",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    background: "#ffffff",
                  }}
                >
                  <option value="">No parent</option>
                  {managementCategories
                    .filter((category) => category.id !== editingCategoryId)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>

                <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                  <button
                    type="button"
                    className="admin-refresh-button"
                    onClick={handleSaveCategory}
                    disabled={managementSaving}
                  >
                    {managementSaving
                      ? "Saving..."
                      : editingCategoryId
                        ? "Update Category"
                        : "Create Category"}
                  </button>

                  {editingCategoryId && (
                    <button
                      type="button"
                      className="admin-panel-action"
                      onClick={cancelEditCategory}
                      disabled={managementSaving}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h4 style={{ marginBottom: "14px" }}>
                  Categories ({managementCategories.length})
                </h4>

                {managementLoading ? (
                  <p>Loading categories...</p>
                ) : managementCategories.length === 0 ? (
                  <div className="admin-empty-state">
                    <div className="admin-empty-icon">C</div>
                    <h4>No categories found</h4>
                    <p>Create your first ticket category.</p>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: "12px",
                    }}
                  >
                    {managementCategories.map((category) => (
                      <div
                        key={category.id}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: "12px",
                          padding: "16px",
                          background: "#ffffff",
                        }}
                      >
                        <strong>{category.name}</strong>
                        <p style={{ margin: "6px 0 12px", color: "#6b7280" }}>
                          {category.description || "No description"}
                        </p>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            className="admin-panel-action"
                            onClick={() =>
                              startEditCategory(category)
                            }
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-refresh-button"
                            onClick={() =>
                              handleDeleteCategory(category.id)
                            }
                            disabled={managementSaving}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (currentPage === "knowledge-base") {
    return (
      <KnowledgeBase
        onBack={handleBackFromKnowledgeBase}
      />
    );
  }

  if (
    currentPage === "assignment" &&
    selectedTicketId
  ) {
    return (
      <AdminAssignment
        ticketId={selectedTicketId}
        onBack={handleBackFromAssignment}
        onAssigned={handleAssignmentComplete}
      />
    );
  }

  if (
    currentPage === "ticket-details" &&
    selectedTicketId
  ) {
    return (
      <TicketDetails
        ticketId={selectedTicketId}
        onBack={handleBackFromTicketDetails}
      />
    );
  }

  return (
    <div className="admin-dashboard-page">
      <header className="admin-dashboard-header">
        <div className="admin-brand">
          <div className="admin-logo">
            IT
          </div>

          <div>
            <h1>
              AI IT Support
            </h1>

            <span>
              Ticket Management System
            </span>
          </div>
        </div>

        <nav className="admin-navigation">
          <button
            type="button"
            className="admin-nav-item active"
            onClick={() =>
              setCurrentPage("dashboard")
            }
          >
            Dashboard
          </button>

          <button
            type="button"
            className="admin-nav-item"
            onClick={handleOpenTickets}
          >
            Tickets
          </button>

          <button
            type="button"
            className="admin-nav-item"
            onClick={handleOpenUsers}
          >
            Users
          </button>

          <button
            type="button"
            className="admin-nav-item"
            onClick={handleOpenTeams}
          >
            Teams
          </button>

          <button
            type="button"
            className="admin-nav-item"
            onClick={handleOpenCategories}
          >
            Categories
          </button>
        </nav>

        <div className="admin-header-user">

          {/* Notification Bell */}
          <div
            className="admin-notification-wrapper"
            style={{
              position: "relative",
            }}
          >
            <button
              type="button"
              className="admin-notification-button"
              onClick={() =>
                setShowNotifications(
                  (current) => !current
                )
              }
              aria-label="Notifications"
              style={{
                position: "relative",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: "24px",
                padding: "8px",
                lineHeight: "1",
              }}
            >
              <span aria-hidden="true">{"\u{1F514}"}</span>

              {unreadNotificationCount > 0 && (
                <span
                  className="admin-notification-badge"
                  style={{
                    position: "absolute",
                    top: "0",
                    right: "0",
                    minWidth: "18px",
                    height: "18px",
                    padding: "0 4px",
                    borderRadius: "999px",
                    background: "#dc2626",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {unreadNotificationCount > 99
                    ? "99+"
                    : unreadNotificationCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div
                className="admin-notification-dropdown"
                style={{
                  position: "absolute",
                  top: "48px",
                  right: "0",
                  width: "380px",
                  maxWidth:
                    "calc(100vw - 32px)",
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  boxShadow:
                    "0 12px 30px rgba(0, 0, 0, 0.15)",
                  zIndex: "1000",
                  overflow: "hidden",
                }}
              >
                <div
                  className="admin-notification-header"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 16px",
                    borderBottom:
                      "1px solid #e5e7eb",
                  }}
                >
                  <div>
                    <strong>
                      Notifications
                    </strong>

                    <span
                      style={{
                        display: "block",
                        marginTop: "3px",
                        fontSize: "12px",
                        color: "#6b7280",
                      }}
                    >
                      {unreadNotificationCount}{" "}
                      unread
                    </span>
                  </div>

                  {unreadNotificationCount > 0 && (
                    <button
                      type="button"
                      onClick={
                        handleMarkAllNotificationsAsRead
                      }
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#2563eb",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div
                  className="admin-notification-list"
                  style={{
                    maxHeight: "420px",
                    overflowY: "auto",
                  }}
                >
                  {notifications.length === 0 ? (
                    <div
                      style={{
                        padding: "32px 20px",
                        textAlign: "center",
                        color: "#6b7280",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "28px",
                          marginBottom: "8px",
                        }}
                      >
                        Γ£ô
                      </div>

                      <strong
                        style={{
                          display: "block",
                          color: "#374151",
                          marginBottom: "4px",
                        }}
                      >
                        No notifications
                      </strong>

                      <span
                        style={{
                          fontSize: "13px",
                        }}
                      >
                        You're all caught up.
                      </span>
                    </div>
                  ) : (
                    notifications.map(
                      (notification) => (
                        <button
                          type="button"
                          key={notification.id}
                          onClick={() =>
                            handleNotificationClick(
                              notification
                            )
                          }
                          style={{
                            width: "100%",
                            border: "none",
                            borderBottom:
                              "1px solid #f1f5f9",
                            background:
                              notification.is_read
                                ? "#ffffff"
                                : "#eff6ff",
                            cursor: "pointer",
                            textAlign: "left",
                            padding: "14px 16px",
                            display: "flex",
                            gap: "12px",
                          }}
                        >
                          <span
                            style={{
                              flexShrink: "0",
                              width: "34px",
                              height: "34px",
                              borderRadius: "10px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background:
                                notification.is_read
                                  ? "#f1f5f9"
                                  : "#dbeafe",
                              color: "#1d4ed8",
                              fontWeight: "700",
                              fontSize: "13px",
                            }}
                          >
                            {getNotificationIcon(
                              notification.type
                            )}
                          </span>

                          <span
                            style={{
                              minWidth: "0",
                              flex: "1",
                            }}
                          >
                            <strong
                              style={{
                                display: "block",
                                color: "#111827",
                                fontSize: "13px",
                                marginBottom: "4px",
                              }}
                            >
                              {notification.title}
                            </strong>

                            <span
                              style={{
                                display: "block",
                                color: "#4b5563",
                                fontSize: "12px",
                                lineHeight: "1.5",
                              }}
                            >
                              {notification.message}
                            </span>

                            <span
                              style={{
                                display: "block",
                                marginTop: "6px",
                                color: "#9ca3af",
                                fontSize: "11px",
                              }}
                            >
                              {formatNotificationTime(
                                notification.created_at
                              )}
                            </span>
                          </span>

                          {!notification.is_read && (
                            <span
                              style={{
                                flexShrink: "0",
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                background: "#2563eb",
                                marginTop: "5px",
                              }}
                            />
                          )}
                        </button>
                      )
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="admin-user-info">
            <strong>
              {user.name || "System Admin"}
            </strong>

            <span>
              Administrator
            </span>
          </div>

          <button
            type="button"
            className="admin-logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="admin-dashboard-container">
        <section className="admin-welcome">
          <div>
            <p className="admin-welcome-label">
              Administration
            </p>

            <h2>
              Welcome back,{" "}
              {user.name || "System Admin"}
            </h2>

            <p>
              Monitor tickets, users and support
              operations from one place.
            </p>
          </div>

          <button
            type="button"
            className="admin-create-ticket-button"
            onClick={handleOpenCreateTicket}
          >
            + Create Ticket
          </button>
        </section>

        <section className="admin-stat-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              T
            </div>

            <div>
              <span>Total Tickets</span>
              <strong>{totalTickets}</strong>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              O
            </div>

            <div>
              <span>Open</span>
              <strong>{openTickets}</strong>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              I
            </div>

            <div>
              <span>In Progress</span>
              <strong>{inProgressTickets}</strong>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              R
            </div>

            <div>
              <span>Resolved</span>
              <strong>{resolvedTickets}</strong>
            </div>
          </div>
        </section>

        <section className="admin-secondary-stats">
          <div className="admin-mini-stat">
            <span>Assigned</span>
            <strong>{assignedTickets}</strong>
          </div>

          <div className="admin-mini-stat">
            <span>Pending</span>
            <strong>{pendingTickets}</strong>
          </div>

          <div className="admin-mini-stat">
            <span>Closed</span>
            <strong>{closedTickets}</strong>
          </div>

          <div className="admin-mini-stat">
            <span>Unassigned</span>
            <strong>{unassignedTickets}</strong>
          </div>

          <div className="admin-mini-stat">
            <span>Active Users</span>
            <strong>{activeUsers}</strong>
          </div>

          <div className="admin-mini-stat">
            <span>Engineers</span>
            <strong>{activeEngineers}</strong>
          </div>
        </section>

        <section className="admin-main-grid">
          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h3>Recent Tickets</h3>

                <p>
                  Latest tickets across the system
                </p>
              </div>

              <button
                type="button"
                className="admin-panel-action"
                onClick={loadAdminData}
              >
                Refresh
              </button>
            </div>

            {tickets.length === 0 ? (
              <div className="admin-empty-state">
                <div className="admin-empty-icon">
                  T
                </div>

                <h4>No tickets found</h4>

                <p>
                  Tickets will appear here when
                  employees create them.
                </p>
              </div>
            ) : (
              <div className="admin-ticket-list">
                {tickets
                  .slice(0, 8)
                  .map((ticket) => (
                    <button
                      type="button"
                      className="admin-ticket-row"
                      key={ticket.id}
                      onClick={() =>
                        handleOpenTicket(ticket.id)
                      }
                    >
                      <div className="admin-ticket-main">
                        <strong>
                          {ticket.ticket_number}
                        </strong>

                        <span>
                          {ticket.title}
                        </span>
                      </div>

                      <div className="admin-ticket-meta">
                        <span
                          className={`admin-ticket-status status-${ticket.status.toLowerCase()}`}
                        >
                          {ticket.status}
                        </span>

                        <span className="admin-ticket-date">
                          {formatDate(
                            ticket.created_at
                          )}
                        </span>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h3>System Overview</h3>

                <p>
                  Current support resources
                </p>
              </div>
            </div>

            <div className="admin-overview-list">
              <div className="admin-overview-item">
                <div className="admin-overview-icon">
                  U
                </div>

                <div>
                  <strong>Users</strong>

                  <span>
                    {activeUsers} active users
                  </span>
                </div>
              </div>

              <div className="admin-overview-item">
                <div className="admin-overview-icon">
                  E
                </div>

                <div>
                  <strong>
                    Support Engineers
                  </strong>

                  <span>
                    {activeEngineers} active
                    engineers
                  </span>
                </div>
              </div>

              <div className="admin-overview-item">
                <div className="admin-overview-icon">
                  T
                </div>

                <div>
                  <strong>Support Teams</strong>

                  <span>
                    {teams.length} teams
                  </span>
                </div>
              </div>

              <div className="admin-overview-item">
                <div className="admin-overview-icon">
                  !
                </div>

                <div>
                  <strong>
                    Unassigned Tickets
                  </strong>

                  <span>
                    {unassignedTickets} need
                    assignment
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Analytics */}

        <section
          className="admin-panel"
          style={{
            marginTop: "24px",
          }}
        >
          <div className="admin-panel-header">
            <div>
              <h3>Support Analytics</h3>

              <p>
                Ticket distribution and SLA performance across
                the support system.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {/* Ticket Status */}

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "18px",
                background: "#ffffff",
              }}
            >
              <h4
                style={{
                  margin: "0 0 16px",
                  fontSize: "15px",
                  color: "#111827",
                }}
              >
                Ticket Status
              </h4>

              {[
                ["Open", openTickets],
                ["Assigned", assignedTickets],
                ["In Progress", inProgressTickets],
                ["Pending", pendingTickets],
                ["Resolved", resolvedTickets],
                ["Closed", closedTickets],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      marginBottom: "5px",
                      color: "#4b5563",
                    }}
                  >
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>

                  <div
                    style={{
                      height: "8px",
                      background: "#f1f5f9",
                      borderRadius: "999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(
                          (value / maxStatusCount) * 100,
                          100
                        )}%`,
                        height: "100%",
                        background:
                          "linear-gradient(90deg, #2563eb, #60a5fa)",
                        borderRadius: "999px",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Priority */}

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "18px",
                background: "#ffffff",
              }}
            >
              <h4
                style={{
                  margin: "0 0 16px",
                  fontSize: "15px",
                  color: "#111827",
                }}
              >
                Ticket Priority
              </h4>

              {[
                ["Critical", criticalTickets],
                ["High", highPriorityTickets],
                ["Medium", mediumPriorityTickets],
                ["Low", lowPriorityTickets],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      marginBottom: "5px",
                      color: "#4b5563",
                    }}
                  >
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>

                  <div
                    style={{
                      height: "8px",
                      background: "#f1f5f9",
                      borderRadius: "999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(
                          (value / maxPriorityCount) * 100,
                          100
                        )}%`,
                        height: "100%",
                        background:
                          "linear-gradient(90deg, #7c3aed, #a78bfa)",
                        borderRadius: "999px",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* SLA */}

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "18px",
                background: "#ffffff",
              }}
            >
              <h4
                style={{
                  margin: "0 0 16px",
                  fontSize: "15px",
                  color: "#111827",
                }}
              >
                SLA Performance
              </h4>

              {[
                ["SLA Met", slaMetTotal],
                ["SLA Breached", slaBreachedTotal],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      marginBottom: "5px",
                      color: "#4b5563",
                    }}
                  >
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>

                  <div
                    style={{
                      height: "8px",
                      background: "#f1f5f9",
                      borderRadius: "999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(
                          (value / maxSLACount) * 100,
                          100
                        )}%`,
                        height: "100%",
                        background:
                          label === "SLA Met"
                            ? "linear-gradient(90deg, #059669, #34d399)"
                            : "linear-gradient(90deg, #dc2626, #f87171)",
                        borderRadius: "999px",
                      }}
                    />
                  </div>
                </div>
              ))}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: "10px",
                  marginTop: "16px",
                }}
              >
                <div
                  style={{
                    background: "#ecfdf5",
                    borderRadius: "10px",
                    padding: "12px",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: "11px",
                      color: "#047857",
                    }}
                  >
                    Response SLA Met
                  </span>

                  <strong
                    style={{
                      fontSize: "20px",
                      color: "#065f46",
                    }}
                  >
                    {responseSLAMet}
                  </strong>
                </div>

                <div
                  style={{
                    background: "#fef2f2",
                    borderRadius: "10px",
                    padding: "12px",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: "11px",
                      color: "#b91c1c",
                    }}
                  >
                    Resolution SLA Breached
                  </span>

                  <strong
                    style={{
                      fontSize: "20px",
                      color: "#991b1b",
                    }}
                  >
                    {resolutionSLABreached}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="admin-panel admin-quick-actions-panel">
          <div className="admin-panel-header">
            <div>
              <h3>Administration</h3>

              <p>
                Common management actions
              </p>
            </div>
          </div>

          <div className="admin-quick-actions">
            <button
              type="button"
              className="admin-quick-action"
              onClick={handleOpenUsers}
            >
              <span className="admin-quick-icon">
                U
              </span>

              <div>
                <strong>Manage Users</strong>

                <span>
                  Add, update or deactivate users
                </span>
              </div>
            </button>

            <button
              type="button"
              className="admin-quick-action"
              onClick={handleOpenTeams}
            >
              <span className="admin-quick-icon">
                T
              </span>

              <div>
                <strong>Manage Teams</strong>

                <span>
                  Configure support teams
                </span>
              </div>
            </button>

            <button
              type="button"
              className="admin-quick-action"
              onClick={handleOpenCategories}
            >
              <span className="admin-quick-icon">
                C
              </span>

              <div>
                <strong>Manage Categories</strong>

                <span>
                  Configure ticket categories
                </span>
              </div>
            </button>

            <button
              type="button"
              className="admin-quick-action"
              onClick={handleOpenKnowledgeBase}
            >
              <span className="admin-quick-icon">
                K
              </span>

              <div>
                <strong>Knowledge Base</strong>

                <span>
                  Manage troubleshooting articles
                </span>
              </div>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;

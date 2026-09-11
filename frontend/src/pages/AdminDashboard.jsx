import { useEffect, useState } from "react";

import "./AdminDashboard.css";

import {
  getTickets,
  getUsers,
  getTeams,
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] =
    useState("dashboard");

  const [selectedTicketId, setSelectedTicketId] =
    useState(null);

  const [showCreateTicket, setShowCreateTicket] =
    useState(false);

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

      const [
        ticketData,
        userData,
        teamData,
      ] = await Promise.all([
        getTickets(accessToken),
        getUsers(accessToken),
        getTeams(accessToken),
      ]);

      setTickets(
        Array.isArray(ticketData)
          ? ticketData
          : []
      );

      setUsers(
        Array.isArray(userData)
          ? userData
          : []
      );

      setTeams(
        Array.isArray(teamData)
          ? teamData
          : []
      );
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

  function handleAssignmentComplete(
    updatedTicket
  ) {
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

  const totalTickets = tickets.length;

  const openTickets = tickets.filter(
    (ticket) =>
      ticket.status === "OPEN"
  ).length;

  const inProgressTickets =
    tickets.filter(
      (ticket) =>
        ticket.status === "IN_PROGRESS"
    ).length;

  const resolvedTickets =
    tickets.filter(
      (ticket) =>
        ticket.status === "RESOLVED"
    ).length;

  const assignedTickets =
    tickets.filter(
      (ticket) =>
        ticket.status === "ASSIGNED"
    ).length;

  const pendingTickets =
    tickets.filter(
      (ticket) =>
        ticket.status === "PENDING"
    ).length;

  const closedTickets =
    tickets.filter(
      (ticket) =>
        ticket.status === "CLOSED"
    ).length;

  const unassignedTickets =
    tickets.filter(
      (ticket) =>
        ticket.assigned_to === null ||
        ticket.assigned_to === undefined
    ).length;

  const activeUsers =
    users.filter(
      (item) => item.is_active
    ).length;

  const activeEngineers =
    users.filter(
      (item) =>
        item.role_id === 2 &&
        item.is_active === true
    ).length;

  function formatDate(dateString) {
    if (!dateString) {
      return "-";
    }

    return new Date(
      dateString
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

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
        onCancel={
          handleCreateTicketCancel
        }
      />
    );
  }

  if (currentPage === "tickets") {
    return (
      <AdminTickets
        onBack={handleBackFromTickets}
        onOpenTicket={
          handleOpenTicket
        }
        onAssignTicket={
          handleAssignTicket
        }
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

  if (
    currentPage === "knowledge-base"
  ) {
    return (
      <KnowledgeBase
        onBack={
          handleBackFromKnowledgeBase
        }
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
        onBack={
          handleBackFromAssignment
        }
        onAssigned={
          handleAssignmentComplete
        }
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
        onBack={
          handleBackFromTicketDetails
        }
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
              setCurrentPage(
                "dashboard"
              )
            }
          >
            Dashboard
          </button>

          <button
            type="button"
            className="admin-nav-item"
            onClick={
              handleOpenTickets
            }
          >
            Tickets
          </button>

          <button
            type="button"
            className="admin-nav-item"
            onClick={
              handleOpenUsers
            }
          >
            Users
          </button>

          <button
            type="button"
            className="admin-nav-item"
          >
            Teams
          </button>

          <button
            type="button"
            className="admin-nav-item"
          >
            Categories
          </button>
        </nav>

        <div className="admin-header-user">
          <div className="admin-user-info">
            <strong>
              {user.name ||
                "System Admin"}
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
              {user.name ||
                "System Admin"}
            </h2>

            <p>
              Monitor tickets, users and
              support operations from one
              place.
            </p>
          </div>

          <button
            type="button"
            className="admin-create-ticket-button"
            onClick={
              handleOpenCreateTicket
            }
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
              <span>
                Total Tickets
              </span>

              <strong>
                {totalTickets}
              </strong>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              O
            </div>

            <div>
              <span>
                Open
              </span>

              <strong>
                {openTickets}
              </strong>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              I
            </div>

            <div>
              <span>
                In Progress
              </span>

              <strong>
                {inProgressTickets}
              </strong>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              R
            </div>

            <div>
              <span>
                Resolved
              </span>

              <strong>
                {resolvedTickets}
              </strong>
            </div>
          </div>
        </section>

        <section className="admin-secondary-stats">
          <div className="admin-mini-stat">
            <span>
              Assigned
            </span>

            <strong>
              {assignedTickets}
            </strong>
          </div>

          <div className="admin-mini-stat">
            <span>
              Pending
            </span>

            <strong>
              {pendingTickets}
            </strong>
          </div>

          <div className="admin-mini-stat">
            <span>
              Closed
            </span>

            <strong>
              {closedTickets}
            </strong>
          </div>

          <div className="admin-mini-stat">
            <span>
              Unassigned
            </span>

            <strong>
              {unassignedTickets}
            </strong>
          </div>

          <div className="admin-mini-stat">
            <span>
              Active Users
            </span>

            <strong>
              {activeUsers}
            </strong>
          </div>

          <div className="admin-mini-stat">
            <span>
              Engineers
            </span>

            <strong>
              {activeEngineers}
            </strong>
          </div>
        </section>

        <section className="admin-main-grid">
          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h3>
                  Recent Tickets
                </h3>

                <p>
                  Latest tickets across the
                  system
                </p>
              </div>

              <button
                type="button"
                className="admin-panel-action"
                onClick={
                  loadAdminData
                }
              >
                Refresh
              </button>
            </div>

            {tickets.length === 0 ? (
              <div className="admin-empty-state">
                <div className="admin-empty-icon">
                  T
                </div>

                <h4>
                  No tickets found
                </h4>

                <p>
                  Tickets will appear here
                  when employees create them.
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
                        handleOpenTicket(
                          ticket.id
                        )
                      }
                    >
                      <div className="admin-ticket-main">
                        <strong>
                          {
                            ticket.ticket_number
                          }
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
                <h3>
                  System Overview
                </h3>

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
                  <strong>
                    Users
                  </strong>

                  <span>
                    {activeUsers} active
                    users
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
                  <strong>
                    Support Teams
                  </strong>

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

        <section className="admin-panel admin-quick-actions-panel">
          <div className="admin-panel-header">
            <div>
              <h3>
                Administration
              </h3>

              <p>
                Common management actions
              </p>
            </div>
          </div>

          <div className="admin-quick-actions">
            <button
              type="button"
              className="admin-quick-action"
              onClick={
                handleOpenUsers
              }
            >
              <span className="admin-quick-icon">
                U
              </span>

              <div>
                <strong>
                  Manage Users
                </strong>

                <span>
                  Add, update or deactivate
                  users
                </span>
              </div>
            </button>

            <button
              type="button"
              className="admin-quick-action"
            >
              <span className="admin-quick-icon">
                T
              </span>

              <div>
                <strong>
                  Manage Teams
                </strong>

                <span>
                  Configure support teams
                </span>
              </div>
            </button>

            <button
              type="button"
              className="admin-quick-action"
            >
              <span className="admin-quick-icon">
                C
              </span>

              <div>
                <strong>
                  Manage Categories
                </strong>

                <span>
                  Configure ticket categories
                </span>
              </div>
            </button>

            <button
              type="button"
              className="admin-quick-action"
              onClick={
                handleOpenKnowledgeBase
              }
            >
              <span className="admin-quick-icon">
                K
              </span>

              <div>
                <strong>
                  Knowledge Base
                </strong>

                <span>
                  Manage troubleshooting
                  articles
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
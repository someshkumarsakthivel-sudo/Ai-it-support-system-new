import { useEffect, useState } from "react";
import "./Dashboard.css";
import { getTickets } from "../services/api";
import CreateTicket from "./CreateTicket";
import TicketDetails from "./TicketDetails";
import KnowledgeBase from "./KnowledgeBase";

function Dashboard() {
  const user = JSON.parse(
    localStorage.getItem("user") ||
      sessionStorage.getItem("user") ||
      "{}"
  );

  const roleNames = {
    1: "Employee",
    2: "Support Engineer",
    3: "Administrator",
  };

  const roleName =
    roleNames[user.role_id] || "User";

  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] =
    useState(true);
  const [ticketError, setTicketError] =
    useState("");
  const [showCreateTicket, setShowCreateTicket] =
    useState(false);
  const [selectedTicketId, setSelectedTicketId] =
    useState(null);
  const [showKnowledgeBase, setShowKnowledgeBase] =
    useState(false);

  async function loadTickets() {
    try {
      setTicketError("");
      setLoadingTickets(true);

      const accessToken =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!accessToken) {
        setTicketError(
          "You are not logged in."
        );
        return;
      }

      const data = await getTickets(accessToken);

      setTickets(data);
    } catch (error) {
      setTicketError(
        error.message ||
          "Failed to load tickets."
      );
    } finally {
      setLoadingTickets(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  const totalTickets = tickets.length;

  const openTickets = tickets.filter(
    (ticket) =>
      ticket.status === "OPEN" ||
      ticket.status === "REOPENED"
  ).length;

  const inProgressTickets = tickets.filter(
    (ticket) =>
      ticket.status === "IN_PROGRESS"
  ).length;

  const resolvedTickets = tickets.filter(
    (ticket) =>
      ticket.status === "RESOLVED" ||
      ticket.status === "CLOSED"
  ).length;

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user");

    window.location.reload();
  }

  function handleCreateTicketCancel() {
    setShowCreateTicket(false);
    loadTickets();
  }

  function handleTicketClick(ticketId) {
    setSelectedTicketId(ticketId);
  }

  function handleBackToDashboard() {
    setSelectedTicketId(null);
    setShowKnowledgeBase(false);
    loadTickets();
  }

  function handleOpenKnowledgeBase() {
    setShowKnowledgeBase(true);
  }

  function handleBackFromKnowledgeBase() {
    setShowKnowledgeBase(false);
  }

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

  function formatStatus(status) {
    if (!status) {
      return "-";
    }

    return status.replaceAll("_", " ");
  }

  if (selectedTicketId) {
    return (
      <TicketDetails
        ticketId={selectedTicketId}
        onBack={handleBackToDashboard}
      />
    );
  }

  if (showCreateTicket) {
    return (
      <CreateTicket
        onCancel={handleCreateTicketCancel}
      />
    );
  }

  if (showKnowledgeBase) {
    return (
      <KnowledgeBase
        onBack={
          handleBackFromKnowledgeBase
        }
      />
    );
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <div className="dashboard-logo">
            IT
          </div>

          <div>
            <h1>AI IT Support</h1>

            <span>
              Ticket Management System
            </span>
          </div>
        </div>

        <div className="dashboard-user">
          <div className="user-info">
            <strong>
              {user.name || "User"}
            </strong>

            <span>{roleName}</span>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <section className="welcome-section">
          <div>
            <p className="welcome-label">
              Welcome back
            </p>

            <h2>
              {user.name || "User"}
            </h2>

            <p>
              Here's an overview of your IT
              support activity.
            </p>
          </div>

          <button
            className="create-ticket-button"
            onClick={() =>
              setShowCreateTicket(true)
            }
          >
            + Create Ticket
          </button>
        </section>

        <section className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon">
              T
            </div>

            <div>
              <span>Total Tickets</span>

              <strong>
                {totalTickets}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              O
            </div>

            <div>
              <span>Open Tickets</span>

              <strong>
                {openTickets}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              P
            </div>

            <div>
              <span>In Progress</span>

              <strong>
                {inProgressTickets}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              R
            </div>

            <div>
              <span>Resolved</span>

              <strong>
                {resolvedTickets}
              </strong>
            </div>
          </div>
        </section>

        <section className="dashboard-grid">
          {/* ================================
              Recent Tickets
          ================================= */}

          <div className="dashboard-card recent-tickets-card">
            <div className="card-header">
              <div>
                <h3>Recent Tickets</h3>

                <p>
                  Your latest support requests
                </p>
              </div>

              <button
                className="view-all-button"
                onClick={loadTickets}
                type="button"
                disabled={loadingTickets}
              >
                {loadingTickets
                  ? "Refreshing..."
                  : "Refresh"}
              </button>
            </div>

            {loadingTickets && (
              <div className="recent-tickets-state">
                <div className="recent-tickets-state-icon">
                  ...
                </div>

                <h4>
                  Loading tickets...
                </h4>

                <p>
                  Please wait while we load
                  your support requests.
                </p>
              </div>
            )}

            {!loadingTickets &&
              ticketError && (
                <div className="recent-tickets-state">
                  <div className="recent-tickets-state-icon">
                    !
                  </div>

                  <h4>
                    Unable to load tickets
                  </h4>

                  <p>
                    {ticketError}
                  </p>
                </div>
              )}

            {!loadingTickets &&
              !ticketError &&
              tickets.length === 0 && (
                <div className="recent-tickets-state">
                  <div className="recent-tickets-state-icon">
                    T
                  </div>

                  <h4>
                    No tickets yet
                  </h4>

                  <p>
                    Your recent tickets will
                    appear here.
                  </p>
                </div>
              )}

            {!loadingTickets &&
              !ticketError &&
              tickets.length > 0 && (
                <>
                  {/* Desktop / tablet table */}

                  <div className="recent-tickets-table-wrapper">
                    <table className="recent-tickets-table">
                      <colgroup>
                        <col className="recent-col-id" />
                        <col className="recent-col-title" />
                        <col className="recent-col-status" />
                        <col className="recent-col-date" />
                      </colgroup>

                      <thead>
                        <tr>
                          <th>Ticket</th>
                          <th>Title</th>
                          <th>Status</th>
                          <th>Created</th>
                        </tr>
                      </thead>

                      <tbody>
                        {tickets
                          .slice(0, 5)
                          .map((ticket) => (
                            <tr
                              key={ticket.id}
                              onClick={() =>
                                handleTicketClick(
                                  ticket.id
                                )
                              }
                              tabIndex={0}
                              onKeyDown={(event) => {
                                if (
                                  event.key ===
                                    "Enter" ||
                                  event.key ===
                                    " "
                                ) {
                                  event.preventDefault();

                                  handleTicketClick(
                                    ticket.id
                                  );
                                }
                              }}
                            >
                              <td>
                                <span className="recent-ticket-id">
                                  {
                                    ticket.ticket_number
                                  }
                                </span>
                              </td>

                              <td>
                                <span className="recent-ticket-title">
                                  {ticket.title}
                                </span>
                              </td>

                              <td>
                                <div className="recent-ticket-status-cell">
                                  <span
                                    className={`recent-ticket-status status-${String(
                                      ticket.status ||
                                        ""
                                    ).toLowerCase()}`}
                                  >
                                    {formatStatus(
                                      ticket.status
                                    )}
                                  </span>
                                </div>
                              </td>

                              <td>
                                <span className="recent-ticket-date">
                                  {formatDate(
                                    ticket.created_at
                                  )}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile */}

                  <div className="recent-tickets-mobile-list">
                    {tickets
                      .slice(0, 5)
                      .map((ticket) => (
                        <button
                          type="button"
                          className="recent-ticket-mobile-item"
                          key={ticket.id}
                          onClick={() =>
                            handleTicketClick(
                              ticket.id
                            )
                          }
                        >
                          <div className="recent-mobile-top">
                            <span className="recent-ticket-id">
                              {
                                ticket.ticket_number
                              }
                            </span>

                            <span
                              className={`recent-ticket-status status-${String(
                                ticket.status ||
                                  ""
                              ).toLowerCase()}`}
                            >
                              {formatStatus(
                                ticket.status
                              )}
                            </span>
                          </div>

                          <span className="recent-mobile-title">
                            {ticket.title}
                          </span>

                          <span className="recent-mobile-date">
                            {formatDate(
                              ticket.created_at
                            )}
                          </span>
                        </button>
                      ))}
                  </div>
                </>
              )}
          </div>

          {/* ================================
              Quick Actions
          ================================= */}

          <div className="dashboard-card">
            <div className="card-header">
              <div>
                <h3>Quick Actions</h3>

                <p>
                  Common support activities
                </p>
              </div>
            </div>

            <div className="quick-actions">
              <button
                className="quick-action"
                onClick={() =>
                  setShowCreateTicket(true)
                }
              >
                <span className="action-icon">
                  +
                </span>

                <div>
                  <strong>
                    Create Ticket
                  </strong>

                  <small>
                    Report a new IT issue
                  </small>
                </div>
              </button>

              <button
                className="quick-action"
                onClick={
                  handleOpenKnowledgeBase
                }
              >
                <span className="action-icon">
                  ?
                </span>

                <div>
                  <strong>
                    Knowledge Base
                  </strong>

                  <small>
                    Find troubleshooting
                    guides
                  </small>
                </div>
              </button>

              <button className="quick-action">
                <span className="action-icon">
                  A
                </span>

                <div>
                  <strong>
                    My Account
                  </strong>

                  <small>
                    View your profile
                  </small>
                </div>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
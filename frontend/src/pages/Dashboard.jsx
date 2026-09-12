import { useEffect, useRef, useState } from "react";

import "./Dashboard.css";

import {
  getTickets,
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/api";

import CreateTicket from "./CreateTicket";
import TicketDetails from "./TicketDetails";
import KnowledgeBase from "./KnowledgeBase";
import MyTickets from "./MyTickets";

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

  const roleName = roleNames[user.role_id] || "User";

  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketError, setTicketError] = useState("");

  const [showCreateTicket, setShowCreateTicket] =
    useState(false);

  const [selectedTicketId, setSelectedTicketId] =
    useState(null);

  const [showKnowledgeBase, setShowKnowledgeBase] =
    useState(false);

  const [showMyTickets, setShowMyTickets] =
    useState(false);

  const [notifications, setNotifications] =
    useState([]);

  const [loadingNotifications, setLoadingNotifications] =
    useState(false);

  const [notificationError, setNotificationError] =
    useState("");

  const [showNotifications, setShowNotifications] =
    useState(false);

  const notificationRef = useRef(null);

  async function loadTickets() {
    try {
      setTicketError("");
      setLoadingTickets(true);

      const accessToken =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!accessToken) {
        setTicketError("You are not logged in.");
        return;
      }

      const data = await getTickets(accessToken);

      setTickets(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(error);

      setTicketError(
        error.message ||
          "Failed to load tickets."
      );
    } finally {
      setLoadingTickets(false);
    }
  }

  async function loadNotifications() {
    try {
      setNotificationError("");
      setLoadingNotifications(true);

      const accessToken =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!accessToken) {
        setNotifications([]);
        return;
      }

      const data =
        await getMyNotifications(accessToken);

      const notificationList =
        Array.isArray(data)
          ? data
          : [];

      const unreadNotifications =
        notificationList
          .filter(
            (notification) =>
              notification &&
              notification.is_read === false
          )
          .sort((a, b) => {
            const first = new Date(
              normalizeBackendDate(
                a.created_at
              )
            ).getTime();

            const second = new Date(
              normalizeBackendDate(
                b.created_at
              )
            ).getTime();

            return second - first;
          });

      setNotifications(
        unreadNotifications
      );
    } catch (error) {
      console.error(error);

      setNotificationError(
        error.message ||
          "Failed to load notifications."
      );

      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  }

  useEffect(() => {
    loadTickets();
    loadNotifications();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(
          event.target
        )
      ) {
        setShowNotifications(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const totalTickets =
    tickets.length;

  const openTickets = tickets.filter(
    (ticket) =>
      ticket.status === "OPEN" ||
      ticket.status === "REOPENED"
  ).length;

  const inProgressTickets =
    tickets.filter(
      (ticket) =>
        ticket.status === "IN_PROGRESS"
    ).length;

  const resolvedTickets =
    tickets.filter(
      (ticket) =>
        ticket.status === "RESOLVED" ||
        ticket.status === "CLOSED"
    ).length;

  const unreadNotificationCount =
    notifications.length;

  function handleLogout() {
    localStorage.removeItem(
      "access_token"
    );

    localStorage.removeItem("user");

    sessionStorage.removeItem(
      "access_token"
    );

    sessionStorage.removeItem("user");

    window.location.reload();
  }

  function handleCreateTicketCancel() {
    setShowCreateTicket(false);

    loadTickets();
    loadNotifications();
  }

  function handleTicketClick(ticketId) {
    setSelectedTicketId(ticketId);
    setShowNotifications(false);
  }

  function handleBackToDashboard() {
    setSelectedTicketId(null);
    setShowKnowledgeBase(false);
    setShowMyTickets(false);

    loadTickets();
    loadNotifications();
  }

  function handleOpenKnowledgeBase() {
    setShowKnowledgeBase(true);
  }

  function handleBackFromKnowledgeBase() {
    setShowKnowledgeBase(false);
  }

  function handleOpenMyTickets() {
    setShowMyTickets(true);
    setShowNotifications(false);
  }

  function handleBackFromMyTickets() {
    setShowMyTickets(false);

    loadTickets();
    loadNotifications();
  }

  function normalizeBackendDate(dateValue) {
    if (!dateValue) {
      return "";
    }

    const value =
      String(dateValue).trim();

    if (!value) {
      return "";
    }

    const hasTimezone =
      /(?:Z|[+-]\d{2}:?\d{2})$/i.test(
        value
      );

    let normalized = hasTimezone
      ? value
      : `${value}Z`;

    normalized = normalized.replace(
      /\.(\d{3})\d*(?=(Z|[+-]\d{2}:?\d{2})$)/i,
      ".$1"
    );

    return normalized;
  }

  function formatDate(dateString) {
    if (!dateString) {
      return "-";
    }

    const normalized =
      normalizeBackendDate(
        dateString
      );

    const date = new Date(
      normalized
    );

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  function formatNotificationTime(
    dateString
  ) {
    if (!dateString) {
      return "";
    }

    const normalized =
      normalizeBackendDate(
        dateString
      );

    const date = new Date(
      normalized
    );

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  function formatStatus(status) {
    if (!status) {
      return "-";
    }

    return status.replaceAll(
      "_",
      " "
    );
  }

  async function handleNotificationClick(
    notification
  ) {
    try {
      const accessToken =
        localStorage.getItem(
          "access_token"
        ) ||
        sessionStorage.getItem(
          "access_token"
        );

      if (!accessToken) {
        return;
      }

      await markNotificationAsRead(
        accessToken,
        notification.id
      );

      setNotifications(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              notification.id
          )
      );

      if (notification.ticket_id) {
        setShowNotifications(false);

        setSelectedTicketId(
          notification.ticket_id
        );
      }
    } catch (error) {
      console.error(error);

      setNotificationError(
        error.message ||
          "Failed to mark notification as read."
      );
    }
  }

  async function handleMarkAllNotificationsAsRead() {
    try {
      const accessToken =
        localStorage.getItem(
          "access_token"
        ) ||
        sessionStorage.getItem(
          "access_token"
        );

      if (!accessToken) {
        return;
      }

      await markAllNotificationsAsRead(
        accessToken
      );

      setNotifications([]);
    } catch (error) {
      console.error(error);

      setNotificationError(
        error.message ||
          "Failed to mark notifications as read."
      );
    }
  }

  function handleNotificationBellClick() {
    const nextState =
      !showNotifications;

    setShowNotifications(
      nextState
    );

    if (nextState) {
      loadNotifications();
    }
  }

  if (selectedTicketId) {
    return (
      <TicketDetails
        ticketId={selectedTicketId}
        onBack={
          handleBackToDashboard
        }
      />
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

  if (showKnowledgeBase) {
    return (
      <KnowledgeBase
        onBack={
          handleBackFromKnowledgeBase
        }
      />
    );
  }

  if (showMyTickets) {
    return (
      <MyTickets
        onBack={
          handleBackFromMyTickets
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
          <div
            className="notification-wrapper"
            ref={notificationRef}
          >
            <button
              type="button"
              className="notification-button"
              onClick={
                handleNotificationBellClick
              }
              aria-label="Notifications"
            >
              <span className="notification-bell">
                🔔
              </span>

              {unreadNotificationCount >
                0 && (
                <span className="notification-badge">
                  {unreadNotificationCount >
                  99
                    ? "99+"
                    : unreadNotificationCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="notification-panel">
                <div className="notification-panel-header">
                  <div>
                    <h3>
                      Notifications
                    </h3>

                    <span>
                      {
                        unreadNotificationCount
                      }{" "}
                      unread
                    </span>
                  </div>

                  {notifications.length >
                    0 && (
                    <button
                      type="button"
                      className="mark-all-read-button"
                      onClick={
                        handleMarkAllNotificationsAsRead
                      }
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {loadingNotifications && (
                  <div className="notification-state">
                    <span>
                      Loading notifications...
                    </span>
                  </div>
                )}

                {!loadingNotifications &&
                  notificationError && (
                    <div className="notification-state notification-error">
                      <span>
                        {
                          notificationError
                        }
                      </span>
                    </div>
                  )}

                {!loadingNotifications &&
                  !notificationError &&
                  notifications.length ===
                    0 && (
                    <div className="notification-state">
                      <div className="notification-empty-icon">
                        ✓
                      </div>

                      <strong>
                        You're all caught up
                      </strong>

                      <span>
                        No unread notifications.
                      </span>
                    </div>
                  )}

                {!loadingNotifications &&
                  notifications.length >
                    0 && (
                    <div className="notification-list">
                      {notifications.map(
                        (notification) => (
                          <button
                            type="button"
                            className="notification-item"
                            key={
                              notification.id
                            }
                            onClick={() =>
                              handleNotificationClick(
                                notification
                              )
                            }
                          >
                            <div className="notification-item-icon">
                              {notification.type ===
                              "TICKET_ASSIGNED"
                                ? "A"
                                : "T"}
                            </div>

                            <div className="notification-item-content">
                              <strong>
                                {
                                  notification.title
                                }
                              </strong>

                              <p>
                                {
                                  notification.message
                                }
                              </p>

                              <span>
                                {formatNotificationTime(
                                  notification.created_at
                                )}
                              </span>
                            </div>

                            <span className="notification-unread-dot" />
                          </button>
                        )
                      )}
                    </div>
                  )}
              </div>
            )}
          </div>

          <div className="user-info">
            <strong>
              {user.name || "User"}
            </strong>

            <span>
              {roleName}
            </span>
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
              Here's an overview of your
              IT support activity.
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
              <span>
                Total Tickets
              </span>

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
              <span>
                Open Tickets
              </span>

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
              <span>
                In Progress
              </span>

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
              <span>
                Resolved
              </span>

              <strong>
                {resolvedTickets}
              </strong>
            </div>
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-card recent-tickets-card">
            <div className="card-header">
              <div>
                <h3>
                  Recent Tickets
                </h3>

                <p>
                  Your latest support
                  requests
                </p>
              </div>

              <div className="recent-tickets-header-actions">
                <button
                  className="view-all-button"
                  onClick={
                    handleOpenMyTickets
                  }
                  type="button"
                >
                  View All
                </button>

                <button
                  className="view-all-button"
                  onClick={
                    loadTickets
                  }
                  type="button"
                  disabled={
                    loadingTickets
                  }
                >
                  {loadingTickets
                    ? "Refreshing..."
                    : "Refresh"}
                </button>
              </div>
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
                    Unable to load
                    tickets
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
                    Your recent tickets
                    will appear here.
                  </p>
                </div>
              )}

            {!loadingTickets &&
              !ticketError &&
              tickets.length > 0 && (
                <>
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
                          <th>
                            Ticket
                          </th>

                          <th>
                            Title
                          </th>

                          <th>
                            Status
                          </th>

                          <th>
                            Created
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {tickets
                          .slice(0, 5)
                          .map((ticket) => (
                            <tr
                              key={
                                ticket.id
                              }
                              onClick={() =>
                                handleTicketClick(
                                  ticket.id
                                )
                              }
                              tabIndex={0}
                              onKeyDown={(
                                event
                              ) => {
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
                                  {
                                    ticket.title
                                  }
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

                  <div className="recent-tickets-mobile-list">
                    {tickets
                      .slice(0, 5)
                      .map((ticket) => (
                        <button
                          type="button"
                          className="recent-ticket-mobile-item"
                          key={
                            ticket.id
                          }
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
                            {
                              ticket.title
                            }
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

          <div className="dashboard-card">
            <div className="card-header">
              <div>
                <h3>
                  Quick Actions
                </h3>

                <p>
                  Common support activities
                </p>
              </div>
            </div>

            <div className="quick-actions">
              <button
                className="quick-action"
                onClick={() =>
                  setShowCreateTicket(
                    true
                  )
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

              <button
                className="quick-action"
                type="button"
              >
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
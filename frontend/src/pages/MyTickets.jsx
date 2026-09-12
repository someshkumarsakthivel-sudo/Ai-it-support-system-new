import { useEffect, useState } from "react";

import "./MyTickets.css";

import {
  getTickets,
} from "../services/api";

import TicketDetails from "./TicketDetails";

function MyTickets({ onBack }) {
  const storedUser =
    localStorage.getItem("user") ||
    sessionStorage.getItem("user");

  let user = {};

  try {
    user = storedUser
      ? JSON.parse(storedUser)
      : {};
  } catch {
    user = {};
  }

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTicketId, setSelectedTicketId] =
    useState(null);

  async function loadTickets() {
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

      const data = await getTickets(accessToken);

      setTickets(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to load your tickets."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  function handleTicketClick(ticketId) {
    setSelectedTicketId(ticketId);
  }

  function handleBackFromTicket() {
    setSelectedTicketId(null);
    loadTickets();
  }

  function formatStatus(status) {
    if (!status) {
      return "-";
    }

    return status.replaceAll("_", " ");
  }

  function formatDate(value) {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getStatusClass(status) {
    if (!status) {
      return "";
    }

    return `my-ticket-status status-${String(
      status
    ).toLowerCase()}`;
  }

  function getPriorityClass(priority) {
    if (!priority) {
      return "";
    }

    return `my-ticket-priority priority-${String(
      priority
    ).toLowerCase()}`;
  }

  if (selectedTicketId) {
    return (
      <TicketDetails
        ticketId={selectedTicketId}
        onBack={handleBackFromTicket}
      />
    );
  }

  return (
    <div className="my-tickets-page">
      <div className="my-tickets-container">
        <div className="my-tickets-header">
          <button
            type="button"
            className="my-tickets-back-button"
            onClick={onBack}
          >
            ← Dashboard
          </button>

          <div className="my-tickets-heading">
            <p className="my-tickets-label">
              Ticket Management
            </p>

            <h1>My Tickets</h1>

            <p>
              View and track all support tickets
              available to your account.
            </p>
          </div>

          <button
            type="button"
            className="my-tickets-refresh-button"
            onClick={loadTickets}
            disabled={loading}
          >
            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>

        <div className="my-tickets-summary">
          <div className="my-tickets-summary-card">
            <span>Total Tickets</span>

            <strong>
              {tickets.length}
            </strong>
          </div>

          <div className="my-tickets-summary-card">
            <span>Open</span>

            <strong>
              {
                tickets.filter(
                  (ticket) =>
                    ticket.status === "OPEN" ||
                    ticket.status === "REOPENED"
                ).length
              }
            </strong>
          </div>

          <div className="my-tickets-summary-card">
            <span>In Progress</span>

            <strong>
              {
                tickets.filter(
                  (ticket) =>
                    ticket.status ===
                    "IN_PROGRESS"
                ).length
              }
            </strong>
          </div>

          <div className="my-tickets-summary-card">
            <span>Resolved</span>

            <strong>
              {
                tickets.filter(
                  (ticket) =>
                    ticket.status ===
                      "RESOLVED" ||
                    ticket.status ===
                      "CLOSED"
                ).length
              }
            </strong>
          </div>
        </div>

        <section className="my-tickets-card">
          <div className="my-tickets-card-header">
            <div>
              <h2>All Tickets</h2>

              <p>
                Showing all tickets available
                to your account.
              </p>
            </div>

            <span className="my-tickets-count">
              {tickets.length}{" "}
              {tickets.length === 1
                ? "ticket"
                : "tickets"}
            </span>
          </div>

          {loading && (
            <div className="my-tickets-state">
              <div className="my-tickets-state-icon">
                ...
              </div>

              <h3>
                Loading tickets...
              </h3>

              <p>
                Please wait while we load your
                tickets.
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="my-tickets-state my-tickets-error">
              <div className="my-tickets-state-icon">
                !
              </div>

              <h3>
                Unable to load tickets
              </h3>

              <p>{error}</p>

              <button
                type="button"
                className="my-tickets-retry-button"
                onClick={loadTickets}
              >
                Try Again
              </button>
            </div>
          )}

          {!loading &&
            !error &&
            tickets.length === 0 && (
              <div className="my-tickets-state">
                <div className="my-tickets-state-icon">
                  T
                </div>

                <h3>
                  No tickets found
                </h3>

                <p>
                  You don't have any tickets
                  available to display.
                </p>
              </div>
            )}

          {!loading &&
            !error &&
            tickets.length > 0 && (
              <>
                <div className="my-tickets-table-wrapper">
                  <table className="my-tickets-table">
                    <thead>
                      <tr>
                        <th>Ticket</th>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Created</th>
                      </tr>
                    </thead>

                    <tbody>
                      {tickets.map((ticket) => (
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
                              event.key === " "
                            ) {
                              event.preventDefault();

                              handleTicketClick(
                                ticket.id
                              );
                            }
                          }}
                        >
                          <td>
                            <span className="my-ticket-number">
                              {
                                ticket.ticket_number
                              }
                            </span>
                          </td>

                          <td>
                            <span className="my-ticket-title">
                              {ticket.title}
                            </span>
                          </td>

                          <td>
                            <span
                              className={getStatusClass(
                                ticket.status
                              )}
                            >
                              {formatStatus(
                                ticket.status
                              )}
                            </span>
                          </td>

                          <td>
                            <span
                              className={getPriorityClass(
                                ticket.priority
                              )}
                            >
                              {ticket.priority ||
                                "-"}
                            </span>
                          </td>

                          <td>
                            <span className="my-ticket-date">
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

                <div className="my-tickets-mobile-list">
                  {tickets.map((ticket) => (
                    <button
                      type="button"
                      className="my-ticket-mobile-item"
                      key={ticket.id}
                      onClick={() =>
                        handleTicketClick(
                          ticket.id
                        )
                      }
                    >
                      <div className="my-ticket-mobile-top">
                        <span className="my-ticket-number">
                          {
                            ticket.ticket_number
                          }
                        </span>

                        <span
                          className={getStatusClass(
                            ticket.status
                          )}
                        >
                          {formatStatus(
                            ticket.status
                          )}
                        </span>
                      </div>

                      <span className="my-ticket-mobile-title">
                        {ticket.title}
                      </span>

                      <div className="my-ticket-mobile-meta">
                        <span>
                          {ticket.priority ||
                            "-"}
                        </span>

                        <span>
                          {formatDate(
                            ticket.created_at
                          )}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
        </section>
      </div>
    </div>
  );
}

export default MyTickets;
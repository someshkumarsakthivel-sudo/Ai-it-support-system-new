import { useEffect, useMemo, useState } from "react";
import "./AdminTickets.css";
import {
  getTickets,
  getUsers,
} from "../services/api";

function AdminTickets({
  onBack,
  onOpenTicket,
  onAssignTicket,
}) {
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] =
    useState("ALL");
  const [assignmentFilter, setAssignmentFilter] =
    useState("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
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

      const [ticketData, userData] =
        await Promise.all([
          getTickets(accessToken),
          getUsers(accessToken),
        ]);

      setTickets(Array.isArray(ticketData) ? ticketData : []);
      setUsers(Array.isArray(userData) ? userData : []);
    } catch (err) {
      setError(
        err.message || "Failed to load tickets."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const engineers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.role_id === 2 &&
          user.is_active === true
      ),
    [users]
  );

  const engineerMap = useMemo(() => {
    const map = {};

    engineers.forEach((engineer) => {
      map[engineer.id] = engineer.name;
    });

    return map;
  }, [engineers]);

  const filteredTickets = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const matchesSearch =
        !query ||
        String(ticket.ticket_number || "")
          .toLowerCase()
          .includes(query) ||
        String(ticket.title || "")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        ticket.status === statusFilter;

      const matchesPriority =
        priorityFilter === "ALL" ||
        ticket.priority === priorityFilter;

      const assigned =
        ticket.assigned_to !== null &&
        ticket.assigned_to !== undefined;

      const matchesAssignment =
        assignmentFilter === "ALL" ||
        (assignmentFilter === "ASSIGNED" &&
          assigned) ||
        (assignmentFilter === "UNASSIGNED" &&
          !assigned);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesAssignment
      );
    });
  }, [
    tickets,
    search,
    statusFilter,
    priorityFilter,
    assignmentFilter,
  ]);

  const totalTickets = tickets.length;

  const unassignedTickets = tickets.filter(
    (ticket) =>
      ticket.assigned_to === null ||
      ticket.assigned_to === undefined
  ).length;

  const openTickets = tickets.filter(
    (ticket) => ticket.status === "OPEN"
  ).length;

  const inProgressTickets = tickets.filter(
    (ticket) =>
      ticket.status === "IN_PROGRESS"
  ).length;

  const resolvedTickets = tickets.filter(
    (ticket) =>
      ticket.status === "RESOLVED"
  ).length;

  function formatDate(dateString) {
    if (!dateString) {
      return "—";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getEngineerName(assignedTo) {
    if (
      assignedTo === null ||
      assignedTo === undefined
    ) {
      return "Unassigned";
    }

    return (
      engineerMap[assignedTo] ||
      `User #${assignedTo}`
    );
  }

  function isUnassigned(ticket) {
    return (
      ticket.assigned_to === null ||
      ticket.assigned_to === undefined
    );
  }

  function formatStatus(status) {
    return String(status || "")
      .replaceAll("_", " ")
      .toUpperCase();
  }

  function formatPriority(priority) {
    return String(priority || "").toUpperCase();
  }

  return (
    <div className="admin-tickets-page">
      <div className="admin-tickets-container">

        <header className="admin-tickets-page-header">
          <div className="admin-tickets-heading">
            <button
              type="button"
              className="admin-tickets-back-button"
              onClick={onBack}
            >
              <span aria-hidden="true">←</span>
              <span>Dashboard</span>
            </button>

            <div className="admin-tickets-breadcrumb">
              Administration
            </div>

            <h1>Tickets</h1>

            <p>
              View and manage all support tickets
              across the system.
            </p>
          </div>

          <button
            type="button"
            className="admin-tickets-refresh-button"
            onClick={loadData}
            disabled={loading}
          >
            <span aria-hidden="true">↻</span>
            <span>
              {loading ? "Refreshing..." : "Refresh"}
            </span>
          </button>
        </header>

        <section
          className="admin-ticket-stat-grid"
          aria-label="Ticket statistics"
        >
          <article className="admin-ticket-stat-card">
            <div className="admin-ticket-stat-icon">
              <span>T</span>
            </div>

            <div className="admin-ticket-stat-content">
              <span>Total Tickets</span>
              <strong>{totalTickets}</strong>
            </div>
          </article>

          <article className="admin-ticket-stat-card">
            <div className="admin-ticket-stat-icon">
              <span>U</span>
            </div>

            <div className="admin-ticket-stat-content">
              <span>Unassigned</span>
              <strong>{unassignedTickets}</strong>
            </div>
          </article>

          <article className="admin-ticket-stat-card">
            <div className="admin-ticket-stat-icon">
              <span>O</span>
            </div>

            <div className="admin-ticket-stat-content">
              <span>Open Tickets</span>
              <strong>{openTickets}</strong>
            </div>
          </article>

          <article className="admin-ticket-stat-card">
            <div className="admin-ticket-stat-icon">
              <span>P</span>
            </div>

            <div className="admin-ticket-stat-content">
              <span>In Progress</span>
              <strong>{inProgressTickets}</strong>
            </div>
          </article>

          <article className="admin-ticket-stat-card">
            <div className="admin-ticket-stat-icon">
              <span>R</span>
            </div>

            <div className="admin-ticket-stat-content">
              <span>Resolved</span>
              <strong>{resolvedTickets}</strong>
            </div>
          </article>
        </section>

        <section className="admin-ticket-filter-card">
          <div className="admin-ticket-filter">
            <label htmlFor="ticket-search">
              Search tickets
            </label>

            <input
              id="ticket-search"
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by ticket number or title"
            />
          </div>

          <div className="admin-ticket-filter">
            <label htmlFor="ticket-status">
              Status
            </label>

            <select
              id="ticket-status"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="ALL">
                All statuses
              </option>
              <option value="OPEN">Open</option>
              <option value="ASSIGNED">
                Assigned
              </option>
              <option value="IN_PROGRESS">
                In Progress
              </option>
              <option value="PENDING">
                Pending
              </option>
              <option value="RESOLVED">
                Resolved
              </option>
              <option value="CLOSED">
                Closed
              </option>
              <option value="REOPENED">
                Reopened
              </option>
              <option value="CANCELLED">
                Cancelled
              </option>
            </select>
          </div>

          <div className="admin-ticket-filter">
            <label htmlFor="ticket-priority">
              Priority
            </label>

            <select
              id="ticket-priority"
              value={priorityFilter}
              onChange={(event) =>
                setPriorityFilter(event.target.value)
              }
            >
              <option value="ALL">
                All priorities
              </option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">
                Critical
              </option>
            </select>
          </div>

          <div className="admin-ticket-filter">
            <label htmlFor="ticket-assignment">
              Assignment
            </label>

            <select
              id="ticket-assignment"
              value={assignmentFilter}
              onChange={(event) =>
                setAssignmentFilter(
                  event.target.value
                )
              }
            >
              <option value="ALL">
                All tickets
              </option>
              <option value="ASSIGNED">
                Assigned
              </option>
              <option value="UNASSIGNED">
                Unassigned
              </option>
            </select>
          </div>
        </section>

        <section className="admin-ticket-list-card">
          <div className="admin-ticket-list-header">
            <div>
              <h2>All Tickets</h2>

              <p>
                {filteredTickets.length} of{" "}
                {totalTickets} tickets
              </p>
            </div>

            {search ||
            statusFilter !== "ALL" ||
            priorityFilter !== "ALL" ||
            assignmentFilter !== "ALL" ? (
              <button
                type="button"
                className="admin-clear-filter-button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setPriorityFilter("ALL");
                  setAssignmentFilter("ALL");
                }}
              >
                Clear filters
              </button>
            ) : null}
          </div>

          {loading && (
            <div className="admin-ticket-state">
              <div className="admin-ticket-state-icon">
                T
              </div>

              <h3>Loading tickets...</h3>

              <p>
                Please wait while the ticket list
                is loaded.
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="admin-ticket-state admin-ticket-state-error">
              <div className="admin-ticket-state-icon">
                !
              </div>

              <h3>Unable to load tickets</h3>

              <p>{error}</p>

              <button
                type="button"
                className="admin-state-action-button"
                onClick={loadData}
              >
                Try Again
              </button>
            </div>
          )}

          {!loading &&
            !error &&
            filteredTickets.length === 0 && (
              <div className="admin-ticket-state">
                <div className="admin-ticket-state-icon">
                  T
                </div>

                <h3>
                  No matching tickets
                </h3>

                <p>
                  Change your search or filters
                  to see more tickets.
                </p>
              </div>
            )}

          {!loading &&
            !error &&
            filteredTickets.length > 0 && (
              <>
                <div className="admin-ticket-table-wrapper">
                  <table className="admin-ticket-table">
                    <thead>
                      <tr>
                        <th>Ticket</th>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Assigned To</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredTickets.map((ticket) => (
                        <tr
                          key={ticket.id}
                          className={
                            isUnassigned(ticket)
                              ? "is-unassigned"
                              : ""
                          }
                        >
                          <td>
                            <button
                              type="button"
                              className="admin-ticket-number-button"
                              onClick={() =>
                                onOpenTicket(ticket.id)
                              }
                            >
                              {ticket.ticket_number}
                            </button>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="admin-ticket-title-button"
                              onClick={() =>
                                onOpenTicket(ticket.id)
                              }
                              title={ticket.title}
                            >
                              {ticket.title}
                            </button>
                          </td>

                          <td>
                            <span
                              className={`ticket-status-badge status-${String(
                                ticket.status || ""
                              ).toLowerCase()}`}
                            >
                              {formatStatus(
                                ticket.status
                              )}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`ticket-priority-badge priority-${String(
                                ticket.priority || ""
                              ).toLowerCase()}`}
                            >
                              {formatPriority(
                                ticket.priority
                              )}
                            </span>
                          </td>

                          <td>
                            <span
                              className={
                                isUnassigned(ticket)
                                  ? "ticket-assignee unassigned"
                                  : "ticket-assignee"
                              }
                            >
                              {getEngineerName(
                                ticket.assigned_to
                              )}
                            </span>
                          </td>

                          <td>
                            <span className="ticket-date">
                              {formatDate(
                                ticket.created_at
                              )}
                            </span>
                          </td>

                          <td>
                            <div className="ticket-actions">
                              <button
                                type="button"
                                className="ticket-view-button"
                                onClick={() =>
                                  onOpenTicket(
                                    ticket.id
                                  )
                                }
                              >
                                View
                              </button>

                              {isUnassigned(
                                ticket
                              ) && (
                                <button
                                  type="button"
                                  className="ticket-assign-button"
                                  onClick={() =>
                                    onAssignTicket(
                                      ticket.id
                                    )
                                  }
                                >
                                  Assign
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="admin-ticket-mobile-list">
                  {filteredTickets.map((ticket) => (
                    <article
                      className="admin-ticket-mobile-card"
                      key={ticket.id}
                    >
                      <div className="admin-mobile-card-top">
                        <button
                          type="button"
                          className="admin-ticket-number-button"
                          onClick={() =>
                            onOpenTicket(ticket.id)
                          }
                        >
                          {ticket.ticket_number}
                        </button>

                        <span
                          className={`ticket-status-badge status-${String(
                            ticket.status || ""
                          ).toLowerCase()}`}
                        >
                          {formatStatus(
                            ticket.status
                          )}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="admin-mobile-ticket-title"
                        onClick={() =>
                          onOpenTicket(ticket.id)
                        }
                      >
                        {ticket.title}
                      </button>

                      <div className="admin-mobile-meta">
                        <div>
                          <span>Priority</span>

                          <strong
                            className={`ticket-priority-badge priority-${String(
                              ticket.priority || ""
                            ).toLowerCase()}`}
                          >
                            {formatPriority(
                              ticket.priority
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>Assigned to</span>

                          <strong
                            className={
                              isUnassigned(ticket)
                                ? "mobile-unassigned"
                                : ""
                            }
                          >
                            {getEngineerName(
                              ticket.assigned_to
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>Created</span>

                          <strong>
                            {formatDate(
                              ticket.created_at
                            )}
                          </strong>
                        </div>
                      </div>

                      <div className="admin-mobile-actions">
                        <button
                          type="button"
                          className="ticket-view-button"
                          onClick={() =>
                            onOpenTicket(ticket.id)
                          }
                        >
                          View Ticket
                        </button>

                        {isUnassigned(ticket) && (
                          <button
                            type="button"
                            className="ticket-assign-button"
                            onClick={() =>
                              onAssignTicket(
                                ticket.id
                              )
                            }
                          >
                            Assign Ticket
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
        </section>
      </div>
    </div>
  );
}

export default AdminTickets;
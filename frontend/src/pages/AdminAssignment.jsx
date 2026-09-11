import { useEffect, useState } from "react";
import "./AdminAssignment.css";
import {
  getTicket,
  getUsers,
  getTeams,
  updateTicketAssignment,
} from "../services/api";

function AdminAssignment({
  ticketId,
  onBack,
  onAssigned,
}) {
  const [ticket, setTicket] = useState(null);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);

  const [selectedEngineer, setSelectedEngineer] =
    useState("");
  const [selectedTeam, setSelectedTeam] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAssignmentData() {
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
          getTicket(
            accessToken,
            ticketId
          ),
          getUsers(accessToken),
          getTeams(accessToken),
        ]);

        setTicket(ticketData);
        setUsers(userData);
        setTeams(teamData);

        if (ticketData.assigned_to) {
          setSelectedEngineer(
            String(ticketData.assigned_to)
          );
        }

        if (ticketData.team_id) {
          setSelectedTeam(
            String(ticketData.team_id)
          );
        }
      } catch (err) {
        setError(
          err.message ||
            "Failed to load assignment data."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAssignmentData();
  }, [ticketId]);

  const engineers = users.filter(
    (user) =>
      user.role_id === 2 &&
      user.is_active === true
  );

  async function handleAssignment(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const accessToken =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      if (!accessToken) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const updatedTicket =
        await updateTicketAssignment(
          accessToken,
          ticketId,
          {
            assigned_to: selectedEngineer
              ? Number(selectedEngineer)
              : null,
            team_id: selectedTeam
              ? Number(selectedTeam)
              : null,
          }
        );

      setTicket(updatedTicket);

      alert(
        `Ticket ${updatedTicket.ticket_number} assigned successfully.`
      );

      if (onAssigned) {
        onAssigned(updatedTicket);
      }
    } catch (err) {
      setError(
        err.message ||
          "Failed to assign ticket."
      );
    } finally {
      setSaving(false);
    }
  }

  function getEngineerName(userId) {
    const engineer = engineers.find(
      (user) => user.id === userId
    );

    return engineer
      ? engineer.name
      : "Not assigned";
  }

  function getTeamName(teamId) {
    const team = teams.find(
      (item) => item.id === teamId
    );

    return team
      ? team.name
      : "Not assigned";
  }

  if (loading) {
    return (
      <div className="admin-assignment-page">
        <div className="admin-assignment-container">
          <div className="assignment-loading">
            <div className="assignment-loading-icon">
              ...
            </div>

            <h2>
              Loading assignment data...
            </h2>

            <p>
              Please wait while we load the
              available engineers and teams.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="admin-assignment-page">
        <div className="admin-assignment-container">
          <button
            type="button"
            className="assignment-back-button"
            onClick={onBack}
          >
            ← Back
          </button>

          <div className="assignment-error">
            <h2>
              Unable to load assignment
            </h2>

            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-assignment-page">
      <div className="admin-assignment-container">
        <button
          type="button"
          className="assignment-back-button"
          onClick={onBack}
        >
          ← Back to Ticket
        </button>

        <header className="assignment-header">
          <div>
            <p className="assignment-label">
              Administration
            </p>

            <h1>
              Assign Ticket
            </h1>

            <p>
              Assign this ticket to a support
              engineer and team.
            </p>
          </div>
        </header>

        <section className="assignment-ticket-card">
          <div className="assignment-ticket-number">
            {ticket.ticket_number}
          </div>

          <h2>{ticket.title}</h2>

          <div className="assignment-ticket-meta">
            <span>
              Status:{" "}
              <strong>{ticket.status}</strong>
            </span>

            <span>
              Priority:{" "}
              <strong>{ticket.priority}</strong>
            </span>
          </div>
        </section>

        {error && (
          <div className="assignment-form-error">
            {error}
          </div>
        )}

        <div className="assignment-grid">
          <section className="assignment-card">
            <div className="assignment-card-header">
              <h2>Assignment</h2>

              <p>
                Choose the engineer and support
                team responsible for this ticket.
              </p>
            </div>

            <form
              className="assignment-form"
              onSubmit={handleAssignment}
            >
              <div className="assignment-form-group">
                <label htmlFor="engineer">
                  Support Engineer
                </label>

                <select
                  id="engineer"
                  value={selectedEngineer}
                  onChange={(event) =>
                    setSelectedEngineer(
                      event.target.value
                    )
                  }
                  disabled={saving}
                >
                  <option value="">
                    Unassigned
                  </option>

                  {engineers.map((engineer) => (
                    <option
                      key={engineer.id}
                      value={engineer.id}
                    >
                      {engineer.name} —{" "}
                      {engineer.email}
                    </option>
                  ))}
                </select>

                <span>
                  Only active Support Engineers
                  are available.
                </span>
              </div>

              <div className="assignment-form-group">
                <label htmlFor="team">
                  Support Team
                </label>

                <select
                  id="team"
                  value={selectedTeam}
                  onChange={(event) =>
                    setSelectedTeam(
                      event.target.value
                    )
                  }
                  disabled={saving}
                >
                  <option value="">
                    No team
                  </option>

                  {teams.map((team) => (
                    <option
                      key={team.id}
                      value={team.id}
                    >
                      {team.name}
                    </option>
                  ))}
                </select>

                <span>
                  Select the team responsible for
                  the ticket.
                </span>
              </div>

              <div className="assignment-form-actions">
                <button
                  type="button"
                  className="assignment-secondary-button"
                  onClick={onBack}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="assignment-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Assigning..."
                    : "Assign Ticket"}
                </button>
              </div>
            </form>
          </section>

          <aside className="assignment-card">
            <div className="assignment-card-header">
              <h2>Current Assignment</h2>

              <p>
                Current assignment information.
              </p>
            </div>

            <div className="current-assignment">
              <div className="current-assignment-item">
                <span>Engineer</span>

                <strong>
                  {getEngineerName(
                    ticket.assigned_to
                  )}
                </strong>
              </div>

              <div className="current-assignment-item">
                <span>Team</span>

                <strong>
                  {getTeamName(
                    ticket.team_id
                  )}
                </strong>
              </div>

              <div className="current-assignment-item">
                <span>Status</span>

                <strong>
                  {ticket.status}
                </strong>
              </div>
            </div>

            <div className="assignment-note">
              <strong>
                Assignment behavior
              </strong>

              <p>
                Assigning an engineer automatically
                changes an eligible ticket to
                ASSIGNED. Removing the engineer
                returns it to OPEN.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default AdminAssignment;
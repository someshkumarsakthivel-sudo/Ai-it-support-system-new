import { useEffect, useState } from "react";

import {
  getUsers,
  updateTicketAssignment,
} from "../services/api";

function AdminAssignment({
  ticket,
  onAssignmentComplete,
}) {
  const [engineers, setEngineers] = useState([]);
  const [selectedEngineer, setSelectedEngineer] =
    useState(
      ticket?.assigned_to
        ? String(ticket.assigned_to)
        : ""
    );

  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getAccessToken = () => {
    return (
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token")
    );
  };

  useEffect(() => {
    const loadEngineers = async () => {
      const accessToken = getAccessToken();

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
        const users = await getUsers(accessToken);

        const engineerUsers = (users || []).filter(
          (user) => user.role_id === 2
        );

        setEngineers(engineerUsers);
      } catch (err) {
        setError(
          err?.message ||
            "Failed to load support engineers."
        );
      } finally {
        setLoading(false);
      }
    };

    loadEngineers();
  }, []);

  useEffect(() => {
    setSelectedEngineer(
      ticket?.assigned_to
        ? String(ticket.assigned_to)
        : ""
    );
  }, [ticket]);

  const handleAssignment = async () => {
    const accessToken = getAccessToken();

    if (!accessToken) {
      setError(
        "Authentication token is missing. Please log in again."
      );
      return;
    }

    if (!selectedEngineer) {
      setError(
        "Please select a support engineer."
      );
      return;
    }

    setAssigning(true);
    setError("");
    setSuccess("");

    try {
      await updateTicketAssignment(
        accessToken,
        ticket.id,
        {
          assigned_to:
            Number(selectedEngineer),
          team_id: null,
        }
      );

      setSuccess(
        "Ticket assigned successfully."
      );

      if (onAssignmentComplete) {
        await onAssignmentComplete();
      }
    } catch (err) {
      setError(
        err?.message ||
          "Failed to assign ticket."
      );
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="assignment-panel">
        <p>
          Loading support engineers...
        </p>
      </div>
    );
  }

  return (
    <div className="assignment-panel">
      <div className="assignment-form">
        <label htmlFor="engineer-select">
          Support Engineer
        </label>

        <select
          id="engineer-select"
          value={selectedEngineer}
          onChange={(event) =>
            setSelectedEngineer(
              event.target.value
            )
          }
          disabled={assigning}
        >
          <option value="">
            Select an engineer
          </option>

          {engineers.map((engineer) => (
            <option
              key={engineer.id}
              value={engineer.id}
            >
              {engineer.name}
              {engineer.email
                ? ` (${engineer.email})`
                : ""}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="primary-button"
          onClick={handleAssignment}
          disabled={
            assigning ||
            !selectedEngineer
          }
        >
          {assigning
            ? "Assigning..."
            : "Assign Ticket"}
        </button>
      </div>

      {error && (
        <div className="inline-error">
          {error}
        </div>
      )}

      {success && (
        <div className="inline-success">
          {success}
        </div>
      )}
    </div>
  );
}

export default AdminAssignment;
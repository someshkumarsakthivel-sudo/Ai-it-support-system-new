import { useEffect, useMemo, useState } from "react";

import { getTeams, getUsers } from "../services/api";

import "./AdminTeams.css";

const LOCAL_API_BASE_URL = "http://127.0.0.1:8000";
const PRODUCTION_API_BASE_URL =
  "https://ai-it-support-system.onrender.com";

function getApiBaseUrl() {
  const hostname = window.location.hostname;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return LOCAL_API_BASE_URL;
  }

  return PRODUCTION_API_BASE_URL;
}

function getStoredValue(key) {
  return localStorage.getItem(key) || sessionStorage.getItem(key) || null;
}

function getInitial(name) {
  return (
    name?.trim()?.charAt(0)?.toUpperCase() ||
    "?"
  );
}

function getRoleName(roleId) {
  const roleMap = {
    1: "Employee",
    2: "Support Engineer",
    3: "Admin",
  };

  return roleMap[roleId] || "Unknown";
}

async function adminRequest(endpoint, options = {}) {
  const accessToken = getStoredValue("access_token");

  if (!accessToken) {
    throw new Error(
      "Your login session has expired. Please log in again."
    );
  }

  const baseUrl = getApiBaseUrl();

  const response = await fetch(
    `${baseUrl}${endpoint}`,
    {
      ...options,
      headers: {
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
        Authorization: `Bearer ${accessToken}`,
        ...(options.headers || {}),
      },
    }
  );

  const contentType =
    response.headers.get("content-type") || "";

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

function AdminTeams({ onBack }) {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [editingTeam, setEditingTeam] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const [memberToAdd, setMemberToAdd] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [memberSaving, setMemberSaving] = useState(false);

  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  async function loadTeams(isRefresh = false) {
    try {
      setError("");

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const accessToken = getStoredValue("access_token");

      if (!accessToken) {
        throw new Error(
          "Your login session has expired. Please log in again."
        );
      }

      const [teamData, userData] = await Promise.all([
        getTeams(accessToken),
        getUsers(accessToken),
      ]);

      const normalizedTeams = Array.isArray(teamData)
        ? teamData
        : [];

      const normalizedUsers = Array.isArray(userData)
        ? userData
        : [];

      setTeams(normalizedTeams);
      setUsers(normalizedUsers);

      if (selectedTeam) {
        const freshSelectedTeam = normalizedTeams.find(
          (team) =>
            Number(team.id) === Number(selectedTeam.id)
        );

        if (freshSelectedTeam) {
          setSelectedTeam(freshSelectedTeam);
        } else {
          setSelectedTeam(null);
          setEditingTeam(false);
        }
      }
    } catch (err) {
      setError(
        err?.message ||
          "Unable to load teams."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadTeams();
  }, []);

  const teamUsage = useMemo(() => {
    const counts = new Map();

    users.forEach((user) => {
      if (user.team_id) {
        const teamId = Number(user.team_id);

        counts.set(
          teamId,
          (counts.get(teamId) || 0) + 1
        );
      }
    });

    return counts;
  }, [users]);

  const filteredTeams = useMemo(() => {
    const value = search.trim().toLowerCase();

    return teams.filter((team) =>
      !value ||
      String(team.id).includes(value) ||
      String(team.name || "")
        .toLowerCase()
        .includes(value) ||
      String(team.description || "")
        .toLowerCase()
        .includes(value)
    );
  }, [teams, search]);

  const usedTeams = teams.filter(
    (team) =>
      (teamUsage.get(Number(team.id)) || 0) > 0
  ).length;

  const unassignedUsers = users.filter(
    (user) => !user.team_id
  ).length;

  const selectedTeamMembers = useMemo(() => {
    if (!selectedTeam) {
      return [];
    }

    return users
      .filter(
        (user) =>
          Number(user.team_id) ===
          Number(selectedTeam.id)
      )
      .sort((a, b) =>
        String(a.name || "").localeCompare(
          String(b.name || "")
        )
      );
  }, [users, selectedTeam]);

  const availableMembers = useMemo(() => {
    if (!selectedTeam) {
      return [];
    }

    return users
      .filter(
        (user) =>
          Number(user.team_id) !==
          Number(selectedTeam.id)
      )
      .sort((a, b) =>
        String(a.name || "").localeCompare(
          String(b.name || "")
        )
      );
  }, [users, selectedTeam]);

  function openCreate() {
    setSelectedTeam(null);
    setEditingTeam(true);

    setForm({
      name: "",
      description: "",
    });

    setMemberToAdd("");
    setError("");
    setSaveMessage("");
  }

  function openManage(team) {
    setSelectedTeam(team);
    setEditingTeam(false);
    setMemberToAdd("");
    setError("");
    setSaveMessage("");
  }

  function openEdit() {
    if (!selectedTeam) {
      return;
    }

    setForm({
      name: selectedTeam.name || "",
      description: selectedTeam.description || "",
    });

    setEditingTeam(true);
    setError("");
    setSaveMessage("");
  }

  function closePanel() {
    setSelectedTeam(null);
    setEditingTeam(false);
    setMemberToAdd("");
    setError("");
    setSaveMessage("");
  }

  async function saveTeam(event) {
    event.preventDefault();

    if (form.name.trim().length < 2) {
      setError(
        "Team name must contain at least 2 characters."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSaveMessage("");

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
      };

      if (selectedTeam) {
        const updated = await adminRequest(
          `/api/teams/${selectedTeam.id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );

        setTeams((current) =>
          current.map((team) =>
            Number(team.id) === Number(updated.id)
              ? updated
              : team
          )
        );

        setSelectedTeam(updated);

        setSaveMessage(
          "Team updated successfully."
        );
      } else {
        const created = await adminRequest(
          "/api/teams",
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );

        setTeams((current) => [
          ...current,
          created,
        ]);

        setSelectedTeam(created);

        setSaveMessage(
          "Team created successfully."
        );
      }

      setEditingTeam(false);

      setForm({
        name: "",
        description: "",
      });
    } catch (err) {
      setError(
        err?.message ||
          "Unable to save team."
      );
    } finally {
      setSaving(false);
    }
  }

  async function assignMember() {
    if (!selectedTeam || !memberToAdd) {
      return;
    }

    const selectedUser = users.find(
      (user) =>
        Number(user.id) ===
        Number(memberToAdd)
    );

    if (!selectedUser) {
      setError("Selected user was not found.");
      return;
    }

    const previousTeamId =
      selectedUser.team_id;

    if (
      previousTeamId &&
      Number(previousTeamId) !==
        Number(selectedTeam.id)
    ) {
      const previousTeam = teams.find(
        (team) =>
          Number(team.id) ===
          Number(previousTeamId)
      );

      const previousTeamName =
        previousTeam?.name ||
        `Team ${previousTeamId}`;

      const shouldMove = window.confirm(
        `"${selectedUser.name}" is currently assigned to "${previousTeamName}".\n\nMove this user to "${selectedTeam.name}"?`
      );

      if (!shouldMove) {
        return;
      }
    }

    try {
      setMemberSaving(true);
      setError("");
      setSaveMessage("");

      await adminRequest(
        `/api/users/${selectedUser.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            name: selectedUser.name,
            email: selectedUser.email,
            password: "",
            role_id: Number(
              selectedUser.role_id
            ),
            team_id: Number(
              selectedTeam.id
            ),
          }),
        }
      );

      setMemberToAdd("");

      setSaveMessage(
        `${selectedUser.name} added to ${selectedTeam.name}.`
      );

      await loadTeams(true);
    } catch (err) {
      setError(
        err?.message ||
          "Unable to add user to team."
      );
    } finally {
      setMemberSaving(false);
    }
  }

  async function removeMember(user) {
    if (!selectedTeam) {
      return;
    }

    const shouldRemove = window.confirm(
      `Remove "${user.name}" from "${selectedTeam.name}"?`
    );

    if (!shouldRemove) {
      return;
    }

    try {
      setMemberSaving(true);
      setError("");
      setSaveMessage("");

      await adminRequest(
        `/api/users/${user.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            name: user.name,
            email: user.email,
            password: "",
            role_id: Number(user.role_id),
            team_id: null,
          }),
        }
      );

      setSaveMessage(
        `${user.name} removed from ${selectedTeam.name}.`
      );

      await loadTeams(true);
    } catch (err) {
      setError(
        err?.message ||
          "Unable to remove user from team."
      );
    } finally {
      setMemberSaving(false);
    }
  }

  async function deleteTeam(team) {
    if (
      !window.confirm(
        `Delete "${team.name}"?\n\nAll users currently assigned to this team will first be unassigned.`
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSaveMessage("");

      const membersToUnassign = users.filter(
        (user) =>
          Number(user.team_id) ===
          Number(team.id)
      );

      // Step 1:
      // Remove every user's team assignment first.
      for (const user of membersToUnassign) {
        await adminRequest(
          `/api/users/${user.id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              name: user.name,
              email: user.email,
              password: "",
              role_id: Number(user.role_id),
              team_id: null,
            }),
          }
        );
      }

      // Step 2:
      // Delete the team after no users reference it.
      await adminRequest(
        `/api/teams/${team.id}`,
        {
          method: "DELETE",
        }
      );

      setTeams((current) =>
        current.filter(
          (item) =>
            Number(item.id) !==
            Number(team.id)
        )
      );

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          Number(user.team_id) ===
          Number(team.id)
            ? {
                ...user,
                team_id: null,
              }
            : user
        )
      );

      setSaveMessage(
        `"${team.name}" deleted successfully.`
      );

      closePanel();

      await loadTeams(true);
    } catch (err) {
      setError(
        err?.message ||
          "Unable to delete team."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-teams-page">
      <div className="admin-teams-content">
        <header className="admin-teams-page-header">
          <div className="admin-teams-title-block">
            <button
              type="button"
              className="admin-teams-back-link"
              onClick={onBack}
            >
              ← Dashboard
            </button>

            <p className="admin-teams-eyebrow">
              Administration
            </p>

            <h1>Teams Management</h1>

            <p className="admin-teams-subtitle">
              Organize support engineers into
              focused teams and manage team
              ownership.
            </p>
          </div>

          <div className="admin-teams-header-actions">
            <button
              type="button"
              className="admin-teams-secondary-button"
              onClick={() =>
                loadTeams(true)
              }
              disabled={refreshing}
            >
              {refreshing
                ? "Refreshing..."
                : "↻ Refresh"}
            </button>

            <button
              type="button"
              className="admin-teams-primary-button"
              onClick={openCreate}
            >
              + New Team
            </button>
          </div>
        </header>

        <section className="admin-teams-stat-grid">
          <div className="admin-teams-stat-card">
            <div className="admin-teams-stat-top">
              <span>Total Teams</span>

              <span className="admin-teams-stat-icon">
                T
              </span>
            </div>

            <strong>
              {teams.length}
            </strong>

            <span>
              Configured support teams
            </span>
          </div>

          <div className="admin-teams-stat-card">
            <div className="admin-teams-stat-top">
              <span>Teams in Use</span>

              <span className="admin-teams-stat-icon">
                U
              </span>
            </div>

            <strong>
              {usedTeams}
            </strong>

            <span>
              Teams with assigned users
            </span>
          </div>

          <div className="admin-teams-stat-card">
            <div className="admin-teams-stat-top">
              <span>
                Unassigned Users
              </span>

              <span className="admin-teams-stat-icon">
                −
              </span>
            </div>

            <strong>
              {unassignedUsers}
            </strong>

            <span>
              Users without a team
            </span>
          </div>
        </section>

        <section className="admin-teams-directory">
          <div className="admin-teams-directory-header">
            <div>
              <h2>Team Directory</h2>

              <p>
                Showing{" "}
                <strong>
                  {filteredTeams.length}
                </strong>{" "}
                of {teams.length} teams
              </p>
            </div>

            <div className="admin-teams-summary">
              <span>
                Support engineers{" "}
                <strong>
                  {
                    users.filter(
                      (user) =>
                        Number(user.role_id) ===
                          2 &&
                        user.is_active
                    ).length
                  }
                </strong>
              </span>
            </div>
          </div>

          <div className="admin-teams-filters">
            <div>
              <label htmlFor="team-search">
                Search teams
              </label>

              <input
                id="team-search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search by team name or description"
              />
            </div>
          </div>

          {error && (
            <div className="admin-teams-error">
              <strong>
                Unable to complete request
              </strong>

              <span>{error}</span>
            </div>
          )}

          {saveMessage && !selectedTeam && (
            <div className="admin-teams-success">
              {saveMessage}
            </div>
          )}

          {loading ? (
            <div className="admin-teams-state">
              <div className="admin-teams-spinner" />

              <h3>
                Loading teams...
              </h3>

              <p>
                Fetching the latest support
                team information.
              </p>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="admin-teams-state">
              <div className="admin-teams-empty-icon">
                T
              </div>

              <h3>
                {teams.length
                  ? "No teams match your search"
                  : "No teams found"}
              </h3>

              <p>
                {teams.length
                  ? "Try another search term."
                  : "Create your first support team to get started."}
              </p>

              {!teams.length && (
                <button
                  type="button"
                  className="admin-teams-primary-button"
                  onClick={openCreate}
                >
                  + Create Team
                </button>
              )}
            </div>
          ) : (
            <div className="admin-teams-table-wrap">
              <table className="admin-teams-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Team</th>
                    <th>Description</th>
                    <th>Members</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTeams.map(
                    (team) => (
                      <tr key={team.id}>
                        <td>
                          <span className="admin-teams-id">
                            #{team.id}
                          </span>
                        </td>

                        <td>
                          <div className="admin-teams-user">
                            <div className="admin-teams-avatar">
                              {getInitial(
                                team.name
                              )}
                            </div>

                            <div>
                              <strong>
                                {team.name}
                              </strong>

                              <span>
                                Team #{team.id}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="admin-teams-description">
                            {team.description ||
                              "No description"}
                          </span>
                        </td>

                        <td>
                          <span className="admin-teams-members">
                            {teamUsage.get(
                              Number(team.id)
                            ) || 0}
                          </span>
                        </td>

                        <td>
                          <span className="admin-teams-date">
                            {team.created_at
                              ? new Date(
                                  team.created_at
                                ).toLocaleDateString(
                                  "en-IN"
                                )
                              : "—"}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="admin-teams-manage-button"
                            onClick={() =>
                              openManage(
                                team
                              )
                            }
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selectedTeam && !editingTeam && (
        <div className="admin-teams-overlay">
          <aside className="admin-teams-side-panel">
            <div className="admin-teams-panel-header">
              <div>
                <p>Team Details</p>

                <h2>
                  {selectedTeam.name}
                </h2>
              </div>

              <button
                type="button"
                className="admin-teams-close"
                onClick={closePanel}
                disabled={memberSaving}
              >
                ×
              </button>
            </div>

            <div className="admin-teams-profile">
              <div className="admin-teams-large-avatar">
                {getInitial(
                  selectedTeam.name
                )}
              </div>

              <div>
                <strong>
                  {selectedTeam.name}
                </strong>

                <span>
                  Team #{selectedTeam.id}
                </span>
              </div>
            </div>

            <div className="admin-teams-detail-list">
              <div>
                <span>
                  Description
                </span>

                <strong>
                  {selectedTeam.description ||
                    "No description"}
                </strong>
              </div>

              <div>
                <span>Members</span>

                <strong>
                  {selectedTeamMembers.length}
                </strong>
              </div>

              <div>
                <span>Created</span>

                <strong>
                  {selectedTeam.created_at
                    ? new Date(
                        selectedTeam.created_at
                      ).toLocaleString(
                        "en-IN"
                      )
                    : "—"}
                </strong>
              </div>
            </div>

            <div
              style={{
                marginTop: "22px",
                paddingTop: "20px",
                borderTop:
                  "1px solid #e5e9f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "space-between",
                  gap: "12px",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      color: "#172b4d",
                      fontSize:
                        "15px",
                    }}
                  >
                    Team Members
                  </h3>

                  <p
                    style={{
                      margin:
                        "4px 0 0",
                      color:
                        "#7a869a",
                      fontSize:
                        "12px",
                    }}
                  >
                    Add or remove users
                    from this team.
                  </p>
                </div>

                <span
                  style={{
                    minWidth: "28px",
                    height: "28px",
                    padding:
                      "0 8px",
                    borderRadius:
                      "999px",
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    background:
                      "#eef4ff",
                    color:
                      "#2563eb",
                    fontSize:
                      "12px",
                    fontWeight: 700,
                  }}
                >
                  {
                    selectedTeamMembers.length
                  }
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginBottom:
                    "14px",
                }}
              >
                <select
                  value={memberToAdd}
                  onChange={(event) =>
                    setMemberToAdd(
                      event.target.value
                    )
                  }
                  disabled={memberSaving}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: "40px",
                    border:
                      "1px solid #cbd5e1",
                    borderRadius:
                      "8px",
                    padding:
                      "0 10px",
                    background:
                      "#ffffff",
                    color:
                      "#172b4d",
                    fontSize:
                      "13px",
                    outline: "none",
                  }}
                >
                  <option value="">
                    Select user to add
                  </option>

                  {availableMembers.map(
                    (user) => (
                      <option
                        key={user.id}
                        value={user.id}
                      >
                        {user.name ||
                          `User #${user.id}`}
                        {" — "}
                        {getRoleName(
                          user.role_id
                        )}
                        {user.team_id
                          ? " — move from current team"
                          : ""}
                      </option>
                    )
                  )}
                </select>

                <button
                  type="button"
                  className="admin-teams-primary-button"
                  onClick={
                    assignMember
                  }
                  disabled={
                    memberSaving ||
                    !memberToAdd
                  }
                  style={{
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  {memberSaving
                    ? "Saving..."
                    : "Add Member"}
                </button>
              </div>

              {selectedTeamMembers.length ===
              0 ? (
                <div
                  style={{
                    padding:
                      "18px",
                    border:
                      "1px dashed #d5dce6",
                    borderRadius:
                      "10px",
                    background:
                      "#fbfcfe",
                    textAlign:
                      "center",
                  }}
                >
                  <strong
                    style={{
                      display:
                        "block",
                      color:
                        "#42526e",
                      fontSize:
                        "13px",
                    }}
                  >
                    No members yet
                  </strong>

                  <span
                    style={{
                      display:
                        "block",
                      marginTop:
                        "5px",
                      color:
                        "#8993a4",
                      fontSize:
                        "12px",
                    }}
                  >
                    Select a user above
                    to add them to
                    this team.
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection:
                      "column",
                    gap: "8px",
                    maxHeight:
                      "250px",
                    overflowY:
                      "auto",
                  }}
                >
                  {selectedTeamMembers.map(
                    (user) => (
                      <div
                        key={user.id}
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap: "10px",
                          padding:
                            "10px",
                          border:
                            "1px solid #e6ebf1",
                          borderRadius:
                            "9px",
                          background:
                            "#ffffff",
                        }}
                      >
                        <div
                          style={{
                            width:
                              "32px",
                            height:
                              "32px",
                            flex:
                              "0 0 32px",
                            borderRadius:
                              "50%",
                            display:
                              "inline-flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            background:
                              "#eef4ff",
                            color:
                              "#2563eb",
                            fontSize:
                              "12px",
                            fontWeight:
                              700,
                          }}
                        >
                          {getInitial(
                            user.name
                          )}
                        </div>

                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <strong
                            style={{
                              display:
                                "block",
                              color:
                                "#172b4d",
                              fontSize:
                                "12px",
                            }}
                          >
                            {user.name ||
                              `User #${user.id}`}
                          </strong>

                          <span
                            style={{
                              display:
                                "block",
                              marginTop:
                                "2px",
                              color:
                                "#8993a4",
                              fontSize:
                                "11px",
                            }}
                          >
                            {getRoleName(
                              user.role_id
                            )}
                            {" • "}
                            {user.email ||
                              "No email"}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="admin-teams-danger-button"
                          onClick={() =>
                            removeMember(
                              user
                            )
                          }
                          disabled={
                            memberSaving
                          }
                          style={{
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {saveMessage && (
              <div
                className="admin-teams-success"
                style={{
                  marginTop:
                    "14px",
                }}
              >
                {saveMessage}
              </div>
            )}

            <div className="admin-teams-panel-actions">
              <button
                type="button"
                className="admin-teams-secondary-button"
                onClick={
                  closePanel
                }
                disabled={
                  memberSaving
                }
              >
                Close
              </button>

              <button
                type="button"
                className="admin-teams-primary-button"
                onClick={openEdit}
                disabled={
                  memberSaving
                }
              >
                Edit Team
              </button>

              <button
                type="button"
                className="admin-teams-danger-button"
                onClick={() =>
                  deleteTeam(
                    selectedTeam
                  )
                }
                disabled={
                  saving ||
                  memberSaving
                }
              >
                {saving
                  ? "Deleting..."
                  : "Delete Team"}
              </button>
            </div>
          </aside>
        </div>
      )}

      {editingTeam && (
        <div className="admin-teams-overlay">
          <div className="admin-teams-edit-modal">
            <div className="admin-teams-panel-header">
              <div>
                <p>
                  Team Management
                </p>

                <h2>
                  {selectedTeam
                    ? "Edit Team"
                    : "Create Team"}
                </h2>
              </div>

              <button
                type="button"
                className="admin-teams-close"
                onClick={
                  closePanel
                }
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form
              className="admin-teams-form"
              onSubmit={
                saveTeam
              }
            >
              <div className="admin-teams-field">
                <label htmlFor="team-name">
                  Team name
                </label>

                <input
                  id="team-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value,
                    })
                  }
                  placeholder="IT Support"
                  disabled={saving}
                  autoFocus
                />
              </div>

              <div className="admin-teams-field">
                <label htmlFor="team-description">
                  Description{" "}
                  <span>
                    Optional
                  </span>
                </label>

                <textarea
                  id="team-description"
                  value={
                    form.description
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description:
                        event.target.value,
                    })
                  }
                  placeholder="General IT support team"
                  rows={5}
                  disabled={saving}
                />
              </div>

              {error && (
                <div className="admin-teams-edit-error">
                  {error}
                </div>
              )}

              {saveMessage && (
                <div className="admin-teams-success">
                  {saveMessage}
                </div>
              )}

              <div className="admin-teams-form-footer">
                <button
                  type="button"
                  className="admin-teams-secondary-button"
                  onClick={
                    closePanel
                  }
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-teams-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : selectedTeam
                    ? "Update Team"
                    : "Create Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTeams;
import { useEffect, useMemo, useState } from "react";
import {
  getTeams,
  getUsers,
  updateUser,
} from "../services/api";
import "./AdminUsers.css";

function getStoredValue(key) {
  return (
    localStorage.getItem(key) ||
    sessionStorage.getItem(key) ||
    null
  );
}

function getStoredUser() {
  const storedUser = getStoredValue("user");

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
}

function getRoleName(roleId) {
  const roleMap = {
    1: "Employee",
    2: "Support Engineer",
    3: "Admin",
  };

  return roleMap[roleId] || "Unknown";
}

function getRoleClass(roleId) {
  const roleMap = {
    1: "employee",
    2: "engineer",
    3: "admin",
  };

  return roleMap[roleId] || "unknown";
}

function getTeamName(teamId, teams) {
  if (!teamId) {
    return "No team";
  }

  const team = teams.find(
    (item) => item.id === teamId
  );

  return team?.name || `Team ${teamId}`;
}

function getInitial(name) {
  if (!name) {
    return "?";
  }

  return name.trim().charAt(0).toUpperCase();
}

function AdminUsers({ onBack }) {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRoleId, setEditRoleId] = useState("1");
  const [editTeamId, setEditTeamId] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const [savingUser, setSavingUser] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const accessToken = getStoredValue("access_token");
  const currentUser = getStoredUser();

  async function loadUsers(showRefresh = false) {
    if (!accessToken) {
      setError(
        "Your login session has expired. Please log in again."
      );
      setLoading(false);
      return;
    }

    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [usersData, teamsData] = await Promise.all([
        getUsers(accessToken),
        getTeams(accessToken),
      ]);

      setUsers(
        Array.isArray(usersData)
          ? usersData
          : []
      );

      setTeams(
        Array.isArray(teamsData)
          ? teamsData
          : []
      );
    } catch (err) {
      setError(
        err?.message ||
          "Unable to load users."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase();

    return users.filter((user) => {
      const roleName =
        getRoleName(
          user.role_id
        ).toLowerCase();

      const teamName =
        getTeamName(
          user.team_id,
          teams
        ).toLowerCase();

      const matchesSearch =
        !value ||
        String(user.id).includes(value) ||
        String(user.name || "")
          .toLowerCase()
          .includes(value) ||
        String(user.email || "")
          .toLowerCase()
          .includes(value) ||
        roleName.includes(value) ||
        teamName.includes(value);

      const matchesRole =
        roleFilter === "ALL" ||
        String(user.role_id) === roleFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        (
          statusFilter === "ACTIVE" &&
          user.is_active === true
        ) ||
        (
          statusFilter === "INACTIVE" &&
          user.is_active === false
        );

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus
      );
    });
  }, [
    users,
    teams,
    search,
    roleFilter,
    statusFilter,
  ]);

  const totalUsers = users.length;

  const activeUsers = users.filter(
    (user) => user.is_active === true
  ).length;

  const inactiveUsers = users.filter(
    (user) => user.is_active === false
  ).length;

  const employeeCount = users.filter(
    (user) => user.role_id === 1
  ).length;

  const engineerCount = users.filter(
    (user) => user.role_id === 2
  ).length;

  const adminCount = users.filter(
    (user) => user.role_id === 3
  ).length;

  function handleManageUser(user) {
    setSelectedUser(user);
    setSaveError("");
    setSaveSuccess("");
  }

  function handleCloseUserPanel() {
    setSelectedUser(null);
  }

  function handleOpenEditUser() {
    if (!selectedUser) {
      return;
    }

    setEditName(selectedUser.name || "");
    setEditEmail(selectedUser.email || "");
    setEditRoleId(
      String(selectedUser.role_id || 1)
    );
    setEditTeamId(
      selectedUser.team_id
        ? String(selectedUser.team_id)
        : ""
    );
    setEditPassword("");

    setSaveError("");
    setSaveSuccess("");
    setEditingUser(true);
  }

  function handleCloseEditUser() {
    setEditingUser(false);
    setSaveError("");
    setSaveSuccess("");
  }

  async function handleSaveUser(event) {
    event.preventDefault();

    if (!selectedUser) {
      return;
    }

    const name = editName.trim();
    const email = editEmail.trim();

    if (name.length < 2) {
      setSaveError(
        "Name must contain at least 2 characters."
      );
      return;
    }

    if (!email) {
      setSaveError(
        "Email address is required."
      );
      return;
    }

    setSavingUser(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const updatedUser = await updateUser(
        accessToken,
        selectedUser.id,
        {
          name,
          email,
          password: editPassword.trim(),
          role_id: Number(editRoleId),
          team_id:
            editTeamId === ""
              ? null
              : Number(editTeamId),
        }
      );

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === updatedUser.id
            ? updatedUser
            : user
        )
      );

      setSelectedUser(updatedUser);
      setEditingUser(false);
      setEditPassword("");

      setSaveSuccess(
        "User updated successfully."
      );
    } catch (err) {
      setSaveError(
        err?.message ||
          "Unable to update user."
      );
    } finally {
      setSavingUser(false);
    }
  }

  if (
    !currentUser ||
    currentUser.role_id !== 3
  ) {
    return (
      <div className="admin-users-page">
        <div className="admin-users-access-card">
          <div className="admin-users-access-icon">
            !
          </div>

          <h2>Access denied</h2>

          <p>
            Only administrators can access
            user management.
          </p>

          <button
            type="button"
            onClick={onBack}
            className="admin-users-back-button"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-users-page">
      <div className="admin-users-content">
        <header className="admin-users-page-header">
          <div className="admin-users-title-block">
            <button
              type="button"
              className="admin-users-back-link"
              onClick={onBack}
            >
              ← Dashboard
            </button>

            <p className="admin-users-eyebrow">
              Administration
            </p>

            <h1>Users Management</h1>

            <p className="admin-users-subtitle">
              Manage employees, support engineers,
              and administrators.
            </p>
          </div>

          <button
            type="button"
            className="admin-users-refresh-button"
            onClick={() => loadUsers(true)}
            disabled={refreshing}
          >
            <span className="admin-users-refresh-icon">
              ↻
            </span>

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </header>

        <section className="admin-users-stat-grid">
          <div className="admin-users-stat-card">
            <div className="admin-users-stat-top">
              <span className="admin-users-stat-label">
                Total Users
              </span>

              <span className="admin-users-stat-icon">
                U
              </span>
            </div>

            <strong className="admin-users-stat-value">
              {totalUsers}
            </strong>

            <span className="admin-users-stat-description">
              All registered users
            </span>
          </div>

          <div className="admin-users-stat-card">
            <div className="admin-users-stat-top">
              <span className="admin-users-stat-label">
                Active
              </span>

              <span className="admin-users-stat-icon">
                ✓
              </span>
            </div>

            <strong className="admin-users-stat-value">
              {activeUsers}
            </strong>

            <span className="admin-users-stat-description">
              Currently active
            </span>
          </div>

          <div className="admin-users-stat-card">
            <div className="admin-users-stat-top">
              <span className="admin-users-stat-label">
                Inactive
              </span>

              <span className="admin-users-stat-icon">
                −
              </span>
            </div>

            <strong className="admin-users-stat-value">
              {inactiveUsers}
            </strong>

            <span className="admin-users-stat-description">
              Currently disabled
            </span>
          </div>

          <div className="admin-users-stat-card">
            <div className="admin-users-stat-top">
              <span className="admin-users-stat-label">
                Engineers
              </span>

              <span className="admin-users-stat-icon">
                E
              </span>
            </div>

            <strong className="admin-users-stat-value">
              {engineerCount}
            </strong>

            <span className="admin-users-stat-description">
              Support engineers
            </span>
          </div>
        </section>

        <section className="admin-users-directory">
          <div className="admin-users-directory-header">
            <div>
              <h2>User Directory</h2>

              <p>
                Showing{" "}
                <strong>
                  {filteredUsers.length}
                </strong>{" "}
                of {totalUsers} users
              </p>
            </div>

            <div className="admin-users-role-summary">
              <div className="admin-users-role-count">
                <span>Employees</span>
                <strong>
                  {employeeCount}
                </strong>
              </div>

              <div className="admin-users-role-count">
                <span>Engineers</span>
                <strong>
                  {engineerCount}
                </strong>
              </div>

              <div className="admin-users-role-count">
                <span>Admins</span>
                <strong>
                  {adminCount}
                </strong>
              </div>
            </div>
          </div>

          <div className="admin-users-filters">
            <div className="admin-users-search-field">
              <label htmlFor="user-search">
                Search users
              </label>

              <div className="admin-users-input-wrap">
                <span className="admin-users-input-icon">
                  ⌕
                </span>

                <input
                  id="user-search"
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search by name, email, role or team"
                />
              </div>
            </div>

            <div className="admin-users-filter-field">
              <label htmlFor="user-role-filter">
                Role
              </label>

              <select
                id="user-role-filter"
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(
                    event.target.value
                  )
                }
              >
                <option value="ALL">
                  All roles
                </option>

                <option value="1">
                  Employee
                </option>

                <option value="2">
                  Support Engineer
                </option>

                <option value="3">
                  Admin
                </option>
              </select>
            </div>

            <div className="admin-users-filter-field">
              <label htmlFor="user-status-filter">
                Status
              </label>

              <select
                id="user-status-filter"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
              >
                <option value="ALL">
                  All statuses
                </option>

                <option value="ACTIVE">
                  Active
                </option>

                <option value="INACTIVE">
                  Inactive
                </option>
              </select>
            </div>
          </div>

          {error && (
            <div className="admin-users-error-banner">
              <div>
                <strong>
                  Unable to load users
                </strong>

                <span>{error}</span>
              </div>

              <button
                type="button"
                onClick={() =>
                  loadUsers(true)
                }
              >
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="admin-users-loading">
              <div className="admin-users-spinner" />

              <h3>
                Loading users...
              </h3>

              <p>
                Fetching the latest user
                information.
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="admin-users-empty">
              <div className="admin-users-empty-icon">
                U
              </div>

              <h3>
                No users found
              </h3>

              <p>
                Try changing your search or
                filters.
              </p>
            </div>
          ) : (
            <>
              <div className="admin-users-desktop-table">
                <table className="admin-users-table">
                  <colgroup>
                    <col className="users-col-id" />
                    <col className="users-col-user" />
                    <col className="users-col-email" />
                    <col className="users-col-role" />
                    <col className="users-col-team" />
                    <col className="users-col-status" />
                    <col className="users-col-action" />
                  </colgroup>

                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Team</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredUsers.map(
                      (user) => (
                        <tr key={user.id}>
                          <td>
                            <span className="admin-users-id">
                              #{user.id}
                            </span>
                          </td>

                          <td>
                            <div className="admin-users-user">
                              <div className="admin-users-avatar">
                                {getInitial(
                                  user.name
                                )}
                              </div>

                              <div className="admin-users-user-text">
                                <strong>
                                  {user.name ||
                                    "Unnamed User"}
                                </strong>

                                <span>
                                  User #{user.id}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="admin-users-email">
                              {user.email ||
                                "No email"}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`admin-users-role-badge ${getRoleClass(
                                user.role_id
                              )}`}
                            >
                              {getRoleName(
                                user.role_id
                              )}
                            </span>
                          </td>

                          <td>
                            <span className="admin-users-team">
                              {getTeamName(
                                user.team_id,
                                teams
                              )}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`admin-users-status ${
                                user.is_active
                                  ? "active"
                                  : "inactive"
                              }`}
                            >
                              <span className="admin-users-status-dot" />

                              {user.is_active
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="admin-users-manage-button"
                              onClick={() =>
                                handleManageUser(
                                  user
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

              <div className="admin-users-mobile-list">
                {filteredUsers.map(
                  (user) => (
                    <div
                      className="admin-users-mobile-card"
                      key={user.id}
                    >
                      <div className="admin-users-mobile-header">
                        <div className="admin-users-user">
                          <div className="admin-users-avatar">
                            {getInitial(
                              user.name
                            )}
                          </div>

                          <div className="admin-users-user-text">
                            <strong>
                              {user.name ||
                                "Unnamed User"}
                            </strong>

                            <span>
                              User #{user.id}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`admin-users-status ${
                            user.is_active
                              ? "active"
                              : "inactive"
                          }`}
                        >
                          <span className="admin-users-status-dot" />

                          {user.is_active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </div>

                      <div className="admin-users-mobile-info">
                        <div>
                          <span>Email</span>

                          <strong>
                            {user.email ||
                              "No email"}
                          </strong>
                        </div>

                        <div>
                          <span>Role</span>

                          <strong>
                            {getRoleName(
                              user.role_id
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>Team</span>

                          <strong>
                            {getTeamName(
                              user.team_id,
                              teams
                            )}
                          </strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="admin-users-mobile-manage"
                        onClick={() =>
                          handleManageUser(
                            user
                          )
                        }
                      >
                        Manage User
                      </button>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </section>

        {selectedUser && (
          <div className="admin-users-overlay">
            <aside className="admin-users-details-panel">
              <div className="admin-users-details-header">
                <div>
                  <p>
                    User Details
                  </p>

                  <h2>
                    {selectedUser.name ||
                      "Unnamed User"}
                  </h2>
                </div>

                <button
                  type="button"
                  className="admin-users-details-close"
                  onClick={
                    handleCloseUserPanel
                  }
                  aria-label="Close user details"
                >
                  ×
                </button>
              </div>

              <div className="admin-users-details-profile">
                <div className="admin-users-details-avatar">
                  {getInitial(
                    selectedUser.name
                  )}
                </div>

                <div>
                  <strong>
                    {selectedUser.name ||
                      "Unnamed User"}
                  </strong>

                  <span>
                    User #{selectedUser.id}
                  </span>
                </div>
              </div>

              <div className="admin-users-details-status-row">
                <span>Status</span>

                <span
                  className={`admin-users-status ${
                    selectedUser.is_active
                      ? "active"
                      : "inactive"
                  }`}
                >
                  <span className="admin-users-status-dot" />

                  {selectedUser.is_active
                    ? "Active"
                    : "Inactive"}
                </span>
              </div>

              <div className="admin-users-details-list">
                <div className="admin-users-detail-item">
                  <span>Email</span>

                  <strong>
                    {selectedUser.email ||
                      "No email"}
                  </strong>
                </div>

                <div className="admin-users-detail-item">
                  <span>Role</span>

                  <strong>
                    {getRoleName(
                      selectedUser.role_id
                    )}
                  </strong>
                </div>

                <div className="admin-users-detail-item">
                  <span>Team</span>

                  <strong>
                    {getTeamName(
                      selectedUser.team_id,
                      teams
                    )}
                  </strong>
                </div>

                <div className="admin-users-detail-item">
                  <span>User ID</span>

                  <strong>
                    #{selectedUser.id}
                  </strong>
                </div>
              </div>

              {saveSuccess && !editingUser && (
                <div className="admin-users-save-success">
                  {saveSuccess}
                </div>
              )}

              <div className="admin-users-details-actions">
                <button
                  type="button"
                  className="admin-users-details-secondary"
                  onClick={
                    handleCloseUserPanel
                  }
                >
                  Close
                </button>

                <button
                  type="button"
                  className="admin-users-details-primary"
                  onClick={
                    handleOpenEditUser
                  }
                >
                  Edit User
                </button>
              </div>
            </aside>
          </div>
        )}

        {editingUser && selectedUser && (
          <div className="admin-users-overlay">
            <div className="admin-users-edit-modal">
              <div className="admin-users-edit-header">
                <div>
                  <p>
                    User Management
                  </p>

                  <h2>
                    Edit User
                  </h2>

                  <span>
                    Update information for{" "}
                    {selectedUser.name ||
                      `User #${selectedUser.id}`}
                  </span>
                </div>

                <button
                  type="button"
                  className="admin-users-details-close"
                  onClick={
                    handleCloseEditUser
                  }
                  disabled={savingUser}
                  aria-label="Close edit form"
                >
                  ×
                </button>
              </div>

              <form
                className="admin-users-edit-form"
                onSubmit={
                  handleSaveUser
                }
              >
                <div className="admin-users-form-row">
                  <div className="admin-users-form-field">
                    <label htmlFor="edit-user-name">
                      Name
                    </label>

                    <input
                      id="edit-user-name"
                      type="text"
                      value={editName}
                      onChange={(event) =>
                        setEditName(
                          event.target.value
                        )
                      }
                      placeholder="Enter user name"
                      disabled={savingUser}
                    />
                  </div>

                  <div className="admin-users-form-field">
                    <label htmlFor="edit-user-email">
                      Email
                    </label>

                    <input
                      id="edit-user-email"
                      type="email"
                      value={editEmail}
                      onChange={(event) =>
                        setEditEmail(
                          event.target.value
                        )
                      }
                      placeholder="Enter email address"
                      disabled={savingUser}
                    />
                  </div>
                </div>

                <div className="admin-users-form-row">
                  <div className="admin-users-form-field">
                    <label htmlFor="edit-user-role">
                      Role
                    </label>

                    <select
                      id="edit-user-role"
                      value={editRoleId}
                      onChange={(event) =>
                        setEditRoleId(
                          event.target.value
                        )
                      }
                      disabled={savingUser}
                    >
                      <option value="1">
                        Employee
                      </option>

                      <option value="2">
                        Support Engineer
                      </option>

                      <option value="3">
                        Admin
                      </option>
                    </select>
                  </div>

                  <div className="admin-users-form-field">
                    <label htmlFor="edit-user-team">
                      Team
                    </label>

                    <select
                      id="edit-user-team"
                      value={editTeamId}
                      onChange={(event) =>
                        setEditTeamId(
                          event.target.value
                        )
                      }
                      disabled={savingUser}
                    >
                      <option value="">
                        No team
                      </option>

                      {teams.map(
                        (team) => (
                          <option
                            key={team.id}
                            value={team.id}
                          >
                            {team.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                <div className="admin-users-form-field">
                  <label htmlFor="edit-user-password">
                    New Password
                    <span>
                      Optional
                    </span>
                  </label>

                  <input
                    id="edit-user-password"
                    type="password"
                    value={editPassword}
                    onChange={(event) =>
                      setEditPassword(
                        event.target.value
                      )
                    }
                    placeholder="Leave blank to keep current password"
                    disabled={savingUser}
                  />

                  <small>
                    Only enter a password when
                    you want to change it.
                  </small>
                </div>

                {saveError && (
                  <div className="admin-users-edit-error">
                    {saveError}
                  </div>
                )}

                <div className="admin-users-edit-footer">
                  <button
                    type="button"
                    className="admin-users-details-secondary"
                    onClick={
                      handleCloseEditUser
                    }
                    disabled={savingUser}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="admin-users-details-primary"
                    disabled={savingUser}
                  >
                    {savingUser
                      ? "Saving..."
                      : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminUsers;
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  const accessToken =
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token");

  const storedUser =
    localStorage.getItem("user") ||
    sessionStorage.getItem("user");

  let user = null;

  try {
    user = storedUser
      ? JSON.parse(storedUser)
      : null;
  } catch {
    user = null;
  }

  if (!accessToken || !user) {
    return <Login />;
  }

  /*
   * Administrator
   */
  if (user.role_id === 3) {
    return <AdminDashboard />;
  }

  /*
   * Support Engineer
   *
   * The existing Dashboard already loads
   * tickets assigned to the logged-in engineer.
   */
  if (user.role_id === 2) {
    return <Dashboard />;
  }

  /*
   * Employee
   */
  if (user.role_id === 1) {
    return <Dashboard />;
  }

  /*
   * Unknown role
   *
   * Clear the invalid session so the user
   * returns to the login page.
   */
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");

  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("user");

  return <Login />;
}

export default App;
import logo from "./logo.svg";
// import "./App.css";
import { useAuth0 } from "@auth0/auth0-react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";
import LoginButton from "./components/LoginButton";
import LogoutButton from "./components/LogoutButton";
import HomePage from "./components/Homepage";
import ProfilePage from "./components/Profilepage";
import SyllabusFormPage from "./components/SyllabusFormPage"; // ⬅️ NEW
import Board from "./components/Board";

const AuthButtons = () => {
  const { isAuthenticated } = useAuth0();

  return isAuthenticated ? <LogoutButton /> : <LoginButton />;
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) return <p>Loading...</p>;
  if (!isAuthenticated) return <Navigate to="/" replace />;

  return children;
};


function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
            <nav className="flex items-center gap-4">
              <Link to="/" className="font-medium hover:text-blue-700">
                Home
              </Link>
              <Link to="/profile" className="font-medium hover:text-blue-700">
                Profile
              </Link>
              <Link to="/syllabus-form" className="font-medium hover:text-blue-700">
                Syllabus
              </Link>
              <Link to="/board" className="font-medium hover:text-blue-700">
                Board
              </Link>
            </nav>
            <AuthButtons />
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/syllabus-form"
              element={
                <ProtectedRoute>
                  <SyllabusFormPage />
                </ProtectedRoute>
              }
            />
            <Route
            path="/board"
              element={
                <Board />
              }
            
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

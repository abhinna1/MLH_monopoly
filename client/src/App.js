import logo from "./logo.svg";
import "./App.css";
import { useAuth0 } from "@auth0/auth0-react";
// import { LoginButton } from './LoginButton.js';

const LoginButton = () => {
  const { loginWithRedirect } = useAuth0();

  return <button onClick={() => loginWithRedirect()}>Log In</button>;
};

const LogoutButton = () => {
  const { logout } = useAuth0();
  return (
    <button
      onClick={() =>
        logout({ logoutParams: { returnTo: window.location.origin } })
      }
      className="button logout"
    >
      Log Out
    </button>
  );
};

function App() {
  const { isAuthenticated, isLoading, user, loginWithRedirect, logout } =
    useAuth0();
  return (
    <div className="App">
      <header className="App-header">
        {process.env.REACT_APP_AUTH0_CLIENT_ID}
        <img src={logo} className="App-logo" alt="logo" />
        {isAuthenticated ? (
          <>
            <p>Welcome! {user.name}</p>
            <LogoutButton />
          </>
        ) : (
          <>
            <p>Please log in to continue.</p>
            <LoginButton />
          </>
        )}
      </header>
    </div>
  );
}

export default App;

// components/StudentBootstrap.jsx
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useRef } from "react";

export default function StudentBootstrap() {
  const { isAuthenticated, isLoading, user, loginWithRedirect } = useAuth0();
  const fired = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      fired.current = false; // reset when logged out
      return;
    }
    if (fired.current) return;
    fired.current = true;

    (async () => {
      try {
        // Your backend creates/ensures the (singleton) student here
        await fetch(`${process.env.REACT_APP_SERVER_URL}/api/student`, { method: "POST" });
        console.log("Student ensured for:", user?.sub);
      } catch (e) {
        console.error("Failed to init student:", e);
        fired.current = false; // allow retry if you want
      }
    })();
  }, [isAuthenticated, isLoading, user]);

    return <button onClick={() => loginWithRedirect()}>Log In</button>;

}

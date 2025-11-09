import { useAuth0 } from "@auth0/auth0-react";

const HomePage = () => {
  const { isAuthenticated, user } = useAuth0();

  return (
    <>
      <p>
        {isAuthenticated
          ? `Welcome! ${user.name}`
          : "Please log in to continue."}
      </p>
    </>
  );
};

export default HomePage;
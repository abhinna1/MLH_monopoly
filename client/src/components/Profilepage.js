import { useAuth0 } from "@auth0/auth0-react";

const ProfilePage = () => {
  const { user } = useAuth0();

  return (
    <>
      <h2>Profile</h2>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </>
  );
};

export default ProfilePage;
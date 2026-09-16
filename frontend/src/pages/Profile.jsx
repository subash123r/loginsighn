import { useEffect, useState } from "react";
import { getProfile } from "../services/authService";
import { useNavigate } from "react-router-dom";

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getProfile();
        setUser(data.user);
      } catch (error) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    };

    fetchProfile();
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  if (!user) {
    return <p className="loading">Loading...</p>;
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        <h1>My Profile</h1>

        <div className="profile-info">
          <p>
            <strong>Name:</strong> {user.name}
          </p>

          <p>
            <strong>Email:</strong> {user.email}
          </p>
        </div>

        <button onClick={logout}>Logout</button>
      </div>
    </div>
  );
}

export default Profile;
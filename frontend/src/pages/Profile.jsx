
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500"></div>

          <p className="text-sm text-slate-400">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 py-8">

      <div className="w-full max-w-md">

        {/* Header */}
        <div className="mb-8 text-center">

          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-3xl font-bold text-white shadow-xl shadow-indigo-600/30">
            {user.name?.charAt(0).toUpperCase()}
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white">
            My Profile
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Manage your account
          </p>
        </div>

        {/* Profile Card */}
        <div className="rounded-2xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">

          {/* User Info */}
          <div className="space-y-4">

            {/* Name */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                Full Name
              </p>

              <p className="text-base font-semibold text-white">
                {user.name}
              </p>
            </div>

            {/* Email */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                Email Address
              </p>

              <p className="break-all text-base font-semibold text-white">
                {user.email}
              </p>
            </div>

          </div>

          {/* Buttons */}
          <div className="mt-7 space-y-3">

            {/* Dashboard */}
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-600/20 transition duration-200 hover:bg-indigo-500 hover:shadow-indigo-500/30 active:scale-[0.98]"
            >
              Go to Dashboard
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              className="w-full rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 font-semibold text-red-400 transition duration-200 hover:bg-red-500/20 hover:text-red-300 active:scale-[0.98]"
            >
              Logout
            </button>

          </div>

        </div>

        {/* Bottom Text */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Your account information
        </p>

      </div>
    </div>
  );
}

export default Profile;


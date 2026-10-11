import { Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import Home from "./pages/Home";
import Navigation from "./components/Navigation";
import Detail from "./pages/Detail";
import Watch from "./pages/Watch";
import Search from "./pages/Search";
import Library from "./pages/Library";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import { useAuth } from "./lib/auth";

function Splash() {
  return <div className="min-h-screen bg-[#141218]" />;
}

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Splash />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <>
      <nav>
        <Navigation />
      </nav>
      <Outlet />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/library" element={<Library />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/detail/:slug" element={<Detail />} />
        <Route path="/watch/:slug" element={<Watch />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

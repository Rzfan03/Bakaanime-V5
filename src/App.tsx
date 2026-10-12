import { useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { SplashScreen } from "@capacitor/splash-screen";
import Home from "./pages/Home";
import Navigation from "./components/Navigation";
import Detail from "./pages/Detail";
import Watch from "./pages/Watch";
import Search from "./pages/Search";
import Library from "./pages/Library";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import { useAuth } from "./lib/auth";

const MIN_SPLASH_MS = 1500;

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

function Splash() {
  const reduce = usePrefersReducedMotion();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // sembunyikan splash native begitu splash React sudah tampil
    void SplashScreen.hide();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#141218]">
      {!reduce && !failed && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/splash.mp4" type="video/mp4" />
        </video>
      )}
      <div className="absolute inset-0 bg-[#141218]/40" />
      <h1 className="splash-wordmark relative text-4xl font-extrabold tracking-tight text-[#E6E0E9]">
        Baka<span className="text-[#D0BCFF]">Anime</span>
      </h1>
    </div>
  );
}

function ProtectedLayout() {
  const { user } = useAuth();
  const location = useLocation();

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
  const { loading } = useAuth();
  const [minPassed, setMinPassed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinPassed(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  if (loading || !minPassed) return <Splash />;

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

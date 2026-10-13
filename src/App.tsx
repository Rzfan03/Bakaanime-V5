import { useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import Home from "./pages/Home";
import Navigation from "./components/Navigation";
import Detail from "./pages/Detail";
import Watch from "./pages/Watch";
import Search from "./pages/Search";
import Library from "./pages/Library";
import Genres from "./pages/Genres";
import Genre from "./pages/Genre";
import Schedule from "./pages/Schedule";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import SplashScreen from "./components/SplashScreen";
import PageTransition from "./components/PageTransition";
import { useAuth } from "./lib/auth";
import { useSettings } from "./lib/settings";
import { runNotifCheck } from "./lib/notifications";
import { AuthenticateWithRedirectCallback } from "@clerk/react";

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <>
      <nav>
        <Navigation />
      </nav>
      <PageTransition>
        <Outlet />
      </PageTransition>
    </>
  );
}

export default function App() {
  const { loading } = useAuth();
  const { settings } = useSettings();
  const [splashDone, setSplashDone] = useState(false);
  const navigate = useNavigate();

  // Android back button: go back a page, only exit at the root.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handle = CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) navigate(-1);
      else void CapacitorApp.exitApp();
    });
    return () => {
      void handle.then((h) => h.remove());
    };
  }, [navigate]);

  // New-episode notifications for Library anime: on launch, native resume, and
  // when the web tab becomes visible again.
  useEffect(() => {
    if (!settings.notifications) return;
    const run = () => void runNotifCheck().catch(() => {});
    run();

    let removeResume: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      void CapacitorApp.addListener("resume", run).then((h) => {
        removeResume = () => void h.remove();
      });
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      removeResume?.();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [settings.notifications]);

  if (window.location.pathname === "/sso-callback") {
    return (
      <Routes>
        <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback />} />
      </Routes>
    );
  }

  if (loading || !splashDone) return <SplashScreen onDone={() => setSplashDone(true)} />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/genres" element={<Genres />} />
        <Route path="/genre/:slug" element={<Genre />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/library" element={<Library />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/detail/:slug" element={<Detail />} />
        <Route path="/watch/:slug" element={<Watch />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
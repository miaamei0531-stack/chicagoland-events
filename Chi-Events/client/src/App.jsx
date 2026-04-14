import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useThemeStore } from './store/theme.js';
import { useAuth } from './hooks/useAuth.js';
import Home from './pages/Home.jsx';
import MySubmissions from './pages/MySubmissions.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Collections from './pages/Collections.jsx';
import Messages from './pages/Messages.jsx';
import ChatView from './components/Messaging/ChatView.jsx';
import TripView from './pages/TripView.jsx';
import MyTrips from './pages/MyTrips.jsx';
import Profile from './pages/Profile.jsx';
import BlockList from './pages/BlockList.jsx';
import Preferences from './pages/Preferences.jsx';
import PlanShare from './pages/PlanShare.jsx';
import BottomNav from './components/Layout/BottomNav.jsx';
import OnboardingModal from './components/Onboarding/OnboardingModal.jsx';

export default function App() {
  const dark = useThemeStore((s) => s.dark);
  const { user, profile } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // Show onboarding modal once when a logged-in user hasn't completed it
  useEffect(() => {
    if (user && profile && profile.onboarding_complete === false) {
      setShowOnboarding(true);
    }
  }, [user, profile]);

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/my-submissions" element={<MySubmissions />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/messages" element={<Messages />}>
          <Route path=":id" element={<ChatView />} />
        </Route>
        <Route path="/trip/:id" element={<TripView />} />
        <Route path="/my-trips" element={<MyTrips />} />
        <Route path="/profile/me" element={<Profile />} />
        <Route path="/profile/:userId" element={<Profile />} />
        <Route path="/settings/blocks" element={<BlockList />} />
        <Route path="/preferences" element={<Preferences />} />
        <Route path="/plan/share/:token" element={<PlanShare />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
      <BottomNav />
      {showOnboarding && (
        <OnboardingModal onComplete={() => setShowOnboarding(false)} />
      )}
    </>
  );
}

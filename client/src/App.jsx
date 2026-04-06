import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useThemeStore } from './store/theme.js';
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
import BottomNav from './components/Layout/BottomNav.jsx';

export default function App() {
  const dark = useThemeStore((s) => s.dark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

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
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
      <BottomNav />
    </>
  );
}

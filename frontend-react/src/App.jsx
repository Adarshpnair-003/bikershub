import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isLoggedIn } from './utils/auth.js';

import Splash from './pages/Splash.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Home from './pages/Home.jsx';
import Profile from './pages/Profile.jsx';
import UserProfile from './pages/UserProfile.jsx';
import EditProfile from './pages/EditProfile.jsx';

import Clubs from './pages/Clubs.jsx';
import ClubDetail from './pages/ClubDetail.jsx';
import CreateClub from './pages/CreateClub.jsx';

import Search from './pages/Search.jsx';
import Maps from './pages/Maps.jsx';

import Notifications from './pages/Notifications.jsx';
import Conversations from './pages/Conversations.jsx';
import Chat from './pages/Chat.jsx';

import CreatePost from './pages/CreatePost.jsx';
import PostDetail from './pages/PostDetail.jsx';

import CreateRide from './pages/CreateRide.jsx';
import RideDetail from './pages/RideDetail.jsx';

import AddBike from './pages/AddBike.jsx';
import EditBike from './pages/EditBike.jsx';
import BikeDetail from './pages/BikeDetail.jsx';

import CreateStory from './pages/CreateStory.jsx';
import StoryViewer from './pages/StoryViewer.jsx';

function RequireAuth({ children }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={isLoggedIn() ? <Navigate to="/home" replace /> : <Splash />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Auth-required routes */}
        <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/edit-profile" element={<RequireAuth><EditProfile /></RequireAuth>} />
        <Route path="/user/:id" element={<RequireAuth><UserProfile /></RequireAuth>} />

        <Route path="/clubs" element={<RequireAuth><Clubs /></RequireAuth>} />
        <Route path="/clubs/:id" element={<RequireAuth><ClubDetail /></RequireAuth>} />
        <Route path="/create-club" element={<RequireAuth><CreateClub /></RequireAuth>} />

        <Route path="/search" element={<RequireAuth><Search /></RequireAuth>} />
        <Route path="/maps" element={<RequireAuth><Maps /></RequireAuth>} />

        <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
        <Route path="/conversations" element={<RequireAuth><Conversations /></RequireAuth>} />
        <Route path="/chat/:id" element={<RequireAuth><Chat /></RequireAuth>} />

        <Route path="/create-post" element={<RequireAuth><CreatePost /></RequireAuth>} />
        <Route path="/posts/:id" element={<RequireAuth><PostDetail /></RequireAuth>} />

        <Route path="/create-ride" element={<RequireAuth><CreateRide /></RequireAuth>} />
        <Route path="/rides/:id" element={<RequireAuth><RideDetail /></RequireAuth>} />

        <Route path="/add-bike" element={<RequireAuth><AddBike /></RequireAuth>} />
        <Route path="/edit-bike/:id" element={<RequireAuth><EditBike /></RequireAuth>} />
        <Route path="/garage/:userId/:bikeId" element={<RequireAuth><BikeDetail /></RequireAuth>} />

        <Route path="/create-story" element={<RequireAuth><CreateStory /></RequireAuth>} />
        <Route path="/stories/:userId" element={<RequireAuth><StoryViewer /></RequireAuth>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

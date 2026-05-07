import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import PostCard from '../components/PostCard.jsx';
import TabBar from '../components/TabBar.jsx';

const CREATE_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const MESSAGE_ICON = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f9fafb" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

export default function Home() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState(null); // null = loading
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.get('/api/posts/feed?page=1&limit=20');
        if (cancelled) return;
        if (res.success && res.data?.posts) {
          setPosts(res.data.posts);
        } else if (res.success && Array.isArray(res.data)) {
          setPosts(res.data);
        } else {
          setError(res.error?.message || 'Failed to load feed.');
          setPosts([]);
        }
      } catch {
        if (!cancelled) {
          setError('Network error.');
          setPosts([]);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="page-dark">
      <header className="app-header">
        <div className="app-header-left">
          <button
            className="home-create-btn"
            onClick={() => navigate('/create-post')}
            aria-label="New post"
          >
            {CREATE_ICON}
          </button>
        </div>
        <Link to="/notifications" className="app-header-title-btn">BIKERS HUB</Link>
        <div className="app-header-actions">
          <button
            className="app-header-btn"
            onClick={() => navigate('/conversations')}
            aria-label="Messages"
          >
            {MESSAGE_ICON}
          </button>
        </div>
      </header>

      <div id="post-feed">
        {posts === null && (
          <div className="post-card-dark" style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>
            Loading posts…
          </div>
        )}
        {posts && posts.length === 0 && !error && (
          <div className="post-card-dark" style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
            No posts yet. <Link to="/create-post" style={{ color: '#E53935' }}>Create one</Link>?
          </div>
        )}
        {posts && error && (
          <div className="post-card-dark" style={{ padding: 20, textAlign: 'center', color: '#E53935' }}>
            {error}
          </div>
        )}
        {posts && posts.map((post) => <PostCard key={post._id} post={post} />)}
      </div>

      <TabBar />
    </div>
  );
}

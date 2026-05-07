import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storyApi } from '../utils/storyApi.js';
import { getCurrentUser } from '../utils/auth.js';

export default function StoryTray() {
  const navigate = useNavigate();
  const me = getCurrentUser();
  const [groups, setGroups] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await storyApi.feed();
        if (cancelled) return;
        setGroups(res?.success && Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!cancelled) setGroups([]);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (groups === null) {
    return <div className="story-tray"><div className="story-tray-loading">Loading…</div></div>;
  }

  const myGroup = groups.find((g) => String(g.user?._id || g.user?.id) === String(me?.id));
  const others = groups.filter((g) => String(g.user?._id || g.user?.id) !== String(me?.id));

  return (
    <div className="story-tray">
      <div className="story-tray-row">
        <button
          type="button"
          className="story-item compose"
          onClick={() => myGroup ? navigate(`/stories/${me.id}`) : navigate('/create-story')}
        >
          <div className="story-ring compose">
            {myGroup?.user?.profilePic
              ? <img src={myGroup.user.profilePic} alt="" />
              : <span className="story-ring-fallback">+</span>
            }
            <span className="story-ring-plus">+</span>
          </div>
          <div className="story-name">Your story</div>
        </button>

        {others.map((g) => {
          const u = g.user || {};
          const username = u.username || 'rider';
          return (
            <button
              key={u._id || u.id}
              type="button"
              className="story-item"
              onClick={() => navigate(`/stories/${u._id || u.id}`)}
            >
              <div className={`story-ring ${g.allViewed ? 'viewed' : 'fresh'}`}>
                {u.profilePic
                  ? <img src={u.profilePic} alt={username} />
                  : <span className="story-ring-fallback">{username.charAt(0).toUpperCase()}</span>
                }
              </div>
              <div className="story-name">{username}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

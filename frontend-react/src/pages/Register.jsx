import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { setTokens, setCurrentUser } from '../utils/auth.js';

export default function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!username || !email || !password) {
      setError('All fields are required.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post('/api/auth/register', { username: username.trim(), email: email.trim(), password });
      if (res.success && res.data?.token && res.data?.user) {
        setTokens(res.data.token, res.data.refreshToken);
        setCurrentUser(res.data.user.id, res.data.user.username);
        navigate('/home');
      } else {
        setError(res.error?.message || 'Registration failed.');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Join the ride</p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <label className="auth-field">
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              minLength={3}
              maxLength={30}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="auth-foot">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}

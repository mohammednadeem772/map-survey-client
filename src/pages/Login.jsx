// Login form — on success, stores the JWT + user profile and redirects to
// the dashboard. The API's JWT payload shape is { id, name, email, role, areaId }.
import React, { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../App';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { setUser } = useAuth();
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('map_token', data.token);
      localStorage.setItem('map_user', JSON.stringify(data.user));
      setUser(data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth" onSubmit={submit}>
        <Link to="/">← Home</Link>
        <h1>Team login</h1>
        <p>Surveyor, Supervisor and Admin access is automatically applied after sign-in.</p>

        {error && <div className="error">{error}</div>}

        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </label>

        <button className="btn">Sign in</button>
      </form>
    </div>
  );
}

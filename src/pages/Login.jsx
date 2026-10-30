// Login form — on success, stores the JWT + user profile and redirects to
// the dashboard. The API's JWT payload shape is { id, name, email, role, areaId }.
import React, { useState } from 'react';
import { Mail, Lock, ShieldCheck, Users, BarChart3 } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../App';
import { useNavigate, Link } from 'react-router-dom';
import { apiErrorMessage } from '../lib/toast';
import Spinner from '../components/Spinner';
import wordmark from '../assets/map-wordmark.png';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('map_token', data.token);
      localStorage.setItem('map_user', JSON.stringify(data.user));
      setUser(data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(apiErrorMessage(err, 'Login failed'));
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-hero">
          <img src={wordmark} alt="Mohalla Adoption Program — Zakat Centre India Initiative" className="brand-wordmark" />
          <div>
            <h2>Field data, organised.</h2>
            <p>Sign in to collect household surveys, review submissions, and track community coverage in real time.</p>
          </div>
          <ul className="auth-hero-points">
            <li><ShieldCheck size={18} aria-hidden="true" /> Role-based secure access</li>
            <li><Users size={18} aria-hidden="true" /> Built for surveyors, supervisors &amp; admins</li>
            <li><BarChart3 size={18} aria-hidden="true" /> Live dashboards &amp; reporting</li>
          </ul>
        </div>

        <form className="auth-card" onSubmit={submit}>
          <Link to="/" className="auth-back">← Home</Link>
          <h1>Team login</h1>
          <p>Surveyor, Supervisor and Admin access is automatically applied after sign-in.</p>

          {error && <div className="error">{error}</div>}

          <label>
            Email
            <div className="input-icon">
              <Mail size={18} aria-hidden="true" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </label>
          <label>
            Password
            <div className="input-icon">
              <Lock size={18} aria-hidden="true" />
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
          </label>

          <button className="btn btn-lg" disabled={submitting}>{submitting && <Spinner />} Sign in</button>
        </form>
      </div>
    </div>
  );
}

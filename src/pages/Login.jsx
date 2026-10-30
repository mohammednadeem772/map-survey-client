// Login form — on success, stores the JWT + user profile and redirects to
// the dashboard. The API's JWT payload shape is { id, name, email, role, areaId }.
import React, { useState } from 'react';
import { Mail, Lock, ShieldCheck, HomeIcon, FileCheck2, Eye, EyeOff } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../App';
import { useNavigate, Link } from 'react-router-dom';
import { apiErrorMessage } from '../lib/toast';
import Spinner from '../components/Spinner';
import PoweredByBadge from '../components/PoweredByBadge';
import wordmark from '../assets/map-wordmark.png';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
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
            <h2>Household insight, responsibly collected.</h2>
            <p>
              Sign in to record accurate family and household information for the Mohalla Adoption
              Program, supporting Zakat Center India's community welfare assessments.
            </p>
          </div>
          <ul className="auth-hero-points">
            <li><HomeIcon size={18} aria-hidden="true" /> Whole-household &amp; family details</li>
            <li><FileCheck2 size={18} aria-hidden="true" /> Accurate, verifiable records</li>
            <li><ShieldCheck size={18} aria-hidden="true" /> Confidential, access-controlled data</li>
          </ul>
          <PoweredByBadge />
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
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                className="input-icon-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </label>

          <button className="btn btn-lg" disabled={submitting}>{submitting && <Spinner />} Sign in</button>
        </form>
      </div>
    </div>
  );
}

// KPI tiles + charts, driven entirely by GET /dashboard/summary (role-scoped
// server-side) plus the survey list for the "recent surveys" table.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../App';
import { apiErrorMessage } from '../lib/toast';
import StatusPill from '../components/StatusPill';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#0f766e', '#14b8a6', '#f59e0b', '#7c3aed', '#ef4444'];

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [error, setError] = useState('');
  const { user } = useAuth();

  function load() {
    setError('');
    Promise.all([api.get('/dashboard/summary'), api.get('/surveys')])
      .then(([a, b]) => {
        setSummary(a.data);
        setSurveys(b.data);
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load the dashboard.')));
  }

  useEffect(() => {
    load();
  }, []);

  // Without an error state here, a failed request left `summary` null
  // forever and this page just said "Loading…" with no way out — exactly
  // the "app gets stuck" symptom report. A retry button is a real recovery
  // path instead of forcing a full reload.
  if (error) {
    return (
      <div className="notice">
        {error} <button type="button" className="link" onClick={load}>Retry</button>
      </div>
    );
  }
  if (!summary) return <p>Loading dashboard…</p>;
  const kpis = summary.kpis;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{user.role === 'SURVEYOR' ? 'My surveys' : 'Mohalla dashboard'}</h1>
          <p>Live coverage and socio-economic indicators within your access scope.</p>
        </div>
        <Link className="btn" to="/survey/new">New survey</Link>
      </div>

      <section className="kpis">
        <Kpi label="Households surveyed" value={kpis.surveyed} />
        <Kpi label="Verified" value={kpis.verified} />
        <Kpi label="Average monthly income" value={`₹${Number(kpis.avg_income || 0).toLocaleString('en-IN')}`} />
        <Kpi label="Households with debt" value={kpis.indebted} />
      </section>

      <section className="charts">
        <Chart title="Coverage by area">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={summary.areas}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="surveyed" fill="#0f766e" />
            </BarChart>
          </ResponsiveContainer>
        </Chart>

        <Chart title="Housing tenure">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={summary.tenure} dataKey="value" nameKey="name" outerRadius={85} label>
                {summary.tenure.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Chart>

        <Chart title="House condition">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={summary.condition}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </Chart>

        <Chart title="Completed by surveyor">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={summary.surveyor}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#7c3aed" />
            </BarChart>
          </ResponsiveContainer>
        </Chart>
      </section>

      <section className="card">
        <div className="page-head mb-4">
          <h2>Recent surveys</h2>
          <a className="link" href="/surveys">View all surveys →</a>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Head of family</th>
                <th>Area</th>
                <th>Surveyor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {surveys.slice(0, 5).map((s) => (
                <tr key={s.id}>
                  <td><a href={`/survey/${s.id}`}>{s.survey_code}</a></td>
                  <td>{s.head_name}</td>
                  <td>{s.area_name}</td>
                  <td>{s.surveyor_name}</td>
                  <td><StatusPill status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {surveys.length === 0 && <p className="empty-state">No surveys yet.</p>}
        </div>
      </section>
    </>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="kpi">
      <span>{label}</span>
      <strong>{value ?? 0}</strong>
    </div>
  );
}

function Chart({ title, children }) {
  return (
    <div className="card chart">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

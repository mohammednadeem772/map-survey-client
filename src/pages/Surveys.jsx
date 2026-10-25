// Full surveys listing: search, status/area filters, and per-row actions.
// The API already returns every survey the current role is allowed to see
// (role-scoping happens server-side — see server/src/middleware/auth.js
// scopeWhere), so search/filter here are plain client-side list operations,
// no extra endpoints needed.
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../App';
import StatusPill from '../components/StatusPill';

const STATUSES = ['DRAFT', 'SUBMITTED', 'VERIFIED', 'RETURNED'];

export default function Surveys() {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [verifyingId, setVerifyingId] = useState(null);

  const canVerify = user.role === 'ADMIN' || user.role === 'SUPERVISOR';

  function load() {
    setLoading(true);
    return Promise.all([api.get('/surveys'), api.get('/areas')])
      .then(([s, a]) => {
        setSurveys(s.data);
        setAreas(a.data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return surveys.filter((s) => {
      if (statusFilter && s.status !== statusFilter) return false;
      if (areaFilter && s.area_name !== areaFilter) return false;
      if (!q) return true;
      return [s.survey_code, s.head_name, s.phone, s.area_name, s.surveyor_name]
        .some((field) => field?.toLowerCase().includes(q));
    });
  }, [surveys, query, statusFilter, areaFilter]);

  async function verify(id) {
    setVerifyingId(id);
    try {
      await api.put(`/surveys/${id}`, { status: 'VERIFIED' });
      await load();
    } finally {
      setVerifyingId(null);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Surveys</h1>
          <p>{surveys.length} household survey{surveys.length === 1 ? '' : 's'} within your access scope.</p>
        </div>
        <a className="btn" href="/survey/new">New survey</a>
      </div>

      <section className="card">
        <div className="survey-filters">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, code, phone, area, or surveyor…"
            className="survey-search"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
            <option value="">All areas</option>
            {areas.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
          </select>
          {(query || statusFilter || areaFilter) && (
            <button
              type="button"
              className="link"
              onClick={() => { setQuery(''); setStatusFilter(''); setAreaFilter(''); }}
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Head of family</th>
                <th>Phone</th>
                <th>Area</th>
                <th>Surveyor</th>
                <th>Status</th>
                <th>Surveyed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td><a href={`/survey/${s.id}`}>{s.survey_code}</a></td>
                  <td>{s.head_name || '—'}</td>
                  <td>{s.phone || '—'}</td>
                  <td>{s.area_name}</td>
                  <td>{s.surveyor_name}</td>
                  <td><StatusPill status={s.status} /></td>
                  <td>{s.surveyed_at ? new Date(s.surveyed_at).toLocaleDateString('en-IN') : '—'}</td>
                  <td>
                    <div className="row-actions">
                      <a className="link" href={`/survey/${s.id}`}>View / Edit</a>
                      {canVerify && s.status === 'SUBMITTED' && (
                        <button
                          type="button"
                          className="link"
                          disabled={verifyingId === s.id}
                          onClick={() => verify(s.id)}
                        >
                          {verifyingId === s.id ? 'Verifying…' : 'Verify'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && filtered.length === 0 && (
            <p className="empty-state">
              {surveys.length === 0 ? 'No surveys yet.' : 'No surveys match these filters.'}
            </p>
          )}
          {loading && <p className="empty-state">Loading surveys…</p>}
        </div>
      </section>
    </>
  );
}

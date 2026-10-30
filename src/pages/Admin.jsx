// Admin-only page: create areas/wards, create users, and review the user list.
// Route-guarded to ADMIN in App.jsx; the API independently enforces the same
// restriction on every /areas and /users write.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserX, UserCheck, ListTree } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../App';
import { useToast, apiErrorMessage } from '../lib/toast';
import IconButton from '../components/IconButton';
import Spinner from '../components/Spinner';

const emptyUser = { name: '', email: '', password: '', role: 'SURVEYOR', area_id: '' };
const emptyArea = { name: '', ward_code: '', target_households: 0 };

// Same bug class as the survey form's numeric fields (see SurveyForm.jsx):
// a plain <input type="number"> has no max length, so "target households"
// could run on forever. Keeps only digits and clamps into a sane range.
function sanitizeDigits(raw, { maxLength, max }) {
  let s = String(raw).replace(/[^0-9]/g, '').slice(0, maxLength);
  if (s && max !== undefined) s = String(Math.min(max, parseInt(s, 10)));
  return s;
}

export default function Admin() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [userForm, setUserForm] = useState(emptyUser);
  const [areaForm, setAreaForm] = useState(emptyArea);
  const [busyId, setBusyId] = useState(null);
  const [savingUser, setSavingUser] = useState(false);
  const [savingArea, setSavingArea] = useState(false);

  const load = () =>
    Promise.all([api.get('/users'), api.get('/areas')])
      .then(([u, a]) => {
        setUsers(u.data);
        setAreas(a.data);
      })
      .catch((err) => toast.error(apiErrorMessage(err, 'Could not load the admin data.')));

  useEffect(() => {
    load();
  }, []);

  async function addUser(e) {
    e.preventDefault();
    setSavingUser(true);
    try {
      await api.post('/users', userForm);
      setUserForm(emptyUser);
      await load();
      toast.success('User created.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not create that user.'));
    } finally {
      setSavingUser(false);
    }
  }

  async function addArea(e) {
    e.preventDefault();
    setSavingArea(true);
    try {
      const target_households = areaForm.target_households === '' ? 0 : Number(areaForm.target_households);
      await api.post('/areas', { ...areaForm, target_households });
      setAreaForm(emptyArea);
      await load();
      toast.success('Area created.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not create that area.'));
    } finally {
      setSavingArea(false);
    }
  }

  async function toggleActive(u) {
    const verb = u.active ? 'Deactivate' : 'Activate';
    if (!window.confirm(`${verb} ${u.name}?${u.active ? ' They will no longer be able to sign in.' : ''}`)) return;
    setBusyId(u.id);
    try {
      if (u.active) await api.delete(`/users/${u.id}`);
      else await api.put(`/users/${u.id}/reactivate`);
      await load();
      toast.success(u.active ? 'User deactivated.' : 'User activated.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update that user.'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Administration</h1>
          <p>Manage users, access boundaries, wards, targets, and dashboard configuration.</p>
        </div>
      </div>

      <div className="admin-grid">
        <form className="card" onSubmit={addArea}>
          <h2>Create area / ward</h2>
          <label>
            Name
            <input
              value={areaForm.name}
              onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value.slice(0, 120) })}
              maxLength={120}
              required
            />
          </label>
          <label>
            Ward code
            <input
              value={areaForm.ward_code}
              onChange={(e) => setAreaForm({ ...areaForm, ward_code: e.target.value.slice(0, 50) })}
              maxLength={50}
              required
            />
          </label>
          <label>
            Target houses
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={areaForm.target_households}
              onChange={(e) =>
                setAreaForm({ ...areaForm, target_households: sanitizeDigits(e.target.value, { maxLength: 6, max: 999999 }) })
              }
            />
          </label>
          <button className="btn" disabled={savingArea}>{savingArea && <Spinner />} Create area</button>
        </form>

        <form className="card" onSubmit={addUser}>
          <h2>Create user</h2>
          <label>
            Name
            <input
              value={userForm.name}
              onChange={(e) => setUserForm({ ...userForm, name: e.target.value.slice(0, 120) })}
              maxLength={120}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value.slice(0, 180) })}
              maxLength={180}
              required
            />
          </label>
          <label>
            Temporary password
            <input
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value.slice(0, 72) })}
              minLength={8}
              maxLength={72}
              required
            />
          </label>
          <label>
            Role
            <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
              <option>SURVEYOR</option>
              <option>SUPERVISOR</option>
              <option>ADMIN</option>
            </select>
          </label>
          <label>
            Assigned area
            <select
              value={userForm.area_id}
              onChange={(e) => setUserForm({ ...userForm, area_id: e.target.value })}
            >
              <option value="">None</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
          <button className="btn" disabled={savingUser}>{savingUser && <Spinner />} Create user</button>
        </form>
      </div>

      <Link to="/admin/dropdown-options" className="card admin-link-card">
        <div>
          <h2>Survey dropdown options</h2>
          <p>Manage the value lists behind every dropdown in the survey form — gender, occupation, house condition, and more.</p>
        </div>
        <ListTree className="admin-link-card-icon" aria-hidden="true" />
      </Link>

      <section className="card">
        <h2>Users</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Area</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.area_name || 'All areas'}</td>
                  <td>{u.active ? 'Active' : 'Disabled'}</td>
                  <td>
                    <div className="row-actions">
                      {u.id === currentUser.id ? (
                        <span className="surveyor-email">You</span>
                      ) : u.active ? (
                        <IconButton
                          icon={UserX}
                          label="Deactivate"
                          variant="danger"
                          loading={busyId === u.id}
                          onClick={() => toggleActive(u)}
                        />
                      ) : (
                        <IconButton
                          icon={UserCheck}
                          label="Activate"
                          variant="success"
                          loading={busyId === u.id}
                          onClick={() => toggleActive(u)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

// Admin-only page: create areas/wards, create users, and review the user list.
// Route-guarded to ADMIN in App.jsx; the API independently enforces the same
// restriction on every /areas and /users write.
import React, { useEffect, useState } from 'react';
import { UserX, UserCheck } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../App';
import IconButton from '../components/IconButton';

const emptyUser = { name: '', email: '', password: '', role: 'SURVEYOR', area_id: '' };
const emptyArea = { name: '', ward_code: '', target_households: 0 };

export default function Admin() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [userForm, setUserForm] = useState(emptyUser);
  const [areaForm, setAreaForm] = useState(emptyArea);
  const [busyId, setBusyId] = useState(null);

  const load = () =>
    Promise.all([api.get('/users'), api.get('/areas')]).then(([u, a]) => {
      setUsers(u.data);
      setAreas(a.data);
    });

  useEffect(() => {
    load();
  }, []);

  async function addUser(e) {
    e.preventDefault();
    await api.post('/users', userForm);
    setUserForm(emptyUser);
    load();
  }

  async function addArea(e) {
    e.preventDefault();
    await api.post('/areas', areaForm);
    setAreaForm(emptyArea);
    load();
  }

  async function toggleActive(u) {
    const verb = u.active ? 'Deactivate' : 'Activate';
    if (!window.confirm(`${verb} ${u.name}?${u.active ? ' They will no longer be able to sign in.' : ''}`)) return;
    setBusyId(u.id);
    try {
      if (u.active) await api.delete(`/users/${u.id}`);
      else await api.put(`/users/${u.id}/reactivate`);
      await load();
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
              onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })}
              required
            />
          </label>
          <label>
            Ward code
            <input
              value={areaForm.ward_code}
              onChange={(e) => setAreaForm({ ...areaForm, ward_code: e.target.value })}
              required
            />
          </label>
          <label>
            Target houses
            <input
              type="number"
              value={areaForm.target_households}
              onChange={(e) => setAreaForm({ ...areaForm, target_households: e.target.value })}
            />
          </label>
          <button className="btn">Create area</button>
        </form>

        <form className="card" onSubmit={addUser}>
          <h2>Create user</h2>
          <label>
            Name
            <input
              value={userForm.name}
              onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              required
            />
          </label>
          <label>
            Temporary password
            <input
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
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
          <button className="btn">Create user</button>
        </form>
      </div>

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
                          disabled={busyId === u.id}
                          onClick={() => toggleActive(u)}
                        />
                      ) : (
                        <IconButton
                          icon={UserCheck}
                          label="Activate"
                          variant="success"
                          disabled={busyId === u.id}
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

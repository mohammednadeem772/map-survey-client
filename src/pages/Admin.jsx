// Admin-only page: create areas/wards, create users, and review the user list.
// Route-guarded to ADMIN in App.jsx; the API independently enforces the same
// restriction on every /areas and /users write.
import React, { useEffect, useState } from 'react';
import { UserX, UserCheck, X, RotateCcw } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../App';
import IconButton from '../components/IconButton';

const emptyUser = { name: '', email: '', password: '', role: 'SURVEYOR', area_id: '' };
const emptyArea = { name: '', ward_code: '', target_households: 0 };

// Every survey-form dropdown an admin can manage here — keys must match
// server/src/lib/dropdownCategories.js exactly; the label is just this
// screen's display text. member_type isn't here on purpose: it's a fixed
// enum the survey form's own logic depends on (STUDENT/WORKING show
// different fields), not an admin-editable list.
const DROPDOWN_CATEGORY_LABELS = {
  gender: 'Gender',
  marital_status: 'Marital status',
  education: 'Education',
  occupation: 'Occupation',
  namaz: 'Namaz',
  house_tenure: 'House tenure',
  house_condition: 'House condition',
  toilet_access: 'Toilet access',
  drinking_water: 'Drinking water',
  electricity_access: 'Electricity access',
  loan_type: 'Loan type',
  aadhaar_status: 'Aadhaar status',
  voter_id_status: 'Voter ID status',
  vehicle: 'Vehicle',
  tv_connection: 'TV connection',
  tv_type: 'TV type',
  smartphone_access: 'Smartphone access',
  internet_access: 'Internet access',
  food_security: 'Food security',
  vulnerable_category: 'Vulnerability flag',
  dependant_relationship: 'Family member relationship',
};
const DROPDOWN_CATEGORY_KEYS = Object.keys(DROPDOWN_CATEGORY_LABELS);

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
  const [users, setUsers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [userForm, setUserForm] = useState(emptyUser);
  const [areaForm, setAreaForm] = useState(emptyArea);
  const [busyId, setBusyId] = useState(null);
  const [dropdownOptions, setDropdownOptions] = useState({});
  const [dropdownCategory, setDropdownCategory] = useState(DROPDOWN_CATEGORY_KEYS[0]);
  const [newOptionValue, setNewOptionValue] = useState('');
  const [optionError, setOptionError] = useState('');
  const [optionBusyId, setOptionBusyId] = useState(null);

  const load = () =>
    Promise.all([api.get('/users'), api.get('/areas'), api.get('/dropdown-options?includeInactive=true')]).then(
      ([u, a, o]) => {
        setUsers(u.data);
        setAreas(a.data);
        setDropdownOptions(o.data);
      }
    );

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
    const target_households = areaForm.target_households === '' ? 0 : Number(areaForm.target_households);
    await api.post('/areas', { ...areaForm, target_households });
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

  async function addDropdownOption(e) {
    e.preventDefault();
    setOptionError('');
    try {
      await api.post('/dropdown-options', { category: dropdownCategory, value: newOptionValue.slice(0, 150) });
      setNewOptionValue('');
      await load();
    } catch (err) {
      setOptionError(err.response?.data?.message || 'Could not add that value.');
    }
  }

  async function toggleDropdownOption(o) {
    setOptionBusyId(o.id);
    try {
      if (o.active) await api.delete(`/dropdown-options/${o.id}`);
      else await api.put(`/dropdown-options/${o.id}/reactivate`);
      await load();
    } finally {
      setOptionBusyId(null);
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
          <button className="btn">Create area</button>
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
          <button className="btn">Create user</button>
        </form>
      </div>

      <section className="card">
        <h2>Survey dropdown options</h2>
        <p>Add a value the field team should be able to pick from; deactivate one they shouldn't see anymore. Deactivating never changes surveys that already recorded that value.</p>

        <label>
          Field
          <select value={dropdownCategory} onChange={(e) => { setDropdownCategory(e.target.value); setOptionError(''); }}>
            {DROPDOWN_CATEGORY_KEYS.map((key) => (
              <option key={key} value={key}>{DROPDOWN_CATEGORY_LABELS[key]}</option>
            ))}
          </select>
        </label>

        <form className="option-add-row" onSubmit={addDropdownOption}>
          <input
            value={newOptionValue}
            onChange={(e) => setNewOptionValue(e.target.value.slice(0, 150))}
            maxLength={150}
            placeholder={`Add a new ${DROPDOWN_CATEGORY_LABELS[dropdownCategory].toLowerCase()} value`}
            required
          />
          <button className="btn">Add</button>
        </form>
        {optionError && <div className="notice">{optionError}</div>}

        <div className="option-chips">
          {(dropdownOptions[dropdownCategory] || []).map((o) => (
            <span key={o.id} className={`option-chip ${o.active ? '' : 'option-chip-inactive'}`}>
              {o.value}
              <IconButton
                icon={o.active ? X : RotateCcw}
                label={o.active ? 'Deactivate' : 'Reactivate'}
                variant={o.active ? 'danger' : 'success'}
                disabled={optionBusyId === o.id}
                onClick={() => toggleDropdownOption(o)}
              />
            </span>
          ))}
          {(dropdownOptions[dropdownCategory] || []).length === 0 && <p>No values yet.</p>}
        </div>
      </section>

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

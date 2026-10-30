// Admin-only page: manage the value lists behind every dropdown in the
// survey form (gender, occupation, house condition, ...). Route-guarded to
// ADMIN in App.jsx; the API independently enforces the same restriction on
// every /dropdown-options write.
import React, { useEffect, useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { api } from '../api';
import { useToast, apiErrorMessage } from '../lib/toast';
import IconButton from '../components/IconButton';
import Spinner from '../components/Spinner';

// Keys must match server/src/lib/dropdownCategories.js exactly; the label
// is just this screen's display text. member_type isn't here on purpose:
// it's a fixed enum the survey form's own logic depends on (STUDENT/
// WORKING show different fields), not an admin-editable list.
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

export default function DropdownOptions() {
  const toast = useToast();
  const [options, setOptions] = useState({});
  const [category, setCategory] = useState(DROPDOWN_CATEGORY_KEYS[0]);
  const [newValue, setNewValue] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = () => api.get('/dropdown-options?includeInactive=true').then((res) => setOptions(res.data));

  useEffect(() => {
    load();
  }, []);

  async function addOption(e) {
    e.preventDefault();
    setError('');
    setAdding(true);
    try {
      await api.post('/dropdown-options', { category, value: newValue.slice(0, 150) });
      setNewValue('');
      await load();
      toast.success('Value added.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not add that value.'));
    } finally {
      setAdding(false);
    }
  }

  async function toggleOption(o) {
    setBusyId(o.id);
    try {
      if (o.active) await api.delete(`/dropdown-options/${o.id}`);
      else await api.put(`/dropdown-options/${o.id}/reactivate`);
      await load();
      toast.success(o.active ? 'Value deactivated.' : 'Value reactivated.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update that value.'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Survey dropdown options</h1>
          <p>Add a value the field team should be able to pick from; deactivate one they shouldn't see anymore. Deactivating never changes surveys that already recorded that value.</p>
        </div>
      </div>

      <section className="card">
        <label>
          Field
          <select value={category} onChange={(e) => { setCategory(e.target.value); setError(''); }}>
            {DROPDOWN_CATEGORY_KEYS.map((key) => (
              <option key={key} value={key}>{DROPDOWN_CATEGORY_LABELS[key]}</option>
            ))}
          </select>
        </label>

        <form className="option-add-row" onSubmit={addOption}>
          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value.slice(0, 150))}
            maxLength={150}
            placeholder={`Add a new ${DROPDOWN_CATEGORY_LABELS[category].toLowerCase()} value`}
            required
          />
          <button className="btn" disabled={adding}>{adding && <Spinner />} Add</button>
        </form>
        {error && <div className="notice">{error}</div>}

        <div className="option-chips">
          {(options[category] || []).map((o) => (
            <span key={o.id} className={`option-chip ${o.active ? '' : 'option-chip-inactive'}`}>
              {o.value}
              <IconButton
                icon={o.active ? X : RotateCcw}
                label={o.active ? 'Deactivate' : 'Reactivate'}
                variant={o.active ? 'danger' : 'success'}
                loading={busyId === o.id}
                onClick={() => toggleOption(o)}
              />
            </span>
          ))}
          {(options[category] || []).length === 0 && <p>No values yet.</p>}
        </div>
      </section>
    </>
  );
}

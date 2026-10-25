// Multi-step household survey form — used for both "new" (/survey/new) and
// "edit" (/survey/:id). Mirrors the field set the server accepts; see
// server/src/routes/surveys.routes.js `WRITABLE_FIELDS` for the source of truth.
import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useNavigate, useParams } from 'react-router-dom';

const occupations = [
  'Government job', 'Tannery worker', 'Leather cutting/stitching', 'Construction labour',
  'Daily wage worker', 'Domestic worker', 'Street vendor', 'Auto driver', 'Driver', 'Mechanic',
  'Electrician', 'Plumber', 'Carpenter', 'Tailor', 'Shop worker', 'Security guard',
  'Sanitation worker', 'Waste picker', 'Home-based worker', 'IT professional', 'Teacher',
  'Clerk', 'Medical staff', 'Engineer', 'Unemployed', 'Retired', 'Other',
];

const emptySurvey = {
  status: 'DRAFT',
  consent_given: false,
  head_name: '',
  address: '',
  loan_types: [],
  vehicles: [],
  vulnerable_category: [],
  dependants: [],
};

// JSON columns come back from the API already parsed as arrays, but guard
// against a plain string just in case (e.g. hand-edited data).
const parseJsonArray = (value) => (Array.isArray(value) ? value : value ? JSON.parse(value) : []);

// Only step 1 (Household head) has hard-required fields — the rest of the
// survey is intentionally optional/situational (e.g. not every household
// has a spouse), matching the rest of the form. A field counts as missing
// when it's empty/undefined/null; `0` is a valid age, so it isn't treated
// as missing.
const REQUIRED_STEP0_FIELDS = [
  ['address', 'Address'],
  ['phone', 'Phone'],
  ['head_name', 'Head of family — Name'],
  ['head_age', 'Head of family — Age'],
  ['head_gender', 'Head of family — Gender'],
  ['head_marital_status', 'Head of family — Marital status'],
];

function isEmptyValue(v) {
  return v === undefined || v === null || v === '';
}

function getMissingStep0Fields(f) {
  const missing = REQUIRED_STEP0_FIELDS.filter(([key]) => isEmptyValue(f[key])).map(([, label]) => label);
  if (!f.consent_given) missing.unshift('Household informed consent');
  return missing;
}

export default function SurveyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptySurvey);
  const [areas, setAreas] = useState([]);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showStep0Errors, setShowStep0Errors] = useState(false);

  const missingStep0Fields = getMissingStep0Fields(form);
  const step0Complete = missingStep0Fields.length === 0;

  useEffect(() => {
    api.get('/areas').then((res) => {
      setAreas(res.data);
      if (!id && res.data.length) {
        setForm((f) => ({ ...f, area_id: res.data[0].id }));
      }
    });

    if (id) {
      api.get(`/surveys/${id}`).then((res) =>
        setForm({
          ...res.data,
          loan_types: parseJsonArray(res.data.loan_types),
          vehicles: parseJsonArray(res.data.vehicles),
          vulnerable_category: parseJsonArray(res.data.vulnerable_category),
        })
      );
    }
  }, [id]);

  const set = (key, value) => setForm({ ...form, [key]: value });

  // Toggles a value in/out of a multi-select array field (loan_types, vehicles, vulnerable_category).
  const toggle = (key, value) =>
    set(key, form[key]?.includes(value) ? form[key].filter((x) => x !== value) : [...(form[key] || []), value]);

  // Moving past step 0 (and jumping to any later step via the tabs) is
  // blocked until its required fields are filled in. Going backwards is
  // always allowed — there's nothing to validate when reviewing earlier steps.
  function goToStep(target) {
    if (target > 0 && !step0Complete) {
      setStep(0);
      setShowStep0Errors(true);
      return;
    }
    setStep(target);
  }

  // Save draft intentionally bypasses the required-field gate above — a
  // surveyor should always be able to save in-progress work from any step.
  // Consent stays required even for a draft: this app shouldn't persist any
  // household data at all without it. A final (non-draft) submission still
  // enforces the full step-0 requirement as a defensive check, even though
  // goToStep already makes it unreachable otherwise.
  async function save(status) {
    if (!form.consent_given) {
      return alert('Consent is required before saving this survey.');
    }
    if (status === 'SUBMITTED' && !step0Complete) {
      setStep(0);
      setShowStep0Errors(true);
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, status };
      if (id) await api.put(`/surveys/${id}`, payload);
      else await api.post('/surveys', payload);
      navigate('/dashboard');
    } finally {
      setSaving(false);
    }
  }

  const steps = ['Household head', 'Spouse', 'Home & welfare', 'Assets & access', 'Family members', 'Review'];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{id ? 'Update' : 'New'} household survey</h1>
          <p>Complete one section at a time. Use Save draft when field verification is pending.</p>
        </div>
      </div>

      <div className="steps">
        {steps.map((label, i) => (
          <button type="button" className={i === step ? 'active' : ''} onClick={() => goToStep(i)} key={label}>
            {i + 1}
            <span>{label}</span>
          </button>
        ))}
      </div>

      <form className="card form" onSubmit={(e) => e.preventDefault()}>
        {step === 0 && (
          <>
            {showStep0Errors && !step0Complete && (
              <div className="notice mb-6">
                Please complete before continuing: {missingStep0Fields.join(', ')}.
              </div>
            )}
            <Section title="Consent and location">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={!!form.consent_given}
                  onChange={(e) => set('consent_given', e.target.checked)}
                />
                Household informed consent received
                {showStep0Errors && !form.consent_given && <span className="text-rose-500"> *</span>}
              </label>
              <Grid>
                <Select
                  label="Area / Ward"
                  k="area_id"
                  v={form}
                  set={set}
                  options={areas.map((a) => ({ value: a.id, label: `${a.name} (${a.ward_code})` }))}
                />
                <Input label="Address" k="address" v={form} set={set} wide required showError={showStep0Errors} />
                <Input label="Phone" k="phone" v={form} set={set} required showError={showStep0Errors} />
                <Input label="Latitude" k="latitude" v={form} set={set} type="number" />
                <Input label="Longitude" k="longitude" v={form} set={set} type="number" />
              </Grid>
            </Section>
            <Person prefix="head" title="Head of the family" f={form} set={set} requiredFields={['name', 'age', 'gender', 'marital_status']} showError={showStep0Errors} />
          </>
        )}

        {step === 1 && <Person prefix="spouse" title="Spouse details" f={form} set={set} />}

        {step === 2 && (
          <>
            <Section title="House">
              <Grid>
                <Select
                  label="Tenure" k="house_tenure" v={form} set={set}
                  options={['Own', 'Rented', 'Leased', 'Shared', 'Poromboke / unapproved occupancy']}
                />
                <Select
                  label="Condition" k="house_condition" v={form} set={set}
                  options={[
                    'Pucca / concrete', 'Semi-pucca', 'Kutcha / mud', 'Tin or asbestos sheet',
                    'Temporary shelter', 'Dilapidated / unsafe', 'Homeless',
                  ]}
                />
                <Input label="Rooms" k="rooms" v={form} set={set} type="number" />
                <Select
                  label="Toilet access" k="toilet_access" v={form} set={set}
                  options={['Private household toilet', 'Shared toilet', 'Community toilet', 'No toilet / open defecation']}
                />
                <Select
                  label="Drinking water" k="drinking_water" v={form} set={set}
                  options={['Piped at home', 'Public tap', 'Borewell', 'Tanker', 'Purchased can', 'Other']}
                />
                <Select
                  label="Electricity" k="electricity_access" v={form} set={set}
                  options={['Regular connection', 'Shared connection', 'Irregular / disconnected', 'No electricity']}
                />
              </Grid>
            </Section>

            <Section title="Debt, schemes and health">
              <Choices
                title="Loan types"
                items={['Bank', 'Money lender', 'EMI', 'Credit card', 'Family hand loan', 'Self-help group', 'Employer advance']}
                selected={form.loan_types}
                toggle={(x) => toggle('loan_types', x)}
              />
              <Grid>
                <Input label="Outstanding loan amount (₹)" k="loan_amount" v={form} set={set} type="number" />
                <YesNo label="Government scheme availed" k="govt_scheme_availed" v={form} set={set} />
                {form.govt_scheme_availed && (
                  <>
                    <Input label="Scheme names" k="govt_scheme_names" v={form} set={set} />
                    <Input label="Benefit amount (₹)" k="govt_scheme_amount" v={form} set={set} type="number" />
                  </>
                )}
                <YesNo label="Bedridden member" k="bedridden" v={form} set={set} />
                {form.bedridden && (
                  <Input label="Monthly medical expense (₹)" k="bedridden_monthly_expense" v={form} set={set} type="number" />
                )}
              </Grid>
            </Section>
          </>
        )}

        {step === 3 && (
          <>
            <Section title="Documents and financial inclusion">
              <Grid>
                <YesNo label="Ration card" k="ration_card" v={form} set={set} />
                <Select
                  label="Aadhaar status" k="aadhaar_status" v={form} set={set}
                  options={['All members', 'Some members', 'No member']}
                />
                <YesNo label="Health card" k="health_card" v={form} set={set} />
                <YesNo label="Bank account" k="bank_account" v={form} set={set} />
                <Select
                  label="Voter ID" k="voter_id_status" v={form} set={set}
                  options={['Yes for all eligible', 'Some have, some do not', 'None']}
                />
              </Grid>
            </Section>

            <Section title="Assets and connectivity">
              <Choices
                title="Vehicles"
                items={['Car', 'Bike', 'Cycle', 'Passenger auto', 'Load auto', 'None']}
                selected={form.vehicles}
                toggle={(x) => toggle('vehicles', x)}
              />
              <Grid>
                <YesNo label="Fridge" k="fridge" v={form} set={set} />
                <YesNo label="Television" k="television" v={form} set={set} />
                {form.television && (
                  <>
                    <Select label="TV connection" k="tv_connection" v={form} set={set} options={['Cable', 'DTH', 'Internet only', 'No connection']} />
                    <Select label="TV type" k="tv_type" v={form} set={set} options={['CRT TV', 'LCD/LED', 'Smart TV']} />
                  </>
                )}
                <YesNo label="Washing machine" k="washing_machine" v={form} set={set} />
                <Select
                  label="Smartphone access" k="smartphone_access" v={form} set={set}
                  options={['Everyone eligible has one', 'Some have, some do not', 'No smartphone']}
                />
                <Select
                  label="Internet access" k="internet_access" v={form} set={set}
                  options={['Home broadband', 'Mobile data', 'Occasional access', 'No access']}
                />
              </Grid>
            </Section>

            <Section title="Household economy">
              <Grid>
                <Input label="Monthly household income (₹)" k="monthly_household_income" v={form} set={set} type="number" />
                <Input label="Monthly household expense (₹)" k="monthly_household_expense" v={form} set={set} type="number" />
                <Select
                  label="Food security" k="food_security" v={form} set={set}
                  options={['Secure throughout month', 'Occasional shortage', 'Frequent shortage', 'Severe shortage']}
                />
              </Grid>
              <Choices
                title="Vulnerability flags"
                items={[
                  'Widow-headed household', 'Single parent', 'Elderly living alone', 'Person with disability',
                  'Orphan support needed', 'School dropout', 'Unemployed primary earner', 'Unsafe housing',
                  'Chronic illness',
                ]}
                selected={form.vulnerable_category}
                toggle={(x) => toggle('vulnerable_category', x)}
              />
            </Section>
          </>
        )}

        {step === 4 && <Dependants f={form} set={set} />}
        {step === 5 && <Review f={form} />}

        <div className="form-actions">
          <button type="button" className="btn secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>
            Back
          </button>
          <button type="button" className="btn secondary" disabled={saving} onClick={() => save('DRAFT')}>
            Save draft
          </button>
          {step < 5 ? (
            <button type="button" className="btn" onClick={() => goToStep(step + 1)}>Continue</button>
          ) : (
            <button type="button" className="btn" disabled={saving} onClick={() => save('SUBMITTED')}>Submit survey</button>
          )}
        </div>
      </form>
    </>
  );
}

// ── Small shared field components ──────────────────────────────────────────

function Section({ title, children }) {
  return (
    <section className="section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Grid({ children }) {
  return <div className="field-grid">{children}</div>;
}

function Input({ label, k, v, set, type = 'text', wide = false, required = false, showError = false }) {
  const invalid = required && showError && isEmptyValue(v[k]);
  return (
    <label className={wide ? 'wide' : ''}>
      {/* Label text + asterisk must stay in one element: `label` is
          display:grid, so any direct child (including a bare conditional
          <span>) becomes its own grid row and wraps onto a new line. */}
      <span>
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      <input
        type={type}
        value={v[k] ?? ''}
        className={invalid ? 'input-invalid' : ''}
        onChange={(e) => set(k, type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
      />
    </label>
  );
}

// Searchable dropdown — a styled trigger button that opens a panel with a
// search box + filtered option list, instead of a native <select> (which
// has no search and is awkward to scan for fields like Occupation's 27
// options). Keeps the same {label, k, v, set, options} shape the rest of
// the form already uses, so every call site stays unchanged.
function Select({ label, k, v, set, options, required = false, showError = false }) {
  const normalized = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const invalid = required && showError && isEmptyValue(v[k]);
  const selected = normalized.find((o) => String(o.value) === String(v[k] ?? ''));

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  const filtered = query.trim()
    ? normalized.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : normalized;

  function choose(value) {
    set(k, value);
    setOpen(false);
    setQuery('');
  }

  return (
    <div className="combo" ref={boxRef}>
      <span className="combo-label">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`combo-trigger ${invalid ? 'combo-trigger-invalid' : ''}`}
      >
        <span className={selected ? '' : 'text-slate-400'}>{selected ? selected.label : 'Select'}</span>
        <svg viewBox="0 0 20 20" fill="currentColor" className="combo-chevron">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="combo-panel">
          {normalized.length > 6 && (
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="combo-search"
            />
          )}
          <div className="combo-list">
            <button type="button" onClick={() => choose('')} className="combo-option">Select</button>
            {filtered.map((o) => (
              <button
                type="button"
                key={o.value}
                onClick={() => choose(o.value)}
                className={`combo-option ${String(o.value) === String(v[k] ?? '') ? 'combo-option-active' : ''}`}
              >
                {o.label}
              </button>
            ))}
            {filtered.length === 0 && <div className="combo-empty">No matches</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// A Yes/No question, stored as a real boolean (not the string "true"/"false").
function YesNo({ label, k, v, set }) {
  return (
    <Select
      label={label}
      k={k}
      v={v}
      set={(key, x) => set(key, x === 'true')}
      options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
    />
  );
}

// A row of toggle-able tag buttons backing a multi-select array field.
function Choices({ title, items, selected = [], toggle }) {
  return (
    <div className="choices">
      <b>{title}</b>
      <div>
        {items.map((x) => (
          <button type="button" className={selected?.includes(x) ? 'selected' : ''} onClick={() => toggle(x)} key={x}>
            {x}
          </button>
        ))}
      </div>
    </div>
  );
}

// Shared field set for both the household head and the spouse — `prefix`
// picks which set of `${prefix}_*` fields to read/write. `requiredFields`
// (e.g. ['name','age',...]) marks matching fields as required — used for
// the head of family on step 0; the spouse step passes none, since a spouse
// section is only relevant to some households.
function Person({ prefix, title, f, set, requiredFields = [], showError = false }) {
  const isRequired = (field) => requiredFields.includes(field);
  return (
    <Section title={title}>
      <Grid>
        <Input label="Name" k={`${prefix}_name`} v={f} set={set} required={isRequired('name')} showError={showError} />
        <Input label="Age" k={`${prefix}_age`} v={f} set={set} type="number" required={isRequired('age')} showError={showError} />
        <Select
          label="Gender" k={`${prefix}_gender`} v={f} set={set} options={['Male', 'Female', 'Other', 'Prefer not to say']}
          required={isRequired('gender')} showError={showError}
        />
        <Select
          label="Marital status" k={`${prefix}_marital_status`} v={f} set={set}
          options={['Married', 'Unmarried', 'Widowed', 'Separated/Divorced']}
          required={isRequired('marital_status')} showError={showError}
        />
        <Select
          label="Education" k={`${prefix}_education`} v={f} set={set}
          options={[
            'No formal education', 'Primary', 'Middle school', '10th', '12th', 'ITI/Diploma',
            'Graduate', 'Postgraduate', 'Madrasa education', 'Other',
          ]}
        />
        <Select label="Occupation" k={`${prefix}_occupation`} v={f} set={set} options={occupations} />
        <Input label="Skill" k={`${prefix}_skill`} v={f} set={set} />
        <Select
          label="Namaz" k={`${prefix}_namaz`} v={f} set={set}
          options={['Regular 5 times', 'Often', 'Occasionally', 'Friday only', 'Not currently', 'Not applicable / prefer not to say']}
        />
        <Input label="Monthly income (₹)" k={`${prefix}_income`} v={f} set={set} type="number" />
      </Grid>
    </Section>
  );
}

// Repeatable "family members" section — each row is one row in the
// `dependants` table once saved (see server/src/routes/surveys.routes.js).
function Dependants({ f, set }) {
  const add = () => set('dependants', [...f.dependants, { name: '', member_type: 'DEPENDANT' }]);
  const update = (i, key, value) => set('dependants', f.dependants.map((d, j) => (j === i ? { ...d, [key]: value } : d)));
  const remove = (i) => set('dependants', f.dependants.filter((_, j) => j !== i));

  return (
    <Section title="Family members / dependants">
      <p>Add each dependant. Student and working fields can be filled as applicable.</p>

      {f.dependants.map((d, i) => (
        <div className="dependant" key={i}>
          <div className="dependant-head">
            <h3>Member {i + 1}</h3>
            <button type="button" className="danger" onClick={() => remove(i)}>Remove</button>
          </div>

          <Grid>
            <Input label="Name" k="name" v={d} set={(key, val) => update(i, key, val)} />
            <Input label="Age" k="age" v={d} set={(key, val) => update(i, key, val)} type="number" />
            <Select
              label="Type" k="member_type" v={d} set={(key, val) => update(i, key, val || 'DEPENDANT')}
              options={['STUDENT', 'WORKING', 'DEPENDANT']}
            />
            <Select
              label="Relationship" k="relationship" v={d} set={(key, val) => update(i, key, val)}
              options={['Son', 'Daughter', 'Parent', 'Spouse', 'Other']}
            />
            <Select
              label="Gender" k="gender" v={d} set={(key, val) => update(i, key, val)}
              options={['Male', 'Female', 'Other']}
            />
            <Input label="Education" k="education" v={d} set={(key, val) => update(i, key, val)} />

            {d.member_type === 'STUDENT' && (
              <>
                <Input label="School / College" k="institution" v={d} set={(key, val) => update(i, key, val)} />
                <Input label="Scholarship availed" k="scholarship_availed" v={d} set={(key, val) => update(i, key, val)} />
              </>
            )}

            {d.member_type === 'WORKING' && (
              <>
                <Select label="Occupation" k="occupation" v={d} set={(key, val) => update(i, key, val)} options={occupations} />
                <Input label="Income" k="income" v={d} set={(key, val) => update(i, key, val)} type="number" />
              </>
            )}

            <Input label="Skill" k="skill" v={d} set={(key, val) => update(i, key, val)} />
            <Select
              label="Namaz" k="namaz" v={d} set={(key, val) => update(i, key, val)}
              options={['Regular 5 times', 'Often', 'Occasionally', 'Not currently']}
            />
            <Input
              label="Disability / health needs" k="disability_or_health_need" v={d} set={(key, val) => update(i, key, val)}
              wide
            />
          </Grid>
        </div>
      ))}

      <button type="button" className="btn secondary" onClick={add}>+ Add family member</button>
    </Section>
  );
}

// Read-only summary shown as the final step before saving.
function Review({ f }) {
  return (
    <Section title="Review before submission">
      <div className="review">
        <p><b>Head:</b> {f.head_name || 'Not entered'}</p>
        <p><b>Address:</b> {f.address || 'Not entered'}</p>
        <p><b>Family members:</b> {f.dependants.length}</p>
        <p><b>House:</b> {f.house_tenure || 'Not entered'} / {f.house_condition || 'Not entered'}</p>
        <p><b>Household income:</b> ₹{Number(f.monthly_household_income || 0).toLocaleString('en-IN')}</p>
        <p><b>Loan outstanding:</b> ₹{Number(f.loan_amount || 0).toLocaleString('en-IN')}</p>
        <p><b>Vulnerability flags:</b> {f.vulnerable_category.join(', ') || 'None selected'}</p>
      </div>
      <label>
        Surveyor notes
        <textarea rows="5" value={f.notes || ''} onChange={() => {}} readOnly />
      </label>
    </Section>
  );
}

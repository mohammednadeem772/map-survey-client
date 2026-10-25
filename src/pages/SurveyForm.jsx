// Multi-step household survey form — used for both "new" (/survey/new) and
// "edit" (/survey/:id). Mirrors the field set the server accepts; see
// server/src/routes/surveys.routes.js `WRITABLE_FIELDS` for the source of truth.
import React, { useEffect, useState } from 'react';
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

export default function SurveyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptySurvey);
  const [areas, setAreas] = useState([]);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

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

  async function save(status) {
    if (!form.consent_given) {
      return alert('Consent is required before saving this survey.');
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
          <button className={i === step ? 'active' : ''} onClick={() => setStep(i)} key={label}>
            {i + 1}
            <span>{label}</span>
          </button>
        ))}
      </div>

      <form className="card form" onSubmit={(e) => e.preventDefault()}>
        {step === 0 && (
          <>
            <Section title="Consent and location">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={!!form.consent_given}
                  onChange={(e) => set('consent_given', e.target.checked)}
                />
                Household informed consent received
              </label>
              <Grid>
                <Select
                  label="Area / Ward"
                  k="area_id"
                  v={form}
                  set={set}
                  options={areas.map((a) => ({ value: a.id, label: `${a.name} (${a.ward_code})` }))}
                />
                <Input label="Address" k="address" v={form} set={set} wide required />
                <Input label="Phone" k="phone" v={form} set={set} />
                <Input label="Latitude" k="latitude" v={form} set={set} type="number" />
                <Input label="Longitude" k="longitude" v={form} set={set} type="number" />
              </Grid>
            </Section>
            <Person prefix="head" title="Head of the family" f={form} set={set} />
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
          <button className="btn secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>
            Back
          </button>
          {step < 5 ? (
            <button className="btn" onClick={() => setStep(step + 1)}>Continue</button>
          ) : (
            <>
              <button className="btn secondary" disabled={saving} onClick={() => save('DRAFT')}>Save draft</button>
              <button className="btn" disabled={saving} onClick={() => save('SUBMITTED')}>Submit survey</button>
            </>
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

function Input({ label, k, v, set, type = 'text', wide = false, required = false }) {
  return (
    <label className={wide ? 'wide' : ''}>
      {label}
      <input
        type={type}
        value={v[k] ?? ''}
        required={required}
        onChange={(e) => set(k, type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
      />
    </label>
  );
}

function Select({ label, k, v, set, options }) {
  return (
    <label>
      {label}
      <select value={v[k] ?? ''} onChange={(e) => set(k, e.target.value)}>
        <option value="">Select</option>
        {options.map((o) =>
          typeof o === 'string'
            ? <option key={o}>{o}</option>
            : <option key={o.value} value={o.value}>{o.label}</option>
        )}
      </select>
    </label>
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
// picks which set of `${prefix}_*` fields to read/write.
function Person({ prefix, title, f, set }) {
  return (
    <Section title={title}>
      <Grid>
        <Input label="Name" k={`${prefix}_name`} v={f} set={set} />
        <Input label="Age" k={`${prefix}_age`} v={f} set={set} type="number" />
        <Select label="Gender" k={`${prefix}_gender`} v={f} set={set} options={['Male', 'Female', 'Other', 'Prefer not to say']} />
        <Select
          label="Marital status" k={`${prefix}_marital_status`} v={f} set={set}
          options={['Married', 'Unmarried', 'Widowed', 'Separated/Divorced']}
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
            <button className="danger" onClick={() => remove(i)}>Remove</button>
          </div>

          <Grid>
            <label>
              Name
              <input value={d.name} onChange={(e) => update(i, 'name', e.target.value)} />
            </label>
            <label>
              Age
              <input type="number" value={d.age || ''} onChange={(e) => update(i, 'age', Number(e.target.value))} />
            </label>
            <label>
              Type
              <select value={d.member_type} onChange={(e) => update(i, 'member_type', e.target.value)}>
                <option>STUDENT</option>
                <option>WORKING</option>
                <option>DEPENDANT</option>
              </select>
            </label>
            <label>
              Relationship
              <select value={d.relationship || ''} onChange={(e) => update(i, 'relationship', e.target.value)}>
                <option value="">Select</option>
                <option>Son</option>
                <option>Daughter</option>
                <option>Parent</option>
                <option>Spouse</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Gender
              <select value={d.gender || ''} onChange={(e) => update(i, 'gender', e.target.value)}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Education
              <input value={d.education || ''} onChange={(e) => update(i, 'education', e.target.value)} />
            </label>

            {d.member_type === 'STUDENT' && (
              <>
                <label>
                  School / College
                  <input value={d.institution || ''} onChange={(e) => update(i, 'institution', e.target.value)} />
                </label>
                <label>
                  Scholarship availed
                  <input value={d.scholarship_availed || ''} onChange={(e) => update(i, 'scholarship_availed', e.target.value)} />
                </label>
              </>
            )}

            {d.member_type === 'WORKING' && (
              <>
                <label>
                  Occupation
                  <select value={d.occupation || ''} onChange={(e) => update(i, 'occupation', e.target.value)}>
                    {occupations.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </label>
                <label>
                  Income
                  <input type="number" value={d.income || ''} onChange={(e) => update(i, 'income', Number(e.target.value))} />
                </label>
              </>
            )}

            <label>
              Skill
              <input value={d.skill || ''} onChange={(e) => update(i, 'skill', e.target.value)} />
            </label>
            <label>
              Namaz
              <select value={d.namaz || ''} onChange={(e) => update(i, 'namaz', e.target.value)}>
                <option value="">Select</option>
                <option>Regular 5 times</option>
                <option>Often</option>
                <option>Occasionally</option>
                <option>Not currently</option>
              </select>
            </label>
            <label className="wide">
              Disability / health needs
              <input
                value={d.disability_or_health_need || ''}
                onChange={(e) => update(i, 'disability_or_health_need', e.target.value)}
              />
            </label>
          </Grid>
        </div>
      ))}

      <button className="btn secondary" onClick={add}>+ Add family member</button>
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

// Color-coded survey status badge, shared by Dashboard's "Recent surveys"
// preview and the full Surveys listing so a status reads the same color
// everywhere in the app.
import React from 'react';

const STATUS_STYLES = {
  DRAFT: 'bg-amber-50 text-amber-800 ring-amber-700/10',
  SUBMITTED: 'bg-sky-50 text-sky-800 ring-sky-700/10',
  VERIFIED: 'bg-teal-50 text-teal-800 ring-teal-700/10',
  RETURNED: 'bg-rose-50 text-rose-800 ring-rose-700/10',
};

export default function StatusPill({ status }) {
  return <span className={`pill ${STATUS_STYLES[status] || ''}`}>{status}</span>;
}

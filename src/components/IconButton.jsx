// Small icon-only action button used in list row actions (Surveys, Admin
// users table) — a text label would be too noisy repeated down a column, so
// this shows just the icon with a native tooltip (title/aria-label) and a
// hover background/color effect instead.
import React from 'react';
import Spinner from './Spinner';

export default function IconButton({ icon: Icon, label, onClick, href, variant = 'default', disabled = false, loading = false }) {
  const className = `icon-btn icon-btn-${variant}`;

  if (href) {
    return (
      <a href={href} title={label} aria-label={label} className={className}>
        <Icon className="icon-btn-svg" aria-hidden="true" />
      </a>
    );
  }

  return (
    <button type="button" title={label} aria-label={label} className={className} onClick={onClick} disabled={disabled || loading}>
      {loading ? <Spinner size={16} /> : <Icon className="icon-btn-svg" aria-hidden="true" />}
    </button>
  );
}

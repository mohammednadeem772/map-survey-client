// Compact "Powered by Albino Labs" credit badge, styled after the
// reference image: dark pill, small amber mark, "Powered by" in muted
// gray with the name in bold white. Shared by the landing footer and the
// login screen so the credit looks identical in both places.
import React from 'react';
import { Triangle } from 'lucide-react';

export default function PoweredByBadge() {
  return (
    <a
      href="https://www.albinolabstechnologies.com/"
      target="_blank"
      rel="noopener noreferrer"
      className="powered-badge"
    >
      <Triangle size={14} fill="currentColor" aria-hidden="true" />
      <span>
        Powered by <b>AlbinoLabs</b>
      </span>
    </a>
  );
}

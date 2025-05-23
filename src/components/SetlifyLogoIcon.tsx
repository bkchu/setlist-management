import * as React from "react";
import { SVGProps } from "react";

/**
 * Modern SVG Logo Icon for Setlify
 * Combines a musical note and setlist lines for a unique, minimal look
 * Usage: <SetlifyLogoIcon className="w-8 h-8" />
 */
export function SetlifyLogoIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Setlify Logo Icon"
      {...props}
    >
      {/* Setlist lines */}
      <rect x="8" y="10" width="20" height="2.5" rx="1.25" fill="#222" />
      <rect x="8" y="18" width="16" height="2.5" rx="1.25" fill="#222" />
      <rect x="8" y="26" width="12" height="2.5" rx="1.25" fill="#222" />
      {/* Musical note */}
      <circle cx="36" cy="34" r="6" fill="#4F46E5" />
      <rect x="34.5" y="14" width="3" height="18" rx="1.5" fill="#4F46E5" />
      <rect x="34.5" y="14" width="7" height="2.5" rx="1.25" fill="#4F46E5" />
    </svg>
  );
}

export default SetlifyLogoIcon;

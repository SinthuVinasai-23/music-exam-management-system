import React from 'react'

const paths = {
  search: <><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></>,
  dashboard: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
  applications: <><rect x="5" y="4" width="14" height="16" rx="1"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
  config: <><path d="M5 3v18M12 3v18M19 3v18"/><path d="M2 8h6M9 14h6M16 6h6"/></>,
  users: <><circle cx="9" cy="8" r="3"/><circle cx="16.5" cy="9" r="2.5"/><path d="M3.5 20c.8-4 3.3-6 5.5-6s4.7 2 5.5 6M14 15c2.5.2 4.7 1.8 5.5 5"/></>,
  results: <path d="m12 2 3 6 6 .9-4.5 4.4 1.1 6.2L12 16.6 6.4 19.5l1.1-6.2L3 8.9 9 8z"/>,
  ceremony: <><path d="m3 9 9-5 9 5-9 5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/></>,
  bell: <><path d="M6 17h12l-1.5-2v-4a4.5 4.5 0 0 0-9 0v4z"/><path d="M10 20h4"/></>,
  history: <><path d="M4 5v5h5"/><path d="M5 10a7 7 0 1 0 2-5"/><path d="M12 8v5l3 2"/></>,
  avatar: <><circle cx="12" cy="9" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>,
  report: <><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v5h5M10 13h6M10 17h6"/></>,
  sliders: <><path d="M5 3v18M12 3v18M19 3v18"/><circle cx="5" cy="8" r="2"/><circle cx="12" cy="15" r="2"/><circle cx="19" cy="10" r="2"/></>,
  shield: <><path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/></>,
  more: <><circle cx="12" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/></>,
  edit: <><path d="m4 20 4.5-1 10-10-3.5-3.5-10 10z"/><path d="m13.5 6.5 3.5 3.5"/></>,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/><path d="m9 15 2 2 4-4"/></>,
  badge: <><rect x="5" y="7" width="14" height="13" rx="2"/><path d="M9 7V5a3 3 0 0 1 6 0v2M9 12h6M9 16h4"/></>,
  reset: <><path d="M5 8H2V5"/><path d="M3 8a9 9 0 1 1 1 9"/><path d="M12 7v5h4"/></>,
  ban: <><circle cx="12" cy="12" r="9"/><path d="m5.7 5.7 12.6 12.6"/></>,
  addUser: <><circle cx="9" cy="8" r="3"/><path d="M3 20c.7-4 3-6 6-6s5.3 2 6 6M18 7v6M15 10h6"/></>,
  close: <path d="M5 5l14 14M19 5 5 19"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  star: <path d="m12 3 2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9z"/>,
  logout: <><path d="M10 5H4v14h6"/><path d="M13 8l4 4-4 4M8 12h9"/></>,
  chevronLeft: <path d="m15 5-7 7 7 7"/>,
  chevronRight: <path d="m9 5 7 7-7 7"/>
}

export default function Icon({ name, size = 20, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] || paths.dashboard}
    </svg>
  )
}

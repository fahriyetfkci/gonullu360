export default function SettingsIcon({ name, size = 21 }) {
  const paths = {
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 21v-3a7 7 0 0 1 14 0v3M4 21h16" /></>,
    profile: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="9" r="3" /><path d="M5.5 18a7 7 0 0 1 13 0" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18M5 6h14M5 18h14" /></>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z" /><path d="m8 12 3 3 5-6" /></>,
    bell: <><path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5zM10 21h4M12 2v2" /></>,
    integration: <><path d="m12 2 4 4-4 4-4-4zM6 8l4 4-4 4-4-4zM18 8l4 4-4 4-4-4zM12 14l4 4-4 4-4-4z" /></>,
    edit: <><path d="m15 5 4 4M4 20l5-1L21 7l-4-4L5 15z" /></>,
    phone: <><rect x="7" y="2" width="10" height="20" rx="1" /><path d="M7 6h10M11 18h2" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="1" /><path d="m3 6 9 7 9-7" /></>,
    laptop: <><path d="M4 4h16v13H4zM2 20h20" /></>,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

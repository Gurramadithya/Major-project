import { NavLink } from 'react-router-dom';
import { UploadIcon, DetectIcon, AssistantIcon } from './icons/ClinicalIcons';

const items = [
  { to: '/', label: 'Overview' },
  { to: '/upload', label: 'Case Upload', icon: <UploadIcon /> },
  { to: '/detection', label: 'Detection', icon: <DetectIcon /> },
  { to: '/viewer', label: '3D Viewer' },
  { to: '/assistant', label: 'Assistant', icon: <AssistantIcon /> },
  { to: '/history', label: 'Case History' },
  { to: '/library', label: 'Medical Library' },
  { to: '/reports', label: 'Reports' },
  { to: '/analytics', label: 'Analytics' },
];

const Sidebar = () => (
  <aside className="hidden w-72 shrink-0 rounded-3xl border border-slate-800 bg-slate-900/60 p-4 lg:block">
    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
      <p className="text-sm font-semibold text-cyan-300">Clinical Toolkit</p>
      <p className="mt-2 text-sm text-slate-300">Monitor cases, review insights, and steer the care pathway from one place.</p>
    </div>
    <nav className="mt-6 space-y-2">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
              isActive ? 'bg-slate-800 text-white shadow-inner shadow-cyan-500/10' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          {item.icon ? <span className="text-cyan-300">{item.icon}</span> : null}
          {item.label}
        </NavLink>
      ))}
    </nav>
  </aside>
);

export default Sidebar;

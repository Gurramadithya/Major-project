import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/assistant', label: 'AI Assistant' },
  { to: '/history', label: 'Case History' },
  { to: '/library', label: 'Medical Library' },
  { to: '/reports', label: 'Reports' },
];

const Navbar = () => {
  const handleReset = () => {
    // Clear all session data
    localStorage.removeItem('latestCase');
    localStorage.removeItem('analyticsSnapshot');
    localStorage.removeItem('assistantConversation');
    localStorage.removeItem('viewerCameraPosition');
    // Reload the page to reset all state
    window.location.reload();
  };

  return (
  <header className="border-b border-slate-800 bg-slate-950/85 backdrop-blur">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">Medical AI</p>
        <h1 className="text-lg font-semibold text-white">Clinical Intelligence Platform</h1>
      </div>
      <nav className="flex flex-wrap gap-2 items-center">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded-full px-4 py-2 text-sm transition ${
                isActive ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
        <button
          onClick={handleReset}
          className="rounded-full px-4 py-2 text-sm transition bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-600/20"
        >
          Reset
        </button>
      </nav>
    </div>
  </header>
  );
};

export default Navbar;

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../auth/session.store';

const NAV = [
  { to: '/', label: 'Tableau de bord', icon: '📊', end: true },
  { to: '/formations', label: 'Formations', icon: '🎓' },
  { to: '/access', label: 'Accès', icon: '🔐' },
];

export function Layout() {
  const user = useSessionStore((s) => s.user);
  const logout = useSessionStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Barre latérale */}
      <aside
        style={{
          width: 'var(--sidebar-width)',
          background: 'var(--bg-elevated)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <div style={{ padding: '22px 18px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'var(--primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}
            >
              📄
            </div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '15px' }}>PDF Formation</div>
              <div style={{ fontSize: '11px', color: 'var(--text-faint)', fontWeight: '700' }}>BACK-OFFICE</div>
            </div>
          </div>
        </div>

        <nav style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '14px',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                background: isActive ? 'var(--primary-soft)' : 'transparent',
              })}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                background: user?.avatarColor ?? 'var(--primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '14px',
              }}
            >
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: '800', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '12px',
              border: 'none',
              background: 'rgba(220,38,38,0.08)',
              color: 'var(--danger)',
              fontWeight: '700',
            }}
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Contenu */}
      <main style={{ flex: 1, padding: '28px 32px', overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}

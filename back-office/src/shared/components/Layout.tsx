import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/features/auth/session.store';
import { styles } from './Layout.styles';
import { Brand } from './Brand';
import { Avatar } from './Avatar';
import { Button } from './Button';

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
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <Brand />
        </div>

        <nav style={styles.nav}>
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
                fontWeight: 700,
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

        <div style={styles.footer}>
          <div style={styles.userRow}>
            <Avatar firstName={user?.firstName} lastName={user?.lastName} color={user?.avatarColor} />
            <div style={styles.userInfo}>
              <div style={styles.userName}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={styles.userEmail}>{user?.email}</div>
            </div>
          </div>
          <Button variant="dangerSoft" onClick={() => void handleLogout()} style={{ width: '100%' }}>
            Se déconnecter
          </Button>
        </div>
      </aside>

      <main style={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}

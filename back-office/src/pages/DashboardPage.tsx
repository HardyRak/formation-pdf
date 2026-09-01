import { useQuery } from '@tanstack/react-query';
import { getStats, listFormations } from '../api/admin';
import { Card, Badge, Loading, ErrorBox } from '../components/ui';

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: '30px', fontWeight: '900', color }}>{value}</div>
    </Card>
  );
}

export function DashboardPage() {
  const stats = useQuery({ queryKey: ['stats'], queryFn: getStats });
  const formations = useQuery({ queryKey: ['formations'], queryFn: listFormations });

  if (stats.isLoading) return <Loading label="Chargement du tableau de bord…" />;
  if (stats.isError) return <ErrorBox message={stats.error?.message} onRetry={() => stats.refetch()} />;

  const s = stats.data!;
  const totalDocs = s.perFormation.reduce((sum, f) => sum + f.documents, 0) || 1;
  const maxDocs = Math.max(...s.perFormation.map((f) => f.documents), 1);

  return (
    <div>
      <h1 style={{ fontSize: '24px', margin: '0 0 24px' }}>Tableau de bord</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <StatCard label="Utilisateurs" value={s.users} color="var(--primary)" />
        <StatCard label="Responsables" value={s.managers} color="var(--accent)" />
        <StatCard label="Apprenants" value={s.learners} color="var(--primary)" />
        <StatCard label="Formations" value={s.formations} color="var(--warning)" />
        <StatCard label="Niveaux" value={s.levels} color="var(--accent)" />
        <StatCard label="Documents" value={s.documents} color="var(--success)" />
        <StatCard label="Attributions d'accès" value={s.grants} color="var(--warning)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginTop: '24px' }}>
        <Card>
          <h3 style={{ margin: '0 0 16px' }}>Complétion par formation</h3>
          {s.perFormation.length === 0 ? (
            <p style={{ color: 'var(--text-faint)' }}>Aucun document encore importé.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {s.perFormation.map((f) => {
                const name = formations.data?.find((x) => x.id === f.formationId)?.name ?? f.formationId;
                const pct = Math.round((f.documents / totalDocs) * 100);
                const barPct = Math.round((f.documents / maxDocs) * 100);
                return (
                  <div key={f.formationId} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', fontSize: '14px' }}>{name}</span>
                      <Badge>{f.documents} doc{f.documents > 1 ? 's' : ''}</Badge>
                    </div>
                    <div style={{ height: '10px', borderRadius: '999px', background: 'var(--surface-alt)', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          borderRadius: '999px',
                          background: 'var(--primary)',
                          width: `${barPct}%`,
                          transition: 'width 0.4s',
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>{pct}% du catalogue</div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

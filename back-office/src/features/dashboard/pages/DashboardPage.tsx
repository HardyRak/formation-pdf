import { useState } from 'react';
import { Badge, Card, ProgressBar, QueryGate } from '@/shared/components';
import type { UserDto } from '@/shared/types/api';
import { useDashboard } from '../hooks/useDashboard';
import { StatCard } from '../components/StatCard';
import { LearnersCard } from '../components/LearnersCard';
import { LearnerProgressModal } from '../components/LearnerProgressModal';
import { styles } from './DashboardPage.styles';

export function DashboardPage() {
  const { stats, formations } = useDashboard();
  const [selectedLearner, setSelectedLearner] = useState<UserDto | null>(null);

  return (
    <QueryGate
      isLoading={stats.isLoading}
      isError={stats.isError}
      errorMessage={stats.error?.message}
      onRetry={() => void stats.refetch()}
      loadingLabel="Chargement du tableau de bord…"
    >
      {() => {
        const s = stats.data!;
        const totalDocs = s.perFormation.reduce((sum, f) => sum + f.documents, 0) || 1;
        const maxDocs = Math.max(...s.perFormation.map((f) => f.documents), 1);

        return (
          <div>
            <h1 style={styles.title}>Tableau de bord</h1>

            <div style={styles.statsGrid}>
              <StatCard label="Utilisateurs" value={s.users} color="var(--primary)" />
              <StatCard label="Responsables" value={s.managers} color="var(--accent)" />
              <StatCard label="Apprenants" value={s.learners} color="var(--primary)" />
              <StatCard label="Formations" value={s.formations} color="var(--warning)" />
              <StatCard label="Niveaux" value={s.levels} color="var(--accent)" />
              <StatCard label="Documents" value={s.documents} color="var(--success)" />
              <StatCard label="Attributions d'accès" value={s.grants} color="var(--warning)" />
            </div>

            <div style={styles.sections}>
              <Card>
                <h3 style={styles.sectionTitle}>Répartition du catalogue par formation</h3>
                {s.perFormation.length === 0 ? (
                  <p style={styles.emptyText}>Aucun document encore importé.</p>
                ) : (
                  <div style={styles.rowsList}>
                    {s.perFormation.map((f) => {
                      const name =
                        formations.data?.find((x) => x.id === f.formationId)?.name ?? f.formationId;
                      const percent = Math.round((f.documents / totalDocs) * 100);
                      const barPercent = Math.round((f.documents / maxDocs) * 100);
                      return (
                        <div key={f.formationId} style={styles.row}>
                          <div style={styles.rowHead}>
                            <span style={styles.rowName}>{name}</span>
                            <Badge>
                              {f.documents} doc{f.documents > 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <ProgressBar percent={barPercent} />
                          <div style={styles.pctLabel}>{percent}% du catalogue</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              <LearnersCard onSelect={setSelectedLearner} />
            </div>

            {selectedLearner ? (
              <LearnerProgressModal learner={selectedLearner} onClose={() => setSelectedLearner(null)} />
            ) : null}
          </div>
        );
      }}
    </QueryGate>
  );
}

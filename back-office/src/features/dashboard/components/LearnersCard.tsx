import type { UserDto } from '@/shared/types/api';
import { Alert, Avatar, Button, Card, Empty, Loading, TextField } from '@/shared/components';
import { useLearners } from '../hooks/useLearners';
import { styles } from './LearnersCard.styles';

/**
 * Card du dashboard : liste des apprenants, paginée côté serveur, avec
 * recherche (debouncée). Un clic sur un apprenant ouvre son avancement.
 */
export function LearnersCard({ onSelect }: { onSelect: (learner: UserDto) => void }) {
  const {
    search,
    setSearch,
    page,
    setPage,
    learners,
    total,
    totalPages,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useLearners();

  return (
    <Card style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>Apprenants</h3>
        <span style={styles.count}>
          {total} apprenant{total > 1 ? 's' : ''}
          {isFetching ? '…' : ''}
        </span>
      </div>

      <TextField
        type="search"
        placeholder="Rechercher un apprenant (nom, email, société)…"
        aria-label="Rechercher un apprenant"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading ? (
        <Loading label="Chargement des apprenants…" />
      ) : isError ? (
        <Alert
          message={error?.message ?? 'Impossible de charger les apprenants.'}
          onRetry={() => void refetch()}
        />
      ) : learners.length === 0 ? (
        <Empty label="Aucun apprenant trouvé." />
      ) : (
        <div style={styles.list}>
          {learners.map((learner) => (
            <button
              key={learner.id}
              type="button"
              style={styles.learnerButton}
              onClick={() => onSelect(learner)}
              title={`Voir l'avancement de ${learner.firstName} ${learner.lastName}`}
            >
              <Avatar firstName={learner.firstName} lastName={learner.lastName} color={learner.avatarColor} />
              <span style={styles.learnerMeta}>
                <span style={{ display: 'block', fontWeight: 700, fontSize: '14px' }}>
                  {learner.firstName} {learner.lastName}
                </span>
                <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {learner.email}
                </span>
              </span>
              <span style={styles.learnerArrow} aria-hidden>
                ›
              </span>
            </button>
          ))}
        </div>
      )}

      <div style={styles.footer}>
        <Button
          variant="secondary"
          disabled={page <= 1 || isLoading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          ← Précédent
        </Button>
        <span style={styles.pageLabel}>
          Page {page} / {Math.max(1, totalPages)}
        </span>
        <Button
          variant="secondary"
          disabled={page >= totalPages || isLoading}
          onClick={() => setPage((p) => p + 1)}
        >
          Suivant →
        </Button>
      </div>
    </Card>
  );
}

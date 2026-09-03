import type { LearnerFormationProgressDto, UserDto } from '@/shared/types/api';
import { Avatar, Badge, Modal, ProgressBar, QueryGate } from '@/shared/components';
import { useLearnerProgress } from '../hooks/useLearnerProgress';
import { styles } from './LearnerProgressModal.styles';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

/** « 12 août 2025 » ; null si aucune activité. */
const formatDate = (timestamp: number | null): string | null =>
  timestamp === null ? null : dateFormatter.format(new Date(timestamp));

/**
 * Modale d'avancement d'un apprenant : progression par formation (pages lues,
 * documents terminés, dernière activité) + progression globale.
 */
export function LearnerProgressModal({
  learner,
  onClose,
}: {
  learner: UserDto;
  onClose: () => void;
}) {
  const { progress, isLoading, isError, error, refetch } = useLearnerProgress(learner.id);

  return (
    <Modal title={`Avancement — ${learner.firstName} ${learner.lastName}`} onClose={onClose}>
      <div style={styles.learnerHead}>
        <Avatar
          firstName={learner.firstName}
          lastName={learner.lastName}
          color={learner.avatarColor}
        />
        <div style={styles.learnerIdentities}>
          <h3 style={styles.learnerName}>
            {learner.firstName} {learner.lastName}
          </h3>
          <div style={styles.learnerEmail}>{learner.email}</div>
        </div>
        {progress ? (
          <div style={styles.globalBlock}>
            <span style={styles.globalLabel}>GLOBAL</span>
            <span style={styles.globalValue}>{progress.globalPercent}%</span>
          </div>
        ) : null}
      </div>

      <QueryGate
        isLoading={isLoading}
        isError={isError}
        errorMessage={error?.message}
        onRetry={() => void refetch()}
        loadingLabel="Chargement de l'avancement…"
      >
        {() =>
          progress && progress.formations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {progress.formations.map((formation) => (
                <FormationProgressRow key={formation.formationId} formation={formation} />
              ))}
            </div>
          ) : (
            <p style={styles.emptyText}>
              Cet apprenant n'a accès à aucune formation (ou n'a encore rien ouvert).
            </p>
          )
        }
      </QueryGate>
    </Modal>
  );
}

/** Une formation : identité, documents terminés, barre de pages lues, activité. */
function FormationProgressRow({ formation }: { formation: LearnerFormationProgressDto }) {
  const lastActivity = formatDate(formation.lastActivityAt);

  return (
    <div style={styles.formationRow}>
      <div style={styles.formationHead}>
        <div style={styles.formationIdentity}>
          <span style={styles.formationIcon} aria-hidden>
            {formation.icon}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={styles.formationName}>{formation.formationName}</div>
            <div style={styles.formationMeta}>
              {formation.documentsCompleted}/{formation.documentsTotal} document
              {formation.documentsTotal > 1 ? 's' : ''} terminé
              {formation.documentsCompleted > 1 ? 's' : ''}
              {lastActivity ? ` · ${lastActivity}` : ''}
            </div>
          </div>
        </div>
        <span style={styles.percentLabel}>{formation.percent}%</span>
      </div>
      <ProgressBar percent={formation.percent} />
      <div style={{ display: 'flex', gap: '8px' }}>
        <Badge color={formation.color}>
          {formation.pagesRead} / {formation.totalPages} pages lues
        </Badge>
        <Badge color={formation.color}>
          {formation.documentsStarted} commencé{formation.documentsStarted > 1 ? 's' : ''}
        </Badge>
      </div>
    </div>
  );
}

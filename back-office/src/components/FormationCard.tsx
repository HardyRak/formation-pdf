import type { FormationDto } from '../api/types';
import { styles } from './FormationCard.styles';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { ConfirmButton } from './ConfirmButton';
import { FormationIcon } from './FormationIcon';

export function FormationCard({
  formation,
  onOpenLevels,
  onEdit,
  onDelete,
}: {
  formation: FormationDto;
  onOpenLevels: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card style={styles.card}>
      <div style={styles.header}>
        <div style={{ ...styles.tile, background: formation.color + '22' }}>
          <FormationIcon name={formation.icon} color={formation.color} />
        </div>
        <div style={styles.names}>
          <div style={styles.name}>{formation.name}</div>
          <div style={styles.category}>{formation.category}</div>
        </div>
        {formation.mandatory ? <Badge color="var(--warning)">Obligatoire</Badge> : null}
      </div>
      <p style={styles.description}>{formation.description}</p>
      <div style={styles.counts}>
        <span>{formation.levelsCount} niveaux</span>
        <span>•</span>
        <span>{formation.documentsCount} docs</span>
        <span>•</span>
        <span>{formation.totalPages} pages</span>
      </div>
      <div style={styles.actions}>
        <Button variant="secondary" onClick={onOpenLevels}>
          Niveaux
        </Button>
        <Button variant="ghost" onClick={onEdit}>
          Éditer
        </Button>
        <ConfirmButton
          variant="danger"
          confirmMessage={`Supprimer la formation « ${formation.name} » ?`}
          onClick={onDelete}
        >
          Supprimer
        </ConfirmButton>
      </div>
    </Card>
  );
}

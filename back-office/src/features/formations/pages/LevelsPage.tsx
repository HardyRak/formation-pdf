import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  ConfirmButton,
  Empty,
  Field,
  FormCard,
  FormGrid,
  ListRow,
  PageHeader,
  QueryGate,
  TextArea,
  TextField,
} from '@/shared/components';
import type { LevelDto } from '@/shared/types/api';
import { useFormations } from '../hooks/useFormations';
import { useLevels } from '../hooks/useLevels';
import { styles } from './LevelsPage.styles';

export function LevelsPage() {
  const { formationId = '' } = useParams();
  const navigate = useNavigate();

  const { formations } = useFormations();
  const { levels, isLoading, isError, error, refetch, createMutation, updateMutation, deleteMutation } =
    useLevels(formationId);

  const [editing, setEditing] = useState<Partial<LevelDto> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const formationName = formations.find((f) => f.id === formationId)?.name ?? 'Formation';
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleStartNew = () => {
    setEditing({ name: '', description: '' });
    setIsNew(true);
    setFormError(null);
  };

  const handleStartEdit = (level: LevelDto) => {
    setEditing({ ...level });
    setIsNew(false);
    setFormError(null);
  };

  const handleCancel = () => {
    setEditing(null);
    setFormError(null);
  };

  const handleSubmit = () => {
    if (!editing) return;
    const options = {
      onSuccess: () => handleCancel(),
      onError: (e: unknown) =>
        setFormError((e as { message?: string }).message ?? "Erreur lors de l'enregistrement."),
    };
    if (isNew) createMutation.mutate(editing, options);
    else if (editing.id) updateMutation.mutate({ id: editing.id, body: editing }, options);
  };

  const handleDelete = (id: string) => deleteMutation.mutate(id);

  return (
    <QueryGate
      isLoading={isLoading}
      isError={isError}
      errorMessage={error?.message}
      onRetry={() => void refetch()}
      loadingLabel="Chargement des niveaux…"
    >
      <div>
        <PageHeader
          title={`${formationName} — Niveaux`}
          onBack={() => navigate('/formations')}
          backLabel="← Retour aux formations"
          action={<Button onClick={handleStartNew}>+ Nouveau niveau</Button>}
        />

        {editing ? (
          <FormCard
            title={isNew ? 'Nouveau niveau' : 'Éditer le niveau'}
            error={formError}
            submitting={isSaving}
            submitLabel={isNew ? 'Créer' : 'Enregistrer'}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          >
            <FormGrid>
              <Field label="Nom">
                <TextField
                  value={editing.name ?? ''}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </Field>
              <Field label="Ordre">
                <TextField
                  type="number"
                  value={editing.order ?? ''}
                  onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })}
                />
              </Field>
            </FormGrid>
            <div style={styles.descField}>
              <Field label="Description">
                <TextArea
                  rows={3}
                  value={editing.description ?? ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </Field>
            </div>
          </FormCard>
        ) : null}

        {levels.length === 0 ? (
          <Empty label="Aucun niveau dans cette formation." />
        ) : (
          <div style={styles.list}>
            {levels.map((level) => (
              <ListRow
                key={level.id}
                tile={level.order}
                tileStyle={styles.tile}
                title={level.name}
                subtitle={level.description}
                badges={
                  <>
                    <Badge>{level.documentsCount} docs</Badge>
                    <Badge color="var(--accent)">{level.totalPages} pages</Badge>
                  </>
                }
                actions={
                  <>
                    <Button variant="secondary" onClick={() => navigate(`/levels/${level.id}/documents`)}>
                      Documents
                    </Button>
                    <Button variant="ghost" onClick={() => handleStartEdit(level)}>
                      Éditer
                    </Button>
                    <ConfirmButton
                      variant="danger"
                      confirmMessage={`Supprimer le niveau « ${level.name} » ?`}
                      onClick={() => handleDelete(level.id)}
                    >
                      Supprimer
                    </ConfirmButton>
                  </>
                }
              />
            ))}
          </div>
        )}
      </div>
    </QueryGate>
  );
}

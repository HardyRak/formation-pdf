import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, ConfirmButton, Empty, ListRow, PageHeader, QueryGate } from '@/shared/components';
import type { LevelDto } from '@/shared/types/api';
import { useFormations } from '../hooks/useFormations';
import { useLevels } from '../hooks/useLevels';
import { LevelForm } from '../components/LevelForm';
import { styles } from './LevelsPage.styles';

export function LevelsPage() {
  const { formationId = '' } = useParams();
  const navigate = useNavigate();

  const { formations } = useFormations();
  const { levels, isLoading, isError, error, refetch, createMutation, updateMutation, deleteMutation } =
    useLevels(formationId);

  // null = fermé ; 'new' = création ; { …level } = édition.
  const [editing, setEditing] = useState<LevelDto | 'new' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const formationName = formations.find((f) => f.id === formationId)?.name ?? 'Formation';
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const openNew = () => {
    setEditing('new');
    setFormError(null);
  };
  const openEdit = (level: LevelDto) => {
    setEditing(level);
    setFormError(null);
  };
  const close = () => {
    setEditing(null);
    setFormError(null);
  };

  const handleSubmit = (values: { name: string; order?: number; description: string }) => {
    const options = {
      onSuccess: () => close(),
      onError: (e: unknown) =>
        setFormError((e as { message?: string }).message ?? "Erreur lors de l'enregistrement."),
    };
    if (editing === 'new') createMutation.mutate(values, options);
    else if (editing) updateMutation.mutate({ id: editing.id, body: values }, options);
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
          action={<Button onClick={openNew}>+ Nouveau niveau</Button>}
        />

        {editing ? (
          <LevelForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? undefined : editing}
            submitting={isSaving}
            error={formError}
            onSubmit={handleSubmit}
            onClose={close}
          />
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
                    <Button variant="ghost" onClick={() => openEdit(level)}>
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

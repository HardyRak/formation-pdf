import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listLevels, createLevel, updateLevel, deleteLevel, listFormations } from '../api/admin';
import type { LevelDto } from '../api/types';
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
} from '../components';
import { styles } from './LevelsPage.styles';

export function LevelsPage() {
  const { formationId = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const formation = useQuery({ queryKey: ['formations'], queryFn: listFormations });
  const levels = useQuery({ queryKey: ['levels', formationId], queryFn: () => listLevels(formationId) });

  const [editing, setEditing] = useState<Partial<LevelDto> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const formationName = formation.data?.find((f) => f.id === formationId)?.name ?? 'Formation';

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      if (isNew) return createLevel(formationId, editing);
      if (!editing.id) return;
      return updateLevel(editing.id, editing);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['levels', formationId] });
      void qc.invalidateQueries({ queryKey: ['formations'] });
      setEditing(null);
      setIsNew(false);
      setFormError(null);
    },
    onError: (e) => setFormError((e as { message?: string }).message ?? "Erreur lors de l'enregistrement."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLevel(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['levels', formationId] });
      void qc.invalidateQueries({ queryKey: ['formations'] });
    },
  });

  const startNew = () => {
    setEditing({ name: '', description: '' });
    setIsNew(true);
    setFormError(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setFormError(null);
  };

  const items = levels.data ?? [];

  return (
    <QueryGate
      isLoading={levels.isLoading}
      isError={levels.isError}
      errorMessage={levels.error?.message}
      onRetry={() => void levels.refetch()}
      loadingLabel="Chargement des niveaux…"
    >
      <div>
        <PageHeader
          title={`${formationName} — Niveaux`}
          onBack={() => navigate('/formations')}
          backLabel="← Retour aux formations"
          action={<Button onClick={startNew}>+ Nouveau niveau</Button>}
        />

        {editing ? (
          <FormCard
            title={isNew ? 'Nouveau niveau' : 'Éditer le niveau'}
            error={formError}
            submitting={saveMutation.isPending}
            submitLabel={isNew ? 'Créer' : 'Enregistrer'}
            onSubmit={() => saveMutation.mutate()}
            onCancel={cancelEdit}
          >
            <FormGrid>
              <Field label="Nom">
                <TextField value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
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
                <TextArea rows={3} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </Field>
            </div>
          </FormCard>
        ) : null}

        {items.length === 0 ? (
          <Empty label="Aucun niveau dans cette formation." />
        ) : (
          <div style={styles.list}>
            {items.map((l) => (
              <ListRow
                key={l.id}
                tile={l.order}
                tileStyle={styles.tile}
                title={l.name}
                subtitle={l.description}
                badges={
                  <>
                    <Badge>{l.documentsCount} docs</Badge>
                    <Badge color="var(--accent)">{l.totalPages} pages</Badge>
                  </>
                }
                actions={
                  <>
                    <Button variant="secondary" onClick={() => navigate(`/levels/${l.id}/documents`)}>
                      Documents
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditing({ ...l });
                        setIsNew(false);
                        setFormError(null);
                      }}
                    >
                      Éditer
                    </Button>
                    <ConfirmButton
                      variant="danger"
                      confirmMessage={`Supprimer le niveau « ${l.name} » ?`}
                      onClick={() => deleteMutation.mutate(l.id)}
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

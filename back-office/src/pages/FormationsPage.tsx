import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listFormations, createFormation, updateFormation, deleteFormation } from '../api/admin';
import type { FormationDto } from '../api/types';
import {
  Button,
  CheckboxField,
  Empty,
  Field,
  FormCard,
  FormationCard,
  FormGrid,
  PageHeader,
  QueryGate,
  TextArea,
  TextField,
} from '../components';
import { styles } from './FormationsPage.styles';

type FormState = Partial<FormationDto> & { name: string; description: string; category: string };

const emptyForm: FormState = { name: '', description: '', category: '', icon: 'library', color: '#4F46E5', mandatory: false };

export function FormationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['formations'], queryFn: listFormations });

  const [editing, setEditing] = useState<FormState | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      if (isNew) return createFormation(editing);
      if (!editing.id) return;
      return updateFormation(editing.id, editing);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['formations'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      setEditing(null);
      setIsNew(false);
      setFormError(null);
    },
    onError: (e) => setFormError((e as { message?: string }).message ?? "Erreur lors de l'enregistrement."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFormation(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['formations'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const startNew = () => {
    setEditing(emptyForm);
    setIsNew(true);
    setFormError(null);
  };

  const startEdit = (f: FormationDto) => {
    setEditing({ ...f });
    setIsNew(false);
    setFormError(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setFormError(null);
  };

  const items = data ?? [];

  return (
    <QueryGate
      isLoading={isLoading}
      isError={isError}
      errorMessage={error?.message}
      onRetry={() => void refetch()}
      loadingLabel="Chargement des formations…"
    >
      <div>
        <PageHeader title="Formations" action={<Button onClick={startNew}>+ Nouvelle formation</Button>} />

        {editing ? (
          <FormCard
            title={isNew ? 'Nouvelle formation' : `Éditer — ${editing.name}`}
            error={formError}
            submitting={saveMutation.isPending}
            submitLabel={isNew ? 'Créer' : 'Enregistrer'}
            onSubmit={() => saveMutation.mutate()}
            onCancel={cancelEdit}
          >
            <FormGrid>
              <Field label="Nom">
                <TextField value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </Field>
              <Field label="Catégorie">
                <TextField value={editing.category ?? ''} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
              </Field>
              <Field label="Icône (nom Ionicons)">
                <TextField value={editing.icon ?? 'library'} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} />
              </Field>
              <Field label="Couleur">
                <TextField type="color" value={editing.color ?? '#4F46E5'} onChange={(e) => setEditing({ ...editing, color: e.target.value })} />
              </Field>
              <Field label="Obligatoire">
                <CheckboxField
                  label="Formation obligatoire"
                  checked={editing.mandatory ?? false}
                  onChange={(v) => setEditing({ ...editing, mandatory: v })}
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
          <Empty
            label="Aucune formation. Créez-en une pour commencer."
            action={<Button onClick={startNew}>+ Nouvelle formation</Button>}
          />
        ) : (
          <div style={styles.grid}>
            {items.map((f) => (
              <FormationCard
                key={f.id}
                formation={f}
                onOpenLevels={() => navigate(`/formations/${f.id}/levels`)}
                onEdit={() => startEdit(f)}
                onDelete={() => deleteMutation.mutate(f.id)}
              />
            ))}
          </div>
        )}
      </div>
    </QueryGate>
  );
}

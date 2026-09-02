import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  CheckboxField,
  Empty,
  Field,
  FormCard,
  FormGrid,
  PageHeader,
  QueryGate,
  Select,
  TextArea,
  TextField,
} from '@/shared/components';
import type { FormationDto } from '@/shared/types/api';
import { FORMATION_ICONS } from '@/assets/icons';
import { useFormations } from '../hooks/useFormations';
import { FormationCard } from '../components/FormationCard';
import { styles } from './FormationsPage.styles';

type FormState = Partial<FormationDto> & { name: string; description: string; category: string };

const emptyForm: FormState = {
  name: '',
  description: '',
  category: '',
  icon: 'library',
  color: '#4F46E5',
  mandatory: false,
};

export function FormationsPage() {
  const navigate = useNavigate();
  const { formations, isLoading, isError, error, refetch, createMutation, updateMutation, deleteMutation } =
    useFormations();

  const [editing, setEditing] = useState<FormState | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleStartNew = () => {
    setEditing(emptyForm);
    setIsNew(true);
    setFormError(null);
  };

  const handleStartEdit = (formation: FormationDto) => {
    setEditing({ ...formation });
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
  const handleOpenLevels = (id: string) => navigate(`/formations/${id}/levels`);

  return (
    <QueryGate
      isLoading={isLoading}
      isError={isError}
      errorMessage={error?.message}
      onRetry={() => void refetch()}
      loadingLabel="Chargement des formations…"
    >
      <div>
        <PageHeader
          title="Formations"
          action={<Button onClick={handleStartNew}>+ Nouvelle formation</Button>}
        />

        {editing ? (
          <FormCard
            title={isNew ? 'Nouvelle formation' : `Éditer — ${editing.name}`}
            error={formError}
            submitting={isSaving}
            submitLabel={isNew ? 'Créer' : 'Enregistrer'}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          >
            <FormGrid>
              <Field label="Nom">
                <TextField
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </Field>
              <Field label="Catégorie">
                <TextField
                  value={editing.category ?? ''}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                />
              </Field>
              <Field label="Icône">
                <Select
                  value={editing.icon ?? 'library'}
                  onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                >
                  {Object.keys(FORMATION_ICONS).map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Couleur">
                <TextField
                  type="color"
                  value={editing.color ?? '#4F46E5'}
                  onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                />
              </Field>
              <Field label="Obligatoire">
                <CheckboxField
                  label="Formation obligatoire"
                  checked={editing.mandatory ?? false}
                  onChange={(mandatory) => setEditing({ ...editing, mandatory })}
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

        {formations.length === 0 ? (
          <Empty
            label="Aucune formation. Créez-en une pour commencer."
            action={<Button onClick={handleStartNew}>+ Nouvelle formation</Button>}
          />
        ) : (
          <div style={styles.grid}>
            {formations.map((formation) => (
              <FormationCard
                key={formation.id}
                formation={formation}
                onOpenLevels={() => handleOpenLevels(formation.id)}
                onEdit={() => handleStartEdit(formation)}
                onDelete={() => handleDelete(formation.id)}
              />
            ))}
          </div>
        )}
      </div>
    </QueryGate>
  );
}

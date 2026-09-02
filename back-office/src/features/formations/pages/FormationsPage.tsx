import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Empty, PageHeader, QueryGate } from '@/shared/components';
import type { FormationDto } from '@/shared/types/api';
import { useFormations } from '../hooks/useFormations';
import { useCategories } from '../hooks/useCategories';
import { FormationCard } from '../components/FormationCard';
import { FormationForm, type FormationFormValues } from '../components/FormationForm';
import { styles } from './FormationsPage.styles';

export function FormationsPage() {
  const navigate = useNavigate();
  const { formations, isLoading, isError, error, refetch, createMutation, updateMutation, deleteMutation } =
    useFormations();
  // Catégories depuis le référentiel backend (création à la volée côté serveur).
  const { categoryNames } = useCategories();

  // null = fermé ; 'new' = création ; { …formation } = édition.
  const [editing, setEditing] = useState<FormationDto | 'new' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const openNew = () => {
    setEditing('new');
    setFormError(null);
  };
  const openEdit = (formation: FormationDto) => {
    setEditing(formation);
    setFormError(null);
  };
  const close = () => {
    setEditing(null);
    setFormError(null);
  };

  const handleSubmit = (values: FormationFormValues) => {
    const body: Partial<FormationDto> = {
      name: values.name,
      description: values.description,
      category: values.category,
      icon: values.icon,
      color: values.color,
      mandatory: values.mandatory,
    };
    const options = {
      onSuccess: () => close(),
      onError: (e: unknown) =>
        setFormError((e as { message?: string }).message ?? "Erreur lors de l'enregistrement."),
    };
    if (editing === 'new') {
      createMutation.mutate(body, options);
    } else if (editing) {
      updateMutation.mutate({ id: editing.id, body }, options);
    }
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
        <PageHeader title="Formations" action={<Button onClick={openNew}>+ Nouvelle formation</Button>} />

        {editing ? (
          <FormationForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? undefined : editing}
            categories={categoryNames}
            submitting={isSaving}
            error={formError}
            onSubmit={handleSubmit}
            onClose={close}
          />
        ) : null}

        {formations.length === 0 ? (
          <Empty
            label="Aucune formation. Créez-en une pour commencer."
            action={<Button onClick={openNew}>+ Nouvelle formation</Button>}
          />
        ) : (
          <div style={styles.grid}>
            {formations.map((formation) => (
              <FormationCard
                key={formation.id}
                formation={formation}
                onOpenLevels={() => handleOpenLevels(formation.id)}
                onEdit={() => openEdit(formation)}
                onDelete={() => handleDelete(formation.id)}
              />
            ))}
          </div>
        )}
      </div>
    </QueryGate>
  );
}

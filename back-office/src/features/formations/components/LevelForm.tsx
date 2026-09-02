import { useId } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { Alert, Button, Field, FieldError, FormGrid, Modal, TextArea, TextField } from '@/shared/components';
import type { LevelDto } from '@/shared/types/api';

export interface LevelFormValues {
  name: string;
  order: string;
  description: string;
}

/**
 * Création / édition d'un niveau dans une **modale**, piloté par react-hook-form
 * (même principe que FormationForm). `order` est un champ texte optionnel :
 * vide → le serveur attribue l'ordre suivant.
 */
export function LevelForm({
  initial,
  submitting,
  error,
  onSubmit,
  onClose,
}: {
  initial?: Partial<LevelDto>;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (values: { name: string; order?: number; description: string }) => void;
  onClose: () => void;
}) {
  const isNew = !initial?.id;
  const formId = useId();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LevelFormValues>({
    defaultValues: {
      name: initial?.name ?? '',
      order: initial?.order ? String(initial.order) : '',
      description: initial?.description ?? '',
    },
  });

  const submit: SubmitHandler<LevelFormValues> = (values) => {
    const order = values.order.trim() === '' ? undefined : Number(values.order);
    onSubmit({
      name: values.name.trim(),
      ...(Number.isFinite(order) ? { order } : {}),
      description: values.description.trim(),
    });
  };

  return (
    <Modal
      title={isNew ? 'Nouveau niveau' : `Éditer le niveau — ${initial?.name ?? ''}`}
      onClose={onClose}
      dismissible={!submitting}
      footer={
        <>
          <Button type="submit" form={formId} loading={submitting}>
            {isNew ? 'Créer' : 'Enregistrer'}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit(submit)} noValidate>
        {error ? (
          <div style={{ marginBottom: '12px' }}>
            <Alert message={error} />
          </div>
        ) : null}

        <FormGrid>
          <Field label="Nom">
            <TextField
              autoFocus
              placeholder="Ex. Niveau 1 — Les fondamentaux"
              invalid={!!errors.name}
              {...register('name', { required: 'Le nom est obligatoire.' })}
            />
            <FieldError message={errors.name?.message} />
          </Field>

          <Field label="Ordre (optionnel)">
            <TextField
              type="number"
              min={0}
              placeholder="Auto"
              invalid={!!errors.order}
              {...register('order', {
                validate: (v) => v === '' || v === undefined || !Number.isNaN(Number(v)) || 'Ordre invalide.',
              })}
            />
            <FieldError message={errors.order?.message} />
          </Field>
        </FormGrid>

        <div style={{ marginTop: '14px' }}>
          <Field label="Description">
            <TextArea rows={3} {...register('description')} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

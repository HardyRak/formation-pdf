import { useId } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import {
  Alert,
  Button,
  CheckboxField,
  ComboBox,
  ColorPicker,
  Field,
  FieldError,
  FormGrid,
  IconPicker,
  Modal,
  TextArea,
  TextField,
} from '@/shared/components';
import type { FormationDto } from '@/shared/types/api';

export interface FormationFormValues {
  name: string;
  category: string;
  icon: string;
  color: string;
  mandatory: boolean;
  description: string;
}

const DEFAULTS: FormationFormValues = {
  name: '',
  category: '',
  icon: 'library',
  color: '#4F46E5',
  mandatory: false,
  description: '',
};

/**
 * Création / édition d'une formation dans une **modale**, piloté par
 * react-hook-form.
 * - Catégorie : ComboBox (recherche + création persistée en BDD via
 *   `onCreateCategory`) sur les catégories du référentiel backend.
 * - Icône : IconPicker (grille de pictogrammes SVG).
 * - Couleur : ColorPicker (palette + choix libre).
 */
export function FormationForm({
  initial,
  categories,
  submitting,
  error,
  onSubmit,
  onCreateCategory,
  onClose,
}: {
  initial?: Partial<FormationDto>;
  categories: string[];
  submitting?: boolean;
  error?: string | null;
  onSubmit: (values: FormationFormValues) => void;
  /** Persiste une nouvelle catégorie en BDD ; retourne son nom normalisé. */
  onCreateCategory?: (name: string) => Promise<string | void>;
  onClose: () => void;
}) {
  const isNew = !initial?.id;
  const formId = useId();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormationFormValues>({
    defaultValues: {
      ...DEFAULTS,
      name: initial?.name ?? '',
      category: initial?.category ?? '',
      icon: initial?.icon ?? DEFAULTS.icon,
      color: initial?.color ?? DEFAULTS.color,
      mandatory: initial?.mandatory ?? false,
      description: initial?.description ?? '',
    },
  });

  const submit: SubmitHandler<FormationFormValues> = (values) => {
    onSubmit({
      ...values,
      name: values.name.trim(),
      category: values.category.trim(),
      description: values.description.trim(),
    });
  };

  return (
    <Modal
      title={isNew ? 'Nouvelle formation' : `Éditer — ${initial?.name ?? ''}`}
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
              placeholder="Ex. Sécurité incendie"
              invalid={!!errors.name}
              {...register('name', { required: 'Le nom est obligatoire.' })}
            />
            {errors.name ? <FieldError message={errors.name.message} /> : null}
          </Field>

          <Field label="Catégorie">
            <Controller
              control={control}
              name="category"
              rules={{ required: 'La catégorie est obligatoire.' }}
              render={({ field }) => (
                <ComboBox
                  value={field.value}
                  onChange={field.onChange}
                  options={categories}
                  onCreate={onCreateCategory}
                  placeholder="Rechercher / créer…"
                  invalid={!!errors.category}
                />
              )}
            />
            {errors.category ? <FieldError message={errors.category.message} /> : null}
          </Field>

          <Field label="Icône">
            <Controller
              control={control}
              name="icon"
              render={({ field }) => (
                <IconPicker value={field.value} onChange={field.onChange} color="var(--primary)" />
              )}
            />
          </Field>

          <Field label="Couleur">
            <Controller
              control={control}
              name="color"
              rules={{ required: true }}
              render={({ field }) => <ColorPicker value={field.value} onChange={field.onChange} />}
            />
          </Field>

          <Field label="Obligatoire">
            <Controller
              control={control}
              name="mandatory"
              render={({ field }) => (
                <CheckboxField
                  label="Formation obligatoire"
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
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

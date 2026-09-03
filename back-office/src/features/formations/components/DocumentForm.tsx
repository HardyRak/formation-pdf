import { useId } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import {
  Alert,
  Button,
  Field,
  FieldError,
  FileField,
  FormGrid,
  Modal,
  TextArea,
  TextField,
} from '@/shared/components';

export interface DocumentFormValues {
  title: string;
  description: string;
  file: File | null;
}

/**
 * Import d'un document PDF dans un niveau, via une **modale** pilotée par
 * react-hook-form (même principe que FormationForm). Le fichier PDF est
 * obligatoire et envoyé en multipart à la sauvegarde.
 */
export function DocumentForm({
  submitting,
  error,
  onSubmit,
  onClose,
}: {
  submitting?: boolean;
  error?: string | null;
  onSubmit: (values: { title: string; description: string; file: File }) => void;
  onClose: () => void;
}) {
  const formId = useId();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<DocumentFormValues>({
    defaultValues: { title: '', description: '', file: null },
  });

  const submit: SubmitHandler<DocumentFormValues> = (values) => {
    if (!values.file) return; // garde côté UI (validation RHF déjà en place)
    onSubmit({
      title: values.title.trim(),
      description: values.description.trim(),
      file: values.file,
    });
  };

  return (
    <Modal
      title="Ajouter un document (PDF)"
      onClose={onClose}
      dismissible={!submitting}
      footer={
        <>
          <Button type="submit" form={formId} loading={submitting}>
            Importer le document
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
          <Field label="Titre">
            <TextField
              autoFocus
              placeholder="Ex. Guide de démarrage"
              invalid={!!errors.title}
              {...register('title', { required: 'Le titre est obligatoire.' })}
            />
            <FieldError message={errors.title?.message} />
          </Field>

          <Field label="Fichier PDF">
            <Controller
              control={control}
              name="file"
              rules={{
                validate: (f) => {
                  if (!f) return 'Sélectionnez un fichier PDF.';
                  const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
                  return isPdf || 'Le fichier doit être un PDF.';
                },
              }}
              render={({ field }) => (
                <FileField accept="application/pdf,.pdf" file={field.value} onFile={field.onChange} />
              )}
            />
            <FieldError message={errors.file?.message as string | undefined} />
          </Field>
        </FormGrid>

        <div style={{ marginTop: '14px' }}>
          <Field label="Description">
            <TextArea rows={2} {...register('description')} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

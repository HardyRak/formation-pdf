import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  ConfirmButton,
  Empty,
  Field,
  FileField,
  FilePickerButton,
  FormCard,
  FormGrid,
  ListRow,
  PageHeader,
  QueryGate,
  TextArea,
  TextField,
} from '@/shared/components';
import { useDocuments } from '../hooks/useDocuments';
import { documentService } from '../services/documentService';
import { styles } from './DocumentsPage.styles';

export function DocumentsPage() {
  const { levelId = '' } = useParams();
  const navigate = useNavigate();
  const { documents, isLoading, isError, error, refetch, uploadMutation, deleteMutation, replaceMutation } =
    useDocuments(levelId);

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [replaceError, setReplaceError] = useState<{ id: string; message: string } | null>(null);

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
    setFormError(null);
  };

  const handleSubmitUpload = () => {
    if (!selectedFile) {
      setFormError('Sélectionnez un fichier PDF.');
      return;
    }
    uploadMutation.mutate(
      { title: uploadTitle, description: uploadDesc, file: selectedFile },
      {
        onSuccess: () => {
          setUploadTitle('');
          setUploadDesc('');
          setSelectedFile(null);
          setFormError(null);
        },
        onError: (e) => setFormError((e as { message?: string }).message ?? "Erreur lors de l'upload."),
      },
    );
  };

  const handleDownload = (id: string, title: string) => void documentService.download(id, title);

  const handleReplace = (id: string, file: File) =>
    replaceMutation.mutate(
      { id, file },
      {
        onSuccess: () => setReplaceError(null),
        onError: (e) => setReplaceError({ id, message: (e as { message?: string }).message ?? 'Erreur.' }),
      },
    );

  return (
    <QueryGate
      isLoading={isLoading}
      isError={isError}
      errorMessage={error?.message}
      onRetry={() => void refetch()}
      loadingLabel="Chargement des documents…"
    >
      <div>
        <PageHeader title="Documents du niveau" onBack={() => navigate(-1)} />

        <FormCard
          title="# Ajouter un document (PDF)"
          error={formError}
          submitting={uploadMutation.isPending}
          submitLabel="Importer le document"
          submitDisabled={!uploadTitle || !selectedFile}
          onSubmit={handleSubmitUpload}
        >
          <FormGrid>
            <Field label="Titre">
              <TextField
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Guide de…"
              />
            </Field>
            <Field label="Fichier PDF">
              <FileField accept="application/pdf,.pdf" file={selectedFile} onFile={handleFileChange} />
            </Field>
          </FormGrid>
          <div style={styles.descField}>
            <Field label="Description (optionnel)">
              <TextArea rows={2} value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} />
            </Field>
          </div>
        </FormCard>

        {documents.length === 0 ? (
          <Empty label="Aucun document dans ce niveau." />
        ) : (
          <div style={styles.list}>
            {documents.map((doc) => (
              <ListRow
                key={doc.id}
                tile="📄"
                tileStyle={styles.tile}
                title={doc.title}
                subtitle={doc.description}
                badges={
                  <>
                    <Badge>{doc.pageCount} pages</Badge>
                    <Badge color="var(--accent)">{doc.sizeKb} Ko</Badge>
                    {doc.filePath ? (
                      <Badge color="var(--success)">PDF</Badge>
                    ) : (
                      <Badge color="var(--warning)">Blocs</Badge>
                    )}
                  </>
                }
                actions={
                  <>
                    {doc.filePath ? (
                      <Button variant="secondary" onClick={() => handleDownload(doc.id, doc.title)}>
                        Télécharger
                      </Button>
                    ) : null}
                    {doc.filePath ? (
                      <FilePickerButton
                        variant="secondary"
                        accept="application/pdf,.pdf"
                        loading={replaceMutation.isPending && replaceMutation.variables?.id === doc.id}
                        onFile={(file) => handleReplace(doc.id, file)}
                      >
                        Remplacer
                      </FilePickerButton>
                    ) : null}
                    {replaceError?.id === doc.id ? (
                      <span style={styles.rowError}>{replaceError.message}</span>
                    ) : null}
                    <ConfirmButton
                      variant="danger"
                      confirmMessage={`Supprimer « ${doc.title} » ?`}
                      onClick={() => deleteMutation.mutate(doc.id)}
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

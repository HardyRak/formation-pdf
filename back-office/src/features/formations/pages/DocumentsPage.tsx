import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  ConfirmButton,
  Empty,
  FilePickerButton,
  ListRow,
  PageHeader,
  QueryGate,
} from '@/shared/components';
import { useDocuments } from '../hooks/useDocuments';
import { documentService } from '../services/documentService';
import { DocumentForm } from '../components/DocumentForm';
import { styles } from './DocumentsPage.styles';

export function DocumentsPage() {
  const { levelId = '' } = useParams();
  const navigate = useNavigate();
  const { documents, isLoading, isError, error, refetch, uploadMutation, deleteMutation, replaceMutation } =
    useDocuments(levelId);

  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [replaceError, setReplaceError] = useState<{ id: string; message: string } | null>(null);
  const [downloadError, setDownloadError] = useState<{ id: string; message: string } | null>(null);

  const close = () => {
    setAdding(false);
    setFormError(null);
  };

  const handleUpload = (values: { title: string; description: string; file: File }) => {
    uploadMutation.mutate(values, {
      onSuccess: close,
      onError: (e) => setFormError((e as { message?: string }).message ?? "Erreur lors de l'upload."),
    });
  };

  const handleDownload = (id: string, title: string) => {
    setDownloadError(null);
    documentService.download(id, title).catch((e: unknown) =>
      setDownloadError({
        id,
        message: (e as { message?: string }).message ?? 'Téléchargement impossible.',
      }),
    );
  };

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
        <PageHeader
          title="Documents du niveau"
          onBack={() => navigate(-1)}
          action={<Button onClick={() => setAdding(true)}>+ Ajouter un document</Button>}
        />

        {adding ? (
          <DocumentForm
            submitting={uploadMutation.isPending}
            error={formError}
            onSubmit={handleUpload}
            onClose={close}
          />
        ) : null}

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
                    {downloadError?.id === doc.id ? (
                      <span style={styles.rowError}>{downloadError.message}</span>
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

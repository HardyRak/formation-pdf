import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listDocuments, createDocument, deleteDocument, replaceDocumentFile, streamDocument } from '../api/admin';
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
} from '../components';
import { styles } from './DocumentsPage.styles';

export function DocumentsPage() {
  const { levelId = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const documents = useQuery({ queryKey: ['documents', levelId], queryFn: () => listDocuments(levelId) });

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [replaceError, setReplaceError] = useState<{ id: string; message: string } | null>(null);

  const invalidateDocuments = () => {
    void qc.invalidateQueries({ queryKey: ['documents', levelId] });
    void qc.invalidateQueries({ queryKey: ['stats'] });
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('Sélectionnez un fichier PDF.');
      return createDocument(levelId, { title: uploadTitle, description: uploadDesc }, selectedFile);
    },
    onSuccess: () => {
      invalidateDocuments();
      setUploadTitle('');
      setUploadDesc('');
      setSelectedFile(null);
      setFormError(null);
    },
    onError: (e) => setFormError((e as { message?: string }).message ?? "Erreur lors de l'upload."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: invalidateDocuments,
  });

  const replaceMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => replaceDocumentFile(id, file),
    onSuccess: () => {
      invalidateDocuments();
      setReplaceError(null);
    },
    onError: (e, vars) =>
      setReplaceError({ id: vars.id, message: (e as { message?: string }).message ?? 'Erreur.' }),
  });

  const downloadPdf = async (id: string, title: string) => {
    const blob = await streamDocument(id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const items = documents.data ?? [];

  return (
    <QueryGate
      isLoading={documents.isLoading}
      isError={documents.isError}
      errorMessage={documents.error?.message}
      onRetry={() => void documents.refetch()}
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
          onSubmit={() => uploadMutation.mutate()}
        >
          <FormGrid>
            <Field label="Titre">
              <TextField value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Guide de…" />
            </Field>
            <Field label="Fichier PDF">
              <FileField accept="application/pdf,.pdf" file={selectedFile} onFile={(f) => { setSelectedFile(f); setFormError(null); }} />
            </Field>
          </FormGrid>
          <div style={styles.descField}>
            <Field label="Description (optionnel)">
              <TextArea rows={2} value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} />
            </Field>
          </div>
        </FormCard>

        {items.length === 0 ? (
          <Empty label="Aucun document dans ce niveau." />
        ) : (
          <div style={styles.list}>
            {items.map((d) => (
              <ListRow
                key={d.id}
                tile="📄"
                tileStyle={styles.tile}
                title={d.title}
                subtitle={d.description}
                badges={
                  <>
                    <Badge>{d.pageCount} pages</Badge>
                    <Badge color="var(--accent)">{d.sizeKb} Ko</Badge>
                    {d.filePath ? <Badge color="var(--success)">PDF</Badge> : <Badge color="var(--warning)">Blocs</Badge>}
                  </>
                }
                actions={
                  <>
                    {d.filePath ? (
                      <Button variant="secondary" onClick={() => void downloadPdf(d.id, d.title)}>
                        Télécharger
                      </Button>
                    ) : null}
                    {d.filePath ? (
                      <FilePickerButton
                        variant="secondary"
                        accept="application/pdf,.pdf"
                        loading={replaceMutation.isPending && replaceMutation.variables?.id === d.id}
                        onFile={(file) => replaceMutation.mutate({ id: d.id, file })}
                      >
                        Remplacer
                      </FilePickerButton>
                    ) : null}
                    {replaceError?.id === d.id ? <span style={styles.rowError}>{replaceError.message}</span> : null}
                    <ConfirmButton
                      variant="danger"
                      confirmMessage={`Supprimer « ${d.title} » ?`}
                      onClick={() => deleteMutation.mutate(d.id)}
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

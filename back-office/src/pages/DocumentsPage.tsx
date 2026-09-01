import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listDocuments, createDocument, deleteDocument, replaceDocumentFile, streamDocument } from '../api/admin';
import { Card, Badge, Button, Field, TextField, TextArea, Loading, Empty, ErrorBox } from '../components/ui';

export function DocumentsPage() {
  const { levelId = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const documents = useQuery({ queryKey: ['documents', levelId], queryFn: () => listDocuments(levelId) });

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const uploadRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('Sélectionnez un fichier PDF.');
      return createDocument(levelId, { title: uploadTitle, description: uploadDesc }, selectedFile);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['documents', levelId] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      setUploadTitle('');
      setUploadDesc('');
      setSelectedFile(null);
      setFormError(null);
      if (uploadRef.current) uploadRef.current.value = '';
    },
    onError: (e) => setFormError((e as { message?: string }).message ?? 'Erreur lors de l\'upload.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['documents', levelId] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const handleUpload = (file: File | null) => {
    setSelectedFile(file);
    setFormError(null);
  };

  const downloadPdf = async (id: string, title: string) => {
    const blob = await streamDocument(id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (documents.isLoading) return <Loading label="Chargement des documents…" />;
  if (documents.isError) return <ErrorBox message={documents.error?.message} onRetry={() => documents.refetch()} />;
  const items = documents.data ?? [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '700', fontSize: '13px', padding: 0, marginBottom: '6px' }}>
            ← Retour
          </button>
          <h1 style={{ margin: 0 }}>Documents du niveau</h1>
        </div>
      </div>

      <Card style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 10px' }}># Ajouter un document (PDF)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <Field label="Titre">
            <TextField value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Guide de…" />
          </Field>
          <Field label="Fichier PDF">
            <input ref={uploadRef} type="file" accept="application/pdf,.pdf" onChange={(e) => handleUpload(e.target.files?.[0] ?? null)} />
          </Field>
        </div>
        <div style={{ marginTop: '14px' }}>
          <Field label="Description (optionnel)">
            <TextArea rows={2} value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} />
          </Field>
        </div>
        {formError ? <div style={{ marginTop: '12px' }}><ErrorBox message={formError} /></div> : null}
        <div style={{ marginTop: '14px' }}>
          <Button onClick={() => uploadMutation.mutate()} loading={uploadMutation.isPending} disabled={!uploadTitle || !selectedFile}>
            Importer le document
          </Button>
        </div>
      </Card>

      {items.length === 0 ? (
        <Empty label="Aucun document dans ce niveau." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.map((d) => (
            <Card key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                📄
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '800', fontSize: '15px' }}>{d.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.description}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--text-faint)' }}>
                  <Badge>{d.pageCount} pages</Badge>
                  <Badge color="var(--accent)">{d.sizeKb} Ko</Badge>
                  {d.filePath ? <Badge color="var(--success)">PDF</Badge> : <Badge color="var(--warning)">Blocs</Badge>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {d.filePath ? (
                  <Button variant="secondary" onClick={() => void downloadPdf(d.id, d.title)}>Télécharger</Button>
                ) : null}
                {d.filePath ? <ReplacePdfButton id={d.id} onDone={() => void qc.invalidateQueries({ queryKey: ['documents', levelId] })} /> : null}
                <Button variant="danger" onClick={() => { if (confirm(`Supprimer « ${d.title} » ?`)) deleteMutation.mutate(d.id); }}>Supprimer</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ReplacePdfButton({ id, onDone }: { id: string; onDone: () => void }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (file: File) => replaceDocumentFile(id, file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['documents'] });
      onDone();
    },
    onError: (e) => setError((e as { message?: string }).message ?? 'Erreur.'),
  });

  return (
    <>
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) mutation.mutate(f); }} />
      <Button variant="secondary" loading={mutation.isPending} onClick={() => inputRef.current?.click()}>Remplacer</Button>
      {error ? <span style={{ fontSize: '12px', color: 'var(--danger)' }}>{error}</span> : null}
    </>
  );
}

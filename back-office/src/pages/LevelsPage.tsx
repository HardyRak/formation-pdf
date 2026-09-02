import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listLevels, createLevel, updateLevel, deleteLevel, listFormations } from '../api/admin';
import type { LevelDto } from '../api/types';
import { Card, Badge, Button, Field, TextField, TextArea, Loading, Empty, ErrorBox } from '../components/ui';

export function LevelsPage() {
  const { formationId = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const formation = useQuery({ queryKey: ['formations'], queryFn: listFormations });
  const levels = useQuery({ queryKey: ['levels', formationId], queryFn: () => listLevels(formationId) });

  const [editing, setEditing] = useState<Partial<LevelDto> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const formationName = formation.data?.find((f) => f.id === formationId)?.name ?? 'Formation';

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      if (isNew) return createLevel(formationId, editing);
      if (!editing.id) return;
      return updateLevel(editing.id, editing);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['levels', formationId] });
      void qc.invalidateQueries({ queryKey: ['formations'] });
      setEditing(null);
      setIsNew(false);
      setFormError(null);
    },
    onError: (e) => setFormError((e as { message?: string }).message ?? 'Erreur lors de l\'enregistrement.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLevel(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['levels', formationId] });
      void qc.invalidateQueries({ queryKey: ['forms'] });
    },
  });

  if (levels.isLoading) return <Loading label="Chargement des niveaux…" />;
  if (levels.isError) return <ErrorBox message={levels.error?.message} onRetry={() => levels.refetch()} />;
  const items = levels.data ?? [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <button onClick={() => navigate('/formations')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '700', fontSize: '13px', padding: 0, marginBottom: '6px' }}>
            ← Retour aux formations
          </button>
          <h1 style={{ margin: 0 }}>{formationName} — Niveaux</h1>
        </div>
        <Button onClick={() => { setEditing({ name: '', description: '' }); setIsNew(true); setFormError(null); }}>+ Nouveau niveau</Button>
      </div>

      {editing ? (
        <Card style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 16px' }}>{isNew ? 'Nouveau niveau' : 'Éditer le niveau'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <Field label="Nom">
              <TextField value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="Ordre">
              <TextField type="number" value={editing.order ?? ''} onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })} />
            </Field>
          </div>
          <div style={{ marginTop: '14px' }}>
            <Field label="Description">
              <TextArea rows={3} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </Field>
          </div>
          {formError ? <div style={{ marginTop: '12px' }}><ErrorBox message={formError} /></div> : null}
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>{isNew ? 'Créer' : 'Enregistrer'}</Button>
            <Button variant="ghost" onClick={() => { setEditing(null); setFormError(null); }}>Annuler</Button>
          </div>
        </Card>
      ) : null}

      {items.length === 0 ? (
        <Empty label="Aucun niveau dans cette formation." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.map((l) => (
            <Card key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '16px' }}>
                {l.order}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '800', fontSize: '15px' }}>{l.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.description}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--text-faint)' }}>
                  <Badge>{l.documentsCount} docs</Badge>
                  <Badge color="var(--accent)">{l.totalPages} pages</Badge>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" onClick={() => navigate(`/levels/${l.id}/documents`)}>Documents</Button>
                <Button variant="ghost" onClick={() => { setEditing({ ...l }); setIsNew(false); setFormError(null); }}>Éditer</Button>
                <Button variant="danger" onClick={() => { if (confirm(`Supprimer le niveau « ${l.name} » ?`)) deleteMutation.mutate(l.id); }}>Supprimer</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

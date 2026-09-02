import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listFormations, createFormation, updateFormation, deleteFormation } from '../api/admin';
import type { FormationDto } from '../api/types';
import { Card, Badge, Button, Field, TextField, TextArea, Loading, Empty, ErrorBox } from '../components/ui';

type FormState = Partial<FormationDto> & { name: string; description: string; category: string };

const emptyForm: FormState = { name: '', description: '', category: '', icon: 'library', color: '#4F46E5', mandatory: false };

export function FormationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['formations'], queryFn: listFormations });

  const [editing, setEditing] = useState<FormState | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      if (isNew) return createFormation(editing);
      if (!editing.id) return;
      return updateFormation(editing.id, editing);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['formations'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      setEditing(null);
      setIsNew(false);
      setFormError(null);
    },
    onError: (e) => setFormError((e as { message?: string }).message ?? 'Erreur lors de l\'enregistrement.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFormation(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['formations'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const startNew = () => {
    setEditing(emptyForm);
    setIsNew(true);
    setFormError(null);
  };

  const startEdit = (f: FormationDto) => {
    setEditing({ ...f });
    setIsNew(false);
    setFormError(null);
  };

  if (isLoading) return <Loading label="Chargement des formations…" />;
  if (isError) return <ErrorBox message={error?.message} onRetry={() => refetch()} />;
  const items = data ?? [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>Formations</h1>
        <Button onClick={startNew}>+ Nouvelle formation</Button>
      </div>

      {editing ? (
        <Card style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 16px' }}>{isNew ? 'Nouvelle formation' : `Éditer — ${editing.name}`}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <Field label="Nom">
              <TextField value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="Catégorie">
              <TextField value={editing.category ?? ''} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
            </Field>
            <Field label="Icône (nom Ionicons)">
              <TextField value={editing.icon ?? 'library'} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} />
            </Field>
            <Field label="Couleur">
              <TextField type="color" value={editing.color ?? '#4F46E5'} onChange={(e) => setEditing({ ...editing, color: e.target.value })} />
            </Field>
            <Field label="Obligatoire">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                <input type="checkbox" checked={editing.mandatory ?? false} onChange={(e) => setEditing({ ...editing, mandatory: e.target.checked })} />
                Formation obligatoire
              </label>
            </Field>
          </div>
          <div style={{ marginTop: '14px' }}>
            <Field label="Description">
              <TextArea rows={3} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </Field>
          </div>
          {formError ? (
            <div style={{ marginTop: '12px' }}>
              <ErrorBox message={formError} />
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
              {isNew ? 'Créer' : 'Enregistrer'}
            </Button>
            <Button variant="ghost" onClick={() => { setEditing(null); setFormError(null); }}>
              Annuler
            </Button>
          </div>
        </Card>
      ) : null}

      {items.length === 0 ? (
        <Empty label="Aucune formation. Créez-en une pour commencer." action={<Button onClick={startNew}>+ Nouvelle formation</Button>} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {items.map((f) => (
            <Card key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: f.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color }}>
                  {f.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '800', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{f.category}</div>
                </div>
                {f.mandatory ? <Badge color="var(--warning)">Obligatoire</Badge> : null}
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', minHeight: '40px' }}>
                {f.description}
              </p>
              <div style={{ display: 'flex', gap: '8px', fontSize: '12px', fontWeight: '700', color: 'var(--text-faint)' }}>
                <span>{f.levelsCount} niveaux</span>
                <span>•</span>
                <span>{f.documentsCount} docs</span>
                <span>•</span>
                <span>{f.totalPages} pages</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                <Button variant="secondary" onClick={() => navigate(`/formations/${f.id}/levels`)}>
                  Niveaux
                </Button>
                <Button variant="ghost" onClick={() => startEdit(f)}>
                  Éditer
                </Button>
                <Button variant="danger" onClick={() => { if (confirm(`Supprimer la formation « ${f.name} » ?`)) deleteMutation.mutate(f.id); }}>
                  Supprimer
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

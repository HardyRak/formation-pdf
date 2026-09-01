import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listGrants, grantAccess, revokeGrant, revokeDocument, listUsers, listFormations, listLevels, listDocuments } from '../api/admin';
import { Card, Badge, Button, Field, Select, Loading, Empty, ErrorBox } from '../components/ui';

export function AccessPage() {
  const qc = useQueryClient();
  const grants = useQuery({ queryKey: ['grants'], queryFn: () => listGrants() });
  const users = useQuery({ queryKey: ['users'], queryFn: () => listUsers({}) });
  const formations = useQuery({ queryKey: ['formations'], queryFn: listFormations });

  const [userId, setUserId] = useState('');
  const [formationId, setFormationId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const levels = useQuery({ queryKey: ['levels', formationId], queryFn: () => listLevels(formationId), enabled: !!formationId });
  const documents = useQuery({ queryKey: ['documents', levelId], queryFn: () => listDocuments(levelId), enabled: !!levelId });

  const userNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const u of users.data?.items ?? []) map[u.id] = `${u.firstName} ${u.lastName}`;
    return map;
  }, [users.data]);
  const formationNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of formations.data ?? []) map[f.id] = f.name;
    return map;
  }, [formations.data]);

  const grantMutation = useMutation({
    mutationFn: () =>
      grantAccess({
        userId,
        formationId,
        levelIds: levelId ? [levelId] : [],
        documentIds: documentId ? [documentId] : [],
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['grants'] });
      setLevelId('');
      setDocumentId('');
      setFormError(null);
    },
    onError: (e) => setFormError((e as { message?: string }).message ?? 'Erreur lors de l\'attribution.'),
  });

  const revokeGrantMutation = useMutation({
    mutationFn: ({ u, f }: { u: string; f: string }) => revokeGrant(u, f),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['grants'] }),
  });

  const revokeDocMutation = useMutation({
    mutationFn: ({ u, d }: { u: string; d: string }) => revokeDocument(u, d),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['grants'] }),
  });

  if (grants.isLoading) return <Loading label="Chargement des accès…" />;
  if (grants.isError) return <ErrorBox message={grants.error?.message} onRetry={() => grants.refetch()} />;

  const grantItems = grants.data ?? [];

  return (
    <div>
      <h1 style={{ margin: '0 0 20px' }}>Gestion des accès</h1>

      <Card style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 6px' }}>Donner l'accès à un document</h3>
        <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Accorder un document ouvre aussi son <strong>niveau</strong> et sa <strong>formation</strong> pour l'apprenant (cascade).
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <Field label="Utilisateur">
            <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">— Choisir un apprenant —</option>
              {(users.data?.items ?? []).map((u) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
              ))}
            </Select>
          </Field>
          <Field label="Formation">
            <Select value={formationId} onChange={(e) => { setFormationId(e.target.value); setLevelId(''); setDocumentId(''); }}>
              <option value="">— Choisir —</option>
              {(formations.data ?? []).map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Niveau (optionnel)">
            <Select value={levelId} onChange={(e) => { setLevelId(e.target.value); setDocumentId(''); }} disabled={!formationId}>
              <option value="">Tous les niveaux</option>
              {(levels.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>Niveau {l.order} — {l.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Document (optionnel)">
            <Select value={documentId} onChange={(e) => setDocumentId(e.target.value)} disabled={!levelId}>
              <option value="">Tous les documents</option>
              {(documents.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </Select>
          </Field>
        </div>
        {formError ? <div style={{ marginTop: '12px' }}><ErrorBox message={formError} /></div> : null}
        <div style={{ marginTop: '16px' }}>
          <Button onClick={() => grantMutation.mutate()} loading={grantMutation.isPending} disabled={!userId || !formationId}>
            Donner l'accès
          </Button>
        </div>
      </Card>

      <h3 style={{ margin: '0 0 12px' }}>Attributions existantes</h3>
      {grantItems.length === 0 ? (
        <Empty label="Aucune attribution d'accès." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {grantItems.map((g) => {
            const hasFullLevels = g.levelIds.length === 0;
            const hasFullDocs = g.documentIds.length === 0;
            return (
              <Card key={g._id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '15px' }}>{userNames[g.userId] ?? g.userId}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formationNames[g.formationId] ?? g.formationId}</div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {hasFullLevels
                        ? <Badge color="var(--accent)">Tous les niveaux</Badge>
                        : <Badge color="var(--primary)">Niveaux : {g.levelIds.length}</Badge>}
                      {hasFullDocs
                        ? <Badge>Tous les documents</Badge>
                        : <Badge color="var(--warning)">Documents : {g.documentIds.length}</Badge>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {!hasFullDocs ? (
                      g.documentIds.map((d) => (
                        <Button key={d} variant="ghost" onClick={() => { if (confirm('Retirer l\'accès à ce document ?')) revokeDocMutation.mutate({ u: g.userId, d }); }}>
                          Retirer {d.slice(0, 12)}…
                        </Button>
                      ))
                    ) : null}
                    <Button variant="danger" onClick={() => { if (confirm('Révoquer tout l\'accès à cette formation ?')) revokeGrantMutation.mutate({ u: g.userId, f: g.formationId }); }}>
                      Révoquer
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

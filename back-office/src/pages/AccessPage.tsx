import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listGrants, grantAccess, revokeGrant, revokeDocument, listUsers, listFormations, listLevels, listDocuments } from '../api/admin';
import {
  Badge,
  ConfirmButton,
  Empty,
  Field,
  FormCard,
  FormGrid,
  ListRow,
  PageHeader,
  QueryGate,
  Select,
} from '../components';
import { styles } from './AccessPage.styles';

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
    onError: (e) => setFormError((e as { message?: string }).message ?? "Erreur lors de l'attribution."),
  });

  const revokeGrantMutation = useMutation({
    mutationFn: ({ u, f }: { u: string; f: string }) => revokeGrant(u, f),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['grants'] }),
  });

  const revokeDocMutation = useMutation({
    mutationFn: ({ u, d }: { u: string; d: string }) => revokeDocument(u, d),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['grants'] }),
  });

  const grantItems = grants.data ?? [];

  return (
    <QueryGate
      isLoading={grants.isLoading}
      isError={grants.isError}
      errorMessage={grants.error?.message}
      onRetry={() => void grants.refetch()}
      loadingLabel="Chargement des accès…"
    >
      <div>
        <PageHeader title="Gestion des accès" />

        <FormCard
          title="Donner l'accès à un document"
          error={formError}
          submitting={grantMutation.isPending}
          submitLabel="Donner l'accès"
          submitDisabled={!userId || !formationId}
          onSubmit={() => grantMutation.mutate()}
        >
          <p style={styles.hint}>
            Accorder un document ouvre aussi son <strong>niveau</strong> et sa <strong>formation</strong> pour l'apprenant (cascade).
          </p>
          <FormGrid min={200}>
            <Field label="Utilisateur">
              <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="" key="placeholder">— Choisir un apprenant —</option>
                {(users.data?.items ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.email})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Formation">
              <Select
                value={formationId}
                onChange={(e) => {
                  setFormationId(e.target.value);
                  setLevelId('');
                  setDocumentId('');
                }}
              >
                <option value="" key="placeholder">— Choisir —</option>
                {(formations.data ?? []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Niveau (optionnel)">
              <Select
                value={levelId}
                onChange={(e) => {
                  setLevelId(e.target.value);
                  setDocumentId('');
                }}
                disabled={!formationId}
              >
                <option value="" key="all">Tous les niveaux</option>
                {(levels.data ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    Niveau {l.order} — {l.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Document (optionnel)">
              <Select value={documentId} onChange={(e) => setDocumentId(e.target.value)} disabled={!levelId}>
                <option value="" key="all">Tous les documents</option>
                {(documents.data ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </Select>
            </Field>
          </FormGrid>
        </FormCard>

        <h3 style={styles.sectionTitle}>Attributions existantes</h3>
        {grantItems.length === 0 ? (
          <Empty label="Aucune attribution d'accès." />
        ) : (
          <div style={styles.list}>
            {grantItems.map((g) => {
              // Grants anciens (pré-migration) : champs tableau potentiellement absents.
              const levelIds = g.levelIds ?? [];
              const documentIds = g.documentIds ?? [];
              const hasFullLevels = levelIds.length === 0;
              const hasFullDocs = documentIds.length === 0;
              return (
                <ListRow
                  key={g._id}
                  title={userNames[g.userId] ?? g.userId}
                  subtitle={formationNames[g.formationId] ?? g.formationId}
                  badges={
                    <>
                      {hasFullLevels ? (
                        <Badge color="var(--accent)">Tous les niveaux</Badge>
                      ) : (
                        <Badge color="var(--primary)">Niveaux : {levelIds.length}</Badge>
                      )}
                      {hasFullDocs ? (
                        <Badge>Tous les documents</Badge>
                      ) : (
                        <Badge color="var(--warning)">Documents : {documentIds.length}</Badge>
                      )}
                    </>
                  }
                  actions={
                    <>
                      {!hasFullDocs
                        ? documentIds.map((d) => (
                            <ConfirmButton
                              key={d}
                              variant="ghost"
                              confirmMessage="Retirer l'accès à ce document ?"
                              onClick={() => revokeDocMutation.mutate({ u: g.userId, d })}
                            >
                              Retirer {d.slice(0, 12)}…
                            </ConfirmButton>
                          ))
                        : null}
                      <ConfirmButton
                        variant="danger"
                        confirmMessage="Révoquer tout l'accès à cette formation ?"
                        onClick={() => revokeGrantMutation.mutate({ u: g.userId, f: g.formationId })}
                      >
                        Révoquer
                      </ConfirmButton>
                    </>
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </QueryGate>
  );
}

import { useState } from 'react';
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
} from '@/shared/components';
import { useFormations } from '@/features/formations/hooks/useFormations';
import { useLevels } from '@/features/formations/hooks/useLevels';
import { useDocuments } from '@/features/formations/hooks/useDocuments';
import { useGrants } from '../hooks/useGrants';
import { useUsers } from '../hooks/useUsers';
import { useDocumentTitles } from '../hooks/useDocumentTitles';
import { styles } from './AccessPage.styles';

export function AccessPage() {
  const {
    grants,
    isLoading,
    isError,
    error,
    refetch,
    grantMutation,
    revokeGrantMutation,
    revokeDocumentMutation,
  } = useGrants();
  const { users } = useUsers();
  const { formations } = useFormations();

  const [userId, setUserId] = useState('');
  const [formationId, setFormationId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { levels } = useLevels(formationId, !!formationId);
  const { documents } = useDocuments(levelId, !!levelId);

  // Valeurs dérivées (pas de useEffect : dérivation pure).
  const userNames: Record<string, string> = {};
  for (const u of users) userNames[u.id] = `${u.firstName} ${u.lastName}`;
  const formationNames: Record<string, string> = {};
  for (const f of formations) formationNames[f.id] = f.name;

  // Titres des documents référencés par les grants (pour libeller la révocation).
  const grantedDocIds = grants.flatMap((g) => g.documentIds ?? []);
  const documentTitles = useDocumentTitles(grantedDocIds);

  const handleFormationChange = (value: string) => {
    setFormationId(value);
    setLevelId('');
    setDocumentId('');
  };

  const handleLevelChange = (value: string) => {
    setLevelId(value);
    setDocumentId('');
  };

  const handleSubmitGrant = () => {
    grantMutation.mutate(
      {
        userId,
        formationId,
        levelIds: levelId ? [levelId] : [],
        documentIds: documentId ? [documentId] : [],
      },
      {
        onSuccess: () => {
          setLevelId('');
          setDocumentId('');
          setFormError(null);
        },
        onError: (e) => setFormError((e as { message?: string }).message ?? "Erreur lors de l'attribution."),
      },
    );
  };

  return (
    <QueryGate
      isLoading={isLoading}
      isError={isError}
      errorMessage={error?.message}
      onRetry={() => void refetch()}
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
          onSubmit={handleSubmitGrant}
        >
          <p style={styles.hint}>
            Accorder un document ouvre aussi son <strong>niveau</strong> et sa <strong>formation</strong> pour
            l'apprenant (cascade).
          </p>
          <FormGrid min={200}>
            <Field label="Utilisateur">
              <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="" key="placeholder">
                  — Choisir un apprenant —
                </option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.email})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Formation">
              <Select value={formationId} onChange={(e) => handleFormationChange(e.target.value)}>
                <option value="" key="placeholder">
                  — Choisir —
                </option>
                {formations.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Niveau (optionnel)">
              <Select
                value={levelId}
                onChange={(e) => handleLevelChange(e.target.value)}
                disabled={!formationId}
              >
                <option value="" key="all">
                  Tous les niveaux
                </option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    Niveau {l.order} — {l.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Document (optionnel)">
              <Select value={documentId} onChange={(e) => setDocumentId(e.target.value)} disabled={!levelId}>
                <option value="" key="all">
                  Tous les documents
                </option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </Select>
            </Field>
          </FormGrid>
        </FormCard>

        <h3 style={styles.sectionTitle}>Attributions existantes</h3>
        {grants.length === 0 ? (
          <Empty label="Aucune attribution d'accès." />
        ) : (
          <div style={styles.list}>
            {grants.map((grant) => {
              // Grants anciens (pré-migration) : champs tableau potentiellement absents.
              const levelIds = grant.levelIds ?? [];
              const documentIds = grant.documentIds ?? [];
              const hasFullLevels = levelIds.length === 0;
              const hasFullDocs = documentIds.length === 0;
              return (
                <ListRow
                  key={grant._id}
                  title={userNames[grant.userId] ?? grant.userId}
                  subtitle={formationNames[grant.formationId] ?? grant.formationId}
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
                              confirmMessage={`Retirer l'accès au document « ${
                                documentTitles[d] ?? 'ce document'
                              } » ?`}
                              onClick={() =>
                                revokeDocumentMutation.mutate({ userId: grant.userId, documentId: d })
                              }
                            >
                              Retirer : {documentTitles[d] ?? 'Document…'}
                            </ConfirmButton>
                          ))
                        : null}
                      <ConfirmButton
                        variant="danger"
                        confirmMessage="Révoquer tout l'accès à cette formation ?"
                        onClick={() =>
                          revokeGrantMutation.mutate({ userId: grant.userId, formationId: grant.formationId })
                        }
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

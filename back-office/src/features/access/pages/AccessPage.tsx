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
  SearchSelect,
  Select,
} from '@/shared/components';
import { useFormationSearch } from '@/features/formations/hooks/useFormationSearch';
import { useFormationTitles } from '@/features/formations/hooks/useFormationTitles';
import { useLevels } from '@/features/formations/hooks/useLevels';
import { useDocuments } from '@/features/formations/hooks/useDocuments';
import { useGrants } from '../hooks/useGrants';
import { useUserSearch } from '../hooks/useUserSearch';
import { useUserTitles } from '../hooks/useUserTitles';
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
  const userSearch = useUserSearch();
  const formationSearch = useFormationSearch();

  const [userId, setUserId] = useState('');
  const [selectedUserLabel, setSelectedUserLabel] = useState('');
  const [formationId, setFormationId] = useState('');
  const [selectedFormationLabel, setSelectedFormationLabel] = useState('');
  const [levelId, setLevelId] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { levels } = useLevels(formationId, !!formationId);
  const { documents } = useDocuments(levelId, !!levelId);

  // Valeurs dérivées (pas de useEffect : dérivation pure).
  const userSearchActive = userSearch.search.trim().length > 0;
  const userOptions = userSearchActive
    ? userSearch.users.map((u) => ({
        value: u.id,
        label: `${u.firstName} ${u.lastName} (${u.email})`,
      }))
    : [];

  const formationSearchActive = formationSearch.search.trim().length > 0;
  const formationOptions = formationSearchActive
    ? formationSearch.formations.map((f) => ({ value: f.id, label: f.name }))
    : [];

  // Libellés des utilisateurs / formations référencés par les attributions,
  // résolus en lot (un appel avec `ids` pour ne jamais charger toute la base).
  const grantedUserIds = grants.map((g) => g.userId);
  const grantedFormationIds = grants.map((g) => g.formationId);
  const userNames = useUserTitles(grantedUserIds);
  const formationNames = useFormationTitles(grantedFormationIds);

  // Titres des documents référencés par les grants (pour libeller la révocation).
  const grantedDocIds = grants.flatMap((g) => g.documentIds ?? []);
  const documentTitles = useDocumentTitles(grantedDocIds);

  const handleUserChange = (value: string) => {
    setUserId(value);
    if (!value) setSelectedUserLabel('');
  };

  const handleUserSelect = (option: { label: string }) => {
    setSelectedUserLabel(option.label);
  };

  const handleFormationChange = (value: string) => {
    setFormationId(value);
    if (!value) setSelectedFormationLabel('');
    setLevelId('');
    setDocumentId('');
  };

  const handleFormationSelect = (option: { label: string }) => {
    setSelectedFormationLabel(option.label);
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
              <SearchSelect
                value={userId}
                onChange={handleUserChange}
                onSelect={handleUserSelect}
                onSearch={userSearch.setSearch}
                selectedLabel={userId ? selectedUserLabel || userNames[userId] : undefined}
                isLoading={userSearch.isSearching}
                searchError={
                  userSearchActive && userSearch.isError
                    ? ((userSearch.error as { message?: string }).message ?? 'Recherche impossible.')
                    : null
                }
                placeholder="Rechercher un apprenant…"
                options={userOptions}
              />
            </Field>
            <Field label="Formation">
              <SearchSelect
                value={formationId}
                onChange={handleFormationChange}
                onSelect={handleFormationSelect}
                onSearch={formationSearch.setSearch}
                selectedLabel={
                  formationId ? selectedFormationLabel || formationNames[formationId] : undefined
                }
                isLoading={formationSearch.isSearching}
                searchError={
                  formationSearchActive && formationSearch.isError
                    ? ((formationSearch.error as { message?: string }).message ?? 'Recherche impossible.')
                    : null
                }
                placeholder="Rechercher une formation…"
                options={formationOptions}
              />
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

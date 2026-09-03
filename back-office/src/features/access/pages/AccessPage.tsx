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
import { useLevels } from '@/features/formations/hooks/useLevels';
import { useDocuments } from '@/features/formations/hooks/useDocuments';
import { useGrants } from '../hooks/useGrants';
import { useUserSearch } from '../hooks/useUserSearch';
import { useDocumentTitles } from '../hooks/useDocumentTitles';
import { styles } from './AccessPage.styles';

/** Formate une date ISO en date + heure françaises (ex. 03/09/2026 à 10:30). */
function formatGrantDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = date.toLocaleDateString('fr-FR');
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${day} à ${time}`;
}

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
  const filterUserSearch = useUserSearch();
  const formationSearch = useFormationSearch();

  const [userId, setUserId] = useState('');
  const [selectedUserLabel, setSelectedUserLabel] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [selectedFilterUserLabel, setSelectedFilterUserLabel] = useState('');
  const [formationId, setFormationId] = useState('');
  const [selectedFormationLabel, setSelectedFormationLabel] = useState('');
  const [levelId, setLevelId] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { levels } = useLevels(formationId, !!formationId);
  const { documents } = useDocuments(levelId, !!levelId);

  // Valeurs dérivées (pas de useEffect : dérivation pure).
  const userSearchActive = userSearch.search.trim().length > 0;
  const userOptions = userSearch.users.map((u) => ({
    value: u.id,
    label: `${u.firstName} ${u.lastName} (${u.email})`,
  }));
  const userNames: Record<string, string> = {};
  for (const u of userSearch.users) userNames[u.id] = `${u.firstName} ${u.lastName}`;

  // Filtre des attributions par utilisateur (même composant/recherche que le
  // formulaire d'octroi). La saisie est indépendante du champ « Utilisateur ».
  const filterUserSearchActive = filterUserSearch.search.trim().length > 0;
  const filterUserOptions = filterUserSearch.users.map((u) => ({
    value: u.id,
    label: `${u.firstName} ${u.lastName} (${u.email})`,
  }));

  const formationSearchActive = formationSearch.search.trim().length > 0;
  const formationOptions = formationSearch.formations.map((f) => ({ value: f.id, label: f.name }));
  const formationNames: Record<string, string> = {};
  for (const f of formationSearch.formations) formationNames[f.id] = f.name;

  const filteredGrants = filterUserId ? grants.filter((g) => g.userId === filterUserId) : grants;

  // Titres des documents référencés par les grants affichés (pour libeller la révocation).
  const grantedDocIds = filteredGrants.flatMap((g) => g.documentIds ?? []);
  const documentTitles = useDocumentTitles(grantedDocIds);

  const handleUserChange = (value: string) => {
    setUserId(value);
    if (!value) setSelectedUserLabel('');
  };

  const handleUserSelect = (option: { label: string }) => {
    setSelectedUserLabel(option.label);
  };

  const handleFilterUserChange = (value: string) => {
    setFilterUserId(value);
    if (!value) setSelectedFilterUserLabel('');
  };

  const handleFilterUserSelect = (option: { label: string }) => {
    setSelectedFilterUserLabel(option.label);
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
        <div style={styles.filter}>
          <Field label="Filtrer par utilisateur">
            <SearchSelect
              value={filterUserId}
              onChange={handleFilterUserChange}
              onSelect={handleFilterUserSelect}
              onSearch={filterUserSearch.setSearch}
              selectedLabel={filterUserId ? selectedFilterUserLabel : undefined}
              isLoading={filterUserSearch.isSearching}
              searchError={
                filterUserSearchActive && filterUserSearch.isError
                  ? ((filterUserSearch.error as { message?: string }).message ?? 'Recherche impossible.')
                  : null
              }
              placeholder="Tous les utilisateurs"
              options={filterUserOptions}
            />
          </Field>
        </div>
        {filteredGrants.length === 0 ? (
          <Empty
            label={
              filterUserId
                ? "Aucune attribution d'accès pour cet utilisateur."
                : "Aucune attribution d'accès."
            }
          />
        ) : (
          <div style={styles.list}>
            {filteredGrants.map((grant) => {
              // Grants anciens (pré-migration) : champs tableau potentiellement absents.
              const levelIds = grant.levelIds ?? [];
              const documentIds = grant.documentIds ?? [];
              const hasFullLevels = levelIds.length === 0;
              const hasFullDocs = documentIds.length === 0;
              return (
                <ListRow
                  key={grant._id}
                  title={grant.userName ?? userNames[grant.userId] ?? grant.userId}
                  subtitle={grant.formationName ?? formationNames[grant.formationId] ?? grant.formationId}
                  badges={
                    <>
                      <Badge color="var(--text-muted)">
                        {grant.grantedAt
                          ? `Accordé le ${formatGrantDate(grant.grantedAt)}`
                          : 'Date non renseignée'}
                      </Badge>
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

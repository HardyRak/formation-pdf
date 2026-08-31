import type { Formation, Level, TrainingDocument, PdfPage, PdfBlock } from '../../models';
import { SEED, type DocSeed } from '../../data/seed';

/**
 * Construction du catalogue à partir des données seed.
 * Le contenu des pages n'est jamais exposé en URL publique : il est
 * sérialisé page par page par le contrôleur `documents/:id/pages/:n`.
 */

function buildPages(doc: DocSeed, formationName: string, levelName: string): PdfPage[] {
  const pages: PdfPage[] = [];
  const push = (blocks: PdfBlock[]) =>
    pages.push({ documentId: doc.id, number: pages.length + 1, blocks });

  // Page de garde
  push([
    { type: 'p', text: formationName.toUpperCase() },
    { type: 'h1', text: doc.title },
    { type: 'divider' },
    { type: 'p', text: doc.description },
    { type: 'quote', text: `${levelName} — Support de formation interne` },
    { type: 'callout', text: 'Document confidentiel. Diffusion et reproduction interdites hors du cadre de la formation.' },
  ]);

  // Sommaire
  push([
    { type: 'h2', text: 'Sommaire' },
    { type: 'divider' },
    { type: 'bullets', items: doc.sections.map((sec, i) => `${i + 1}. ${sec.title}`) },
    { type: 'p', text: "Objectif pédagogique : à l'issue de ce module, vous serez capable d'appliquer les notions présentées dans votre activité quotidienne et de répondre au quiz de validation." },
  ]);

  doc.sections.forEach((sec, index) => {
    const blocks: PdfBlock[] = [
      { type: 'p', text: `Chapitre ${index + 1}` },
      { type: 'h2', text: sec.title },
      { type: 'divider' },
      { type: 'p', text: sec.body },
      { type: 'bullets', items: sec.bullets },
    ];
    if (sec.tip) blocks.push({ type: 'callout', text: sec.tip });
    if (sec.quote) blocks.push({ type: 'quote', text: sec.quote });
    push(blocks);
  });

  // Synthèse
  push([
    { type: 'h2', text: 'À retenir' },
    { type: 'divider' },
    { type: 'bullets', items: doc.sections.map((sec) => sec.bullets[0]) },
    { type: 'callout', text: 'Vous avez terminé ce document. Votre progression a été enregistrée automatiquement.' },
  ]);

  return pages;
}

export interface CatalogDb {
  formations: Formation[];
  levels: Level[];
  documents: TrainingDocument[];
  pages: Record<string, PdfPage[]>;
}

/**
 * Cache pour le catalogue de formations.
 * Encapsule la logique de cache pour permettre l'invalidation et faciliter les tests.
 */
class CatalogCache {
  private data: CatalogDb | null = null;

  get(): CatalogDb {
    if (this.data) return this.data;
    this.data = this.buildCatalog();
    return this.data;
  }

  invalidate(): void {
    this.data = null;
  }

  private buildCatalog(): CatalogDb {
    const formations: Formation[] = [];
    const levels: Level[] = [];
    const documents: TrainingDocument[] = [];
    const pages: Record<string, PdfPage[]> = {};

    SEED.forEach((f) => {
      let fDocs = 0;
      let fPages = 0;

      f.levels.forEach((l, li) => {
        let lPages = 0;
        l.documents.forEach((doc, di) => {
          const rendered = buildPages(doc, f.name, l.name);
          pages[doc.id] = rendered;
          lPages += rendered.length;
          documents.push({
            id: doc.id,
            levelId: l.id,
            formationId: f.id,
            order: di + 1,
            title: doc.title,
            description: doc.description,
            pageCount: rendered.length,
            sizeKb: 180 + rendered.length * 47,
            updatedAt: new Date(2024, (di + li) % 12, ((di * 7 + li * 3) % 27) + 1).toISOString(),
          });
        });
        fDocs += l.documents.length;
        fPages += lPages;
        levels.push({
          id: l.id,
          formationId: f.id,
          order: li + 1,
          name: l.name,
          description: l.description,
          documentsCount: l.documents.length,
          totalPages: lPages,
        });
      });

      formations.push({
        id: f.id,
        name: f.name,
        description: f.description,
        category: f.category,
        icon: f.icon,
        color: f.color,
        levelsCount: f.levels.length,
        documentsCount: fDocs,
        totalPages: fPages,
        durationMinutes: fPages * 3,
        mandatory: f.mandatory,
      });
    });

    return { formations, levels, documents, pages };
  }
}

export const catalogCache = new CatalogCache();

/**
 * Récupère le catalogue de formations.
 * Utilise un cache interne pour éviter de reconstruire le catalogue à chaque appel.
 */
export function catalogDb(): CatalogDb {
  return catalogCache.get();
}

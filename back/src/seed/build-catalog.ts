import type { PdfBlock, PdfPageDto } from '../common/contracts';
import type { DocSeed } from './catalog-seed';
import { SEED } from './catalog-seed';

/** Équivalent serveur de `mobile/src/core/api/backend/catalog.ts`. */

export interface SeedFormation {
  _id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  mandatory: boolean;
  order: number;
  levelsCount: number;
  documentsCount: number;
  totalPages: number;
  durationMinutes: number;
}

export interface SeedLevel {
  _id: string;
  formationId: string;
  order: number;
  name: string;
  description: string;
  documentsCount: number;
  totalPages: number;
}

export interface SeedDocument {
  _id: string;
  levelId: string;
  formationId: string;
  order: number;
  title: string;
  description: string;
  pageCount: number;
  sizeKb: number;
  updatedAt: Date;
  pages: PdfPageDto[];
}

export interface SeedCatalog {
  formations: SeedFormation[];
  levels: SeedLevel[];
  documents: SeedDocument[];
}

function buildPages(doc: DocSeed, formationName: string, levelName: string): PdfPageDto[] {
  const pages: PdfPageDto[] = [];
  const push = (blocks: PdfBlock[]) =>
    pages.push({ documentId: doc.id, number: pages.length + 1, blocks });

  // Page de garde
  push([
    { type: 'p', text: formationName.toUpperCase() },
    { type: 'h1', text: doc.title },
    { type: 'divider' },
    { type: 'p', text: doc.description },
    { type: 'quote', text: `${levelName} — Support de formation interne` },
    {
      type: 'callout',
      text: 'Document confidentiel. Diffusion et reproduction interdites hors du cadre de la formation.',
    },
  ]);

  // Sommaire
  push([
    { type: 'h2', text: 'Sommaire' },
    { type: 'divider' },
    { type: 'bullets', items: doc.sections.map((sec, i) => `${i + 1}. ${sec.title}`) },
    {
      type: 'p',
      text: "Objectif pédagogique : à l'issue de ce module, vous serez capable d'appliquer les notions présentées dans votre activité quotidienne et de répondre au quiz de validation.",
    },
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
    {
      type: 'callout',
      text: 'Vous avez terminé ce document. Votre progression a été enregistrée automatiquement.',
    },
  ]);

  return pages;
}

export function buildCatalog(): SeedCatalog {
  const formations: SeedFormation[] = [];
  const levels: SeedLevel[] = [];
  const documents: SeedDocument[] = [];

  SEED.forEach((formation, formationIndex) => {
    let formationDocuments = 0;
    let formationPages = 0;

    formation.levels.forEach((level, levelIndex) => {
      let levelPages = 0;

      level.documents.forEach((doc, docIndex) => {
        const rendered = buildPages(doc, formation.name, level.name);
        levelPages += rendered.length;

        documents.push({
          _id: doc.id,
          levelId: level.id,
          formationId: formation.id,
          order: docIndex + 1,
          title: doc.title,
          description: doc.description,
          pageCount: rendered.length,
          sizeKb: 180 + rendered.length * 47,
          updatedAt: new Date(
            2024,
            (docIndex + levelIndex) % 12,
            ((docIndex * 7 + levelIndex * 3) % 27) + 1,
          ),
          pages: rendered,
        });
      });

      formationDocuments += level.documents.length;
      formationPages += levelPages;

      levels.push({
        _id: level.id,
        formationId: formation.id,
        order: levelIndex + 1,
        name: level.name,
        description: level.description,
        documentsCount: level.documents.length,
        totalPages: levelPages,
      });
    });

    formations.push({
      _id: formation.id,
      name: formation.name,
      description: formation.description,
      category: formation.category,
      icon: formation.icon,
      color: formation.color,
      mandatory: formation.mandatory,
      order: formationIndex + 1,
      levelsCount: formation.levels.length,
      documentsCount: formationDocuments,
      totalPages: formationPages,
      durationMinutes: formationPages * 3,
    });
  });

  return { formations, levels, documents };
}

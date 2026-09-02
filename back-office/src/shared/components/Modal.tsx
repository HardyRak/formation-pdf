import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { styles } from './Modal.styles';

/**
 * Fenêtre modale générique (portail vers <body>).
 *
 * - Fermeture par Échap ou clic sur le fond (désactivable via `dismissible`).
 * - Verrouille le défilement de la page pendant l'ouverture.
 * - En-tête avec titre + croix ; corps défilant ; pied de page optionnel.
 *
 * Pour qu'un bouton « Enregistrer » situé dans le pied déclenche la
 * soumission d'un `<form id=…>` placé dans le corps, passer `formId` aux
 * boutons (`form={formId}`).
 */
export function Modal({
  title,
  children,
  footer,
  onClose,
  dismissible = true,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  dismissible?: boolean;
}) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, dismissible]);

  return createPortal(
    <div
      style={styles.backdrop}
      role="presentation"
      onMouseDown={(e) => {
        // Clic strictement sur le fond (pas sur la modale).
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} style={styles.panel}>
        <div style={styles.header}>
          <h2 id={titleId} style={styles.title}>
            {title}
          </h2>
          <button
            type="button"
            aria-label="Fermer"
            style={styles.close}
            onClick={onClose}
            disabled={!dismissible}
          >
            ✕
          </button>
        </div>
        <div style={styles.body}>{children}</div>
        {footer ? <div style={styles.footer}>{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

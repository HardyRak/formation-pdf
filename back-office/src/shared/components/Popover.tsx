import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

/**
 * Panneau flottant générique rendu dans un **portail** (`position: fixed`).
 *
 * Contrairement à un bloc `position: absolute`, il n'est pas rogné par un
 * conteneur parent en `overflow: auto` (ex. le corps d'une modale). Il se
 * positionne sous son ancre, ou au-dessus si la place manque, et se referme
 * au clic extérieur / Échap.
 *
 * Pose `data-popover` sur <body> tant qu'il est ouvert : la modale s'en sert
 * pour ne pas se fermer sur Échap quand un panneau est ouvert.
 */
export function Popover({
  open,
  onClose,
  anchorRef,
  children,
  minWidth = 0,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement>;
  children: ReactNode;
  minWidth?: number;
}) {
  const popRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  // Marqueur utilisé par la modale (Échap) et positionnement.
  useEffect(() => {
    if (!open) return;
    document.body.setAttribute('data-popover', 'open');
    return () => {
      document.body.removeAttribute('data-popover');
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const compute = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      const pop = popRef.current;
      if (!anchor || !pop) return;
      const gap = 6;
      const vh = window.innerHeight;
      const width = Math.max(anchor.width, minWidth);
      const popHeight = pop.offsetHeight || 320;
      const spaceBelow = vh - anchor.bottom - gap - 12;
      const spaceAbove = anchor.top - gap - 12;
      const below = spaceBelow >= Math.min(popHeight, 340) || spaceBelow >= spaceAbove;
      const maxHeight = Math.max(150, below ? spaceBelow : spaceAbove);
      const top = below
        ? anchor.bottom + gap
        : Math.max(12, anchor.top - gap - Math.min(popHeight, maxHeight));
      const left = Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8));
      setCoords({ top, left, width, maxHeight });
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [open, anchorRef, minWidth]);

  useLayoutEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={popRef}
      style={{
        position: 'fixed',
        zIndex: 1200,
        top: coords?.top ?? -9999,
        left: coords?.left ?? -9999,
        width: coords?.width,
        maxHeight: coords?.maxHeight ?? 340,
        overflowY: 'auto',
        visibility: coords ? 'visible' : 'hidden',
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

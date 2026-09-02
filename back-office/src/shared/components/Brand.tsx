import { styles } from './Brand.styles';

/** Bloc marque (tuile 📄 + nom), décliné en deux tailles (sidebar / login). */
export function Brand({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const lg = size === 'lg';
  return (
    <div style={lg ? styles.rowLg : styles.row}>
      <div style={lg ? styles.tileLg : styles.tile}>📄</div>
      <div>
        <div style={lg ? styles.titleLg : styles.title}>PDF Formation</div>
        <div style={lg ? styles.subtitleLg : styles.subtitle}>{lg ? 'Back-office' : 'BACK-OFFICE'}</div>
      </div>
    </div>
  );
}

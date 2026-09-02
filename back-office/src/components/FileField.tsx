import { useEffect, useRef } from 'react';
import { styles } from './FileField.styles';

/** Champ de sélection de fichier stylé (affiche le fichier choisi). */
export function FileField({
  accept,
  file,
  onFile,
  placeholder = 'Choisir un fichier…',
}: {
  accept?: string;
  file: File | null;
  onFile: (file: File | null) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  // Le parent a effacé la sélection : on réarme l'input natif.
  useEffect(() => {
    if (!file && ref.current) ref.current.value = '';
  }, [file]);

  return (
    <div style={styles.box} onClick={() => ref.current?.click()}>
      <input
        ref={ref}
        type="file"
        accept={accept}
        style={styles.input}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      <span style={file ? styles.name : styles.placeholder}>
        {file ? file.name : placeholder}
      </span>
      <span style={styles.hint}>PDF</span>
    </div>
  );
}

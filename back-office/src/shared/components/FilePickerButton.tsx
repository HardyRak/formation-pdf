import { useRef } from 'react';
import type { ComponentProps } from 'react';
import { Button } from './Button';

/** Button qui ouvre un sélecteur de fichier caché et transmet le fichier choisi. */
export function FilePickerButton({
  accept,
  onFile,
  ...props
}: Omit<ComponentProps<typeof Button>, 'onClick'> & {
  accept?: string;
  onFile: (file: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
      <Button {...props} onClick={() => ref.current?.click()} />
    </>
  );
}

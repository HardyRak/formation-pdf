import type { ComponentProps } from 'react';
import { Button } from './Button';

/** Button qui exige une confirmation native avant d'exécuter `onClick`. */
export function ConfirmButton({
  confirmMessage,
  onClick,
  ...props
}: ComponentProps<typeof Button> & { confirmMessage: string }) {
  return (
    <Button
      {...props}
      onClick={(e) => {
        if (window.confirm(confirmMessage)) onClick?.(e);
      }}
    />
  );
}

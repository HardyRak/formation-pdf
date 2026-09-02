import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { styles } from './TextArea.styles';

/** Zone de texte multiligne (forwardRef pour react-hook-form). */
export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea(props, ref) {
    return <textarea ref={ref} {...props} style={{ ...styles.input, ...props.style }} />;
  },
);

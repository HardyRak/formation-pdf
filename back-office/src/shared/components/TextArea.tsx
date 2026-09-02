import type { TextareaHTMLAttributes } from 'react';
import { styles } from './TextArea.styles';

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...styles.input, ...props.style }} />;
}

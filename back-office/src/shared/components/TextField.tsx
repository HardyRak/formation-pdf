import type { InputHTMLAttributes } from 'react';
import { styles } from './TextField.styles';

export function TextField(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...styles.input, ...props.style }} />;
}

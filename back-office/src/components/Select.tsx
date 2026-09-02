import type { SelectHTMLAttributes } from 'react';
import { styles } from './Select.styles';

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...styles.input, ...props.style }} />;
}

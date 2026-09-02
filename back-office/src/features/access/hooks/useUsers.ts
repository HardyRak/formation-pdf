import { useQuery } from '@tanstack/react-query';
import { accessService } from '../services/accessService';

/** Liste des utilisateurs (selects de la page Accès). */
export function useUsers() {
  const query = useQuery({ queryKey: ['users'], queryFn: () => accessService.listUsers({}) });
  return { users: query.data?.items ?? [] };
}

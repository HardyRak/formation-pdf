import { useQuery } from '@tanstack/react-query';
import { formationService } from '@/features/formations/services/formationService';
import { dashboardService } from '../services/dashboardService';

/** Stats du tableau de bord + noms de formations pour la complétion. */
export function useDashboard() {
  const stats = useQuery({ queryKey: ['stats'], queryFn: dashboardService.getStats });
  const formations = useQuery({ queryKey: ['formations'], queryFn: formationService.list });

  return { stats, formations };
}

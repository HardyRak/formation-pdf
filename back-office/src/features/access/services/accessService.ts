import { api } from '@/shared/api/client';
import type { AccessGrantDto, AdminList, UserDto } from '@/shared/types/api';

/** Communication avec le backend pour les accès et utilisateurs (/v1/admin). */
export const accessService = {
  listGrants: (userId?: string) =>
    api.get<AccessGrantDto[]>(`/admin/access${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`),

  grant: (body: { userId: string; formationId: string; levelIds?: string[]; documentIds?: string[] }) =>
    api.post<AccessGrantDto>('/admin/access', body),

  revokeGrant: (userId: string, formationId: string) =>
    api.delete<{ success: boolean }>(`/admin/access/${userId}/${formationId}`),

  revokeDocument: (userId: string, documentId: string) =>
    api.delete<{ success: boolean }>(`/admin/access/document/${userId}/${documentId}`),

  listUsers: (params: { q?: string; role?: string }) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.role) qs.set('role', params.role);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<AdminList<UserDto>>(`/admin/users${suffix}`);
  },
};

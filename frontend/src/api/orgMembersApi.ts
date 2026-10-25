import axios from 'axios';
import { API_BASE_URL } from './config';

export type OrganizationRole = 'MEMBER' | 'ORGANIZATION_ADMIN';

export interface OrgMemberResponse {
  membershipId: string;
  userId: string;
  email: string | null;
  displayName: string | null;
  pictureUrl: string | null;
  role: OrganizationRole;
  platformAdmin: boolean;
  joinedAt: string | null;
}

export interface InviteMemberRequest {
  userId: string;
  role: OrganizationRole;
}

export interface UpdateMemberRoleRequest {
  role: OrganizationRole;
}

export const orgMembersApi = {
  listMembers: (): Promise<OrgMemberResponse[]> =>
    axios.get<OrgMemberResponse[]>(`${API_BASE_URL}/organizations/members`).then((r) => r.data),

  addMember: (request: InviteMemberRequest): Promise<OrgMemberResponse> =>
    axios.post<OrgMemberResponse>(`${API_BASE_URL}/organizations/members`, request).then((r) => r.data),

  updateMemberRole: (membershipId: string, request: UpdateMemberRoleRequest): Promise<OrgMemberResponse> =>
    axios.put<OrgMemberResponse>(`${API_BASE_URL}/organizations/members/${membershipId}/role`, request).then((r) => r.data),

  removeMember: (membershipId: string): Promise<void> =>
    axios.delete(`${API_BASE_URL}/organizations/members/${membershipId}`).then(() => undefined),
};

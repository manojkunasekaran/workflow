import { useEffect, type ReactNode } from 'react';
import '@/api/httpClient';
import { useOrganizationStore } from '@/organization/organizationStore';

type OrganizationProviderProps = {
  children: ReactNode;
};

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const bootstrap = useOrganizationStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return children;
}

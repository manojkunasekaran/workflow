import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { isSignedIn, useAuthStore } from '@/auth/authStore';
import { OrganizationBreadcrumbSwitcher } from '@/organization/OrganizationBreadcrumbSwitcher';

interface PageHeaderProps {
    title: ReactNode;
    actions?: ReactNode;
    hideOrgBreadcrumb?: boolean;
}

/** Shared top bar — organization breadcrumb root, page title, and actions. */
export function PageHeader({ title, actions, hideOrgBreadcrumb = false }: PageHeaderProps) {
    const me = useAuthStore((s) => s.me);
    const signedIn = isSignedIn(me);

    return (
        <header className="sticky top-0 z-10 flex h-[var(--density-header-h)] shrink-0 items-center justify-between border-b border-border bg-background/80 px-[var(--density-header-px)] backdrop-blur-md">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                {signedIn && !hideOrgBreadcrumb && (
                    <>
                        <OrganizationBreadcrumbSwitcher />
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
                    </>
                )}
                <div className="min-w-0 flex-1">{title}</div>
            </div>
            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </header>
    );
}

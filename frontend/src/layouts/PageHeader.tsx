import type { ReactNode } from 'react';

interface PageHeaderProps {
    title: ReactNode;
    actions?: ReactNode;
}

/** Shared top bar — page title and actions only (sidebar toggle lives in the sidebar). */
export function PageHeader({ title, actions }: PageHeaderProps) {
    return (
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
            <div className="min-w-0 flex-1">{title}</div>
            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </header>
    );
}

import type { MouseEvent } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
    label: string;
    href?: string;
    onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
    testId?: string;
}

interface PageBreadcrumbProps {
    items: BreadcrumbItem[];
}

export function PageBreadcrumb({ items }: PageBreadcrumbProps) {
    return (
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
            {items.map((item, index) => (
                <span key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
                    {index > 0 ? (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    ) : null}
                    {item.href ? (
                        <Link
                            to={item.href}
                            onClick={item.onNavigate}
                            className="truncate text-muted-foreground transition-colors hover:text-foreground"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <h1
                            data-testid={item.testId}
                            className="truncate text-sm font-semibold text-foreground"
                        >
                            {item.label}
                        </h1>
                    )}
                </span>
            ))}
        </nav>
    );
}

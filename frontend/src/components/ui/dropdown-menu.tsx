import * as React from 'react';
import { cn } from '@/lib/utils';

// Lightweight, composable dropdown menu built without Radix dropdown-menu
// (since @radix-ui/react-dropdown-menu is not installed).
// Uses a click-outside pattern with a portal-free positioned div.

interface DropdownMenuContextValue {
    open: boolean;
    setOpen: (open: boolean) => void;
}
const DropdownMenuContext = React.createContext<DropdownMenuContextValue>({
    open: false,
    setOpen: () => {},
});

function DropdownMenu({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!open) return;
        function onClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, [open]);

    return (
        <DropdownMenuContext.Provider value={{ open, setOpen }}>
            <div ref={ref} className="relative inline-block">
                {children}
            </div>
        </DropdownMenuContext.Provider>
    );
}

function DropdownMenuTrigger({ children, asChild }: { children: React.ReactElement; asChild?: boolean }) {
    const { open, setOpen } = React.useContext(DropdownMenuContext);
    if (asChild) {
        return React.cloneElement(children, {
            onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                setOpen(!open);
                children.props.onClick?.(e);
            },
        });
    }
    return (
        <button onClick={() => setOpen(!open)} type="button">
            {children}
        </button>
    );
}

interface DropdownMenuContentProps {
    children: React.ReactNode;
    align?: 'start' | 'end' | 'center';
    className?: string;
}
function DropdownMenuContent({ children, align = 'end', className }: DropdownMenuContentProps) {
    const { open, setOpen } = React.useContext(DropdownMenuContext);
    if (!open) return null;
    return (
        <div
            className={cn(
                'absolute z-50 mt-1 min-w-[9rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95',
                align === 'end' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0',
                className,
            )}
            onClick={() => setOpen(false)}
        >
            {children}
        </div>
    );
}

interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    className?: string;
}
function DropdownMenuItem({ children, className, ...props }: DropdownMenuItemProps) {
    return (
        <button
            type="button"
            className={cn(
                'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                className,
            )}
            {...props}
        >
            {children}
        </button>
    );
}

function DropdownMenuSeparator({ className }: { className?: string }) {
    return <div className={cn('-mx-1 my-1 h-px bg-muted', className)} />;
}

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
};

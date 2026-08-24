import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
    value: string;
    onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

export function useTabs() {
    const context = React.useContext(TabsContext);
    if (!context) {
        throw new Error('Tabs compound components must be used within a Tabs provider');
    }
    return context;
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
}

export function Tabs({
    value: controlledValue,
    defaultValue = '',
    onValueChange,
    className,
    children,
    ...props
}: TabsProps) {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
    const isControlled = controlledValue !== undefined;
    const activeValue = isControlled ? controlledValue : uncontrolledValue;

    const handleValueChange = React.useCallback(
        (newValue: string) => {
            if (!isControlled) {
                setUncontrolledValue(newValue);
            }
            onValueChange?.(newValue);
        },
        [isControlled, onValueChange]
    );

    return (
        <TabsContext.Provider value={{ value: activeValue, onValueChange: handleValueChange }}>
            <div className={cn('w-full', className)} {...props}>
                {children}
            </div>
        </TabsContext.Provider>
    );
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
                className
            )}
            role="tablist"
            {...props}
        />
    );
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    value: string;
}

export function TabsTrigger({ value, className, children, ...props }: TabsTriggerProps) {
    const { value: activeValue, onValueChange } = useTabs();
    const isActive = activeValue === value;

    return (
        <button
            type="button"
            role="tab"
            aria-selected={isActive}
            className={cn(
                'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
                isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'hover:bg-background/50 hover:text-foreground',
                className
            )}
            onClick={() => onValueChange(value)}
            {...props}
        >
            {children}
        </button>
    );
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
    value: string;
}

export function TabsContent({ value, className, children, ...props }: TabsContentProps) {
    const { value: activeValue } = useTabs();
    if (activeValue !== value) return null;

    return (
        <div
            role="tabpanel"
            tabIndex={0}
            className={cn(
                'mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import GridLayout, { type Layout } from 'react-grid-layout';
import {
    AlignLeft,
    Calendar,
    CalendarClock,
    CheckSquare,
    CircleDot,
    Eye,
    EyeOff,
    FileUp,
    GripVertical,
    Heading,
    ListChecks,
    ListFilter,
    Mail,
    Hash,
    Phone,
    Plus,
    ShieldCheck,
    SlidersHorizontal,
    Trash2,
    Type,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { FormRenderer } from '@/features/forms/FormRenderer';
import type { FormFieldDefinition, FormFieldType, FormLayoutMode, FormPageDefinition, FormSchema } from '@/types/form';
import {
    FORM_FIELD_TYPES,
    createField,
    normalizeFormSchema,
    singlePageSchema,
    updateSinglePage,
} from '@/features/forms/lib/formSchemaUtils';
import { cn } from '@/lib/utils';

export interface FormSchemaBuilderProps {
    value: unknown;
    onChange: (schema: FormSchema) => void;
}

const FIELD_ICONS: Record<FormFieldType, React.ComponentType<{ className?: string }>> = {
    TEXT: Type,
    TEXTAREA: AlignLeft,
    EMAIL: Mail,
    NUMBER: Hash,
    PHONE: Phone,
    SELECT: ListFilter,
    MULTI_SELECT: ListChecks,
    RADIO: CircleDot,
    CHECKBOX: CheckSquare,
    DATE: Calendar,
    DATETIME: CalendarClock,
    HIDDEN: EyeOff,
    CONSENT: ShieldCheck,
    SECTION_HEADER: Heading,
    FILE: FileUp,
};

function SortableFieldRow({
    field,
    selected,
    onSelect,
    onRemove,
}: {
    field: FormFieldDefinition;
    selected: boolean;
    onSelect: () => void;
    onRemove: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.key });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
    };
    const Icon = FIELD_ICONS[field.type] ?? Type;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'group flex items-center gap-2 rounded-lg border p-2.5 text-sm transition-all cursor-pointer min-w-0 select-none',
                selected
                    ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20'
                    : 'border-border bg-card hover:border-border/80 hover:bg-muted/40',
                isDragging && 'opacity-60 shadow-md ring-2 ring-primary',
            )}
            onClick={onSelect}
        >
            <button
                type="button"
                className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-muted-foreground shrink-0 p-0.5 rounded transition-colors"
                {...attributes}
                {...listeners}
                aria-label="Drag to reorder"
            >
                <GripVertical className="h-4 w-4" />
            </button>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="flex flex-1 items-center gap-1.5 min-w-0">
                <span className="truncate font-medium text-foreground text-xs sm:text-sm">
                    {field.label ?? field.key}
                </span>
                {field.required && (
                    <span className="text-destructive font-bold text-xs" title="Required">*</span>
                )}
            </div>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground uppercase shrink-0">
                {field.type}
            </span>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                aria-label="Delete field"
            >
                <Trash2 className="h-3.5 w-3.5" />
            </Button>
        </div>
    );
}

export function FormSchemaBuilder({ value, onChange }: FormSchemaBuilderProps) {
    const schema = useMemo(() => normalizeFormSchema(value), [value]);
    const page = singlePageSchema(schema);
    const [selectedKey, setSelectedKey] = useState<string | null>(page.fields[0]?.key ?? null);
    const [viewMode, setViewMode] = useState<'design' | 'preview'>('design');

    const canvasRef = useRef<HTMLDivElement>(null);
    const [canvasWidth, setCanvasWidth] = useState<number>(480);

    useEffect(() => {
        if (!canvasRef.current) return;
        const el = canvasRef.current;
        const updateWidth = () => {
            const w = el.getBoundingClientRect().width;
            if (w > 0) {
                setCanvasWidth(Math.floor(w));
            }
        };
        updateWidth();
        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const w = entry.contentRect.width || entry.target.getBoundingClientRect().width;
                    if (w > 0) setCanvasWidth(Math.floor(w));
                }
            });
            ro.observe(el);
            return () => ro.disconnect();
        }
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const updatePage = (next: FormPageDefinition) => {
        onChange(updateSinglePage(schema, next));
    };

    const updateField = (key: string, patch: Partial<FormFieldDefinition>) => {
        updatePage({
            ...page,
            fields: page.fields.map((f) => (f.key === key ? { ...f, ...patch } : f)),
        });
        if (patch.key && selectedKey === key) {
            setSelectedKey(patch.key);
        }
    };

    const addField = (type: FormFieldDefinition['type']) => {
        const field = createField(type, page.fields);
        updatePage({ ...page, fields: [...page.fields, field] });
        setSelectedKey(field.key);
    };

    const removeField = (key: string) => {
        const nextFields = page.fields.filter((f) => f.key !== key);
        updatePage({ ...page, fields: nextFields });
        if (selectedKey === key) {
            setSelectedKey(nextFields[0]?.key ?? null);
        }
    };

    const onDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = page.fields.findIndex((f) => f.key === active.id);
        const newIndex = page.fields.findIndex((f) => f.key === over.id);
        if (oldIndex < 0 || newIndex < 0) return;
        updatePage({ ...page, fields: arrayMove(page.fields, oldIndex, newIndex) });
    };

    const selected = page.fields.find((f) => f.key === selectedKey);

    const gridLayout: Layout[] = page.fields.map((f, index) => ({
        i: f.key,
        x: f.layout?.x ?? 0,
        y: f.layout?.y ?? index,
        w: f.layout?.w ?? 12,
        h: f.layout?.h ?? 1,
        minW: 2,
        minH: 1,
    }));

    const onGridChange = (layout: Layout[]) => {
        const byKey = new Map(layout.map((l) => [l.i, l]));
        updatePage({
            ...page,
            fields: page.fields.map((f) => {
                const l = byKey.get(f.key);
                if (!l) return f;
                return { ...f, layout: { x: l.x, y: l.y, w: l.w, h: l.h } };
            }),
        });
    };

    const layoutMode: FormLayoutMode = page.layoutMode ?? 'STACK';

    return (
        <div className="flex flex-col gap-4 w-full min-w-0">
            {/* Header Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                <div className="flex flex-1 items-center gap-3 min-w-[240px]">
                    <div className="flex-1 max-w-xs space-y-1">
                        <Label className="text-xs text-muted-foreground font-medium">Page title</Label>
                        <Input
                            value={page.title ?? ''}
                            onChange={(e) => updatePage({ ...page, title: e.target.value })}
                            placeholder="Page title"
                            className="h-8 text-xs"
                        />
                    </div>
                    <div className="w-36 space-y-1">
                        <Label className="text-xs text-muted-foreground font-medium">Layout</Label>
                        <Select
                            value={layoutMode}
                            onValueChange={(v: FormLayoutMode) => updatePage({ ...page, layoutMode: v })}
                        >
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="STACK">Stack</SelectItem>
                                <SelectItem value="GRID">Grid (12 col)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* View Mode Toggle: [Design] [Live Preview] */}
                <div className="flex items-center rounded-lg border bg-muted p-0.5 text-xs">
                    <button
                        type="button"
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1 font-medium rounded-md transition-all cursor-pointer',
                            viewMode === 'design'
                                ? 'bg-background text-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                        onClick={() => setViewMode('design')}
                    >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        Design
                    </button>
                    <button
                        type="button"
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1 font-medium rounded-md transition-all cursor-pointer',
                            viewMode === 'preview'
                                ? 'bg-background text-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                        onClick={() => setViewMode('preview')}
                    >
                        <Eye className="h-3.5 w-3.5" />
                        Live Preview
                    </button>
                </div>
            </div>

            {/* Content Mode */}
            {viewMode === 'preview' ? (
                <div className="w-full rounded-xl border bg-card p-6 shadow-xs">
                    <div className="mb-4 flex items-center justify-between border-b pb-3">
                        <div>
                            <h3 className="text-sm font-semibold text-foreground">Interactive Form Preview</h3>
                            <p className="text-xs text-muted-foreground">
                                Test conditional visibility, field validation, and responsive input sizing live.
                            </p>
                        </div>
                        <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            Preview
                        </span>
                    </div>
                    <FormRenderer
                        page={page}
                        onSubmit={() => undefined}
                        submitLabel={page.submitButtonLabel || 'Submit'}
                    />
                </div>
            ) : (
                /* Design 3-Pane Responsive Layout */
                <div className="flex flex-col lg:flex-row gap-4 items-start w-full min-w-0">
                    {/* Pane 1: Palette */}
                    <div className="w-full lg:w-44 lg:min-w-[170px] shrink-0 space-y-2">
                        <div className="pb-1 border-b">
                            <p className="text-xs font-medium text-muted-foreground">Add field</p>
                        </div>
                        <div className="flex flex-col gap-1.5 max-h-[520px] overflow-y-auto pr-1 scrollbar-thin">
                            {FORM_FIELD_TYPES.map((item) => {
                                const Icon = FIELD_ICONS[item.type] ?? Plus;
                                return (
                                    <Button
                                        key={item.type}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-start gap-2 h-8 px-2.5 text-xs font-normal"
                                        disabled={item.disabled}
                                        onClick={() => addField(item.type)}
                                    >
                                        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                        <span className="truncate">{item.label}</span>
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Pane 2: Canvas / Field List */}
                    <div ref={canvasRef} className="w-full flex-1 min-w-0 space-y-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground pb-1 border-b">
                            <span className="truncate">
                                {page.title || 'Untitled Page'} • {page.fields.length}{' '}
                                {page.fields.length === 1 ? 'field' : 'fields'}
                            </span>
                            <span className="uppercase tracking-wider font-semibold text-[10px] bg-muted px-1.5 py-0.5 rounded shrink-0">
                                {layoutMode}
                            </span>
                        </div>

                        {page.fields.length === 0 ? (
                            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground bg-muted/10 space-y-2">
                                <p className="font-medium text-foreground">No fields added yet</p>
                                <p className="text-xs">Pick a field type from the left to start.</p>
                            </div>
                        ) : layoutMode === 'STACK' ? (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                                <SortableContext items={page.fields.map((f) => f.key)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-2">
                                        {page.fields.map((field) => (
                                            <SortableFieldRow
                                                key={field.key}
                                                field={field}
                                                selected={field.key === selectedKey}
                                                onSelect={() => setSelectedKey(field.key)}
                                                onRemove={() => removeField(field.key)}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        ) : (
                            <GridLayout
                                className="layout border rounded-lg p-2 bg-muted/15 min-h-[220px]"
                                layout={gridLayout}
                                cols={12}
                                rowHeight={64}
                                width={canvasWidth}
                                onLayoutChange={onGridChange}
                                compactType="vertical"
                            >
                                {page.fields.map((field) => {
                                    const Icon = FIELD_ICONS[field.type] ?? Type;
                                    return (
                                        <div
                                            key={field.key}
                                            className={cn(
                                                'rounded-md border p-2 text-xs cursor-pointer flex flex-col justify-between overflow-hidden transition-all shadow-2xs select-none',
                                                field.key === selectedKey
                                                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                                                    : 'border-border bg-card hover:bg-muted/40',
                                            )}
                                            onClick={() => setSelectedKey(field.key)}
                                        >
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                                                <span className="truncate font-medium text-foreground">
                                                    {field.label ?? field.key}
                                                </span>
                                                {field.required && (
                                                    <span className="text-destructive font-bold text-[10px]">*</span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                                                <span className="font-mono truncate">{field.key}</span>
                                                <span className="uppercase text-[9px]">{field.type}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </GridLayout>
                        )}
                    </div>

                    {/* Pane 3: Field Inspector */}
                    <div className="w-full lg:w-72 lg:min-w-[260px] shrink-0 space-y-3 rounded-lg border bg-card p-3 shadow-2xs">
                        <div className="flex items-center justify-between pb-1 border-b">
                            <p className="text-xs font-medium text-muted-foreground">Field settings</p>
                            {selected && (
                                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground uppercase">
                                    {selected.type}
                                </span>
                            )}
                        </div>

                        {selected ? (
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground font-medium">Field Key</Label>
                                    <Input
                                        value={selected.key}
                                        onChange={(e) => updateField(selected.key, { key: e.target.value })}
                                        className="h-8 text-xs font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground font-medium">Label</Label>
                                    <Input
                                        value={selected.label ?? ''}
                                        onChange={(e) => updateField(selected.key, { label: e.target.value })}
                                        className="h-8 text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground font-medium">Placeholder</Label>
                                    <Input
                                        value={selected.placeholder ?? ''}
                                        placeholder="Enter placeholder..."
                                        onChange={(e) => updateField(selected.key, { placeholder: e.target.value })}
                                        className="h-8 text-xs"
                                    />
                                </div>
                                <div className="flex items-center justify-between rounded-md border p-2 bg-muted/20">
                                    <Label htmlFor="field-required-toggle" className="text-xs cursor-pointer font-medium">
                                        Required
                                    </Label>
                                    <input
                                        id="field-required-toggle"
                                        type="checkbox"
                                        checked={Boolean(selected.required)}
                                        onChange={(e) => updateField(selected.key, { required: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground font-medium">Default Value</Label>
                                    <Input
                                        value={selected.defaultValue ?? ''}
                                        placeholder="Default value (optional)"
                                        onChange={(e) => updateField(selected.key, { defaultValue: e.target.value })}
                                        className="h-8 text-xs"
                                    />
                                </div>
                                {(selected.type === 'SELECT' || selected.type === 'RADIO' || selected.type === 'MULTI_SELECT') && (
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground font-medium">Options (one per line)</Label>
                                        <textarea
                                            className="w-full min-h-[75px] rounded-md border border-input bg-background p-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
                                            value={(selected.options ?? []).join('\n')}
                                            placeholder="Option 1&#10;Option 2"
                                            onChange={(e) =>
                                                updateField(selected.key, {
                                                    options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                                                })
                                            }
                                        />
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground font-medium">Show when (optional)</Label>
                                    <Input
                                        placeholder="other_field == 'yes'"
                                        value={selected.visibleWhen ?? ''}
                                        onChange={(e) =>
                                            updateField(selected.key, {
                                                visibleWhen: e.target.value.trim() || undefined,
                                            })
                                        }
                                        className="h-8 text-xs font-mono"
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Example: consent == &apos;true&apos; or tier == &apos;pro&apos;
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground bg-muted/10">
                                Select a field from the list to customize its settings
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

import { useMemo, useState } from 'react';
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
import { GripVertical, Plus, Trash2 } from 'lucide-react';
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
import type { FormFieldDefinition, FormLayoutMode, FormPageDefinition, FormSchema } from '@/types/form';
import {
    FORM_FIELD_TYPES,
    createField,
    normalizeFormSchema,
    singlePageSchema,
    updateSinglePage,
} from '@/features/forms/lib/formSchemaUtils';

export interface FormSchemaBuilderProps {
    value: unknown;
    onChange: (schema: FormSchema) => void;
}

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
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.key });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-2 rounded-md border p-2 text-sm ${selected ? 'border-primary bg-primary/5' : 'border-border'}`}
            onClick={onSelect}
        >
            <button type="button" className="cursor-grab text-muted-foreground" {...attributes} {...listeners}>
                <GripVertical className="h-4 w-4" />
            </button>
            <span className="flex-1 truncate font-medium">{field.label ?? field.key}</span>
            <span className="text-xs text-muted-foreground">{field.type}</span>
            <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
                <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
        </div>
    );
}

export function FormSchemaBuilder({ value, onChange }: FormSchemaBuilderProps) {
    const schema = useMemo(() => normalizeFormSchema(value), [value]);
    const page = singlePageSchema(schema);
    const [selectedKey, setSelectedKey] = useState<string | null>(page.fields[0]?.key ?? null);

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
    };

    const addField = (type: FormFieldDefinition['type']) => {
        const field = createField(type, page.fields);
        updatePage({ ...page, fields: [...page.fields, field] });
        setSelectedKey(field.key);
    };

    const removeField = (key: string) => {
        updatePage({ ...page, fields: page.fields.filter((f) => f.key !== key) });
        if (selectedKey === key) setSelectedKey(null);
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
        <div className="grid gap-4 lg:grid-cols-[220px_1fr_280px]">
            <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Add field</p>
                {FORM_FIELD_TYPES.map((item) => (
                    <Button
                        key={item.type}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        disabled={item.disabled}
                        onClick={() => addField(item.type)}
                    >
                        <Plus className="mr-2 h-3 w-3" />
                        {item.label}
                    </Button>
                ))}
            </div>

            <div className="space-y-3 min-w-0">
                <div className="flex flex-wrap gap-2 items-end">
                    <div className="flex-1 space-y-1">
                        <Label>Page title</Label>
                        <Input value={page.title ?? ''} onChange={(e) => updatePage({ ...page, title: e.target.value })} />
                    </div>
                    <div className="space-y-1 w-36">
                        <Label>Layout</Label>
                        <Select
                            value={layoutMode}
                            onValueChange={(v: FormLayoutMode) => updatePage({ ...page, layoutMode: v })}
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="STACK">Stack</SelectItem>
                                <SelectItem value="GRID">Grid (12 col)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {layoutMode === 'STACK' ? (
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
                        className="layout border rounded-md p-2 bg-muted/20"
                        layout={gridLayout}
                        cols={12}
                        rowHeight={48}
                        width={640}
                        onLayoutChange={onGridChange}
                    >
                        {page.fields.map((field) => (
                            <div
                                key={field.key}
                                className={`rounded border bg-background p-2 text-xs cursor-pointer ${field.key === selectedKey ? 'border-primary' : 'border-border'}`}
                                onClick={() => setSelectedKey(field.key)}
                            >
                                {field.label ?? field.key}
                            </div>
                        ))}
                    </GridLayout>
                )}

                <div className="rounded-md border p-4 bg-muted/10">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Preview</p>
                    <FormRenderer
                        page={page}
                        onSubmit={() => undefined}
                        disabled
                        submitLabel="Preview only"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Field settings</p>
                {selected ? (
                    <>
                        <div className="space-y-1">
                            <Label>Key</Label>
                            <Input value={selected.key} onChange={(e) => updateField(selected.key, { key: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <Label>Label</Label>
                            <Input value={selected.label ?? ''} onChange={(e) => updateField(selected.key, { label: e.target.value })} />
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={Boolean(selected.required)}
                                onChange={(e) => updateField(selected.key, { required: e.target.checked })}
                            />
                            Required
                        </label>
                        <div className="space-y-1">
                            <Label>Show when (optional)</Label>
                            <Input
                                placeholder="other_field == 'yes'"
                                value={selected.visibleWhen ?? ''}
                                onChange={(e) =>
                                    updateField(selected.key, {
                                        visibleWhen: e.target.value.trim() || undefined,
                                    })
                                }
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Example: consent == &apos;true&apos; or tier == &apos;pro&apos;
                            </p>
                        </div>
                        {(selected.type === 'SELECT' || selected.type === 'RADIO') ? (
                            <div className="space-y-1">
                                <Label>Options (one per line)</Label>
                                <textarea
                                    className="w-full min-h-[60px] rounded-md border p-2 text-sm"
                                    value={(selected.options ?? []).join('\n')}
                                    onChange={(e) =>
                                        updateField(selected.key, {
                                            options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                                        })
                                    }
                                />
                            </div>
                        ) : null}
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground">Select a field to edit.</p>
                )}
            </div>
        </div>
    );
}

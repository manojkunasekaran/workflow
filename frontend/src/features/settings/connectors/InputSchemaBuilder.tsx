import { type ConnectorInputField, type ConnectorFieldType } from '@/api/connectorApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Code2 } from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

function slugify(label: string): string {
    return label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
}

/** BOOLEAN and SELECT fields have fixed values — dynamic expressions make no sense for them */
function autoSupportsExpression(type: ConnectorFieldType): boolean {
    return type !== 'BOOLEAN' && type !== 'SELECT';
}

const FIELD_TYPE_LABELS: Record<ConnectorFieldType, string> = {
    STRING: 'Text',
    TEXTAREA: 'Long Text',
    NUMBER: 'Number',
    BOOLEAN: 'Toggle (Yes/No)',
    JSON: 'JSON Object',
    SELECT: 'Dropdown',
};

// ─── Component ───────────────────────────────────────────────────────────────

interface InputSchemaBuilderProps {
    fields: ConnectorInputField[];
    onChange: (fields: ConnectorInputField[]) => void;
}

export default function InputSchemaBuilder({ fields, onChange }: InputSchemaBuilderProps) {
    const addField = () => {
        const count = fields.length + 1;
        const newField: ConnectorInputField = {
            key: `field_${count}`,
            label: '',
            type: 'STRING',
            required: false,
            supportsExpression: true, // auto-derived — STRING supports expressions
        };
        onChange([...fields, newField]);
    };

    const updateField = (index: number, updates: Partial<ConnectorInputField>) => {
        const newFields = [...fields];
        const merged = { ...newFields[index], ...updates };
        // If the type changed, re-derive supportsExpression automatically
        if (updates.type !== undefined) {
            merged.supportsExpression = autoSupportsExpression(updates.type);
        }
        newFields[index] = merged;
        onChange(newFields);
    };

    const handleLabelChange = (index: number, label: string) => {
        const key = slugify(label) || `field_${index + 1}`;
        updateField(index, { label, key });
    };

    const removeField = (index: number) => {
        onChange(fields.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-medium">Input Fields</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Define what information users must provide when using this action.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={addField} className="gap-1.5 h-8">
                    <Plus className="h-3.5 w-3.5" /> Add Field
                </Button>
            </div>

            {fields.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg bg-muted/10">
                    <Code2 className="h-6 w-6 mx-auto mb-2 opacity-40" />
                    No input fields yet. This action will execute with no user input.
                </div>
            ) : (
                <div className="space-y-2">
                    {fields.map((field, index) => (
                        <div
                            key={index}
                            className="border rounded-lg bg-card shadow-sm overflow-hidden"
                        >
                            {/* Field header row */}
                            <div className="grid grid-cols-[1fr_120px_auto] gap-3 p-3 items-end">
                                {/* Label → auto-derives key */}
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Label <span className="text-destructive">*</span></Label>
                                    <Input
                                        className="h-8 text-sm"
                                        value={field.label}
                                        onChange={e => handleLabelChange(index, e.target.value)}
                                        placeholder="e.g. Channel ID"
                                    />
                                    {/* Show derived key as read-only hint */}
                                    {field.key && (
                                        <p className="text-[10px] text-muted-foreground font-mono">
                                            key: <span className="text-foreground">{field.key}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Field type */}
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Type</Label>
                                    <Select
                                        value={field.type}
                                        onValueChange={val => updateField(index, { type: val as ConnectorFieldType })}
                                    >
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(Object.keys(FIELD_TYPE_LABELS) as ConnectorFieldType[]).map(t => (
                                                <SelectItem key={t} value={t} className="text-xs">
                                                    {FIELD_TYPE_LABELS[t]}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Delete */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 self-end"
                                    onClick={() => removeField(index)}
                                    title="Remove field"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>

                            {/* Secondary row — required toggle + placeholder */}
                            <div className="border-t bg-muted/20 px-3 py-2 flex items-center gap-4 flex-wrap">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <div
                                        className={`relative w-8 h-4 rounded-full transition-colors ${field.required ? 'bg-primary' : 'bg-input'}`}
                                        onClick={() => updateField(index, { required: !field.required })}
                                    >
                                        <div className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${field.required ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                    </div>
                                    <span className="text-xs text-muted-foreground">Required</span>
                                </label>

                                {/* supportsExpression is shown as read-only info derived from type */}
                                {field.supportsExpression && (
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <code className="px-1 py-0.5 rounded bg-muted text-[9px]">{'{{expr}}'}</code>
                                        supports dynamic expressions
                                    </span>
                                )}

                                <div className="flex items-center gap-1.5 ml-auto">
                                    <Input
                                        className="h-6 text-xs w-48 border-none bg-transparent shadow-none px-1 focus-visible:ring-0"
                                        value={field.placeholder ?? ''}
                                        onChange={e => updateField(index, { placeholder: e.target.value })}
                                        placeholder="Placeholder hint..."
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

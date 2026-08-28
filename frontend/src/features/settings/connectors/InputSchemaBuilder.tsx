import { type ConnectorInputField, type ConnectorFieldType } from '@/api/connectorApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Code2, Info } from 'lucide-react';

const FIELD_TYPE_LABELS: Record<ConnectorFieldType, string> = {
    STRING: 'String',
    TEXTAREA: 'String (Multiline)',
    NUMBER: 'Number',
    BOOLEAN: 'Boolean',
    JSON: 'JSON',
    SELECT: 'Dropdown',
};

interface InputSchemaBuilderProps {
    fields: ConnectorInputField[];
    onChange: (fields: ConnectorInputField[]) => void;
}

export default function InputSchemaBuilder({ fields = [], onChange }: InputSchemaBuilderProps) {
    const addField = () => {
        const count = fields.length + 1;
        const newField: ConnectorInputField = {
            key: `field_${count}`,
            label: '',
            type: 'STRING',
            required: false,
            supportsExpression: true,
        };
        onChange([...fields, newField]);
    };

    const updateField = (index: number, updates: Partial<ConnectorInputField>) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], ...updates };
        
        if (updates.type !== undefined) {
            newFields[index].supportsExpression = newFields[index].type !== 'BOOLEAN' && newFields[index].type !== 'SELECT';
        }
        
        onChange(newFields);
    };

    const removeField = (index: number) => {
        onChange(fields.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-3">
            {fields.length > 0 && (
                <div className="flex items-start gap-2 p-2.5 mb-2 rounded-md bg-muted/30 text-xs text-muted-foreground border border-border/50">
                    <Info className="h-4 w-4 shrink-0 text-primary" />
                    <div>
                        <p><strong>Dynamic Expressions:</strong> String and Number fields automatically support dynamic workflow expressions (e.g. <code className="px-1 py-0.5 rounded bg-muted">{'{{trigger.data}}'}</code>).</p>
                    </div>
                </div>
            )}

            {fields.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg bg-muted/10">
                    <Code2 className="h-6 w-6 mx-auto mb-2 opacity-40" />
                    No parameters defined.
                </div>
            ) : (
                <div className="space-y-1.5 border rounded-lg overflow-hidden bg-card shadow-sm">
                    {/* Header Row */}
                    <div className="grid grid-cols-[minmax(120px,2fr)_130px_minmax(120px,2fr)_40px_40px] gap-2 px-3 py-2 bg-muted/40 border-b text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <div>Field Label <span className="text-destructive">*</span></div>
                        <div>Type <span className="text-destructive">*</span></div>
                        <div>Placeholder</div>
                        <div className="text-center">Req</div>
                        <div></div>
                    </div>

                    {/* Data Rows */}
                    <div className="divide-y divide-border/50 p-1">
                        {fields.map((field, index) => (
                            <div key={index} className="grid grid-cols-[minmax(120px,2fr)_130px_minmax(120px,2fr)_40px_40px] gap-2 p-1 items-center hover:bg-muted/10 transition-colors rounded-sm">
                                <Input
                                    className="h-8 text-xs bg-transparent border-transparent hover:border-input focus-visible:ring-1"
                                    value={field.label}
                                    onChange={e => updateField(index, { label: e.target.value })}
                                    placeholder="e.g. Channel ID"
                                />

                                <Select
                                    value={field.type}
                                    onValueChange={val => updateField(index, { type: val as ConnectorFieldType })}
                                >
                                    <SelectTrigger className="h-8 text-xs bg-transparent border-transparent hover:border-input focus:ring-1">
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

                                <Input
                                    className="h-8 text-xs bg-transparent border-transparent hover:border-input focus-visible:ring-1"
                                    value={field.placeholder ?? ''}
                                    onChange={e => updateField(index, { placeholder: e.target.value })}
                                    placeholder="e.g. #general"
                                />

                                <div className="flex justify-center items-center">
                                    <div
                                        className={`relative w-6 h-3.5 rounded-full transition-colors cursor-pointer ${field.required ? 'bg-primary' : 'bg-input'}`}
                                        onClick={() => updateField(index, { required: !field.required })}
                                        title={field.required ? "Required" : "Optional"}
                                    >
                                        <div className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow transition-transform ${field.required ? 'translate-x-3' : 'translate-x-0.5'}`} />
                                    </div>
                                </div>

                                <div className="flex justify-center">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => removeField(index)}
                                        title="Remove field"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <Button variant="outline" size="sm" onClick={addField} className="h-8 w-full border-dashed">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Field
            </Button>
        </div>
    );
}

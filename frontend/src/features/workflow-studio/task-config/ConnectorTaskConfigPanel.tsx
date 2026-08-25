import { useEffect, useState } from 'react';
import { connectorApi, type ConnectorManifest } from '@/api/connectorApi';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import type { TaskParameterErrors } from '@/features/workflow-studio/task-type-schema/types';
import { VariableInput } from '@/features/workflow-studio/task-config/VariableInput';
import { ConnectionSelectField } from '@/features/workflow-studio/task-config/ConnectionSelectField';



// ─── Helpers ────────────────────────────────────────────────────────────────

function resolveIconSrc(icon?: string): string | undefined {
    if (!icon) return undefined;
    return icon.startsWith('http') ? icon : `/connectors/${icon}`;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
    parameters: Record<string, unknown>;
    onChange: (params: Record<string, unknown>) => void;
    errors: TaskParameterErrors;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ConnectorTaskConfigPanel({ parameters, onChange, errors }: Props) {
    const [manifests, setManifests] = useState<ConnectorManifest[]>([]);
    const [loading, setLoading] = useState(true);

    const connectorId = (parameters.connectorId as string) || '';
    const actionId   = (parameters.actionId   as string) || '';
    const credentialId = (parameters.credentialId as string) || '';
    const inputs = (parameters.inputs as Record<string, unknown>) || {};

    useEffect(() => {
        connectorApi.list().then(data => {
            setManifests(data);
            setLoading(false);

            // Backfill connectorIcon for nodes saved before we tracked it
            const currentConnectorId = (parameters.connectorId as string) || '';
            const hasIcon = !!parameters.connectorIcon;
            const currentActionId = (parameters.actionId as string) || '';

            if (currentConnectorId) {
                const m = data.find(x => x.connectorId === currentConnectorId);
                const updates: Record<string, unknown> = {};

                if (!hasIcon && m?.icon) {
                    const iconSrc = resolveIconSrc(m.icon);
                    if (iconSrc) updates.connectorIcon = iconSrc;
                }

                // Auto-select action: if no action chosen yet, pick the first one
                // so input fields are immediately visible without an extra click.
                if (!currentActionId && m?.actions && m.actions.length > 0) {
                    updates.actionId = m.actions[0].actionId;
                }

                if (Object.keys(updates).length > 0) {
                    onChange({ ...parameters, ...updates });
                }
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectedManifest = manifests.find(m => m.connectorId === connectorId);
    const selectedAction   = selectedManifest?.actions.find(a => a.actionId === actionId);

    const updateParam = (key: string, value: unknown) =>
        onChange({ ...parameters, [key]: value });

    const updateInput = (key: string, value: unknown) =>
        onChange({ ...parameters, inputs: { ...inputs, [key]: value } });

    // ─── Loading ─────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading integrations…
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Fallback if node created without a connectorId (shouldn't happen normally) */}
            {!selectedManifest && (
                <div className="space-y-1.5">
                    <Label>Integration</Label>
                    <Select
                        value={connectorId}
                        onValueChange={val => {
                            const m = manifests.find(x => x.connectorId === val);
                            const iconSrc = resolveIconSrc(m?.icon);
                            onChange({ ...parameters, connectorId: val, actionId: '', connectorIcon: iconSrc ?? '' });
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select an integration" />
                        </SelectTrigger>
                        <SelectContent>
                            {manifests.map(m => {
                                const src = resolveIconSrc(m.icon);
                                const initials = m.displayName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
                                return (
                                    <SelectItem key={m.connectorId} value={m.connectorId}>
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded">
                                                {src ? (
                                                    <img src={src} alt={m.displayName} className="h-4 w-4 object-contain" onError={e => { e.currentTarget.style.display = 'none'; }} />
                                                ) : (
                                                    <span className="text-[9px] font-bold text-muted-foreground">{initials}</span>
                                                )}
                                            </span>
                                            <span>{m.displayName}</span>
                                        </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* ── Action select ── */}
            {selectedManifest && (
                <div className="space-y-1.5">
                    <Label htmlFor="action-select">
                        Action <span className="text-destructive">*</span>
                    </Label>
                    <Select value={actionId} onValueChange={val => updateParam('actionId', val)}>
                        <SelectTrigger
                            id="action-select"
                            className={!actionId ? 'ring-2 ring-primary/40 border-primary/60' : ''}
                        >
                            <SelectValue placeholder="Choose what to do…" />
                        </SelectTrigger>
                        <SelectContent>
                            {selectedManifest.actions.map(a => (
                                <SelectItem key={a.actionId} value={a.actionId}>
                                    <div>
                                        <p className="font-medium text-sm">{a.displayName}</p>
                                        {a.description && (
                                            <p className="text-xs text-muted-foreground">{a.description}</p>
                                        )}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {!actionId && (
                        <p className="text-xs text-primary font-medium">
                            ↑ Select an action to configure its parameters
                        </p>
                    )}
                </div>
            )}

            {/* ── Credential ── */}
            {selectedManifest && selectedManifest.authType !== 'NONE' && (
                <ConnectionSelectField
                    id="credential-select"
                    label={
                        <Label htmlFor="credential-select">
                            Connection <span className="text-destructive">*</span>
                        </Label>
                    }
                    value={credentialId}
                    onChange={(val) => updateParam('credentialId', val)}
                    error={errors.credentialId}
                    connectorId={selectedManifest.connectorId}
                />
            )}

            {/* ── Action input fields ── */}
            {selectedAction && selectedAction.inputSchema.length > 0 && (
                <div className="space-y-4 pt-3 border-t border-border">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Parameters</p>

                    {selectedAction.inputSchema.map(field => {
                        const val = inputs[field.key] ?? field.defaultValue ?? '';
                        const hasError = !!errors[`inputs.${field.key}`];

                        // ── BOOLEAN: inline toggle, never supports expressions ──
                        if (field.type === 'BOOLEAN') {
                            return (
                                <div key={field.key} className="flex items-center justify-between rounded-lg border px-3 py-2.5 bg-muted/20">
                                    <div>
                                        <p className="text-sm font-medium">
                                            {field.label}
                                            {field.required && <span className="text-destructive ml-0.5">*</span>}
                                        </p>
                                        {field.description && (
                                            <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>
                                        )}
                                        {hasError && <p className="text-xs text-destructive mt-0.5">{errors[`inputs.${field.key}`]}</p>}
                                    </div>
                                    <div
                                        role="switch"
                                        aria-checked={!!val}
                                        tabIndex={0}
                                        className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${val ? 'bg-primary' : 'bg-input'}`}
                                        onClick={() => updateInput(field.key, !val)}
                                        onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') updateInput(field.key, !val); }}
                                    >
                                        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${val ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                    </div>
                                </div>
                            );
                        }

                        // ── SELECT: dropdown, no expression mode ──
                        const renderControl = () => {
                            if (field.type === 'SELECT') {
                                return (
                                    <Select value={val as string} onValueChange={v => updateInput(field.key, v)}>
                                        <SelectTrigger id={`field-${field.key}`}>
                                            <SelectValue placeholder={field.placeholder} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {field.options?.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                );
                            }
                            if (field.type === 'TEXTAREA' || field.type === 'JSON') {
                                return (
                                    <Textarea
                                        id={`field-${field.key}`}
                                        value={val as string}
                                        onChange={e => updateInput(field.key, e.target.value)}
                                        placeholder={field.placeholder}
                                        className={field.type === 'JSON' ? 'font-mono text-xs' : ''}
                                    />
                                );
                            }
                            return (
                                <Input
                                    id={`field-${field.key}`}
                                    type={field.type === 'NUMBER' ? 'number' : 'text'}
                                    value={val as string}
                                    onChange={e => {
                                        const raw = e.target.value;
                                        if (raw === '') { updateInput(field.key, undefined); return; }
                                        const num = Number(raw);
                                        updateInput(field.key, field.type === 'NUMBER' ? (Number.isNaN(num) ? raw : num) : raw);
                                    }}
                                    placeholder={field.placeholder}
                                />
                            );
                        };

                        // ── Expression-capable fields wrap with VariableInput ──
                        if (field.supportsExpression) {
                            return (
                                <VariableInput
                                    key={field.key}
                                    fieldKey={`field-${field.key}`}
                                    label={<>{field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}</>}
                                    value={val}
                                    onChange={v => {
                                        if (field.type === 'NUMBER') {
                                            const num = Number(v);
                                            updateInput(field.key, Number.isNaN(num) ? v : num);
                                        } else {
                                            updateInput(field.key, v);
                                        }
                                    }}
                                    placeholder={field.placeholder}
                                    error={errors[`inputs.${field.key}`]}
                                    description={field.description}
                                    multiline={field.type === 'TEXTAREA' || field.type === 'JSON'}
                                    mono={field.type === 'JSON'}
                                >
                                    {renderControl()}
                                </VariableInput>
                            );
                        }

                        // ── Plain field (SELECT — no expressions) ──
                        return (
                            <div key={field.key} className="space-y-1.5">
                                <Label htmlFor={`field-${field.key}`}>
                                    {field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}
                                </Label>
                                {renderControl()}
                                {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
                                {hasError && <p className="text-xs text-destructive">{errors[`inputs.${field.key}`]}</p>}
                            </div>
                        );
                    })}
                </div>
            )}



            {/* ── Advanced Options ── */}
            {selectedAction && (
                <div className="space-y-4 pt-3 border-t border-border">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Advanced Options</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="field-maxRetries" className="text-xs">Max Retries</Label>
                            <Input
                                id="field-maxRetries"
                                type="number"
                                min="0"
                                max="10"
                                placeholder={selectedAction?.maxRetries?.toString() || "3"}
                                value={(parameters.maxRetries as string | number) || ''}
                                onChange={e => {
                                    const val = e.target.value === '' ? undefined : Number(e.target.value);
                                    updateParam('maxRetries', val);
                                }}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="field-retryDelayMs" className="text-xs">Retry Delay (ms)</Label>
                            <Input
                                id="field-retryDelayMs"
                                type="number"
                                min="0"
                                step="100"
                                placeholder={selectedAction?.retryDelayMs?.toString() || "1000"}
                                value={(parameters.retryDelayMs as string | number) || ''}
                                onChange={e => {
                                    const val = e.target.value === '' ? undefined : Number(e.target.value);
                                    updateParam('retryDelayMs', val);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Output reference cheat-sheet ── */}
            {selectedAction?.outputPaths && selectedAction.outputPaths.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-border">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Output References</p>
                    <div className="rounded-lg bg-muted/40 border p-3 space-y-1">
                        {selectedAction.outputPaths.map(path => (
                            <code key={path} className="block text-[11px] font-mono text-muted-foreground">
                                {`{{$tasks.<task-id>.body.${path}}}`}
                            </code>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

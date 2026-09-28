import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { connectorApi, type ConnectorManifest, type ConnectorAuthType } from '@/api/connectorApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Lock, KeyRound, User, Shield, ImageIcon, Upload } from 'lucide-react';
import ActionBuilder from './ActionBuilder';
import TriggerBuilder from './TriggerBuilder';

// --- Constants ---------------------------------------------------------------

const CATEGORIES = ['Communication', 'Productivity', 'CRM', 'Developer Tools', 'Finance', 'Marketing', 'Analytics', 'Storage', 'Custom'] as const;


interface AuthTypeInfo {
    label: string;
    icon: React.ReactNode;
    hint: string;
}

const AUTH_TYPE_INFO: Record<ConnectorAuthType, AuthTypeInfo> = {
    NONE:          { label: 'No Authentication', icon: <Globe className="h-4 w-4" />,     hint: 'This API is public and requires no credentials.' },
    BEARER_TOKEN:  { label: 'API Key / Token',   icon: <KeyRound className="h-4 w-4" />,  hint: 'Authenticates using a token in the Authorization: Bearer header.' },
    API_KEY:       { label: 'API Key (Custom Header)', icon: <Lock className="h-4 w-4" />, hint: 'Authenticates using a secret key sent in a custom header.' },
    BASIC_AUTH:    { label: 'Basic Auth', icon: <User className="h-4 w-4" />,    hint: 'Authenticates using standard HTTP Basic Auth (Base64 encoded credentials).' },
    OAUTH2:        { label: 'OAuth 2.0',           icon: <Shield className="h-4 w-4" />,  hint: 'Authenticates via secure delegated OAuth 2.0 authorization.' },
    CUSTOM_HEADER: { label: 'Custom Header',       icon: <Lock className="h-4 w-4" />,    hint: 'Authenticates by injecting arbitrary custom headers into each request.' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(str: string): string {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

const EMPTY_MANIFEST: Omit<ConnectorManifest, 'scope'> = {
    connectorId: '',
    displayName: '',
    icon: '',
    category: 'Custom',
    baseUrl: '',
    authType: 'NONE',
    actions: [],
    triggers: [],
    enabled: true,
};

// ─── Component ───────────────────────────────────────────────────────────────

export interface ConnectorBuilderHeaderState {
    isSaving: boolean;
    isDirty: boolean;
    saveStatus: 'idle' | 'success' | 'error';
    saveError: string | null;
    title: string;
}

export interface ConnectorBuilderHandle {
    save: () => void;
}

interface ConnectorBuilderProps {
    scope: 'SYSTEM' | 'TENANT';
    initialData?: ConnectorManifest | null;
    onSaved: () => void;
    onHeaderStateChange?: (state: ConnectorBuilderHeaderState) => void;
}

const ConnectorBuilder = forwardRef<ConnectorBuilderHandle, ConnectorBuilderProps>(function ConnectorBuilder(
    { scope, initialData, onSaved, onHeaderStateChange },
    ref,
) {
    const [manifest, setManifest] = useState<ConnectorManifest>(
        initialData ?? { ...EMPTY_MANIFEST, scope }
    );
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [saveError, setSaveError] = useState<string | null>(null);
    const [errors, setErrors] = useState<Partial<Record<keyof ConnectorManifest, string>>>({});
    const [isDirty, setIsDirty] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            handleChange('icon', reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const isEditing = !!initialData;
    const pageTitle = manifest.displayName.trim() || (isEditing ? manifest.displayName : 'New Connector');

    useEffect(() => {
        onHeaderStateChange?.({
            isSaving,
            isDirty,
            saveStatus,
            saveError,
            title: pageTitle,
        });
    }, [isSaving, isDirty, saveStatus, saveError, pageTitle, onHeaderStateChange]);

    const handleChange = <K extends keyof ConnectorManifest>(field: K, value: ConnectorManifest[K]) => {
        setManifest(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    };

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof ConnectorManifest, string>> = {};
        if (!manifest.displayName.trim()) newErrors.displayName = 'Name is required.';
        if (!manifest.baseUrl.trim()) newErrors.baseUrl = 'Base URL is required.';
        if (!manifest.baseUrl.startsWith('http')) newErrors.baseUrl = 'Must be a valid URL starting with http:// or https://';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = useCallback(async () => {
        if (!validate()) return;
        setIsSaving(true);
        setSaveStatus('idle');
        setSaveError(null);
        try {
            const payload = { ...manifest };
            if (!isEditing && !payload.connectorId) {
                payload.connectorId = slugify(payload.displayName);
            }

            if (payload.actions) {
                payload.actions = payload.actions.map((a, idx) => {
                    const actionId = a.actionId || slugify(a.displayName) || `action_${idx + 1}`;

                    const inputSchema = (a.inputSchema || []).map((f, fIdx) => ({
                        ...f,
                        key: f.key || slugify(f.label) || `field_${fIdx + 1}`,
                    }));

                    return {
                        ...a,
                        actionId,
                        inputSchema,
                    };
                });
            }

            if (payload.triggers) {
                payload.triggers = payload.triggers.map((t, idx) => {
                    const triggerId = t.triggerId || slugify(t.displayName) || `trigger_${idx + 1}`;
                    const inputSchema = (t.inputSchema || []).map((f, fIdx) => ({
                        ...f,
                        key: f.key || slugify(f.label) || `field_${fIdx + 1}`,
                    }));

                    const preset = t.preset
                        ? {
                            ...t.preset,
                            webhook: t.preset.webhook
                                ? { ...t.preset.webhook, deliveryMode: 'SUBSCRIBE' as const }
                                : undefined,
                        }
                        : undefined;

                    return {
                        ...t,
                        triggerId,
                        inputSchema,
                        preset,
                    };
                });
            }

            const effectiveScope = manifest.scope || scope;

            if (effectiveScope === 'SYSTEM') {
                if (isEditing) {
                    await connectorApi.adminUpdate(payload.connectorId, payload);
                } else {
                    await connectorApi.adminCreate(payload);
                }
            } else if (isEditing) {
                await connectorApi.update(payload.connectorId, payload);
            } else {
                await connectorApi.create(payload);
            }
            setManifest(payload);
            setSaveStatus('success');
            setIsDirty(false);
            setTimeout(() => onSaved(), 800);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred. Please try again.';
            setSaveStatus('error');
            setSaveError(message);
        } finally {
            setIsSaving(false);
        }
    }, [isEditing, manifest, onSaved, scope]);

    useImperativeHandle(ref, () => ({ save: handleSave }), [handleSave]);

    const authInfo = AUTH_TYPE_INFO[manifest.authType];

    return (
        <div className="space-y-8 pb-16">
            {/* Section 1: Identity */}
            <section className="space-y-5">
                <div className="border-b pb-2">
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">General Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Display Name → auto-generates connectorId */}
                    <div className="space-y-1.5">
                        <Label htmlFor="displayName">Name <span className="text-destructive">*</span></Label>
                        <Input
                            id="displayName"
                            value={manifest.displayName}
                            onChange={e => handleChange('displayName', e.target.value)}
                            placeholder="e.g. My Internal CRM"
                        />
                        {errors.displayName && (
                            <p className="text-xs text-destructive">{errors.displayName}</p>
                        )}
                    </div>

                    {/* Category */}
                    <div className="space-y-1.5">
                        <Label htmlFor="category">Category</Label>
                        <Select
                            value={manifest.category ?? 'Custom'}
                            onValueChange={val => handleChange('category', val)}
                        >
                            <SelectTrigger id="category">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Icon URL + live preview */}
                    <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="icon">Icon URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-muted overflow-hidden">
                                {(manifest.icon?.startsWith('http') || manifest.icon?.startsWith('data:image/')) ? (
                                    <img
                                        src={manifest.icon}
                                        alt=""
                                        className="h-6 w-6 object-contain"
                                        onError={e => (e.currentTarget.style.display = 'none')}
                                    />
                                ) : (
                                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                )}
                            </div>
                            <div className="flex w-full gap-2">
                                <Input
                                    id="icon"
                                    value={manifest.icon ?? ''}
                                    onChange={e => handleChange('icon', e.target.value)}
                                    placeholder="https://cdn.simpleicons.org/slack/E01E5A"
                                    className="font-mono text-sm flex-1"
                                />
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                                <Button variant="outline" type="button" onClick={() => fileInputRef.current?.click()} title="Upload Icon">
                                    <Upload className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Provide a public URL or upload a custom logo to identify this integration.
                        </p>
                    </div>

                </div>
            </section>

            {/* Section 2: Connection */}
            <section className="space-y-5">
                <div className="border-b pb-2">
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Base Configuration</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Base URL */}
                    <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="baseUrl">Base URL <span className="text-destructive">*</span></Label>
                        <Input
                            id="baseUrl"
                            value={manifest.baseUrl}
                            onChange={e => handleChange('baseUrl', e.target.value)}
                            placeholder="https://api.example.com/v1"
                            className="font-mono"
                        />
                        {errors.baseUrl && <p className="text-xs text-destructive">{errors.baseUrl}</p>}
                        <p className="text-xs text-muted-foreground">
                            All action paths are relative to this URL. Do not include a trailing slash.
                        </p>
                    </div>

                    {/* Auth type */}
                    <div className="space-y-1.5">
                        <Label htmlFor="authType">Authentication <span className="text-destructive">*</span></Label>
                        <Select
                            value={manifest.authType}
                            onValueChange={val => handleChange('authType', val as ConnectorAuthType)}
                        >
                            <SelectTrigger id="authType">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(Object.keys(AUTH_TYPE_INFO) as ConnectorAuthType[]).map(type => (
                                    <SelectItem key={type} value={type}>
                                        <span className="flex items-center gap-2">
                                            {AUTH_TYPE_INFO[type].label}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Auth type specific field */}
                    {manifest.authType === 'API_KEY' && (
                        <div className="space-y-1.5">
                            <Label htmlFor="authHeaderName">Header Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
                            <Input
                                id="authHeaderName"
                                value={manifest.authHeaderName ?? ''}
                                onChange={e => handleChange('authHeaderName', e.target.value)}
                                placeholder="e.g. X-Api-Key"
                                className="font-mono"
                            />
                        </div>
                    )}

                    {/* Auth type contextual hint */}
                    <div className={`flex items-start gap-3 p-3 rounded-lg bg-muted/40 border text-sm ${manifest.authType === 'API_KEY' ? '' : 'md:col-span-2'}`}>
                        <span className="shrink-0 text-muted-foreground mt-0.5">{authInfo.icon}</span>
                        <p className="text-muted-foreground text-xs leading-relaxed">{authInfo.hint}</p>
                    </div>
                </div>
            </section>

            {/* Section 3: Triggers */}
            <section className="space-y-5">
                <div className="border-b pb-2">
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Triggers</h3>
                </div>
                <TriggerBuilder
                    triggers={manifest.triggers ?? []}
                    onChange={triggers => handleChange('triggers', triggers)}
                />
            </section>

            {/* Section 4: Actions */}
            <section className="space-y-5">
                <div className="border-b pb-2">
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Actions</h3>
                </div>
                <ActionBuilder
                    actions={manifest.actions}
                    onChange={actions => handleChange('actions', actions)}
                />
            </section>
        </div>
    );
});

export default ConnectorBuilder;











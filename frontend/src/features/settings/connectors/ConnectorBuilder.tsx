import { useState, useRef } from 'react';
import { connectorApi, type ConnectorManifest, type ConnectorAuthType } from '@/api/connectorApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, ArrowLeft, Loader2, Globe, Lock, KeyRound, User, Shield, AlertCircle, CheckCircle2, ImageIcon, Upload } from 'lucide-react';
import ActionBuilder from './ActionBuilder';

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
    enabled: true,
};

// ─── Component ───────────────────────────────────────────────────────────────

interface ConnectorBuilderProps {
    scope: 'SYSTEM' | 'TENANT';
    initialData?: ConnectorManifest | null;
    onBack: () => void;
}

export default function ConnectorBuilder({ scope, initialData, onBack }: ConnectorBuilderProps) {
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

    const handleSave = async () => {
        if (!validate()) return;
        setIsSaving(true);
        setSaveStatus('idle');
        setSaveError(null);
        try {
            const payload = { ...manifest };
            if (!isEditing && !payload.connectorId) {
                payload.connectorId = slugify(payload.displayName);
            }

            // Ensure all actions have an actionId silently generated
            if (payload.actions) {
                payload.actions = payload.actions.map((a, idx) => {
                    const actionId = a.actionId || slugify(a.displayName) || `action_${idx + 1}`;
                    
                    // Also ensure all input schema fields have keys
                    const inputSchema = (a.inputSchema || []).map((f, fIdx) => ({
                        ...f,
                        key: f.key || slugify(f.label) || `field_${fIdx + 1}`
                    }));

                    return {
                        ...a,
                        actionId,
                        inputSchema
                    };
                });
            }
            
            // Route to admin API if the connector is a SYSTEM connector
            const effectiveScope = manifest.scope || scope;
            
            if (effectiveScope === 'SYSTEM') {
                isEditing
                    ? await connectorApi.adminUpdate(payload.connectorId, payload)
                    : await connectorApi.adminCreate(payload);
            } else {
                isEditing
                    ? await connectorApi.update(payload.connectorId, payload)
                    : await connectorApi.create(payload);
            }
            setManifest(payload); // update local state with generated ID
            setSaveStatus('success');
            setIsDirty(false);
            setTimeout(() => onBack(), 800);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred. Please try again.';
            setSaveStatus('error');
            setSaveError(message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleBack = () => {
        if (isDirty && !confirm('You have unsaved changes. Leave without saving?')) return;
        onBack();
    };

    const authInfo = AUTH_TYPE_INFO[manifest.authType];

    return (
        <div className="space-y-8 pb-16">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Back">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight">
                            {isEditing ? manifest.displayName : 'New Connector'}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {isEditing
                                ? `Editing system integration • ${manifest.actions?.length || 0} action${(manifest.actions?.length || 0) !== 1 ? 's' : ''}`
                                : 'Define a new API integration and its callable actions.'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {saveStatus === 'success' && (
                        <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" /> Saved
                        </span>
                    )}
                    <Button onClick={handleSave} disabled={isSaving} className="gap-2 min-w-[120px]">
                        {isSaving
                            ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                            : <><Save className="h-4 w-4" /> Save</>}
                    </Button>
                </div>
            </div>

            {/* Save error banner */}
            {saveStatus === 'error' && saveError && (
                <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-medium">Failed to save connector</p>
                        <p className="text-xs mt-0.5 opacity-80">{saveError}</p>
                    </div>
                </div>
            )}

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

            {/* Section 3: Actions */}
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
}











import { useEffect, useRef, useState } from 'react';
import { ImageIcon, Loader2, Upload } from 'lucide-react';
import {
    connectorApi,
    type ConnectorAuthType,
    type ConnectorManifest,
} from '@/api/connectorApi';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CONNECTOR_CATEGORIES, slugifyConnectorId } from './connectorFormShared';

const AUTH_TYPE_LABELS: Record<ConnectorAuthType, string> = {
    NONE: 'No Authentication',
    BEARER_TOKEN: 'API Key / Token',
    API_KEY: 'API Key (Custom Header)',
    BASIC_AUTH: 'Basic Auth',
    OAUTH2: 'OAuth 2.0',
    CUSTOM_HEADER: 'Custom Header',
};

type GeneralFormState = Pick<
    ConnectorManifest,
    'displayName' | 'category' | 'icon' | 'baseUrl' | 'authType' | 'authHeaderName'
>;

export interface EditConnectorGeneralDialogProps {
    open: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    scope: 'SYSTEM' | 'TENANT';
    connector: ConnectorManifest | null;
    onSaved: (connector: ConnectorManifest) => void;
}

function toFormState(connector: ConnectorManifest | null): GeneralFormState {
    return {
        displayName: connector?.displayName ?? '',
        category: connector?.category ?? 'Custom',
        icon: connector?.icon ?? '',
        baseUrl: connector?.baseUrl ?? '',
        authType: connector?.authType ?? 'NONE',
        authHeaderName: connector?.authHeaderName,
    };
}

export function EditConnectorGeneralDialog({
    open,
    onClose,
    mode,
    scope,
    connector,
    onSaved,
}: EditConnectorGeneralDialogProps) {
    const [form, setForm] = useState<GeneralFormState>(() => toFormState(connector));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof GeneralFormState, string>>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setForm(toFormState(connector));
            setError(null);
            setFieldErrors({});
        }
    }, [open, connector]);

    const setField = <K extends keyof GeneralFormState>(key: K, value: GeneralFormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        if (fieldErrors[key]) {
            setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setField('icon', reader.result as string);
        reader.readAsDataURL(file);
    };

    const validate = (): boolean => {
        const next: Partial<Record<keyof GeneralFormState, string>> = {};
        if (!form.displayName.trim()) next.displayName = 'Name is required.';
        if (!form.baseUrl.trim()) next.baseUrl = 'Base URL is required.';
        else if (!form.baseUrl.startsWith('http')) {
            next.baseUrl = 'Must start with http:// or https://';
        }
        setFieldErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        setError(null);
        try {
            if (mode === 'create') {
                const connectorId = slugifyConnectorId(form.displayName);
                const payload: ConnectorManifest = {
                    connectorId,
                    displayName: form.displayName.trim(),
                    category: form.category,
                    icon: form.icon,
                    baseUrl: form.baseUrl.trim(),
                    authType: form.authType,
                    authHeaderName: form.authHeaderName,
                    scope,
                    actions: [],
                    triggers: [],
                    enabled: true,
                };
                if (scope === 'SYSTEM') {
                    await connectorApi.adminCreate(payload);
                } else {
                    await connectorApi.create(payload);
                }
                onSaved(payload);
                onClose();
                return;
            }

            if (!connector) {
                setError('App data is missing.');
                return;
            }

            const payload: ConnectorManifest = {
                ...connector,
                displayName: form.displayName.trim(),
                category: form.category,
                icon: form.icon,
                baseUrl: form.baseUrl.trim(),
                authType: form.authType,
                authHeaderName: form.authHeaderName,
            };

            if (scope === 'SYSTEM') {
                await connectorApi.adminUpdate(payload.connectorId, payload);
            } else {
                await connectorApi.update(payload.connectorId, payload);
            }
            onSaved(payload);
            onClose();
        } catch {
            setError(mode === 'create' ? 'Failed to create app.' : 'Failed to update app details.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-6">
                <DialogHeader>
                    <DialogTitle>{mode === 'create' ? 'New app' : 'Edit general information'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 pt-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="edit-displayName">Name <span className="text-destructive">*</span></Label>
                        <Input
                            id="edit-displayName"
                            value={form.displayName}
                            onChange={(e) => setField('displayName', e.target.value)}
                            placeholder="e.g. My Internal CRM"
                        />
                        {fieldErrors.displayName ? (
                            <p className="text-xs text-destructive">{fieldErrors.displayName}</p>
                        ) : null}
                        {mode === 'create' && form.displayName.trim() ? (
                            <p className="text-xs text-muted-foreground font-mono">
                                id: {slugifyConnectorId(form.displayName)}
                            </p>
                        ) : null}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="edit-category">Category</Label>
                        <Select value={form.category ?? 'Custom'} onValueChange={(val) => setField('category', val)}>
                            <SelectTrigger id="edit-category">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CONNECTOR_CATEGORIES.map((c) => (
                                    <SelectItem key={c} value={c}>
                                        {c}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="edit-icon">Icon URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-muted overflow-hidden">
                                {form.icon?.startsWith('http') || form.icon?.startsWith('data:image/') ? (
                                    <img src={form.icon} alt="" className="h-6 w-6 object-contain" />
                                ) : (
                                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                )}
                            </div>
                            <div className="flex w-full gap-2">
                                <Input
                                    id="edit-icon"
                                    value={form.icon ?? ''}
                                    onChange={(e) => setField('icon', e.target.value)}
                                    placeholder="https://cdn.simpleicons.org/slack/E01E5A"
                                    className="font-mono text-sm flex-1"
                                />
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                />
                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Upload icon"
                                >
                                    <Upload className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="edit-baseUrl">Base URL <span className="text-destructive">*</span></Label>
                        <Input
                            id="edit-baseUrl"
                            value={form.baseUrl}
                            onChange={(e) => setField('baseUrl', e.target.value)}
                            placeholder="https://api.example.com/v1"
                            className="font-mono"
                        />
                        {fieldErrors.baseUrl ? (
                            <p className="text-xs text-destructive">{fieldErrors.baseUrl}</p>
                        ) : null}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="edit-authType">Authentication</Label>
                        <Select
                            value={form.authType}
                            onValueChange={(val) => setField('authType', val as ConnectorAuthType)}
                        >
                            <SelectTrigger id="edit-authType">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(Object.keys(AUTH_TYPE_LABELS) as ConnectorAuthType[]).map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {AUTH_TYPE_LABELS[type]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {form.authType === 'API_KEY' ? (
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-authHeaderName">Header name (optional)</Label>
                            <Input
                                id="edit-authHeaderName"
                                value={form.authHeaderName ?? ''}
                                onChange={(e) => setField('authHeaderName', e.target.value)}
                                placeholder="e.g. X-Api-Key"
                                className="font-mono"
                            />
                        </div>
                    ) : null}

                    {error ? <p className="text-sm text-destructive">{error}</p> : null}

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : mode === 'create' ? (
                                'Create app'
                            ) : (
                                'Save changes'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

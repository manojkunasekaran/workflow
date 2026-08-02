import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { Loader2 } from 'lucide-react';
import type { IntegrationCredential } from '@/types/api';

interface CredentialDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    credential?: IntegrationCredential;
    onSave: (credential: IntegrationCredential) => Promise<void>;
}

export function CredentialDialog({ open, onOpenChange, credential, onSave }: CredentialDialogProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [name, setName] = useState('');
    const [type, setType] = useState('BEARER_TOKEN');
    const [credentials, setCredentials] = useState<Record<string, string>>({});

    useEffect(() => {
        if (open) {
            setName(credential?.name ?? '');
            setType(credential?.type ?? 'BEARER_TOKEN');
            setCredentials(credential?.credentials ?? {});
        }
    }, [open, credential]);

    const handleSave = async () => {
        if (!name.trim()) return;
        setIsSaving(true);
        try {
            await onSave({
                id: credential?.id,
                name,
                type,
                credentials,
            });
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save credential', error);
        } finally {
            setIsSaving(false);
        }
    };

    const updateCred = (key: string, value: string) => {
        setCredentials((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[625px] px-4 py-2">
                <DialogHeader className="p-2">
                    <DialogTitle>{credential ? 'Edit Credential' : 'Add Credential'}</DialogTitle>
                    <DialogDescription>
                        {credential
                            ? 'Update your integration credentials. Masked fields (********) will remain unchanged unless edited.'
                            : 'Add a new credential to use securely in your workflows.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4 overflow-y-auto px-2">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Credential Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Production Mail Server"
                        />
                    </div>

                    {!credential && (
                        <div className="grid gap-2">
                            <Label htmlFor="type">Type</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger id="type">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SMTP">SMTP Server</SelectItem>
                                    <SelectItem value="BEARER_TOKEN">Bearer Token</SelectItem>
                                    <SelectItem value="BASIC_AUTH">Basic Auth</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {type === 'SMTP' && (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="host">SMTP Host</Label>
                                <Input
                                    id="host"
                                    value={credentials.host || ''}
                                    onChange={(e) => updateCred('host', e.target.value)}
                                    placeholder="smtp.example.com"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="port">Port</Label>
                                    <Input
                                        id="port"
                                        type="number"
                                        value={credentials.port || ''}
                                        onChange={(e) => updateCred('port', e.target.value)}
                                        placeholder="587"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="security">Security</Label>
                                    <Select
                                        value={credentials.security || 'STARTTLS'}
                                        onValueChange={(val) => updateCred('security', val)}
                                    >
                                        <SelectTrigger id="security">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="NONE">None</SelectItem>
                                            <SelectItem value="STARTTLS">STARTTLS</SelectItem>
                                            <SelectItem value="SSL">SSL/TLS</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    value={credentials.username || ''}
                                    onChange={(e) => updateCred('username', e.target.value)}
                                    placeholder="user@example.com"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={credentials.password || ''}
                                    onChange={(e) => updateCred('password', e.target.value)}
                                    placeholder="********"
                                />
                            </div>
                        </>
                    )}

                    {type === 'BEARER_TOKEN' && (
                        <div className="grid gap-2">
                            <Label htmlFor="token">Token</Label>
                            <Input
                                id="token"
                                type="password"
                                value={credentials.token || ''}
                                onChange={(e) => updateCred('token', e.target.value)}
                                placeholder="********"
                            />
                        </div>
                    )}

                    {type === 'BASIC_AUTH' && (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="basic-username">Username</Label>
                                <Input
                                    id="basic-username"
                                    value={credentials.username || ''}
                                    onChange={(e) => updateCred('username', e.target.value)}
                                    placeholder="api_user"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="basic-password">Password</Label>
                                <Input
                                    id="basic-password"
                                    type="password"
                                    value={credentials.password || ''}
                                    onChange={(e) => updateCred('password', e.target.value)}
                                    placeholder="********"
                                />
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Credential
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

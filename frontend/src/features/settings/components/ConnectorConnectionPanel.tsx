import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { connectorApi, type ConnectorManifest, type ConnectionSetupField } from '@/api/connectorApi';
import type { IntegrationCredential } from '@/types/api';
import { ShieldCheck, ExternalLink, Loader2, Search, ArrowLeft, Blocks, KeyRound, UserRound, Mail } from 'lucide-react';

interface ConnectorConnectionPanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    credential?: IntegrationCredential;
    onSave: (cred: IntegrationCredential) => Promise<void>;
    preselectedConnectorId?: string;
}

const CUSTOM_AUTH_OPTIONS = [
    { id: 'BEARER_TOKEN', name: 'Bearer Token', description: 'Raw API Key or Bearer Token', icon: KeyRound },
    { id: 'BASIC_AUTH', name: 'Basic Auth', description: 'Username and password pair', icon: UserRound },
    { id: 'SMTP', name: 'SMTP Server', description: 'Email server credentials', icon: Mail },
];

export function ConnectorConnectionPanel({ open, onOpenChange, credential, onSave, preselectedConnectorId }: ConnectorConnectionPanelProps) {
    const [connectors, setConnectors] = useState<ConnectorManifest[]>([]);
    
    // Auth selection state
    const [selectedConnectorId, setSelectedConnectorId] = useState<string>('');
    const [selectedGenericAuth, setSelectedGenericAuth] = useState<'SMTP' | 'BEARER_TOKEN' | 'BASIC_AUTH' | null>(null);
    
    // Form state
    const [name, setName] = useState('');
    const [fields, setFields] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [credentialScope, setCredentialScope] = useState<'PERSONAL' | 'ORG_SHARED'>('PERSONAL');

    // App Directory state
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'integrations' | 'custom'>('integrations');

    // OAuth Custom Fields
    const [oauthMode, setOauthMode] = useState<'MANAGED' | 'CUSTOM'>('MANAGED');
    const [customClientId, setCustomClientId] = useState('');
    const [customClientSecret, setCustomClientSecret] = useState('');
    const [customScopes, setCustomScopes] = useState('');
    const [allowedDomains, setAllowedDomains] = useState('');

    useEffect(() => {
        if (open) {
            loadConnectors();
            setSearchQuery('');
            setActiveTab('integrations');
            
            if (credential) {
                if (credential.connectorId) {
                    setSelectedConnectorId(credential.connectorId);
                    setSelectedGenericAuth(null);
                } else {
                    setSelectedGenericAuth(credential.type as any);
                    setSelectedConnectorId('');
                }
                setName(credential.name);
                setCredentialScope((credential.credentialScope as any) || 'PERSONAL');
                setFields({}); // we don't load secrets back for editing securely
                setOauthMode('MANAGED');
                setCustomClientId('');
                setCustomClientSecret('');
                setCustomScopes('');
                setAllowedDomains('');
            } else {
                setSelectedConnectorId(preselectedConnectorId || '');
                setSelectedGenericAuth(null);
                setName('');
                setFields({});
                setCredentialScope('PERSONAL');
            }
        }
    }, [open, credential, preselectedConnectorId]);

    const loadConnectors = async () => {
        try {
            const res = await connectorApi.list();
            setConnectors(res);
        } catch (error) {
            console.error('Failed to load connectors', error);
        }
    };

    const selectedConnector = selectedConnectorId ? connectors.find(c => c.connectorId === selectedConnectorId) : null;
    
    useEffect(() => {
        if (selectedConnector?.authType === 'OAUTH2') {
            setCustomScopes(selectedConnector.oauth2Config?.defaultScopes?.join(' ') || '');
        }
    }, [selectedConnectorId, connectors]);

    const genericAuthOption = CUSTOM_AUTH_OPTIONS.find(o => o.id === selectedGenericAuth);
    
    const isSelectorMode = !selectedConnectorId && !selectedGenericAuth && !credential && !preselectedConnectorId;

    const filteredConnectors = connectors.filter(c => c.displayName.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredCustom = CUSTOM_AUTH_OPTIONS.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (selectedConnector) {
                await onSave({
                    id: credential?.id,
                    name: name || selectedConnector.displayName + ' Credential',
                    type: selectedConnector.authType,
                    connectorId: selectedConnector.connectorId,
                    credentialScope: credentialScope,
                    credentials: fields,
                });
            } else if (selectedGenericAuth) {
                const genericName = genericAuthOption?.name || 'Custom';
                await onSave({
                    id: credential?.id,
                    name: name || genericName + ' Credential',
                    type: selectedGenericAuth,
                    connectorId: '',
                    credentialScope: credentialScope,
                    credentials: fields,
                });
            }
            onOpenChange(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleOAuthConnect = async () => {
        if (!selectedConnector) return;

        let url = '/api/v1/oauth/' + selectedConnector.connectorId + '/authorize';
        if (oauthMode === 'CUSTOM') {
            const params = new URLSearchParams();
            if (customClientId) params.append('clientId', customClientId);
            if (customClientSecret) params.append('clientSecret', customClientSecret);
            if (customScopes) params.append('scopes', customScopes);
            if (allowedDomains) params.append('allowedDomains', allowedDomains);
            url += '?' + params.toString();
        }

        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        window.open(
            url,
            'oauth_popup',
            'width=' + width + ',height=' + height + ',top=' + top + ',left=' + left
        );

        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'OAUTH_SUCCESS') {
                window.removeEventListener('message', handleMessage);
                onOpenChange(false);
            }
        };
        window.addEventListener('message', handleMessage);
    };

    const getDialogDescription = () => {
        if (isSelectorMode) {
            return 'Select an application or authentication type from the directory below.';
        }
        if (selectedConnector) {
            return selectedConnector.connectionSetup?.description || `Authenticate your ${selectedConnector.displayName} account to securely use it in your workflows.`;
        }
        if (genericAuthOption) {
            return `Provide the credentials for your ${genericAuthOption.name}.`;
        }
        return 'Loading configuration...';
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={`p-0 transition-all duration-300 ${isSelectorMode ? 'sm:max-w-[700px]' : 'sm:max-w-[500px]'}`}>
                <DialogHeader className={`px-6 pt-6 ${isSelectorMode ? 'pb-4' : 'pb-2'}`}>
                    <DialogTitle className="flex items-center gap-2">
                        {(selectedConnectorId || selectedGenericAuth) && !preselectedConnectorId && !credential && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 -ml-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full" onClick={() => {
                                setSelectedConnectorId('');
                                setSelectedGenericAuth(null);
                            }}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        {credential ? 'Edit Credential' : 'Add Credential'}
                    </DialogTitle>
                    <DialogDescription>
                        {getDialogDescription()}
                    </DialogDescription>
                </DialogHeader>

                {isSelectorMode ? (
                    <div className="flex flex-col h-[450px]">
                        {/* Directory Header Tabs & Search */}
                        <div className="px-6 pb-0 border-b flex flex-col gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search integrations or auth types..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9 bg-muted/30 border-muted"
                                />
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                                <button 
                                    className={`pb-3 border-b-2 transition-colors font-medium ${activeTab === 'integrations' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                    onClick={() => setActiveTab('integrations')}
                                >
                                    Integrations
                                </button>
                                <button 
                                    className={`pb-3 border-b-2 transition-colors font-medium ${activeTab === 'custom' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                    onClick={() => setActiveTab('custom')}
                                >
                                    Custom Auth
                                </button>
                            </div>
                        </div>
                        
                        {/* Directory Grid */}
                        <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
                            {activeTab === 'integrations' ? (
                                filteredConnectors.length === 0 ? (
                                    <div className="text-center py-16 flex flex-col items-center">
                                        <Blocks className="h-10 w-10 text-muted-foreground/30 mb-3" />
                                        <p className="text-sm text-muted-foreground">No integrations found.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-4">
                                        {filteredConnectors.map(c => (
                                            <div 
                                                key={c.connectorId}
                                                className="flex flex-col items-center gap-3 p-5 border rounded-xl bg-card hover:border-primary/50 hover:shadow-md cursor-pointer transition-all group"
                                                onClick={() => setSelectedConnectorId(c.connectorId)}
                                            >
                                                <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-background group-hover:scale-110 transition-transform overflow-hidden shadow-sm p-1">
                                                    <img src={c.icon} className="h-7 w-7 object-contain" alt="" />
                                                </div>
                                                <div className="text-center w-full">
                                                    <div className="text-sm font-medium truncate w-full" title={c.displayName}>{c.displayName}</div>
                                                    <div className="text-[10px] text-muted-foreground mt-1 truncate">{c.category || 'App'}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                filteredCustom.length === 0 ? (
                                    <div className="text-center py-16 flex flex-col items-center">
                                        <KeyRound className="h-10 w-10 text-muted-foreground/30 mb-3" />
                                        <p className="text-sm text-muted-foreground">No custom auth methods found.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        {filteredCustom.map(c => (
                                            <div 
                                                key={c.id}
                                                className="flex items-center gap-4 p-4 border rounded-xl bg-card hover:border-primary/50 hover:shadow-md cursor-pointer transition-all group"
                                                onClick={() => setSelectedGenericAuth(c.id as any)}
                                            >
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground group-hover:text-primary transition-colors">
                                                    <c.icon className="h-5 w-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="text-sm font-medium">{c.name}</div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">{c.description}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5 px-6 pb-6 pt-2 max-h-[65vh] overflow-y-auto">
                        {/* Config Form Mode */}
                        {(selectedConnector || selectedGenericAuth) ? (
                            <>
                                <div className="space-y-1.5">
                                    <Label>Credential Name</Label>
                                    <Input
                                        placeholder={`${selectedConnector?.displayName || genericAuthOption?.name} Credential`}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>

                                {/* TODO: Scope field hidden for now. To be handled with multi-tenancy support. Defaults to PERSONAL. */}

                                {/* OAUTH2 FORM */}
                                {selectedConnector && selectedConnector.authType === 'OAUTH2' && (
                                    <div className="space-y-4 pt-4 border-t">
                                        <div className="space-y-1.5">
                                            <Label>Setup credential</Label>
                                            <Select value={oauthMode} onValueChange={(val: 'MANAGED'|'CUSTOM') => setOauthMode(val)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="MANAGED">Managed OAuth2 (recommended)</SelectItem>
                                                    <SelectItem value="CUSTOM">Custom OAuth2 (Bring your own app)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        
                                        {oauthMode === 'CUSTOM' && (
                                            <div className="space-y-4 mt-4 p-4 border rounded-md bg-muted/20">
                                                <div className="space-y-1.5">
                                                    <Label>OAuth Redirect URL (Copy this to your App)</Label>
                                                    <div className="flex">
                                                        <Input 
                                                            readOnly 
                                                            value={window.location.origin + '/rest/oauth/callback'} 
                                                            className="bg-muted text-muted-foreground"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label>Client ID</Label>
                                                    <Input value={customClientId} onChange={e => setCustomClientId(e.target.value)} placeholder="e.g., 12345.apps.googleusercontent.com" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label>Client Secret</Label>
                                                    <Input type="password" value={customClientSecret} onChange={e => setCustomClientSecret(e.target.value)} placeholder="********" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label>Custom Scopes</Label>
                                                    <Input value={customScopes} onChange={e => setCustomScopes(e.target.value)} placeholder="email profile" />
                                                    <p className="text-xs text-muted-foreground">Space or comma separated list of OAuth scopes.</p>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label>Allowed HTTP Request Domains</Label>
                                                    <Input value={allowedDomains} onChange={e => setAllowedDomains(e.target.value)} placeholder="All" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* CONNECTOR FORM */}
                                {selectedConnector && selectedConnector.authType !== 'OAUTH2' && (
                                    <div className="space-y-4 pt-4 border-t">
                                        {selectedConnector.connectionSetup?.fields?.map((field: ConnectionSetupField) => (
                                            <div key={field.key} className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <Label>{field.label}</Label>
                                                    {field.docUrl && (
                                                        <a href={field.docUrl} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center hover:underline">
                                                            Where to find this <ExternalLink className="h-3 w-3 ml-1" />
                                                        </a>
                                                    )}
                                                </div>
                                                <Input
                                                    type={field.sensitive ? 'password' : 'text'}
                                                    placeholder={field.placeholder || ''}
                                                    value={fields[field.key] || ''}
                                                    onChange={(e) => setFields({ ...fields, [field.key]: e.target.value })}
                                                />
                                                {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {/* GENERIC FORMS */}
                                {selectedGenericAuth === 'BEARER_TOKEN' && (
                                    <div className="space-y-4 pt-4 border-t">
                                        <div className="space-y-1.5">
                                            <Label>Token</Label>
                                            <Input type="password" value={fields.token || ''} onChange={(e) => setFields({ ...fields, token: e.target.value })} placeholder="********" />
                                        </div>
                                    </div>
                                )}
                                
                                {selectedGenericAuth === 'BASIC_AUTH' && (
                                    <div className="space-y-4 pt-4 border-t">
                                        <div className="space-y-1.5">
                                            <Label>Username</Label>
                                            <Input value={fields.username || ''} onChange={(e) => setFields({ ...fields, username: e.target.value })} placeholder="api_user" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Password</Label>
                                            <Input type="password" value={fields.password || ''} onChange={(e) => setFields({ ...fields, password: e.target.value })} placeholder="********" />
                                        </div>
                                    </div>
                                )}
                                
                                {selectedGenericAuth === 'SMTP' && (
                                    <div className="space-y-4 pt-4 border-t">
                                        <div className="space-y-1.5">
                                            <Label>SMTP Host</Label>
                                            <Input value={fields.host || ''} onChange={(e) => setFields({ ...fields, host: e.target.value })} placeholder="smtp.example.com" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label>Port</Label>
                                                <Input type="number" value={fields.port || ''} onChange={(e) => setFields({ ...fields, port: e.target.value })} placeholder="587" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label>Security</Label>
                                                <Select value={fields.secure || 'NONE'} onValueChange={v => setFields({ ...fields, secure: v })}>
                                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="NONE">None</SelectItem>
                                                        <SelectItem value="STARTTLS">STARTTLS</SelectItem>
                                                        <SelectItem value="SSL">SSL/TLS</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label>Username</Label>
                                                <Input value={fields.username || ''} onChange={(e) => setFields({ ...fields, username: e.target.value })} placeholder="user@example.com" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label>Password</Label>
                                                <Input type="password" value={fields.password || ''} onChange={(e) => setFields({ ...fields, password: e.target.value })} placeholder="********" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex justify-center items-center h-48">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/30" />
                            </div>
                        )}
                    </div>
                )}

                {/* Hide footer completely in grid mode */}
                {!isSelectorMode && (
                    <DialogFooter className="px-6 py-4 border-t bg-muted/10 sm:justify-between">
                        <div className="flex items-center text-xs text-muted-foreground">
                            <ShieldCheck className="h-4 w-4 mr-1.5 text-emerald-500" />
                            Credentials securely encrypted
                        </div>
                        {(selectedConnector || selectedGenericAuth) ? (
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                                {selectedConnector?.authType === 'OAUTH2' ? (
                                    <Button onClick={handleOAuthConnect} className="gap-2">
                                        <img src={selectedConnector.icon} alt="" className="w-4 h-4 bg-primary-foreground rounded-sm p-[1px]" />
                                        {selectedConnector.connectionSetup?.buttonLabel || `Sign in with ${selectedConnector.displayName}`}
                                    </Button>
                                ) : (
                                    <Button onClick={handleSave} disabled={isSaving}>
                                        {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</> : 'Save Credential'}
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        )}
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}

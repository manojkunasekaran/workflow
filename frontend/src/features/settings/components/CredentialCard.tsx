import { Edit2, Trash2, KeyRound, Server, ShieldCheck, Plug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type IntegrationCredential } from '@/types/api';
import { type ConnectorManifest } from '@/api/connectorApi';
import { ConnectorIconDisplay } from '@/features/integrations/components/ConnectorIconDisplay';


const getTypeIcon = (type: string, className = "h-8 w-8") => {
    switch (type) {
        case 'SMTP':
            return <Server className={`${className} text-blue-500`} />;
        case 'BEARER_TOKEN':
            return <KeyRound className={`${className} text-amber-500`} />;
        case 'MCP_SERVER':
            return <Plug className={`${className} text-violet-500`} />;
        default:
            return <ShieldCheck className={`${className} text-slate-500`} />;
    }
};

export interface CredentialCardProps {
    credential: IntegrationCredential;
    connector?: ConnectorManifest;
    onEdit: (cred: IntegrationCredential) => void;
    onDelete: (id?: string) => void;
}

export function CredentialCard({ credential, connector, onEdit, onDelete }: CredentialCardProps) {
    return (
        <div className="flex flex-col rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
                {connector ? (
                    <ConnectorIconDisplay icon={connector.icon} name={connector.displayName} size="md" />
                ) : (
                    getTypeIcon(credential.type)
                )}
                <div className="flex flex-col">
                    <span className="font-bold text-base text-foreground leading-tight">{credential.name}</span>
                    {connector && (
                        <span className="text-xs text-muted-foreground mt-0.5">
                            {connector.displayName}
                        </span>
                    )}
                </div>
            </div>

            <div className="mt-3">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                    {connector && getTypeIcon(credential.type, "h-3 w-3")}
                    {credential.type}
                </span>
            </div>

            <div className="mt-2 text-xs text-muted-foreground">
                {credential.updatedAt ? new Date(credential.updatedAt).toLocaleString() : 'N/A'}
            </div>

            <div className="mt-4 pt-3 border-t border-border flex items-center justify-end gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => onEdit(credential)} title="Edit">
                    <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => onDelete(credential.id)} title="Delete">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

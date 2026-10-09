import { Settings2, Trash2, KeyRound, Puzzle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConnectorIcon } from '@/components/ConnectorIcon';
import { type ConnectorManifest, type ConnectorAuthType } from '@/api/connectorApi';

const AUTH_LABELS: Record<ConnectorAuthType, string> = {
    BEARER_TOKEN: 'API Key',
    API_KEY: 'API Key (Header)',
    BASIC_AUTH: 'Username & Password',
    CUSTOM_HEADER: 'Custom Header',
    OAUTH2: 'OAuth 2.0',
    NONE: 'No Auth Required',
};

function resolveAuthLabel(authType: ConnectorAuthType): string {
    return AUTH_LABELS[authType] ?? authType;
}

export interface ConnectorCardProps {
    connector: ConnectorManifest;
    onNavigate: (path: string) => void;
    onDelete: (connectorId: string, displayName: string, e: React.MouseEvent) => void;
}

export function ConnectorCard({ connector, onNavigate, onDelete }: ConnectorCardProps) {
    return (
        <div 
            className="flex flex-col rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
            onClick={() => onNavigate(`/apps/${connector.connectorId}`)}
        >
            <div className="flex items-center gap-3">
                <ConnectorIcon icon={connector.icon} name={connector.displayName} size="md" className="h-10 w-10" />
                <div className="flex flex-col">
                    <span className="font-bold text-base text-foreground">{connector.displayName}</span>
                    <div className="mt-1">
                        {connector.scope === 'SYSTEM' ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary uppercase tracking-wider">Official</span>
                        ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground uppercase tracking-wider">Custom</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
                {connector.category ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                        {connector.category}
                    </span>
                ) : (
                    <span className="text-xs text-muted-foreground/50">?</span>
                )}
                <span className="text-sm text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">{resolveAuthLabel(connector.authType)}</span>
            </div>

            <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground"
                    onClick={(e) => { e.stopPropagation(); onNavigate(`/apps/${connector.connectorId}`); }}
                    title="Configure"
                >
                    <Settings2 className="h-4 w-4" />
                </Button>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground"
                    onClick={(e) => { e.stopPropagation(); onNavigate(`/apps/${connector.connectorId}#credentials`); }}
                    title="Credentials"
                >
                    <KeyRound className="h-4 w-4" />
                </Button>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground"
                    onClick={(e) => { e.stopPropagation(); onNavigate(`/apps/${connector.connectorId}#integrations`); }}
                    title="Integrations"
                >
                    <Puzzle className="h-4 w-4" />
                </Button>
                <div className="flex-1" />
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={(e) => onDelete(connector.connectorId, connector.displayName, e)}
                    title="Delete"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

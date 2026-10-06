import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConnectorIconDisplay } from './ConnectorIconDisplay';
import type { Integration, IntegrationScope } from '@/types/api';
import type { ConnectorManifest } from '@/api/connectorApi';
import { integrationApi } from '@/api/integrationApi';

interface CreateIntegrationDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (integration: Integration) => void;
  connectors: ConnectorManifest[];
}

export function CreateIntegrationDialog({ open, onClose, onCreated, connectors }: CreateIntegrationDialogProps) {
    const [name, setName] = useState('');
    const [sourceConnectorId, setSourceConnectorId] = useState('');
    const [destinationConnectorId, setDestinationConnectorId] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [scope, setScope] = useState<IntegrationScope>('USER');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        if (!name.trim() || !sourceConnectorId || !destinationConnectorId) {
            setError('Name, Source App, and Destination App are required.');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await integrationApi.createIntegration({
                name: name.trim(),
                sourceConnectorId,
                destinationConnectorId,
                description: description.trim() || undefined,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                scope
            });
            onCreated(result);
            onClose();
            // Reset form
            setName('');
            setSourceConnectorId('');
            setDestinationConnectorId('');
            setDescription('');
            setTags('');
            setScope('USER');
        } catch (err) {
            setError('Failed to create integration. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-[425px] p-6 overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Create Integration</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Name <span className="text-destructive">*</span></label>
                        <Input 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            placeholder="e.g. Salesforce to Slack"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Source App <span className="text-destructive">*</span></label>
                        <Select value={sourceConnectorId} onValueChange={setSourceConnectorId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select source app" />
                            </SelectTrigger>
                            <SelectContent>
                                {connectors.map(c => (
                                    <SelectItem key={c.connectorId} value={c.connectorId}>
                                        <div className="flex items-center gap-2">
                                            <ConnectorIconDisplay icon={c.icon} name={c.displayName} size="sm" />
                                            {c.displayName}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Destination App <span className="text-destructive">*</span></label>
                        <Select value={destinationConnectorId} onValueChange={setDestinationConnectorId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select destination app" />
                            </SelectTrigger>
                            <SelectContent>
                                {connectors.map(c => (
                                    <SelectItem key={c.connectorId} value={c.connectorId}>
                                        <div className="flex items-center gap-2">
                                            <ConnectorIconDisplay icon={c.icon} name={c.displayName} size="sm" />
                                            {c.displayName}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Scope</label>
                        <Select value={scope} onValueChange={(val) => setScope(val as IntegrationScope)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select scope" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="USER">Personal</SelectItem>
                                <SelectItem value="SYSTEM">System-wide</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <textarea 
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Tags</label>
                        <Input 
                            value={tags} 
                            onChange={(e) => setTags(e.target.value)} 
                            placeholder="e.g. sales, notifications (comma-separated)"
                        />
                    </div>

                    {error && <div className="text-sm text-destructive">{error}</div>}

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Creating...' : 'Create'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

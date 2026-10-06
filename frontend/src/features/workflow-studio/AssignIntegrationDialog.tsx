import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { integrationApi } from '@/api/integrationApi';
import type { Integration } from '@/types/api';

interface AssignIntegrationDialogProps {
  open: boolean;
  onClose: () => void;
  workflowId: string;
  currentIntegrationId?: string;
  currentUseCaseTitle?: string;
  currentUseCaseDescription?: string;
  onAssigned: (integrationId: string, useCaseTitle: string, useCaseDescription?: string) => void;
}

export function AssignIntegrationDialog({
  open,
  onClose,
  workflowId,
  currentIntegrationId,
  currentUseCaseTitle,
  currentUseCaseDescription,
  onAssigned
}: AssignIntegrationDialogProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState(currentIntegrationId || '');
  const [useCaseTitle, setUseCaseTitle] = useState(currentUseCaseTitle || '');
  const [useCaseDescription, setUseCaseDescription] = useState(currentUseCaseDescription || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedIntegrationId(currentIntegrationId || '');
      setUseCaseTitle(currentUseCaseTitle || '');
      setUseCaseDescription(currentUseCaseDescription || '');
      setError(null);
      
      const fetchIntegrations = async () => {
        setIsLoadingIntegrations(true);
        try {
          const result = await integrationApi.listIntegrations();
          setIntegrations(result);
        } catch (err) {
          setError('Failed to load integrations.');
        } finally {
          setIsLoadingIntegrations(false);
        }
      };
      
      fetchIntegrations();
    }
  }, [open, currentIntegrationId, currentUseCaseTitle, currentUseCaseDescription]);

  const handleSubmit = async () => {
    setError(null);
    if (!selectedIntegrationId || !useCaseTitle.trim()) {
      setError('Integration and Use Case Title are required.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await integrationApi.assignUseCase(selectedIntegrationId, {
        workflowId,
        useCaseTitle: useCaseTitle.trim(),
        useCaseDescription: useCaseDescription.trim() || undefined
      });
      onAssigned(selectedIntegrationId, useCaseTitle.trim(), useCaseDescription.trim() || undefined);
      onClose();
    } catch (err) {
      setError('Failed to assign integration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!currentIntegrationId) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await integrationApi.removeUseCase(currentIntegrationId, workflowId);
      onAssigned('', '', '');
      onClose();
    } catch (err) {
      setError('Failed to remove integration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign to Integration</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Integration <span className="text-destructive">*</span></label>
            <Select value={selectedIntegrationId} onValueChange={setSelectedIntegrationId} disabled={isLoadingIntegrations}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingIntegrations ? 'Loading...' : 'Select integration'} />
              </SelectTrigger>
              <SelectContent>
                {integrations.map(integration => (
                  <SelectItem key={integration.id} value={integration.id}>
                    {integration.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Use Case Title <span className="text-destructive">*</span></label>
            <Input 
              value={useCaseTitle} 
              onChange={(e) => setUseCaseTitle(e.target.value)} 
              placeholder="e.g. Sync Contacts"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Use Case Description</label>
            <textarea 
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={useCaseDescription}
              onChange={(e) => setUseCaseDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          
          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
        
        <DialogFooter className="pt-2">
          {currentIntegrationId && (
            <Button variant="ghost" className="mr-auto text-destructive" onClick={handleRemove} disabled={isSubmitting}>
              Remove from Integration
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

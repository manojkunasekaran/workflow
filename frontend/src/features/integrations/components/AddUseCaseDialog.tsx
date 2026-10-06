import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { workflowApi } from '@/api/workflowApi';
import { integrationApi } from '@/api/integrationApi';
import type { WorkflowDefinition } from '@/types/api';

interface AddUseCaseDialogProps {
  open: boolean;
  onClose: () => void;
  integrationId: string;
  onAdded: () => void;
}

export function AddUseCaseDialog({ open, onClose, integrationId, onAdded }: AddUseCaseDialogProps) {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
  const [useCaseTitle, setUseCaseTitle] = useState('');
  const [useCaseDescription, setUseCaseDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedWorkflowId('');
      setUseCaseTitle('');
      setUseCaseDescription('');
      setError(null);
      
      const fetchWorkflows = async () => {
        setIsLoadingWorkflows(true);
        try {
          const allWorkflows = await workflowApi.getAll();
          const unassigned = allWorkflows.filter(w => !w.integrationId && !!w.id);
          setWorkflows(unassigned);
        } catch (err) {
          setError('Failed to load workflows.');
        } finally {
          setIsLoadingWorkflows(false);
        }
      };
      
      void fetchWorkflows();
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedWorkflowId) {
      setError('Workflow is required.');
      return;
    }

    const selectedWorkflow = workflows.find(w => w.id === selectedWorkflowId);
    const finalTitle = useCaseTitle.trim() || selectedWorkflow?.name || 'Untitled Workflow';

    setIsSubmitting(true);
    setError(null);
    try {
      await integrationApi.assignUseCase(integrationId, {
        workflowId: selectedWorkflowId,
        useCaseTitle: finalTitle,
        useCaseDescription: useCaseDescription.trim() || undefined,
      });
      onAdded();
      onClose();
    } catch (err) {
      setError('Failed to assign use case. The workflow may already be assigned to another integration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg p-6">
        <DialogHeader>
          <DialogTitle>Add Use Case</DialogTitle>
        </DialogHeader>

        {isLoadingWorkflows ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : workflows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            All workflows are already assigned to an integration. Create a new workflow first.
          </p>
        ) : (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="workflow-select">Workflow</Label>
              <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
                <SelectTrigger id="workflow-select">
                  <SelectValue placeholder="Select a workflow..." />
                </SelectTrigger>
                <SelectContent>
                  {workflows.map(w => (
                    <SelectItem key={w.id} value={w.id!}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="uc-title">Use Case Title <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input id="uc-title" placeholder="Defaults to workflow name" value={useCaseTitle} onChange={(e) => setUseCaseTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uc-desc">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <textarea
                id="uc-desc" rows={3}
                placeholder="Describe what this use case does..."
                value={useCaseDescription}
                onChange={(e) => setUseCaseDescription(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          {!isLoadingWorkflows && workflows.length > 0 && (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</> : 'Add Use Case'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

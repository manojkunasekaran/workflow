import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { integrationApi } from '@/api/integrationApi';
import type { Integration } from '@/types/api';

interface EditIntegrationDialogProps {
  open: boolean;
  onClose: () => void;
  integration: Integration;
  onUpdated: () => void;
}

export function EditIntegrationDialog({ open, onClose, integration, onUpdated }: EditIntegrationDialogProps) {
  const [name, setName] = useState(integration.name);
  const [description, setDescription] = useState(integration.description || '');
  const [tags, setTags] = useState(integration.tags?.join(', ') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(integration.name);
      setDescription(integration.description || '');
      setTags(integration.tags?.join(', ') || '');
      setError(null);
    }
  }, [open, integration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const tagsArray = tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      await integrationApi.updateIntegration(integration.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        tags: tagsArray,
      });
      onUpdated();
      onClose();
    } catch (err) {
      setError('Failed to update integration details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[425px] p-6">
        <DialogHeader>
          <DialogTitle>Edit Integration</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name <span className="text-destructive">*</span></Label>
            <Input 
              id="edit-name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Salesforce to Slack"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-desc">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <textarea
              id="edit-desc" 
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this integration..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tags">Tags <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input 
              id="edit-tags" 
              value={tags} 
              onChange={(e) => setTags(e.target.value)} 
              placeholder="e.g. sales, notifications (comma-separated)"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

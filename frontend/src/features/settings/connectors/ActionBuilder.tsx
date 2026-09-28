import { useState } from 'react';
import { type ConnectorAction } from '@/api/connectorApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Settings2, Info } from 'lucide-react';
import InputSchemaBuilder from './InputSchemaBuilder';

const METHOD_STYLES: Record<string, string> = {
    GET:    'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    POST:   'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    PUT:    'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    PATCH:  'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20',
    DELETE: 'bg-destructive/10 text-destructive border border-destructive/20',
};

interface ActionBuilderProps {
    actions: ConnectorAction[];
    onChange: (actions: ConnectorAction[]) => void;
}

export default function ActionBuilder({ actions, onChange }: ActionBuilderProps) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingAction, setEditingAction] = useState<ConnectorAction | null>(null);
    const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);

    const openCreate = () => {
        setEditingAction({
            actionId: '',
            displayName: '',
            method: 'GET',
            path: '/',
            inputSchema: [],
        });
        setEditingIndex(-1);
    };

    const openEdit = (index: number) => {
        setEditingAction({ ...actions[index] });
        setEditingIndex(index);
    };

    const closeEdit = () => {
        setEditingIndex(null);
        setEditingAction(null);
    };

    const handleSaveAction = () => {
        if (!editingAction) return;
        
        const newActions = [...actions];
        if (editingIndex === -1) {
            newActions.push(editingAction);
        } else if (editingIndex !== null) {
            newActions[editingIndex] = editingAction;
        }
        
        onChange(newActions);
        closeEdit();
    };

    const removeAction = (index: number) => {
        const newActions = [...actions];
        newActions.splice(index, 1);
        onChange(newActions);
        setConfirmDeleteIndex(null);
    };

    const handlePathChange = (path: string) => {
        if (!editingAction) return;
        const matches = path.match(/\{([a-zA-Z0-9_]+)\}/g);
        const pathParams = matches ? matches.map(m => m.replace(/[{}]/g, '')) : undefined;
        setEditingAction({ ...editingAction, path, pathParams });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-sm font-medium">Actions ({(actions?.length || 0)})</h3>
                    <p className="text-xs text-muted-foreground">Define the operations this connector can perform.</p>
                </div>
                <Button variant="outline" size="sm" onClick={openCreate} className="h-8">
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Action
                </Button>
            </div>

            {(actions?.length || 0) === 0 ? (
                <div className="p-8 border border-dashed rounded-lg text-center bg-muted/20">
                    <p className="text-sm text-muted-foreground">No actions defined yet.</p>
                </div>
            ) : (
                <div className="grid gap-2">
                    {actions.map((action, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded-lg bg-card hover:border-primary/30 transition-colors group cursor-pointer"
                            onClick={() => openEdit(index)}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${METHOD_STYLES[action.method] || METHOD_STYLES.GET}`}>
                                    {action.method}
                                </span>
                                <div className="flex flex-col truncate">
                                    <span className="text-sm font-medium truncate">{action.displayName || 'Unnamed Action'}</span>
                                    <span className="text-xs text-muted-foreground font-mono truncate">{action.path}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
                                {confirmDeleteIndex === index ? (
                                    <>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={(e) => { e.stopPropagation(); removeAction(index); }}
                                        >
                                            Confirm
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteIndex(null); }}
                                        >
                                            Cancel
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                            onClick={(e) => { e.stopPropagation(); openEdit(index); }}
                                        >
                                            <Settings2 className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteIndex(index); }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={editingIndex !== null} onOpenChange={(open) => !open && closeEdit()}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                    <DialogHeader className="px-6 py-4 border-b shrink-0">
                        <DialogTitle>{editingIndex === -1 ? 'Create Action' : 'Edit Action'}</DialogTitle>
                        <DialogDescription>
                            Configure the API endpoint and input parameters for this action.
                        </DialogDescription>
                    </DialogHeader>

                    {editingAction && (
                        <div className="px-6 py-4 overflow-y-auto space-y-6 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Action Name <span className="text-destructive">*</span></Label>
                                    <Input
                                        className="h-9"
                                        value={editingAction.displayName}
                                        onChange={e => setEditingAction({ ...editingAction, displayName: e.target.value })}
                                        placeholder="e.g. Send Message"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Description <span className="text-muted-foreground">(optional)</span></Label>
                                    <Input
                                        className="h-9"
                                        value={editingAction.description ?? ''}
                                        onChange={e => setEditingAction({ ...editingAction, description: e.target.value })}
                                        placeholder="Briefly describe what this action does"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="space-y-1.5 w-28 shrink-0">
                                    <Label className="text-xs">Method</Label>
                                    <Select
                                        value={editingAction.method}
                                        onValueChange={val => setEditingAction({ ...editingAction, method: val })}
                                    >
                                        <SelectTrigger className="h-9 font-mono">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => (
                                                <SelectItem key={m} value={m} className="font-mono">{m}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5 flex-1">
                                    <Label className="text-xs">
                                        API Path
                                        <span className="text-muted-foreground font-normal ml-1">— use {'{'} {'}'} for dynamic segments</span>
                                    </Label>
                                    <Input
                                        className="h-9 font-mono"
                                        value={editingAction.path}
                                        onChange={e => handlePathChange(e.target.value)}
                                        placeholder="/channels/{channelId}/messages"
                                    />
                                </div>
                            </div>

                            {editingAction.pathParams && editingAction.pathParams.length > 0 && (
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/15 text-xs text-primary">
                                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                    <span>
                                        Detected path variables:{' '}
                                        {editingAction.pathParams.map(p => (
                                            <code key={p} className="px-1 py-0.5 rounded bg-primary/10 font-mono mx-0.5">{p}</code>
                                        ))}
                                        {' '}— add these as Input Fields below so users can provide values.
                                    </span>
                                </div>
                            )}

                            <div className="pt-2 border-t">
                                <div className="mb-4">
                                    <h4 className="text-sm font-medium">Input Schema</h4>
                                    <p className="text-xs text-muted-foreground">Define the fields the user needs to fill out to run this action.</p>
                                </div>
                                <InputSchemaBuilder
                                    fields={editingAction.inputSchema}
                                    onChange={fields => setEditingAction({ ...editingAction, inputSchema: fields })}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="px-6 py-4 border-t shrink-0">
                        <Button variant="outline" onClick={closeEdit}>Cancel</Button>
                        <Button onClick={handleSaveAction} disabled={!editingAction?.displayName?.trim()}>
                            Save Action
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}


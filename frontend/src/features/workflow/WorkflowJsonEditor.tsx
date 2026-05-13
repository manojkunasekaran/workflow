import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { workflowApi } from '@/api/workflowApi';
import { Loader2, Save, Play, RefreshCw, AlertCircle, CheckCircle, FileJson } from 'lucide-react';
import {
    SAMPLE_HTTP_CONDITIONAL_WORKFLOW,
    SAMPLE_ARRAY_ITERATOR_WORKFLOW,
    SAMPLE_OBJECT_ITERATOR_WORKFLOW,
    SAMPLE_SCRIPT_BASIC_WORKFLOW,
    SAMPLE_SCRIPT_CONTEXT_WORKFLOW,
    SAMPLE_DATA_TRANSFORM_WORKFLOW
} from './sampleWorkflows';

const SAMPLE_WORKFLOW = SAMPLE_DATA_TRANSFORM_WORKFLOW;

interface ExecutionResult {
    id: string;
    status: string;
    startTime?: string;
    endTime?: string;
    taskExecutionSummaries?: Array<{
        taskDefinitionId: string;
        status: string;
    }>;
}

export default function WorkflowJsonEditor() {
    const [jsonContent, setJsonContent] = useState<string>(JSON.stringify(SAMPLE_WORKFLOW, null, 2));
    const [workflowId, setWorkflowId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [lastExecution, setLastExecution] = useState<ExecutionResult | null>(null);

    // Load existing workflows on mount
    useEffect(() => {
        loadWorkflows();
    }, []);

    const loadWorkflows = async () => {
        try {
            setIsLoading(true);
            const workflows = (await workflowApi.getAll()).reverse();
            if (workflows.length > 0) {
                const latest = workflows[0];
                setWorkflowId(latest.id || null);
                setJsonContent(JSON.stringify(latest, null, 2));
                showMessage('success', `Loaded workflow: ${latest.name}`);
            }
        } catch (error) {
            console.error("Failed to load workflows", error);
            showMessage('error', 'Failed to load workflows from server');
        } finally {
            setIsLoading(false);
        }
    };

    const validateJson = (content: string): boolean => {
        try {
            const parsed = JSON.parse(content);
            if (!parsed.name || !parsed.tasks) {
                setParseError('Workflow must have "name" and "tasks" fields');
                return false;
            }
            setParseError(null);
            return true;
        } catch (e) {
            setParseError(`Invalid JSON: ${(e as Error).message}`);
            return false;
        }
    };

    const handleJsonChange = (value: string) => {
        setJsonContent(value);
        validateJson(value);
    };

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const handleSave = async () => {
        if (!validateJson(jsonContent)) {
            showMessage('error', 'Cannot save invalid JSON');
            return;
        }

        try {
            setIsSaving(true);
            const definition = JSON.parse(jsonContent);

            let savedWorkflow;
            if (workflowId) {
                // Include ID for update
                definition.id = workflowId;
                savedWorkflow = await workflowApi.update(workflowId, definition);
            } else {
                savedWorkflow = await workflowApi.create(definition);
            }

            if (savedWorkflow?.id) {
                setWorkflowId(savedWorkflow.id);
                // Update JSON with returned data (includes timestamps, etc.)
                setJsonContent(JSON.stringify(savedWorkflow, null, 2));
            }

            showMessage('success', 'Workflow saved successfully!');
        } catch (error) {
            console.error("Failed to save", error);
            showMessage('error', `Failed to save: ${(error as Error).message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRun = async () => {
        if (!workflowId) {
            showMessage('error', 'Please save the workflow first');
            return;
        }

        try {
            setIsRunning(true);
            setLastExecution(null);
            const result = await workflowApi.run(workflowId);
            setLastExecution(result);

            if (result.status === 'COMPLETED') {
                showMessage('success', `Workflow completed! Execution ID: ${result.id}`);
            } else if (result.status === 'FAILED') {
                showMessage('error', `Workflow failed. Execution ID: ${result.id}`);
            } else {
                showMessage('success', `Workflow started. Status: ${result.status}`);
            }
        } catch (error) {
            console.error("Failed to run workflow", error);
            showMessage('error', `Execution failed: ${(error as Error).message}`);
        } finally {
            setIsRunning(false);
        }
    };

    const handleLoadSample = () => {
        setJsonContent(JSON.stringify(SAMPLE_WORKFLOW, null, 2));
        setWorkflowId(null);
        setParseError(null);
        showMessage('success', 'Loaded sample workflow template');
    };

    const handleNew = () => {
        setJsonContent(JSON.stringify({
            name: "New Workflow",
            tasks: []
        }, null, 2));
        setWorkflowId(null);
        setParseError(null);
    };

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="border-b border-border/60 bg-card/50 backdrop-blur-sm">
                <div className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
                            <FileJson className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">Workflow JSON Editor</h1>
                            <p className="text-xs text-muted-foreground">
                                {workflowId ? `ID: ${workflowId}` : 'New Workflow (unsaved)'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleNew}>
                            New
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleLoadSample}>
                            Load Sample
                        </Button>
                        <Button variant="outline" size="sm" onClick={loadWorkflows} disabled={isLoading}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            <span className="ml-1.5">Refresh</span>
                        </Button>
                        <div className="w-px h-6 bg-border mx-2" />
                        <Button onClick={handleSave} disabled={isSaving || isRunning || !!parseError} size="sm">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save
                        </Button>
                        <Button
                            onClick={handleRun}
                            disabled={isSaving || isRunning || !workflowId}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                            Run
                        </Button>
                    </div>
                </div>

                {/* Status Messages */}
                {message && (
                    <div className={`px-6 py-2 text-sm flex items-center gap-2 ${message.type === 'success'
                        ? 'bg-green-500/10 text-green-600 border-t border-green-500/20'
                        : 'bg-red-500/10 text-red-600 border-t border-red-500/20'
                        }`}>
                        {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        {message.text}
                    </div>
                )}

                {parseError && (
                    <div className="px-6 py-2 text-sm flex items-center gap-2 bg-orange-500/10 text-orange-600 border-t border-orange-500/20">
                        <AlertCircle className="h-4 w-4" />
                        {parseError}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 flex gap-4 p-4 min-h-0">
                {/* JSON Editor */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Workflow Definition (JSON)
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {jsonContent.split('\n').length} lines
                        </span>
                    </div>
                    <Textarea
                        value={jsonContent}
                        onChange={(e) => handleJsonChange(e.target.value)}
                        className="flex-1 font-mono text-sm resize-none bg-zinc-950 text-zinc-100 border-zinc-800 focus:border-blue-500"
                        placeholder="Paste your workflow JSON here..."
                        spellCheck={false}
                    />
                </div>

                {/* Info Panel */}
                <div className="max-w-full flex flex-col gap-4">

                    {/* Last Execution Result */}
                    {lastExecution && (
                        <div className="w-[500px] flex-1 flex flex-col min-h-0 rounded-lg border border-border bg-card p-4">
                            <h3 className="font-semibold text-sm mb-3 shrink-0">Last Execution</h3>
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="space-y-2 text-xs mb-4 shrink-0">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">ID:</span>
                                        <span className="font-mono">{lastExecution.id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Status:</span>
                                        <span className={`font-medium ${lastExecution.status === 'COMPLETED' ? 'text-green-500' :
                                            lastExecution.status === 'FAILED' ? 'text-red-500' :
                                                'text-yellow-500'
                                            }`}>
                                            {lastExecution.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col min-h-0">
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                            Execution JSON
                                        </span>
                                    </div>
                                    <Textarea
                                        value={JSON.stringify(lastExecution, null, 4)}
                                        readOnly
                                        className="flex-1 font-mono text-[10px] resize-none bg-zinc-950 text-zinc-300 border-zinc-800 focus:ring-0 focus:border-zinc-700"
                                        spellCheck={false}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

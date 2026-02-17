import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { executionApi, type WorkflowExecution, type WorkflowTaskExecution } from '@/api/executionApi';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

export default function ExecutionDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [execution, setExecution] = useState<WorkflowExecution | null>(null);
    const [taskExecutions, setTaskExecutions] = useState<WorkflowTaskExecution[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            loadExecutionDetails();
        }
    }, [id]);

    const loadExecutionDetails = async () => {
        if (!id) return;

        try {
            setIsLoading(true);
            setError(null);
            const [execData, tasksData] = await Promise.all([
                executionApi.getById(id),
                executionApi.getTaskExecutions(id)
            ]);
            setExecution(execData);
            setTaskExecutions(tasksData);
        } catch (err) {
            console.error('Failed to load execution details', err);
            setError('Failed to load execution details');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED':
            case 'SUCCESS':
                return 'text-green-600';
            case 'FAILED':
                return 'text-red-600';
            default:
                return 'text-yellow-600';
        }
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !execution) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">{error || 'Execution not found'}</p>
                    <Button className="mt-4" onClick={() => navigate('/executions')}>
                        Back to List
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="border-b border-border/60 bg-card/50 backdrop-blur-sm px-6 py-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/executions')}>
                        <ArrowLeft className="h-4 w-4 mr-1.5" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">Execution Details</h1>
                        <p className="text-xs text-muted-foreground font-mono">ID: {execution.id}</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Execution Overview */}
                    <div className="bg-card border border-border rounded-lg p-4">
                        <h2 className="font-semibold mb-3">Workflow Execution</h2>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground">Status:</span>
                                <span className={`ml-2 font-medium ${getStatusColor(execution.status)}`}>
                                    {execution.status}
                                </span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Workflow ID:</span>
                                <span className="ml-2 font-mono text-xs">{execution.workflowId}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Start Time:</span>
                                <span className="ml-2">{new Date(execution.startTime).toLocaleString()}</span>
                            </div>
                            {execution.endTime && (
                                <div>
                                    <span className="text-muted-foreground">End Time:</span>
                                    <span className="ml-2">{new Date(execution.endTime).toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Workflow Execution JSON */}
                    <div className="bg-card border border-border rounded-lg p-4">
                        <h2 className="font-semibold mb-3">Full Execution Data (JSON)</h2>
                        <Textarea
                            value={JSON.stringify(execution, null, 2)}
                            readOnly
                            className="font-mono text-xs h-64 bg-zinc-950 text-zinc-100 border-zinc-800"
                        />
                    </div>

                    {/* Task Executions */}
                    <div className="bg-card border border-border rounded-lg p-4">
                        <h2 className="font-semibold mb-3">
                            Task Executions ({taskExecutions.length})
                        </h2>
                        {taskExecutions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No task executions found</p>
                        ) : (
                            <div className="space-y-4">
                                {taskExecutions.map((task, index) => (
                                    <div key={task.id} className="border border-border rounded-lg p-3">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm">
                                                    Task {index + 1}: {task.taskDefinitionId}
                                                </span>
                                            </div>
                                            <span
                                                className={`text-xs font-medium ${getStatusColor(task.status)}`}
                                            >
                                                {task.status}
                                            </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground mb-2">
                                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                                                {task.taskType}
                                            </span>
                                        </div>
                                        <Textarea
                                            value={JSON.stringify(task, null, 2)}
                                            readOnly
                                            className="font-mono text-[10px] h-40 bg-zinc-950 text-zinc-100 border-zinc-800"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Should read the rules before creating/updating the test files
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WorkflowJsonEditor from '../WorkflowJsonEditor';
import { workflowApi } from '@/api/workflowApi';
import { executionApi } from '@/api/executionApi';

vi.mock('@/api/workflowApi', () => ({
  workflowApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/api/executionApi', () => ({
  executionApi: {
    trigger: vi.fn(),
  },
}));

describe('WorkflowJsonEditor Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workflowApi.getAll).mockResolvedValue([]);
  });

  it('M-001: Render editor, verify "New Workflow" and "Load Sample" buttons are visible', async () => {
    render(<WorkflowJsonEditor />);
    
    expect(screen.getByText('Workflow JSON Editor')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Load Sample/i })).toBeInTheDocument();
    
    // Wait for the async loadWorkflows to settle
    await waitFor(() => {
      expect(workflowApi.getAll).toHaveBeenCalled();
    });
  });

  it('M-002: "Load Sample" button correctly populates the JSON textarea', async () => {
    render(<WorkflowJsonEditor />);
    
    // Click 'New' to clear it out to a basic state first
    const newBtn = screen.getByRole('button', { name: /New/i });
    fireEvent.click(newBtn);

    const textarea = screen.getByPlaceholderText(/Paste your workflow JSON here/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain('"New Workflow"');

    // Click 'Load Sample'
    const loadSampleBtn = screen.getByRole('button', { name: /Load Sample/i });
    fireEvent.click(loadSampleBtn);

    expect(textarea.value).toContain('"Zero-Code Data Transformation"');
  });

  it('M-003: Inputting invalid JSON formats displays inline AlertCircle parsing error', async () => {
    render(<WorkflowJsonEditor />);
    
    // Wait for the async loadWorkflows to settle
    await waitFor(() => {
      expect(workflowApi.getAll).toHaveBeenCalled();
    });
    
    const textarea = screen.getByPlaceholderText(/Paste your workflow JSON here/i) as HTMLTextAreaElement;
    
    fireEvent.change(textarea, { target: { value: '{ invalid: json' } });

    // Should display parsing error banner
    expect(screen.getByText(/Invalid JSON:/i)).toBeInTheDocument();
  });

  it('M-004: "Save" button triggers workflowApi.create API endpoints', async () => {
    vi.mocked(workflowApi.create).mockResolvedValue({
      id: 'wf-123',
      name: 'Test Workflow',
      tasks: [],
    });

    render(<WorkflowJsonEditor />);
    
    // Wait for the async loadWorkflows to settle
    await waitFor(() => {
      expect(workflowApi.getAll).toHaveBeenCalled();
    });
    
    const newBtn = screen.getByRole('button', { name: /New/i });
    fireEvent.click(newBtn); // This sets the JSON to basic template with no ID

    const saveBtn = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(workflowApi.create).toHaveBeenCalled();
    });
    
    expect(screen.getByText(/Workflow saved successfully/i)).toBeInTheDocument();
  });

  it('M-005: "Run" button triggers executionApi.trigger and displays execution badge', async () => {
    // Setup a loaded workflow so Run is enabled
    vi.mocked(workflowApi.getAll).mockResolvedValue([
      { id: 'wf-999', name: 'Mock WF', tasks: [] }
    ]);
    
    vi.mocked(executionApi.trigger).mockResolvedValue({
      id: 'exec-123',
      status: 'RUNNING'
    } as any);

    render(<WorkflowJsonEditor />);
    
    // Wait for load
    await waitFor(() => {
      expect(screen.getByText(/Loaded workflow: Mock WF/i)).toBeInTheDocument();
    });

    const runBtn = screen.getByRole('button', { name: /Run/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(executionApi.trigger).toHaveBeenCalledWith('wf-999', 'ASYNC');
    });

    expect(screen.getByText(/Workflow started. Status: RUNNING/i)).toBeInTheDocument();
    expect(screen.getByText('Last Execution')).toBeInTheDocument();
    expect(screen.getByText('exec-123')).toBeInTheDocument();
  });

  it('M-006: Save and Run buttons disable correctly when parsing errors are present', async () => {
    render(<WorkflowJsonEditor />);
    
    // Wait for the async loadWorkflows to settle
    await waitFor(() => {
      expect(workflowApi.getAll).toHaveBeenCalled();
    });
    
    const textarea = screen.getByPlaceholderText(/Paste your workflow JSON here/i) as HTMLTextAreaElement;
    const saveBtn = screen.getByRole('button', { name: /Save/i });
    const runBtn = screen.getByRole('button', { name: /Run/i });

    // Ensure buttons are disabled when JSON is invalid
    fireEvent.change(textarea, { target: { value: '{"bad json' } });

    expect(saveBtn).toBeDisabled();
    expect(runBtn).toBeDisabled();
  });
});

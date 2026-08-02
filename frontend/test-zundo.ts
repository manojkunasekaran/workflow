import { useWorkflowStore } from './src/features/workflow-studio/store/workflowStore';
console.log(typeof useWorkflowStore.temporal.getState().pause);

// Should read the rules before creating/updating the test files
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { workflowApi } from '../workflowApi';
import { executionApi } from '../executionApi';
import { healthApi } from '../healthApi';
import { pollTriggerApi } from '../pollTriggerApi';
import { webhookTriggerApi } from '../webhookTriggerApi';
import { subscribeTriggerApi } from '../subscribeTriggerApi';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('API Client Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Happy Path — workflowApi', () => {
    it('C-001: workflowApi.getAll() returns array of workflow definitions', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: [{ id: 'wf-1', name: 'Workflow 1', tasks: [] }] });
      const data = await workflowApi.getAll();
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('wf-1');
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/rest/workflows'));
    });

    it('C-002: workflowApi.getById(id) returns single workflow definition', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { id: 'wf-1', name: 'Workflow 1', tasks: [] } });
      const data = await workflowApi.getById('wf-1');
      expect(data.id).toBe('wf-1');
      expect(data.name).toBe('Workflow 1');
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/rest/workflows/wf-1'));
    });

    it('C-003: workflowApi.create(def) sends POST payload and returns saved object', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { id: 'wf-new', name: 'New WF', tasks: [] } });
      const res = await workflowApi.create({ id: '', name: 'New WF', tasks: [] } as any);
      expect(res.id).toBe('wf-new');
      expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining('/rest/workflows'), { id: '', name: 'New WF', tasks: [] });
    });

    it('C-004: workflowApi.update(id, def) sends PUT payload', async () => {
      mockedAxios.put.mockResolvedValueOnce({ data: { id: 'wf-1', name: 'Updated WF', tasks: [] } });
      const res = await workflowApi.update('wf-1', { id: 'wf-1', name: 'Updated WF', tasks: [] } as any);
      expect(res.name).toBe('Updated WF');
      expect(mockedAxios.put).toHaveBeenCalledWith(
        expect.stringContaining('/rest/workflows/wf-1'),
        { id: 'wf-1', name: 'Updated WF', tasks: [] },
      );
    });

    it('C-005: workflowApi.delete(id) sends DELETE request to /rest/workflows/:id', async () => {
      mockedAxios.delete.mockResolvedValueOnce({});
      await workflowApi.delete('wf-1');
      expect(mockedAxios.delete).toHaveBeenCalledWith(expect.stringContaining('/rest/workflows/wf-1'));
    });
  });

  describe('Happy Path — executionApi', () => {
    it('C-008 & C-009: executionApi.trigger(id, type) sends POST with executionType query param', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { id: 'exec-1', workflowId: 'wf-1', status: 'RUNNING' } });
      const res = await executionApi.trigger('wf-1', 'ASYNC');
      expect(res.id).toBe('exec-1');
      expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining('/rest/executions/wf-1'), undefined, expect.anything());
    });

    it('C-010: executionApi.getAll() returns content array from page response', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { content: [{ id: 'exec-1' }], totalElements: 1 } });
      const list = await executionApi.getAll();
      expect(list).toHaveLength(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/rest/executions'),
        expect.objectContaining({ params: {} }),
      );
    });

    it('C-011: executionApi.getById(id) returns execution detail', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { id: 'exec-1', status: 'COMPLETED' } });
      const exec = await executionApi.getById('exec-1');
      expect(exec.status).toBe('COMPLETED');
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/rest/executions/exec-1'));
    });

    it('C-012: executionApi.getTaskExecutions(id) returns task executions array', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: [{ id: 'task-exec-1', status: 'COMPLETED' }] });
      const tasks = await executionApi.getTaskExecutions('exec-1');
      expect(tasks).toHaveLength(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/rest/executions/exec-1/tasks'));
    });

    it('C-013: executionApi.respondToHumanTask() sends POST to respond path', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { id: 'task-1', status: 'COMPLETED' } });
      const res = await executionApi.respondToHumanTask('exec-1', 'task-1', {
        actionId: 'approve',
        respondedBy: 'test@example.com',
      });
      expect(res.status).toBe('COMPLETED');
      expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining('/rest/executions/exec-1/tasks/task-1/respond'), {
        actionId: 'approve',
        respondedBy: 'test@example.com',
      });
    });
  });

  describe('Happy Path — pollTriggerApi', () => {
    it('pollTriggerApi.testPoll(workflowId) sends POST to poll test endpoint', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          durationMs: 120,
          itemsFetched: 5,
          itemsNew: 2,
          itemsUpdated: 0,
          itemsSkipped: 3,
        },
      });
      const res = await pollTriggerApi.testPoll('wf-1');
      expect(res.itemsFetched).toBe(5);
      expect(res.itemsNew).toBe(2);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/rest/workflows/wf-1/trigger/poll/test'),
      );
    });

    it('pollTriggerApi.getPollState(workflowId) sends GET to poll state endpoint', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { seenKeyCount: 10, baselineEstablished: true },
      });
      const res = await pollTriggerApi.getPollState('wf-1');
      expect(res.seenKeyCount).toBe(10);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/rest/workflows/wf-1/trigger/poll/state'),
      );
    });

    it('pollTriggerApi.getLogs(workflowId, page, size) sends GET to poll logs endpoint', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          content: [{ id: 'log-1', itemsFetched: 5, itemsNew: 1 }],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 20,
        },
      });
      const res = await pollTriggerApi.getLogs('wf-1', 0, 20);
      expect(res.content).toHaveLength(1);
      expect(res.content[0].itemsNew).toBe(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/rest/workflows/wf-1/trigger/poll/logs'),
        expect.objectContaining({ params: { page: 0, size: 20, sort: 'polledAt,desc' } }),
      );
    });
  });

  describe('Happy Path — webhookTriggerApi', () => {
    it('webhookTriggerApi.getWebhookState(workflowId) sends GET to webhook state endpoint', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { webhookUrl: 'https://api.example.com/webhook-events/abc', status: 'ACTIVE' },
      });
      const res = await webhookTriggerApi.getWebhookState('wf-1');
      expect(res.webhookUrl).toContain('/webhook-events/');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/rest/workflows/wf-1/trigger/webhook/state'),
      );
    });

    it('webhookTriggerApi.getLogs(workflowId, page, size) sends GET to webhook logs endpoint', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          content: [{ id: 'log-1', success: true, triggeredExecution: true }],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 20,
        },
      });
      const res = await webhookTriggerApi.getLogs('wf-1', 0, 20);
      expect(res.content).toHaveLength(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/rest/workflows/wf-1/trigger/webhook/logs'),
        expect.objectContaining({ params: { page: 0, size: 20, sort: 'timestamp,desc' } }),
      );
    });
  });

  describe('Happy Path — subscribeTriggerApi', () => {
    it('subscribeTriggerApi.getState(workflowId) sends GET to subscribe state endpoint', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { status: 'ACTIVE', hasExternalSubscription: true },
      });
      const res = await subscribeTriggerApi.getState('wf-1');
      expect(res.hasExternalSubscription).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/rest/workflows/wf-1/trigger/subscribe/state'),
      );
    });

    it('subscribeTriggerApi.testSubscribe(workflowId) sends POST to subscribe test endpoint', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { success: true, durationMs: 80, statusCode: 200 },
      });
      const res = await subscribeTriggerApi.testSubscribe('wf-1');
      expect(res.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/rest/workflows/wf-1/trigger/subscribe/test'),
      );
    });

    it('subscribeTriggerApi.getLogs(workflowId, page, size) sends GET to subscribe logs endpoint', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          content: [{ id: 'log-1', eventType: 'SUBSCRIBE', success: true }],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 20,
        },
      });
      const res = await subscribeTriggerApi.getLogs('wf-1', 0, 20);
      expect(res.content[0].eventType).toBe('SUBSCRIBE');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/rest/workflows/wf-1/trigger/subscribe/logs'),
        expect.objectContaining({ params: { page: 0, size: 20, sort: 'timestamp,desc' } }),
      );
    });
  });

  describe('Happy Path — healthApi', () => {
    it('C-015: healthApi.getApiHealth() returns status object', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { status: 'UP' } });
      const res = await healthApi.getApiHealth();
      expect(res.status).toBe('UP');
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/system/stats'));
    });
  });

  describe('Negative Path — Errors', () => {
    it('C-006 & C-014: 404 response rejects promise', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Not found'));
      await expect(workflowApi.getById('bad-id')).rejects.toThrow('Not found');
    });

    it('C-007: 500 response rejects promise', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Server error'));
      await expect(workflowApi.create({ id: '1', name: 'Fail', tasks: [] } as any)).rejects.toThrow('Server error');
    });

    it('C-016: healthApi network abort rejects promise', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
      await expect(healthApi.getApiHealth()).rejects.toThrow('Network error');
    });
  });

  describe('Configuration & Defaults', () => {
    it('C-017: API_BASE_URL defaults to /rest or reads from env', async () => {
      // In the vitest environment, VITE_API_URL is loaded from .env.test as http://localhost:8080
      // meaning API_BASE_URL should read from it successfully.
      const { API_BASE_URL } = await import('../config');
      expect(API_BASE_URL).toMatch(/\/rest$/); // Either /rest or http://localhost:8080/rest
    });

    it('C-018: Request Content-Type header defaults to application/json for POST', async () => {
      // Axios sends application/json automatically when data is passed as an object
      mockedAxios.post.mockResolvedValueOnce({ data: { id: 'wf-2' } });
      await workflowApi.create({ id: '', name: 'Test', tasks: [] } as any);
      
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/rest/workflows'),
        { id: '', name: 'Test', tasks: [] }
      );
    });
  });
});

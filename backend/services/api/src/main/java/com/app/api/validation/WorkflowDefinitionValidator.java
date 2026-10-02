package com.app.api.validation;

import com.app.api.config.properties.WorkflowApiProperties;
import com.app.common.entity.WorkflowDefinition;
import com.app.common.exception.ValidationException;
import com.app.common.graph.WorkflowGraph;
import com.app.common.graph.WorkflowTopologyResolver;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.entity.IntegrationCredential;
import com.app.common.model.task.parameters.AgentsTaskParameters;
import com.app.common.model.task.parameters.BranchTaskParameters;
import com.app.common.model.task.parameters.ConnectorTaskParameters;
import com.app.common.model.task.parameters.HumanTaskParameters;
import com.app.common.model.task.parameters.JoinTaskParameters;
import com.app.common.model.task.parameters.JoinWaitPolicy;
import com.app.common.model.task.parameters.McpToolTaskParameters;
import com.app.common.model.task.parameters.WaitTaskParameters;
import com.app.common.constant.IntegrationCredentialTypes;
import com.app.persistence.repository.IntegrationCredentialRepository;
import com.app.common.model.trigger.ChangeDetectionConfig;
import com.app.common.model.trigger.PollConfig;
import com.app.common.model.trigger.PollHttpConfig;
import com.app.common.model.trigger.PollScheduleConfig;
import com.app.common.model.trigger.PollScheduleMode;
import com.app.common.model.trigger.PollEventSemantics;
import com.app.common.model.trigger.TriggerConfig;
import com.app.common.model.trigger.TriggerType;
import com.app.common.model.trigger.WebhookConfig;
import com.app.common.model.trigger.WebhookInboundConfig;
import com.app.common.model.trigger.WebhookVerificationMode;
import com.app.common.model.trigger.McpResponseMode;
import com.app.common.model.trigger.McpTriggerConfig;
import com.app.persistence.connector.ConnectorRegistry;
import com.app.persistence.repository.WorkflowDefinitionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class WorkflowDefinitionValidator {

    private static final Pattern MCP_TOOL_NAME_PATTERN = Pattern.compile("^[a-zA-Z][a-zA-Z0-9_-]{0,63}$");

    private final ConnectorRegistry connectorRegistry;
    private final WorkflowApiProperties apiProperties;
    private final IntegrationCredentialRepository integrationCredentialRepository;
    private final WorkflowDefinitionRepository definitionRepository;

    @Value("${spring.profiles.active:}")
    private String activeProfiles;

    public void validate(WorkflowDefinition definition) {
        if (definition.getName() == null || definition.getName().isBlank()) {
            throw new ValidationException("Workflow name is required");
        }

        List<WorkflowTask> tasks = definition.getTasks();
        if (tasks == null || tasks.isEmpty()) {
            throw new ValidationException("Workflow must contain at least one task");
        }

        Set<String> taskIds = new HashSet<>();
        for (WorkflowTask task : tasks) {
            if (task.getTaskId() == null || task.getTaskId().isBlank()) {
                throw new ValidationException("Task ID is required");
            }
            if (!taskIds.add(task.getTaskId())) {
                throw new ValidationException("Duplicate task ID: " + task.getTaskId());
            }
        }

        for (WorkflowTask task : tasks) {
            if (task.getType() == TaskType.HUMAN_TASK
                    && task.getParameters() instanceof HumanTaskParameters params) {
                validateHumanRouting(task.getTaskId(), params, taskIds);
            } else if (task.getType() == TaskType.CONNECTOR_TASK
                    && task.getParameters() instanceof ConnectorTaskParameters params) {
                validateConnectorTask(task.getTaskId(), params);
            } else if (task.getType() == TaskType.WAIT
                    && task.getParameters() instanceof WaitTaskParameters params) {
                validateWaitTask(task.getTaskId(), params);
            } else if (task.getType() == TaskType.AGENTS_TASK
                    && task.getParameters() instanceof AgentsTaskParameters params) {
                validateAgentsTask(task.getTaskId(), params);
            } else if (task.getType() == TaskType.MCP_TOOL
                    && task.getParameters() instanceof McpToolTaskParameters params) {
                validateMcpToolTask(task.getTaskId(), params);
            }
        }

        validateGraph(tasks, taskIds);
        validateBranchJoinTopology(definition);

        TriggerConfig trigger = definition.getTrigger();
        if (trigger != null && trigger.getType() == TriggerType.POLL && trigger.getPoll() != null) {
            validatePollTrigger(trigger);
        }
        if (trigger != null && trigger.getType() == TriggerType.WEBHOOK && trigger.getWebhook() != null) {
            WebhookConfig webhook = trigger.getWebhook();
            validateWebhookInbound(webhook);
            if (webhook.isSubscribeMode()) {
                validateWebhookSubscribe(webhook);
            }
        }
        if (trigger != null && trigger.getType() == TriggerType.MCP && trigger.getMcp() != null) {
            validateMcpTrigger(definition, trigger.getMcp());
        }
    }

    void validateMcpTrigger(WorkflowDefinition definition, McpTriggerConfig mcp) {
        if (!mcp.isActive()) {
            return;
        }

        String toolName = mcp.getToolName();
        if (toolName == null || toolName.isBlank()) {
            throw new ValidationException("MCP trigger requires toolName when active");
        }
        if (!MCP_TOOL_NAME_PATTERN.matcher(toolName).matches()) {
            throw new ValidationException(
                    "MCP toolName must start with a letter and contain only letters, numbers, underscores, or hyphens");
        }

        if (mcp.getResponseMode() == McpResponseMode.TASK_OUTPUT) {
            if (mcp.getResponseTaskId() == null || mcp.getResponseTaskId().isBlank()) {
                throw new ValidationException("MCP trigger TASK_OUTPUT mode requires responseTaskId");
            }
            boolean taskExists = definition.getTasks() != null
                    && definition.getTasks().stream()
                            .anyMatch(task -> mcp.getResponseTaskId().equals(task.getTaskId()));
            if (!taskExists) {
                throw new ValidationException(
                        "MCP trigger responseTaskId references unknown task: " + mcp.getResponseTaskId());
            }
        }

        if (mcp.getWaitTimeoutSeconds() != null && mcp.getWaitTimeoutSeconds() <= 0) {
            throw new ValidationException("MCP waitTimeoutSeconds must be positive");
        }

        String definitionId = definition.getId();
        for (WorkflowDefinition other : definitionRepository.findAll()) {
            if (definitionId != null && definitionId.equals(other.getId())) {
                continue;
            }
            if (other.getTrigger() == null
                    || other.getTrigger().getType() != TriggerType.MCP
                    || other.getTrigger().getMcp() == null
                    || !other.getTrigger().getMcp().isActive()) {
                continue;
            }
            if (toolName.equals(other.getTrigger().getMcp().getToolName())) {
                throw new ValidationException("MCP toolName must be unique within the organization: " + toolName);
            }
        }
    }

    void validatePollTrigger(TriggerConfig trigger) {
        PollConfig poll = trigger.getPoll();
        if (!poll.isActive()) {
            return;
        }

        PollHttpConfig http = poll.getHttp();
        if (http == null || http.getUrl() == null || http.getUrl().isBlank()) {
            throw new ValidationException("Poll trigger requires an HTTP URL when active");
        }

        validateExternalHttpUrl(http.getUrl());

        PollScheduleConfig schedule = poll.getSchedule();
        if (schedule == null) {
            throw new ValidationException("Poll trigger requires a schedule configuration");
        }

        if (schedule.getMode() == PollScheduleMode.FIXED_INTERVAL) {
            Long interval = schedule.getIntervalSeconds();
            if (interval == null || interval <= 0) {
                throw new ValidationException("Poll intervalSeconds must be a positive value");
            }
            long min = apiProperties.getPoll().getMinIntervalSeconds();
            long max = apiProperties.getPoll().getMaxIntervalSeconds();
            if (interval < min || interval > max) {
                throw new ValidationException(
                        "Poll interval must be between " + min + " and " + max + " seconds (got " + interval + ")");
            }
        } else if (schedule.getMode() == PollScheduleMode.CRON) {
            String cron = schedule.getCronExpression();
            if (cron == null || cron.isBlank()) {
                throw new ValidationException("Poll cron expression is required for CRON schedule mode");
            }
            validateCronExpression(cron);
        }

        ChangeDetectionConfig detection = poll.getDetection();
        if (detection != null && detection.getMaxItemsPerPoll() != null) {
            int cap = apiProperties.getPoll().getMaxItemsPerPoll();
            if (detection.getMaxItemsPerPoll() > cap) {
                throw new ValidationException(
                        "maxItemsPerPoll (" + detection.getMaxItemsPerPoll() + ") exceeds platform limit of " + cap);
            }
        }

        if (poll.getSemantics() == PollEventSemantics.RESPONSE_CHANGED
                && detection != null
                && detection.getItemsPath() != null
                && !detection.getItemsPath().isBlank()) {
            // itemsPath is ignored for RESPONSE_CHANGED — no hard error in v1
        }
    }

    void validateWebhookInbound(WebhookConfig webhook) {
        if (!webhook.isActive()) {
            return;
        }
        WebhookInboundConfig inbound = webhook.getInbound();
        if (inbound == null) {
            return;
        }
        validateInboundSettings(inbound);
    }

    void validateWebhookSubscribe(WebhookConfig webhook) {
        if (!webhook.isActive()) {
            return;
        }

        PollHttpConfig subscribeHttp = webhook.getSubscribeHttp();
        if (subscribeHttp == null || subscribeHttp.getUrl() == null || subscribeHttp.getUrl().isBlank()) {
            throw new ValidationException("Webhook subscribe trigger requires a subscribe HTTP URL when active");
        }
        validateExternalHttpUrl(subscribeHttp.getUrl());

        PollHttpConfig unsubscribeHttp = webhook.getUnsubscribeHttp();
        if (unsubscribeHttp == null || unsubscribeHttp.getUrl() == null || unsubscribeHttp.getUrl().isBlank()) {
            throw new ValidationException("Webhook subscribe trigger requires an unsubscribe HTTP URL when active");
        }
        validateExternalHttpUrl(unsubscribeHttp.getUrl());

        if (webhook.getSubscriptionIdPath() == null || webhook.getSubscriptionIdPath().isBlank()) {
            throw new ValidationException(
                    "Webhook subscribe trigger requires subscriptionIdPath when active");
        }

        if (webhook.getInbound() != null) {
            validateInboundSettings(webhook.getInbound());
        }
    }

    private void validateInboundSettings(WebhookInboundConfig inbound) {
        if (inbound.isIgnoreDuplicates()
                && (inbound.getEventIdPath() == null || inbound.getEventIdPath().isBlank())) {
            throw new ValidationException(
                    "Webhook inbound requires eventIdPath when ignoreDuplicates is enabled");
        }

        WebhookVerificationMode mode = inbound.getVerificationMode() != null
                ? inbound.getVerificationMode()
                : WebhookVerificationMode.NONE;

        if (mode == WebhookVerificationMode.HEADER_SECRET || mode == WebhookVerificationMode.HMAC_SHA256) {
            if (inbound.getHeaderName() == null || inbound.getHeaderName().isBlank()) {
                throw new ValidationException("Webhook verification requires a header name");
            }
        }

        if (mode == WebhookVerificationMode.CHALLENGE) {
            if (inbound.getChallengeQueryParam() == null || inbound.getChallengeQueryParam().isBlank()) {
                throw new ValidationException("Webhook challenge verification requires a challenge query parameter");
            }
        }
    }

    void validateExternalHttpUrl(String url) {
        try {
            URI uri = URI.create(url);
            String scheme = uri.getScheme();
            if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
                throw new ValidationException("External HTTP URL must use http or https scheme");
            }

            if (isProductionProfile()) {
                String host = uri.getHost();
                if (host != null) {
                    validateHostNotPrivate(host);
                }
            }
        } catch (IllegalArgumentException e) {
            throw new ValidationException("Invalid external HTTP URL: " + e.getMessage());
        }
    }

    private void validatePollUrl(String url) {
        validateExternalHttpUrl(url);
    }

    private void validateHostNotPrivate(String host) {
        if ("localhost".equalsIgnoreCase(host) || host.endsWith(".local")) {
            throw new ValidationException("Poll URL must not target private or local addresses in production");
        }
        try {
            InetAddress address = InetAddress.getByName(host);
            if (address.isAnyLocalAddress()
                    || address.isLoopbackAddress()
                    || address.isLinkLocalAddress()
                    || address.isSiteLocalAddress()) {
                throw new ValidationException("Poll URL must not target private or local addresses in production");
            }
        } catch (UnknownHostException e) {
            throw new ValidationException("Poll URL host could not be resolved: " + host);
        }
    }

    private void validateCronExpression(String cron) {
        try {
            CronExpression.parse(cron);
        } catch (IllegalArgumentException e) {
            throw new ValidationException("Invalid poll cron expression: " + e.getMessage());
        }
    }

    private boolean isProductionProfile() {
        return activeProfiles != null && activeProfiles.contains("prod");
    }

    private void validateHumanRouting(String taskId, HumanTaskParameters params, Set<String> taskIds) {
        validateOptionalRef(taskId, params.getApprovedNextTaskId(), taskIds, "approvedNextTaskId");
        validateOptionalRef(taskId, params.getRejectedNextTaskId(), taskIds, "rejectedNextTaskId");
    }

    private void validateOptionalRef(String taskId, String ref, Set<String> taskIds, String field) {
        if (ref == null || ref.isBlank()) {
            return;
        }
        if (ref.equals(taskId)) {
            throw new ValidationException("Human task " + taskId + " cannot route to itself (" + field + ")");
        }
        if (!taskIds.contains(ref)) {
            throw new ValidationException("Human task " + taskId + " references unknown task in " + field + ": " + ref);
        }
    }

    private void validateConnectorTask(String taskId, ConnectorTaskParameters params) {
        if (params.getConnectorId() == null || params.getConnectorId().isBlank()) {
            throw new ValidationException("Connector ID is required for connector task: " + taskId);
        }
        if (params.getActionId() == null || params.getActionId().isBlank()) {
            throw new ValidationException("Action ID is required for connector task: " + taskId);
        }
        var manifest = connectorRegistry.findById(params.getConnectorId())
                .orElseThrow(() -> new ValidationException("Unknown connector ID '" + params.getConnectorId() + "' in task: " + taskId));
        manifest.getActions().stream()
                .filter(a -> a.getActionId().equals(params.getActionId()))
                .findFirst()
                .orElseThrow(() -> new ValidationException("Unknown action ID '" + params.getActionId() + "' for connector '" + params.getConnectorId() + "' in task: " + taskId));
    }

    private void validateWaitTask(String taskId, WaitTaskParameters params) {
        Long duration = params.getDuration();
        if (duration == null || duration < WaitTaskParameters.MIN_DURATION_MS) {
            throw new ValidationException(
                    "Wait task " + taskId + " duration must be at least 1 second (1000 ms)");
        }
    }

    private void validateMcpToolTask(String taskId, McpToolTaskParameters params) {
        if (params.getCredentialId() == null || params.getCredentialId().isBlank()) {
            throw new ValidationException("MCP_TOOL task " + taskId + " requires credentialId");
        }
        if (params.getRemoteToolName() == null || params.getRemoteToolName().isBlank()) {
            throw new ValidationException("MCP_TOOL task " + taskId + " requires remoteToolName");
        }
        if (params.getTimeoutSeconds() != null && params.getTimeoutSeconds() <= 0) {
            throw new ValidationException("MCP_TOOL task " + taskId + " timeoutSeconds must be positive");
        }

        IntegrationCredential credential = integrationCredentialRepository.findById(params.getCredentialId())
                .orElseThrow(() -> new ValidationException(
                        "MCP_TOOL task " + taskId + " references unknown credential: " + params.getCredentialId()));
        if (!IntegrationCredentialTypes.MCP_SERVER.equals(credential.getType())) {
            throw new ValidationException(
                    "MCP_TOOL task " + taskId + " credential must be type MCP_SERVER");
        }
    }

    private void validateAgentsTask(String taskId, AgentsTaskParameters params) {
        if (params.getTools() == null || params.getTools().isEmpty()) {
            return;
        }

        Set<String> llmToolNames = new HashSet<>();
        for (AgentsTaskParameters.AgentTool tool : params.getTools()) {
            if (AgentsTaskParameters.isMcpTool(tool)) {
                if (tool.getCredentialId() == null || tool.getCredentialId().isBlank()) {
                    throw new ValidationException(
                            "Agents task " + taskId + " MCP tool requires credentialId");
                }
                if (tool.getRemoteToolName() == null || tool.getRemoteToolName().isBlank()) {
                    throw new ValidationException(
                            "Agents task " + taskId + " MCP tool requires remoteToolName");
                }
                if (tool.getTargetTaskId() != null && !tool.getTargetTaskId().isBlank()) {
                    throw new ValidationException(
                            "Agents task " + taskId + " MCP tool must not set targetTaskId");
                }
            } else {
                if (tool.getTargetTaskId() == null || tool.getTargetTaskId().isBlank()) {
                    throw new ValidationException(
                            "Agents task " + taskId + " task tool requires targetTaskId");
                }
                if (tool.getName() == null || tool.getName().isBlank()) {
                    throw new ValidationException(
                            "Agents task " + taskId + " task tool requires name");
                }
            }

            String llmName = resolveAgentsLlmToolName(tool);
            if (!llmToolNames.add(llmName)) {
                throw new ValidationException(
                        "Agents task " + taskId + " has duplicate LLM tool name: " + llmName);
            }
        }
    }

    private String resolveAgentsLlmToolName(AgentsTaskParameters.AgentTool tool) {
        if (AgentsTaskParameters.isMcpTool(tool)) {
            String credentialName = integrationCredentialRepository.findById(tool.getCredentialId())
                    .map(IntegrationCredential::getName)
                    .orElse("mcp");
            return AgentsTaskParameters.resolveLlmToolName(tool, credentialName);
        }
        return tool.getName();
    }

    private void validateGraph(List<WorkflowTask> tasks, Set<String> taskIds) {
        java.util.Map<String, List<String>> adjList = new java.util.HashMap<>();
        for (int i = 0; i < tasks.size(); i++) {
            WorkflowTask task = tasks.get(i);
            String taskId = task.getTaskId();
            List<String> edges = new java.util.ArrayList<>();
            boolean hasExplicit = false;

            if (task.getNextTaskId() != null && !task.getNextTaskId().isBlank()) {
                edges.add(task.getNextTaskId());
                hasExplicit = true;
            }

            if (task.getType() == TaskType.CONDITIONAL && task.getParameters() instanceof com.app.common.model.task.parameters.ConditionalTaskParameters params) {
                hasExplicit = true;
                if (params.getDefaultNextTaskId() != null && !params.getDefaultNextTaskId().isBlank()) {
                    edges.add(params.getDefaultNextTaskId());
                }
                if (params.getBranches() != null) {
                    for (var branch : params.getBranches()) {
                        if (branch.getNextTaskId() != null && !branch.getNextTaskId().isBlank()) {
                            edges.add(branch.getNextTaskId());
                        }
                    }
                }
            } else if (task.getType() == TaskType.HUMAN_TASK && task.getParameters() instanceof HumanTaskParameters params) {
                hasExplicit = true;
                if (params.getApprovedNextTaskId() != null && !params.getApprovedNextTaskId().isBlank()) {
                    edges.add(params.getApprovedNextTaskId());
                }
                if (params.getRejectedNextTaskId() != null && !params.getRejectedNextTaskId().isBlank()) {
                    edges.add(params.getRejectedNextTaskId());
                }
            } else if (task.getType() == TaskType.BRANCH && task.getParameters() instanceof BranchTaskParameters params) {
                hasExplicit = true;
                if (params.getBranches() != null) {
                    for (var branch : params.getBranches()) {
                        if (branch.getStartTaskId() != null && !branch.getStartTaskId().isBlank()) {
                            edges.add(branch.getStartTaskId());
                        }
                    }
                }
            } else if (task.getType() == TaskType.JOIN && task.getParameters() instanceof JoinTaskParameters params) {
                hasExplicit = true;
                if (params.getNextTaskId() != null && !params.getNextTaskId().isBlank()) {
                    edges.add(params.getNextTaskId());
                }
            } else if (task.getType() == TaskType.ITERATOR_TASK && task.getParameters() instanceof com.app.common.model.task.parameters.IteratorTaskParameters params) {
                hasExplicit = true;
                if (params.getDoneNextTaskId() != null && !params.getDoneNextTaskId().isBlank()) {
                    edges.add(params.getDoneNextTaskId());
                }
            }

            if (!hasExplicit) {
                for (int j = i + 1; j < tasks.size(); j++) {
                    if (!Boolean.TRUE.equals(tasks.get(j).getIsTool())) {
                        edges.add(tasks.get(j).getTaskId());
                        break;
                    }
                }
            }

            for (String edge : edges) {
                if (!taskIds.contains(edge)) {
                    throw new ValidationException("Task " + taskId + " references unknown task: " + edge);
                }
            }

            adjList.put(taskId, edges);
        }

        java.util.Map<String, Integer> state = new java.util.HashMap<>();
        for (String taskId : taskIds) {
            state.put(taskId, 0);
        }

        for (String taskId : taskIds) {
            if (state.get(taskId) == 0) {
                if (hasCycle(taskId, adjList, state)) {
                    throw new ValidationException("Workflow contains an infinite loop/cycle which is not permitted.");
                }
            }
        }
    }

    void validateBranchJoinTopology(WorkflowDefinition definition) {
        List<WorkflowTask> tasks = definition.getTasks();
        if (tasks == null) {
            return;
        }

        WorkflowGraph graph = WorkflowTopologyResolver.graphFromDefinition(definition);
        Map<String, String> inboundOwner = new java.util.HashMap<>();

        for (WorkflowTask task : tasks) {
            if (task.getType() == TaskType.JOIN && task.getParameters() instanceof JoinTaskParameters params) {
                String joinId = task.getTaskId();
                List<String> declared = params.getInboundTaskIds() != null
                        ? params.getInboundTaskIds()
                        : List.of();
                List<String> resolved = WorkflowTopologyResolver.resolveJoinInbounds(joinId, graph);

                if (declared.isEmpty()) {
                    throw new ValidationException("JOIN task " + joinId + " requires at least one inbound task");
                }

                if (!declared.equals(resolved)) {
                    throw new ValidationException(
                            "JOIN task " + joinId + " inboundTaskIds do not match topology wires");
                }

                Set<String> seen = new HashSet<>();
                for (String inboundId : declared) {
                    if (!seen.add(inboundId)) {
                        throw new ValidationException("JOIN task " + joinId + " has duplicate inbound: " + inboundId);
                    }
                    if (inboundId.equals(joinId)) {
                        throw new ValidationException("JOIN task " + joinId + " cannot reference itself as inbound");
                    }
                    if (!graph.getTasksById().containsKey(inboundId)) {
                        throw new ValidationException(
                                "JOIN task " + joinId + " references unknown inbound task: " + inboundId);
                    }
                    if (!WorkflowTopologyResolver.isLeafInbound(inboundId, joinId, graph)) {
                        throw new ValidationException(
                                "JOIN task " + joinId + " inbound " + inboundId + " must be a leaf task (not BRANCH/JOIN)");
                    }
                    String previousOwner = inboundOwner.put(inboundId, joinId);
                    if (previousOwner != null) {
                        throw new ValidationException(
                                "Task " + inboundId + " is an inbound for multiple JOIN tasks");
                    }
                }

                if (params.getWaitPolicy() == JoinWaitPolicy.QUORUM) {
                    Integer quorum = params.getQuorumCount();
                    if (quorum == null || quorum < 1 || quorum > declared.size()) {
                        throw new ValidationException(
                                "JOIN task " + joinId + " quorumCount must be between 1 and inbound count");
                    }
                }
            }
        }
    }

    private boolean hasCycle(String startNode, java.util.Map<String, List<String>> adjList, java.util.Map<String, Integer> state) {
        java.util.Stack<String> stack = new java.util.Stack<>();
        stack.push(startNode);

        while (!stack.isEmpty()) {
            String node = stack.peek();

            if (state.get(node) == 0) {
                state.put(node, 1);
                List<String> edges = adjList.getOrDefault(node, List.of());
                boolean hasUnvisited = false;
                for (String neighbor : edges) {
                    int neighborState = state.get(neighbor);
                    if (neighborState == 1) {
                        return true;
                    } else if (neighborState == 0) {
                        stack.push(neighbor);
                        hasUnvisited = true;
                    }
                }
                if (hasUnvisited) {
                    continue;
                }
            }

            if (state.get(node) == 1) {
                state.put(node, 2);
            }
            stack.pop();
        }
        return false;
    }
}

# Core engine feature status

Last updated: 2026-10-14

| Feature | Complete | Incomplete | Tests | Known risks |
|---------|----------|------------|-------|-------------|
| **AGENTS_TASK** | ReAct loop, MCP + task tools, streaming events, loop/tool warnings, OpenAI stream usage when provider sends usage chunk | Live LLM/MCP integration not in unit tests; Anthropic/Gemini stream token counts not parsed | `AgentsTaskExecutorTest`, `OpenAiProviderAdapterStreamTest`, `WorkflowDefinitionValidatorTest`, `agentsTaskPlugin.test.ts` | Needs real API keys for E2E; MCP prefetch fails soft (empty tool list) |
| **WAIT** | Delay dispatch + PAUSED + audit data | Variable substitution for duration limited (numeric path) | `WaitTaskExecutorTest` | Depends on message dispatcher / worker to resume |
| **SCRIPT_TASK** | Graal JS via `ScriptEvaluationService` | Timeout path lightly covered | `ScriptTaskExecutorTest` | Sandbox limits depend on script service config |
| **DATA_TRANSFORM** | JSONPath and utility ops | Some enum ops marked unimplemented throw | `DataTransformTaskExecutorTest` | Invalid params now FAILED (not NPE) |
| **DB_TASK** | JDBC CRUD paths | No integration test without Postgres | `DbTaskExecutorTest` (validation only) | SQL injection risk mitigated by prepared statements where used |
| **MONGO_TASK** | Driver-based ops | No integration test without Mongo | `MongoTaskExecutorTest` (validation only) | Connection string from credentials |
| **REDIS_TASK** | Jedis GET/SET etc. | No integration test without Redis | `RedisTaskExecutorTest` (credential guard) | Host/port from credentials |
| **NEO4J_TASK** | Cypher execution | No integration test without Neo4j | `Neo4jTaskExecutorTest` (validation only) | Driver lifecycle per execution |
| **SMTP** | Send mail flow | — | `SmtpTaskExecutorTest` | External SMTP in E2E only |
| **MCP_TOOL** | Standalone MCP invoke | — | `McpToolTaskExecutorTest` | Live MCP server in E2E |
| **HTTP / CONNECTOR** | Existing coverage | — | `HttpTaskExecutorTest`, `ConnectorTaskExecutorTest` | External HTTP in E2E |
| **CONDITIONAL** | Branch routing + audit trace | — | `ConditionalTaskExecutorTest` | Branch eval errors now FAILED with trace |
| **FORM** (trigger + unified `FORM` task) | Public hosted `/f/{slug}`, test URL (`?test=1`), session tokens, submission store (encrypted answers), studio builder (stack/grid), submissions inbox in studio, unified `FORM` task supporting INPUT, COMPLETION, and INPUT_AND_COMPLETE modes | File upload, virus scan, rate limit, full SpEL `visibleWhen` (basic rules only) | `FormTaskExecutorTest`, `FormAnswerValidatorTest`, `FormSlugUtilsTest`, `formTaskPlugin.test.ts` | CUSTOM_HTML is trusted author content; live multi-page E2E needs Docker stack |


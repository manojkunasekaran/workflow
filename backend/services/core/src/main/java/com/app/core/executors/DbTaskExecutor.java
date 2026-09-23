package com.app.core.executors;

import com.app.common.entity.WorkflowExecution;
import com.app.common.model.task.TaskType;
import com.app.common.model.task.WorkflowTask;
import com.app.common.model.task.execution.DbTaskExecutionData;
import com.app.common.model.task.execution.TaskExecutionResult;
import com.app.common.model.task.parameters.DbTaskParameters;
import com.app.core.model.ExecutionContext;
import com.app.core.service.CredentialProvider;
import com.app.core.service.TaskExecutor;
import com.app.core.service.VariableResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Executes a DB_TASK node.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DbTaskExecutor implements TaskExecutor {

    private final VariableResolver variableResolver;
    private final CredentialProvider credentialProvider;

    @Override
    public boolean canExecute(TaskType taskType) {
        return TaskType.DB_TASK == taskType;
    }

    @Override
    public TaskExecutionResult execute(WorkflowTask task, WorkflowExecution execution, ExecutionContext context) {
        log.info("Starting execution of DB Task: {}", task.getTaskId());

        DbTaskParameters params = null;
        String operation = "UNKNOWN";
        String table = null;
        long startTime = System.currentTimeMillis();

        try {
            if (!(task.getParameters() instanceof DbTaskParameters)) {
                return failResult("Invalid parameters for DB task", operation, table, "Invalid parameters", null);
            }
            params = (DbTaskParameters) task.getParameters();
            operation = params.getOperation() != null ? params.getOperation().toUpperCase() : "SELECT";
            table = variableResolver.resolveString(params.getTable(), context);

            String credentialId = variableResolver.resolveString(params.getCredentialId(), context);
            if (credentialId == null || credentialId.isBlank()) {
                return failResult("Connection credential is required", operation, table, "Connection credential is required", null);
            }

            com.app.common.entity.IntegrationCredential credential = credentialProvider
                    .resolveCredential(credentialId, null, context)
                    .orElseThrow(() -> new IllegalArgumentException("Credential not found or access denied: " + credentialId));

            Map<String, String> creds = credential.getCredentials();
            if (creds == null) {
                return failResult("Credential has no connection fields configured", operation, table, "Empty credentials map", null);
            }
            String actualConnectorId = credential.getConnectorId();

            String host = creds.get("host");
            String port = creds.get("port");
            String database = creds.get("database");
            String username = creds.get("username");
            String password = creds.get("password");
            String sslStr = creds.get("ssl");
            boolean ssl = Boolean.parseBoolean(sslStr);

            String jdbcUrl = buildJdbcUrl(actualConnectorId, host, port, database, ssl);

            try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
                return executeOperation(conn, params, context, operation, table, startTime);
            }
        } catch (SQLException e) {
            log.error("DB Task [{}] — SQL Exception: {}", task.getTaskId(), e.getMessage(), e);
            return failResult("SQL Error: " + e.getMessage(), operation, table, e.getMessage(), System.currentTimeMillis() - startTime);
        } catch (Exception e) {
            log.error("DB Task [{}] — Exception: {}", task.getTaskId(), e.getMessage(), e);
            return failResult("Error: " + e.getMessage(), operation, table, e.getMessage(), System.currentTimeMillis() - startTime);
        }
    }

    private TaskExecutionResult executeOperation(Connection conn, DbTaskParameters params, ExecutionContext context, String operation, String table, long startTime) throws SQLException {
        int timeout = params.getQueryTimeout() != null ? params.getQueryTimeout() : 30;

        if ("RAW".equals(operation)) {
            String query = variableResolver.resolveString(params.getQuery(), context);
            List<Object> resolvedParams = new ArrayList<>();
            if (params.getParameters() != null) {
                for (DbTaskParameters.DbQueryParameter p : params.getParameters()) {
                    resolvedParams.add(variableResolver.resolveValue(p.getValue(), context));
                }
            }

            try (PreparedStatement pstmt = conn.prepareStatement(query)) {
                pstmt.setQueryTimeout(timeout);
                for (int i = 0; i < resolvedParams.size(); i++) {
                    pstmt.setObject(i + 1, resolvedParams.get(i));
                }

                boolean isResultSet = pstmt.execute();
                DbTaskExecutionData.DbTaskExecutionDataBuilder dataBuilder = DbTaskExecutionData.builder()
                        .operation(operation)
                        .resolvedQuery(query)
                        .status("SUCCESS");

                if (isResultSet) {
                    try (ResultSet rs = pstmt.getResultSet()) {
                        List<Map<String, Object>> rows = extractRows(rs);
                        dataBuilder.rows(rows);
                        if (!rows.isEmpty()) {
                            dataBuilder.firstRow(rows.get(0));
                        }
                    }
                } else {
                    dataBuilder.rowsAffected(pstmt.getUpdateCount());
                }

                dataBuilder.durationMs(System.currentTimeMillis() - startTime);
                DbTaskExecutionData data = dataBuilder.build();
                return buildSuccess(data);
            }
        }

        // SELECT, INSERT, UPDATE, DELETE
        StringBuilder sql = new StringBuilder();
        List<Object> bindValues = new ArrayList<>();

        if ("SELECT".equals(operation)) {
            sql.append("SELECT * FROM ").append(table);
            appendConditions(sql, bindValues, params.getConditions(), params.getConditionParameters(), context);
            
            // Hard limit of 1000 to prevent massive result sets
            int limit = params.getLimit() != null ? params.getLimit() : 100;
            if (limit > 1000) limit = 1000;
            // ANSI SQL fallback. For MSSQL TOP is usually used, but FETCH FIRST is standard in modern MSSQL too.
            // Postgres and MySQL support LIMIT. For simplicity, we just use LIMIT or standard ANSI.
            // A more robust approach uses dialect specific syntax. We'll use the driver's metadata to decide.
            String dbProductName = conn.getMetaData().getDatabaseProductName().toLowerCase();
            if (dbProductName.contains("microsoft") || dbProductName.contains("sql server")) {
                // Older MSSQL uses TOP
                sql.insert(7, "TOP " + limit + " ");
            } else {
                sql.append(" LIMIT ").append(limit);
            }

            try (PreparedStatement pstmt = conn.prepareStatement(sql.toString())) {
                pstmt.setQueryTimeout(timeout);
                for (int i = 0; i < bindValues.size(); i++) {
                    pstmt.setObject(i + 1, bindValues.get(i));
                }
                try (ResultSet rs = pstmt.executeQuery()) {
                    List<Map<String, Object>> rows = extractRows(rs);
                    DbTaskExecutionData.DbTaskExecutionDataBuilder dataBuilder = DbTaskExecutionData.builder()
                            .operation(operation)
                            .table(table)
                            .resolvedQuery(sql.toString())
                            .status("SUCCESS")
                            .durationMs(System.currentTimeMillis() - startTime);

                    if ("FIRST_ROW".equals(params.getReturnMode())) {
                        dataBuilder.firstRow(rows.isEmpty() ? null : rows.get(0));
                    } else {
                        dataBuilder.rows(rows);
                        if (!rows.isEmpty()) {
                            dataBuilder.firstRow(rows.get(0));
                        }
                    }
                    return buildSuccess(dataBuilder.build());
                }
            }

        } else if ("INSERT".equals(operation)) {
            sql.append("INSERT INTO ").append(table);
            if (params.getValues() != null && !params.getValues().isEmpty()) {
                sql.append(" (");
                StringBuilder placeholders = new StringBuilder(" VALUES (");
                boolean first = true;
                for (Map.Entry<String, Object> entry : params.getValues().entrySet()) {
                    if (!first) {
                        sql.append(", ");
                        placeholders.append(", ");
                    }
                    sql.append(entry.getKey());
                    placeholders.append("?");
                    bindValues.add(variableResolver.resolveValue(entry.getValue(), context));
                    first = false;
                }
                sql.append(")");
                placeholders.append(")");
                sql.append(placeholders);
            }

            try (PreparedStatement pstmt = conn.prepareStatement(sql.toString(), Statement.RETURN_GENERATED_KEYS)) {
                pstmt.setQueryTimeout(timeout);
                for (int i = 0; i < bindValues.size(); i++) {
                    pstmt.setObject(i + 1, bindValues.get(i));
                }
                int affected = pstmt.executeUpdate();
                Object generatedKey = null;
                try (ResultSet rs = pstmt.getGeneratedKeys()) {
                    if (rs.next()) {
                        generatedKey = rs.getObject(1);
                    }
                }
                
                DbTaskExecutionData data = DbTaskExecutionData.builder()
                        .operation(operation)
                        .table(table)
                        .resolvedQuery(sql.toString())
                        .rowsAffected(affected)
                        .generatedKey(generatedKey)
                        .status("SUCCESS")
                        .durationMs(System.currentTimeMillis() - startTime)
                        .build();
                return buildSuccess(data);
            }

        } else if ("UPDATE".equals(operation)) {
            sql.append("UPDATE ").append(table).append(" SET ");
            if (params.getValues() != null && !params.getValues().isEmpty()) {
                boolean first = true;
                for (Map.Entry<String, Object> entry : params.getValues().entrySet()) {
                    if (!first) {
                        sql.append(", ");
                    }
                    sql.append(entry.getKey()).append(" = ?");
                    bindValues.add(variableResolver.resolveValue(entry.getValue(), context));
                    first = false;
                }
            }
            appendConditions(sql, bindValues, params.getConditions(), params.getConditionParameters(), context);

            try (PreparedStatement pstmt = conn.prepareStatement(sql.toString())) {
                pstmt.setQueryTimeout(timeout);
                for (int i = 0; i < bindValues.size(); i++) {
                    pstmt.setObject(i + 1, bindValues.get(i));
                }
                int affected = pstmt.executeUpdate();
                
                DbTaskExecutionData data = DbTaskExecutionData.builder()
                        .operation(operation)
                        .table(table)
                        .resolvedQuery(sql.toString())
                        .rowsAffected(affected)
                        .status("SUCCESS")
                        .durationMs(System.currentTimeMillis() - startTime)
                        .build();
                return buildSuccess(data);
            }

        } else if ("DELETE".equals(operation)) {
            sql.append("DELETE FROM ").append(table);
            appendConditions(sql, bindValues, params.getConditions(), params.getConditionParameters(), context);

            try (PreparedStatement pstmt = conn.prepareStatement(sql.toString())) {
                pstmt.setQueryTimeout(timeout);
                for (int i = 0; i < bindValues.size(); i++) {
                    pstmt.setObject(i + 1, bindValues.get(i));
                }
                int affected = pstmt.executeUpdate();
                
                DbTaskExecutionData data = DbTaskExecutionData.builder()
                        .operation(operation)
                        .table(table)
                        .resolvedQuery(sql.toString())
                        .rowsAffected(affected)
                        .status("SUCCESS")
                        .durationMs(System.currentTimeMillis() - startTime)
                        .build();
                return buildSuccess(data);
            }
        }
        
        return failResult("Unsupported operation: " + operation, operation, table, "Unsupported operation", System.currentTimeMillis() - startTime);
    }

    private void appendConditions(StringBuilder sql, List<Object> bindValues, String conditions, List<DbTaskParameters.DbQueryParameter> conditionParameters, ExecutionContext context) {
        String resolvedConditions = variableResolver.resolveString(conditions, context);
        if (resolvedConditions != null && !resolvedConditions.isBlank()) {
            sql.append(" WHERE ").append(resolvedConditions);
            if (conditionParameters != null) {
                for (DbTaskParameters.DbQueryParameter p : conditionParameters) {
                    bindValues.add(variableResolver.resolveValue(p.getValue(), context));
                }
            }
        }
    }

    private List<Map<String, Object>> extractRows(ResultSet rs) throws SQLException {
        List<Map<String, Object>> rows = new ArrayList<>();
        ResultSetMetaData meta = rs.getMetaData();
        int colCount = meta.getColumnCount();
        while (rs.next()) {
            Map<String, Object> row = new HashMap<>();
            for (int i = 1; i <= colCount; i++) {
                row.put(meta.getColumnLabel(i), rs.getObject(i));
            }
            rows.add(row);
        }
        return rows;
    }

    private String buildJdbcUrl(String connectorId, String host, String port, String database, boolean ssl) {
        if ("postgresql".equals(connectorId)) {
            String p = (port != null && !port.isBlank()) ? port : "5432";
            return String.format("jdbc:postgresql://%s:%s/%s?sslmode=%s", host, p, database, ssl ? "require" : "disable");
        } else if ("mysql".equals(connectorId)) {
            String p = (port != null && !port.isBlank()) ? port : "3306";
            return String.format("jdbc:mysql://%s:%s/%s?useSSL=%s&serverTimezone=UTC", host, p, database, ssl);
        } else if ("mssql".equals(connectorId)) {
            String p = (port != null && !port.isBlank()) ? port : "1433";
            return String.format("jdbc:sqlserver://%s:%s;databaseName=%s;encrypt=%s", host, p, database, ssl);
        } else if ("mariadb".equals(connectorId)) {
            String p = (port != null && !port.isBlank()) ? port : "3306";
            return String.format("jdbc:mariadb://%s:%s/%s?useSSL=%s", host, p, database, ssl);
        } else if ("oracle".equals(connectorId)) {
            String p = (port != null && !port.isBlank()) ? port : "1521";
            return String.format("jdbc:oracle:thin:@//%s:%s/%s", host, p, database);
        } else if ("sqlite".equals(connectorId)) {
            return String.format("jdbc:sqlite:%s", database);
        }
        throw new IllegalArgumentException("Unsupported database type: " + connectorId);
    }

    private TaskExecutionResult buildSuccess(DbTaskExecutionData data) {
        return TaskExecutionResult.builder()
                .status(TaskExecutionResult.Status.COMPLETED)
                .executionData(data)
                .output(data.toOutputMap())
                .build();
    }

    private TaskExecutionResult failResult(String errorMessage, String operation, String table, String cause, Long durationMs) {
        DbTaskExecutionData data = DbTaskExecutionData.builder()
                .operation(operation)
                .table(table)
                .status("FAILED")
                .errorMessage(cause != null ? cause : errorMessage)
                .durationMs(durationMs)
                .build();
        return TaskExecutionResult.builder()
                .status(TaskExecutionResult.Status.FAILED)
                .errorMessage(errorMessage)
                .executionData(data)
                .output(data.toOutputMap())
                .build();
    }
}

package com.app.common.connector;

import lombok.Data;

import java.util.List;

/** Wrapper for classpath trigger preset files under {@code connectors/triggers/}. */
@Data
public class ConnectorTriggerBundle {
    private String connectorId;
    private List<ConnectorTrigger> triggers;
}

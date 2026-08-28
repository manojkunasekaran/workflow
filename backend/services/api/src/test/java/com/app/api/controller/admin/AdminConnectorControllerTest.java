package com.app.api.controller.admin;

import com.app.common.connector.ConnectorManifest;
import com.app.common.connector.ConnectorScope;
import com.app.persistence.connector.ConnectorRegistry;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminConnectorController.class)
public class AdminConnectorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ConnectorRegistry connectorRegistry;

    private ConnectorManifest systemManifest;
    private ConnectorManifest tenantManifest;

    @BeforeEach
    void setUp() {
        systemManifest = new ConnectorManifest();
        systemManifest.setId("sys-id");
        systemManifest.setConnectorId("jira");
        systemManifest.setScope(ConnectorScope.SYSTEM);

        tenantManifest = new ConnectorManifest();
        tenantManifest.setId("ten-id");
        tenantManifest.setConnectorId("slack");
        tenantManifest.setScope(ConnectorScope.TENANT);
    }

    @Test
    void testListAll_OnlyReturnsSystem() throws Exception {
        when(connectorRegistry.listAll()).thenReturn(Arrays.asList(systemManifest, tenantManifest));

        mockMvc.perform(get("/admin/connectors"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].connectorId").value("jira"));
    }

    @Test
    void testGetConnector_Success() throws Exception {
        when(connectorRegistry.findById("jira", null)).thenReturn(Optional.of(systemManifest));

        mockMvc.perform(get("/admin/connectors/jira"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.connectorId").value("jira"));
    }

    @Test
    void testGetConnector_NotFound() throws Exception {
        when(connectorRegistry.findById("unknown", null)).thenReturn(Optional.empty());

        mockMvc.perform(get("/admin/connectors/unknown"))
                .andExpect(status().isNotFound());
    }

    @Test
    void testGetConnector_TenantScope_ReturnsNotFound() throws Exception {
        when(connectorRegistry.findById("slack", null)).thenReturn(Optional.of(tenantManifest));

        mockMvc.perform(get("/admin/connectors/slack"))
                .andExpect(status().isNotFound());
    }

    @Test
    void testCreateConnector_ForcesSystemScope() throws Exception {
        ConnectorManifest newManifest = new ConnectorManifest();
        newManifest.setConnectorId("new-sys");

        when(connectorRegistry.save(any(ConnectorManifest.class))).thenAnswer(i -> {
            ConnectorManifest m = i.getArgument(0);
            m.setId("new-id");
            return m;
        });

        mockMvc.perform(post("/admin/connectors")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newManifest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scope").value("SYSTEM"))
                .andExpect(jsonPath("$.organizationId").doesNotExist());
    }

    @Test
    void testUpdateConnector_Success() throws Exception {
        when(connectorRegistry.findById("jira", null)).thenReturn(Optional.of(systemManifest));
        when(connectorRegistry.save(any(ConnectorManifest.class))).thenReturn(systemManifest);

        ConnectorManifest update = new ConnectorManifest();
        update.setConnectorId("jira");

        mockMvc.perform(put("/admin/connectors/jira")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isOk());
                
        verify(connectorRegistry).save(any(ConnectorManifest.class));
    }
    
    @Test
    void testUpdateConnector_FailsIfTenant() throws Exception {
        when(connectorRegistry.findById("slack", null)).thenReturn(Optional.of(tenantManifest));

        ConnectorManifest update = new ConnectorManifest();
        update.setConnectorId("slack");

        mockMvc.perform(put("/admin/connectors/slack")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isNotFound());
    }

    @Test
    void testDeleteConnector_Success() throws Exception {
        when(connectorRegistry.findById("jira", null)).thenReturn(Optional.of(systemManifest));

        mockMvc.perform(delete("/admin/connectors/jira"))
                .andExpect(status().isOk());

        verify(connectorRegistry).delete("sys-id");
    }
}

package com.app.api.controller;

import com.app.api.dto.ConnectorTestRequest;
import com.app.api.dto.ConnectorTestResult;
import com.app.api.service.ConnectorTestService;
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

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ConnectorController.class)
public class ConnectorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ConnectorRegistry connectorRegistry;

    @MockBean
    private ConnectorTestService connectorTestService;

    private ConnectorManifest tenantManifest;
    private ConnectorManifest systemManifest;

    private static final String DEFAULT_ORG_ID = "default-org";

    @BeforeEach
    void setUp() {
        tenantManifest = new ConnectorManifest();
        tenantManifest.setId("id-1");
        tenantManifest.setConnectorId("slack");
        tenantManifest.setScope(ConnectorScope.TENANT);
        tenantManifest.setOrganizationId(DEFAULT_ORG_ID);

        systemManifest = new ConnectorManifest();
        systemManifest.setId("id-2");
        systemManifest.setConnectorId("jira");
        systemManifest.setScope(ConnectorScope.SYSTEM);
        systemManifest.setOrganizationId(null);
    }

    @Test
    void testListAll() throws Exception {
        when(connectorRegistry.listAll(DEFAULT_ORG_ID)).thenReturn(Collections.singletonList(tenantManifest));

        mockMvc.perform(get("/connectors"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].connectorId").value("slack"));
    }

    @Test
    void testGetConnector_Success() throws Exception {
        when(connectorRegistry.findById("slack", DEFAULT_ORG_ID)).thenReturn(Optional.of(tenantManifest));

        mockMvc.perform(get("/connectors/slack"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.connectorId").value("slack"));
    }

    @Test
    void testGetConnector_NotFound() throws Exception {
        when(connectorRegistry.findById("unknown", DEFAULT_ORG_ID)).thenReturn(Optional.empty());

        mockMvc.perform(get("/connectors/unknown"))
                .andExpect(status().isNotFound()); 
    }

    @Test
    void testCreateConnector() throws Exception {
        ConnectorManifest newManifest = new ConnectorManifest();
        newManifest.setConnectorId("new-conn");

        when(connectorRegistry.save(any(ConnectorManifest.class))).thenAnswer(i -> {
            ConnectorManifest m = i.getArgument(0);
            m.setId("new-id");
            return m;
        });

        mockMvc.perform(post("/connectors")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newManifest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("new-id"))
                .andExpect(jsonPath("$.scope").value("TENANT"))
                .andExpect(jsonPath("$.organizationId").value(DEFAULT_ORG_ID));
    }

    @Test
    void testUpdateConnector_Success() throws Exception {
        when(connectorRegistry.findById("slack", DEFAULT_ORG_ID)).thenReturn(Optional.of(tenantManifest));
        when(connectorRegistry.save(any(ConnectorManifest.class))).thenReturn(tenantManifest);

        ConnectorManifest updatedManifest = new ConnectorManifest();
        updatedManifest.setConnectorId("slack");

        mockMvc.perform(put("/connectors/slack")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updatedManifest)))
                .andExpect(status().isOk());
        
        verify(connectorRegistry).save(any(ConnectorManifest.class));
    }

    @Test
    void testUpdateConnector_SystemScope_Rejects() throws Exception {
        when(connectorRegistry.findById("jira", DEFAULT_ORG_ID)).thenReturn(Optional.of(systemManifest));

        ConnectorManifest updatedManifest = new ConnectorManifest();
        updatedManifest.setConnectorId("jira");

        mockMvc.perform(put("/connectors/jira")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updatedManifest)))
                .andExpect(result -> assertTrue(result.getResolvedException() instanceof IllegalArgumentException));
    }

    @Test
    void testUpdateConnector_WrongOrg_Rejects() throws Exception {
        ConnectorManifest otherOrgManifest = new ConnectorManifest();
        otherOrgManifest.setScope(ConnectorScope.TENANT);
        otherOrgManifest.setOrganizationId("other-org");

        when(connectorRegistry.findById("slack", DEFAULT_ORG_ID)).thenReturn(Optional.of(otherOrgManifest));

        mockMvc.perform(put("/connectors/slack")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ConnectorManifest())))
                .andExpect(result -> assertTrue(result.getResolvedException() instanceof IllegalArgumentException));
    }

    @Test
    void testDeleteConnector_Success() throws Exception {
        when(connectorRegistry.findById("slack", DEFAULT_ORG_ID)).thenReturn(Optional.of(tenantManifest));

        mockMvc.perform(delete("/connectors/slack"))
                .andExpect(status().isOk());

        verify(connectorRegistry).delete("id-1");
    }

    @Test
    void testDeleteConnector_SystemScope_Rejects() throws Exception {
        when(connectorRegistry.findById("jira", DEFAULT_ORG_ID)).thenReturn(Optional.of(systemManifest));

        mockMvc.perform(delete("/connectors/jira"))
                .andExpect(result -> assertTrue(result.getResolvedException() instanceof IllegalArgumentException));
                
        verify(connectorRegistry, never()).delete(anyString());
    }

    @Test
    void testTestAction() throws Exception {
        ConnectorTestRequest request = new ConnectorTestRequest();
        ConnectorTestResult result = ConnectorTestResult.builder().success(true).build();
        
        when(connectorTestService.testAction(eq("slack"), any(ConnectorTestRequest.class))).thenReturn(result);

        mockMvc.perform(post("/connectors/slack/test")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}


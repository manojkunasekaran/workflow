import { neo4jTaskPlugin } from '../neo4jTaskPlugin';

describe('neo4jTaskPlugin', () => {
    it('exports correct type and label', () => {
        expect(neo4jTaskPlugin.type).toBe('NEO4J_TASK');
        expect(neo4jTaskPlugin.label).toBe('Neo4j Database');
    });

    it('contains Connection and Cypher Query fields', () => {
        const fields = neo4jTaskPlugin.fields;
        
        expect(Array.isArray(fields)).toBe(true);

        // We know it's an array here based on the plugin definition
        const fieldsArray = fields as any[];

        const connectionField = fieldsArray.find(f => f.label === 'Connection');
        expect(connectionField).toBeDefined();
        expect(connectionField?.key).toBe('credentialId');
        expect(connectionField?.type).toBe('credential');

        const cypherField = fieldsArray.find(f => f.label === 'Cypher Query');
        expect(cypherField).toBeDefined();
        expect(cypherField?.key).toBe('cypher');
        expect(cypherField?.type).toBe('textarea');
    });
});

import { useCallback, useEffect, useMemo, useState } from 'react';
import { connectorApi, type ConnectorManifest, type ConnectorTrigger } from '@/api/connectorApi';
import { ConnectionSelectField } from '@/features/workflow-studio/task-config/ConnectionSelectField';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    connectorsWithTriggers,
    defaultInputsForSchema,
    triggersForConnector,
    type ConnectorTriggerKind,
} from '@/features/workflow-studio/task-config/connectorTriggerUtils';

interface ConnectorTriggerPickerProps {
    triggerType: ConnectorTriggerKind;
    embedded?: boolean;
    connectorId?: string;
    connectorTriggerId?: string;
    connectorInputs?: Record<string, string>;
    credentialId?: string;
    onApply: (args: {
        connectorId: string;
        trigger: ConnectorTrigger;
        inputs: Record<string, string>;
        credentialId?: string;
    }) => void;
}

export function ConnectorTriggerPicker({
    triggerType,
    embedded = false,
    connectorId,
    connectorTriggerId,
    connectorInputs,
    credentialId,
    onApply,
}: ConnectorTriggerPickerProps) {
    const [connectors, setConnectors] = useState<ConnectorManifest[]>([]);
    const [selectedConnectorId, setSelectedConnectorId] = useState(connectorId ?? '');
    const [selectedTriggerId, setSelectedTriggerId] = useState(connectorTriggerId ?? '');
    const [inputs, setInputs] = useState<Record<string, string>>(connectorInputs ?? {});
    const [selectedCredentialId, setSelectedCredentialId] = useState(credentialId ?? '');

    useEffect(() => {
        void connectorApi.list().then((items) => {
            setConnectors(connectorsWithTriggers(items, triggerType));
        });
    }, [triggerType]);

    const eligibleConnectors = useMemo(
        () => connectorsWithTriggers(connectors, triggerType),
        [connectors, triggerType],
    );

    const selectedConnector = eligibleConnectors.find((c) => c.connectorId === selectedConnectorId);
    const availableTriggers = triggersForConnector(selectedConnector, triggerType);
    const selectedTrigger = availableTriggers.find((t) => t.triggerId === selectedTriggerId);

    const emitApply = useCallback(
        (
            nextConnectorId: string,
            trigger: ConnectorTrigger | undefined,
            nextInputs: Record<string, string>,
            nextCredentialId: string,
        ) => {
            if (!nextConnectorId || !trigger) return;
            onApply({
                connectorId: nextConnectorId,
                trigger,
                inputs: nextInputs,
                credentialId: nextCredentialId || undefined,
            });
        },
        [onApply],
    );

    const handleConnectorChange = (value: string) => {
        setSelectedConnectorId(value);
        const connector = eligibleConnectors.find((c) => c.connectorId === value);
        const triggers = triggersForConnector(connector, triggerType);
        const first = triggers[0];
        const nextTriggerId = first?.triggerId ?? '';
        const nextInputs = first ? defaultInputsForSchema(first.inputSchema ?? []) : {};
        setSelectedTriggerId(nextTriggerId);
        setInputs(nextInputs);
        emitApply(value, first, nextInputs, selectedCredentialId);
    };

    const handleTriggerChange = (value: string) => {
        setSelectedTriggerId(value);
        const trigger = availableTriggers.find((t) => t.triggerId === value);
        const nextInputs = trigger ? defaultInputsForSchema(trigger.inputSchema ?? []) : {};
        setInputs(nextInputs);
        emitApply(selectedConnectorId, trigger, nextInputs, selectedCredentialId);
    };

    const handleInputChange = (key: string, value: string) => {
        const nextInputs = { ...inputs, [key]: value };
        setInputs(nextInputs);
        emitApply(selectedConnectorId, selectedTrigger, nextInputs, selectedCredentialId);
    };

    const handleCredentialChange = (value: string) => {
        setSelectedCredentialId(value);
        emitApply(selectedConnectorId, selectedTrigger, inputs, value);
    };

    if (eligibleConnectors.length === 0) {
        return (
            <p className="text-xs text-muted-foreground">
                No app presets available yet for this trigger type.
            </p>
        );
    }

    return (
        <div className={embedded ? 'space-y-3 min-w-0' : 'space-y-3 min-w-0 rounded-md border p-3 bg-muted/20'}>
            {!embedded && <p className="text-sm font-medium">App event</p>}

            <div className="space-y-1">
                <Label>App</Label>
                <Select value={selectedConnectorId} onValueChange={handleConnectorChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Choose an app" />
                    </SelectTrigger>
                    <SelectContent>
                        {eligibleConnectors.map((connector) => (
                            <SelectItem key={connector.connectorId} value={connector.connectorId}>
                                {connector.displayName}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedConnector && (
                <div className="space-y-1">
                    <Label>Event</Label>
                    <Select value={selectedTriggerId} onValueChange={handleTriggerChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Choose an event" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableTriggers.map((trigger) => (
                                <SelectItem key={trigger.triggerId} value={trigger.triggerId}>
                                    {trigger.displayName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedTrigger?.description && (
                        <p className="text-xs text-muted-foreground">{selectedTrigger.description}</p>
                    )}
                </div>
            )}

            {selectedTrigger?.inputSchema?.map((field) => (
                <div key={field.key} className="space-y-1">
                    <Label>{field.label}</Label>
                    <Input
                        value={inputs[field.key] ?? ''}
                        placeholder={field.placeholder}
                        onChange={(event) => handleInputChange(field.key, event.target.value)}
                    />
                    {field.description && (
                        <p className="text-xs text-muted-foreground">{field.description}</p>
                    )}
                </div>
            ))}

            {selectedConnector && (
                <ConnectionSelectField
                    value={selectedCredentialId}
                    onChange={handleCredentialChange}
                    connectorId={selectedConnector.connectorId}
                    label="Connection"
                    description="Used for poll requests or app registration."
                />
            )}
        </div>
    );
}

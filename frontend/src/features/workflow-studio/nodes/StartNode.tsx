import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Play, Webhook, Clock } from 'lucide-react';
import { MAIN_OUT } from '@/features/workflow-studio/lib/graphHandles';
import { EdgePortHandle } from '@/features/workflow-studio/nodes/EdgePortHandle';
import { StudioNodeShell } from '@/features/workflow-studio/nodes/StudioNodeShell';
import { useCanvasActions } from '@/features/workflow-studio/CanvasActionsContext';
import { TRIGGER_ACCENT_COLOR, WEBHOOK_ACCENT_COLOR, SCHEDULE_ACCENT_COLOR } from '@/features/workflow-studio/constants/studioNodeTheme';
import { studioIconBoxHeight, studioTaskNodeHeight } from '@/features/workflow-studio/constants/taskNodeLayout';
import type { TriggerConfig } from '@/types/api';

const ICON_BOX_HEIGHT = studioIconBoxHeight(1, false);
const TOTAL_HEIGHT = studioTaskNodeHeight(1, false);

export type StartNodeData = {
    label?: string;
    showAdd?: boolean;
    triggerConfig?: TriggerConfig;
};

function StartNodeComponent({ data, selected }: NodeProps & { data: StartNodeData }) {
    const { onAddTaskClick, onStartNodeClick } = useCanvasActions();

    const triggerType = data.triggerConfig?.type || 'MANUAL';
    
    let Icon = Play;
    let accentColor = TRIGGER_ACCENT_COLOR;
    let defaultLabel = 'Manual Trigger';

    if (triggerType === 'WEBHOOK') {
        Icon = Webhook;
        accentColor = WEBHOOK_ACCENT_COLOR;
        defaultLabel = 'Webhook Trigger';
    } else if (triggerType === 'SCHEDULE') {
        Icon = Clock;
        accentColor = SCHEDULE_ACCENT_COLOR;
        defaultLabel = 'Schedule Trigger';
    }

    const label = data.label || defaultLabel;

    return (
        <div 
            onClick={onStartNodeClick ? () => onStartNodeClick() : undefined} 
            className={onStartNodeClick ? "cursor-pointer" : ""}
        >
            <StudioNodeShell
                iconBoxHeight={ICON_BOX_HEIGHT}
                totalHeight={TOTAL_HEIGHT}
                accentColor={accentColor}
                icon={Icon}
                iconClassName={triggerType === 'MANUAL' ? 'fill-current' : ''}
                label={label}
                subLabel={data.label ? defaultLabel : undefined}
                selected={selected}
            >
                <EdgePortHandle
                    type="source"
                    side="right"
                    id={MAIN_OUT}
                    onAddClick={data.showAdd && onAddTaskClick ? () => onAddTaskClick() : undefined}
                />
            </StudioNodeShell>
        </div>
    );
}

export const StartNode = memo(StartNodeComponent);

/** @deprecated Use studioTaskNodeHeight — kept for any external imports. */
export const START_NODE_HEIGHT = TOTAL_HEIGHT;

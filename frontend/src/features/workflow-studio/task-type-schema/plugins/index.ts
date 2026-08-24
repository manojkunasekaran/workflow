import { branchTaskPlugin } from './branchTaskPlugin';
import { conditionalTaskPlugin } from './conditionalTaskPlugin';
import { dataTransformTaskPlugin } from './dataTransformTaskPlugin';
import { httpTaskPlugin } from './httpTaskPlugin';
import { humanTaskPlugin } from './humanTaskPlugin';
import { iteratorTaskPlugin } from './iteratorTaskPlugin';
import { joinTaskPlugin } from './joinTaskPlugin';
import { scriptTaskPlugin } from './scriptTaskPlugin';
import { smtpTaskPlugin } from './smtpTaskPlugin';
import { waitTaskPlugin } from './waitTaskPlugin';
import { connectorTaskPlugin } from './connectorTaskPlugin';
import type { TaskTypePlugin } from '../pluginTypes';

/** Single source of truth for all studio task types. */
export const TASK_PLUGINS: TaskTypePlugin[] = [
    httpTaskPlugin,
    scriptTaskPlugin,
    waitTaskPlugin,
    dataTransformTaskPlugin,
    humanTaskPlugin,
    conditionalTaskPlugin,
    iteratorTaskPlugin,
    branchTaskPlugin,
    joinTaskPlugin,
    smtpTaskPlugin,
    connectorTaskPlugin,
];

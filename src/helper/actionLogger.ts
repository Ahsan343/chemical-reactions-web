export interface ActionEvent {
  timestamp: number;
  action: string;
  data: Record<string, unknown>;
  subunit: string;
  sessionId: string;
}

let sessionId = generateSessionId();
let actionLog: ActionEvent[] = [];

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function tagAction(action: string, subunit: string, data: Record<string, unknown> = {}): void {
  actionLog.push({
    timestamp: Date.now(),
    action,
    data,
    subunit,
    sessionId,
  });
}

export function getActionLog(): readonly ActionEvent[] {
  return actionLog;
}

export function clearActionLog(): void {
  actionLog = [];
}

export function resetSession(): void {
  sessionId = generateSessionId();
  actionLog = [];
}

/**
 * Jotai atoms for debug logger state management
 */
import { atom } from 'jotai';
import { atomWithRefresh } from 'jotai/utils';
import { getDebugLogger, LogEntry } from '$utils/debugLogger';

const debugLogger = getDebugLogger();

/**
 * Atom for enabling/disabling debug logging
 */
export const debugLoggerEnabledAtom = atom(
  () => debugLogger.isEnabled(),
  (_, set, enabled: boolean) => {
    debugLogger.setEnabled(enabled);
    set(debugLogsAtom);
  }
);

/**
 * Atom for retrieving debug logs with refresh capability
 */
export const debugLogsAtom = atomWithRefresh(() => debugLogger.getLogs());

/**
 * Atom for filtered logs
 */
export const filteredDebugLogsAtom = atom(
  (get) => get(debugLogsAtom),
  (get, set, filters?: { level?: string; category?: string; since?: number }) => {
    const allLogs = get(debugLogsAtom);
    return allLogs; // Can be extended with filtering logic
  }
);

/**
 * Action to clear all debug logs
 */
export const clearDebugLogsAtom = atom(null, (_, set) => {
  debugLogger.clear();
  set(debugLogsAtom);
});

/**
 * Action to export debug logs
 */
export const exportDebugLogsAtom = atom(null, () => {
  return debugLogger.exportLogs();
});

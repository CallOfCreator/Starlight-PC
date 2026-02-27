export const MAX_LOG_LINES = 2000;

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'unknown';

export interface ParsedLogLine {
	id: string;
	text: string;
	level: LogLevel;
}

export function parseProfileLog(rawLog: string): ParsedLogLine[] {
	if (!rawLog.trim()) return [];

	const allLines = rawLog.split(/\r?\n/).filter((line) => line.length > 0);
	const start = Math.max(0, allLines.length - MAX_LOG_LINES);
	const visibleLines = allLines.slice(start);

	return visibleLines.map((text, index) => ({
		id: String(start + index),
		text,
		level: detectLogLevel(text)
	}));
}

function detectLogLevel(text: string): LogLevel {
	const normalized = text.toLowerCase();

	if (normalized.includes('fatal') || normalized.includes('error')) {
		return 'error';
	}
	if (normalized.includes('warn') || normalized.includes('warning')) {
		return 'warn';
	}
	if (normalized.includes('debug')) {
		return 'debug';
	}
	if (normalized.includes('trace')) {
		return 'trace';
	}
	if (normalized.includes('info')) {
		return 'info';
	}

	return 'unknown';
}

export function levelToTextClass(level: LogLevel): string {
	switch (level) {
		case 'error':
			return 'text-red-400';
		case 'warn':
			return 'text-amber-300';
		case 'info':
			return 'text-yellow-300';
		case 'debug':
			return 'text-green-400';
		case 'trace':
			return 'text-cyan-300';
		default:
			return 'text-muted-foreground';
	}
}

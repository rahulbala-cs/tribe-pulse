export const MOOD_SCALE = [
	{ level: 1, label: 'Burned Out', emoji: '🔥', color: '#ef4444', bgColor: '#fef2f2' },
	{ level: 2, label: 'Stressed', emoji: '😟', color: '#f97316', bgColor: '#fff7ed' },
	{ level: 3, label: 'Neutral', emoji: '😐', color: '#eab308', bgColor: '#fefce8' },
	{ level: 4, label: 'Happy', emoji: '😊', color: '#22c55e', bgColor: '#f0fdf4' },
	{ level: 5, label: 'Thriving', emoji: '🤩', color: '#10b981', bgColor: '#ecfdf5' },
] as const

export const REASON_CATEGORIES = [
	'Workload',
	'Team Dynamics',
	'Management',
	'Growth',
	'Recognition',
	'Work-Life Balance',
	'Company Culture',
	'Personal',
] as const

export const LOCATIONS = [
	'Bangalore',
	'Mumbai',
	'Remote-India',
	'Singapore',
] as const

export const DEPARTMENTS = {
	Engineering: ['Platform', 'Frontend', 'Backend', 'Mobile'],
	Product: ['Design', 'PM'],
	Operations: ['HR', 'Finance'],
} as const

export type MoodLevel = 1 | 2 | 3 | 4 | 5
export type ReasonCategory = typeof REASON_CATEGORIES[number]
export type Location = typeof LOCATIONS[number]

export function getMoodInfo(level: number) {
	return MOOD_SCALE.find(m => m.level === level) ?? MOOD_SCALE[2]
}

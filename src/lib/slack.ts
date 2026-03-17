import { App, LogLevel } from '@slack/bolt'
import { MOOD_SCALE, REASON_CATEGORIES } from './constants'

let slackApp: App | null = null

export function getSlackApp(): App {
	if (!slackApp) {
		slackApp = new App({
			token: process.env.SLACK_BOT_TOKEN,
			signingSecret: process.env.SLACK_SIGNING_SECRET,
			logLevel: LogLevel.INFO,
		})
	}
	return slackApp
}

export function buildMoodModal(triggerId: string) {
	return {
		trigger_id: triggerId,
		view: {
			type: 'modal' as const,
			callback_id: 'mood_checkin',
			title: { type: 'plain_text' as const, text: 'Tribe Pulse Check-in' },
			submit: { type: 'plain_text' as const, text: 'Submit' },
			blocks: [
				{
					type: 'section',
					text: {
						type: 'mrkdwn',
						text: '*How are you feeling today?*\nYour response helps us build a better workplace.',
					},
				},
				{
					type: 'input',
					block_id: 'mood_block',
					element: {
						type: 'radio_buttons',
						action_id: 'mood_select',
						options: MOOD_SCALE.map(m => ({
							text: { type: 'plain_text' as const, text: `${m.emoji} ${m.label}` },
							value: String(m.level),
						})),
					},
					label: { type: 'plain_text' as const, text: 'Your Mood' },
				},
				{
					type: 'input',
					block_id: 'reasons_block',
					optional: true,
					element: {
						type: 'multi_static_select',
						action_id: 'reasons_select',
						placeholder: { type: 'plain_text' as const, text: 'What\'s influencing your mood?' },
						options: REASON_CATEGORIES.map(r => ({
							text: { type: 'plain_text' as const, text: r },
							value: r,
						})),
					},
					label: { type: 'plain_text' as const, text: 'Reasons (select all that apply)' },
				},
				{
					type: 'context',
					elements: [
						{
							type: 'mrkdwn',
							text: ':lock: Your response is always anonymous.',
						},
					],
				},
			],
		},
	}
}

export function getEmpathyResponse(moodLevel: number): string {
	if (moodLevel <= 2) {
		return '💙 Thanks for sharing honestly. Remember, you\'re not alone -- the Employee Assistance Program is always available. Take care of yourself.'
	}
	if (moodLevel === 3) {
		return '👋 Thanks for checking in. Every day is different -- we\'re here for you. Hope tomorrow is even better!'
	}
	return '🌟 Glad to hear you\'re doing well! Keep up the great energy. Your positivity makes a difference!'
}

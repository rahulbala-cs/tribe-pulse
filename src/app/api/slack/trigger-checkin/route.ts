import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
	const authHeader = req.headers.get('authorization')
	const body = await req.json().catch(() => ({}))
	const slackUserId = body.slackUserId as string | undefined

	if (authHeader !== `Bearer ${process.env.SLACK_SIGNING_SECRET}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const token = process.env.SLACK_BOT_TOKEN
	if (!token) {
		return NextResponse.json({ error: 'No bot token' }, { status: 500 })
	}

	let targetUsers: string[] = []

	if (slackUserId) {
		targetUsers = [slackUserId]
	} else {
		const employees = await prisma.employee.findMany({
			select: { slackUserId: true },
		})
		targetUsers = employees.map((e: { slackUserId: string }) => e.slackUserId)
	}

	const results: { userId: string; status: string }[] = []

	for (const userId of targetUsers) {
		try {
			const convRes = await fetch('https://slack.com/api/conversations.open', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ users: userId }),
			})
			const convData = await convRes.json()

			if (!convData.ok) {
				results.push({ userId, status: `conv_error: ${convData.error}` })
				continue
			}

			const channelId = convData.channel.id

			const msgRes = await fetch('https://slack.com/api/chat.postMessage', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					channel: channelId,
					text: 'Time for your daily mood check-in!',
					blocks: [
						{
							type: 'section',
							text: {
								type: 'mrkdwn',
								text: '👋 *Hey! How are you feeling today?*\n\nTake 2 seconds to share your mood. Your input helps us build a better workplace.',
							},
						},
						{
							type: 'actions',
							block_id: 'checkin_prompt',
							elements: [
								{
									type: 'button',
									text: { type: 'plain_text', text: '🔥 Burned Out' },
									value: '1',
									action_id: 'mood_quick_1',
								},
								{
									type: 'button',
									text: { type: 'plain_text', text: '😟 Stressed' },
									value: '2',
									action_id: 'mood_quick_2',
								},
								{
									type: 'button',
									text: { type: 'plain_text', text: '😐 Neutral' },
									value: '3',
									action_id: 'mood_quick_3',
								},
								{
									type: 'button',
									text: { type: 'plain_text', text: '😊 Happy' },
									value: '4',
									action_id: 'mood_quick_4',
								},
								{
									type: 'button',
									text: { type: 'plain_text', text: '🤩 Thriving' },
									value: '5',
									action_id: 'mood_quick_5',
								},
							],
						},
						{
							type: 'context',
							elements: [
								{
									type: 'mrkdwn',
									text: '_Click a mood button to open the full check-in form, or just tap one for a quick submit._',
								},
							],
						},
					],
				}),
			})
			const msgData = await msgRes.json()
			results.push({
				userId,
				status: msgData.ok ? 'sent' : `msg_error: ${msgData.error}`,
			})
		} catch (err) {
			results.push({ userId, status: `exception: ${err}` })
		}
	}

	const sent = results.filter(r => r.status === 'sent').length
	const failed = results.filter(r => r.status !== 'sent').length

	return NextResponse.json({
		message: `Sent ${sent} check-ins, ${failed} failed`,
		results,
	})
}

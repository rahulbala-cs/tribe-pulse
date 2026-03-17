import { NextRequest, NextResponse } from 'next/server'
import { getTeamAggregations, generateOrgSummary, generateTeamSummary } from '@/lib/mock-ai'
import { buildMoodModal } from '@/lib/slack'

export async function POST(req: NextRequest) {
	const formData = await req.formData()
	const command = formData.get('command') as string
	const text = (formData.get('text') as string || '').trim()
	const triggerId = formData.get('trigger_id') as string
	const userId = formData.get('user_id') as string

	if (command === '/tribe-pulse') {
		if (text === 'checkin') {
			const token = process.env.SLACK_BOT_TOKEN
			if (!token) {
				return NextResponse.json({
					response_type: 'ephemeral',
					text: '❌ SLACK_BOT_TOKEN not configured',
				})
			}
			if (!triggerId) {
				return NextResponse.json({
					response_type: 'ephemeral',
					text: '❌ No trigger_id received from Slack',
				})
			}

			const modal = buildMoodModal(triggerId)
			console.log('Token prefix:', token.substring(0, 15), '... length:', token.length)
			const slackRes = await fetch('https://slack.com/api/views.open', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					trigger_id: triggerId,
					view: modal.view,
				}),
			})
			const slackData = await slackRes.json()
			console.log('views.open response:', JSON.stringify(slackData, null, 2))

			if (!slackData.ok) {
				return NextResponse.json({
					response_type: 'ephemeral',
					text: `❌ Failed to open modal: ${slackData.error}${slackData.response_metadata?.messages ? '\n' + slackData.response_metadata.messages.join('\n') : ''}`,
				})
			}

			return NextResponse.json({
				response_type: 'ephemeral',
				text: '✅ Opening your mood check-in...',
			})
		}

		if (text === 'send' || text.startsWith('send ')) {
			const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

			// Requires "Escape channels, users, and links" enabled on the slash command in Slack App Dashboard
			// Slack then sends mentions as <@UID|name> which we extract here
			const mentionMatch = text.match(/send\s+<@([A-Za-z0-9]+)(?:\|[^>]*)?>/)
			const targetUserId = mentionMatch ? mentionMatch[1] : userId

			if (!mentionMatch && text !== 'send') {
				return NextResponse.json({
					response_type: 'ephemeral',
					text: '⚠️ Could not resolve user. Make sure "Escape channels, users, and links sent to your app" is enabled for this slash command in the Slack App Dashboard, then try `/tribe-pulse send @username` again.',
				})
			}

			try {
				const res = await fetch(`${appUrl}/api/slack/trigger-checkin`, {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${process.env.SLACK_SIGNING_SECRET}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ slackUserId: targetUserId }),
				})
				const data = await res.json()
				return NextResponse.json({
					response_type: 'ephemeral',
					text: `✅ ${data.message} (sent to <@${targetUserId}>)`,
				})
			} catch {
				return NextResponse.json({
					response_type: 'ephemeral',
					text: '❌ Failed to send check-in. Is the server running?',
				})
			}
		}

		if (text.startsWith('send-id ')) {
			const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
			const rawId = text.replace('send-id ', '').trim()
			try {
				const res = await fetch(`${appUrl}/api/slack/trigger-checkin`, {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${process.env.SLACK_SIGNING_SECRET}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ slackUserId: rawId }),
				})
				const data = await res.json()
				return NextResponse.json({
					response_type: 'ephemeral',
					text: `✅ ${data.message} (sent to <@${rawId}>)`,
				})
			} catch {
				return NextResponse.json({
					response_type: 'ephemeral',
					text: '❌ Failed to send check-in.',
				})
			}
		}

		if (text === 'summary' || text === '') {
			const aggregations = await getTeamAggregations(7)
			const summary = generateOrgSummary(aggregations)
			const teamSummaries = aggregations
				.map(a => generateTeamSummary(a))
				.join('\n\n')

			return NextResponse.json({
				response_type: 'in_channel',
				blocks: [
					{
						type: 'header',
						text: { type: 'plain_text', text: '📊 Tribe Pulse Weekly Summary' },
					},
					{
						type: 'section',
						text: { type: 'mrkdwn', text: summary },
					},
					{ type: 'divider' },
					{
						type: 'section',
						text: { type: 'mrkdwn', text: '*Team Breakdown:*\n\n' + teamSummaries },
					},
				],
			})
		}

		if (text.startsWith('team ')) {
			const teamName = text.replace('team ', '').trim()
			const aggregations = await getTeamAggregations(7)
			const teamAgg = aggregations.find(
				a => a.teamName.toLowerCase() === teamName.toLowerCase(),
			)

			if (!teamAgg) {
				return NextResponse.json({
					response_type: 'ephemeral',
					text: `Team "${teamName}" not found. Available teams: ${aggregations.map(a => a.teamName).join(', ')}`,
				})
			}

			const summary = generateTeamSummary(teamAgg)
			return NextResponse.json({
				response_type: 'in_channel',
				blocks: [
					{
						type: 'header',
						text: { type: 'plain_text', text: `📊 ${teamAgg.teamName} Team Pulse` },
					},
					{
						type: 'section',
						text: { type: 'mrkdwn', text: summary },
					},
				],
			})
		}

		return NextResponse.json({
			response_type: 'ephemeral',
			text: '*Tribe Pulse Commands:*\n• `/tribe-pulse summary` — Org-wide mood summary\n• `/tribe-pulse team [name]` — Team mood snapshot\n• `/tribe-pulse checkin` — Open your mood check-in form\n• `/tribe-pulse send` — Send yourself a check-in DM\n• `/tribe-pulse send @user` — Send a check-in DM to a specific user',
		})
	}

	return NextResponse.json({ ok: true })
}

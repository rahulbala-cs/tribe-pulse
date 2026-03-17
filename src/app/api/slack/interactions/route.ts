import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { scoreSentiment } from '@/lib/mock-ai'
import { getEmpathyResponse, buildMoodModal } from '@/lib/slack'
import { MOOD_SCALE } from '@/lib/constants'

async function findOrCreateEmployee(slackUserId: string, userName?: string) {
	let employee = await prisma.employee.findUnique({
		where: { slackUserId },
	})

	if (!employee) {
		const defaultTeam = await prisma.team.findFirst()
		if (!defaultTeam) return null
		employee = await prisma.employee.create({
			data: {
				slackUserId,
				name: userName || 'Slack User',
				email: `${slackUserId}@slack.local`,
				location: 'Unknown',
				teamId: defaultTeam.id,
			},
		})
	}
	return employee
}

async function sendDM(userId: string, text: string) {
	const token = process.env.SLACK_BOT_TOKEN
	if (!token) return
	await fetch('https://slack.com/api/chat.postMessage', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ channel: userId, text }),
	})
}

export async function POST(req: NextRequest) {
	const formData = await req.formData()
	const payloadStr = formData.get('payload') as string
	if (!payloadStr) {
		return NextResponse.json({ error: 'No payload' }, { status: 400 })
	}

	const payload = JSON.parse(payloadStr)

	if (payload.type === 'block_actions') {
		const action = payload.actions?.[0]

		if (action?.action_id?.startsWith('mood_quick_')) {
			const moodLevel = parseInt(action.value)
			const slackUserId = payload.user.id
			const triggerId = payload.trigger_id

			if (triggerId) {
				const token = process.env.SLACK_BOT_TOKEN
				if (token) {
					const modal = buildMoodModal(triggerId)

					const modalView = {
						...modal.view,
						blocks: modal.view.blocks.map((block: Record<string, unknown>) => {
							if (
								block.block_id === 'mood_block' &&
								block.element &&
								typeof block.element === 'object'
							) {
								return {
									...block,
									element: {
										...(block.element as Record<string, unknown>),
										initial_option: {
											text: {
												type: 'plain_text' as const,
												text: `${MOOD_SCALE[moodLevel - 1].emoji} ${MOOD_SCALE[moodLevel - 1].label}`,
											},
											value: String(moodLevel),
										},
									},
								}
							}
							return block
						}),
					}

					await fetch('https://slack.com/api/views.open', {
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${token}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							trigger_id: triggerId,
							view: modalView,
						}),
					})
				}
			}

			return NextResponse.json({ ok: true })
		}
	}

	if (payload.type === 'view_submission' && payload.view?.callback_id === 'mood_checkin') {
		const values = payload.view.state.values
		const moodLevel = parseInt(values.mood_block.mood_select.selected_option.value)
		const reasons = (values.reasons_block?.reasons_select?.selected_options ?? []).map(
			(o: { value: string }) => o.value,
		)
		const freeText = null
		const isAnonymous = true
		const slackUserId = payload.user.id
		const moodInfo = MOOD_SCALE.find(m => m.level === moodLevel)

		const employee = await findOrCreateEmployee(slackUserId, payload.user.name)
		if (!employee) {
			return NextResponse.json({ response_action: 'clear' })
		}

		const sentiment = scoreSentiment(freeText, moodLevel)

		await prisma.moodEntry.create({
			data: {
				employeeId: employee.id,
				moodLevel,
				moodLabel: moodInfo?.label || 'Unknown',
				freeText,
				isAnonymous,
				sentiment,
				reasons: {
					create: reasons.map((category: string) => ({ category })),
				},
			},
		})

		const empathyMsg = getEmpathyResponse(moodLevel)
		await sendDM(slackUserId, empathyMsg)

		return NextResponse.json({ response_action: 'clear' })
	}

	return NextResponse.json({ ok: true })
}

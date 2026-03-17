import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest } from 'next/server'

export async function verifySlackSignature(req: NextRequest, rawBody: string): Promise<boolean> {
	const signingSecret = process.env.SLACK_SIGNING_SECRET
	if (!signingSecret) return false

	const timestamp = req.headers.get('x-slack-request-timestamp')
	const slackSignature = req.headers.get('x-slack-signature')

	if (!timestamp || !slackSignature) return false

	// Reject requests older than 5 minutes to prevent replay attacks
	const age = Math.abs(Date.now() / 1000 - parseInt(timestamp))
	if (age > 300) return false

	const sigBasestring = `v0:${timestamp}:${rawBody}`
	const mySignature = 'v0=' + createHmac('sha256', signingSecret).update(sigBasestring).digest('hex')

	try {
		return timingSafeEqual(Buffer.from(mySignature), Buffer.from(slackSignature))
	} catch {
		return false
	}
}

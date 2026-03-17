import { NextRequest, NextResponse } from 'next/server'
import { verifySlackSignature } from '@/lib/slack-verify'

export async function POST(req: NextRequest) {
	const rawBody = await req.text()
	if (!await verifySlackSignature(req, rawBody)) {
		return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
	}
	const body = JSON.parse(rawBody)

	if (body.type === 'url_verification') {
		return NextResponse.json({ challenge: body.challenge })
	}

	if (body.event?.type === 'app_home_opened') {
		return NextResponse.json({ ok: true })
	}

	return NextResponse.json({ ok: true })
}

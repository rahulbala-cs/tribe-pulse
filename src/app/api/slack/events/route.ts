import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
	const body = await req.json()

	if (body.type === 'url_verification') {
		return NextResponse.json({ challenge: body.challenge })
	}

	if (body.event?.type === 'app_home_opened') {
		return NextResponse.json({ ok: true })
	}

	return NextResponse.json({ ok: true })
}

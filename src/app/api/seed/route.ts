import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'

export async function POST(req: NextRequest) {
	const authHeader = req.headers.get('authorization')
	if (authHeader !== `Bearer ${process.env.SLACK_SIGNING_SECRET}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	try {
		const output = execSync('npx tsx prisma/seed.ts', {
			cwd: process.cwd(),
			encoding: 'utf-8',
			timeout: 120000,
		})
		return NextResponse.json({ success: true, output })
	} catch (err: unknown) {
		const error = err as { message?: string; stdout?: string; stderr?: string }
		return NextResponse.json({
			success: false,
			error: error.message,
			stdout: error.stdout,
			stderr: error.stderr,
		}, { status: 500 })
	}
}

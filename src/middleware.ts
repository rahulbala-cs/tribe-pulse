import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl

	// Slack endpoints must remain open for Slack to call them
	if (pathname.startsWith('/api/slack/')) {
		return NextResponse.next()
	}

	// Protect dashboard and all other API routes
	if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/')) {
		const authHeader = req.headers.get('authorization')

		const username = process.env.DASHBOARD_USERNAME
		const password = process.env.DASHBOARD_PASSWORD

		if (!username || !password) {
			return new NextResponse('Server misconfigured: missing auth credentials', { status: 500 })
		}

		if (authHeader) {
			const [scheme, encoded] = authHeader.split(' ')
			if (scheme === 'Basic' && encoded) {
				const decoded = Buffer.from(encoded, 'base64').toString('utf-8')
				const [user, pass] = decoded.split(':')
				if (user === username && pass === password) {
					return NextResponse.next()
				}
			}
		}

		return new NextResponse('Unauthorized', {
			status: 401,
			headers: {
				'WWW-Authenticate': 'Basic realm="Tribe Pulse"',
			},
		})
	}

	return NextResponse.next()
}

export const config = {
	matcher: ['/dashboard/:path*', '/api/:path*'],
}

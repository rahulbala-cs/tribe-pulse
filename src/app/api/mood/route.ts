import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { scoreSentiment } from '@/lib/mock-ai'

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url)
	const days = parseInt(searchParams.get('days') || '30')
	const teamId = searchParams.get('teamId')
	const departmentId = searchParams.get('departmentId')
	const location = searchParams.get('location')

	const startDate = new Date()
	startDate.setDate(startDate.getDate() - days)

	const where: Record<string, unknown> = {
		createdAt: { gte: startDate },
	}

	if (teamId || departmentId || location) {
		where.employee = {}
		if (teamId) (where.employee as Record<string, unknown>).teamId = teamId
		if (departmentId) (where.employee as Record<string, unknown>).team = { departmentId }
		if (location) (where.employee as Record<string, unknown>).location = location
	}

	const entries = await prisma.moodEntry.findMany({
		where,
		include: {
			reasons: true,
			employee: {
				include: { team: { include: { department: true } } },
			},
		},
		orderBy: { createdAt: 'desc' },
	})

	return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
	const body = await req.json()
	const { employeeId, moodLevel, moodLabel, freeText, isAnonymous, reasons } = body

	const sentiment = scoreSentiment(freeText, moodLevel)

	const entry = await prisma.moodEntry.create({
		data: {
			employeeId,
			moodLevel,
			moodLabel,
			freeText,
			isAnonymous: isAnonymous || false,
			sentiment,
			reasons: {
				create: (reasons || []).map((category: string) => ({ category })),
			},
		},
		include: { reasons: true },
	})

	return NextResponse.json(entry)
}

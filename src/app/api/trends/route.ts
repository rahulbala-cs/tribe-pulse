import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url)
	const days = parseInt(searchParams.get('days') || '30')
	const groupBy = searchParams.get('groupBy') || 'day'
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
			employee: { select: { location: true, teamId: true } },
		},
		orderBy: { createdAt: 'asc' },
	})

	const grouped: Record<string, { sum: number; count: number; reasons: Record<string, number> }> = {}

	for (const entry of entries) {
		let key: string
		const d = new Date(entry.createdAt)

		if (groupBy === 'week') {
			const weekStart = new Date(d)
			weekStart.setDate(d.getDate() - d.getDay())
			key = weekStart.toISOString().split('T')[0]
		} else if (groupBy === 'month') {
			key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
		} else {
			key = d.toISOString().split('T')[0]
		}

		if (!grouped[key]) grouped[key] = { sum: 0, count: 0, reasons: {} }
		grouped[key].sum += entry.moodLevel
		grouped[key].count++

		for (const reason of entry.reasons) {
			grouped[key].reasons[reason.category] = (grouped[key].reasons[reason.category] || 0) + 1
		}
	}

	const trends = Object.entries(grouped)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([date, data]) => ({
			date,
			avgMood: Math.round((data.sum / data.count) * 100) / 100,
			totalEntries: data.count,
			reasons: data.reasons,
		}))

	const totalEmployees = await prisma.employee.count()
	const totalEntries = entries.length
	const avgMood = entries.length > 0
		? Math.round((entries.reduce((s: number, e: { moodLevel: number }) => s + e.moodLevel, 0) / entries.length) * 100) / 100
		: 0

	const moodDistribution = [0, 0, 0, 0, 0]
	for (const entry of entries) {
		moodDistribution[entry.moodLevel - 1]++
	}

	const allReasons: Record<string, number> = {}
	for (const entry of entries) {
		for (const reason of entry.reasons) {
			allReasons[reason.category] = (allReasons[reason.category] || 0) + 1
		}
	}

	const uniqueDays = new Set(entries.map((e: { createdAt: Date }) => new Date(e.createdAt).toISOString().split('T')[0])).size
	const avgParticipantsPerDay = uniqueDays > 0
		? Math.round(totalEntries / uniqueDays)
		: 0

	return NextResponse.json({
		trends,
		summary: {
			avgMood,
			totalEntries,
			totalEmployees,
			participationRate: Math.round((avgParticipantsPerDay / Math.max(totalEmployees, 1)) * 100),
			moodDistribution,
			topReasons: Object.entries(allReasons)
				.sort((a, b) => b[1] - a[1])
				.slice(0, 5)
				.map(([category, count]) => ({ category, count })),
		},
	})
}

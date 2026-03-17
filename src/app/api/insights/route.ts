import { NextResponse } from 'next/server'
import {
	getTeamAggregations,
	generateOrgSummary,
	generateTeamSummary,
	generateRecommendations,
	detectLowMoodPatterns,
} from '@/lib/mock-ai'
import { prisma } from '@/lib/db'

export const revalidate = 300

export async function GET() {
	const [aggregations, patterns, events, heatmapData] = await Promise.all([
		getTeamAggregations(7),
		detectLowMoodPatterns(3),
		prisma.orgEvent.findMany({ orderBy: { date: 'asc' } }),
		getHeatmapData(),
	])

	const orgSummary = generateOrgSummary(aggregations)
	const teamSummaries = aggregations.map(a => ({
		team: a.teamName,
		department: a.departmentName,
		summary: generateTeamSummary(a),
		avgMood: a.avgMood,
		prevAvgMood: a.prevAvgMood,
	}))
	const recommendations = generateRecommendations(aggregations)

	return NextResponse.json({
		orgSummary,
		teamSummaries,
		recommendations,
		patterns,
		events,
		heatmapData,
	})
}

async function getHeatmapData() {
	const thirtyDaysAgo = new Date()
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

	const entries = await prisma.moodEntry.findMany({
		where: { createdAt: { gte: thirtyDaysAgo } },
		select: { moodLevel: true, createdAt: true },
	})

	const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
	const heatmap: Record<string, { sum: number; count: number }> = {}

	for (const entry of entries) {
		const day = dayNames[new Date(entry.createdAt).getDay()]
		if (!heatmap[day]) heatmap[day] = { sum: 0, count: 0 }
		heatmap[day].sum += entry.moodLevel
		heatmap[day].count++
	}

	return dayNames
		.filter(d => d !== 'Sunday' && d !== 'Saturday')
		.map(day => ({
			day,
			avgMood: heatmap[day]
				? Math.round((heatmap[day].sum / heatmap[day].count) * 100) / 100
				: 0,
			count: heatmap[day]?.count || 0,
		}))
}

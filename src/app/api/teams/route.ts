import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const revalidate = 60

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url)
	const days = parseInt(searchParams.get('days') || '7')

	const startDate = new Date()
	startDate.setDate(startDate.getDate() - days)

	const prevStartDate = new Date(startDate)
	prevStartDate.setDate(prevStartDate.getDate() - days)

	// 3 parallel flat queries instead of one deep nested include
	const [teams, allEntries, employeeCounts] = await Promise.all([
		prisma.team.findMany({
			select: {
				id: true,
				name: true,
				department: { select: { name: true } },
			},
		}),
		prisma.moodEntry.findMany({
			where: { createdAt: { gte: prevStartDate } },
			select: {
				moodLevel: true,
				createdAt: true,
				employeeId: true,
				reasons: { select: { category: true } },
				employee: { select: { teamId: true } },
			},
		}),
		prisma.employee.groupBy({ by: ['teamId'], _count: { id: true } }),
	])

	const empCountByTeam: Record<string, number> = {}
	for (const g of employeeCounts) empCountByTeam[g.teamId] = g._count.id

	const entriesByTeam: Record<string, typeof allEntries> = {}
	for (const entry of allEntries) {
		const { teamId } = entry.employee
		if (!entriesByTeam[teamId]) entriesByTeam[teamId] = []
		entriesByTeam[teamId].push(entry)
	}

	const teamData = teams.map(team => {
		const teamEntries = entriesByTeam[team.id] ?? []
		const currentEntries = teamEntries.filter(e => e.createdAt >= startDate)
		const prevEntries = teamEntries.filter(e => e.createdAt >= prevStartDate && e.createdAt < startDate)

		const avgMood = currentEntries.length > 0
			? Math.round((currentEntries.reduce((s, e) => s + e.moodLevel, 0) / currentEntries.length) * 100) / 100
			: 0
		const prevAvgMood = prevEntries.length > 0
			? Math.round((prevEntries.reduce((s, e) => s + e.moodLevel, 0) / prevEntries.length) * 100) / 100
			: 0

		const reasonCounts: Record<string, number> = {}
		const moodDistribution = [0, 0, 0, 0, 0]
		for (const entry of currentEntries) {
			moodDistribution[entry.moodLevel - 1]++
			for (const reason of entry.reasons) {
				reasonCounts[reason.category] = (reasonCounts[reason.category] || 0) + 1
			}
		}

		const employeeCount = empCountByTeam[team.id] ?? 0
		const uniqueParticipants = new Set(currentEntries.map(e => e.employeeId)).size

		return {
			id: team.id,
			name: team.name,
			department: team.department.name,
			employeeCount,
			avgMood,
			prevAvgMood,
			change: Math.round((avgMood - prevAvgMood) * 100) / 100,
			totalEntries: currentEntries.length,
			participationRate: Math.round((uniqueParticipants / Math.max(employeeCount, 1)) * 100),
			moodDistribution,
			topReasons: Object.entries(reasonCounts)
				.sort((a, b) => b[1] - a[1])
				.slice(0, 3)
				.map(([category, count]) => ({
					category,
					count,
					percentage: Math.round((count / Math.max(currentEntries.length, 1)) * 100),
				})),
		}
	})

	const deptNames = [...new Set(teams.map(t => t.department.name))]
	const departments = deptNames.map(deptName => {
		const deptTeams = teamData.filter(t => t.department === deptName)
		const totalEntries = deptTeams.reduce((s, t) => s + t.totalEntries, 0)
		const totalMood = deptTeams.reduce((s, t) => s + t.avgMood * t.totalEntries, 0)
		return {
			name: deptName,
			avgMood: totalEntries > 0 ? Math.round((totalMood / totalEntries) * 100) / 100 : 0,
			teams: deptTeams,
			employeeCount: deptTeams.reduce((s, t) => s + t.employeeCount, 0),
		}
	})

	return NextResponse.json({ teams: teamData, departments })
}

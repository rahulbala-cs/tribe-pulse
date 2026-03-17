import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url)
	const days = parseInt(searchParams.get('days') || '7')

	const startDate = new Date()
	startDate.setDate(startDate.getDate() - days)

	const prevStartDate = new Date(startDate)
	prevStartDate.setDate(prevStartDate.getDate() - days)

	const teams = await prisma.team.findMany({
		include: {
			department: true,
			employees: {
				include: {
					moodEntries: {
						where: { createdAt: { gte: prevStartDate } },
						include: { reasons: true },
						orderBy: { createdAt: 'desc' },
					},
				},
			},
		},
	})

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const teamData = teams.map((team: any) => {
		const currentEntries = team.employees.flatMap((e: any) =>
			e.moodEntries.filter((m: any) => new Date(m.createdAt) >= startDate),
		)
		const prevEntries = team.employees.flatMap((e: any) =>
			e.moodEntries.filter((m: any) => {
				const d = new Date(m.createdAt)
				return d >= prevStartDate && d < startDate
			}),
		)

		const avgMood = currentEntries.length > 0
			? Math.round((currentEntries.reduce((s: number, e: any) => s + e.moodLevel, 0) / currentEntries.length) * 100) / 100
			: 0
		const prevAvgMood = prevEntries.length > 0
			? Math.round((prevEntries.reduce((s: number, e: any) => s + e.moodLevel, 0) / prevEntries.length) * 100) / 100
			: 0

		const reasonCounts: Record<string, number> = {}
		for (const entry of currentEntries) {
			for (const reason of entry.reasons) {
				reasonCounts[reason.category] = (reasonCounts[reason.category] || 0) + 1
			}
		}

		const moodDistribution = [0, 0, 0, 0, 0]
		for (const entry of currentEntries) {
			moodDistribution[entry.moodLevel - 1]++
		}

		return {
			id: team.id,
			name: team.name,
			department: team.department.name,
			employeeCount: team.employees.length,
			avgMood,
			prevAvgMood,
			change: Math.round((avgMood - prevAvgMood) * 100) / 100,
			totalEntries: currentEntries.length,
			participationRate: Math.round(
				(new Set(currentEntries.map((e: any) => e.employeeId)).size / Math.max(team.employees.length, 1)) * 100,
			),
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

	const deptNames = [...new Set(teams.map((t: any) => t.department.name))] as string[]
	const departments = deptNames.map((deptName: string) => {
		const deptTeams = teamData.filter((t: any) => t.department === deptName)
		const totalEntries = deptTeams.reduce((s: number, t: any) => s + t.totalEntries, 0)
		const totalMood = deptTeams.reduce((s: number, t: any) => s + t.avgMood * t.totalEntries, 0)
		return {
			name: deptName,
			avgMood: totalEntries > 0 ? Math.round((totalMood / totalEntries) * 100) / 100 : 0,
			teams: deptTeams,
			employeeCount: deptTeams.reduce((s: number, t: any) => s + t.employeeCount, 0),
		}
	})

	return NextResponse.json({ teams: teamData, departments })
}

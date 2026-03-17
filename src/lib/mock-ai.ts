import { prisma } from './db'

const NEGATIVE_KEYWORDS: Record<string, number> = {
	overwhelmed: -0.9, exhausted: -0.85, drained: -0.8, burnout: -0.9,
	frustrated: -0.7, struggling: -0.6, isolated: -0.5, unfair: -0.7,
	stressed: -0.6, tired: -0.5, confused: -0.4, unclear: -0.4,
	firefighting: -0.7, pressure: -0.5, heavy: -0.4, meetings: -0.3,
}

const POSITIVE_KEYWORDS: Record<string, number> = {
	excited: 0.9, motivated: 0.8, appreciated: 0.85, loving: 0.9,
	productive: 0.7, great: 0.6, amazing: 0.8, celebrated: 0.7,
	supported: 0.7, growing: 0.6, learning: 0.5, positive: 0.6,
	promoted: 0.9, shipped: 0.7, enjoyed: 0.6, recharged: 0.8,
}

export function scoreSentiment(text: string | null, moodLevel: number): number {
	if (!text) return (moodLevel - 3) / 2

	const words = text.toLowerCase().split(/\s+/)
	let totalScore = 0
	let matchCount = 0

	for (const word of words) {
		const cleaned = word.replace(/[^a-z]/g, '')
		if (NEGATIVE_KEYWORDS[cleaned] !== undefined) {
			totalScore += NEGATIVE_KEYWORDS[cleaned]
			matchCount++
		}
		if (POSITIVE_KEYWORDS[cleaned] !== undefined) {
			totalScore += POSITIVE_KEYWORDS[cleaned]
			matchCount++
		}
	}

	if (matchCount === 0) return (moodLevel - 3) / 2

	const keywordScore = totalScore / matchCount
	const moodScore = (moodLevel - 3) / 2
	return Math.max(-1, Math.min(1, keywordScore * 0.6 + moodScore * 0.4))
}

interface TeamAggregation {
	teamName: string
	departmentName: string
	avgMood: number
	prevAvgMood: number
	totalEntries: number
	topReasons: { category: string; count: number; percentage: number }[]
	lowMoodStreaks: number
}

export async function getTeamAggregations(
	daysBack: number = 7,
): Promise<TeamAggregation[]> {
	const now = new Date()
	const startDate = new Date(now)
	startDate.setDate(startDate.getDate() - daysBack)
	const prevStartDate = new Date(startDate)
	prevStartDate.setDate(prevStartDate.getDate() - daysBack)

	// Single query: fetch all teams + all relevant mood entries at once (no N+1)
	const [teams, allEntries] = await Promise.all([
		prisma.team.findMany({ select: { id: true, name: true, department: { select: { name: true } } } }),
		prisma.moodEntry.findMany({
			where: { createdAt: { gte: prevStartDate } },
			select: {
				moodLevel: true,
				createdAt: true,
				reasons: { select: { category: true } },
				employee: { select: { teamId: true } },
			},
		}),
	])

	// Group entries by teamId in memory
	const entriesByTeam: Record<string, typeof allEntries> = {}
	for (const entry of allEntries) {
		const teamId = entry.employee.teamId
		if (!entriesByTeam[teamId]) entriesByTeam[teamId] = []
		entriesByTeam[teamId].push(entry)
	}

	return teams.map(team => {
		const teamEntries = entriesByTeam[team.id] ?? []
		const currentEntries = teamEntries.filter(e => e.createdAt >= startDate)
		const prevEntries = teamEntries.filter(e => e.createdAt >= prevStartDate && e.createdAt < startDate)

		const avgMood = currentEntries.length > 0
			? currentEntries.reduce((s, e) => s + e.moodLevel, 0) / currentEntries.length
			: 3
		const prevAvgMood = prevEntries.length > 0
			? prevEntries.reduce((s, e) => s + e.moodLevel, 0) / prevEntries.length
			: 3

		const reasonCounts: Record<string, number> = {}
		for (const entry of currentEntries) {
			for (const reason of entry.reasons) {
				reasonCounts[reason.category] = (reasonCounts[reason.category] || 0) + 1
			}
		}

		const topReasons = Object.entries(reasonCounts)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 3)
			.map(([category, count]) => ({
				category,
				count,
				percentage: Math.round((count / Math.max(currentEntries.length, 1)) * 100),
			}))

		const lowMoodEntries = currentEntries.filter(e => e.moodLevel <= 2).length

		return {
			teamName: team.name,
			departmentName: team.department.name,
			avgMood: Math.round(avgMood * 100) / 100,
			prevAvgMood: Math.round(prevAvgMood * 100) / 100,
			totalEntries: currentEntries.length,
			topReasons,
			lowMoodStreaks: lowMoodEntries,
		}
	})
}

export function generateTeamSummary(agg: TeamAggregation): string {
	const trend = agg.avgMood > agg.prevAvgMood
		? `up ${((agg.avgMood - agg.prevAvgMood) / agg.prevAvgMood * 100).toFixed(1)}%`
		: agg.avgMood < agg.prevAvgMood
			? `down ${((agg.prevAvgMood - agg.avgMood) / agg.prevAvgMood * 100).toFixed(1)}%`
			: 'unchanged'

	const topReason = agg.topReasons[0]
	const moodWord = agg.avgMood >= 4
		? 'positive' : agg.avgMood >= 3
			? 'moderate' : 'concerning'

	let summary = `The ${agg.teamName} team shows ${moodWord} sentiment with an average mood of ${agg.avgMood.toFixed(1)}/5 (${trend} from last period).`

	if (topReason) {
		summary += ` "${topReason.category}" is the most cited factor, mentioned by ${topReason.percentage}% of respondents.`
	}

	if (agg.lowMoodStreaks > 0) {
		const pct = Math.round((agg.lowMoodStreaks / Math.max(agg.totalEntries, 1)) * 100)
		summary += ` ${pct}% of entries indicate high stress or burnout.`
	}

	return summary
}

export function generateOrgSummary(aggregations: TeamAggregation[]): string {
	const overallAvg = aggregations.reduce((s: number, a: TeamAggregation) => s + a.avgMood, 0) / aggregations.length
	const bestTeam = aggregations.reduce((a, b) => a.avgMood > b.avgMood ? a : b)
	const worstTeam = aggregations.reduce((a, b) => a.avgMood < b.avgMood ? a : b)

	const allReasons: Record<string, number> = {}
	for (const agg of aggregations) {
		for (const r of agg.topReasons) {
			allReasons[r.category] = (allReasons[r.category] || 0) + r.count
		}
	}

	const topOrgReason = Object.entries(allReasons).sort((a, b) => b[1] - a[1])[0]

	let summary = `Organization-wide mood stands at ${overallAvg.toFixed(1)}/5 this period. `
	summary += `${bestTeam.teamName} (${bestTeam.departmentName}) leads with ${bestTeam.avgMood.toFixed(1)}/5, `
	summary += `while ${worstTeam.teamName} (${worstTeam.departmentName}) needs attention at ${worstTeam.avgMood.toFixed(1)}/5. `

	if (topOrgReason) {
		summary += `Across the organization, "${topOrgReason[0]}" remains the top concern.`
	}

	return summary
}

interface Recommendation {
	severity: 'critical' | 'warning' | 'info'
	team: string
	department: string
	title: string
	description: string
	action: string
}

export function generateRecommendations(
	aggregations: TeamAggregation[],
): Recommendation[] {
	const recommendations: Recommendation[] = []

	for (const agg of aggregations) {
		if (agg.avgMood < 3.0) {
			recommendations.push({
				severity: 'critical',
				team: agg.teamName,
				department: agg.departmentName,
				title: `Critical: ${agg.teamName} team morale is very low`,
				description: `Average mood is ${agg.avgMood.toFixed(1)}/5 with ${agg.lowMoodStreaks} stress/burnout reports.`,
				action: `Schedule immediate 1:1s with ${agg.teamName} team members. Consider workload redistribution and a team retrospective.`,
			})
		} else if (agg.avgMood < 3.5) {
			recommendations.push({
				severity: 'warning',
				team: agg.teamName,
				department: agg.departmentName,
				title: `Attention: ${agg.teamName} team trending below average`,
				description: `Average mood is ${agg.avgMood.toFixed(1)}/5, below the healthy threshold.`,
				action: `Review workload and upcoming deadlines for ${agg.teamName}. A casual team check-in could help surface issues early.`,
			})
		}

		const topReason = agg.topReasons[0]
		if (topReason && topReason.percentage > 25) {
			const actionMap: Record<string, string> = {
				'Workload': `Consider reviewing sprint capacity and priorities for ${agg.teamName}. Are there tasks that can be deferred or delegated?`,
				'Team Dynamics': `Consider facilitating a team-building activity or retrospective for ${agg.teamName} to improve collaboration.`,
				'Management': `Schedule skip-level meetings for ${agg.teamName} to gather candid feedback on leadership.`,
				'Growth': `Review learning & development opportunities for ${agg.teamName}. Consider mentorship programs or stretch assignments.`,
				'Recognition': `Implement a peer recognition program for ${agg.teamName}. Small wins deserve acknowledgment.`,
				'Work-Life Balance': `Review meeting loads and after-hours work patterns for ${agg.teamName}. Consider flexible scheduling.`,
				'Company Culture': `Gather specific feedback from ${agg.teamName} about culture concerns through anonymous surveys.`,
				'Personal': `Ensure EAP resources are visible and accessible to ${agg.teamName} members.`,
			}

			if (actionMap[topReason.category]) {
				recommendations.push({
					severity: 'info',
					team: agg.teamName,
					department: agg.departmentName,
					title: `${topReason.category} is a top concern for ${agg.teamName}`,
					description: `${topReason.percentage}% of ${agg.teamName} team members cited "${topReason.category}" this period.`,
					action: actionMap[topReason.category],
				})
			}
		}

		if (agg.avgMood >= 4) {
			recommendations.push({
				severity: 'info',
				team: agg.teamName,
				department: agg.departmentName,
				title: `${agg.teamName} team is thriving!`,
				description: `Average mood is ${agg.avgMood.toFixed(1)}/5 -- identify what's working and replicate it.`,
				action: `Document and share best practices from ${agg.teamName} with other teams. Consider public recognition.`,
			})
		}
	}

	return recommendations.sort((a, b) => {
		const order = { critical: 0, warning: 1, info: 2 }
		return order[a.severity] - order[b.severity]
	})
}

export async function detectLowMoodPatterns(
	consecutiveDays: number = 3,
) {
	const now = new Date()
	const startDate = new Date(now)
	startDate.setDate(startDate.getDate() - 14)

	const entries = await prisma.moodEntry.findMany({
		where: { createdAt: { gte: startDate } },
		select: {
			moodLevel: true,
			createdAt: true,
			employeeId: true,
			employee: {
				select: {
					name: true,
					isAnonymousDefault: true,
					team: {
						select: {
							name: true,
							department: { select: { name: true } },
						},
					},
				},
			},
		},
		orderBy: { createdAt: 'asc' },
	})

	const byEmployee: Record<string, typeof entries> = {}
	for (const entry of entries) {
		const key = entry.employeeId
		if (!byEmployee[key]) byEmployee[key] = []
		byEmployee[key].push(entry)
	}

	const alerts: {
		employeeId: string
		employeeName: string
		isAnonymous: boolean
		teamName: string
		departmentName: string
		streakLength: number
		avgMood: number
	}[] = []

	for (const [empId, empEntries] of Object.entries(byEmployee)) {
		let streak = 0
		let streakSum = 0
		for (const entry of empEntries) {
			if (entry.moodLevel <= 2) {
				streak++
				streakSum += entry.moodLevel
			} else {
				if (streak >= consecutiveDays) {
					const emp = empEntries[0].employee
					alerts.push({
						employeeId: empId,
						employeeName: emp.isAnonymousDefault ? 'Anonymous' : emp.name,
						isAnonymous: emp.isAnonymousDefault,
						teamName: emp.team.name,
						departmentName: emp.team.department.name,
						streakLength: streak,
						avgMood: Math.round((streakSum / streak) * 100) / 100,
					})
				}
				streak = 0
				streakSum = 0
			}
		}
		if (streak >= consecutiveDays) {
			const emp = empEntries[0].employee
			alerts.push({
				employeeId: empId,
				employeeName: emp.isAnonymousDefault ? 'Anonymous' : emp.name,
				isAnonymous: emp.isAnonymousDefault,
				teamName: emp.team.name,
				departmentName: emp.team.department.name,
				streakLength: streak,
				avgMood: Math.round((streakSum / streak) * 100) / 100,
			})
		}
	}

	return alerts
}

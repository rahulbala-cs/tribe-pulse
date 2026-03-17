'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageExportWrapper } from '@/components/dashboard/page-export-wrapper'
import { Badge } from '@/components/ui/badge'
import { TeamBarChart } from '@/components/charts/team-bar-chart'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface TeamData {
	id: string
	name: string
	department: string
	employeeCount: number
	avgMood: number
	prevAvgMood: number
	change: number
	totalEntries: number
	participationRate: number
	topReasons: { category: string; percentage: number }[]
}

interface DeptData {
	name: string
	avgMood: number
	teams: TeamData[]
	employeeCount: number
}

export default function TeamsPage() {
	const [teams, setTeams] = useState<TeamData[]>([])
	const [departments, setDepartments] = useState<DeptData[]>([])

	useEffect(() => {
		fetch('/api/teams?days=7').then(r => r.json()).then(d => {
			setTeams(d.teams)
			setDepartments(d.departments)
		})
	}, [])

	if (teams.length === 0) {
		return (
			<div className="flex items-center justify-center h-96">
				<div className="animate-pulse text-muted-foreground">Loading teams...</div>
			</div>
		)
	}

	const chartData = teams.map(t => ({
		name: t.name,
		avgMood: t.avgMood,
		department: t.department,
	}))

	return (
		<PageExportWrapper title="Teams">
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold">Team Comparison</h2>
				<p className="text-muted-foreground mt-1">
					Compare mood scores across departments and teams
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Team Mood Ranking</CardTitle>
				</CardHeader>
				<CardContent>
					<TeamBarChart data={chartData} height={teams.length * 44} />
					<div className="flex items-center gap-6 mt-4 justify-center">
						{departments.map(d => (
							<div key={d.name} className="flex items-center gap-2 text-sm">
								<div
									className="w-3 h-3 rounded"
									style={{
										backgroundColor:
											d.name === 'Engineering' ? '#3b82f6'
												: d.name === 'Product' ? '#8b5cf6' : '#f59e0b',
									}}
								/>
								{d.name} ({d.avgMood.toFixed(1)})
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{teams
					.sort((a, b) => b.avgMood - a.avgMood)
					.map(team => (
						<Card key={team.id}>
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<CardTitle className="text-sm font-medium">{team.name}</CardTitle>
									<Badge variant="outline" className="text-xs">
										{team.department}
									</Badge>
								</div>
							</CardHeader>
							<CardContent>
								<div className="flex items-baseline gap-2">
									<span className="text-2xl font-bold">
										{team.avgMood.toFixed(1)}
									</span>
									<span className="text-sm text-muted-foreground">/5</span>
									<div className="flex items-center gap-0.5 ml-auto">
										{team.change > 0 ? (
											<TrendingUp className="h-3 w-3 text-emerald-500" />
										) : team.change < 0 ? (
											<TrendingDown className="h-3 w-3 text-red-500" />
										) : (
											<Minus className="h-3 w-3 text-gray-400" />
										)}
										<span
											className={`text-xs ${
												team.change > 0 ? 'text-emerald-500'
													: team.change < 0 ? 'text-red-500'
														: 'text-gray-400'
											}`}
										>
											{team.change > 0 ? '+' : ''}{team.change.toFixed(2)}
										</span>
									</div>
								</div>
								<div className="mt-3 space-y-1">
									<div className="flex justify-between text-xs text-muted-foreground">
										<span>{team.employeeCount} members</span>
										<span>{team.participationRate}% participation</span>
									</div>
									{team.topReasons.length > 0 && (
										<div className="flex flex-wrap gap-1 mt-2">
											{team.topReasons.map(r => (
												<Badge key={r.category} variant="secondary" className="text-[10px]">
													{r.category} ({r.percentage}%)
												</Badge>
											))}
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					))}
			</div>
		</div>
		</PageExportWrapper>
	)
}

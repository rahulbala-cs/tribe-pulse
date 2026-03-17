'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageExportWrapper } from '@/components/dashboard/page-export-wrapper'
import { MoodAreaChart } from '@/components/charts/mood-area-chart'
import {
	Select, SelectContent, SelectItem,
	SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface TrendData {
	trends: { date: string; avgMood: number; totalEntries: number }[]
	summary: {
		avgMood: number
		totalEntries: number
		participationRate: number
	}
}

interface TeamOption {
	id: string
	name: string
	department: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function TrendsPage() {
	const [days, setDays] = useState('30')
	const [groupBy, setGroupBy] = useState('day')
	const [selectedTeam, setSelectedTeam] = useState('all')

	const { data: teamsData } = useSWR<{ teams: TeamOption[] }>('/api/teams?days=30', fetcher, { dedupingInterval: 300000 })
	const teams = teamsData?.teams ?? []

	const trendsParams = new URLSearchParams({ days, groupBy })
	if (selectedTeam !== 'all') trendsParams.set('teamId', selectedTeam)
	const { data } = useSWR<TrendData>(`/api/trends?${trendsParams}`, fetcher, { dedupingInterval: 60000 })

	if (!data) {
		return (
			<div className="flex items-center justify-center h-96">
				<div className="animate-pulse text-muted-foreground">Loading trends...</div>
			</div>
		)
	}

	return (
		<PageExportWrapper title="Trends">
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold">Mood Trends</h2>
					<p className="text-muted-foreground mt-1">
						Track mood changes over time across the organization
					</p>
				</div>
				<div className="flex items-center gap-3">
					<Select value={selectedTeam} onValueChange={(v) => v && setSelectedTeam(v)}>
						<SelectTrigger className="w-40">
							<SelectValue placeholder="All Teams" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Teams</SelectItem>
							{teams.map(t => (
								<SelectItem key={t.id} value={t.id}>
									{t.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select value={days} onValueChange={(v) => v && setDays(v)}>
						<SelectTrigger className="w-32">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="7">7 Days</SelectItem>
							<SelectItem value="14">14 Days</SelectItem>
							<SelectItem value="30">30 Days</SelectItem>
						</SelectContent>
					</Select>
					<Select value={groupBy} onValueChange={(v) => v && setGroupBy(v)}>
						<SelectTrigger className="w-32">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="day">Daily</SelectItem>
							<SelectItem value="week">Weekly</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Average Mood
						</CardTitle>
					</CardHeader>
					<CardContent>
						<span className="text-3xl font-bold">{data.summary.avgMood.toFixed(2)}</span>
						<span className="text-lg text-muted-foreground">/5</span>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Total Responses
						</CardTitle>
					</CardHeader>
					<CardContent>
						<span className="text-3xl font-bold">{data.summary.totalEntries}</span>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Participation
						</CardTitle>
					</CardHeader>
					<CardContent>
						<span className="text-3xl font-bold">{data.summary.participationRate}%</span>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Mood Over Time</CardTitle>
				</CardHeader>
				<CardContent>
					<MoodAreaChart data={data.trends} height={400} />
				</CardContent>
			</Card>
		</div>
		</PageExportWrapper>
	)
}

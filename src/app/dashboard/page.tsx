'use client'

import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageExportWrapper } from '@/components/dashboard/page-export-wrapper'
import { Badge } from '@/components/ui/badge'
import { Sparkline } from '@/components/charts/sparkline'
import { MoodAreaChart } from '@/components/charts/mood-area-chart'
import {
	Users, TrendingUp, TrendingDown, Activity,
	AlertTriangle, BarChart3,
} from 'lucide-react'
import { MOOD_SCALE } from '@/lib/constants'

interface TrendData {
	trends: { date: string; avgMood: number; totalEntries: number }[]
	summary: {
		avgMood: number
		totalEntries: number
		totalEmployees: number
		participationRate: number
		moodDistribution: number[]
		topReasons: { category: string; count: number }[]
	}
}

interface InsightData {
	orgSummary: string
	recommendations: {
		severity: string
		team: string
		title: string
		description: string
	}[]
	patterns: {
		employeeName: string
		teamName: string
		streakLength: number
	}[]
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function OverviewPage() {
	const { data: trendData } = useSWR<TrendData>('/api/trends?days=30', fetcher, { dedupingInterval: 300000 })
	const { data: insights } = useSWR<InsightData>('/api/insights', fetcher, { dedupingInterval: 300000 })

	if (!trendData || !insights) {
		return (
			<div className="flex items-center justify-center h-96">
				<div className="animate-pulse text-muted-foreground">
					Loading dashboard...
				</div>
			</div>
		)
	}

	const { summary, trends } = trendData
	const sparkData = trends.slice(-14).map(t => ({ value: t.avgMood }))
	const moodInfo = MOOD_SCALE.find(m => m.level === Math.round(summary.avgMood))
	const criticalAlerts = insights.recommendations.filter(r => r.severity === 'critical')
	const prevWeekMood = trends.length >= 14
		? trends.slice(-14, -7).reduce((s, t) => s + t.avgMood, 0) / 7
		: summary.avgMood
	const moodChange = summary.avgMood - prevWeekMood
	const isUp = moodChange >= 0

	return (
		<PageExportWrapper title="Overview">
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold">Dashboard Overview</h2>
				<p className="text-muted-foreground mt-1">
					Organization-wide mood intelligence at a glance
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Org Mood Score
						</CardTitle>
						<Activity className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="flex items-baseline gap-2">
							<span className="text-3xl font-bold">
								{summary.avgMood.toFixed(1)}
							</span>
							<span className="text-lg">/5</span>
							<span className="text-xl">{moodInfo?.emoji}</span>
						</div>
						<div className="flex items-center gap-1 mt-1">
							{isUp ? (
								<TrendingUp className="h-3 w-3 text-emerald-500" />
							) : (
								<TrendingDown className="h-3 w-3 text-red-500" />
							)}
							<span className={`text-xs ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
								{isUp ? '+' : ''}{moodChange.toFixed(2)} from last week
							</span>
						</div>
						<Sparkline data={sparkData} height={32} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Participation Rate
						</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">
							{summary.participationRate}%
						</div>
						<p className="text-xs text-muted-foreground mt-1">
							{summary.totalEntries} entries from {summary.totalEmployees} employees
						</p>
						<div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
							<div
								className="h-full bg-emerald-500 rounded-full"
								style={{ width: `${summary.participationRate}%` }}
							/>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Top Concern
						</CardTitle>
						<BarChart3 className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-xl font-bold">
							{summary.topReasons[0]?.category || 'N/A'}
						</div>
						<p className="text-xs text-muted-foreground mt-1">
							{summary.topReasons[0]?.count || 0} mentions in 30 days
						</p>
						<div className="flex flex-wrap gap-1 mt-2">
							{summary.topReasons.slice(1, 4).map(r => (
								<Badge key={r.category} variant="secondary" className="text-xs">
									{r.category}
								</Badge>
							))}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Alerts
						</CardTitle>
						<AlertTriangle className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">
							{criticalAlerts.length + insights.patterns.length}
						</div>
						<p className="text-xs text-muted-foreground mt-1">
							{criticalAlerts.length} critical, {insights.patterns.length} burnout risks
						</p>
						{insights.patterns.length > 0 && (
							<Badge variant="destructive" className="mt-2 text-xs">
								{insights.patterns.length} sustained low mood
							</Badge>
						)}
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle className="text-base">30-Day Mood Trend</CardTitle>
					</CardHeader>
					<CardContent>
						<MoodAreaChart data={trends} height={280} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">AI Summary</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground leading-relaxed">
							{insights.orgSummary}
						</p>
						{criticalAlerts.length > 0 && (
							<div className="mt-4 space-y-2">
								<p className="text-xs font-semibold text-red-600">
									Critical Alerts:
								</p>
								{criticalAlerts.slice(0, 3).map((alert, i) => (
									<div
										key={i}
										className="text-xs p-2 bg-red-50 dark:bg-red-950/30 rounded border border-red-200 dark:border-red-900"
									>
										<p className="font-medium text-red-700 dark:text-red-400">
											{alert.title}
										</p>
										<p className="text-red-600/70 dark:text-red-500/70 mt-0.5">
											{alert.description}
										</p>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Mood Distribution (30 Days)</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-end gap-2 h-32">
						{summary.moodDistribution.map((count, i) => {
							const mood = MOOD_SCALE[i]
							const max = Math.max(...summary.moodDistribution, 1)
							const pct = (count / max) * 100
							return (
								<div key={i} className="flex-1 flex flex-col items-center gap-1">
									<span className="text-xs text-muted-foreground">{count}</span>
									<div
										className="w-full rounded-t transition-all"
										style={{
											height: `${pct}%`,
											backgroundColor: mood.color,
											minHeight: count > 0 ? '4px' : '0',
										}}
									/>
									<span className="text-lg">{mood.emoji}</span>
									<span className="text-xs text-muted-foreground">
										{mood.label}
									</span>
								</div>
							)
						})}
					</div>
				</CardContent>
			</Card>
		</div>
		</PageExportWrapper>
	)
}

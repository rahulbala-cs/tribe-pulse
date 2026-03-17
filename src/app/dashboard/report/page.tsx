'use client'

import { useRef, useEffect } from 'react'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { PageExportWrapper } from '@/components/dashboard/page-export-wrapper'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { MoodAreaChart } from '@/components/charts/mood-area-chart'
import { TeamBarChart } from '@/components/charts/team-bar-chart'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { exportPaginatedPdf } from '@/lib/export-pdf'

type TrendsResp = {
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
type TeamData = {
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
type TeamsResp = { teams: TeamData[]; departments: { name: string; avgMood: number }[] }
type InsightsResp = {
	orgSummary: string
	teamSummaries: { team: string; department: string; summary: string; avgMood: number; prevAvgMood: number }[]
	recommendations: { severity: 'critical' | 'warning' | 'info'; team: string; department: string; title: string; description: string; action: string }[]
	patterns: { employeeName: string; teamName: string; departmentName: string; streakLength: number; avgMood: number; isAnonymous: boolean }[]
	events: { id: string; name: string; description: string | null; date: string }[]
	heatmapData: { day: string; avgMood: number; count: number }[]
}

const SEVERITY_COLORS = {
	critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', Icon: AlertTriangle },
	warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', Icon: AlertCircle },
	info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', Icon: Info },
}

function getMoodColor(mood: number) {
	if (mood >= 4.0) return '#10b981'
	if (mood >= 3.5) return '#22c55e'
	if (mood >= 3.0) return '#eab308'
	if (mood >= 2.5) return '#f97316'
	return '#ef4444'
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ReportPage() {
	const { data: trends } = useSWR<TrendsResp>('/api/trends?days=30', fetcher, { dedupingInterval: 300000 })
	const { data: teamsData } = useSWR<TeamsResp>('/api/teams?days=7', fetcher, { dedupingInterval: 300000 })
	const { data: insights } = useSWR<InsightsResp>('/api/insights', fetcher, { dedupingInterval: 300000 })
	const contentRef = useRef<HTMLDivElement>(null)
	const autoExportDone = useRef(false)

	useEffect(() => {
		if (autoExportDone.current || !trends || !teamsData || !insights || !contentRef.current) return
		const params = new URLSearchParams(window.location.search)
		if (params.get('autoexport') !== '1') return
		autoExportDone.current = true
		exportPaginatedPdf(contentRef.current, 'tribe-pulse-full-report')
	}, [trends, teamsData, insights])

	if (!trends || !teamsData || !insights) {
		return (
			<div className="flex items-center justify-center h-96">
				<div className="animate-pulse text-muted-foreground">Loading report...</div>
			</div>
		)
	}

	const { teams } = teamsData
	const sectionClass = 'space-y-4 p-6 border border-border rounded-lg bg-card'
	const totalMentions = trends.summary.topReasons.reduce((s, r) => s + r.count, 0)

	return (
		<PageExportWrapper title="Full Report">
		<div className="space-y-8">
			<div>
				<h2 className="text-2xl font-bold">Full Report</h2>
				<p className="text-muted-foreground mt-1">All screens in one view. Export as PDF for sharing.</p>
			</div>

			<div ref={contentRef} className="space-y-6">

			{/* 1. Overview */}
			<div className={sectionClass}>
				<h3 className="text-lg font-semibold">1. Overview</h3>
				<p className="text-sm text-muted-foreground">{insights.orgSummary}</p>
				<div className="grid grid-cols-4 gap-4">
					<Card><CardContent className="pt-4">
						<p className="text-2xl font-bold">{trends.summary.avgMood.toFixed(1)}/5</p>
						<p className="text-xs text-muted-foreground">Org Mood Score</p>
					</CardContent></Card>
					<Card><CardContent className="pt-4">
						<p className="text-2xl font-bold">{trends.summary.totalEntries}</p>
						<p className="text-xs text-muted-foreground">Total Responses</p>
					</CardContent></Card>
					<Card><CardContent className="pt-4">
						<p className="text-2xl font-bold">{trends.summary.participationRate}%</p>
						<p className="text-xs text-muted-foreground">Participation Rate</p>
					</CardContent></Card>
					<Card><CardContent className="pt-4">
						<p className="text-2xl font-bold">{trends.summary.totalEmployees}</p>
						<p className="text-xs text-muted-foreground">Total Employees</p>
					</CardContent></Card>
				</div>
				{trends.summary.moodDistribution && (
					<div>
						<p className="text-xs font-medium text-muted-foreground mb-2">Mood Distribution</p>
						<div className="flex gap-2 h-16 items-end">
							{trends.summary.moodDistribution.map((count, i) => {
								const max = Math.max(...trends.summary.moodDistribution, 1)
								const labels = ['😞', '😕', '😐', '🙂', '😄']
								return (
									<div key={i} className="flex-1 flex flex-col items-center gap-1">
										<span className="text-xs text-muted-foreground">{count}</span>
										<div className="w-full rounded-t" style={{ height: `${(count / max) * 48}px`, backgroundColor: getMoodColor(i + 1), minHeight: count > 0 ? '4px' : '0' }} />
										<span className="text-sm">{labels[i]}</span>
									</div>
								)
							})}
						</div>
					</div>
				)}
			</div>

			{/* 2. Mood Trends */}
			<div className={sectionClass}>
				<h3 className="text-lg font-semibold">2. 30-Day Mood Trends</h3>
				<MoodAreaChart data={trends.trends} height={280} isAnimationActive={false} />
			</div>

			{/* 3. Team Comparison */}
			<div className={sectionClass}>
				<h3 className="text-lg font-semibold">3. Team Comparison</h3>
				<TeamBarChart data={teams} height={teams.length * 44} isAnimationActive={false} />
				<div className="grid grid-cols-2 gap-3 mt-4">
					{teams.sort((a, b) => b.avgMood - a.avgMood).map(team => (
						<div key={team.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
							<div>
								<p className="text-sm font-medium">{team.name}</p>
								<p className="text-xs text-muted-foreground">{team.department} · {team.employeeCount} members</p>
							</div>
							<div className="text-right">
								<div className="flex items-center gap-1">
									<span className="text-lg font-bold" style={{ color: getMoodColor(team.avgMood) }}>{team.avgMood.toFixed(1)}</span>
									<span className="text-xs text-muted-foreground">/5</span>
									{team.change > 0 ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : team.change < 0 ? <TrendingDown className="h-3 w-3 text-red-500" /> : <Minus className="h-3 w-3 text-gray-400" />}
									<span className={`text-xs ${team.change > 0 ? 'text-emerald-500' : team.change < 0 ? 'text-red-500' : 'text-gray-400'}`}>{team.change > 0 ? '+' : ''}{team.change.toFixed(2)}</span>
								</div>
								<p className="text-xs text-muted-foreground">{team.participationRate}% participation</p>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* 4. Day-of-Week Heatmap */}
			<div className={sectionClass}>
				<h3 className="text-lg font-semibold">4. Day-of-Week Heatmap</h3>
				<div className="grid grid-cols-5 gap-3">
					{insights.heatmapData.map(d => (
						<div key={d.day} className="rounded-xl p-4 text-center" style={{ border: `2px solid ${getMoodColor(d.avgMood)}`, backgroundColor: `${getMoodColor(d.avgMood)}15` }}>
							<p className="font-semibold text-sm">{d.day}</p>
							<p className="text-3xl font-bold mt-1" style={{ color: getMoodColor(d.avgMood) }}>{d.avgMood.toFixed(1)}</p>
							<p className="text-xs text-muted-foreground mt-1">{d.count} responses</p>
						</div>
					))}
				</div>
			</div>

			{/* 5. Reasons Breakdown */}
			<div className={sectionClass}>
				<h3 className="text-lg font-semibold">5. Reasons Breakdown</h3>
				<div className="grid grid-cols-2 gap-3">
					{trends.summary.topReasons.map((r, i) => {
						const pct = Math.round((r.count / Math.max(totalMentions, 1)) * 100)
						return (
							<div key={r.category} className="p-3 rounded-lg border border-border">
								<div className="flex items-center justify-between mb-1">
									<p className="text-sm font-medium">#{i + 1} {r.category}</p>
									<span className="text-xs text-muted-foreground">{r.count} mentions</span>
								</div>
								<div className="h-2 bg-secondary rounded-full overflow-hidden">
									<div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
								</div>
								<p className="text-xs text-muted-foreground mt-1">{pct}% of all mentions</p>
							</div>
						)
					})}
				</div>
			</div>

			{/* 6. AI Insights & Recommendations */}
			<div className={sectionClass}>
				<h3 className="text-lg font-semibold">6. AI Insights & Recommendations</h3>
				{insights.patterns.length > 0 && (
					<div className="p-3 rounded-lg bg-red-50 border border-red-200 mb-3">
						<p className="text-sm font-medium text-red-700">Burnout Risk Alerts ({insights.patterns.length})</p>
						<div className="mt-2 space-y-1">
							{insights.patterns.map((p, i) => (
								<p key={i} className="text-xs text-red-600">
									{p.isAnonymous ? 'Anonymous' : p.employeeName} — {p.teamName} · {p.streakLength}+ low-mood days (avg {p.avgMood.toFixed(1)}/5)
								</p>
							))}
						</div>
					</div>
				)}
				<div className="space-y-2">
					{insights.recommendations.map((rec, i) => {
						const { bg, border, text, Icon } = SEVERITY_COLORS[rec.severity]
						return (
							<div key={i} className={`p-3 rounded-lg border ${bg} ${border}`}>
								<div className="flex items-start gap-2">
									<Icon className={`h-4 w-4 mt-0.5 shrink-0 ${text}`} />
									<div>
										<p className={`text-sm font-medium ${text}`}>{rec.title}</p>
										<p className="text-xs text-muted-foreground mt-0.5">{rec.description}</p>
										<p className="text-xs font-medium mt-1">Action: {rec.action}</p>
									</div>
								</div>
							</div>
						)
					})}
				</div>
			</div>

			{/* 7. Team Summaries */}
			<div className={sectionClass}>
				<h3 className="text-lg font-semibold">7. Team Summaries</h3>
				<div className="space-y-3">
					{insights.teamSummaries.map(ts => {
						const change = ts.avgMood - ts.prevAvgMood
						return (
							<div key={ts.team} className="p-3 rounded-lg border border-border">
								<div className="flex items-center justify-between mb-1">
									<div>
										<span className="text-sm font-medium">{ts.team}</span>
										<span className="text-xs text-muted-foreground ml-2">{ts.department}</span>
									</div>
									<div className="flex items-center gap-1">
										<span className="text-sm font-bold">{ts.avgMood.toFixed(1)}/5</span>
										<span className={`text-xs ${change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(2)}</span>
									</div>
								</div>
								<p className="text-xs text-muted-foreground">{ts.summary}</p>
							</div>
						)
					})}
				</div>
			</div>

			{/* 8. Org Events */}
			{insights.events.length > 0 && (
				<div className={sectionClass}>
					<h3 className="text-lg font-semibold">8. Organizational Events</h3>
					<div className="space-y-2">
						{insights.events.map(event => (
							<div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
								<div className="w-1 self-stretch rounded-full bg-primary shrink-0" />
								<div>
									<p className="text-sm font-medium">{event.name}</p>
									<p className="text-xs text-muted-foreground">{new Date(event.date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
									{event.description && <p className="text-xs text-muted-foreground mt-1">{event.description}</p>}
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			</div>{/* end contentRef */}
		</div>
		</PageExportWrapper>
	)
}

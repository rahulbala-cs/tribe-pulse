'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageExportWrapper } from '@/components/dashboard/page-export-wrapper'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { MoodAreaChart } from '@/components/charts/mood-area-chart'
import { TeamBarChart } from '@/components/charts/team-bar-chart'
import { exportElementsToPdf } from '@/lib/export-pdf'

export default function ReportPage() {
	const [data, setData] = useState<{
		trends: { trends: { date: string; avgMood: number }[]; summary: { avgMood: number; totalEntries: number; participationRate: number; topReasons: { category: string; count: number }[] } }
		teams: { teams: { name: string; avgMood: number; department: string }[] }
		insights: { orgSummary: string; recommendations: { severity: string; title: string; description: string }[]; patterns: { teamName: string; streakLength: number }[]; heatmapData: { day: string; avgMood: number }[] }
	} | null>(null)
	const [exporting, setExporting] = useState(false)
	const sectionRefs = useRef<(HTMLDivElement | null)[]>([])

	useEffect(() => {
		Promise.all([
			fetch('/api/trends?days=30').then(r => r.json()),
			fetch('/api/teams?days=7').then(r => r.json()),
			fetch('/api/insights').then(r => r.json()),
		]).then(([trends, teams, insights]) => {
			setData({ trends, teams, insights })
		})
	}, [])

	async function handleExportFullReport() {
		const elements = sectionRefs.current.filter(Boolean) as HTMLElement[]
		if (elements.length === 0) return
		setExporting(true)
		try {
			await exportElementsToPdf(elements, 'tribe-pulse-full-report')
		} finally {
			setExporting(false)
		}
	}

	if (!data) {
		return (
			<div className="flex items-center justify-center h-96">
				<div className="animate-pulse text-muted-foreground">
					Loading report...
				</div>
			</div>
		)
	}

	const { trends, teams, insights } = data
	const sectionClass = 'space-y-4 p-6 border border-border rounded-lg bg-card'

	return (
		<PageExportWrapper title="Full Report">
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold">Full Report</h2>
					<p className="text-muted-foreground mt-1">
						All screens in one view. Export as PDF for sharing.
					</p>
				</div>
				<Button onClick={handleExportFullReport} disabled={exporting}>
					{exporting ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Download className="h-4 w-4" />
					)}
					<span className="ml-2">Export full report (PDF)</span>
				</Button>
			</div>

			{/* Section 1: Overview */}
			<div
				ref={el => { sectionRefs.current[0] = el }}
				className={sectionClass}
			>
				<h3 className="text-lg font-semibold">1. Overview</h3>
				<p className="text-sm text-muted-foreground">{insights.orgSummary}</p>
				<div className="grid grid-cols-3 gap-4">
					<Card>
						<CardContent className="pt-4">
							<p className="text-2xl font-bold">{trends.summary.avgMood.toFixed(1)}/5</p>
							<p className="text-xs text-muted-foreground">Org Mood</p>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-4">
							<p className="text-2xl font-bold">{trends.summary.totalEntries}</p>
							<p className="text-xs text-muted-foreground">Responses</p>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-4">
							<p className="text-2xl font-bold">{trends.summary.participationRate}%</p>
							<p className="text-xs text-muted-foreground">Participation</p>
						</CardContent>
					</Card>
				</div>
				<p className="text-xs text-muted-foreground">
					Top concerns: {trends.summary.topReasons.slice(0, 3).map(r => r.category).join(', ')}
				</p>
			</div>

			{/* Section 2: Trends */}
			<div
				ref={el => { sectionRefs.current[1] = el }}
				className={sectionClass}
			>
				<h3 className="text-lg font-semibold">2. Mood Trends</h3>
				<MoodAreaChart
					data={trends.trends.map(t => ({
						date: t.date,
						avgMood: t.avgMood,
						totalEntries: 'totalEntries' in t ? (t as { totalEntries: number }).totalEntries : 0,
					}))}
					height={280}
				/>
			</div>

			{/* Section 3: Teams */}
			<div
				ref={el => { sectionRefs.current[2] = el }}
				className={sectionClass}
			>
				<h3 className="text-lg font-semibold">3. Team Comparison</h3>
				<TeamBarChart data={teams.teams} height={280} />
			</div>

			{/* Section 4: Heatmap */}
			<div
				ref={el => { sectionRefs.current[3] = el }}
				className={sectionClass}
			>
				<h3 className="text-lg font-semibold">4. Day-of-Week Heatmap</h3>
				<div className="flex gap-4 flex-wrap">
					{insights.heatmapData.map(d => (
						<div
							key={d.day}
							className="rounded-lg border px-4 py-3 min-w-[100px] text-center"
							style={{
								borderColor: d.avgMood >= 3.5 ? '#22c55e' : d.avgMood >= 3 ? '#eab308' : '#f97316',
							}}
						>
							<p className="font-semibold">{d.day}</p>
							<p className="text-2xl font-bold">{d.avgMood.toFixed(1)}</p>
						</div>
					))}
				</div>
			</div>

			{/* Section 5: Reasons - summary only */}
			<div
				ref={el => { sectionRefs.current[4] = el }}
				className={sectionClass}
			>
				<h3 className="text-lg font-semibold">5. Reasons Breakdown</h3>
				<div className="flex flex-wrap gap-2">
					{trends.summary.topReasons.map((r, i) => (
						<span key={r.category} className="text-sm px-3 py-1 bg-secondary rounded-full">
							{i + 1}. {r.category} ({r.count})
						</span>
					))}
				</div>
			</div>

			{/* Section 6: AI Insights */}
			<div
				ref={el => { sectionRefs.current[5] = el }}
				className={sectionClass}
			>
				<h3 className="text-lg font-semibold">6. AI Insights & Recommendations</h3>
				<p className="text-sm mb-4">{insights.orgSummary}</p>
				{insights.patterns.length > 0 && (
					<p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
						Burnout risk: {insights.patterns.length} employees with 3+ low-mood days
					</p>
				)}
				<div className="space-y-2">
					{insights.recommendations.slice(0, 5).map((rec, i) => (
						<div key={i} className="text-sm p-2 rounded border">
							<span className="font-medium">[{rec.severity}]</span> {rec.title}
							<p className="text-muted-foreground text-xs mt-1">{rec.description}</p>
						</div>
					))}
				</div>
			</div>

			{/* Section 7: Correlation - placeholder text for report */}
			<div
				ref={el => { sectionRefs.current[6] = el }}
				className={sectionClass}
			>
				<h3 className="text-lg font-semibold">7. Event Correlation</h3>
				<p className="text-sm text-muted-foreground">
					Mood trends can be correlated with organizational events (reorgs, launches, offsites).
					View the Correlation page for the full timeline chart.
				</p>
			</div>
		</div>
		</PageExportWrapper>
	)
}

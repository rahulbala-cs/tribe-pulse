'use client'

import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageExportWrapper } from '@/components/dashboard/page-export-wrapper'

interface HeatmapDay {
	day: string
	avgMood: number
	count: number
}

function getMoodColor(mood: number): string {
	if (mood >= 4.0) return '#10b981'
	if (mood >= 3.5) return '#22c55e'
	if (mood >= 3.0) return '#eab308'
	if (mood >= 2.5) return '#f97316'
	return '#ef4444'
}

function getMoodBg(mood: number): string {
	if (mood >= 4.0) return 'bg-emerald-100 dark:bg-emerald-950/40'
	if (mood >= 3.5) return 'bg-green-100 dark:bg-green-950/40'
	if (mood >= 3.0) return 'bg-yellow-100 dark:bg-yellow-950/40'
	if (mood >= 2.5) return 'bg-orange-100 dark:bg-orange-950/40'
	return 'bg-red-100 dark:bg-red-950/40'
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function HeatmapPage() {
	const { data } = useSWR<{ heatmapData: HeatmapDay[] }>('/api/insights', fetcher, { dedupingInterval: 300000 })
	const heatmapData = data?.heatmapData ?? []

	if (heatmapData.length === 0) {
		return (
			<div className="flex items-center justify-center h-96">
				<div className="animate-pulse text-muted-foreground">Loading heatmap...</div>
			</div>
		)
	}

	const maxCount = Math.max(...heatmapData.map(d => d.count))
	const avgAll = heatmapData.reduce((s, d) => s + d.avgMood, 0) / heatmapData.length
	const bestDay = heatmapData.reduce((a, b) => a.avgMood > b.avgMood ? a : b)
	const worstDay = heatmapData.reduce((a, b) => a.avgMood < b.avgMood ? a : b)

	return (
		<PageExportWrapper title="Heatmap">
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold">Day-of-Week Heatmap</h2>
				<p className="text-muted-foreground mt-1">
					Mood patterns across weekdays over the last 30 days
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Best Day
						</CardTitle>
					</CardHeader>
					<CardContent>
						<span className="text-2xl font-bold">{bestDay.day}</span>
						<p className="text-sm text-emerald-600 mt-1">
							Avg mood: {bestDay.avgMood.toFixed(2)}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Lowest Day
						</CardTitle>
					</CardHeader>
					<CardContent>
						<span className="text-2xl font-bold">{worstDay.day}</span>
						<p className="text-sm text-red-600 mt-1">
							Avg mood: {worstDay.avgMood.toFixed(2)}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Weekly Average
						</CardTitle>
					</CardHeader>
					<CardContent>
						<span className="text-2xl font-bold">{avgAll.toFixed(2)}</span>
						<p className="text-sm text-muted-foreground mt-1">
							Across all weekdays
						</p>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Mood by Day of Week</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-5 gap-4">
						{heatmapData.map(day => (
							<div
								key={day.day}
								className={`rounded-xl p-6 text-center transition-all ${getMoodBg(day.avgMood)}`}
								style={{
									border: `2px solid ${getMoodColor(day.avgMood)}`,
								}}
							>
								<h3 className="text-lg font-semibold">{day.day}</h3>
								<div
									className="text-4xl font-bold mt-3"
									style={{ color: getMoodColor(day.avgMood) }}
								>
									{day.avgMood.toFixed(1)}
								</div>
								<p className="text-sm text-muted-foreground mt-2">
									{day.count} responses
								</p>
								<div className="mt-3 h-2 bg-background/50 rounded-full overflow-hidden">
									<div
										className="h-full rounded-full transition-all"
										style={{
											width: `${(day.count / maxCount) * 100}%`,
											backgroundColor: getMoodColor(day.avgMood),
										}}
									/>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Pattern Analysis</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{worstDay.avgMood < avgAll - 0.15 && (
							<div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
								<p className="text-sm font-medium text-amber-800 dark:text-amber-300">
									{worstDay.day} Dip Detected
								</p>
								<p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-1">
									{worstDay.day}s consistently show lower mood ({worstDay.avgMood.toFixed(2)}) compared
									to the weekly average ({avgAll.toFixed(2)}). Consider lighter meeting schedules
									or team check-ins on {worstDay.day}s.
								</p>
							</div>
						)}
						{bestDay.avgMood > avgAll + 0.15 && (
							<div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900">
								<p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
									{bestDay.day} Peak
								</p>
								<p className="text-xs text-emerald-700/70 dark:text-emerald-400/70 mt-1">
									{bestDay.day}s show the highest mood ({bestDay.avgMood.toFixed(2)}).
									Identify what makes {bestDay.day}s better and try to replicate it across the week.
								</p>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
		</PageExportWrapper>
	)
}

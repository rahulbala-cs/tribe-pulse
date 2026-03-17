'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageExportWrapper } from '@/components/dashboard/page-export-wrapper'
import { Badge } from '@/components/ui/badge'
import { ReasonsChart } from '@/components/charts/reasons-chart'

interface TrendData {
	trends: {
		date: string
		avgMood: number
		totalEntries: number
		reasons: Record<string, number>
	}[]
	summary: {
		topReasons: { category: string; count: number }[]
		totalEntries: number
	}
}

const REASON_COLORS: Record<string, string> = {
	'Workload': '#ef4444',
	'Team Dynamics': '#3b82f6',
	'Management': '#f97316',
	'Growth': '#22c55e',
	'Recognition': '#eab308',
	'Work-Life Balance': '#8b5cf6',
	'Company Culture': '#06b6d4',
	'Personal': '#ec4899',
}

export default function ReasonsPage() {
	const [data, setData] = useState<TrendData | null>(null)

	useEffect(() => {
		fetch('/api/trends?days=30&groupBy=day').then(r => r.json()).then(setData)
	}, [])

	if (!data) {
		return (
			<div className="flex items-center justify-center h-96">
				<div className="animate-pulse text-muted-foreground">Loading reasons...</div>
			</div>
		)
	}

	const { summary, trends } = data
	const totalMentions = summary.topReasons.reduce((s, r) => s + r.count, 0)

	return (
		<PageExportWrapper title="Reasons">
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold">Reasons Breakdown</h2>
				<p className="text-muted-foreground mt-1">
					Understanding what drives employee mood across the organization
				</p>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				{summary.topReasons.slice(0, 8).map((reason, i) => {
					const pct = Math.round((reason.count / Math.max(totalMentions, 1)) * 100)
					const color = REASON_COLORS[reason.category] || '#6b7280'
					return (
						<Card key={reason.category}>
							<CardContent className="pt-4">
								<div className="flex items-center justify-between mb-2">
									<Badge
										variant="outline"
										className="text-xs"
										style={{ borderColor: color, color }}
									>
										#{i + 1}
									</Badge>
									<span className="text-xs text-muted-foreground">
										{reason.count} mentions
									</span>
								</div>
								<p className="font-medium text-sm">{reason.category}</p>
								<div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
									<div
										className="h-full rounded-full"
										style={{ width: `${pct}%`, backgroundColor: color }}
									/>
								</div>
								<p className="text-xs text-muted-foreground mt-1">{pct}% of all mentions</p>
							</CardContent>
						</Card>
					)
				})}
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Reason Categories Over Time</CardTitle>
				</CardHeader>
				<CardContent>
					<ReasonsChart
						data={trends.map(t => ({ date: t.date, reasons: t.reasons }))}
						height={400}
					/>
				</CardContent>
			</Card>
		</div>
		</PageExportWrapper>
	)
}

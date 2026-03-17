'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageExportWrapper } from '@/components/dashboard/page-export-wrapper'
import {
	AlertTriangle, AlertCircle, Info,
	Brain, Lightbulb, Users,
} from 'lucide-react'

interface Recommendation {
	severity: 'critical' | 'warning' | 'info'
	team: string
	department: string
	title: string
	description: string
	action: string
}

interface Pattern {
	employeeName: string
	teamName: string
	departmentName: string
	streakLength: number
	avgMood: number
	isAnonymous: boolean
}

interface TeamSummary {
	team: string
	department: string
	summary: string
	avgMood: number
	prevAvgMood: number
}

interface InsightData {
	orgSummary: string
	teamSummaries: TeamSummary[]
	recommendations: Recommendation[]
	patterns: Pattern[]
}

const severityConfig = {
	critical: {
		icon: AlertTriangle,
		bg: 'bg-red-50 dark:bg-red-950/30',
		border: 'border-red-200 dark:border-red-900',
		text: 'text-red-700 dark:text-red-400',
		badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
	},
	warning: {
		icon: AlertCircle,
		bg: 'bg-amber-50 dark:bg-amber-950/30',
		border: 'border-amber-200 dark:border-amber-900',
		text: 'text-amber-700 dark:text-amber-400',
		badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
	},
	info: {
		icon: Info,
		bg: 'bg-blue-50 dark:bg-blue-950/30',
		border: 'border-blue-200 dark:border-blue-900',
		text: 'text-blue-700 dark:text-blue-400',
		badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
	},
}

export default function InsightsPage() {
	const [data, setData] = useState<InsightData | null>(null)

	useEffect(() => {
		fetch('/api/insights').then(r => r.json()).then(setData)
	}, [])

	if (!data) {
		return (
			<div className="flex items-center justify-center h-96">
				<div className="animate-pulse text-muted-foreground">
					Generating AI insights...
				</div>
			</div>
		)
	}

	return (
		<PageExportWrapper title="AI Insights">
		<div className="space-y-6">
			<div className="flex items-center gap-2">
				<Brain className="h-6 w-6 text-violet-500" />
				<div>
					<h2 className="text-2xl font-bold">AI Insights</h2>
					<p className="text-muted-foreground mt-0.5">
						AI-generated analysis, alerts, and recommendations
					</p>
				</div>
			</div>

			<Card className="border-violet-200 dark:border-violet-900">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Brain className="h-4 w-4 text-violet-500" />
						Organization Summary
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm leading-relaxed">{data.orgSummary}</p>
				</CardContent>
			</Card>

			{data.patterns.length > 0 && (
				<Card className="border-red-200 dark:border-red-900">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
							<AlertTriangle className="h-4 w-4" />
							Burnout Risk Alerts ({data.patterns.length})
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{data.patterns.map((p, i) => (
								<div
									key={i}
									className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50"
								>
									<div className="flex items-center gap-3">
										<Users className="h-4 w-4 text-red-500" />
										<div>
											<p className="text-sm font-medium">
												{p.isAnonymous ? 'Anonymous Employee' : p.employeeName}
											</p>
											<p className="text-xs text-muted-foreground">
												{p.teamName} ({p.departmentName})
											</p>
										</div>
									</div>
									<div className="text-right">
										<Badge variant="destructive" className="text-xs">
											{p.streakLength}+ low mood days
										</Badge>
										<p className="text-xs text-muted-foreground mt-1">
											Avg: {p.avgMood.toFixed(1)}/5
										</p>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Lightbulb className="h-4 w-4 text-amber-500" />
						Recommendations ({data.recommendations.length})
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{data.recommendations.map((rec, i) => {
							const config = severityConfig[rec.severity]
							const Icon = config.icon
							return (
								<div
									key={i}
									className={`p-4 rounded-lg border ${config.bg} ${config.border}`}
								>
									<div className="flex items-start gap-3">
										<Icon className={`h-4 w-4 mt-0.5 ${config.text}`} />
										<div className="flex-1">
											<div className="flex items-center gap-2 mb-1">
												<p className={`text-sm font-medium ${config.text}`}>
													{rec.title}
												</p>
												<Badge className={`text-[10px] ${config.badge}`}>
													{rec.severity}
												</Badge>
											</div>
											<p className="text-xs text-muted-foreground mb-2">
												{rec.description}
											</p>
											<p className="text-xs font-medium">
												Suggested action: {rec.action}
											</p>
										</div>
									</div>
								</div>
							)
						})}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Team-by-Team Analysis</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{data.teamSummaries.map(ts => {
							const change = ts.avgMood - ts.prevAvgMood
							return (
								<div
									key={ts.team}
									className="p-4 rounded-lg border border-border"
								>
									<div className="flex items-center justify-between mb-2">
										<div>
											<p className="font-medium text-sm">{ts.team}</p>
											<p className="text-xs text-muted-foreground">
												{ts.department}
											</p>
										</div>
										<div className="text-right">
											<span className="text-lg font-bold">
												{ts.avgMood.toFixed(1)}
											</span>
											<span className="text-xs text-muted-foreground">/5</span>
											<p className={`text-xs ${change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
												{change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(2)}
											</p>
										</div>
									</div>
									<p className="text-xs text-muted-foreground leading-relaxed">
										{ts.summary}
									</p>
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

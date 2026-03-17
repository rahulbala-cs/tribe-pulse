'use client'

import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageExportWrapper } from '@/components/dashboard/page-export-wrapper'
import {
	ComposedChart, Area, XAxis, YAxis, CartesianGrid,
	Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { CalendarDays } from 'lucide-react'

interface TrendPoint {
	date: string
	avgMood: number
	totalEntries: number
}

interface OrgEvent {
	id: string
	name: string
	description: string | null
	date: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function CorrelationPage() {
	const { data: trendData } = useSWR<{ trends: TrendPoint[] }>('/api/trends?days=30', fetcher, { dedupingInterval: 300000 })
	const { data: insightData } = useSWR<{ events: OrgEvent[] }>('/api/insights', fetcher, { dedupingInterval: 300000 })
	const trends = trendData?.trends ?? []
	const events = insightData?.events ?? []

	if (trends.length === 0) {
		return (
			<div className="flex items-center justify-center h-96">
				<div className="animate-pulse text-muted-foreground">
					Loading correlation data...
				</div>
			</div>
		)
	}

	const eventDateMap = new Map(
		events.map(e => [new Date(e.date).toISOString().split('T')[0], e]),
	)

	const eventColors: Record<string, string> = {
		'Q1 Planning Kickoff': '#3b82f6',
		'Product Launch v3.0': '#ef4444',
		'Team Recognition Day': '#22c55e',
		'Q3 Reorg Announcement': '#f97316',
		'Company Offsite': '#8b5cf6',
		'Hackathon Week': '#06b6d4',
	}

	return (
		<PageExportWrapper title="Correlation">
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold">Event Correlation</h2>
				<p className="text-muted-foreground mt-1">
					How organizational events correlate with mood changes
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Mood Trend vs Organization Events</CardTitle>
				</CardHeader>
				<CardContent>
					<ResponsiveContainer width="100%" height={400}>
						<ComposedChart data={trends} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
							<defs>
								<linearGradient id="corrGradient" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
									<stop offset="95%" stopColor="#10b981" stopOpacity={0} />
								</linearGradient>
							</defs>
							<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
							<XAxis
								dataKey="date"
								tick={{ fontSize: 11 }}
								tickFormatter={v => {
									const d = new Date(v)
									return `${d.getMonth() + 1}/${d.getDate()}`
								}}
							/>
							<YAxis domain={[1, 5]} tick={{ fontSize: 12 }} />
							<Tooltip
								contentStyle={{
									borderRadius: '8px',
									border: '1px solid #e5e7eb',
									fontSize: '13px',
								}}
								formatter={(value) => [Number(value).toFixed(2), 'Avg Mood']}
								labelFormatter={l => {
									const event = eventDateMap.get(l)
									return event
										? `${new Date(l).toLocaleDateString()} — ${event.name}`
										: new Date(l).toLocaleDateString()
								}}
							/>
							<Area
								type="monotone"
								dataKey="avgMood"
								stroke="#10b981"
								strokeWidth={2}
								fill="url(#corrGradient)"
							/>
							{events.map(event => {
								const eventDate = new Date(event.date).toISOString().split('T')[0]
								const hasDataPoint = trends.some(t => t.date === eventDate)
								if (!hasDataPoint) return null
								return (
									<ReferenceLine
										key={event.id}
										x={eventDate}
										stroke={eventColors[event.name] || '#6b7280'}
										strokeDasharray="4 4"
										strokeWidth={2}
										label={{
											value: event.name,
											position: 'top',
											fontSize: 10,
											fill: eventColors[event.name] || '#6b7280',
										}}
									/>
								)
							})}
						</ComposedChart>
					</ResponsiveContainer>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<CalendarDays className="h-4 w-4" />
						Event Timeline
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{events.map(event => {
							const eventDate = new Date(event.date)
							const dateStr = eventDate.toISOString().split('T')[0]
							const nearbyTrends = trends.filter(t => {
								const diff = Math.abs(
									new Date(t.date).getTime() - eventDate.getTime(),
								)
								return diff < 3 * 24 * 60 * 60 * 1000
							})
							const beforeMood = nearbyTrends[0]?.avgMood
							const afterMood = nearbyTrends[nearbyTrends.length - 1]?.avgMood
							const impact = beforeMood && afterMood
								? afterMood - beforeMood
								: null

							return (
								<div
									key={event.id}
									className="flex items-start gap-4 p-4 rounded-lg border border-border"
								>
									<div
										className="w-1 h-full min-h-[60px] rounded-full"
										style={{
											backgroundColor: eventColors[event.name] || '#6b7280',
										}}
									/>
									<div className="flex-1">
										<div className="flex items-center justify-between">
											<div>
												<p className="font-medium text-sm">{event.name}</p>
												<p className="text-xs text-muted-foreground">
													{eventDate.toLocaleDateString('en-IN', {
														weekday: 'long',
														year: 'numeric',
														month: 'long',
														day: 'numeric',
													})}
												</p>
											</div>
											{impact !== null && (
												<Badge
													variant={impact >= 0 ? 'default' : 'destructive'}
													className="text-xs"
												>
													{impact >= 0 ? '↑' : '↓'} {Math.abs(impact).toFixed(2)} mood shift
												</Badge>
											)}
										</div>
										{event.description && (
											<p className="text-xs text-muted-foreground mt-2">
												{event.description}
											</p>
										)}
										{nearbyTrends.length > 0 && (
											<div className="flex gap-2 mt-2">
												{nearbyTrends.map(t => (
													<span
														key={t.date}
														className="text-xs px-2 py-0.5 bg-secondary rounded"
													>
														{new Date(t.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}: {t.avgMood.toFixed(1)}
													</span>
												))}
											</div>
										)}
									</div>
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

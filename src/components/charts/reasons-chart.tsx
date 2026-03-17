'use client'

import {
	BarChart, Bar, XAxis, YAxis, CartesianGrid,
	Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

interface ReasonsChartProps {
	data: {
		date: string
		reasons: Record<string, number>
	}[]
	height?: number
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

export function ReasonsChart({ data, height = 400 }: ReasonsChartProps) {
	const allReasons = new Set<string>()
	for (const d of data) {
		for (const r of Object.keys(d.reasons)) allReasons.add(r)
	}

	const chartData = data.map(d => ({
		date: d.date,
		...d.reasons,
	}))

	return (
		<ResponsiveContainer width="100%" height={height}>
			<BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
				<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
				<XAxis
					dataKey="date"
					tick={{ fontSize: 11 }}
					tickFormatter={v => {
						const d = new Date(v)
						return `${d.getMonth() + 1}/${d.getDate()}`
					}}
				/>
				<YAxis tick={{ fontSize: 12 }} />
				<Tooltip
					contentStyle={{
						borderRadius: '8px',
						border: '1px solid #e5e7eb',
						fontSize: '12px',
					}}
				/>
				<Legend wrapperStyle={{ fontSize: '12px' }} />
				{[...allReasons].map(reason => (
					<Bar
						key={reason}
						dataKey={reason}
						stackId="reasons"
						fill={REASON_COLORS[reason] || '#6b7280'}
					/>
				))}
			</BarChart>
		</ResponsiveContainer>
	)
}

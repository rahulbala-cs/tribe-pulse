'use client'

import {
	BarChart, Bar, XAxis, YAxis, CartesianGrid,
	Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

interface TeamBarChartProps {
	data: { name: string; avgMood: number; department: string }[]
	height?: number
	isAnimationActive?: boolean
}

const DEPT_COLORS: Record<string, string> = {
	Engineering: '#3b82f6',
	Product: '#8b5cf6',
	Operations: '#f59e0b',
}

export function TeamBarChart({ data, height = 300, isAnimationActive = true }: TeamBarChartProps) {
	const sorted = [...data].sort((a, b) => b.avgMood - a.avgMood)

	return (
		<ResponsiveContainer width="100%" height={height}>
			<BarChart
				data={sorted}
				layout="vertical"
				margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
			>
				<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
				<XAxis type="number" domain={[0, 5]} tick={{ fontSize: 12 }} />
				<YAxis
					dataKey="name"
					type="category"
					tick={{ fontSize: 12 }}
					width={80}
				/>
				<Tooltip
					contentStyle={{
						borderRadius: '8px',
						border: '1px solid #e5e7eb',
						fontSize: '13px',
					}}
					formatter={(value) => [Number(value).toFixed(2), 'Avg Mood']}
				/>
				<Bar dataKey="avgMood" radius={[0, 4, 4, 0]} barSize={24} isAnimationActive={isAnimationActive}>
					{sorted.map((entry, i) => (
						<Cell
							key={i}
							fill={DEPT_COLORS[entry.department] || '#6b7280'}
						/>
					))}
				</Bar>
			</BarChart>
		</ResponsiveContainer>
	)
}

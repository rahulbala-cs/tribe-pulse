'use client'

import {
	AreaChart, Area, XAxis, YAxis, CartesianGrid,
	Tooltip, ResponsiveContainer,
} from 'recharts'

interface MoodAreaChartProps {
	data: { date: string; avgMood: number; totalEntries: number }[]
	height?: number
	isAnimationActive?: boolean
}

export function MoodAreaChart({ data, height = 300, isAnimationActive = true }: MoodAreaChartProps) {
	return (
		<ResponsiveContainer width="100%" height={height}>
			<AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
				<defs>
					<linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
						<stop offset="95%" stopColor="#10b981" stopOpacity={0} />
					</linearGradient>
				</defs>
				<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
				<XAxis
					dataKey="date"
					tick={{ fontSize: 12 }}
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
					labelFormatter={l => new Date(l).toLocaleDateString()}
				/>
				<Area
					type="monotone"
					dataKey="avgMood"
					stroke="#10b981"
					strokeWidth={2}
					fill="url(#moodGradient)"
					isAnimationActive={isAnimationActive}
				/>
			</AreaChart>
		</ResponsiveContainer>
	)
}

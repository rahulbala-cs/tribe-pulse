'use client'

import { AreaChart, Area, ResponsiveContainer } from 'recharts'

interface SparklineProps {
	data: { value: number }[]
	color?: string
	height?: number
}

export function Sparkline({ data, color = '#10b981', height = 40 }: SparklineProps) {
	return (
		<ResponsiveContainer width="100%" height={height}>
			<AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
				<defs>
					<linearGradient id={`sparkGrad-${color}`} x1="0" y1="0" x2="0" y2="1">
						<stop offset="5%" stopColor={color} stopOpacity={0.3} />
						<stop offset="95%" stopColor={color} stopOpacity={0} />
					</linearGradient>
				</defs>
				<Area
					type="monotone"
					dataKey="value"
					stroke={color}
					strokeWidth={1.5}
					fill={`url(#sparkGrad-${color})`}
				/>
			</AreaChart>
		</ResponsiveContainer>
	)
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
	LayoutDashboard,
	TrendingUp,
	Users,
	Grid3X3,
	PieChart,
	Brain,
	GitCompareArrows,
	Activity,
	FileText,
} from 'lucide-react'
import { ExportProvider } from '@/components/dashboard/export-context'
import { ExportThisPageButton } from '@/components/dashboard/export-button'

const navItems = [
	{ href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
	{ href: '/dashboard/trends', label: 'Trends', icon: TrendingUp },
	{ href: '/dashboard/teams', label: 'Teams', icon: Users },
	{ href: '/dashboard/heatmap', label: 'Heatmap', icon: Grid3X3 },
	{ href: '/dashboard/reasons', label: 'Reasons', icon: PieChart },
	{ href: '/dashboard/insights', label: 'AI Insights', icon: Brain },
	{ href: '/dashboard/correlation', label: 'Correlation', icon: GitCompareArrows },
	{ href: '/dashboard/report', label: 'Full Report', icon: FileText },
]

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const pathname = usePathname()

	return (
		<ExportProvider>
			<div className="flex h-screen bg-background">
				<aside className="w-64 border-r border-border bg-card flex flex-col">
					<div className="p-6 border-b border-border">
						<div className="flex items-center gap-2">
							<Activity className="h-6 w-6 text-emerald-500" />
							<div>
								<h1 className="text-lg font-bold">Tribe Pulse</h1>
								<p className="text-xs text-muted-foreground">
									Mood Intelligence
								</p>
							</div>
						</div>
					</div>
					<nav className="flex-1 p-3 space-y-1">
						{navItems.map(item => {
							const isActive = pathname === item.href
							return (
								<Link
									key={item.href}
									href={item.href}
									className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
										isActive
											? 'bg-primary text-primary-foreground'
											: 'text-muted-foreground hover:bg-accent hover:text-foreground'
									}`}
								>
									<item.icon className="h-4 w-4" />
									{item.label}
								</Link>
							)
						})}
					</nav>
					<div className="p-4 border-t border-border">
						<div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3">
							<p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
								People Team Dashboard
							</p>
							<p className="text-xs text-emerald-600/70 dark:text-emerald-500/70 mt-1">
								TechCorp India
							</p>
						</div>
					</div>
				</aside>
				<main className="flex-1 overflow-auto flex flex-col">
					<div className="flex items-center justify-end gap-2 px-8 pt-6 pb-2 border-b border-border shrink-0">
						<ExportThisPageButton />
					</div>
					<div className="flex-1 p-8 overflow-auto">
						{children}
					</div>
				</main>
			</div>
		</ExportProvider>
	)
}

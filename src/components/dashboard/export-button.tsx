'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileText, Loader2 } from 'lucide-react'
import { useExport } from './export-context'
import { exportElementToPdf } from '@/lib/export-pdf'

function slug(title: string): string {
	return title.toLowerCase().replace(/\s+/g, '-')
}

export function ExportThisPageButton() {
	const router = useRouter()
	const exportContext = useExport()
	const [exporting, setExporting] = useState(false)

	if (!exportContext) return null
	const { exportTargetRef, pageTitle } = exportContext
	const element = exportTargetRef?.current
	const canExport = !!element && !!pageTitle

	async function handleExportThisPage() {
		if (!element || !pageTitle) return
		setExporting(true)
		try {
			await exportElementToPdf(element, `tribe-pulse-${slug(pageTitle)}`)
		} finally {
			setExporting(false)
		}
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
				disabled={!canExport || exporting}
			>
				{exporting ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : (
					<Download className="h-4 w-4" />
				)}
				<span className="ml-2">Export</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuItem
					onClick={handleExportThisPage}
					disabled={!canExport || exporting}
				>
					<FileText className="h-4 w-4 mr-2" />
					Export this page (PDF)
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => router.push('/dashboard/report')}>
					<FileText className="h-4 w-4 mr-2" />
					Export full report (all screens)
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

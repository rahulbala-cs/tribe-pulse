'use client'

import { useRef, useEffect } from 'react'
import { useExport } from './export-context'

interface PageExportWrapperProps {
	title: string
	children: React.ReactNode
}

export function PageExportWrapper({ title, children }: PageExportWrapperProps) {
	const ref = useRef<HTMLDivElement>(null)
	const setExportTarget = useExport()?.setExportTarget

	useEffect(() => {
		setExportTarget?.(ref, title)
		return () => setExportTarget?.(null, '')
	}, [title, setExportTarget])

	return <div ref={ref}>{children}</div>
}

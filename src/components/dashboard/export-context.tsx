'use client'

import {
	createContext,
	useContext,
	useState,
	useCallback,
	type ReactNode,
	type RefObject,
} from 'react'

interface ExportContextValue {
	exportTargetRef: RefObject<HTMLDivElement | null> | null
	pageTitle: string
	setExportTarget: (ref: RefObject<HTMLDivElement | null> | null, title: string) => void
}

const ExportContext = createContext<ExportContextValue | null>(null)

export function ExportProvider({ children }: { children: ReactNode }) {
	const [exportTargetRef, setRef] = useState<RefObject<HTMLDivElement | null> | null>(null)
	const [pageTitle, setPageTitle] = useState('')
	const setExportTarget = useCallback(
		(ref: RefObject<HTMLDivElement | null> | null, title: string) => {
			setRef(ref)
			setPageTitle(title)
		},
		[],
	)
	return (
		<ExportContext.Provider
			value={{ exportTargetRef, pageTitle, setExportTarget }}
		>
			{children}
		</ExportContext.Provider>
	)
}

export function useExport() {
	const ctx = useContext(ExportContext)
	if (!ctx) return null
	return ctx
}

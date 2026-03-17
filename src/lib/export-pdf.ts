'use client'

import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

const PDF_OPTIONS = {
	scale: 2,
	useCORS: true,
	logging: false,
	backgroundColor: '#ffffff',
}

/**
 * Export a single DOM element to a PDF file (exact visual).
 */
export async function exportElementToPdf(
	element: HTMLElement,
	filename: string,
): Promise<void> {
	const canvas = await html2canvas(element, PDF_OPTIONS)
	const imgData = canvas.toDataURL('image/png')
	const pdf = new jsPDF({
		orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
		unit: 'px',
		format: [canvas.width, canvas.height],
	})
	pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
	pdf.save(`${filename}.pdf`)
}

/**
 * Export multiple DOM elements to a single PDF (one page per element).
 */
export async function exportElementsToPdf(
	elements: HTMLElement[],
	filename: string,
): Promise<void> {
	const pdf = new jsPDF('p', 'mm', 'a4')
	const pageWidth = pdf.internal.pageSize.getWidth()
	const pageHeight = pdf.internal.pageSize.getHeight()
	const margin = 10

	for (let i = 0; i < elements.length; i++) {
		const canvas = await html2canvas(elements[i], PDF_OPTIONS)
		const imgData = canvas.toDataURL('image/png')
		const imgWidth = pageWidth - 2 * margin
		const imgHeight = (canvas.height * imgWidth) / canvas.width

		if (i > 0) pdf.addPage()
		if (imgHeight > pageHeight - 2 * margin) {
			pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, pageHeight - 2 * margin)
		} else {
			pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight)
		}
	}
	pdf.save(`${filename}.pdf`)
}

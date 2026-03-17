'use client'

import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

const CAPTURE_OPTIONS = {
	pixelRatio: 2,
	backgroundColor: '#ffffff',
}

async function captureElement(element: HTMLElement): Promise<{ imgData: string; width: number; height: number }> {
	const imgData = await toPng(element, CAPTURE_OPTIONS)
	const img = new Image()
	await new Promise<void>(resolve => { img.onload = () => resolve(); img.src = imgData })
	return { imgData, width: img.width, height: img.height }
}

/**
 * Export a single DOM element to a PDF file (exact visual).
 */
export async function exportElementToPdf(
	element: HTMLElement,
	filename: string,
): Promise<void> {
	const { imgData, width, height } = await captureElement(element)
	const pdf = new jsPDF({
		orientation: width > height ? 'landscape' : 'portrait',
		unit: 'px',
		format: [width, height],
	})
	pdf.addImage(imgData, 'PNG', 0, 0, width, height)
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
		const { imgData, width, height } = await captureElement(elements[i])
		const imgWidth = pageWidth - 2 * margin
		const imgHeight = (height * imgWidth) / width

		if (i > 0) pdf.addPage()
		if (imgHeight > pageHeight - 2 * margin) {
			pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, pageHeight - 2 * margin)
		} else {
			pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight)
		}
	}
	pdf.save(`${filename}.pdf`)
}

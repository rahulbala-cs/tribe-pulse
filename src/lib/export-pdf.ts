'use client'

import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

const MARGIN_MM = 10
const A4_W_MM = 210
const A4_H_MM = 297
const AVAIL_W_MM = A4_W_MM - 2 * MARGIN_MM // 190 mm
const AVAIL_H_MM = A4_H_MM - 2 * MARGIN_MM // 277 mm

async function captureElement(element: HTMLElement) {
	const rect = element.getBoundingClientRect()
	const imgData = await toPng(element, {
		pixelRatio: 2,
		backgroundColor: '#ffffff',
		// lock dimensions so scroll/resize mid-capture doesn't distort
		width: rect.width,
		height: rect.height,
	})
	// Use CSS dimensions (not 2× image pixels) for aspect ratio
	return { imgData, cssWidth: rect.width, cssHeight: rect.height }
}

/** Crop a region out of a PNG data URL using a canvas. */
function cropImage(
	imgData: string,
	pixW: number,
	yStartPx: number,
	sliceHeightPx: number,
): Promise<string> {
	return new Promise(resolve => {
		const img = new Image()
		img.onload = () => {
			const canvas = document.createElement('canvas')
			canvas.width = pixW
			canvas.height = sliceHeightPx
			const ctx = canvas.getContext('2d')!
			ctx.drawImage(img, 0, -yStartPx)
			resolve(canvas.toDataURL('image/png'))
		}
		img.src = imgData
	})
}

/**
 * Export a single DOM element to PDF.
 * Uses a custom tall page if the content exceeds A4 height — nothing gets cut.
 */
export async function exportElementToPdf(
	element: HTMLElement,
	filename: string,
): Promise<void> {
	const { imgData, cssWidth, cssHeight } = await captureElement(element)

	const imgHeightMm = (cssHeight / cssWidth) * AVAIL_W_MM
	const pageH = Math.max(imgHeightMm + 2 * MARGIN_MM, A4_H_MM)

	const pdf = new jsPDF({
		orientation: 'portrait',
		unit: 'mm',
		format: [A4_W_MM, pageH],
	})

	pdf.addImage(imgData, 'PNG', MARGIN_MM, MARGIN_MM, AVAIL_W_MM, imgHeightMm)
	pdf.save(`${filename}.pdf`)
}

/**
 * Export a single DOM element as a paginated A4 PDF.
 * Captures the whole element as one image and slices it cleanly across pages.
 * Use this for long pages / full reports.
 */
export async function exportPaginatedPdf(
	element: HTMLElement,
	filename: string,
): Promise<void> {
	const { imgData, cssWidth, cssHeight } = await captureElement(element)

	const imgHeightMm = (cssHeight / cssWidth) * AVAIL_W_MM
	const pdf = new jsPDF('p', 'mm', 'a4')

	if (imgHeightMm <= AVAIL_H_MM) {
		pdf.addImage(imgData, 'PNG', MARGIN_MM, MARGIN_MM, AVAIL_W_MM, imgHeightMm)
	} else {
		const img = new Image()
		await new Promise<void>(r => { img.onload = () => r(); img.src = imgData })
		const pixW = img.width
		const pixH = img.height

		const sliceHeightPx = Math.round((AVAIL_H_MM / imgHeightMm) * pixH)
		const sliceCount = Math.ceil(pixH / sliceHeightPx)

		for (let s = 0; s < sliceCount; s++) {
			if (s > 0) pdf.addPage()
			const yStartPx = s * sliceHeightPx
			const thisSlicePx = Math.min(sliceHeightPx, pixH - yStartPx)
			const thisSliceMm = (thisSlicePx / pixH) * imgHeightMm

			const slice = await cropImage(imgData, pixW, yStartPx, thisSlicePx)
			pdf.addImage(slice, 'PNG', MARGIN_MM, MARGIN_MM, AVAIL_W_MM, thisSliceMm)
		}
	}

	pdf.save(`${filename}.pdf`)
}

/**
 * Export multiple DOM elements to a single A4 PDF.
 * Each element starts on a new page; sections taller than one A4 page are
 * sliced across as many pages as needed.
 */
export async function exportElementsToPdf(
	elements: HTMLElement[],
	filename: string,
): Promise<void> {
	const pdf = new jsPDF('p', 'mm', 'a4')
	let firstPage = true

	for (const element of elements) {
		const { imgData, cssWidth, cssHeight } = await captureElement(element)

		const imgHeightMm = (cssHeight / cssWidth) * AVAIL_W_MM

		if (!firstPage) pdf.addPage()
		firstPage = false

		if (imgHeightMm <= AVAIL_H_MM) {
			pdf.addImage(imgData, 'PNG', MARGIN_MM, MARGIN_MM, AVAIL_W_MM, imgHeightMm)
		} else {
			const img = new Image()
			await new Promise<void>(r => { img.onload = () => r(); img.src = imgData })
			const pixW = img.width
			const pixH = img.height

			const sliceHeightPx = Math.round((AVAIL_H_MM / imgHeightMm) * pixH)
			const sliceCount = Math.ceil(pixH / sliceHeightPx)

			for (let s = 0; s < sliceCount; s++) {
				if (s > 0) pdf.addPage()
				const yStartPx = s * sliceHeightPx
				const thisSlicePx = Math.min(sliceHeightPx, pixH - yStartPx)
				const thisSliceMm = (thisSlicePx / pixH) * imgHeightMm

				const slice = await cropImage(imgData, pixW, yStartPx, thisSlicePx)
				pdf.addImage(slice, 'PNG', MARGIN_MM, MARGIN_MM, AVAIL_W_MM, thisSliceMm)
			}
		}
	}

	pdf.save(`${filename}.pdf`)
}

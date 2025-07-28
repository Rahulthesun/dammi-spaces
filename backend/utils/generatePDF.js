// utils/generatePDF.js

import { PDFDocument, StandardFonts } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

const sanitizeText = (text) => {
  if (!text) return ''
  return text.replace(/₹/g, 'INR')
}

export default async function generatePDF(responses, businessInfo) {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const page = pdfDoc.addPage()
  const { height } = page.getSize()
  let y = height - 40

  const headerLines = [
    `Business Profile`,
    `Full Name: ${sanitizeText(businessInfo.full_name)}`,
    `Role: ${sanitizeText(businessInfo.role)}`,
    `Business ID: ${sanitizeText(businessInfo.businessId)}`,
    `Date: ${new Date().toLocaleDateString()}`
  ]

  headerLines.forEach(line => {
    page.drawText(line, { x: 50, y, size: 12, font })
    y -= 20
  })

  y -= 20
  console.log(' Writing questionnaire sections...')
  for (const [key, valueRaw] of Object.entries(responses)) {
    const value = sanitizeText(valueRaw)
    if (!value || value.trim() === '') continue

    const title = key === 'additional_info'
      ? 'ADDITIONAL INFORMATION'
      : key.replace(/_/g, ' ').toUpperCase()

    console.log(`➡️ Section: ${title}`)
    page.drawText(`# ${title}`, { x: 50, y, size: 14, font })
    y -= 20

    const lines = value.match(/.{1,90}/g) || [value]
    lines.forEach(line => {
      page.drawText(line, { x: 50, y, size: 12, font })
      y -= 18
    })
    y -= 30
  }

  const pdfBytes = await pdfDoc.save()
  const tmpDir = path.join(process.cwd(), 'tmp') // CWD/tmp
  fs.mkdirSync(tmpDir, { recursive: true }) //  Create it if missing
  const pdfPath = path.join(tmpDir, `business_${Date.now()}.pdf`)
  fs.writeFileSync(pdfPath, pdfBytes)
  console.log('✅ PDF saved at:', pdfPath)
  return pdfPath
}

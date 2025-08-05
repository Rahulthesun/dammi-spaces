// utils/parsePDFIntoSections.js

import fs from 'fs'
import pdf from 'pdf-parse'

export default async function parsePDFIntoSections(pdfPath) {
  const buffer = fs.readFileSync(pdfPath)
  const data = await pdf(buffer)

  const text = data.text
  const sectionRegex = /# (.+?)\n([\s\S]*?)(?=\n#|$)/g

  const sections = []
  let match
  while ((match = sectionRegex.exec(text)) !== null) {
    sections.push({
      title: match[1].trim(),
      content: match[2].trim()
    })
  }

  return sections
}

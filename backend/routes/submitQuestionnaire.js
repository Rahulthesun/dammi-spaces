// routes/submitQuestionnaire.js

import express from 'express'
import generatePDF from '../utils/generatePDF.js'
import { embedAndStore } from '../services/embedAndStore.js'

const router = express.Router()

// Optional: for ₹ to INR sanitization
const sanitizeText = (text) => {
  if (!text) return ''
  return text.replace(/₹/g, 'INR')
}

router.post('/', async (req, res) => {
  try {
    const { full_name, role, businessId, responses } = req.body

    // 1. Generate structured PDF
    const pdfPath = await generatePDF(responses, { full_name, role, businessId })

    // 2. Embed each section directly from the original responses
    for (const [key, valueRaw] of Object.entries(responses)) {
      const value = sanitizeText(valueRaw)
      if (!value || value.trim() === '') continue

      const title = key === 'additional_info'
        ? 'ADDITIONAL INFORMATION'
        : key.replace(/_/g, ' ').toUpperCase()

      await embedAndStore({
        content: value,
        metadata: {
          businessId,
          sectionTitle: title
        }
      })
    }
    fs.unlink(pdfPath, (err) => {
      if (err) {
        console.error(` Failed to delete temp PDF at ${pdfPath}`, err)
      } else {
        console.log(` Deleted temp PDF: ${pdfPath}`)
      }
    })

    res.json({
      success: true,
      message: 'PDF created and responses embedded',
      pdfPath // optionally return for download link
    })
  } catch (err) {
    console.error(' Error in submitQuestionnaire:', err)
    res.status(500).json({ error: 'Something went wrong during PDF creation or embedding' })
  }
})

export default router

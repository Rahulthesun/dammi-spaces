// backend/index.js

import express from 'express'
import submitQuestionnaire from './routes/submitQuestionnaire.js'

const app = express()
const PORT = 5000

app.use(express.json())
app.use('/api/submit-questionnaire', submitQuestionnaire)

app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`)
})

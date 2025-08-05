// backend/index.js

import express from 'express'
import submitQuestionnaire from './routes/submitQuestionnaire.js'

import dotenv from 'dotenv'
dotenv.config();


const app = express()
const PORT = 5000
import widgetRoute from './routes/widget.js'; 
app.use('/', widgetRoute); 

app.use(express.json())
app.use('/api/submit-questionnaire', submitQuestionnaire)

app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`)
})

// routes/query.js
const express = require('express');
const queryPinecone = require('../services/queryPinecone');
const { generateAnswer } = require('../services/llmService');
const router = express.Router();

/**
 * POST /query
 * Handle user questions and return AI-generated answers
 */
router.post('/', async (req, res) => {
  try {
    const { question, businessId, topK = 3 } = req.body;

    // Validation
    if (!question || !businessId) {
      return res.status(400).json({
        error: 'Missing required fields: question and businessId'
      });
    }

    console.log(`Processing query: "${question}" for business: ${businessId}`);

    // Query Pinecone for relevant chunks
    const relevantChunks = await queryPinecone(question, businessId, topK);

    if (relevantChunks.length === 0) {
      return res.json({
        answer: "I don't have enough information to answer that question. Please make sure your documents have been uploaded and processed.",
        sources: [],
        confidence: 0
      });
    }

    //  context for LLM
    const context = relevantChunks
      .map((chunk, index) => `Context ${index + 1}:\n${chunk.text}`)
      .join('\n\n');

    //  Generate answer using LLM
    const answer = await generateAnswer(question, context);

    // Return structured response
    res.json({
      answer,
      sources: relevantChunks.map(chunk => ({
        text: chunk.text.substring(0, 200) + '...', // Truncate for response
        score: chunk.score
      })),
      confidence: relevantChunks[0]?.score || 0,
      businessId
    });

  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({
      error: 'Failed to process query',
      details: error.message
    });
  }
});

module.exports = router;
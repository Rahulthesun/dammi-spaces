// services/llmService.js
const Groq = require("groq-sdk");
const dotenv = require("dotenv");
dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Generate an answer using retrieved context and user question
 * @param {string} question - The user's question
 * @param {string} context - Retrieved relevant chunks from Pinecone
 * @returns {Promise<string>} - Generated answer
 */
async function generateAnswer(question, context) {
  try {
    const prompt = `You are a helpful AI assistant that answers questions based on the provided context. 
    
Context:
${context}

Question: ${question}

Instructions:
- Answer the question based ONLY on the provided context
- Provide a direct, helpful answer without mentioning the words "context", "context 1", etc.
- Do NOT say phrases like "based on the context" or "according to the context"
- If the context doesn't contain enough information, say "I don't have enough information to answer that question"
- Be concise and helpful
- If relevant, reference specific details from the context
- Keep your answer under 200 words

Answer:`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama3-8b-8192", // Fast and good quality
      temperature: 0.1, // Low temperature for factual responses
      max_tokens: 300,
    });

    return completion.choices[0]?.message?.content || "I couldn't generate an answer at the moment.";
    
  } catch (error) {
    console.error('Error generating answer with Groq:', error);
    throw new Error('Failed to generate answer');
  }
}

module.exports = { generateAnswer };
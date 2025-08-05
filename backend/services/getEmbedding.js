// services/getEmbedding.js
import axios from 'axios'
import dotenv from 'dotenv'
import { Pinecone } from '@pinecone-database/pinecone'
dotenv.config()
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
})

export async function getEmbedding(text) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    )

    return response.data.data[0].embedding
  } catch (error) {
    console.error('Failed to embed user query:', error.response?.data || error.message)
    throw new Error('Failed to get embedding for user input.')
  }
}

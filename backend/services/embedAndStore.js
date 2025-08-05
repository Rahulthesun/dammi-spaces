import { getEmbedding } from './getEmbedding.js'
import axios from 'axios'
import dotenv from 'dotenv'
import { Pinecone } from '@pinecone-database/pinecone'
dotenv.config()

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
})

export async function embedAndStore({ content, metadata }) {
  const embedding = await getEmbedding(content)

  const vector = {
    id: `${metadata.businessId}-${metadata.sectionTitle}`.toLowerCase().replace(/\s+/g, '-'),
    values: embedding,
    metadata
  }

  const index = pinecone.index(process.env.PINECONE_INDEX_NAME) 
  await index.upsert([vector])
}

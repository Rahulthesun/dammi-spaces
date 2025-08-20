const express = require('express');
const multer = require('multer');//handles file upload
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');//extract text from pdf
const mammoth = require('mammoth');//extract text from docx

const router = express.Router();

// Multer config (store file in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload endpoint
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = path.extname(file.originalname).toLowerCase();
    let extractedText = '';

    if (ext === '.pdf') {
      extractedText = await pdfParse(file.buffer).then(data => data.text);
    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      extractedText = result.value;
    } else if (ext === '.txt') {
      extractedText = file.buffer.toString('utf-8');
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }
    const embedAndStoreChunks = require('../services/embedAndStore');
    await embedAndStoreChunks(extractedText,{
      businessId: 'demo-business',
      filename: file.originalname,
    });


    res.json({ message: 'File uploaded and parsed', text: extractedText });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to parse document' });
  }
  
  
});

module.exports = router;

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { GoogleGenAI } from '@google/genai';

import Chapter from './models/Chapter.js';

dotenv.config();

const app = express();

app.use(express.json({ limit: '2mb' }));

app.use(cors({
  origin: process.env.CLIENT_URL || 'https://tamil-exam.vercel.app'
}));

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is missing in .env');
}

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is missing in .env');
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// Using latest available flash model
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

// --------------------------------------------------
// MULTER
// --------------------------------------------------

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 6
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG and WEBP images are supported.'));
    }
    cb(null, true);
  }
});

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const isValidId = id => mongoose.isValidObjectId(id);

const getChapter = async (id) => {
  if (!isValidId(id)) return null;
  return Chapter.findById(id);
};

const validateQuestion = (question) => {
  if (!question || typeof question.questionText !== 'string' || !question.questionText.trim()) {
    return 'Question text is required.';
  }

  if (!Array.isArray(question.options) || question.options.length !== 4 || !question.options.every(option => typeof option === 'string' && option.trim())) {
    return 'Exactly four non-empty options are required.';
  }

  if (!Number.isInteger(question.correctOptionIndex) || question.correctOptionIndex < 0 || question.correctOptionIndex > 3) {
    return 'Correct option index must be between 0 and 3.';
  }

  return null;
};

const parseGeminiJSON = (response) => {
  const text = response.text;
  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }
  try {
    return JSON.parse(text);
  } catch {
    console.error('Invalid Gemini JSON:', text);
    throw new Error('Gemini returned invalid JSON.');
  }
};

// Automatic retry wrapper for handling 503 high demand errors gracefully
const generateWithRetry = async (aiInstance, payload, retries = 3, delay = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await aiInstance.models.generateContent(payload);
    } catch (error) {
      // Check if error is a 503 Service Unavailable / high demand
      const isUnavailable = error.status === 503 || error.message?.includes('503') || error.message?.includes('unavailable');
      if (isUnavailable && i < retries - 1) {
        console.warn(`Model overloaded (503). Retrying in ${delay}ms... (Attempt ${i + 1} of ${retries})`);
        await new Promise(res => setTimeout(res, delay));
      } else {
        throw error;
      }
    }
  }
};

const prepareImages = async (files) => {
  const totalSize = files.reduce((total, file) => total + file.size, 0);

  if (totalSize > 20 * 1024 * 1024) {
    throw new Error('The combined image size must be below 20 MB. Upload fewer or smaller images.');
  }

  const imageParts = [];

  for (const file of files) {
    const compressedBuffer = await sharp(file.buffer)
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    imageParts.push({
      inlineData: {
        data: compressedBuffer.toString('base64'),
        mimeType: 'image/jpeg'
      }
    });
  }

  return imageParts;
};

// --------------------------------------------------
// CHAPTER ROUTES
// --------------------------------------------------

app.post('/api/chapters', async (req, res) => {
  try {
    const { title, description = '' } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Chapter title is required.' });
    }

    const chapter = await Chapter.create({
      title: title.trim(),
      description: description.trim()
    });

    return res.status(201).json({ success: true, message: 'Chapter created successfully.', chapter });
  } catch (error) {
    console.error('Create chapter error:', error);
    return res.status(500).json({ success: false, error: 'Unable to create chapter.' });
  }
});

app.get('/api/chapters', async (req, res) => {
  try {
    const chapters = await Chapter.find().sort({ createdAt: -1 }).select('title description questions createdAt updatedAt');
    return res.json({ success: true, chapters });
  } catch (error) {
    console.error('Get chapters error:', error);
    return res.status(500).json({ success: false, error: 'Unable to retrieve chapters.' });
  }
});

app.get('/api/chapters/:chapterId', async (req, res) => {
  try {
    const chapter = await getChapter(req.params.chapterId);
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapter not found.' });
    }
    return res.json({ success: true, chapter });
  } catch (error) {
    console.error('Get chapter error:', error);
    return res.status(500).json({ success: false, error: 'Unable to retrieve chapter.' });
  }
});

app.patch('/api/chapters/:chapterId', async (req, res) => {
  try {
    const chapter = await getChapter(req.params.chapterId);
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapter not found.' });
    }

    const { title, description } = req.body;

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ success: false, error: 'Chapter title cannot be empty.' });
      }
      chapter.title = title.trim();
    }

    if (description !== undefined) {
      chapter.description = description;
    }

    await chapter.save();
    return res.json({ success: true, message: 'Chapter updated successfully.', chapter });
  } catch (error) {
    console.error('Update chapter error:', error);
    return res.status(500).json({ success: false, error: 'Unable to update chapter.' });
  }
});

app.delete('/api/chapters/:chapterId', async (req, res) => {
  try {
    const chapter = await getChapter(req.params.chapterId);
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapter not found.' });
    }

    await Chapter.findByIdAndDelete(chapter._id);
    return res.json({ success: true, message: 'Chapter and all its questions deleted successfully.' });
  } catch (error) {
    console.error('Delete chapter error:', error);
    return res.status(500).json({ success: false, error: 'Unable to delete chapter.' });
  }
});

// --------------------------------------------------
// QUESTION ROUTES
// --------------------------------------------------

app.post('/api/chapters/:chapterId/questions', async (req, res) => {
  try {
    const chapter = await getChapter(req.params.chapterId);
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapter not found.' });
    }

    const question = {
      questionText: req.body.questionText,
      options: req.body.options,
      correctOptionIndex: req.body.correctOptionIndex,
      sourceEvidence: req.body.sourceEvidence || ''
    };

    const validationError = validateQuestion(question);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    chapter.questions.push(question);
    await chapter.save();

    const addedQuestion = chapter.questions[chapter.questions.length - 1];
    return res.status(201).json({ success: true, message: 'Question added successfully.', question: addedQuestion });
  } catch (error) {
    console.error('Add question error:', error);
    return res.status(500).json({ success: false, error: 'Unable to add question.' });
  }
});

app.patch('/api/chapters/:chapterId/questions/:questionId', async (req, res) => {
  try {
    const chapter = await getChapter(req.params.chapterId);
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapter not found.' });
    }

    const question = chapter.questions.id(req.params.questionId);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found.' });
    }

    const updatedQuestion = {
      questionText: req.body.questionText !== undefined ? req.body.questionText : question.questionText,
      options: req.body.options !== undefined ? req.body.options : question.options,
      correctOptionIndex: req.body.correctOptionIndex !== undefined ? req.body.correctOptionIndex : question.correctOptionIndex
    };

    const validationError = validateQuestion(updatedQuestion);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    question.questionText = updatedQuestion.questionText.trim();
    question.options = updatedQuestion.options.map(option => option.trim());
    question.correctOptionIndex = updatedQuestion.correctOptionIndex;

    if (req.body.sourceEvidence !== undefined) {
      question.sourceEvidence = req.body.sourceEvidence;
    }

    await chapter.save();
    return res.json({ success: true, message: 'Question updated successfully.', question });
  } catch (error) {
    console.error('Edit question error:', error);
    return res.status(500).json({ success: false, error: 'Unable to edit question.' });
  }
});

app.delete('/api/chapters/:chapterId/questions/:questionId', async (req, res) => {
  try {
    const chapter = await getChapter(req.params.chapterId);
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapter not found.' });
    }

    const question = chapter.questions.id(req.params.questionId);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found.' });
    }

    question.deleteOne();
    await chapter.save();

    return res.json({ success: true, message: 'Question deleted successfully.' });
  } catch (error) {
    console.error('Delete question error:', error);
    return res.status(500).json({ success: false, error: 'Unable to delete question.' });
  }
});

// --------------------------------------------------
// SINGLE-PASS GEMINI PROMPT & GENERATION ROUTE
// --------------------------------------------------

const SINGLE_PASS_PROMPT = `
You are an expert CBSE Class 10 Tamil teacher and board examiner.
Read the provided Tamil textbook page images carefully.

Generate accurate CBSE Class 10 Tamil பாடல் வினா multiple-choice questions directly supported by the text in the images.

STRICT ACCURACY INSTRUCTIONS:
- Only generate questions whose answers are explicitly present in the provided text.
- Provide exact Tamil phrase from the text in "sourceEvidence" for each question.
- Perform strict self-verification to ensure exactly one option is correct and options are plausible.
- Generate at most 5-8 high-quality questions.

Return ONLY valid JSON in this exact structure:
{
  "passage": "அசல் பாடல் அல்லது உரையின் வாசிக்கக்கூடிய பகுதி",
  "questions": [
    {
      "questionText": "தமிழில் வினா",
      "options": ["விடை ஒன்று", "விடை இரண்டு", "விடை மூன்று", "விடை நான்கு"],
      "correctOptionIndex": 0,
      "sourceEvidence": "பாடப்பகுதியில் உள்ள ஆதார வரி"
    }
  ]
}
`;

app.post('/api/chapters/:chapterId/generate', upload.array('images', 6), async (req, res) => {
  try {
    const chapter = await getChapter(req.params.chapterId);
    if (!chapter) {
      return res.status(404).json({ success: false, error: 'Chapter not found.' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'Upload at least one textbook image.' });
    }

    console.log('Processing images...');
    const imageParts = await prepareImages(req.files);

    console.log('Sending single-pass request to Gemini with retry support...');
    const generationResponse = await generateWithRetry(ai, {
      model: MODEL,
      contents: [{
        role: 'user',
        parts: [{ text: SINGLE_PASS_PROMPT }, ...imageParts]
      }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    });

    const generated = parseGeminiJSON(generationResponse);
    if (typeof generated.passage !== 'string' || !Array.isArray(generated.questions)) {
      throw new Error('Gemini returned an invalid question structure.');
    }

    const verifiedQuestions = generated.questions.filter(q => 
      !validateQuestion(q) && 
      typeof q.sourceEvidence === 'string' && 
      q.sourceEvidence.trim().length > 0
    );

    if (!verifiedQuestions.length) {
      return res.status(422).json({ 
        success: false, 
        error: 'No valid questions could be generated from these pages.', 
        savedCount: 0 
      });
    }

    const questionsToSave = verifiedQuestions.map(q => ({
      questionText: q.questionText.trim(),
      options: q.options.map(o => o.trim()),
      correctOptionIndex: q.correctOptionIndex,
      sourceEvidence: q.sourceEvidence.trim()
    }));

    chapter.questions.push(...questionsToSave);
    await chapter.save();

    const savedQuestions = chapter.questions.slice(-questionsToSave.length);

    return res.status(201).json({
      success: true,
      message: 'Questions generated and saved successfully.',
      generatedCount: generated.questions.length,
      savedCount: savedQuestions.length,
      passage: generated.passage,
      questions: savedQuestions,
      chapterId: chapter._id,
      chapterTitle: chapter.title
    });
  } catch (error) {
    console.error('QUESTION GENERATION ERROR:', error);
    return res.status(500).json({ success: false, error: error.message || 'Question generation failed.' });
  }
});

// --------------------------------------------------
// ERROR HANDLER & SERVER START
// --------------------------------------------------

app.use((error, req, res, next) => {
  console.error('Request error:', error);
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, error: 'Each image must be smaller than 5 MB.' });
    if (error.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ success: false, error: 'Maximum 6 images are allowed per request.' });
  }
  return res.status(500).json({ success: false, error: error.message || 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully.');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Gemini model: ${MODEL}`);
    });
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

startServer();
// import express from 'express';
// import cors from 'cors';
// import multer from 'multer';
// import dotenv from 'dotenv';
// import mongoose from 'mongoose';
// import sharp from 'sharp';
// import { GoogleGenAI } from '@google/genai';

// import Chapter from './models/Chapter.js';

// dotenv.config();

// const app = express();

// app.use(express.json({ limit: '2mb' }));

// app.use(cors({
//   origin: process.env.CLIENT_URL || 'https://tamil-exam.vercel.app'
// }));

// // --------------------------------------------------
// // CONFIGURATION
// // --------------------------------------------------

// if (!process.env.GEMINI_API_KEY) {
//   throw new Error('GEMINI_API_KEY is missing in .env');
// }

// if (!process.env.MONGODB_URI) {
//   throw new Error('MONGODB_URI is missing in .env');
// }

// const ai = new GoogleGenAI({
//   apiKey: process.env.GEMINI_API_KEY
// });

// // Using latest available flash model
// const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

// // --------------------------------------------------
// // MULTER
// // --------------------------------------------------

// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: {
//     fileSize: 5 * 1024 * 1024,
//     files: 6
//   },
//   fileFilter: (req, file, cb) => {
//     const allowed = ['image/jpeg', 'image/png', 'image/webp'];
//     if (!allowed.includes(file.mimetype)) {
//       return cb(new Error('Only JPG, PNG and WEBP images are supported.'));
//     }
//     cb(null, true);
//   }
// });

// // --------------------------------------------------
// // HELPERS
// // --------------------------------------------------

// const isValidId = id => mongoose.isValidObjectId(id);

// const getChapter = async (id) => {
//   if (!isValidId(id)) return null;
//   return Chapter.findById(id);
// };

// const validateQuestion = (question) => {
//   if (!question || typeof question.questionText !== 'string' || !question.questionText.trim()) {
//     return 'Question text is required.';
//   }

//   if (!Array.isArray(question.options) || question.options.length !== 4 || !question.options.every(option => typeof option === 'string' && option.trim())) {
//     return 'Exactly four non-empty options are required.';
//   }

//   if (!Number.isInteger(question.correctOptionIndex) || question.correctOptionIndex < 0 || question.correctOptionIndex > 3) {
//     return 'Correct option index must be between 0 and 3.';
//   }

//   return null;
// };

// const parseGeminiJSON = (response) => {
//   const text = response.text;
//   if (!text) {
//     throw new Error('Gemini returned an empty response.');
//   }
//   try {
//     return JSON.parse(text);
//   } catch {
//     console.error('Invalid Gemini JSON:', text);
//     throw new Error('Gemini returned invalid JSON.');
//   }
// };

// // Automatic retry wrapper for handling 503 high demand errors gracefully
// const generateWithRetry = async (aiInstance, payload, retries = 3, delay = 3000) => {
//   for (let i = 0; i < retries; i++) {
//     try {
//       return await aiInstance.models.generateContent(payload);
//     } catch (error) {
//       // Check if error is a 503 Service Unavailable / high demand
//       const isUnavailable = error.status === 503 || error.message?.includes('503') || error.message?.includes('unavailable');
//       if (isUnavailable && i < retries - 1) {
//         console.warn(`Model overloaded (503). Retrying in ${delay}ms... (Attempt ${i + 1} of ${retries})`);
//         await new Promise(res => setTimeout(res, delay));
//       } else {
//         throw error;
//       }
//     }
//   }
// };

// const prepareImages = async (files) => {
//   const totalSize = files.reduce((total, file) => total + file.size, 0);

//   if (totalSize > 20 * 1024 * 1024) {
//     throw new Error('The combined image size must be below 20 MB. Upload fewer or smaller images.');
//   }

//   const imageParts = [];

//   for (const file of files) {
//     const compressedBuffer = await sharp(file.buffer)
//       .rotate()
//       .resize({
//         width: 1600,
//         height: 1600,
//         fit: 'inside',
//         withoutEnlargement: true
//       })
//       .jpeg({ quality: 80 })
//       .toBuffer();

//     imageParts.push({
//       inlineData: {
//         data: compressedBuffer.toString('base64'),
//         mimeType: 'image/jpeg'
//       }
//     });
//   }

//   return imageParts;
// };

// // --------------------------------------------------
// // CHAPTER ROUTES
// // --------------------------------------------------

// app.post('/api/chapters', async (req, res) => {
//   try {
//     const { title, description = '' } = req.body;

//     if (!title || !title.trim()) {
//       return res.status(400).json({ success: false, error: 'Chapter title is required.' });
//     }

//     const chapter = await Chapter.create({
//       title: title.trim(),
//       description: description.trim()
//     });

//     return res.status(201).json({ success: true, message: 'Chapter created successfully.', chapter });
//   } catch (error) {
//     console.error('Create chapter error:', error);
//     return res.status(500).json({ success: false, error: 'Unable to create chapter.' });
//   }
// });

// app.get('/api/chapters', async (req, res) => {
//   try {
//     const chapters = await Chapter.find().sort({ createdAt: -1 }).select('title description questions createdAt updatedAt');
//     return res.json({ success: true, chapters });
//   } catch (error) {
//     console.error('Get chapters error:', error);
//     return res.status(500).json({ success: false, error: 'Unable to retrieve chapters.' });
//   }
// });

// app.get('/api/chapters/:chapterId', async (req, res) => {
//   try {
//     const chapter = await getChapter(req.params.chapterId);
//     if (!chapter) {
//       return res.status(404).json({ success: false, error: 'Chapter not found.' });
//     }
//     return res.json({ success: true, chapter });
//   } catch (error) {
//     console.error('Get chapter error:', error);
//     return res.status(500).json({ success: false, error: 'Unable to retrieve chapter.' });
//   }
// });

// app.patch('/api/chapters/:chapterId', async (req, res) => {
//   try {
//     const chapter = await getChapter(req.params.chapterId);
//     if (!chapter) {
//       return res.status(404).json({ success: false, error: 'Chapter not found.' });
//     }

//     const { title, description } = req.body;

//     if (title !== undefined) {
//       if (typeof title !== 'string' || !title.trim()) {
//         return res.status(400).json({ success: false, error: 'Chapter title cannot be empty.' });
//       }
//       chapter.title = title.trim();
//     }

//     if (description !== undefined) {
//       chapter.description = description;
//     }

//     await chapter.save();
//     return res.json({ success: true, message: 'Chapter updated successfully.', chapter });
//   } catch (error) {
//     console.error('Update chapter error:', error);
//     return res.status(500).json({ success: false, error: 'Unable to update chapter.' });
//   }
// });

// app.delete('/api/chapters/:chapterId', async (req, res) => {
//   try {
//     const chapter = await getChapter(req.params.chapterId);
//     if (!chapter) {
//       return res.status(404).json({ success: false, error: 'Chapter not found.' });
//     }

//     await Chapter.findByIdAndDelete(chapter._id);
//     return res.json({ success: true, message: 'Chapter and all its questions deleted successfully.' });
//   } catch (error) {
//     console.error('Delete chapter error:', error);
//     return res.status(500).json({ success: false, error: 'Unable to delete chapter.' });
//   }
// });

// // --------------------------------------------------
// // QUESTION ROUTES
// // --------------------------------------------------

// app.post('/api/chapters/:chapterId/questions', async (req, res) => {
//   try {
//     const chapter = await getChapter(req.params.chapterId);
//     if (!chapter) {
//       return res.status(404).json({ success: false, error: 'Chapter not found.' });
//     }

//     const question = {
//       questionText: req.body.questionText,
//       options: req.body.options,
//       correctOptionIndex: req.body.correctOptionIndex,
//       sourceEvidence: req.body.sourceEvidence || ''
//     };

//     const validationError = validateQuestion(question);
//     if (validationError) {
//       return res.status(400).json({ success: false, error: validationError });
//     }

//     chapter.questions.push(question);
//     await chapter.save();

//     const addedQuestion = chapter.questions[chapter.questions.length - 1];
//     return res.status(201).json({ success: true, message: 'Question added successfully.', question: addedQuestion });
//   } catch (error) {
//     console.error('Add question error:', error);
//     return res.status(500).json({ success: false, error: 'Unable to add question.' });
//   }
// });

// app.patch('/api/chapters/:chapterId/questions/:questionId', async (req, res) => {
//   try {
//     const chapter = await getChapter(req.params.chapterId);
//     if (!chapter) {
//       return res.status(404).json({ success: false, error: 'Chapter not found.' });
//     }

//     const question = chapter.questions.id(req.params.questionId);
//     if (!question) {
//       return res.status(404).json({ success: false, error: 'Question not found.' });
//     }

//     const updatedQuestion = {
//       questionText: req.body.questionText !== undefined ? req.body.questionText : question.questionText,
//       options: req.body.options !== undefined ? req.body.options : question.options,
//       correctOptionIndex: req.body.correctOptionIndex !== undefined ? req.body.correctOptionIndex : question.correctOptionIndex
//     };

//     const validationError = validateQuestion(updatedQuestion);
//     if (validationError) {
//       return res.status(400).json({ success: false, error: validationError });
//     }

//     question.questionText = updatedQuestion.questionText.trim();
//     question.options = updatedQuestion.options.map(option => option.trim());
//     question.correctOptionIndex = updatedQuestion.correctOptionIndex;

//     if (req.body.sourceEvidence !== undefined) {
//       question.sourceEvidence = req.body.sourceEvidence;
//     }

//     await chapter.save();
//     return res.json({ success: true, message: 'Question updated successfully.', question });
//   } catch (error) {
//     console.error('Edit question error:', error);
//     return res.status(500).json({ success: false, error: 'Unable to edit question.' });
//   }
// });

// app.delete('/api/chapters/:chapterId/questions/:questionId', async (req, res) => {
//   try {
//     const chapter = await getChapter(req.params.chapterId);
//     if (!chapter) {
//       return res.status(404).json({ success: false, error: 'Chapter not found.' });
//     }

//     const question = chapter.questions.id(req.params.questionId);
//     if (!question) {
//       return res.status(404).json({ success: false, error: 'Question not found.' });
//     }

//     question.deleteOne();
//     await chapter.save();

//     return res.json({ success: true, message: 'Question deleted successfully.' });
//   } catch (error) {
//     console.error('Delete question error:', error);
//     return res.status(500).json({ success: false, error: 'Unable to delete question.' });
//   }
// });

// // --------------------------------------------------
// // SINGLE-PASS GEMINI PROMPT & GENERATION ROUTE
// // --------------------------------------------------

// const SINGLE_PASS_PROMPT = `
// You are an expert CBSE Class 10 Tamil teacher and board examiner.
// Read the provided Tamil textbook page images carefully.

// Generate accurate CBSE Class 10 Tamil பாடல் வினா multiple-choice questions directly supported by the text in the images.

// STRICT ACCURACY INSTRUCTIONS:
// - Only generate questions whose answers are explicitly present in the provided text.
// - Provide exact Tamil phrase from the text in "sourceEvidence" for each question.
// - Perform strict self-verification to ensure exactly one option is correct and options are plausible.
// - Generate at most 5-8 high-quality questions.

// Return ONLY valid JSON in this exact structure:
// {
//   "passage": "அசல் பாடல் அல்லது உரையின் வாசிக்கக்கூடிய பகுதி",
//   "questions": [
//     {
//       "questionText": "தமிழில் வினா",
//       "options": ["விடை ஒன்று", "விடை இரண்டு", "விடை மூன்று", "விடை நான்கு"],
//       "correctOptionIndex": 0,
//       "sourceEvidence": "பாடப்பகுதியில் உள்ள ஆதார வரி"
//     }
//   ]
// }
// `;

// app.post('/api/chapters/:chapterId/generate', upload.array('images', 6), async (req, res) => {
//   try {
//     const chapter = await getChapter(req.params.chapterId);
//     if (!chapter) {
//       return res.status(404).json({ success: false, error: 'Chapter not found.' });
//     }

//     if (!req.files || req.files.length === 0) {
//       return res.status(400).json({ success: false, error: 'Upload at least one textbook image.' });
//     }

//     console.log('Processing images...');
//     const imageParts = await prepareImages(req.files);

//     console.log('Sending single-pass request to Gemini with retry support...');
//     const generationResponse = await generateWithRetry(ai, {
//       model: MODEL,
//       contents: [{
//         role: 'user',
//         parts: [{ text: SINGLE_PASS_PROMPT }, ...imageParts]
//       }],
//       config: {
//         responseMimeType: 'application/json',
//         temperature: 0.1
//       }
//     });

//     const generated = parseGeminiJSON(generationResponse);
//     if (typeof generated.passage !== 'string' || !Array.isArray(generated.questions)) {
//       throw new Error('Gemini returned an invalid question structure.');
//     }

//     const verifiedQuestions = generated.questions.filter(q => 
//       !validateQuestion(q) && 
//       typeof q.sourceEvidence === 'string' && 
//       q.sourceEvidence.trim().length > 0
//     );

//     if (!verifiedQuestions.length) {
//       return res.status(422).json({ 
//         success: false, 
//         error: 'No valid questions could be generated from these pages.', 
//         savedCount: 0 
//       });
//     }

//     const questionsToSave = verifiedQuestions.map(q => ({
//       questionText: q.questionText.trim(),
//       options: q.options.map(o => o.trim()),
//       correctOptionIndex: q.correctOptionIndex,
//       sourceEvidence: q.sourceEvidence.trim()
//     }));

//     chapter.questions.push(...questionsToSave);
//     await chapter.save();

//     const savedQuestions = chapter.questions.slice(-questionsToSave.length);

//     return res.status(201).json({
//       success: true,
//       message: 'Questions generated and saved successfully.',
//       generatedCount: generated.questions.length,
//       savedCount: savedQuestions.length,
//       passage: generated.passage,
//       questions: savedQuestions,
//       chapterId: chapter._id,
//       chapterTitle: chapter.title
//     });
//   } catch (error) {
//     console.error('QUESTION GENERATION ERROR:', error);
//     return res.status(500).json({ success: false, error: error.message || 'Question generation failed.' });
//   }
// });

// // --------------------------------------------------
// // ERROR HANDLER & SERVER START
// // --------------------------------------------------

// app.use((error, req, res, next) => {
//   console.error('Request error:', error);
//   if (error instanceof multer.MulterError) {
//     if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, error: 'Each image must be smaller than 5 MB.' });
//     if (error.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ success: false, error: 'Maximum 6 images are allowed per request.' });
//   }
//   return res.status(500).json({ success: false, error: error.message || 'Internal server error.' });
// });

// const PORT = process.env.PORT || 5000;

// const startServer = async () => {
//   try {
//     await mongoose.connect(process.env.MONGODB_URI);
//     console.log('MongoDB connected successfully.');
//     app.listen(PORT, () => {
//       console.log(`Server running on port ${PORT}`);
//       console.log(`Gemini model: ${MODEL}`);
//     });
//   } catch (error) {
//     console.error('Database connection failed:', error);
//     process.exit(1);
//   }
// };

// startServer();



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

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------

const PORT = process.env.PORT || 5000;

const CLIENT_URL =
  process.env.CLIENT_URL || 'https://tamil-exam.vercel.app';

const MODEL =
  process.env.GEMINI_MODEL || 'gemini-3.8-flash';

const MAX_IMAGES = 6;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_IMAGE_SIZE = 20 * 1024 * 1024;
const MAX_QUESTIONS = 8;

const MAX_REQUESTS_PER_MINUTE = 3;
const REQUEST_WINDOW = 60 * 1000;
const MAX_CONCURRENT_GENERATIONS = 2;

const MAX_RETRIES = 2;

app.use(express.json({ limit: '2mb' }));

app.use(cors({
  origin: CLIENT_URL,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// --------------------------------------------------
// ENVIRONMENT VALIDATION
// --------------------------------------------------

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is missing.');
}

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is missing.');
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// --------------------------------------------------
// APPLICATION USAGE MONITOR
// --------------------------------------------------

const usageStats = {
  totalAttempts: 0,
  successfulGenerations: 0,
  failedGenerations: 0,

  totalImagesProcessed: 0,

  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalTokens: 0,

  rateLimitErrors: 0,
  quotaErrors: 0,
  serverErrors: 0,

  activeGenerations: 0,

  totalGenerationTimeMs: 0,

  lastRequestAt: null,
  lastSuccessAt: null,
  lastError: null,

  startedAt: new Date().toISOString()
};

// --------------------------------------------------
// RATE LIMITER
// --------------------------------------------------

const requestHistory = new Map();

const generationRateLimiter = (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress;
  const now = Date.now();

  const previous = requestHistory.get(ip) || [];

  const recent = previous.filter(
    timestamp => now - timestamp < REQUEST_WINDOW
  );

  if (recent.length >= MAX_REQUESTS_PER_MINUTE) {
    const retryAfterSeconds = Math.ceil(
      (recent[0] + REQUEST_WINDOW - now) / 1000
    );

    return res.status(429).json({
      success: false,
      code: 'APP_RATE_LIMIT',
      error: 'Application rate limit reached.',
      message: 'Please wait before generating more questions.',
      retryAfterSeconds
    });
  }

  recent.push(now);
  requestHistory.set(ip, recent);

  next();
};

const getRateLimitStatus = req => {
  const ip = req.ip || req.socket.remoteAddress;
  const now = Date.now();

  const previous = requestHistory.get(ip) || [];

  const recent = previous.filter(
    timestamp => now - timestamp < REQUEST_WINDOW
  );

  return {
    limit: MAX_REQUESTS_PER_MINUTE,
    used: recent.length,
    remaining: Math.max(
      0,
      MAX_REQUESTS_PER_MINUTE - recent.length
    ),
    windowSeconds: REQUEST_WINDOW / 1000
  };
};
// --------------------------------------------------
// MULTER
// --------------------------------------------------

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: MAX_IMAGES
  },

  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(
        new Error('Only JPG, PNG and WEBP images are supported.')
      );
    }

    cb(null, true);
  }
});

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const isValidId = id =>
  mongoose.isValidObjectId(id);

const getChapter = async id => {
  if (!isValidId(id)) return null;

  return Chapter.findById(id);
};

const validateQuestion = question => {
  if (
    !question ||
    typeof question.questionText !== 'string' ||
    !question.questionText.trim()
  ) {
    return 'Question text is required.';
  }

  if (
    !Array.isArray(question.options) ||
    question.options.length !== 4 ||
    !question.options.every(
      option =>
        typeof option === 'string' &&
        option.trim()
    )
  ) {
    return 'Exactly four non-empty options are required.';
  }

  if (
    !Number.isInteger(question.correctOptionIndex) ||
    question.correctOptionIndex < 0 ||
    question.correctOptionIndex > 3
  ) {
    return 'Correct option index must be between 0 and 3.';
  }

  return null;
};

const parseGeminiJSON = response => {
  const responseText = response.text;

  if (!responseText) {
    throw new Error('Gemini returned an empty response.');
  }

  try {
    return JSON.parse(responseText);
  } catch {
    console.error('Invalid Gemini JSON:', responseText);

    throw new Error('Gemini returned invalid JSON.');
  }
};

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

// --------------------------------------------------
// GEMINI ERROR DETECTION
// --------------------------------------------------

const getGeminiError = error => {
  const status = Number(
    error.status ||
    error.code ||
    error.response?.status ||
    0
  );

  const message = String(
    error.message ||
    error.error?.message ||
    'Unknown Gemini API error'
  );

  const normalized = message.toLowerCase();

  const isQuotaExceeded =
    normalized.includes('quota_exceeded') ||
    normalized.includes('daily quota') ||
    normalized.includes('per day') ||
    normalized.includes('daily limit');

  return {
    status,
    message,
    isQuotaExceeded,
    isRateLimited: status === 429,
    isUnavailable: status === 503
  };
};

// --------------------------------------------------
// GEMINI RETRY HANDLER
// --------------------------------------------------

const generateWithRetry = async (
  aiInstance,
  payload,
  retries = MAX_RETRIES
) => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await aiInstance.models.generateContent(payload);

    } catch (error) {
      const info = getGeminiError(error);

      // Never retry an identified daily quota exhaustion.

      if (info.isQuotaExceeded) {
        throw error;
      }

      const retryable =
        info.isUnavailable ||
        info.isRateLimited;

      if (!retryable || attempt >= retries) {
        throw error;
      }

      const delay = Math.min(
        2000 * Math.pow(2, attempt),
        10000
      );

      console.warn(
        `Gemini error ${info.status}. Retrying in ${delay}ms.`
      );

      await sleep(delay);
    }
  }
};

// --------------------------------------------------
// IMAGE PROCESSING
// --------------------------------------------------

const prepareImages = async files => {
  const totalSize = files.reduce(
    (total, file) => total + file.size,
    0
  );

  if (totalSize > MAX_TOTAL_IMAGE_SIZE) {
    throw new Error(
      'Combined image size must be below 20 MB.'
    );
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
// HEALTH CHECK
// --------------------------------------------------

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Tamil Exam API is running.',
    model: MODEL
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    server: 'online',
    database: mongoose.connection.readyState === 1
      ? 'connected'
      : 'disconnected',
    model: MODEL,
    activeGenerations: usageStats.activeGenerations
  });
});

// --------------------------------------------------
// USAGE DASHBOARD
// --------------------------------------------------

app.get('/api/usage', (req, res) => {
  const averageTime =
    usageStats.successfulGenerations > 0
      ? Math.round(
          usageStats.totalGenerationTimeMs /
          usageStats.successfulGenerations
        )
      : 0;

  res.json({
    success: true,
    model: MODEL,

    usage: {
      ...usageStats,
      averageGenerationTimeMs: averageTime
    },

    limits: {
      requestsPerMinute: getRateLimitStatus(req),

      maxConcurrentGenerations:
        MAX_CONCURRENT_GENERATIONS,

      activeGenerations:
        usageStats.activeGenerations,

      remainingGenerationSlots: Math.max(
        0,
        MAX_CONCURRENT_GENERATIONS -
        usageStats.activeGenerations
      ),

      maxImagesPerRequest: MAX_IMAGES,
      maxQuestionsPerGeneration: MAX_QUESTIONS
    },

    geminiQuota: {
      officialQuotaAvailable: false,
      message:
        'Check Google AI Studio for your official Gemini API quota.'
    }
  });
});

// --------------------------------------------------
// CHAPTER ROUTES
// --------------------------------------------------

app.post('/api/chapters', async (req, res) => {
  try {
    const { title, description = '' } = req.body;

    if (
      typeof title !== 'string' ||
      !title.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: 'Chapter title is required.'
      });
    }

    const chapter = await Chapter.create({
      title: title.trim(),
      description:
        typeof description === 'string'
          ? description.trim()
          : ''
    });

    return res.status(201).json({
      success: true,
      message: 'Chapter created successfully.',
      chapter
    });

  } catch (error) {
    console.error('Create chapter error:', error);

    return res.status(500).json({
      success: false,
      error: 'Unable to create chapter.'
    });
  }
});

app.get('/api/chapters', async (req, res) => {
  try {
    const chapters = await Chapter.find()
      .sort({ createdAt: -1 })
      .select('title description questions createdAt updatedAt');

    return res.json({
      success: true,
      chapters
    });

  } catch (error) {
    console.error('Get chapters error:', error);

    return res.status(500).json({
      success: false,
      error: 'Unable to retrieve chapters.'
    });
  }
});

app.get('/api/chapters/:chapterId', async (req, res) => {
  try {
    const chapter = await getChapter(req.params.chapterId);

    if (!chapter) {
      return res.status(404).json({
        success: false,
        error: 'Chapter not found.'
      });
    }

    return res.json({
      success: true,
      chapter
    });

  } catch (error) {
    console.error('Get chapter error:', error);

    return res.status(500).json({
      success: false,
      error: 'Unable to retrieve chapter.'
    });
  }
});

app.patch('/api/chapters/:chapterId', async (req, res) => {
  try {
    const chapter = await getChapter(req.params.chapterId);

    if (!chapter) {
      return res.status(404).json({
        success: false,
        error: 'Chapter not found.'
      });
    }

    const { title, description } = req.body;

    if (title !== undefined) {
      if (
        typeof title !== 'string' ||
        !title.trim()
      ) {
        return res.status(400).json({
          success: false,
          error: 'Chapter title cannot be empty.'
        });
      }

      chapter.title = title.trim();
    }

    if (description !== undefined) {
      if (typeof description !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Description must be text.'
        });
      }

      chapter.description = description;
    }

    await chapter.save();

    return res.json({
      success: true,
      message: 'Chapter updated successfully.',
      chapter
    });

  } catch (error) {
    console.error('Update chapter error:', error);

    return res.status(500).json({
      success: false,
      error: 'Unable to update chapter.'
    });
  }
});

app.delete('/api/chapters/:chapterId', async (req, res) => {
  try {
    const chapter = await getChapter(req.params.chapterId);

    if (!chapter) {
      return res.status(404).json({
        success: false,
        error: 'Chapter not found.'
      });
    }

    await Chapter.findByIdAndDelete(chapter._id);

    return res.json({
      success: true,
      message: 'Chapter and all its questions deleted successfully.'
    });

  } catch (error) {
    console.error('Delete chapter error:', error);

    return res.status(500).json({
      success: false,
      error: 'Unable to delete chapter.'
    });
  }
});

// --------------------------------------------------
// QUESTION ROUTES
// --------------------------------------------------

app.post('/api/chapters/:chapterId/questions', async (req, res) => {
  try {
    const chapter = await getChapter(req.params.chapterId);

    if (!chapter) {
      return res.status(404).json({
        success: false,
        error: 'Chapter not found.'
      });
    }

    const question = {
      questionText: req.body.questionText,
      options: req.body.options,
      correctOptionIndex: req.body.correctOptionIndex,
      sourceEvidence: req.body.sourceEvidence || ''
    };

    const validationError = validateQuestion(question);

    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError
      });
    }

    chapter.questions.push(question);

    await chapter.save();

    const addedQuestion =
      chapter.questions[chapter.questions.length - 1];

    return res.status(201).json({
      success: true,
      message: 'Question added successfully.',
      question: addedQuestion
    });

  } catch (error) {
    console.error('Add question error:', error);

    return res.status(500).json({
      success: false,
      error: 'Unable to add question.'
    });
  }
});

app.patch(
  '/api/chapters/:chapterId/questions/:questionId',
  async (req, res) => {
    try {
      const chapter = await getChapter(req.params.chapterId);

      if (!chapter) {
        return res.status(404).json({
          success: false,
          error: 'Chapter not found.'
        });
      }

      const question = chapter.questions.id(
        req.params.questionId
      );

      if (!question) {
        return res.status(404).json({
          success: false,
          error: 'Question not found.'
        });
      }

      const updatedQuestion = {
        questionText:
          req.body.questionText !== undefined
            ? req.body.questionText
            : question.questionText,

        options:
          req.body.options !== undefined
            ? req.body.options
            : question.options,

        correctOptionIndex:
          req.body.correctOptionIndex !== undefined
            ? req.body.correctOptionIndex
            : question.correctOptionIndex
      };

      const validationError =
        validateQuestion(updatedQuestion);

      if (validationError) {
        return res.status(400).json({
          success: false,
          error: validationError
        });
      }

      question.questionText =
        updatedQuestion.questionText.trim();

      question.options =
        updatedQuestion.options.map(option => option.trim());

      question.correctOptionIndex =
        updatedQuestion.correctOptionIndex;

      if (req.body.sourceEvidence !== undefined) {
        question.sourceEvidence = req.body.sourceEvidence;
      }

      await chapter.save();

      return res.json({
        success: true,
        message: 'Question updated successfully.',
        question
      });

    } catch (error) {
      console.error('Edit question error:', error);

      return res.status(500).json({
        success: false,
        error: 'Unable to edit question.'
      });
    }
  }
);

app.delete(
  '/api/chapters/:chapterId/questions/:questionId',
  async (req, res) => {
    try {
      const chapter = await getChapter(req.params.chapterId);

      if (!chapter) {
        return res.status(404).json({
          success: false,
          error: 'Chapter not found.'
        });
      }

      const question = chapter.questions.id(
        req.params.questionId
      );

      if (!question) {
        return res.status(404).json({
          success: false,
          error: 'Question not found.'
        });
      }

      question.deleteOne();

      await chapter.save();

      return res.json({
        success: true,
        message: 'Question deleted successfully.'
      });

    } catch (error) {
      console.error('Delete question error:', error);

      return res.status(500).json({
        success: false,
        error: 'Unable to delete question.'
      });
    }
  }
);

// --------------------------------------------------
// GEMINI PROMPT
// --------------------------------------------------

const SINGLE_PASS_PROMPT = `
You are an expert CBSE Class 10 Tamil teacher and board examiner.

Read all the provided Tamil textbook page images carefully.

Generate accurate CBSE Class 10 Tamil பாடல் வினா multiple-choice questions directly supported by the textbook content.

STRICT ACCURACY INSTRUCTIONS:

1. Generate questions ONLY from the provided textbook images.
2. Never invent information.
3. Only ask questions whose answers are explicitly supported by the text.
4. Provide exact Tamil sourceEvidence for every question.
5. Each question must have exactly four Tamil options.
6. Exactly one option must be correct.
7. Make the incorrect options plausible but clearly incorrect.
8. Do not generate questions from unreadable text.
9. Avoid duplicate questions.
10. Generate a maximum of 8 high-quality questions.
11. Use correct Tamil spelling and grammar.
12. Do not introduce outside textbook knowledge.

Return ONLY valid JSON in this exact structure:

{
  "passage": "அசல் பாடல் அல்லது உரையின் வாசிக்கக்கூடிய பகுதி",
  "questions": [
    {
      "questionText": "தமிழில் வினா",
      "options": [
        "விடை ஒன்று",
        "விடை இரண்டு",
        "விடை மூன்று",
        "விடை நான்கு"
      ],
      "correctOptionIndex": 0,
      "sourceEvidence": "பாடப்பகுதியில் உள்ள ஆதார வரி"
    }
  ]
}

If no reliable questions can be generated, return an empty questions array.
`;

// --------------------------------------------------
// QUESTION GENERATION ROUTE
// --------------------------------------------------

app.post(
  '/api/chapters/:chapterId/generate',
  generationRateLimiter,
  upload.array('images', MAX_IMAGES),

  async (req, res) => {

    let acquiredSlot = false;
    const requestStartedAt = Date.now();

    usageStats.totalAttempts++;
    usageStats.lastRequestAt =
      new Date().toISOString();

    try {

      // Concurrency protection

      if (
        usageStats.activeGenerations >=
        MAX_CONCURRENT_GENERATIONS
      ) {
        usageStats.failedGenerations++;

        return res.status(503).json({
          success: false,
          code: 'APP_BUSY',
          error: 'Generation service is busy.',
          message: 'Please try again shortly.'
        });
      }

      usageStats.activeGenerations++;
      acquiredSlot = true;

      // Find chapter

      const chapter = await getChapter(
        req.params.chapterId
      );

      if (!chapter) {
        usageStats.failedGenerations++;

        return res.status(404).json({
          success: false,
          code: 'CHAPTER_NOT_FOUND',
          error: 'Chapter not found.'
        });
      }

      // Validate uploaded images

      if (!req.files || req.files.length === 0) {
        usageStats.failedGenerations++;

        return res.status(400).json({
          success: false,
          code: 'NO_IMAGES',
          error: 'Upload at least one textbook image.'
        });
      }

      // Compress images

      console.log('Processing textbook images...');

      const imageParts = await prepareImages(req.files);

      usageStats.totalImagesProcessed +=
        req.files.length;

      // Send request to Gemini

      console.log(
        `Sending request to Gemini model: ${MODEL}`
      );

      const generationResponse = await generateWithRetry(
        ai,
        {
          model: MODEL,

          contents: [{
            role: 'user',

            parts: [
              { text: SINGLE_PASS_PROMPT },
              ...imageParts
            ]
          }],

          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            maxOutputTokens: 2500
          }
        }
      );

      // Record token usage

      const metadata =
        generationResponse.usageMetadata || {};

      const inputTokens =
        metadata.promptTokenCount || 0;

      const outputTokens =
        metadata.candidatesTokenCount || 0;

      const totalTokens =
        metadata.totalTokenCount ||
        inputTokens + outputTokens;

      usageStats.totalInputTokens += inputTokens;
      usageStats.totalOutputTokens += outputTokens;
      usageStats.totalTokens += totalTokens;

      // Parse JSON

      const generated =
        parseGeminiJSON(generationResponse);

      if (
        typeof generated.passage !== 'string' ||
        !Array.isArray(generated.questions)
      ) {
        throw new Error(
          'Gemini returned an invalid question structure.'
        );
      }

      // Validate questions

      const verifiedQuestions =
        generated.questions
          .filter(question =>
            !validateQuestion(question) &&
            typeof question.sourceEvidence === 'string' &&
            question.sourceEvidence.trim().length > 0
          )
          .slice(0, MAX_QUESTIONS);

      if (verifiedQuestions.length === 0) {
        usageStats.failedGenerations++;

        return res.status(422).json({
          success: false,
          code: 'NO_VALID_QUESTIONS',
          error: 'No valid questions could be generated.',
          savedCount: 0
        });
      }

      // Prepare questions for MongoDB

      const questionsToSave =
        verifiedQuestions.map(question => ({
          questionText: question.questionText.trim(),

          options: question.options.map(
            option => option.trim()
          ),

          correctOptionIndex:
            question.correctOptionIndex,

          sourceEvidence:
            question.sourceEvidence.trim()
        }));

      // Save questions

      chapter.questions.push(...questionsToSave);

      await chapter.save();

      const savedQuestions =
        chapter.questions.slice(
          -questionsToSave.length
        );

      // Update statistics

      const generationTimeMs =
        Date.now() - requestStartedAt;

      usageStats.successfulGenerations++;

      usageStats.lastSuccessAt =
        new Date().toISOString();

      usageStats.totalGenerationTimeMs +=
        generationTimeMs;

      console.log(
        `Successfully saved ${savedQuestions.length} questions.`
      );

      // Success response

      return res.status(201).json({
        success: true,

        message:
          'Questions generated and saved successfully.',

        generatedCount:
          generated.questions.length,

        savedCount:
          savedQuestions.length,

        passage:
          generated.passage,

        questions:
          savedQuestions,

        chapterId:
          chapter._id,

        chapterTitle:
          chapter.title,

        usage: {
          inputTokens,
          outputTokens,
          totalTokens,
          generationTimeMs
        }
      });

    } catch (error) {

      console.error(
        'QUESTION GENERATION ERROR:',
        error
      );

      usageStats.failedGenerations++;

      const info = getGeminiError(error);

      if (info.status === 429) {
        usageStats.rateLimitErrors++;

        if (info.isQuotaExceeded) {
          usageStats.quotaErrors++;
        }
      }

      if (
        info.status === 503 ||
        info.status >= 500
      ) {
        usageStats.serverErrors++;
      }

      usageStats.lastError = {
        message: info.message,
        status: info.status,
        at: new Date().toISOString()
      };

      if (info.isQuotaExceeded) {
        return res.status(429).json({
          success: false,
          code: 'GEMINI_QUOTA_EXHAUSTED',
          error: 'Gemini API quota exhausted.',
          message:
            'Please check your Google AI Studio quota.'
        });
      }

      if (info.isRateLimited) {
        return res.status(429).json({
          success: false,
          code: 'GEMINI_RATE_LIMIT',
          error: 'Gemini rate limit reached.',
          message:
            'Too many API requests. Please wait before trying again.'
        });
      }

      if (info.isUnavailable) {
        return res.status(503).json({
          success: false,
          code: 'GEMINI_UNAVAILABLE',
          error: 'Gemini is temporarily unavailable.',
          message:
            'Please try again shortly.'
        });
      }

      return res.status(500).json({
        success: false,
        code: 'GENERATION_FAILED',
        error: 'Question generation failed.',
        message: info.message
      });

    } finally {

      if (acquiredSlot) {
        usageStats.activeGenerations--;
      }

    }
  }
);

// --------------------------------------------------
// GLOBAL ERROR HANDLER
// --------------------------------------------------

app.use((error, req, res, next) => {

  console.error('Request error:', error);

  if (error instanceof multer.MulterError) {

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        code: 'FILE_TOO_LARGE',
        error: 'Each image must be smaller than 5 MB.'
      });
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        code: 'TOO_MANY_FILES',
        error: 'Maximum 6 images are allowed.'
      });
    }
  }

  return res.status(400).json({
    success: false,
    error: error.message || 'Request failed.'
  });
});

// --------------------------------------------------
// DATABASE & SERVER START
// --------------------------------------------------

const startServer = async () => {

  try {

    await mongoose.connect(
      process.env.MONGODB_URI
    );

    console.log('MongoDB connected successfully.');

    app.listen(PORT, () => {

      console.log(`Server running on port ${PORT}`);

      console.log(`Gemini model: ${MODEL}`);

      console.log('Usage monitoring: /api/usage');

      console.log('Health monitoring: /api/health');

    });

  } catch (error) {

    console.error(
      'Database connection failed:',
      error
    );

    process.exit(1);

  }
};

startServer();

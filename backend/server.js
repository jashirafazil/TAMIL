// // import express from 'express';
// // import cors from 'cors';
// // import multer from 'multer';
// // import dotenv from 'dotenv';
// // import mongoose from 'mongoose';
// // import sharp from 'sharp';
// // import { GoogleGenAI } from '@google/genai';

// // import Chapter from './models/Chapter.js';

// // dotenv.config();

// // const app = express();

// // app.use(express.json({ limit: '2mb' }));

// // app.use(cors({
// //   origin: process.env.CLIENT_URL || 'https://tamil-exam.vercel.app'
// // }));

// // // --------------------------------------------------
// // // CONFIGURATION
// // // --------------------------------------------------

// // if (!process.env.GEMINI_API_KEY) {
// //   throw new Error('GEMINI_API_KEY is missing in .env');
// // }

// // if (!process.env.MONGODB_URI) {
// //   throw new Error('MONGODB_URI is missing in .env');
// // }

// // const ai = new GoogleGenAI({
// //   apiKey: process.env.GEMINI_API_KEY
// // });

// // // Using latest available flash model
// // const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

// // // --------------------------------------------------
// // // MULTER
// // // --------------------------------------------------

// // const upload = multer({
// //   storage: multer.memoryStorage(),
// //   limits: {
// //     fileSize: 5 * 1024 * 1024,
// //     files: 6
// //   },
// //   fileFilter: (req, file, cb) => {
// //     const allowed = ['image/jpeg', 'image/png', 'image/webp'];
// //     if (!allowed.includes(file.mimetype)) {
// //       return cb(new Error('Only JPG, PNG and WEBP images are supported.'));
// //     }
// //     cb(null, true);
// //   }
// // });

// // // --------------------------------------------------
// // // HELPERS
// // // --------------------------------------------------

// // const isValidId = id => mongoose.isValidObjectId(id);

// // const getChapter = async (id) => {
// //   if (!isValidId(id)) return null;
// //   return Chapter.findById(id);
// // };

// // const validateQuestion = (question) => {
// //   if (!question || typeof question.questionText !== 'string' || !question.questionText.trim()) {
// //     return 'Question text is required.';
// //   }

// //   if (!Array.isArray(question.options) || question.options.length !== 4 || !question.options.every(option => typeof option === 'string' && option.trim())) {
// //     return 'Exactly four non-empty options are required.';
// //   }

// //   if (!Number.isInteger(question.correctOptionIndex) || question.correctOptionIndex < 0 || question.correctOptionIndex > 3) {
// //     return 'Correct option index must be between 0 and 3.';
// //   }

// //   return null;
// // };

// // const parseGeminiJSON = (response) => {
// //   const text = response.text;
// //   if (!text) {
// //     throw new Error('Gemini returned an empty response.');
// //   }
// //   try {
// //     return JSON.parse(text);
// //   } catch {
// //     console.error('Invalid Gemini JSON:', text);
// //     throw new Error('Gemini returned invalid JSON.');
// //   }
// // };

// // // Automatic retry wrapper for handling 503 high demand errors gracefully
// // const generateWithRetry = async (aiInstance, payload, retries = 3, delay = 3000) => {
// //   for (let i = 0; i < retries; i++) {
// //     try {
// //       return await aiInstance.models.generateContent(payload);
// //     } catch (error) {
// //       // Check if error is a 503 Service Unavailable / high demand
// //       const isUnavailable = error.status === 503 || error.message?.includes('503') || error.message?.includes('unavailable');
// //       if (isUnavailable && i < retries - 1) {
// //         console.warn(`Model overloaded (503). Retrying in ${delay}ms... (Attempt ${i + 1} of ${retries})`);
// //         await new Promise(res => setTimeout(res, delay));
// //       } else {
// //         throw error;
// //       }
// //     }
// //   }
// // };

// // const prepareImages = async (files) => {
// //   const totalSize = files.reduce((total, file) => total + file.size, 0);

// //   if (totalSize > 20 * 1024 * 1024) {
// //     throw new Error('The combined image size must be below 20 MB. Upload fewer or smaller images.');
// //   }

// //   const imageParts = [];

// //   for (const file of files) {
// //     const compressedBuffer = await sharp(file.buffer)
// //       .rotate()
// //       .resize({
// //         width: 1600,
// //         height: 1600,
// //         fit: 'inside',
// //         withoutEnlargement: true
// //       })
// //       .jpeg({ quality: 80 })
// //       .toBuffer();

// //     imageParts.push({
// //       inlineData: {
// //         data: compressedBuffer.toString('base64'),
// //         mimeType: 'image/jpeg'
// //       }
// //     });
// //   }

// //   return imageParts;
// // };

// // // --------------------------------------------------
// // // CHAPTER ROUTES
// // // --------------------------------------------------

// // app.post('/api/chapters', async (req, res) => {
// //   try {
// //     const { title, description = '' } = req.body;

// //     if (!title || !title.trim()) {
// //       return res.status(400).json({ success: false, error: 'Chapter title is required.' });
// //     }

// //     const chapter = await Chapter.create({
// //       title: title.trim(),
// //       description: description.trim()
// //     });

// //     return res.status(201).json({ success: true, message: 'Chapter created successfully.', chapter });
// //   } catch (error) {
// //     console.error('Create chapter error:', error);
// //     return res.status(500).json({ success: false, error: 'Unable to create chapter.' });
// //   }
// // });

// // app.get('/api/chapters', async (req, res) => {
// //   try {
// //     const chapters = await Chapter.find().sort({ createdAt: -1 }).select('title description questions createdAt updatedAt');
// //     return res.json({ success: true, chapters });
// //   } catch (error) {
// //     console.error('Get chapters error:', error);
// //     return res.status(500).json({ success: false, error: 'Unable to retrieve chapters.' });
// //   }
// // });

// // app.get('/api/chapters/:chapterId', async (req, res) => {
// //   try {
// //     const chapter = await getChapter(req.params.chapterId);
// //     if (!chapter) {
// //       return res.status(404).json({ success: false, error: 'Chapter not found.' });
// //     }
// //     return res.json({ success: true, chapter });
// //   } catch (error) {
// //     console.error('Get chapter error:', error);
// //     return res.status(500).json({ success: false, error: 'Unable to retrieve chapter.' });
// //   }
// // });

// // app.patch('/api/chapters/:chapterId', async (req, res) => {
// //   try {
// //     const chapter = await getChapter(req.params.chapterId);
// //     if (!chapter) {
// //       return res.status(404).json({ success: false, error: 'Chapter not found.' });
// //     }

// //     const { title, description } = req.body;

// //     if (title !== undefined) {
// //       if (typeof title !== 'string' || !title.trim()) {
// //         return res.status(400).json({ success: false, error: 'Chapter title cannot be empty.' });
// //       }
// //       chapter.title = title.trim();
// //     }

// //     if (description !== undefined) {
// //       chapter.description = description;
// //     }

// //     await chapter.save();
// //     return res.json({ success: true, message: 'Chapter updated successfully.', chapter });
// //   } catch (error) {
// //     console.error('Update chapter error:', error);
// //     return res.status(500).json({ success: false, error: 'Unable to update chapter.' });
// //   }
// // });

// // app.delete('/api/chapters/:chapterId', async (req, res) => {
// //   try {
// //     const chapter = await getChapter(req.params.chapterId);
// //     if (!chapter) {
// //       return res.status(404).json({ success: false, error: 'Chapter not found.' });
// //     }

// //     await Chapter.findByIdAndDelete(chapter._id);
// //     return res.json({ success: true, message: 'Chapter and all its questions deleted successfully.' });
// //   } catch (error) {
// //     console.error('Delete chapter error:', error);
// //     return res.status(500).json({ success: false, error: 'Unable to delete chapter.' });
// //   }
// // });

// // // --------------------------------------------------
// // // QUESTION ROUTES
// // // --------------------------------------------------

// // app.post('/api/chapters/:chapterId/questions', async (req, res) => {
// //   try {
// //     const chapter = await getChapter(req.params.chapterId);
// //     if (!chapter) {
// //       return res.status(404).json({ success: false, error: 'Chapter not found.' });
// //     }

// //     const question = {
// //       questionText: req.body.questionText,
// //       options: req.body.options,
// //       correctOptionIndex: req.body.correctOptionIndex,
// //       sourceEvidence: req.body.sourceEvidence || ''
// //     };

// //     const validationError = validateQuestion(question);
// //     if (validationError) {
// //       return res.status(400).json({ success: false, error: validationError });
// //     }

// //     chapter.questions.push(question);
// //     await chapter.save();

// //     const addedQuestion = chapter.questions[chapter.questions.length - 1];
// //     return res.status(201).json({ success: true, message: 'Question added successfully.', question: addedQuestion });
// //   } catch (error) {
// //     console.error('Add question error:', error);
// //     return res.status(500).json({ success: false, error: 'Unable to add question.' });
// //   }
// // });

// // app.patch('/api/chapters/:chapterId/questions/:questionId', async (req, res) => {
// //   try {
// //     const chapter = await getChapter(req.params.chapterId);
// //     if (!chapter) {
// //       return res.status(404).json({ success: false, error: 'Chapter not found.' });
// //     }

// //     const question = chapter.questions.id(req.params.questionId);
// //     if (!question) {
// //       return res.status(404).json({ success: false, error: 'Question not found.' });
// //     }

// //     const updatedQuestion = {
// //       questionText: req.body.questionText !== undefined ? req.body.questionText : question.questionText,
// //       options: req.body.options !== undefined ? req.body.options : question.options,
// //       correctOptionIndex: req.body.correctOptionIndex !== undefined ? req.body.correctOptionIndex : question.correctOptionIndex
// //     };

// //     const validationError = validateQuestion(updatedQuestion);
// //     if (validationError) {
// //       return res.status(400).json({ success: false, error: validationError });
// //     }

// //     question.questionText = updatedQuestion.questionText.trim();
// //     question.options = updatedQuestion.options.map(option => option.trim());
// //     question.correctOptionIndex = updatedQuestion.correctOptionIndex;

// //     if (req.body.sourceEvidence !== undefined) {
// //       question.sourceEvidence = req.body.sourceEvidence;
// //     }

// //     await chapter.save();
// //     return res.json({ success: true, message: 'Question updated successfully.', question });
// //   } catch (error) {
// //     console.error('Edit question error:', error);
// //     return res.status(500).json({ success: false, error: 'Unable to edit question.' });
// //   }
// // });

// // app.delete('/api/chapters/:chapterId/questions/:questionId', async (req, res) => {
// //   try {
// //     const chapter = await getChapter(req.params.chapterId);
// //     if (!chapter) {
// //       return res.status(404).json({ success: false, error: 'Chapter not found.' });
// //     }

// //     const question = chapter.questions.id(req.params.questionId);
// //     if (!question) {
// //       return res.status(404).json({ success: false, error: 'Question not found.' });
// //     }

// //     question.deleteOne();
// //     await chapter.save();

// //     return res.json({ success: true, message: 'Question deleted successfully.' });
// //   } catch (error) {
// //     console.error('Delete question error:', error);
// //     return res.status(500).json({ success: false, error: 'Unable to delete question.' });
// //   }
// // });

// // // --------------------------------------------------
// // // SINGLE-PASS GEMINI PROMPT & GENERATION ROUTE
// // // --------------------------------------------------

// // const SINGLE_PASS_PROMPT = `
// // You are an expert CBSE Class 10 Tamil teacher and board examiner.
// // Read the provided Tamil textbook page images carefully.

// // Generate accurate CBSE Class 10 Tamil பாடல் வினா multiple-choice questions directly supported by the text in the images.

// // STRICT ACCURACY INSTRUCTIONS:
// // - Only generate questions whose answers are explicitly present in the provided text.
// // - Provide exact Tamil phrase from the text in "sourceEvidence" for each question.
// // - Perform strict self-verification to ensure exactly one option is correct and options are plausible.
// // - Generate at most 5-8 high-quality questions.

// // Return ONLY valid JSON in this exact structure:
// // {
// //   "passage": "அசல் பாடல் அல்லது உரையின் வாசிக்கக்கூடிய பகுதி",
// //   "questions": [
// //     {
// //       "questionText": "தமிழில் வினா",
// //       "options": ["விடை ஒன்று", "விடை இரண்டு", "விடை மூன்று", "விடை நான்கு"],
// //       "correctOptionIndex": 0,
// //       "sourceEvidence": "பாடப்பகுதியில் உள்ள ஆதார வரி"
// //     }
// //   ]
// // }
// // `;

// // app.post('/api/chapters/:chapterId/generate', upload.array('images', 6), async (req, res) => {
// //   try {
// //     const chapter = await getChapter(req.params.chapterId);
// //     if (!chapter) {
// //       return res.status(404).json({ success: false, error: 'Chapter not found.' });
// //     }

// //     if (!req.files || req.files.length === 0) {
// //       return res.status(400).json({ success: false, error: 'Upload at least one textbook image.' });
// //     }

// //     console.log('Processing images...');
// //     const imageParts = await prepareImages(req.files);

// //     console.log('Sending single-pass request to Gemini with retry support...');
// //     const generationResponse = await generateWithRetry(ai, {
// //       model: MODEL,
// //       contents: [{
// //         role: 'user',
// //         parts: [{ text: SINGLE_PASS_PROMPT }, ...imageParts]
// //       }],
// //       config: {
// //         responseMimeType: 'application/json',
// //         temperature: 0.1
// //       }
// //     });

// //     const generated = parseGeminiJSON(generationResponse);
// //     if (typeof generated.passage !== 'string' || !Array.isArray(generated.questions)) {
// //       throw new Error('Gemini returned an invalid question structure.');
// //     }

// //     const verifiedQuestions = generated.questions.filter(q => 
// //       !validateQuestion(q) && 
// //       typeof q.sourceEvidence === 'string' && 
// //       q.sourceEvidence.trim().length > 0
// //     );

// //     if (!verifiedQuestions.length) {
// //       return res.status(422).json({ 
// //         success: false, 
// //         error: 'No valid questions could be generated from these pages.', 
// //         savedCount: 0 
// //       });
// //     }

// //     const questionsToSave = verifiedQuestions.map(q => ({
// //       questionText: q.questionText.trim(),
// //       options: q.options.map(o => o.trim()),
// //       correctOptionIndex: q.correctOptionIndex,
// //       sourceEvidence: q.sourceEvidence.trim()
// //     }));

// //     chapter.questions.push(...questionsToSave);
// //     await chapter.save();

// //     const savedQuestions = chapter.questions.slice(-questionsToSave.length);

// //     return res.status(201).json({
// //       success: true,
// //       message: 'Questions generated and saved successfully.',
// //       generatedCount: generated.questions.length,
// //       savedCount: savedQuestions.length,
// //       passage: generated.passage,
// //       questions: savedQuestions,
// //       chapterId: chapter._id,
// //       chapterTitle: chapter.title
// //     });
// //   } catch (error) {
// //     console.error('QUESTION GENERATION ERROR:', error);
// //     return res.status(500).json({ success: false, error: error.message || 'Question generation failed.' });
// //   }
// // });

// // // --------------------------------------------------
// // // ERROR HANDLER & SERVER START
// // // --------------------------------------------------

// // app.use((error, req, res, next) => {
// //   console.error('Request error:', error);
// //   if (error instanceof multer.MulterError) {
// //     if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, error: 'Each image must be smaller than 5 MB.' });
// //     if (error.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ success: false, error: 'Maximum 6 images are allowed per request.' });
// //   }
// //   return res.status(500).json({ success: false, error: error.message || 'Internal server error.' });
// // });

// // const PORT = process.env.PORT || 5000;

// // const startServer = async () => {
// //   try {
// //     await mongoose.connect(process.env.MONGODB_URI);
// //     console.log('MongoDB connected successfully.');
// //     app.listen(PORT, () => {
// //       console.log(`Server running on port ${PORT}`);
// //       console.log(`Gemini model: ${MODEL}`);
// //     });
// //   } catch (error) {
// //     console.error('Database connection failed:', error);
// //     process.exit(1);
// //   }
// // };

// // startServer();



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

// // --------------------------------------------------
// // CONFIGURATION
// // --------------------------------------------------

// const PORT = process.env.PORT || 5000;

// const CLIENT_URL =
//   process.env.CLIENT_URL || 'https://tamil-exam.vercel.app';

// const MODEL =
//   process.env.GEMINI_MODEL || 'gemini-3.8-flash';

// const MAX_IMAGES = 6;
// const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
// const MAX_TOTAL_IMAGE_SIZE = 20 * 1024 * 1024;
// const MAX_QUESTIONS = 8;

// const MAX_REQUESTS_PER_MINUTE = 3;
// const REQUEST_WINDOW = 60 * 1000;
// const MAX_CONCURRENT_GENERATIONS = 2;

// const MAX_RETRIES = 2;

// app.use(express.json({ limit: '2mb' }));

// app.use(cors({
//   origin: CLIENT_URL,
//   methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

// // --------------------------------------------------
// // ENVIRONMENT VALIDATION
// // --------------------------------------------------

// if (!process.env.GEMINI_API_KEY) {
//   throw new Error('GEMINI_API_KEY is missing.');
// }

// if (!process.env.MONGODB_URI) {
//   throw new Error('MONGODB_URI is missing.');
// }

// const ai = new GoogleGenAI({
//   apiKey: process.env.GEMINI_API_KEY
// });

// // --------------------------------------------------
// // APPLICATION USAGE MONITOR
// // --------------------------------------------------

// const usageStats = {
//   totalAttempts: 0,
//   successfulGenerations: 0,
//   failedGenerations: 0,

//   totalImagesProcessed: 0,

//   totalInputTokens: 0,
//   totalOutputTokens: 0,
//   totalTokens: 0,

//   rateLimitErrors: 0,
//   quotaErrors: 0,
//   serverErrors: 0,

//   activeGenerations: 0,

//   totalGenerationTimeMs: 0,

//   lastRequestAt: null,
//   lastSuccessAt: null,
//   lastError: null,

//   startedAt: new Date().toISOString()
// };

// // --------------------------------------------------
// // RATE LIMITER
// // --------------------------------------------------

// const requestHistory = new Map();

// const generationRateLimiter = (req, res, next) => {
//   const ip = req.ip || req.socket.remoteAddress;
//   const now = Date.now();

//   const previous = requestHistory.get(ip) || [];

//   const recent = previous.filter(
//     timestamp => now - timestamp < REQUEST_WINDOW
//   );

//   if (recent.length >= MAX_REQUESTS_PER_MINUTE) {
//     const retryAfterSeconds = Math.ceil(
//       (recent[0] + REQUEST_WINDOW - now) / 1000
//     );

//     return res.status(429).json({
//       success: false,
//       code: 'APP_RATE_LIMIT',
//       error: 'Application rate limit reached.',
//       message: 'Please wait before generating more questions.',
//       retryAfterSeconds
//     });
//   }

//   recent.push(now);
//   requestHistory.set(ip, recent);

//   next();
// };

// const getRateLimitStatus = req => {
//   const ip = req.ip || req.socket.remoteAddress;
//   const now = Date.now();

//   const previous = requestHistory.get(ip) || [];

//   const recent = previous.filter(
//     timestamp => now - timestamp < REQUEST_WINDOW
//   );

//   return {
//     limit: MAX_REQUESTS_PER_MINUTE,
//     used: recent.length,
//     remaining: Math.max(
//       0,
//       MAX_REQUESTS_PER_MINUTE - recent.length
//     ),
//     windowSeconds: REQUEST_WINDOW / 1000
//   };
// };
// // --------------------------------------------------
// // MULTER
// // --------------------------------------------------

// const upload = multer({
//   storage: multer.memoryStorage(),

//   limits: {
//     fileSize: MAX_IMAGE_SIZE,
//     files: MAX_IMAGES
//   },

//   fileFilter: (req, file, cb) => {
//     const allowed = [
//       'image/jpeg',
//       'image/png',
//       'image/webp'
//     ];

//     if (!allowed.includes(file.mimetype)) {
//       return cb(
//         new Error('Only JPG, PNG and WEBP images are supported.')
//       );
//     }

//     cb(null, true);
//   }
// });

// // --------------------------------------------------
// // HELPERS
// // --------------------------------------------------

// const isValidId = id =>
//   mongoose.isValidObjectId(id);

// const getChapter = async id => {
//   if (!isValidId(id)) return null;

//   return Chapter.findById(id);
// };

// const validateQuestion = question => {
//   if (
//     !question ||
//     typeof question.questionText !== 'string' ||
//     !question.questionText.trim()
//   ) {
//     return 'Question text is required.';
//   }

//   if (
//     !Array.isArray(question.options) ||
//     question.options.length !== 4 ||
//     !question.options.every(
//       option =>
//         typeof option === 'string' &&
//         option.trim()
//     )
//   ) {
//     return 'Exactly four non-empty options are required.';
//   }

//   if (
//     !Number.isInteger(question.correctOptionIndex) ||
//     question.correctOptionIndex < 0 ||
//     question.correctOptionIndex > 3
//   ) {
//     return 'Correct option index must be between 0 and 3.';
//   }

//   return null;
// };

// const parseGeminiJSON = response => {
//   const responseText = response.text;

//   if (!responseText) {
//     throw new Error('Gemini returned an empty response.');
//   }

//   try {
//     return JSON.parse(responseText);
//   } catch {
//     console.error('Invalid Gemini JSON:', responseText);

//     throw new Error('Gemini returned invalid JSON.');
//   }
// };

// const sleep = ms =>
//   new Promise(resolve => setTimeout(resolve, ms));

// // --------------------------------------------------
// // GEMINI ERROR DETECTION
// // --------------------------------------------------

// const getGeminiError = error => {
//   const status = Number(
//     error.status ||
//     error.code ||
//     error.response?.status ||
//     0
//   );

//   const message = String(
//     error.message ||
//     error.error?.message ||
//     'Unknown Gemini API error'
//   );

//   const normalized = message.toLowerCase();

//   const isQuotaExceeded =
//     normalized.includes('quota_exceeded') ||
//     normalized.includes('daily quota') ||
//     normalized.includes('per day') ||
//     normalized.includes('daily limit');

//   return {
//     status,
//     message,
//     isQuotaExceeded,
//     isRateLimited: status === 429,
//     isUnavailable: status === 503
//   };
// };

// // --------------------------------------------------
// // GEMINI RETRY HANDLER
// // --------------------------------------------------

// const generateWithRetry = async (
//   aiInstance,
//   payload,
//   retries = MAX_RETRIES
// ) => {
//   for (let attempt = 0; ; attempt++) {
//     try {
//       return await aiInstance.models.generateContent(payload);

//     } catch (error) {
//       const info = getGeminiError(error);

//       // Never retry an identified daily quota exhaustion.

//       if (info.isQuotaExceeded) {
//         throw error;
//       }

//       const retryable =
//         info.isUnavailable ||
//         info.isRateLimited;

//       if (!retryable || attempt >= retries) {
//         throw error;
//       }

//       const delay = Math.min(
//         2000 * Math.pow(2, attempt),
//         10000
//       );

//       console.warn(
//         `Gemini error ${info.status}. Retrying in ${delay}ms.`
//       );

//       await sleep(delay);
//     }
//   }
// };

// // --------------------------------------------------
// // IMAGE PROCESSING
// // --------------------------------------------------

// const prepareImages = async files => {
//   const totalSize = files.reduce(
//     (total, file) => total + file.size,
//     0
//   );

//   if (totalSize > MAX_TOTAL_IMAGE_SIZE) {
//     throw new Error(
//       'Combined image size must be below 20 MB.'
//     );
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
// // HEALTH CHECK
// // --------------------------------------------------

// app.get('/', (req, res) => {
//   res.json({
//     success: true,
//     message: 'Tamil Exam API is running.',
//     model: MODEL
//   });
// });

// app.get('/api/health', (req, res) => {
//   res.json({
//     success: true,
//     server: 'online',
//     database: mongoose.connection.readyState === 1
//       ? 'connected'
//       : 'disconnected',
//     model: MODEL,
//     activeGenerations: usageStats.activeGenerations
//   });
// });

// // --------------------------------------------------
// // USAGE DASHBOARD
// // --------------------------------------------------

// app.get('/api/usage', (req, res) => {
//   const averageTime =
//     usageStats.successfulGenerations > 0
//       ? Math.round(
//           usageStats.totalGenerationTimeMs /
//           usageStats.successfulGenerations
//         )
//       : 0;

//   res.json({
//     success: true,
//     model: MODEL,

//     usage: {
//       ...usageStats,
//       averageGenerationTimeMs: averageTime
//     },

//     limits: {
//       requestsPerMinute: getRateLimitStatus(req),

//       maxConcurrentGenerations:
//         MAX_CONCURRENT_GENERATIONS,

//       activeGenerations:
//         usageStats.activeGenerations,

//       remainingGenerationSlots: Math.max(
//         0,
//         MAX_CONCURRENT_GENERATIONS -
//         usageStats.activeGenerations
//       ),

//       maxImagesPerRequest: MAX_IMAGES,
//       maxQuestionsPerGeneration: MAX_QUESTIONS
//     },

//     geminiQuota: {
//       officialQuotaAvailable: false,
//       message:
//         'Check Google AI Studio for your official Gemini API quota.'
//     }
//   });
// });

// // --------------------------------------------------
// // CHAPTER ROUTES
// // --------------------------------------------------

// app.post('/api/chapters', async (req, res) => {
//   try {
//     const { title, description = '' } = req.body;

//     if (
//       typeof title !== 'string' ||
//       !title.trim()
//     ) {
//       return res.status(400).json({
//         success: false,
//         error: 'Chapter title is required.'
//       });
//     }

//     const chapter = await Chapter.create({
//       title: title.trim(),
//       description:
//         typeof description === 'string'
//           ? description.trim()
//           : ''
//     });

//     return res.status(201).json({
//       success: true,
//       message: 'Chapter created successfully.',
//       chapter
//     });

//   } catch (error) {
//     console.error('Create chapter error:', error);

//     return res.status(500).json({
//       success: false,
//       error: 'Unable to create chapter.'
//     });
//   }
// });

// app.get('/api/chapters', async (req, res) => {
//   try {
//     const chapters = await Chapter.find()
//       .sort({ createdAt: -1 })
//       .select('title description questions createdAt updatedAt');

//     return res.json({
//       success: true,
//       chapters
//     });

//   } catch (error) {
//     console.error('Get chapters error:', error);

//     return res.status(500).json({
//       success: false,
//       error: 'Unable to retrieve chapters.'
//     });
//   }
// });

// app.get('/api/chapters/:chapterId', async (req, res) => {
//   try {
//     const chapter = await getChapter(req.params.chapterId);

//     if (!chapter) {
//       return res.status(404).json({
//         success: false,
//         error: 'Chapter not found.'
//       });
//     }

//     return res.json({
//       success: true,
//       chapter
//     });

//   } catch (error) {
//     console.error('Get chapter error:', error);

//     return res.status(500).json({
//       success: false,
//       error: 'Unable to retrieve chapter.'
//     });
//   }
// });

// app.patch('/api/chapters/:chapterId', async (req, res) => {
//   try {
//     const chapter = await getChapter(req.params.chapterId);

//     if (!chapter) {
//       return res.status(404).json({
//         success: false,
//         error: 'Chapter not found.'
//       });
//     }

//     const { title, description } = req.body;

//     if (title !== undefined) {
//       if (
//         typeof title !== 'string' ||
//         !title.trim()
//       ) {
//         return res.status(400).json({
//           success: false,
//           error: 'Chapter title cannot be empty.'
//         });
//       }

//       chapter.title = title.trim();
//     }

//     if (description !== undefined) {
//       if (typeof description !== 'string') {
//         return res.status(400).json({
//           success: false,
//           error: 'Description must be text.'
//         });
//       }

//       chapter.description = description;
//     }

//     await chapter.save();

//     return res.json({
//       success: true,
//       message: 'Chapter updated successfully.',
//       chapter
//     });

//   } catch (error) {
//     console.error('Update chapter error:', error);

//     return res.status(500).json({
//       success: false,
//       error: 'Unable to update chapter.'
//     });
//   }
// });

// app.delete('/api/chapters/:chapterId', async (req, res) => {
//   try {
//     const chapter = await getChapter(req.params.chapterId);

//     if (!chapter) {
//       return res.status(404).json({
//         success: false,
//         error: 'Chapter not found.'
//       });
//     }

//     await Chapter.findByIdAndDelete(chapter._id);

//     return res.json({
//       success: true,
//       message: 'Chapter and all its questions deleted successfully.'
//     });

//   } catch (error) {
//     console.error('Delete chapter error:', error);

//     return res.status(500).json({
//       success: false,
//       error: 'Unable to delete chapter.'
//     });
//   }
// });

// // --------------------------------------------------
// // QUESTION ROUTES
// // --------------------------------------------------

// app.post('/api/chapters/:chapterId/questions', async (req, res) => {
//   try {
//     const chapter = await getChapter(req.params.chapterId);

//     if (!chapter) {
//       return res.status(404).json({
//         success: false,
//         error: 'Chapter not found.'
//       });
//     }

//     const question = {
//       questionText: req.body.questionText,
//       options: req.body.options,
//       correctOptionIndex: req.body.correctOptionIndex,
//       sourceEvidence: req.body.sourceEvidence || ''
//     };

//     const validationError = validateQuestion(question);

//     if (validationError) {
//       return res.status(400).json({
//         success: false,
//         error: validationError
//       });
//     }

//     chapter.questions.push(question);

//     await chapter.save();

//     const addedQuestion =
//       chapter.questions[chapter.questions.length - 1];

//     return res.status(201).json({
//       success: true,
//       message: 'Question added successfully.',
//       question: addedQuestion
//     });

//   } catch (error) {
//     console.error('Add question error:', error);

//     return res.status(500).json({
//       success: false,
//       error: 'Unable to add question.'
//     });
//   }
// });

// app.patch(
//   '/api/chapters/:chapterId/questions/:questionId',
//   async (req, res) => {
//     try {
//       const chapter = await getChapter(req.params.chapterId);

//       if (!chapter) {
//         return res.status(404).json({
//           success: false,
//           error: 'Chapter not found.'
//         });
//       }

//       const question = chapter.questions.id(
//         req.params.questionId
//       );

//       if (!question) {
//         return res.status(404).json({
//           success: false,
//           error: 'Question not found.'
//         });
//       }

//       const updatedQuestion = {
//         questionText:
//           req.body.questionText !== undefined
//             ? req.body.questionText
//             : question.questionText,

//         options:
//           req.body.options !== undefined
//             ? req.body.options
//             : question.options,

//         correctOptionIndex:
//           req.body.correctOptionIndex !== undefined
//             ? req.body.correctOptionIndex
//             : question.correctOptionIndex
//       };

//       const validationError =
//         validateQuestion(updatedQuestion);

//       if (validationError) {
//         return res.status(400).json({
//           success: false,
//           error: validationError
//         });
//       }

//       question.questionText =
//         updatedQuestion.questionText.trim();

//       question.options =
//         updatedQuestion.options.map(option => option.trim());

//       question.correctOptionIndex =
//         updatedQuestion.correctOptionIndex;

//       if (req.body.sourceEvidence !== undefined) {
//         question.sourceEvidence = req.body.sourceEvidence;
//       }

//       await chapter.save();

//       return res.json({
//         success: true,
//         message: 'Question updated successfully.',
//         question
//       });

//     } catch (error) {
//       console.error('Edit question error:', error);

//       return res.status(500).json({
//         success: false,
//         error: 'Unable to edit question.'
//       });
//     }
//   }
// );

// app.delete(
//   '/api/chapters/:chapterId/questions/:questionId',
//   async (req, res) => {
//     try {
//       const chapter = await getChapter(req.params.chapterId);

//       if (!chapter) {
//         return res.status(404).json({
//           success: false,
//           error: 'Chapter not found.'
//         });
//       }

//       const question = chapter.questions.id(
//         req.params.questionId
//       );

//       if (!question) {
//         return res.status(404).json({
//           success: false,
//           error: 'Question not found.'
//         });
//       }

//       question.deleteOne();

//       await chapter.save();

//       return res.json({
//         success: true,
//         message: 'Question deleted successfully.'
//       });

//     } catch (error) {
//       console.error('Delete question error:', error);

//       return res.status(500).json({
//         success: false,
//         error: 'Unable to delete question.'
//       });
//     }
//   }
// );

// // --------------------------------------------------
// // GEMINI PROMPT
// // --------------------------------------------------

// const SINGLE_PASS_PROMPT = `
// You are an expert CBSE Class 10 Tamil teacher and board examiner.

// Read all the provided Tamil textbook page images carefully.

// Generate accurate CBSE Class 10 Tamil பாடல் வினா multiple-choice questions directly supported by the textbook content.

// STRICT ACCURACY INSTRUCTIONS:

// 1. Generate questions ONLY from the provided textbook images.
// 2. Never invent information.
// 3. Only ask questions whose answers are explicitly supported by the text.
// 4. Provide exact Tamil sourceEvidence for every question.
// 5. Each question must have exactly four Tamil options.
// 6. Exactly one option must be correct.
// 7. Make the incorrect options plausible but clearly incorrect.
// 8. Do not generate questions from unreadable text.
// 9. Avoid duplicate questions.
// 10. Generate a maximum of 8 high-quality questions.
// 11. Use correct Tamil spelling and grammar.
// 12. Do not introduce outside textbook knowledge.

// Return ONLY valid JSON in this exact structure:

// {
//   "passage": "அசல் பாடல் அல்லது உரையின் வாசிக்கக்கூடிய பகுதி",
//   "questions": [
//     {
//       "questionText": "தமிழில் வினா",
//       "options": [
//         "விடை ஒன்று",
//         "விடை இரண்டு",
//         "விடை மூன்று",
//         "விடை நான்கு"
//       ],
//       "correctOptionIndex": 0,
//       "sourceEvidence": "பாடப்பகுதியில் உள்ள ஆதார வரி"
//     }
//   ]
// }

// If no reliable questions can be generated, return an empty questions array.
// `;

// // --------------------------------------------------
// // QUESTION GENERATION ROUTE
// // --------------------------------------------------

// app.post(
//   '/api/chapters/:chapterId/generate',
//   generationRateLimiter,
//   upload.array('images', MAX_IMAGES),

//   async (req, res) => {

//     let acquiredSlot = false;
//     const requestStartedAt = Date.now();

//     usageStats.totalAttempts++;
//     usageStats.lastRequestAt =
//       new Date().toISOString();

//     try {

//       // Concurrency protection

//       if (
//         usageStats.activeGenerations >=
//         MAX_CONCURRENT_GENERATIONS
//       ) {
//         usageStats.failedGenerations++;

//         return res.status(503).json({
//           success: false,
//           code: 'APP_BUSY',
//           error: 'Generation service is busy.',
//           message: 'Please try again shortly.'
//         });
//       }

//       usageStats.activeGenerations++;
//       acquiredSlot = true;

//       // Find chapter

//       const chapter = await getChapter(
//         req.params.chapterId
//       );

//       if (!chapter) {
//         usageStats.failedGenerations++;

//         return res.status(404).json({
//           success: false,
//           code: 'CHAPTER_NOT_FOUND',
//           error: 'Chapter not found.'
//         });
//       }

//       // Validate uploaded images

//       if (!req.files || req.files.length === 0) {
//         usageStats.failedGenerations++;

//         return res.status(400).json({
//           success: false,
//           code: 'NO_IMAGES',
//           error: 'Upload at least one textbook image.'
//         });
//       }

//       // Compress images

//       console.log('Processing textbook images...');

//       const imageParts = await prepareImages(req.files);

//       usageStats.totalImagesProcessed +=
//         req.files.length;

//       // Send request to Gemini

//       console.log(
//         `Sending request to Gemini model: ${MODEL}`
//       );

//       const generationResponse = await generateWithRetry(
//         ai,
//         {
//           model: MODEL,

//           contents: [{
//             role: 'user',

//             parts: [
//               { text: SINGLE_PASS_PROMPT },
//               ...imageParts
//             ]
//           }],

//           config: {
//             responseMimeType: 'application/json',
//             temperature: 0.1,
//             maxOutputTokens: 2500
//           }
//         }
//       );

//       // Record token usage

//       const metadata =
//         generationResponse.usageMetadata || {};

//       const inputTokens =
//         metadata.promptTokenCount || 0;

//       const outputTokens =
//         metadata.candidatesTokenCount || 0;

//       const totalTokens =
//         metadata.totalTokenCount ||
//         inputTokens + outputTokens;

//       usageStats.totalInputTokens += inputTokens;
//       usageStats.totalOutputTokens += outputTokens;
//       usageStats.totalTokens += totalTokens;

//       // Parse JSON

//       const generated =
//         parseGeminiJSON(generationResponse);

//       if (
//         typeof generated.passage !== 'string' ||
//         !Array.isArray(generated.questions)
//       ) {
//         throw new Error(
//           'Gemini returned an invalid question structure.'
//         );
//       }

//       // Validate questions

//       const verifiedQuestions =
//         generated.questions
//           .filter(question =>
//             !validateQuestion(question) &&
//             typeof question.sourceEvidence === 'string' &&
//             question.sourceEvidence.trim().length > 0
//           )
//           .slice(0, MAX_QUESTIONS);

//       if (verifiedQuestions.length === 0) {
//         usageStats.failedGenerations++;

//         return res.status(422).json({
//           success: false,
//           code: 'NO_VALID_QUESTIONS',
//           error: 'No valid questions could be generated.',
//           savedCount: 0
//         });
//       }

//       // Prepare questions for MongoDB

//       const questionsToSave =
//         verifiedQuestions.map(question => ({
//           questionText: question.questionText.trim(),

//           options: question.options.map(
//             option => option.trim()
//           ),

//           correctOptionIndex:
//             question.correctOptionIndex,

//           sourceEvidence:
//             question.sourceEvidence.trim()
//         }));

//       // Save questions

//       chapter.questions.push(...questionsToSave);

//       await chapter.save();

//       const savedQuestions =
//         chapter.questions.slice(
//           -questionsToSave.length
//         );

//       // Update statistics

//       const generationTimeMs =
//         Date.now() - requestStartedAt;

//       usageStats.successfulGenerations++;

//       usageStats.lastSuccessAt =
//         new Date().toISOString();

//       usageStats.totalGenerationTimeMs +=
//         generationTimeMs;

//       console.log(
//         `Successfully saved ${savedQuestions.length} questions.`
//       );

//       // Success response

//       return res.status(201).json({
//         success: true,

//         message:
//           'Questions generated and saved successfully.',

//         generatedCount:
//           generated.questions.length,

//         savedCount:
//           savedQuestions.length,

//         passage:
//           generated.passage,

//         questions:
//           savedQuestions,

//         chapterId:
//           chapter._id,

//         chapterTitle:
//           chapter.title,

//         usage: {
//           inputTokens,
//           outputTokens,
//           totalTokens,
//           generationTimeMs
//         }
//       });

//     } catch (error) {

//       console.error(
//         'QUESTION GENERATION ERROR:',
//         error
//       );

//       usageStats.failedGenerations++;

//       const info = getGeminiError(error);

//       if (info.status === 429) {
//         usageStats.rateLimitErrors++;

//         if (info.isQuotaExceeded) {
//           usageStats.quotaErrors++;
//         }
//       }

//       if (
//         info.status === 503 ||
//         info.status >= 500
//       ) {
//         usageStats.serverErrors++;
//       }

//       usageStats.lastError = {
//         message: info.message,
//         status: info.status,
//         at: new Date().toISOString()
//       };

//       if (info.isQuotaExceeded) {
//         return res.status(429).json({
//           success: false,
//           code: 'GEMINI_QUOTA_EXHAUSTED',
//           error: 'Gemini API quota exhausted.',
//           message:
//             'Please check your Google AI Studio quota.'
//         });
//       }

//       if (info.isRateLimited) {
//         return res.status(429).json({
//           success: false,
//           code: 'GEMINI_RATE_LIMIT',
//           error: 'Gemini rate limit reached.',
//           message:
//             'Too many API requests. Please wait before trying again.'
//         });
//       }

//       if (info.isUnavailable) {
//         return res.status(503).json({
//           success: false,
//           code: 'GEMINI_UNAVAILABLE',
//           error: 'Gemini is temporarily unavailable.',
//           message:
//             'Please try again shortly.'
//         });
//       }

//       return res.status(500).json({
//         success: false,
//         code: 'GENERATION_FAILED',
//         error: 'Question generation failed.',
//         message: info.message
//       });

//     } finally {

//       if (acquiredSlot) {
//         usageStats.activeGenerations--;
//       }

//     }
//   }
// );

// // --------------------------------------------------
// // GLOBAL ERROR HANDLER
// // --------------------------------------------------

// app.use((error, req, res, next) => {

//   console.error('Request error:', error);

//   if (error instanceof multer.MulterError) {

//     if (error.code === 'LIMIT_FILE_SIZE') {
//       return res.status(400).json({
//         success: false,
//         code: 'FILE_TOO_LARGE',
//         error: 'Each image must be smaller than 5 MB.'
//       });
//     }

//     if (error.code === 'LIMIT_FILE_COUNT') {
//       return res.status(400).json({
//         success: false,
//         code: 'TOO_MANY_FILES',
//         error: 'Maximum 6 images are allowed.'
//       });
//     }
//   }

//   return res.status(400).json({
//     success: false,
//     error: error.message || 'Request failed.'
//   });
// });

// // --------------------------------------------------
// // DATABASE & SERVER START
// // --------------------------------------------------

// const startServer = async () => {

//   try {

//     await mongoose.connect(
//       process.env.MONGODB_URI
//     );

//     console.log('MongoDB connected successfully.');

//     app.listen(PORT, () => {

//       console.log(`Server running on port ${PORT}`);

//       console.log(`Gemini model: ${MODEL}`);

//       console.log('Usage monitoring: /api/usage');

//       console.log('Health monitoring: /api/health');

//     });

//   } catch (error) {

//     console.error(
//       'Database connection failed:',
//       error
//     );

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

const MAX_REQUESTS_PER_MINUTE = 3;
const REQUEST_WINDOW = 60 * 1000;
const MAX_CONCURRENT_GENERATIONS = 2;

const MAX_RETRIES = 2;
const MAX_OUTPUT_TOKENS = 8192;

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
// GENERAL HELPERS
// --------------------------------------------------

const isValidId = id =>
  mongoose.isValidObjectId(id);

const getChapter = async id => {
  if (!isValidId(id)) return null;

  return Chapter.findById(id);
};

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

// --------------------------------------------------
// QUESTION VALIDATION
// --------------------------------------------------

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

// --------------------------------------------------
// JSON PARSING
// --------------------------------------------------

const parseGeminiJSON = response => {
  const responseText = response.text;

  if (!responseText) {
    throw new Error('Gemini returned an empty response.');
  }

  try {
    return JSON.parse(responseText);
  } catch {
    // Handle accidental Markdown fences.
    const cleaned = responseText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      console.error(
        'Gemini returned invalid JSON:',
        responseText
      );

      throw new Error('Gemini returned invalid JSON.');
    }
  }
};

// --------------------------------------------------
// DUPLICATE DETECTION
// --------------------------------------------------

const normalizeText = value =>
  String(value || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[.,!?;:'"“”‘’()[\]{}<>«»]/g, '')
    .replace(/\s+/g, '')
    .trim();

const isDuplicateQuestion = (question, existingQuestions) => {
  const newQuestion = normalizeText(question.questionText);

  if (!newQuestion) return true;

  return existingQuestions.some(existing => {
    const oldQuestion = normalizeText(
      existing.questionText
    );

    return oldQuestion === newQuestion;
  });
};

// --------------------------------------------------
// SOURCE EVIDENCE VALIDATION
// --------------------------------------------------

const normalizeEvidence = value =>
  String(value || '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();

const hasPassageEvidence = (passage, evidence) => {
  const normalizedPassage = normalizeEvidence(passage);
  const normalizedEvidence = normalizeEvidence(evidence);

  return Boolean(
    normalizedEvidence &&
    normalizedPassage.includes(normalizedEvidence)
  );
};

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

  for (let index = 0; index < files.length; index++) {
    const file = files[index];

    const compressedBuffer = await sharp(file.buffer)
      .rotate()
      .resize({
        width: 2200,
        height: 2200,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    imageParts.push({
      pageNumber: index + 1,

      imagePart: {
        inlineData: {
          data: compressedBuffer.toString('base64'),
          mimeType: 'image/jpeg'
        }
      }
    });
  }

  return imageParts;
};

// --------------------------------------------------
// GEMINI PROMPT
// --------------------------------------------------

const createPagePrompt = pageNumber => `
You are an experienced CBSE Class 10 Tamil teacher,
Tamil textbook specialist, and board-examination question setter.

TASK:
Read the ENTIRE uploaded Tamil textbook page carefully.

This is page ${pageNumber} of the uploaded textbook material.

Your task is to identify and generate EVERY DISTINCT,
VALID, EXAM-WORTHY multiple-choice question that can be
created from the readable content on THIS PAGE.

IMPORTANT:
There is NO fixed question count.

Do not stop after 5 or 10 questions.
Do not artificially limit the number of questions.
Generate as many different valid questions as the page supports.

Read every readable part of the page, including:

- Poem lines
- Poet and author names
- Literary references
- Word meanings
- Explanations
- Central ideas
- Events and facts
- Names and places
- Important expressions
- Literary concepts
- Explicitly stated information
- Details in notes and side sections

SOURCE RULES:

1. Use ONLY information visibly present in the uploaded image.
2. Do not use outside knowledge, memory, websites or assumptions.
3. Never invent a poet, author, title, line, meaning or fact.
4. Every correct answer must be directly supported by the image.
5. Do not create questions from blurred, cropped or unreadable text.
6. Do not ask the same fact in different wording.
7. Use correct, natural Tamil spelling and grammar.
8. Questions must be suitable for CBSE Class 10 Tamil.
9. Each question must have exactly FOUR meaningful Tamil options.
10. Exactly ONE option must be correct.
11. The other three options must be plausible but clearly incorrect.
12. Do not use "all of the above" or "none of the above".
13. Do not make the correct answer noticeably longer than the others.
14. Do not create vague or ambiguous questions.
15. Do not generate questions that require outside literary knowledge.
16. Cover different testable details throughout the page.
17. Do not ignore the bottom or side portions of the image.
18. Do not generate duplicate questions.
19. Generate fewer questions only when the page genuinely
    contains fewer distinct, clearly readable facts.
20. Accuracy is more important than quantity.

QUESTION TYPES TO CONSIDER:

- யார்?
- எது?
- எங்கு?
- எப்போது?
- எதனால்?
- எவ்வாறு?
- பொருள் தருக
- சரியான கூற்றைத் தேர்ந்தெடுக்க
- தவறான கூற்றைத் தேர்ந்தெடுக்க
- ஆசிரியர் / கவிஞர் தொடர்பான வினாக்கள்
- பாடல் வரி தொடர்பான வினாக்கள்
- இலக்கியக் குறிப்புகள்
- கருத்து மற்றும் விளக்கம் தொடர்பான வினாக்கள்

Do not force every question type. Use only those supported by the page.

SOURCE EVIDENCE:

For every question, provide sourceEvidence.

sourceEvidence must be an exact, continuous Tamil quotation
copied from the readable text in the image.

Do not paraphrase it.
Do not translate it.
Do not invent missing words.

The exact sourceEvidence must also appear in the returned passage.

PASSAGE:

The passage must contain the readable Tamil textbook text
from this page as accurately as possible.

Do not reconstruct missing words.
Do not invent connecting sentences.
Do not add outside explanations.

OUTPUT:

Return ONLY valid JSON.
Do not use Markdown code fences.
Do not add explanations outside JSON.

Use this exact structure:

{
  "passage": "Readable Tamil source text copied from this page",
  "questions": [
    {
      "questionText": "தமிழில் வினா",
      "options": [
        "முதல் விடை",
        "இரண்டாம் விடை",
        "மூன்றாம் விடை",
        "நான்காம் விடை"
      ],
      "correctOptionIndex": 0,
      "sourceEvidence": "பாடப்பகுதியில் இருந்து அப்படியே எடுக்கப்பட்ட ஆதார வரி"
    }
  ]
}

If the image has no readable testable information, return:

{
  "passage": "",
  "questions": []
}
`;

// --------------------------------------------------
// PROCESS ONE IMAGE AT A TIME
// --------------------------------------------------

const generateQuestionsForPage = async (
  page,
  pageIndex
) => {
  console.log(
    `Generating questions from page ${page.pageNumber}...`
  );

  const response = await generateWithRetry(ai, {
    model: MODEL,

    contents: [{
      role: 'user',

      parts: [
        {
          text: createPagePrompt(page.pageNumber)
        },
        page.imagePart
      ]
    }],

    config: {
      responseMimeType: 'application/json',
      temperature: 0.1,
      maxOutputTokens: MAX_OUTPUT_TOKENS
    }
  });

  const metadata = response.usageMetadata || {};

  const usage = {
    inputTokens: metadata.promptTokenCount || 0,
    outputTokens: metadata.candidatesTokenCount || 0,
    totalTokens: metadata.totalTokenCount ||
      (metadata.promptTokenCount || 0) +
      (metadata.candidatesTokenCount || 0)
  };

  const generated = parseGeminiJSON(response);

  if (
    typeof generated.passage !== 'string' ||
    !Array.isArray(generated.questions)
  ) {
    throw new Error(
      `Gemini returned an invalid response for page ${page.pageNumber}.`
    );
  }

  console.log(
    `Page ${page.pageNumber}: Gemini generated ${generated.questions.length} question(s).`
  );

  return {
    pageNumber: page.pageNumber,
    passage: generated.passage,
    questions: generated.questions,
    usage
  };
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

      // No fixed question limit.
      maxQuestionsPerGeneration: null,

      generationMode: 'one Gemini request per image'
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

app.delete('/api/chapters/:chapterId/questions', async (req, res) => {
  try {
    const chapter = await getChapter(req.params.chapterId);

    if (!chapter) {
      return res.status(404).json({
        success: false,
        error: 'Chapter not found.'
      });
    }

    const deletedCount = chapter.questions.length;

    chapter.questions = [];

    await chapter.save();

    return res.json({
      success: true,
      message: 'All questions deleted successfully.',
      deletedCount
    });

  } catch (error) {
    console.error('Delete all questions error:', error);

    return res.status(500).json({
      success: false,
      error: 'Unable to delete questions.'
    });
  }
});

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
      // Concurrency protection.

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

      // Find chapter.

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

      // Validate images.

      if (!req.files || req.files.length === 0) {
        usageStats.failedGenerations++;

        return res.status(400).json({
          success: false,
          code: 'NO_IMAGES',
          error: 'Upload at least one textbook image.'
        });
      }

      console.log(
        `Starting generation for ${req.files.length} image(s)...`
      );

      // Prepare all images.

      const pages = await prepareImages(req.files);

      usageStats.totalImagesProcessed += pages.length;

      // Accumulate all page results.

      const allGeneratedQuestions = [];
      const allPassages = [];

      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalTokens = 0;

      let successfulPages = 0;
      let failedPages = 0;

      // IMPORTANT:
      // Process every image separately.
      // No question-count limit is applied.

      for (let index = 0; index < pages.length; index++) {
        const page = pages[index];

        try {
          const result = await generateQuestionsForPage(
            page,
            index
          );

          successfulPages++;

          if (result.passage.trim()) {
            allPassages.push({
              pageNumber: result.pageNumber,
              passage: result.passage.trim()
            });
          }

          totalInputTokens += result.usage.inputTokens;
          totalOutputTokens += result.usage.outputTokens;
          totalTokens += result.usage.totalTokens;

          // Validate every question from this page.

          for (const question of result.questions) {
            const validationError =
              validateQuestion(question);

            if (validationError) {
              console.warn(
                `Rejected question from page ${page.pageNumber}:`,
                validationError
              );

              continue;
            }

            if (
              typeof question.sourceEvidence !== 'string' ||
              !question.sourceEvidence.trim()
            ) {
              console.warn(
                `Rejected question from page ${page.pageNumber}: missing evidence.`
              );

              continue;
            }

            if (
              !hasPassageEvidence(
                result.passage,
                question.sourceEvidence
              )
            ) {
              console.warn(
                `Rejected question from page ${page.pageNumber}: evidence not found in passage.`
              );

              continue;
            }

            allGeneratedQuestions.push({
              questionText: question.questionText.trim(),

              options: question.options.map(
                option => option.trim()
              ),

              correctOptionIndex:
                question.correctOptionIndex,

              sourceEvidence:
                question.sourceEvidence.trim(),

              pageNumber: page.pageNumber
            });
          }

          console.log(
            `Page ${page.pageNumber} completed. Valid questions collected: ${allGeneratedQuestions.length}`
          );

        } catch (pageError) {
          failedPages++;

          console.error(
            `Failed to process page ${page.pageNumber}:`,
            pageError
          );

          // Continue with the remaining pages.
          // One failed image must not stop the other images.
        }
      }

      // Record token usage.

      usageStats.totalInputTokens += totalInputTokens;
      usageStats.totalOutputTokens += totalOutputTokens;
      usageStats.totalTokens += totalTokens;

      // If every page failed, return an error.

      if (successfulPages === 0) {
        usageStats.failedGenerations++;

        return res.status(503).json({
          success: false,
          code: 'ALL_PAGES_FAILED',
          error: 'Unable to process the uploaded images.',
          message:
            'Gemini could not process any of the uploaded pages. Please try again.'
        });
      }

      // Remove duplicates within this generation
      // and against questions already saved in the chapter.

      const uniqueQuestions = [];
      const duplicateCheck = [
        ...(chapter.questions || []).map(question => ({
          questionText: question.questionText
        }))
      ];

      for (const question of allGeneratedQuestions) {
        if (
          isDuplicateQuestion(
            question,
            duplicateCheck
          )
        ) {
          continue;
        }

        uniqueQuestions.push(question);

        duplicateCheck.push({
          questionText: question.questionText
        });
      }

      // If no valid new questions remain.

      if (uniqueQuestions.length === 0) {
        usageStats.failedGenerations++;

        return res.status(422).json({
          success: false,
          code: 'NO_NEW_VALID_QUESTIONS',
          error: 'No new valid questions were generated.',
          message:
            'The images were processed, but no new questions passed validation or all generated questions were already present in this chapter.',

          imagesProcessed: pages.length,
          successfulPages,
          failedPages,

          generatedCount: allGeneratedQuestions.length,
          duplicateCount:
            allGeneratedQuestions.length,
          savedCount: 0,

          usage: {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            totalTokens
          }
        });
      }

      // Remove internal pageNumber before saving.
      // Keep the original Chapter question structure.

      const questionsToSave = uniqueQuestions.map(question => ({
        questionText: question.questionText,
        options: question.options,
        correctOptionIndex: question.correctOptionIndex,
        sourceEvidence: question.sourceEvidence
      }));

      // Save every valid question.

      chapter.questions.push(...questionsToSave);

      await chapter.save();

      const savedQuestions =
        chapter.questions.slice(
          -questionsToSave.length
        );

      // Update usage statistics.

      const generationTimeMs =
        Date.now() - requestStartedAt;

      usageStats.successfulGenerations++;

      usageStats.lastSuccessAt =
        new Date().toISOString();

      usageStats.totalGenerationTimeMs +=
        generationTimeMs;

      console.log(
        `Generation completed. Images: ${pages.length}, valid questions: ${allGeneratedQuestions.length}, unique questions saved: ${savedQuestions.length}`
      );

      // Return results.

      return res.status(201).json({
        success: true,

        message:
          'Questions generated and saved successfully.',

        imagesProcessed: pages.length,
        successfulPages,
        failedPages,

        generatedCount:
          allGeneratedQuestions.length,

        savedCount:
          savedQuestions.length,

        duplicateCount:
          allGeneratedQuestions.length -
          uniqueQuestions.length,

        passage:
          allPassages
            .map(item =>
              `Page ${item.pageNumber}\n${item.passage}`
            )
            .join('\n\n'),

        passages: allPassages,

        questions:
          savedQuestions,

        chapterId:
          chapter._id,

        chapterTitle:
          chapter.title,

        usage: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
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
      console.log('Generation mode: one request per image');
      console.log('Question count: no fixed limit');
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
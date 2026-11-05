
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
  origin: process.env.CLIENT_URL || 'http://localhost:5173' || "https://tamil-exam.vercel.app/"
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

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// --------------------------------------------------
// MULTER
// --------------------------------------------------

// Maximum 6 images per request.
// Each image must be below 5 MB.
// Total request image size is additionally limited to 20 MB.

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 6
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

const isValidId = id => mongoose.isValidObjectId(id);

const getChapter = async (id) => {
  if (!isValidId(id)) return null;

  return Chapter.findById(id);
};

const validateQuestion = (question) => {
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
      option => typeof option === 'string' && option.trim()
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

// Convert uploaded images to smaller, normalized JPEG images.
// This reduces memory use and request size.

const prepareImages = async (files) => {
  const totalSize = files.reduce(
    (total, file) => total + file.size,
    0
  );

  if (totalSize > 20 * 1024 * 1024) {
    throw new Error(
      'The combined image size must be below 20 MB. Upload fewer or smaller images.'
    );
  }

  const imageParts = [];

  for (const file of files) {
    const compressedBuffer = await sharp(file.buffer)
      .rotate()
      .resize({
        width: 2200,
        height: 2200,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 92,
        mozjpeg: true
      })
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

// CREATE CHAPTER

app.post('/api/chapters', async (req, res) => {
  try {
    const { title, description = '' } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Chapter title is required.'
      });
    }

    const chapter = await Chapter.create({
      title: title.trim(),
      description: description.trim()
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

// GET ALL CHAPTERS

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

// GET ONE CHAPTER WITH QUESTIONS

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

// EDIT CHAPTER TITLE / DESCRIPTION

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
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Chapter title cannot be empty.'
        });
      }

      chapter.title = title.trim();
    }

    if (description !== undefined) {
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

// DELETE ENTIRE CHAPTER

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

// ADD ONE QUESTION MANUALLY

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

    const addedQuestion = chapter.questions[
      chapter.questions.length - 1
    ];

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

// EDIT ONE QUESTION, INCLUDING ALL FOUR OPTIONS

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

      const question = chapter.questions.id(req.params.questionId);

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

      const validationError = validateQuestion(updatedQuestion);

      if (validationError) {
        return res.status(400).json({
          success: false,
          error: validationError
        });
      }

      question.questionText = updatedQuestion.questionText.trim();

      question.options = updatedQuestion.options.map(
        option => option.trim()
      );

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

// DELETE ONE QUESTION

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

      const question = chapter.questions.id(req.params.questionId);

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

// DELETE ALL QUESTIONS IN ONE CHAPTER

app.delete(
  '/api/chapters/:chapterId/questions',
  async (req, res) => {
    try {
      const chapter = await getChapter(req.params.chapterId);

      if (!chapter) {
        return res.status(404).json({
          success: false,
          error: 'Chapter not found.'
        });
      }

      chapter.questions = [];

      await chapter.save();

      return res.json({
        success: true,
        message: 'All questions in this chapter were deleted.'
      });

    } catch (error) {
      console.error('Delete all questions error:', error);

      return res.status(500).json({
        success: false,
        error: 'Unable to delete questions.'
      });
    }
  }
);

// --------------------------------------------------
// GEMINI PROMPT
// --------------------------------------------------

const GENERATION_PROMPT = `
You are an expert CBSE Class 10 Tamil teacher,
Tamil textbook researcher and board examination question setter.

IMPORTANT:
You are preparing questions specifically for
CBSE Class 10 Tamil பாடல் வினா.

The user has supplied multiple images from a Tamil textbook.

Treat ALL uploaded images as consecutive textbook pages,
in the exact order in which they were supplied.

READ THE TEXTBOOK CAREFULLY BEFORE WRITING QUESTIONS.

TEXTBOOK REFERENCE RULES:

1. Carefully inspect every uploaded page.
2. Read the Tamil text directly from the textbook images.
3. Use the textbook's actual poem, lines, words and meanings.
4. Do not substitute your own poem or an unrelated poem.
5. Do not invent lines, poet names, meanings or literary details.
6. Preserve the original Tamil words and spelling when extracting text.
7. Consider the pages together. A poem may continue across multiple images.
8. Use the actual textbook content as the authority.
9. Do not rely on general knowledge when the answer must come from the poem.
10. If a line is unreadable, do not guess it.

QUESTION STYLE:

Generate original questions in the style of CBSE Class 10
Tamil Board Examination பாடல் வினா.

Questions should examine:
- பாடலின் பொருள்
- பாடலின் மையக்கருத்து
- அடிகளின் பொருள்
- கவிஞரின் நோக்கம்
- சொற்பொருள்
- பாடலில் கூறப்படும் செய்திகள்
- உவமை, உருவகம் and other literary features
  only when they are actually present.
- Understanding of the poem and its ideas.

QUESTION QUALITY:

1. Generate only questions that can be answered from the supplied pages.
2. Use formal, grammatically correct Tamil.
3. Questions must be suitable for Class 10 board examination preparation.
4. Every question must have exactly four options.
5. All four options must be meaningful and plausible.
6. Exactly one option must be correct.
7. Incorrect options must be clearly incorrect according to the textbook.
8. Do not repeat questions.
9. Avoid overly simple or unrelated questions.
10. Do not create questions merely to increase the count.
11. Prefer fewer accurate questions over many doubtful questions.
12. Generate at most 10 questions for one batch of images.

TEXTBOOK EVIDENCE:

For every question, include a sourceEvidence field.
This must contain a short exact Tamil phrase or line from the uploaded pages
that supports the correct answer.

Do not invent sourceEvidence.

OPTION RULES:

Options must be in Tamil.
Shuffle their order.
correctOptionIndex must identify the correct option AFTER shuffling.

OUTPUT:

Return ONLY valid JSON.

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

If the images are unreadable, return an empty passage and an empty questions array.

ACCURACY IS MORE IMPORTANT THAN QUESTION COUNT.
`;

// --------------------------------------------------
// GEMINI QUESTION VALIDATION
// --------------------------------------------------

const VERIFICATION_PROMPT = `
You are an independent CBSE Class 10 Tamil textbook examiner.

You are given:
1. The original Tamil textbook page images.
2. Questions generated from those images.

Your job is to VERIFY each question against the actual textbook images.

Do not trust the generated questions automatically.

For each question, independently check:

1. Does the question relate to the actual textbook content?
2. Is the question grammatically correct Tamil?
3. Is the correct answer actually supported by the textbook?
4. Does sourceEvidence really appear in the textbook?
5. Does sourceEvidence support the selected answer?
6. Are all four options valid?
7. Is there exactly one correct answer?
8. Is the question suitable for CBSE Class 10 Tamil பாடல் வினா?

Reject a question if:
- It contains an invented fact.
- Its answer is not supported by the textbook.
- Its sourceEvidence is incorrect or unrelated.
- The question misunderstands the poem.
- More than one option could be correct.
- It is unrelated to the uploaded pages.
- Its Tamil wording is unclear or incorrect.

Do not repair or rewrite questions.
Only identify questions that are clearly correct.

Return ONLY valid JSON in this format:

{
  "approvedQuestionIndexes": [0, 2, 3]
}

Indexes refer to the original question array, starting from zero.

If no question is confidently correct, return an empty array.
`;

// --------------------------------------------------
// GENERATE QUESTIONS FROM MULTIPLE IMAGES
// AND SAVE THEM TO A CHAPTER
// --------------------------------------------------

app.post(
  '/api/chapters/:chapterId/generate',
  upload.array('images', 6),
  async (req, res) => {
    try {
      const chapter = await getChapter(req.params.chapterId);

      if (!chapter) {
        return res.status(404).json({
          success: false,
          error: 'Chapter not found.'
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Upload at least one textbook image.'
        });
      }

      console.log('===================================');
      console.log('MULTI-IMAGE MCQ GENERATION');
      console.log('Chapter:', chapter.title);
      console.log('Images:', req.files.length);
      console.log('===================================');

      // Prepare every image for one Gemini request.
      const imageParts = await prepareImages(req.files);

      console.log('Images compressed successfully.');

      // STEP 1: Generate questions from ALL images together.

      const generationResponse = await ai.models.generateContent({
        model: MODEL,

        contents: [{
          role: 'user',
          parts: [
            { text: GENERATION_PROMPT },
            ...imageParts
          ]
        }],

        config: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });

      const generated = parseGeminiJSON(generationResponse);

      if (
        typeof generated.passage !== 'string' ||
        !Array.isArray(generated.questions)
      ) {
        throw new Error('Gemini returned an invalid question structure.');
      }

      const candidateQuestions = generated.questions.filter(question => {
        return (
          !validateQuestion(question) &&
          typeof question.sourceEvidence === 'string' &&
          question.sourceEvidence.trim().length > 0
        );
      });

      if (!candidateQuestions.length) {
        return res.status(422).json({
          success: false,
          error: 'No valid questions could be generated from these pages.',
          savedCount: 0
        });
      }

      console.log(
        'Generated candidates:',
        candidateQuestions.length
      );

      // STEP 2: Independently verify every candidate
      // against the SAME original textbook images.

      const verificationResponse = await ai.models.generateContent({
        model: MODEL,

        contents: [{
          role: 'user',
          parts: [
            {
              text:
                VERIFICATION_PROMPT +
                '\n\nCANDIDATE QUESTIONS:\n' +
                JSON.stringify(candidateQuestions)
            },
            ...imageParts
          ]
        }],

        config: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });

      const verification = parseGeminiJSON(verificationResponse);

      if (!Array.isArray(verification.approvedQuestionIndexes)) {
        throw new Error('Gemini verification returned an invalid response.');
      }

      // Only accept valid, unique indexes.
      const approvedIndexes = [
        ...new Set(
          verification.approvedQuestionIndexes.filter(index =>
            Number.isInteger(index) &&
            index >= 0 &&
            index < candidateQuestions.length
          )
        )
      ];

      const verifiedQuestions = approvedIndexes
        .map(index => candidateQuestions[index])
        .filter(Boolean);

      if (!verifiedQuestions.length) {
        return res.status(422).json({
          success: false,
          error: 'The generated questions did not pass textbook verification. Try clearer images.',
          generatedCount: candidateQuestions.length,
          savedCount: 0
        });
      }

      // STEP 3: Save approved questions to MongoDB.

      const questionsToSave = verifiedQuestions.map(question => ({
        questionText: question.questionText.trim(),

        options: question.options.map(option => option.trim()),

        correctOptionIndex: question.correctOptionIndex,

        sourceEvidence: question.sourceEvidence.trim()
      }));

      chapter.questions.push(...questionsToSave);

      await chapter.save();

      const savedQuestions = chapter.questions.slice(
        -questionsToSave.length
      );

      console.log('Generated:', candidateQuestions.length);
      console.log('Verified:', verifiedQuestions.length);
      console.log('Saved to MongoDB:', savedQuestions.length);

      return res.status(201).json({
        success: true,
        message: 'Questions generated, verified and saved successfully.',

        generatedCount: candidateQuestions.length,
        verifiedCount: verifiedQuestions.length,
        savedCount: savedQuestions.length,

        passage: generated.passage,

        questions: savedQuestions,

        chapterId: chapter._id,
        chapterTitle: chapter.title
      });

    } catch (error) {
      console.error('===================================');
      console.error('QUESTION GENERATION ERROR');
      console.error(error);
      console.error('===================================');

      return res.status(500).json({
        success: false,
        error: error.message || 'Question generation failed.'
      });
    }
  }
);

// --------------------------------------------------
// GENERAL ERROR HANDLER
// --------------------------------------------------

app.use((error, req, res, next) => {
  console.error('Request error:', error);

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'Each image must be smaller than 5 MB.'
      });
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Maximum 6 images are allowed per request.'
      });
    }

    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  if (error.message?.includes('Only JPG')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  return res.status(500).json({
    success: false,
    error: error.message || 'Internal server error.'
  });
});

// --------------------------------------------------
// DATABASE CONNECTION
// --------------------------------------------------

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


import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
      trim: true
    },

    options: {
      type: [String],
      required: true,
      validate: {
        validator: value =>
          Array.isArray(value) &&
          value.length === 4 &&
          value.every(option =>
            typeof option === 'string' && option.trim().length > 0
          ),
        message: 'Every question must have exactly four non-empty options.'
      }
    },

    correctOptionIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
      validate: {
        validator: Number.isInteger,
        message: 'Correct option index must be an integer.'
      }
    },

    // Supporting line or phrase from the textbook.
    sourceEvidence: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

const chapterSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: ''
    },

    questions: {
      type: [questionSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

const Chapter = mongoose.model('Chapter', chapterSchema);

export default Chapter;

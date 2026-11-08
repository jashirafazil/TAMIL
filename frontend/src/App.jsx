
import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import {
  BookOpen, GraduationCap, LayoutDashboard, Plus, Trash2,
  Pencil, Download, Upload, LogOut, Moon, Sun, Search,
  ChevronRight, FileText, Sparkles, X, Check, ArrowLeft,
  ShieldCheck, Menu, RefreshCw, Camera, Image,
  ClipboardList, RotateCcw, Save, CircleHelp, AlertCircle, Activity, Gauge, Server, Zap, Database, ChartNoAxesCombined
} from 'lucide-react';
import './App.css';

const API_BASE = (
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:5000'
    : 'https://tamil-backend-2027.vercel.app')
).replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    Accept: 'application/json'
  },
  timeout: 120000
});

const TEACHER_PIN = '2027';
const OPTION_LABELS = ['அ', 'ஆ', 'இ', 'ஈ'];

const getPayload = response => response?.data?.data ?? response?.data;

const getChapters = payload =>
  Array.isArray(payload)
    ? payload
    : payload?.chapters || payload?.data?.chapters || [];

const getChapter = payload =>
  payload?.chapter || payload?.data?.chapter || payload?.data || payload;

const getQuestions = chapter =>
  Array.isArray(chapter?.questions) ? chapter.questions : [];

const createEmptyQuestion = () => ({
  questionText: '',
  options: ['', '', '', ''],
  correctOptionIndex: 0
});

// --------------------------------------------------
// IMAGE COMPRESSION
// --------------------------------------------------

const compressImage = (file, maxDimension = 1600, quality = 0.72) => {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      try {
        let { width, height } = image;

        const scale = Math.min(
          1,
          maxDimension / Math.max(width, height)
        );

        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');

        if (!context) {
          throw new Error('Unable to process image.');
        }

        context.drawImage(image, 0, 0, width, height);

        canvas.toBlob(
          blob => {
            URL.revokeObjectURL(url);

            if (!blob) {
              reject(new Error('Image compression failed.'));
              return;
            }

            resolve(
              new File(
                [blob],
                `compressed-${Date.now()}.jpg`,
                { type: 'image/jpeg' }
              )
            );
          },
          'image/jpeg',
          quality
        );
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to read selected image.'));
    };

    image.src = url;
  });
};

export default function App() {
  // --------------------------------------------------
  // ROLE WITH LOCAL STORAGE
  // --------------------------------------------------

  const [role, setRole] = useState(() => {
    try {
      const savedRole = localStorage.getItem('tamil_app_role');

      return savedRole === 'student' || savedRole === 'teacher'
        ? savedRole
        : '';
    } catch (error) {
      console.error('Unable to read saved role:', error);
      return '';
    }
  });

  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    try {
      if (role === 'student' || role === 'teacher') {
        localStorage.setItem('tamil_app_role', role);
      } else {
        localStorage.removeItem('tamil_app_role');
      }
    } catch (error) {
      console.error('Unable to save role:', error);
    }
  }, [role]);

  // THEME
  const [darkMode, setDarkMode] = useState(true);

  // NAVIGATION
  const [activePage, setActivePage] = useState('overview');
  const [mobileSidebar, setMobileSidebar] = useState(false);

  // CHAPTERS
  const [chapters, setChapters] = useState([]);
  const [activeChapter, setActiveChapter] = useState(null);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [search, setSearch] = useState('');

  // GENERAL
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [stats, setStats] = useState('Hide')
  // AI USAGE & SERVER HEALTH
  const [health, setHealth] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState('');
  // CUSTOM CONFIRMATION MODAL
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'Delete',
    onConfirm: null
  });

  const [confirmLoading, setConfirmLoading] = useState(false);

  // CHAPTER MODAL
  const [chapterModal, setChapterModal] = useState(false);
  const [editingChapter, setEditingChapter] = useState(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterDescription, setChapterDescription] = useState('');

  // QUESTION MODAL
  const [questionModal, setQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState(createEmptyQuestion());

  // IMAGES
  const [images, setImages] = useState([]);
  const imagesRef = useRef([]);

  // CAMERA
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('environment');

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // QUIZ
  const [userAnswers, setUserAnswers] = useState({});
  const [submittedQuiz, setSubmittedQuiz] = useState(false);

  const notify = message => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3000);
  };

  const getErrorMessage = err => {
    console.error(err);

    return (
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      err?.message ||
      'Something went wrong.'
    );
  };

  // --------------------------------------------------
  // CUSTOM CONFIRMATION FUNCTIONS
  // --------------------------------------------------

  const openConfirm = ({
    title,
    message,
    confirmText = 'Delete',
    onConfirm
  }) => {
    setConfirmModal({
      open: true,
      title,
      message,
      confirmText,
      onConfirm
    });
  };

  const closeConfirm = () => {
    if (confirmLoading) return;

    setConfirmModal({
      open: false,
      title: '',
      message: '',
      confirmText: 'Delete',
      onConfirm: null
    });
  };

  const executeConfirm = async () => {
    if (!confirmModal.onConfirm || confirmLoading) return;

    try {
      setConfirmLoading(true);
      setError('');

      await confirmModal.onConfirm();

      setConfirmModal({
        open: false,
        title: '',
        message: '',
        confirmText: 'Delete',
        onConfirm: null
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setConfirmLoading(false);
    }
  };

  // --------------------------------------------------
  // ROLE LOGIN
  // --------------------------------------------------

  const enterStudent = () => {
    setRole('student');
    setActivePage('overview');
    setPin('');
    setPinError('');
    setError('');
  };

  const enterTeacher = event => {
    event?.preventDefault();

    if (pin.trim() !== TEACHER_PIN) {
      setPinError('Incorrect PIN. Please try again.');
      return;
    }

    setRole('teacher');
    setActivePage('overview');
    setPin('');
    setPinError('');
    setError('');
  };

  const backToRoleSelection = () => {
    setRole('');
    setPin('');
    setPinError('');
    setError('');
  };

  const logout = () => {
    stopCamera();
    clearImages();

    setRole('');
    setActivePage('overview');
    setActiveChapter(null);
    setPin('');
    setPinError('');
    setError('');
    setNotice('');
  };

  // --------------------------------------------------
  // LOAD CHAPTERS
  // --------------------------------------------------

  const loadChapters = useCallback(async () => {
    setLoadingChapters(true);
    setError('');

    try {
      const response = await api.get('/api/chapters');
      setChapters(getChapters(getPayload(response)));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingChapters(false);
    }
  }, []);
  
  // --------------------------------------------------
  // AI USAGE & SERVER HEALTH
  // --------------------------------------------------

  const loadUsage = useCallback(async () => {
    if (role !== 'teacher') return;

    setUsageLoading(true);
    setUsageError('');

    try {
      // Fetch both endpoints independently.
      const results = await Promise.allSettled([
        api.get('/api/health'),
        api.get('/api/usage')
      ]);

      const healthResult = results[0];
      const usageResult = results[1];

      let errors = [];

      if (healthResult.status === 'fulfilled') {
        setHealth(getPayload(healthResult.value));
      } else {
        console.error('Health endpoint error:', healthResult.reason);
        setHealth(null);
        errors.push('Server health information unavailable.');
      }

      if (usageResult.status === 'fulfilled') {
        setUsageData(getPayload(usageResult.value));
      } else {
        console.error('Usage endpoint error:', usageResult.reason);
        setUsageData(null);
        errors.push('Usage information unavailable.');
      }

      if (errors.length) {
        setUsageError(errors.join(' '));
      }
    } catch (err) {
      console.error('Usage dashboard error:', err);
      setUsageError(getErrorMessage(err));
    } finally {
      setUsageLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (role !== 'teacher') return;

    loadUsage();

    const interval = window.setInterval(() => {
      loadUsage();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [role, loadUsage]);

  useEffect(() => {
    if (role === 'teacher' || role === 'student') {
      loadChapters();
    }
  }, [role, loadChapters]);

  const refreshActiveChapter = async () => {
    if (!activeChapter?._id) return;

    const response = await api.get(`/api/chapters/${activeChapter._id}`);
    const updated = getChapter(getPayload(response));

    setActiveChapter(updated);

    setChapters(prev =>
      prev.map(ch => ch._id === updated._id ? updated : ch)
    );
  };

  const openChapter = async chapter => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get(`/api/chapters/${chapter._id}`);
      const fullChapter = getChapter(getPayload(response));

      setActiveChapter(fullChapter);
      setActivePage(role === 'teacher' ? 'chapter' : 'student-quiz');
      setUserAnswers({});
      setSubmittedQuiz(false);
      setMobileSidebar(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // CHAPTER CRUD
  // --------------------------------------------------

  const openCreateChapter = () => {
    setEditingChapter(null);
    setChapterTitle('');
    setChapterDescription('');
    setChapterModal(true);
  };

  const openEditChapter = chapter => {
    setEditingChapter(chapter);
    setChapterTitle(chapter.title || '');
    setChapterDescription(chapter.description || '');
    setChapterModal(true);
  };

  const saveChapter = async event => {
    event.preventDefault();

    if (!chapterTitle.trim()) {
      setError('Please enter a chapter name.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const body = {
        title: chapterTitle.trim(),
        description: chapterDescription.trim()
      };

      if (editingChapter) {
        await api.patch(`/api/chapters/${editingChapter._id}`, body);
        notify('Chapter updated.');
      } else {
        await api.post('/api/chapters', body);
        notify('Chapter created.');
      }

      setChapterModal(false);
      await loadChapters();

      if (editingChapter && activeChapter?._id === editingChapter._id) {
        await refreshActiveChapter();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // DELETE CHAPTER
  const deleteChapter = chapter => {
    openConfirm({
      title: 'Delete this chapter?',
      message: `Are you sure you want to delete "${chapter.title}"? All questions inside this chapter will also be permanently deleted.`,
      confirmText: 'Delete chapter',

      onConfirm: async () => {
        setLoading(true);
        setError('');

        try {
          await api.delete(`/api/chapters/${chapter._id}`);

          if (activeChapter?._id === chapter._id) {
            setActiveChapter(null);
            setActivePage('overview');
          }

          setChapters(prev =>
            prev.filter(item => item._id !== chapter._id)
          );

          notify('Chapter deleted successfully.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // --------------------------------------------------
  // QUESTION CRUD
  // --------------------------------------------------

  const openAddQuestion = () => {
    setEditingQuestion(null);
    setQuestionForm(createEmptyQuestion());
    setQuestionModal(true);
  };

  const openEditQuestion = question => {
    setEditingQuestion(question);

    setQuestionForm({
      questionText: question.questionText || '',
      options: [
        question.options?.[0] || '',
        question.options?.[1] || '',
        question.options?.[2] || '',
        question.options?.[3] || ''
      ],
      correctOptionIndex: question.correctOptionIndex ?? 0
    });

    setQuestionModal(true);
  };

  const updateOption = (index, value) => {
    setQuestionForm(prev => ({
      ...prev,
      options: prev.options.map((item, i) =>
        i === index ? value : item
      )
    }));
  };

  const saveQuestion = async event => {
    event.preventDefault();

    if (!questionForm.questionText.trim()) {
      setError('Enter the question.');
      return;
    }

    if (questionForm.options.some(option => !option.trim())) {
      setError('Please fill all four options.');
      return;
    }

    setLoading(true);
    setError('');

    const body = {
      questionText: questionForm.questionText.trim(),
      options: questionForm.options.map(option => option.trim()),
      correctOptionIndex: Number(questionForm.correctOptionIndex)
    };

    try {
      if (editingQuestion) {
        await api.patch(
          `/api/chapters/${activeChapter._id}/questions/${editingQuestion._id}`,
          body
        );

        notify('Question updated.');
      } else {
        await api.post(
          `/api/chapters/${activeChapter._id}/questions`,
          body
        );

        notify('Question added.');
      }

      setQuestionModal(false);
      await refreshActiveChapter();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // DELETE QUESTION
  const deleteQuestion = question => {
    openConfirm({
      title: 'Delete this question?',
      message: 'This question will be permanently removed from the chapter question bank.',
      confirmText: 'Delete question',

      onConfirm: async () => {
        setLoading(true);
        setError('');

        try {
          await api.delete(
            `/api/chapters/${activeChapter._id}/questions/${question._id}`
          );

          await refreshActiveChapter();

          notify('Question deleted successfully.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // CLEAR ALL QUESTIONS
  const clearChapterQuestions = () => {
    if (!activeChapter?._id || !questions.length) return;

    openConfirm({
      title: 'Clear all questions?',
      message: `This will permanently delete all ${questions.length} questions from "${activeChapter.title}". This action cannot be undone.`,
      confirmText: 'Clear all questions',

      onConfirm: async () => {
        setLoading(true);
        setError('');

        try {
          const chapterId = activeChapter._id;

          await api.delete(
            `/api/chapters/${chapterId}/questions`
          );

          // Immediately update active chapter
          setActiveChapter(prev => {
            if (!prev || prev._id !== chapterId) return prev;

            return {
              ...prev,
              questions: []
            };
          });

          // Immediately update overview chapter data
          setChapters(prev =>
            prev.map(chapter =>
              chapter._id === chapterId
                ? { ...chapter, questions: [] }
                : chapter
            )
          );

          // Reset quiz data
          setUserAnswers({});
          setSubmittedQuiz(false);

          notify('All questions cleared successfully.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // --------------------------------------------------
  // IMAGE UPLOAD
  // --------------------------------------------------

  const addImages = files => {
    const selected = Array.from(files || []);
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];

    const valid = selected.filter(file => allowed.includes(file.type));

    if (valid.length !== selected.length) {
      setError('Only JPG, PNG and WEBP images are supported.');
    }

    const available = Math.max(0, 6 - imagesRef.current.length);
    const accepted = valid.slice(0, available);

    if (valid.length > available) {
      setError('A maximum of 6 images can be added.');
    }

    const additions = accepted.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      url: URL.createObjectURL(file)
    }));

    setImages(prev => {
      const next = [...prev, ...additions];
      imagesRef.current = next;
      return next;
    });
  };

  const removeImage = id => {
    setImages(prev => {
      const removed = prev.find(item => item.id === id);

      if (removed) URL.revokeObjectURL(removed.url);

      const next = prev.filter(item => item.id !== id);
      imagesRef.current = next;
      return next;
    });
  };

  const clearImages = () => {
    imagesRef.current.forEach(item => URL.revokeObjectURL(item.url));
    imagesRef.current = [];
    setImages([]);
  };

  const handleGallerySelect = event => {
    addImages(event.target.files);
    event.target.value = '';
  };

  // --------------------------------------------------
  // CAMERA
  // --------------------------------------------------

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOpen(false);
  };

  const startCamera = async (mode = facingMode) => {
    setCameraError('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera requires HTTPS or localhost.');
      return;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      streamRef.current = stream;
      setCameraOpen(true);
    } catch (err) {
      console.error(err);

      const messages = {
        NotAllowedError: 'Camera permission denied. Allow camera access in your browser.',
        NotFoundError: 'No camera found on this device.',
        NotReadableError: 'Camera is being used by another application.'
      };

      setCameraError(messages[err.name] || 'Unable to open camera.');
      setCameraOpen(false);
    }
  };

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return;

    const video = videoRef.current;
    video.srcObject = streamRef.current;

    video.play().catch(() => {
      setCameraError('Unable to start camera preview.');
    });
  }, [cameraOpen]);

  const switchCamera = async () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    await startCamera(next);
  };

  const capturePhoto = () => {
    const video = videoRef.current;

    if (!video?.videoWidth || !video?.videoHeight) {
      setCameraError('Camera is not ready yet.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');

    if (!context) {
      setCameraError('Unable to capture image.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      if (!blob) {
        setCameraError('Image capture failed.');
        return;
      }

      const file = new File(
        [blob],
        `tamil-page-${Date.now()}.jpg`,
        { type: 'image/jpeg' }
      );

      addImages([file]);
      setCameraError('');
    }, 'image/jpeg', 0.95);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      imagesRef.current.forEach(item => URL.revokeObjectURL(item.url));
    };
  }, []);

  // --------------------------------------------------
  // GEMINI GENERATION - MOBILE OPTIMISED
  // --------------------------------------------------

  const generateQuestions = async () => {
    if (!activeChapter?._id || !images.length) {
      setError('Select at least one textbook image.');
      return;
    }

    setLoading(true);
    setError('');
    setProgress('Compressing textbook pages...');

    try {
      let compressedImages = await Promise.all(
        images.map(item => compressImage(item.file, 1600, 0.72))
      );

      let totalSize = compressedImages.reduce(
        (total, file) => total + file.size,
        0
      );

      if (totalSize > 3.8 * 1024 * 1024) {
        setProgress('Optimising images for mobile upload...');

        compressedImages = await Promise.all(
          images.map(item => compressImage(item.file, 1280, 0.55))
        );

        totalSize = compressedImages.reduce(
          (total, file) => total + file.size,
          0
        );
      }

      if (totalSize > 4 * 1024 * 1024) {
        throw new Error(
          'Images are still too large. Please upload fewer pages.'
        );
      }

      setProgress('Preparing upload...');

      const formData = new FormData();

      compressedImages.forEach((file, index) => {
        formData.append(
          'images',
          file,
          `textbook-page-${index + 1}.jpg`
        );
      });

      setProgress('Uploading pages and generating questions...');

      await api.post(
        `/api/chapters/${activeChapter._id}/generate`,
        formData
      );

      setProgress('Refreshing question bank...');

      await refreshActiveChapter();

      clearImages();
      stopCamera();

      notify('Questions generated and saved successfully.');
    } catch (err) {
      console.error('AI Generation Error:', err);

      if (err.response) {
        const status = err.response.status;

        if (status === 413) {
          setError(
            'The uploaded images are too large for the server. Please select fewer pages.'
          );
        } else {
          setError(getErrorMessage(err));
        }
      } else if (err.request) {
        setError(
          'The server did not respond. Check your internet connection and try again.'
        );
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  // --------------------------------------------------
  // PDF EXPORT
  // --------------------------------------------------

  const exportPDF = async (questions, title = 'Tamil Questions') => {
    if (!questions?.length) {
      setError('No questions available to export.');
      return;
    }

    let pdfContainer;

    try {
      pdfContainer = document.createElement('div');

      Object.assign(pdfContainer.style, {
        position: 'absolute',
        left: '0',
        top: '0',
        width: '718px',
        margin: '0',
        padding: '0',
        background: '#ffffff',
        color: '#111111',
        fontFamily: '"Nirmala UI", "Noto Sans Tamil", "Latha", sans-serif',
        boxSizing: 'border-box',
        zIndex: '999999'
      });

      const style = document.createElement('style');

      style.textContent = `
        .pdf-document {
          width: 718px;
          background: #ffffff;
          color: #111111;
          font-family: "Nirmala UI", "Noto Sans Tamil", "Latha", sans-serif;
          box-sizing: border-box;
        }

        .pdf-header {
          background: #e5e7eb;
          text-align: center;
          padding: 13px 10px;
          border: 1px solid #cbd0d6;
          border-bottom: 2px solid #555;
          margin-bottom: 12px;
        }

        .pdf-school-name {
          font-size: 21px;
          font-weight: 800;
          letter-spacing: 0.4px;
          margin: 0 0 4px;
          color: #111;
        }

        .pdf-school-subtitle {
          font-size: 11px;
          margin: 0;
          color: #444;
          font-weight: 600;
        }

        .pdf-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          font-weight: 700;
          padding: 0 3px 8px;
          border-bottom: 1px solid #999;
        }

        .pdf-chapter-title {
          text-align: center;
          font-size: 16px;
          font-weight: 800;
          margin: 12px 0 14px;
          line-height: 1.5;
        }

        .pdf-question {
          margin-bottom: 10px;
          padding-bottom: 7px;
          border-bottom: 1px solid #e5e5e5;
          page-break-inside: avoid;
          break-inside: avoid;
          color: #111;
        }

        .pdf-question-text {
          font-size: 13px;
          font-weight: 700;
          line-height: 1.55;
          margin-bottom: 5px;
          overflow-wrap: break-word;
        }

        .pdf-options {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          column-gap: 8px;
          row-gap: 3px;
          padding-left: 12px;
          align-items: start;
        }

        .pdf-option {
          font-size: 11px;
          line-height: 1.5;
          overflow-wrap: anywhere;
          word-break: normal;
        }

        .pdf-option-label {
          font-weight: 700;
          margin-right: 3px;
        }

        .pdf-footer {
          text-align: center;
          font-size: 9px;
          color: #666;
          margin-top: 12px;
          padding-top: 7px;
          border-top: 1px solid #ddd;
        }
      `;

      pdfContainer.appendChild(style);

      const documentContent = document.createElement('div');
      documentContent.className = 'pdf-document';

      const header = document.createElement('div');
      header.className = 'pdf-header';

      const schoolName = document.createElement('h1');
      schoolName.className = 'pdf-school-name';
      schoolName.textContent = 'BLOSSOM PUBLIC SCHOOL';

      const subtitle = document.createElement('p');
      subtitle.className = 'pdf-school-subtitle';
      subtitle.textContent = 'பாடல் வினா';

      header.append(schoolName, subtitle);

      const meta = document.createElement('div');
      meta.className = 'pdf-meta';

      const standard = document.createElement('span');
      standard.textContent = 'STD: X';

      const subject = document.createElement('span');
      subject.textContent = 'SUBJECT: தமிழ்';

      meta.append(standard, subject);

      const chapterHeading = document.createElement('h2');
      chapterHeading.className = 'pdf-chapter-title';
      chapterHeading.textContent = title;

      documentContent.append(header, meta, chapterHeading);

      questions.forEach((question, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'pdf-question';

        const questionText = document.createElement('div');
        questionText.className = 'pdf-question-text';
        questionText.textContent =
          `${index + 1}. ${question.questionText || ''}`;

        const options = document.createElement('div');
        options.className = 'pdf-options';

        (question.options || []).slice(0, 4).forEach((option, optionIndex) => {
          const optionElement = document.createElement('div');
          optionElement.className = 'pdf-option';

          const label = document.createElement('span');
          label.className = 'pdf-option-label';
          label.textContent = `(${OPTION_LABELS[optionIndex]})`;

          const optionText = document.createElement('span');
          optionText.textContent = option || '';

          optionElement.append(label, optionText);
          options.appendChild(optionElement);
        });

        wrapper.append(questionText, options);
        documentContent.appendChild(wrapper);
      });

      const footer = document.createElement('div');
      footer.className = 'pdf-footer';
      footer.textContent = 'BLOSSOM PUBLIC SCHOOL  •  CLASS X  •  TAMIL';

      documentContent.appendChild(footer);
      pdfContainer.appendChild(documentContent);

      document.body.appendChild(pdfContainer);

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      await new Promise(resolve =>
        requestAnimationFrame(() =>
          requestAnimationFrame(resolve)
        )
      );

      const safeTitle = title
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, '_');

      await html2pdf()
        .set({
          margin: [8, 9, 8, 9],
          filename: `${safeTitle}_Tamil_Question_Paper.pdf`,
          image: {
            type: 'jpeg',
            quality: 0.98
          },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            scrollX: 0,
            scrollY: 0,
            windowWidth: 900
          },
          jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait',
            compress: true
          },
          pagebreak: {
            mode: ['css', 'legacy'],
            avoid: ['.pdf-question']
          }
        })
        .from(documentContent)
        .save();

    } catch (err) {
      console.error('PDF Export Error:', err);
      setError('PDF generation failed. Please try again.');
    } finally {
      pdfContainer?.remove();
    }
  };

  // --------------------------------------------------
  // QUIZ
  // --------------------------------------------------

  const questions = getQuestions(activeChapter);

  const handleAnswer = (questionId, index) => {
    if (submittedQuiz) return;

    setUserAnswers(prev => ({
      ...prev,
      [questionId]: index
    }));
  };

  const submitQuiz = () => {
    if (questions.length) setSubmittedQuiz(true);
  };

  const resetQuiz = () => {
    setUserAnswers({});
    setSubmittedQuiz(false);
  };

  const score = questions.filter(
    question =>
      userAnswers[question._id] === question.correctOptionIndex
  ).length;

  const attempted = questions.filter(
    question => userAnswers[question._id] !== undefined
  ).length;

  const filteredChapters = chapters.filter(chapter =>
    (chapter.title || '').toLowerCase().includes(search.toLowerCase())
  );

  // --------------------------------------------------
  // ENTRY SCREEN AND TEACHER LOGIN
  // --------------------------------------------------

  if (role === '' || role === 'teacher-login') {
    const isTeacherLogin = role === 'teacher-login';

    return (
      <div className={`app entry-app ${darkMode ? 'dark' : 'light'}`}>
        <div className="entry-topbar">
          <div className="brand">
            <div className="brand-mark">
              <BookOpen size={22} />
            </div>
            <div>
              <strong>தமிழ் பாடல் வினா</strong>
              <span>Blossom Public School · Class X</span>
            </div>
          </div>

          <button
            className="icon-button"
            onClick={() => setDarkMode(prev => !prev)}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <main className="entry-content">
          {!isTeacherLogin ? (
            <>
              <div className="entry-eyebrow">
                <Sparkles size={15} /> LEARNING MANAGEMENT
              </div>

              <h1>
                Welcome to your<br />
                <span>Tamil learning space.</span>
              </h1>

              <p className="entry-description">
                A focused space for teachers to create question banks
                and students to practise Tamil பாடல் வினா.
              </p>

              <div className="role-grid">
                <button className="role-card" onClick={enterStudent}>
                  <div className="role-icon student-icon">
                    <GraduationCap size={27} />
                  </div>

                  <div className="role-card-text">
                    <h2>I'm a Student</h2>
                    <p>
                      Explore chapters, attempt quizzes and download
                      question papers.
                    </p>
                  </div>

                  <ChevronRight className="role-arrow" size={20} />
                </button>

                <button
                  className="role-card"
                  onClick={() => {
                    setPin('');
                    setPinError('');
                    setRole('teacher-login');
                  }}
                >
                  <div className="role-icon teacher-icon">
                    <ShieldCheck size={26} />
                  </div>

                  <div className="role-card-text">
                    <h2>I'm a Teacher</h2>
                    <p>
                      Manage chapters, create questions and generate papers.
                    </p>
                  </div>

                  <ChevronRight className="role-arrow" size={20} />
                </button>
              </div>
            </>
          ) : (
            <div className="teacher-login-screen">
              <button className="back-link" onClick={backToRoleSelection}>
                <ArrowLeft size={16} />
                Back to role selection
              </button>

              <div className="teacher-login-card">
                <div className="role-icon teacher-icon login-lock">
                  <ShieldCheck size={28} />
                </div>

                <div className="eyebrow">TEACHER AUTHENTICATION</div>

                <h1>Welcome back.</h1>

                <p>
                  Enter your teacher PIN to access the workspace.
                </p>

                <form onSubmit={enterTeacher}>
                  <label className="form-label">
                    Teacher PIN

                    <input
                      className="text-input pin-input"
                      type="password"
                      inputMode="numeric"
                      autoComplete="current-password"
                      value={pin}
                      onChange={event => {
                        setPin(event.target.value);
                        setPinError('');
                      }}
                      placeholder="Enter your PIN"
                      autoFocus
                    />
                  </label>

                  {pinError && (
                    <div className="field-error">{pinError}</div>
                  )}

                  <button
                    type="submit"
                    className="button primary teacher-login-button"
                    disabled={!pin.trim()}
                  >
                    Enter teacher workspace
                    <ChevronRight size={17} />
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="entry-footer">
            <span>
              <ShieldCheck size={14} /> Academic workspace
            </span>
            <span>Designed for Class X Tamil</span>
          </div>
        </main>
      </div>
    );
  }

  // --------------------------------------------------
  // MAIN APPLICATION
  // --------------------------------------------------

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="icon-button mobile-menu-button"
            onClick={() => setMobileSidebar(prev => !prev)}
          >
            <Menu size={20} />
          </button>

          <div className="brand">
            <div className="brand-mark">
              <BookOpen size={21} />
            </div>
            <div>
              <strong>தமிழ் பாடல் வினா</strong>
              <span>Blossom Public School</span>
            </div>
          </div>
        </div>

        <div className="topbar-right">
          <span className={`role-badge ${role}`}>
            {role === 'teacher'
              ? <ShieldCheck size={14} />
              : <GraduationCap size={14} />}
            {role === 'teacher' ? 'Teacher' : 'Student'}
          </span>

          <button
            className="icon-button"
            onClick={() => setDarkMode(prev => !prev)}
            title="Toggle theme"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button className="logout-button" onClick={logout}>
            <LogOut size={16} />
            <span>Exit</span>
          </button>
        </div>
      </header>

      <div className="app-layout">
        {mobileSidebar && (
          <button
            className="sidebar-backdrop"
            onClick={() => setMobileSidebar(false)}
            aria-label="Close sidebar"
          />
        )}

        <aside className={`sidebar ${mobileSidebar ? 'sidebar-open' : ''}`}>
          <div className="sidebar-section-label">WORKSPACE</div>

          <button
            className={`sidebar-link ${activePage === 'overview' ? 'active' : ''}`}
            onClick={() => {
              setActivePage('overview');
              setActiveChapter(null);
              setMobileSidebar(false);
            }}
          >
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </button>
          {role === 'teacher' && (
            <button
              className={`sidebar-link ${activePage === 'stats' ? 'active' : ''}`}
              onClick={() => {
                setStats('show')
                setActivePage('stats');

              }}
            >
              <ChartNoAxesCombined size={18} />
              <span>Stats</span>
            </button>
          )}
          <div className="sidebar-section-label sidebar-label-spaced">
            {role === 'teacher' ? 'MANAGE' : 'LEARN'}
          </div>

          <div className="sidebar-tip">
            {role === 'teacher'
              ? <Sparkles size={16} />
              : <GraduationCap size={17} />}

            <p>
              {role === 'teacher'
                ? 'Create chapters, add questions and generate them from textbook pages.'
                : 'Choose a chapter to practise its questions and check your score.'}
            </p>
          </div>

          <div className="sidebar-bottom">
            <div className="sidebar-user">
              <div className="user-avatar">
                {role === 'teacher'
                  ? <ShieldCheck size={18} />
                  : <GraduationCap size={18} />}
              </div>

              <div>
                <strong>
                  {role === 'teacher'
                    ? 'Teacher workspace'
                    : 'Student workspace'}
                </strong>
                <span>Class X · Tamil</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="main-content">
          <div className="content-inner">
            {error && (
              <div className="alert alert-error">
                <AlertCircle size={17} />
                <span>{error}</span>
                <button onClick={() => setError('')}>
                  <X size={16} />
                </button>
              </div>
            )}

            {notice && (
              <div className="alert alert-success">
                <Check size={17} />
                <span>{notice}</span>
              </div>
            )}
            {activePage === 'stats' && (
              <div>
                {/* AI USAGE & SERVER HEALTH */}
                {stats === 'show' && role === 'teacher' && (
                  <section style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '18px',
                    padding: '24px',
                    marginTop: '24px',
                    color: 'var(--text)',
                    boxShadow: 'var(--shadow)',
                  }}>

                    {/* HEADER */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '16px',
                      marginBottom: '26px',
                    }}>
                      <div>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          letterSpacing: '1.5px',
                          color: 'var(--primary)',
                          marginBottom: '7px',
                        }}>
                          SYSTEM MONITORING
                        </div>

                        <h2 style={{
                          fontSize: '23px',
                          fontWeight: 750,
                          margin: 0,
                          letterSpacing: '-0.7px',
                        }}>
                          AI usage & server health
                        </h2>

                        <p style={{
                          color: 'var(--muted)',
                          fontSize: '13px',
                          margin: '7px 0 0',
                        }}>
                          Monitor Gemini API activity and application performance.
                        </p>
                      </div>

                      <button
                        className="button secondary"
                        onClick={loadUsage}
                        disabled={usageLoading}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 15px',
                          borderRadius: '10px',
                        }}
                      >
                        <RefreshCw
                          size={15}
                          className={usageLoading ? 'usage-spinning' : ''}
                        />
                        Refresh
                      </button>
                    </div>

                    {usageError && (
                      <div className="alert alert-error" style={{ marginBottom: '20px' }}>
                        <AlertCircle size={17} />
                        <span>{usageError}</span>
                      </div>
                    )}

                    {usageData ? (
                      <>
                        {/* SERVER STATUS */}
                        <div style={{ marginBottom: '28px' }}>
                          <div style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: 'var(--muted)',
                            marginBottom: '12px',
                          }}>
                            SERVICE STATUS
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                            gap: '12px',
                          }}>

                            {[
                              {
                                label: 'API Server',
                                value: health?.server === 'online' ? 'Online' : 'Offline',
                                ok: health?.server === 'online',
                                icon: <Server size={18} />,
                              },
                              {
                                label: 'MongoDB',
                                value: health?.database === 'connected'
                                  ? 'Connected'
                                  : 'Disconnected',
                                ok: health?.database === 'connected',
                                icon: <Database size={18} />,
                              },
                              {
                                label: 'Gemini Model',
                                value: usageData.model || 'Unknown',
                                ok: true,
                                icon: <Zap size={18} />,
                              },
                            ].map((item, index) => (
                              <div key={index} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '16px',
                                background: 'var(--surface-2)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                minWidth: 0,
                              }}>
                                <div style={{
                                  width: '38px',
                                  height: '38px',
                                  flexShrink: 0,
                                  display: 'grid',
                                  placeItems: 'center',
                                  borderRadius: '10px',
                                  background: 'var(--surface-3)',
                                  color: 'var(--primary)',
                                }}>
                                  {item.icon}
                                </div>

                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{
                                    color: 'var(--muted)',
                                    fontSize: '12px',
                                    marginBottom: '5px',
                                  }}>
                                    {item.label}
                                  </div>

                                  <strong style={{
                                    display: 'block',
                                    fontSize: index === 2 ? '13px' : '15px',
                                    overflowWrap: 'anywhere',
                                  }}>
                                    {item.value}
                                  </strong>
                                </div>

                                {index !== 2 && (
                                  <span style={{
                                    width: '9px',
                                    height: '9px',
                                    flexShrink: 0,
                                    borderRadius: '50%',
                                    background: item.ok ? '#16a34a' : '#dc2626',
                                    boxShadow: `0 0 0 4px ${item.ok
                                      ? 'rgba(22,163,74,0.12)'
                                      : 'rgba(220,38,38,0.12)'}`,
                                  }} />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* GENERATION METRICS */}
                        <div style={{ marginBottom: '28px' }}>
                          <div style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: 'var(--muted)',
                            marginBottom: '12px',
                          }}>
                            GENERATION OVERVIEW
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
                            gap: '12px',
                          }}>
                            {[
                              {
                                label: 'Total attempts',
                                value: usageData.usage?.totalAttempts ?? 0,
                                description: 'All requests',
                                color: 'var(--text)',
                              },
                              {
                                label: 'Successful',
                                value: usageData.usage?.successfulGenerations ?? 0,
                                description: 'Completed',
                                color: '#16a34a',
                              },
                              {
                                label: 'Failed',
                                value: usageData.usage?.failedGenerations ?? 0,
                                description: 'Unsuccessful',
                                color: '#dc2626',
                              },
                              {
                                label: 'Total tokens',
                                value: (usageData.usage?.totalTokens ?? 0).toLocaleString(),
                                description: 'Input + output',
                                color: 'var(--text)',
                              },
                            ].map((metric, index) => (
                              <div key={index} style={{
                                padding: '17px',
                                background: 'var(--surface-2)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                              }}>
                                <div style={{
                                  fontSize: '12px',
                                  color: 'var(--muted)',
                                  marginBottom: '12px',
                                }}>
                                  {metric.label}
                                </div>

                                <div style={{
                                  fontSize: '27px',
                                  fontWeight: 750,
                                  letterSpacing: '-1px',
                                  color: metric.color,
                                  lineHeight: 1.2,
                                }}>
                                  {metric.value}
                                </div>

                                <div style={{
                                  fontSize: '11px',
                                  color: 'var(--muted)',
                                  marginTop: '7px',
                                }}>
                                  {metric.description}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* REQUEST LIMIT */}
                        <div style={{
                          padding: '19px',
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          borderRadius: '13px',
                          marginBottom: '16px',
                        }}>
                          {(() => {
                            const requestLimit = usageData.limits?.requestsPerMinute;
                            const used = requestLimit?.used ?? 0;
                            const limit = requestLimit?.limit ?? 3;
                            const remaining = requestLimit?.remaining ?? 0;
                            const percentage = limit
                              ? Math.min(100, (used / limit) * 100)
                              : 0;

                            return (
                              <>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '11px',
                                  marginBottom: '20px',
                                }}>
                                  <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    display: 'grid',
                                    placeItems: 'center',
                                    background: 'var(--surface-3)',
                                    color: 'var(--primary)',
                                  }}>
                                    <Gauge size={19} />
                                  </div>

                                  <div>
                                    <h3 style={{
                                      fontSize: '15px',
                                      margin: 0,
                                      fontWeight: 700,
                                    }}>
                                      Application request limit
                                    </h3>
                                    <p style={{
                                      fontSize: '12px',
                                      color: 'var(--muted)',
                                      margin: '4px 0 0',
                                    }}>
                                      Requests per minute · Application-level limit
                                    </p>
                                  </div>
                                </div>

                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'baseline',
                                  flexWrap: 'wrap',
                                  gap: '8px',
                                  marginBottom: '12px',
                                }}>
                                  <div>
                                    <strong style={{ fontSize: '25px' }}>{used}</strong>
                                    <span style={{
                                      color: 'var(--muted)',
                                      fontSize: '13px',
                                    }}>
                                      {' '}/ {limit} requests used
                                    </span>
                                  </div>

                                  <span style={{
                                    color: '#16a34a',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                  }}>
                                    {remaining} remaining
                                  </span>
                                </div>

                                <div style={{
                                  height: '9px',
                                  background: 'var(--surface-3)',
                                  borderRadius: '20px',
                                  overflow: 'hidden',
                                }}>
                                  <div style={{
                                    width: `${percentage}%`,
                                    height: '100%',
                                    background: percentage >= 90
                                      ? '#dc2626'
                                      : 'var(--primary)',
                                    borderRadius: '20px',
                                    transition: 'width 0.3s ease',
                                  }} />
                                </div>

                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  gap: '10px',
                                  marginTop: '10px',
                                  fontSize: '11px',
                                  color: 'var(--muted)',
                                }}>
                                  <span>Rolling 60-second window</span>
                                  <span>{Math.round(percentage)}% used</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>

                        {/* TOKEN USAGE */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: '12px',
                          marginBottom: '16px',
                        }}>
                          {[
                            {
                              label: 'Input tokens',
                              value: usageData.usage?.totalInputTokens ?? 0,
                              description: 'Sent to Gemini',
                            },
                            {
                              label: 'Output tokens',
                              value: usageData.usage?.totalOutputTokens ?? 0,
                              description: 'Generated by Gemini',
                            },
                          ].map((item, index) => (
                            <div key={index} style={{
                              padding: '18px',
                              border: '1px solid var(--border)',
                              borderRadius: '12px',
                              background: 'var(--surface-2)',
                            }}>
                              <div style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                letterSpacing: '0.7px',
                                color: 'var(--muted)',
                              }}>
                                {item.label.toUpperCase()}
                              </div>

                              <div style={{
                                fontSize: '25px',
                                fontWeight: 750,
                                marginTop: '10px',
                                letterSpacing: '-0.7px',
                              }}>
                                {Number(item.value).toLocaleString()}
                              </div>

                              <p style={{
                                fontSize: '12px',
                                color: 'var(--muted)',
                                margin: '5px 0 0',
                              }}>
                                {item.description}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* GENERATION CAPACITY */}
                        <div style={{
                          padding: '19px',
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          borderRadius: '13px',
                          marginBottom: '16px',
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '18px',
                          }}>
                            <Gauge size={19} color="var(--primary)" />
                            <div>
                              <h3 style={{
                                margin: 0,
                                fontSize: '15px',
                              }}>
                                Generation capacity
                              </h3>
                              <p style={{
                                margin: '4px 0 0',
                                fontSize: '12px',
                                color: 'var(--muted)',
                              }}>
                                Simultaneous application generation slots
                              </p>
                            </div>
                          </div>

                          {(() => {
                            const active = usageData.limits?.activeGenerations ?? 0;
                            const maximum = usageData.limits?.maxConcurrentGenerations ?? 2;
                            const available = usageData.limits?.remainingGenerationSlots ?? 0;
                            const percentage = maximum
                              ? Math.min(100, (active / maximum) * 100)
                              : 0;

                            return (
                              <>
                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  gap: '12px',
                                  flexWrap: 'wrap',
                                  marginBottom: '12px',
                                }}>
                                  <div>
                                    <strong style={{ fontSize: '25px' }}>{active}</strong>
                                    <span style={{
                                      color: 'var(--muted)',
                                      fontSize: '13px',
                                    }}>
                                      {' '}/ {maximum} active
                                    </span>
                                  </div>

                                  <span style={{
                                    color: 'var(--primary)',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                  }}>
                                    {available} slots available
                                  </span>
                                </div>

                                <div style={{
                                  height: '8px',
                                  background: 'var(--surface-3)',
                                  borderRadius: '20px',
                                  overflow: 'hidden',
                                }}>
                                  <div style={{
                                    height: '100%',
                                    width: `${percentage}%`,
                                    background: 'var(--primary)',
                                    borderRadius: '20px',
                                    transition: 'width 0.3s ease',
                                  }} />
                                </div>
                              </>
                            );
                          })()}
                        </div>

                        {/* PERFORMANCE */}
                        <div style={{ marginBottom: '18px' }}>
                          <div style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: 'var(--muted)',
                            marginBottom: '12px',
                          }}>
                            PERFORMANCE & ERRORS
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
                            gap: '12px',
                          }}>
                            {[
                              {
                                label: 'Average generation time',
                                value: `${((usageData.usage?.averageGenerationTimeMs ?? 0) / 1000).toFixed(1)}s`,
                              },
                              {
                                label: 'Images processed',
                                value: usageData.usage?.totalImagesProcessed ?? 0,
                              },
                              {
                                label: 'Rate-limit errors',
                                value: usageData.usage?.rateLimitErrors ?? 0,
                              },
                              {
                                label: 'Quota errors',
                                value: usageData.usage?.quotaErrors ?? 0,
                              },
                            ].map((item, index) => (
                              <div key={index} style={{
                                padding: '15px',
                                border: '1px solid var(--border)',
                                borderRadius: '11px',
                                background: 'var(--surface-2)',
                              }}>
                                <div style={{
                                  color: 'var(--muted)',
                                  fontSize: '11px',
                                  minHeight: '30px',
                                  lineHeight: 1.4,
                                }}>
                                  {item.label}
                                </div>

                                <strong style={{
                                  display: 'block',
                                  fontSize: '22px',
                                  marginTop: '8px',
                                }}>
                                  {item.value}
                                </strong>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* OFFICIAL QUOTA */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '16px',
                          border: '1px solid var(--border)',
                          borderRadius: '12px',
                          background: 'var(--surface-2)',
                        }}>
                          <AlertCircle
                            size={19}
                            style={{
                              flexShrink: 0,
                              color: 'var(--primary)',
                              marginTop: '2px',
                            }}
                          />

                          <div>
                            <strong style={{ fontSize: '13px' }}>
                              Official Gemini API quota
                            </strong>

                            <p style={{
                              fontSize: '12px',
                              color: 'var(--muted)',
                              lineHeight: 1.6,
                              margin: '6px 0 0',
                            }}>
                              This dashboard tracks application-side usage, not your
                              official Gemini quota. Check Google AI Studio for your
                              actual RPM, TPM and RPD limits.
                            </p>
                          </div>
                        </div>

                        {/* FOOTER */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '7px',
                          justifyContent: 'flex-end',
                          color: 'var(--muted)',
                          fontSize: '11px',
                          marginTop: '17px',
                        }}>
                          <Activity size={14} />
                          Automatically refreshes every 30 seconds
                        </div>

                      </>
                    ) : (
                      <div style={{
                        minHeight: '180px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        color: 'var(--muted)',
                        fontSize: '13px',
                      }}>
                        <div className="loader" />
                        Loading usage information...
                      </div>
                    )}

                  </section>
                )}
              </div>
            )}
            {/* OVERVIEW */}
            {activePage === 'overview' && (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">
                      {role === 'teacher'
                        ? 'TEACHER DASHBOARD'
                        : 'STUDENT DASHBOARD'}
                    </div>

                    <h1>
                      {role === 'teacher'
                        ? 'Your workspace'
                        : 'Ready to practise?'}
                    </h1>

                    <p>
                      {role === 'teacher'
                        ? 'Manage your Tamil chapters and build question papers.'
                        : 'Select a chapter and test your understanding.'}
                    </p>
                  </div>

                  {role === 'teacher' && (
                    <button
                      className="button primary"
                      onClick={openCreateChapter}
                    >
                      <Plus size={17} /> Create chapter
                    </button>
                  )}
                </div>

                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon blue">
                      <BookOpen size={19} />
                    </div>
                    <div>
                      <span>Total chapters</span>
                      <strong>{chapters.length}</strong>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon purple">
                      <ClipboardList size={19} />
                    </div>
                    <div>
                      <span>Total questions</span>
                      <strong>
                        {chapters.reduce(
                          (total, chapter) =>
                            total + (chapter.questions?.length || 0),
                          0
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon green">
                      <GraduationCap size={19} />
                    </div>
                    <div>
                      <span>Workspace</span>
                      <strong className="stat-word">
                        {role === 'teacher' ? 'Teacher' : 'Student'}
                      </strong>
                    </div>
                  </div>
                </div>

                <br />
                <div className="section-heading">
                  <div>
                    <h2>
                      {role === 'teacher'
                        ? 'Chapter management'
                        : 'Available chapters'}
                    </h2>
                    <p>
                      {role === 'teacher'
                        ? 'Open a chapter to manage its questions.'
                        : 'Choose a chapter to start your quiz.'}
                    </p>
                  </div>

                  <div className="search-box">
                    <Search size={16} />
                    <input
                      value={search}
                      onChange={event => setSearch(event.target.value)}
                      placeholder="Search chapters..."
                    />
                  </div>
                </div>

                {loadingChapters ? (
                  <div className="empty-state">
                    <div className="loader" />
                    <p>Loading chapters...</p>
                  </div>
                ) : filteredChapters.length ? (
                  <div className="chapter-grid">
                    {filteredChapters.map(chapter => (
                      <article className="chapter-card" key={chapter._id}>
                        <div className="chapter-card-top">
                          <div className="chapter-icon">
                            <BookOpen size={21} />
                          </div>

                          {role === 'teacher' && (
                            <div className="chapter-actions">
                              <button
                                className="icon-button small"
                                onClick={() => openEditChapter(chapter)}
                                title="Edit chapter"
                              >
                                <Pencil size={15} />
                              </button>

                              <button
                                className="icon-button small danger-icon"
                                onClick={() => deleteChapter(chapter)}
                                title="Delete chapter"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          )}
                        </div>

                        <h3>{chapter.title}</h3>

                        <p>
                          {chapter.description ||
                            'Tamil பாடல் வினா practice chapter.'}
                        </p>

                        <div className="chapter-card-footer">
                          <span>
                            <FileText size={14} />
                            {chapter.questions?.length || 0} questions
                          </span>

                          <button
                            className="text-action"
                            onClick={() => openChapter(chapter)}
                          >
                            {role === 'teacher' ? 'Manage' : 'Start quiz'}
                            <ChevronRight size={15} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <BookOpen size={25} />
                    </div>

                    <h3>
                      {search ? 'No matching chapters' : 'No chapters yet'}
                    </h3>

                    <p>
                      {role === 'teacher'
                        ? 'Create your first chapter to begin.'
                        : 'Your teacher has not added any chapters yet.'}
                    </p>

                    {role === 'teacher' && !search && (
                      <button
                        className="button primary"
                        onClick={openCreateChapter}
                      >
                        <Plus size={16} /> Create your first chapter
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* TEACHER CHAPTER */}
            {activePage === 'chapter' && activeChapter && role === 'teacher' && (
              <>
                <button
                  className="back-link"
                  onClick={() => {
                    setActivePage('overview');
                    setActiveChapter(null);
                  }}
                >
                  <ArrowLeft size={16} /> Back to overview
                </button>

                <div className="page-heading">
                  <div>
                    <div className="eyebrow">CHAPTER WORKSPACE</div>
                    <h1>{activeChapter.title}</h1>
                    <p>
                      {activeChapter.description || 'Manage this question bank.'}
                    </p>
                  </div>

                  <button
                    className="button secondary"
                    onClick={() => openEditChapter(activeChapter)}
                  >
                    <Pencil size={16} /> Edit chapter
                  </button>
                </div>

                <div className="chapter-summary">
                  <div>
                    <span>Questions in this chapter</span>
                    <strong>{questions.length}</strong>
                  </div>
                  <div className="summary-icon">
                    <ClipboardList size={23} />
                  </div>
                </div>

                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        <Sparkles size={19} /> Generate from textbook
                      </h2>
                      <p>
                        Capture or upload up to 6 pages. Images are compressed
                        before uploading to support mobile devices.
                      </p>
                    </div>
                    <span className="ai-tag">AI GENERATION</span>
                  </div>

                  <div className="upload-actions">
                    <button
                      className="button secondary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={16} /> Choose images
                    </button>

                    <button
                      className="button secondary"
                      onClick={() => startCamera()}
                      disabled={cameraOpen}
                    >
                      <Camera size={16} /> Open camera
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      hidden
                      onChange={handleGallerySelect}
                    />
                  </div>

                  {cameraError && (
                    <div className="alert alert-error camera-alert">
                      <AlertCircle size={16} />
                      {cameraError}
                      <button onClick={() => setCameraError('')}>
                        <X size={15} />
                      </button>
                    </div>
                  )}

                  {cameraOpen && (
                    <div className="camera-panel">
                      <div className="camera-preview">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                        />
                      </div>

                      <div className="camera-controls">
                        <button
                          className="button primary"
                          onClick={capturePhoto}
                        >
                          <Camera size={16} /> Capture page
                        </button>

                        <button
                          className="button secondary"
                          onClick={switchCamera}
                        >
                          <RefreshCw size={16} /> Switch camera
                        </button>

                        <button
                          className="button danger"
                          onClick={stopCamera}
                        >
                          <X size={16} /> Close
                        </button>
                      </div>

                      <p className="camera-hint">
                        Capture multiple pages. The camera stays open between captures.
                      </p>
                    </div>
                  )}

                  {images.length > 0 ? (
                    <div className="image-selection">
                      <div className="image-selection-heading">
                        <strong>{images.length} of 6 pages selected</strong>
                        <button className="text-danger" onClick={clearImages}>
                          Remove all
                        </button>
                      </div>

                      <div className="image-grid">
                        {images.map((item, index) => (
                          <div className="image-preview-card" key={item.id}>
                            <img src={item.url} alt={`Page ${index + 1}`} />
                            <span>Page {index + 1}</span>
                            <button
                              className="image-remove"
                              onClick={() => removeImage(item.id)}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        className="button primary generate-button"
                        onClick={generateQuestions}
                        disabled={loading}
                      >
                        <Sparkles size={17} />
                        {loading ? 'Generating...' : 'Generate and save questions'}
                      </button>

                      {loading && (
                        <p className="progress-text">{progress}</p>
                      )}
                    </div>
                  ) : (
                    <div className="upload-placeholder">
                      <Image size={24} />
                      <strong>No textbook pages selected</strong>
                      <span>Upload images or capture pages with the camera.</span>
                    </div>
                  )}
                </section>

                <div className="section-heading question-list-heading">
                  <div>
                    <h2>Question bank</h2>
                    <p>{questions.length} saved questions</p>
                  </div>

                  <div className="question-toolbar">
                    <button className="button secondary" onClick={openAddQuestion}>
                      <Plus size={16} /> Add question
                    </button>

                    <button
                      className="button secondary"
                      onClick={() => exportPDF(questions, activeChapter.title)}
                      disabled={!questions.length}
                    >
                      <Download size={16} /> Export PDF
                    </button>

                    <button
                      className="button danger-outline"
                      onClick={clearChapterQuestions}
                      disabled={!questions.length}
                    >
                      <Trash2 size={16} /> Clear all
                    </button>
                  </div>
                </div>

                {questions.length ? (
                  <div className="question-list">
                    {questions.map((question, index) => (
                      <article
                        className="question-card"
                        key={question._id || index}
                      >
                        <div className="question-card-top">
                          <span className="question-number">
                            QUESTION {String(index + 1).padStart(2, '0')}
                          </span>

                          <div className="question-actions">
                            <button
                              className="icon-button small"
                              onClick={() => openEditQuestion(question)}
                            >
                              <Pencil size={15} />
                            </button>

                            <button
                              className="icon-button small danger-icon"
                              onClick={() => deleteQuestion(question)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        <h3>{question.questionText}</h3>

                        <div className="option-grid">
                          {question.options?.map((option, optionIndex) => (
                            <div
                              className={`option-display ${optionIndex === question.correctOptionIndex
                                ? 'correct-option'
                                : ''
                                }`}
                              key={optionIndex}
                            >
                              <span>({OPTION_LABELS[optionIndex]})</span>
                              {option}

                              {optionIndex === question.correctOptionIndex && (
                                <Check className="correct-check" size={15} />
                              )}
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state compact">
                    <div className="empty-icon">
                      <CircleHelp size={24} />
                    </div>
                    <h3>No questions in this chapter</h3>
                    <p>
                      Add one manually or generate questions from textbook images.
                    </p>
                    <button className="button primary" onClick={openAddQuestion}>
                      <Plus size={16} /> Add first question
                    </button>
                  </div>
                )}
              </>
            )}

            {/* STUDENT QUIZ */}
            {activePage === 'student-quiz' && activeChapter && role === 'student' && (
              <>
                <button
                  className="back-link"
                  onClick={() => {
                    setActivePage('overview');
                    setActiveChapter(null);
                    resetQuiz();
                  }}
                >
                  <ArrowLeft size={16} /> Back to chapters
                </button>

                <div className="page-heading">
                  <div>
                    <div className="eyebrow">STUDENT PRACTICE</div>
                    <h1>{activeChapter.title}</h1>
                    <p>
                      {activeChapter.description ||
                        'Choose the correct answer for each question.'}
                    </p>
                  </div>

                  <button
                    className="button secondary"
                    onClick={() => exportPDF(questions, activeChapter.title)}
                    disabled={!questions.length}
                  >
                    <Download size={16} /> Export PDF
                  </button>
                </div>

                {questions.length ? (
                  <>
                    <div className="quiz-progress-card">
                      <div>
                        <span>YOUR PROGRESS</span>
                        <strong>
                          {attempted}
                          <small> / {questions.length} answered</small>
                        </strong>
                      </div>

                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${(attempted / questions.length) * 100}%`
                          }}
                        />
                      </div>
                    </div>

                    <div className="student-question-list">
                      {questions.map((question, index) => {
                        const chosen = userAnswers[question._id];
                        const isCorrect =
                          chosen === question.correctOptionIndex;

                        return (
                          <article
                            className="question-card student-question-card"
                            key={question._id || index}
                          >
                            <div className="question-card-top">
                              <span className="question-number">
                                QUESTION {String(index + 1).padStart(2, '0')}
                              </span>

                              {submittedQuiz && (
                                <span
                                  className={`answer-status ${isCorrect ? 'status-correct' : 'status-wrong'
                                    }`}
                                >
                                  {isCorrect ? 'Correct' : 'Incorrect'}
                                </span>
                              )}
                            </div>

                            <h3>{question.questionText}</h3>

                            <div className="student-option-list">
                              {question.options?.map((option, optionIndex) => {
                                const selected = chosen === optionIndex;
                                const correct =
                                  optionIndex === question.correctOptionIndex;

                                let className = 'student-option';

                                if (!submittedQuiz && selected) {
                                  className += ' selected';
                                }

                                if (submittedQuiz && correct) {
                                  className += ' answer-correct';
                                }

                                if (submittedQuiz && selected && !correct) {
                                  className += ' answer-wrong';
                                }

                                return (
                                  <button
                                    key={optionIndex}
                                    className={className}
                                    disabled={submittedQuiz}
                                    onClick={() =>
                                      handleAnswer(question._id, optionIndex)
                                    }
                                  >
                                    <span className="option-letter">
                                      {OPTION_LABELS[optionIndex]}
                                    </span>

                                    <span>{option}</span>

                                    {submittedQuiz && correct && (
                                      <Check size={17} />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </article>
                        );
                      })}
                    </div>

                    {!submittedQuiz ? (
                      <div className="quiz-submit-bar">
                        <div>
                          <strong>
                            {attempted} of {questions.length} answered
                          </strong>
                          <span>Review your choices before submitting.</span>
                        </div>

                        <button className="button primary" onClick={submitQuiz}>
                          Submit quiz <Check size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="result-card">
                        <div className="result-icon">
                          <GraduationCap size={25} />
                        </div>

                        <div className="result-content">
                          <span>QUIZ COMPLETED</span>
                          <h2>
                            {score} <small>/ {questions.length}</small>
                          </h2>
                          <p>
                            You answered {attempted} of {questions.length} questions.
                          </p>
                        </div>

                        <button className="button secondary" onClick={resetQuiz}>
                          <RotateCcw size={16} /> Try again
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <FileText size={24} />
                    </div>
                    <h3>No questions available</h3>
                    <p>This chapter does not have any questions yet.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* CHAPTER MODAL */}
      {chapterModal && (
        <div
          className="modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              setChapterModal(false);
            }
          }}
        >
          <form className="modal" onSubmit={saveChapter}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">
                  {editingChapter ? 'EDIT CHAPTER' : 'NEW CHAPTER'}
                </span>
                <h2>
                  {editingChapter ? 'Update chapter' : 'Create a chapter'}
                </h2>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={() => setChapterModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <label className="form-label">
              Chapter name
              <input
                className="text-input"
                value={chapterTitle}
                onChange={event => setChapterTitle(event.target.value)}
                placeholder="Enter chapter name"
                autoFocus
              />
            </label>

            <label className="form-label">
              Description <span className="optional-label">Optional</span>
              <textarea
                className="text-input textarea"
                value={chapterDescription}
                onChange={event => setChapterDescription(event.target.value)}
                placeholder="Short chapter description..."
                rows={3}
              />
            </label>

            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setChapterModal(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="button primary"
                disabled={loading}
              >
                <Save size={16} /> Save chapter
              </button>
            </div>
          </form>
        </div>
      )}

      {/* QUESTION MODAL */}
      {questionModal && (
        <div
          className="modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              setQuestionModal(false);
            }
          }}
        >
          <form className="modal question-modal" onSubmit={saveQuestion}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">
                  {editingQuestion ? 'EDIT QUESTION' : 'MANUAL ENTRY'}
                </span>
                <h2>
                  {editingQuestion ? 'Update question' : 'Add a question'}
                </h2>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={() => setQuestionModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <label className="form-label">
              Question
              <textarea
                className="text-input textarea"
                rows={3}
                value={questionForm.questionText}
                onChange={event =>
                  setQuestionForm(prev => ({
                    ...prev,
                    questionText: event.target.value
                  }))
                }
                placeholder="Enter the Tamil question..."
                autoFocus
              />
            </label>

            <div className="form-label">Options</div>

            <div className="question-form-options">
              {questionForm.options.map((option, index) => (
                <div className="question-form-option" key={index}>
                  <span className="option-letter">
                    {OPTION_LABELS[index]}
                  </span>

                  <input
                    className="text-input"
                    value={option}
                    onChange={event =>
                      updateOption(index, event.target.value)
                    }
                    placeholder={`Option ${OPTION_LABELS[index]}`}
                  />

                  <label className="correct-radio">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={
                        Number(questionForm.correctOptionIndex) === index
                      }
                      onChange={() =>
                        setQuestionForm(prev => ({
                          ...prev,
                          correctOptionIndex: index
                        }))
                      }
                    />
                    Correct
                  </label>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setQuestionModal(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="button primary"
                disabled={loading}
              >
                <Save size={16} /> Save question
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {confirmModal.open && (
        <div
          className="modal-backdrop confirm-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              closeConfirm();
            }
          }}
        >
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <div className="confirm-modal-top">
              <div className="confirm-icon">
                <Trash2 size={23} />
              </div>

              <button
                type="button"
                className="icon-button confirm-close"
                onClick={closeConfirm}
                disabled={confirmLoading}
                aria-label="Close confirmation"
              >
                <X size={18} />
              </button>
            </div>

            <div className="confirm-content">
              <span className="eyebrow">PLEASE CONFIRM</span>

              <h2 id="confirm-title">
                {confirmModal.title}
              </h2>

              <p>
                {confirmModal.message}
              </p>
            </div>

            <div className="confirm-warning">
              <AlertCircle size={16} />
              <span>This action cannot be undone.</span>
            </div>

            <div className="confirm-actions">
              <button
                type="button"
                className="button secondary"
                onClick={closeConfirm}
                disabled={confirmLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="button danger confirm-delete-button"
                onClick={executeConfirm}
                disabled={confirmLoading}
              >
                {confirmLoading ? (
                  <>
                    <span className="button-spinner" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    {confirmModal.confirmText}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="global-loading">
          <div className="loader" />
          <span>{progress || 'Please wait...'}</span>
        </div>
      )}
    </div>
  );
}

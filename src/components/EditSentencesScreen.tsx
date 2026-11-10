import React, { useState } from 'react';
import {
  ArrowLeft,
  Play,
  Plus,
  Trash2,
  Edit2,
  MoveUp,
  MoveDown,
  Clock,
  Sparkles,
  Download,
  Upload,
  AlertCircle,
  Check,
  RotateCcw,
} from 'lucide-react';
import { Sentence } from '../types';
import { YouTubePlayer, YouTubePlayerHandle } from './YouTubePlayer';
import { SAMPLE_NOTTING_HILL_SENTENCES, VIDEO_START_BOUND, VIDEO_END_BOUND } from '../constants/initialData';

interface EditSentencesScreenProps {
  sentences: Sentence[];
  playerRef: React.RefObject<YouTubePlayerHandle | null>;
  onUpdateSentences: (sentences: Sentence[]) => void;
  onGoBack: () => void;
}

export const EditSentencesScreen: React.FC<EditSentencesScreenProps> = ({
  sentences,
  playerRef,
  onUpdateSentences,
  onGoBack,
}) => {
  // Current editing state
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form Fields
  const [speaker, setSpeaker] = useState('William');
  const [text, setText] = useState('');
  const [korean, setKorean] = useState('');
  const [stressInput, setStressInput] = useState('');
  const [startSec, setStartSec] = useState<string>('24.0');
  const [endSec, setEndSec] = useState<string>('27.0');

  // Import / Export states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);

  // Current video time tracker
  const [liveCurrentTime, setLiveCurrentTime] = useState(24.0);

  // Reset form
  const resetForm = () => {
    setEditingId(null);
    setSpeaker('William');
    setText('');
    setKorean('');
    setStressInput('');
    setStartSec('24.0');
    setEndSec('27.0');
  };

  // Start editing an existing sentence
  const handleEditClick = (sentence: Sentence) => {
    setEditingId(sentence.id);
    setSpeaker(sentence.speaker);
    setText(sentence.text);
    setKorean(sentence.korean || '');
    setStressInput((sentence.stress || []).join(', '));
    setStartSec(sentence.start.toFixed(1));
    setEndSec(sentence.end.toFixed(1));

    // Seek player to start time
    if (playerRef.current) {
      playerRef.current.seekTo(sentence.start);
    }
  };

  // Delete sentence
  const handleDelete = (id: number) => {
    const filtered = sentences.filter((s) => s.id !== id);
    onUpdateSentences(filtered);
    if (editingId === id) resetForm();
  };

  // Move sentence up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const reordered = [...sentences];
    const temp = reordered[index - 1];
    reordered[index - 1] = reordered[index];
    reordered[index] = temp;
    onUpdateSentences(reordered);
  };

  // Move sentence down
  const handleMoveDown = (index: number) => {
    if (index === sentences.length - 1) return;
    const reordered = [...sentences];
    const temp = reordered[index + 1];
    reordered[index + 1] = reordered[index];
    reordered[index] = temp;
    onUpdateSentences(reordered);
  };

  // Set Start = now
  const handleSetStartNow = () => {
    if (!playerRef.current) return;
    const now = playerRef.current.getCurrentTime();
    const rounded = Math.round(now * 10) / 10;
    setStartSec(rounded.toFixed(1));
  };

  // Set End = now
  const handleSetEndNow = () => {
    if (!playerRef.current) return;
    const now = playerRef.current.getCurrentTime();
    const rounded = Math.round(now * 10) / 10;
    setEndSec(rounded.toFixed(1));
  };

  // Test play current segment
  const handleTestSegment = () => {
    if (!playerRef.current) return;
    const start = parseFloat(startSec);
    const end = parseFloat(endSec);
    if (!isNaN(start) && !isNaN(end) && end > start) {
      playerRef.current.playSegment(start, end, false);
    }
  };

  // Form Validation & Warnings
  const startNum = parseFloat(startSec);
  const endNum = parseFloat(endSec);
  const duration = !isNaN(startNum) && !isNaN(endNum) ? endNum - startNum : 0;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const errors: string[] = [];
  const warnings: string[] = [];

  if (isNaN(startNum) || startNum < VIDEO_START_BOUND || startNum > VIDEO_END_BOUND) {
    errors.push(`Start time must be between ${VIDEO_START_BOUND}s and ${VIDEO_END_BOUND}s (0:24 ~ 1:15).`);
  }
  if (isNaN(endNum) || endNum <= startNum) {
    errors.push('End time must be greater than start time.');
  }
  if (endNum > VIDEO_END_BOUND) {
    errors.push(`End time should not exceed ${VIDEO_END_BOUND}s.`);
  }
  if (!text.trim()) {
    errors.push('Please enter English sentence text.');
  }

  // Gentle warnings per PRD: about 1-4 seconds and 3-12 words
  if (duration > 4.5) {
    warnings.push(`Segment duration is ${duration.toFixed(1)}s (1–4 seconds is recommended for easy shadowing).`);
  } else if (duration < 0.8 && duration > 0) {
    warnings.push(`Segment duration is quite short (${duration.toFixed(1)}s).`);
  }

  if (wordCount > 12) {
    warnings.push(`Sentence has ${wordCount} words (3–12 words recommended for shadowing).`);
  } else if (wordCount > 0 && wordCount < 3) {
    warnings.push(`Sentence has only ${wordCount} words.`);
  }

  // Save sentence (create or update)
  const handleSaveSentence = (e: React.FormEvent) => {
    e.preventDefault();
    if (errors.length > 0) return;

    const stressList = stressInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingId !== null) {
      // Update existing
      const updated = sentences.map((s) =>
        s.id === editingId
          ? {
              ...s,
              speaker: speaker.trim() || 'Speaker',
              text: text.trim(),
              korean: korean.trim(),
              stress: stressList,
              start: Math.round(startNum * 10) / 10,
              end: Math.round(endNum * 10) / 10,
            }
          : s
      );
      onUpdateSentences(updated);
      resetForm();
    } else {
      // Add new
      const nextId =
        sentences.length > 0 ? Math.max(...sentences.map((s) => s.id)) + 1 : 1;
      const newSentence: Sentence = {
        id: nextId,
        speaker: speaker.trim() || 'Speaker',
        text: text.trim(),
        korean: korean.trim(),
        stress: stressList,
        start: Math.round(startNum * 10) / 10,
        end: Math.round(endNum * 10) / 10,
      };
      onUpdateSentences([...sentences, newSentence]);
      resetForm();
    }
  };

  // Export JSON to clipboard
  const handleExportJson = () => {
    const jsonString = JSON.stringify(sentences, null, 2);
    navigator.clipboard.writeText(jsonString);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  // Import JSON handler
  const handleImportJson = () => {
    setImportError(null);
    try {
      const parsed = JSON.parse(importJsonText);
      if (!Array.isArray(parsed)) {
        throw new Error('JSON must be an array of sentence objects.');
      }

      // Basic validation
      const validated: Sentence[] = parsed.map((item, idx) => {
        if (!item.text || typeof item.start !== 'number' || typeof item.end !== 'number') {
          throw new Error(`Sentence at index ${idx} is missing required fields (text, start, end).`);
        }
        return {
          id: item.id || idx + 1,
          speaker: item.speaker || 'Speaker',
          text: String(item.text),
          korean: item.korean || '',
          stress: Array.isArray(item.stress) ? item.stress : [],
          start: Number(item.start),
          end: Number(item.end),
        };
      });

      onUpdateSentences(validated);
      setShowImportModal(false);
      setImportJsonText('');
    } catch (e: any) {
      setImportError(e.message || 'Invalid JSON format.');
    }
  };

  // Load Notting Hill screenplay dialogue preset
  const handleLoadSamples = () => {
    if (
      sentences.length === 0 ||
      window.confirm('기존 문장을 대체하고 영화 원본 대본 13문장 대사를 불러오시겠습니까?')
    ) {
      onUpdateSentences(SAMPLE_NOTTING_HILL_SENTENCES);
      resetForm();
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-12 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onGoBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 py-1.5 px-2.5 rounded-lg hover:bg-stone-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back / 돌아가기</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExportJson}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-700 py-1.5 px-2.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 transition-colors"
            title="Export JSON to clipboard"
          >
            {copiedToast ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Download className="w-3.5 h-3.5" />}
            <span>{copiedToast ? 'Copied!' : 'Export JSON'}</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-700 py-1.5 px-2.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 transition-colors"
            title="Import JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON</span>
          </button>
        </div>
      </div>

      {/* Video Player (16:9) with Educational Credit */}
      <div className="w-full">
        <YouTubePlayer
          ref={playerRef}
          onTimeUpdate={(t) => setLiveCurrentTime(t)}
          showCredit={true}
        />
        <div className="flex items-center justify-between text-[11px] text-stone-500 mt-1 px-1">
          <span>Current Video Time: <strong className="font-mono text-stone-800">{liveCurrentTime.toFixed(1)}s</strong></span>
          <span>Target bounds: 24.0s ~ 75.0s</span>
        </div>
      </div>

      {/* Add / Edit Form */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
            <Edit2 className="w-4 h-4 text-emerald-700" />
            <span>{editingId !== null ? 'Edit Sentence / 문장 수정' : 'Add Sentence / 새 문장 추가'}</span>
          </h2>

          {editingId !== null && (
            <button
              onClick={resetForm}
              className="text-xs text-stone-500 hover:text-stone-800 underline"
            >
              Cancel Edit / 취소
            </button>
          )}
        </div>

        <form onSubmit={handleSaveSentence} className="flex flex-col gap-3">
          {/* Speaker Selection */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Speaker / 화자
            </label>
            <div className="flex items-center gap-2">
              {['William', 'Anna', 'Thief'].map((spk) => (
                <button
                  type="button"
                  key={spk}
                  onClick={() => setSpeaker(spk)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    speaker === spk
                      ? 'bg-emerald-700 text-white border-emerald-700 font-bold'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {spk}
                </button>
              ))}
              <input
                type="text"
                value={speaker}
                onChange={(e) => setSpeaker(e.target.value)}
                placeholder="Other speaker..."
                className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:outline-emerald-600"
              />
            </div>
          </div>

          {/* English Text */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              English Sentence / 영어 문장 (3–12 words) *
            </label>
            <input
              type="text"
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Can I help you at all?"
              className="w-full text-sm px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-emerald-600 font-medium"
            />
          </div>

          {/* Korean Meaning */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Korean Meaning / 한국어 해석
            </label>
            <input
              type="text"
              value={korean}
              onChange={(e) => setKorean(e.target.value)}
              placeholder="e.g. 무엇을 좀 도와드릴까요?"
              className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-emerald-600"
            />
          </div>

          {/* Stress Words */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Stress Words / 강세 단어 (쉼표로 구분)
            </label>
            <input
              type="text"
              value={stressInput}
              onChange={(e) => setStressInput(e.target.value)}
              placeholder="e.g. help, all"
              className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-emerald-600"
            />
            <p className="text-[10px] text-stone-400 mt-0.5">
              입력한 단어는 쉐도잉 화면에서 굵은 글씨로 강조되어 발화 타이밍을 안내합니다.
            </p>
          </div>

          {/* Start and End Times with "Set = now" buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Start Time (sec) / 시작초
              </label>
              <input
                type="number"
                step="0.1"
                min="24"
                max="75"
                value={startSec}
                onChange={(e) => setStartSec(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-stone-200 bg-white font-mono font-bold"
              />
              <button
                type="button"
                onClick={handleSetStartNow}
                className="w-full mt-2 min-h-[36px] bg-stone-200/80 hover:bg-stone-300 text-stone-800 rounded-lg text-[11px] font-semibold transition-colors flex items-center justify-center gap-1"
              >
                <Clock className="w-3.5 h-3.5 text-stone-600" />
                <span>Set Start = now ({liveCurrentTime.toFixed(1)}s)</span>
              </button>
            </div>

            <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                End Time (sec) / 종료초
              </label>
              <input
                type="number"
                step="0.1"
                min="24"
                max="75"
                value={endSec}
                onChange={(e) => setEndSec(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-stone-200 bg-white font-mono font-bold"
              />
              <button
                type="button"
                onClick={handleSetEndNow}
                className="w-full mt-2 min-h-[36px] bg-stone-200/80 hover:bg-stone-300 text-stone-800 rounded-lg text-[11px] font-semibold transition-colors flex items-center justify-center gap-1"
              >
                <Clock className="w-3.5 h-3.5 text-stone-600" />
                <span>Set End = now ({liveCurrentTime.toFixed(1)}s)</span>
              </button>
            </div>
          </div>

          {/* Validation Warnings & Errors */}
          {errors.length > 0 && (
            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
              {errors.map((err, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          {warnings.length > 0 && errors.length === 0 && (
            <div className="p-2.5 bg-stone-100 rounded-xl border border-stone-200 text-xs text-stone-600 space-y-1">
              {warnings.map((warn, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons: Test Segment & Save */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleTestSegment}
              className="min-h-[48px] rounded-xl px-3 border border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-stone-700 text-stone-700" />
              <span>Test Segment / 구간 테스트</span>
            </button>

            <button
              type="submit"
              disabled={errors.length > 0}
              className={`min-h-[48px] rounded-xl px-3 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                errors.length === 0
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-xs'
                  : 'bg-stone-300 text-stone-500 cursor-not-allowed'
              }`}
            >
              {editingId !== null ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{editingId !== null ? 'Save Changes / 저장' : 'Add to List / 문장 추가'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Preset Dialogue loader */}
      <div className="flex items-center justify-between p-3 bg-amber-50/70 rounded-xl border border-amber-200/80">
        <div>
          <span className="text-xs font-bold text-amber-950">Notting Hill Screenplay Preset</span>
          <p className="text-[11px] text-amber-800">영화 원본 대본 13문장 대사 세트</p>
        </div>
        <button
          onClick={handleLoadSamples}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Load Preset</span>
        </button>
      </div>

      {/* Current Sentences List */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wide">
          Current Sentences / 현재 문장 목록 ({sentences.length})
        </h3>

        {sentences.length === 0 ? (
          <p className="text-xs text-stone-500 py-3 text-center">
            등록된 문장이 없습니다. 위 입력창에서 추가하세요.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {sentences.map((sentence, idx) => (
              <div
                key={sentence.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-all ${
                  editingId === sentence.id
                    ? 'bg-emerald-50/70 border-emerald-400'
                    : 'bg-white border-stone-200'
                }`}
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <span className="w-5 h-5 rounded-md bg-stone-100 text-stone-700 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase text-stone-500">
                        {sentence.speaker}
                      </span>
                      <span className="text-[10px] font-mono text-stone-400">
                        {sentence.start.toFixed(1)}s ~ {sentence.end.toFixed(1)}s
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-stone-900 truncate mt-0.5">
                      {sentence.text}
                    </p>
                  </div>
                </div>

                {/* Control Actions: Test, Up, Down, Edit, Delete */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      if (playerRef.current) {
                        playerRef.current.playSegment(sentence.start, sentence.end, false);
                      }
                    }}
                    className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-md"
                    title="Play segment"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleMoveUp(idx)}
                    disabled={idx === 0}
                    className="p-1.5 text-stone-500 hover:text-stone-900 disabled:opacity-30 rounded-md"
                    title="Move up"
                  >
                    <MoveUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleMoveDown(idx)}
                    disabled={idx === sentences.length - 1}
                    className="p-1.5 text-stone-500 hover:text-stone-900 disabled:opacity-30 rounded-md"
                    title="Move down"
                  >
                    <MoveDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleEditClick(sentence)}
                    className="p-1.5 text-stone-600 hover:text-emerald-700 hover:bg-stone-100 rounded-md"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(sentence.id)}
                    className="p-1.5 text-stone-400 hover:text-amber-700 hover:bg-stone-100 rounded-md"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-stone-200 shadow-xl flex flex-col gap-3">
            <h3 className="text-sm font-bold text-stone-900">
              Import Sentences JSON / 문장 가져오기
            </h3>
            <p className="text-xs text-stone-500">
              선생님이나 급우가 공유한 JSON 형식의 문장 배열 데이터를 붙여넣으세요.
            </p>

            <textarea
              rows={6}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder='[ { "id": 1, "speaker": "William", "text": "...", "start": 24.5, "end": 27.0 } ]'
              className="w-full text-xs font-mono p-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-emerald-600"
            />

            {importError && (
              <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
                {importError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportError(null);
                }}
                className="px-3 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800"
              >
                Cancel / 취소
              </button>
              <button
                onClick={handleImportJson}
                disabled={!importJsonText.trim()}
                className="px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors"
              >
                Apply Import / 적용하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

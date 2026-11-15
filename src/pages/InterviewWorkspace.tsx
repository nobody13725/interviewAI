import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  HelpCircle,
  Play,
  RotateCcw,
  Send,
  Terminal,
  XCircle,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { apiFetch, difficultyLabel } from '../lib/api';
import type {
  CVConfirmed,
  CodeLanguage,
  CodeRunResult,
  DialogueTurn,
  InterviewSession,
  PositionItem,
  ProblemItem,
  TopicItem,
} from '../types';

interface SessionDetailResponse {
  session: InterviewSession;
  problem: ProblemItem | null;
  position?: PositionItem;
  topic?: TopicItem;
  cv?: CVConfirmed;
  dialogue: DialogueTurn[];
  runs: CodeRunResult[];
}

export const M10InterviewWorkspace: React.FC<{
  sessionId: string;
  onQuotaRefresh: () => void;
  onSessionCompleted: (sessionId: string) => void;
  onBackToSetup: () => void;
}> = ({ sessionId, onQuotaRefresh, onSessionCompleted, onBackToSetup }) => {
  const [data, setData] = useState<SessionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  const [leftTab, setLeftTab] = useState<'chat' | 'problem'>('chat');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<CodeLanguage>('javascript');
  const [draftState, setDraftState] = useState<'SAVED' | 'SAVING' | 'UNSAVED'>('SAVED');

  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [requestingHint, setRequestingHint] = useState(false);
  const [runningSample, setRunningSample] = useState(false);
  const [latestRun, setLatestRun] = useState<CodeRunResult | null>(null);

  const [remainingSec, setRemainingSec] = useState<number>(0);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const autoSubmittedRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadSession = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<SessionDetailResponse>(`/api/user/sessions/${sessionId}`);
      setData(res);
      setCode(res.session.ma_nguon_hien_tai || res.problem?.code_mau[res.session.ngon_ngu] || '');
      setLanguage(res.session.ngon_ngu);
      const sampleRuns = res.runs.filter((r) => r.loai_chay === 'SAMPLE');
      if (sampleRuns.length > 0) setLatestRun(sampleRuns[0]);
      else if (res.runs.length > 0) setLatestRun(res.runs[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải phiên phỏng vấn.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    autoSubmittedRef.current = false;
    loadSession();
  }, [sessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.dialogue.length]);

  // Server-synced countdown timer
  useEffect(() => {
    if (!data?.session || data.session.trang_thai !== 'ACTIVE' || !data.session.het_han_at) return;

    const updateTimer = () => {
      const diffMs = new Date(data.session.het_han_at!).getTime() - Date.now();
      const secs = Math.max(0, Math.floor(diffMs / 1000));
      setRemainingSec(secs);
      if (secs <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        handleFinalSubmit('TIMEOUT');
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [data?.session.trang_thai, data?.session.het_han_at]);

  // Debounced autosave draft
  useEffect(() => {
    if (!data?.session || data.session.trang_thai !== 'ACTIVE') return;
    if (code === data.session.ma_nguon_hien_tai && language === data.session.ngon_ngu) return;

    setDraftState('UNSAVED');
    const t = setTimeout(async () => {
      setDraftState('SAVING');
      try {
        await apiFetch(`/api/user/sessions/${sessionId}/draft`, {
          method: 'PATCH',
          body: JSON.stringify({ ma_nguon_hien_tai: code, ngon_ngu: language }),
        });
        setData((prev) =>
          prev
            ? {
                ...prev,
                session: { ...prev.session, ma_nguon_hien_tai: code, ngon_ngu: language },
              }
            : null
        );
        setDraftState('SAVED');
      } catch {
        setDraftState('UNSAVED');
      }
    }, 900);

    return () => clearTimeout(t);
  }, [code, language]);

  const handleStartSession = async () => {
    setStarting(true);
    setError('');
    try {
      const res = await apiFetch<{ session: InterviewSession; dialogue: DialogueTurn[] }>(
        `/api/user/sessions/${sessionId}/start`,
        { method: 'POST' }
      );
      setData((prev) =>
        prev ? { ...prev, session: res.session, dialogue: res.dialogue } : null
      );
      onQuotaRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể bắt đầu phiên phỏng vấn.');
    } finally {
      setStarting(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || sendingChat) return;
    setSendingChat(true);
    setError('');
    try {
      const res = await apiFetch<{ dialogue: DialogueTurn[] }>(
        `/api/user/sessions/${sessionId}/chat`,
        {
          method: 'POST',
          body: JSON.stringify({ message: chatInput.trim(), code }),
        }
      );
      setData((prev) => (prev ? { ...prev, dialogue: res.dialogue } : null));
      setChatInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi câu trả lời.');
    } finally {
      setSendingChat(false);
    }
  };

  const handleRequestHint = async () => {
    if (requestingHint) return;
    setRequestingHint(true);
    setError('');
    try {
      const res = await apiFetch<{ session: InterviewSession; dialogue: DialogueTurn[] }>(
        `/api/user/sessions/${sessionId}/hint`,
        {
          method: 'POST',
          body: JSON.stringify({ code }),
        }
      );
      setData((prev) =>
        prev ? { ...prev, session: res.session, dialogue: res.dialogue } : null
      );
      setLeftTab('chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo gợi ý.');
    } finally {
      setRequestingHint(false);
    }
  };

  const handleRunSample = async () => {
    if (runningSample) return;
    setRunningSample(true);
    setError('');
    try {
      const res = await apiFetch<{ run: CodeRunResult }>(
        `/api/user/sessions/${sessionId}/run-sample`,
        {
          method: 'POST',
          body: JSON.stringify({ code, language }),
        }
      );
      setLatestRun(res.run);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi chạy thử Test Case mẫu.');
    } finally {
      setRunningSample(false);
    }
  };

  const handleFinalSubmit = async (reason: 'SUBMIT' | 'TIMEOUT' = 'SUBMIT') => {
    setSubmitting(true);
    setError('');
    try {
      await apiFetch(`/api/user/sessions/${sessionId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ code, language, reason }),
      });
      setSubmitModalOpen(false);
      onSessionCompleted(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nộp bài thất bại.');
      setSubmitting(false);
    }
  };

  const lineCount = useMemo(() => Math.max(12, code.split('\n').length), [code]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-[#5A6782]">
        Đang chuẩn bị phòng phỏng vấn...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
        <p className="text-sm text-red-600 font-medium">{error || 'Không tìm thấy phiên phỏng vấn.'}</p>
        <button
          type="button"
          onClick={onBackToSetup}
          className="px-4 py-2 text-sm font-semibold text-white bg-[#5447DC] rounded-lg"
        >
          Quay lại thiết lập
        </button>
      </div>
    );
  }

  const { session, problem, position, topic, cv, dialogue } = data;

  // READY Gate before clock & quota deduction
  if (session.trang_thai === 'READY') {
    return (
      <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div>
          <span className="text-xs font-semibold text-[#5447DC]">
            Trạng thái READY · Chưa tính giờ, chưa trừ lượt
          </span>
          <h2 className="mt-1 font-display text-2xl font-bold text-[#19253C]">
            {problem?.tieu_de}
          </h2>
          <div className="mt-2 flex items-center gap-2 text-xs text-[#5A6782]">
            <span>{position?.ten_vi_tri}</span>
            <span aria-hidden="true">·</span>
            <span>{topic?.ten_chu_de}</span>
            <span aria-hidden="true">·</span>
            <span>{problem ? difficultyLabel(problem.do_kho) : ''}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-[#F4F7FC] border border-slate-200 text-center">
          <div>
            <p className="font-mono text-xl font-bold text-[#19253C] tabular-nums">
              {session.thoi_luong_phut} phút
            </p>
            <p className="text-xs text-[#5A6782] mt-0.5">Thời lượng làm bài</p>
          </div>
          <div>
            <p className="font-mono text-xl font-bold text-[#19253C] tabular-nums">
              {session.gioi_han_goi_y_snapshot} lượt
            </p>
            <p className="text-xs text-[#5A6782] mt-0.5">Giới hạn gợi ý AI</p>
          </div>
          <div>
            <p className="font-mono text-xl font-bold text-[#19253C]">
              {session.ngon_ngu}
            </p>
            <p className="text-xs text-[#5A6782] mt-0.5">Ngôn ngữ mặc định</p>
          </div>
        </div>

        {cv && (
          <div className="p-4 rounded-lg bg-[#F4F7FC] border border-slate-200 text-xs text-[#5A6782]">
            <span className="font-semibold text-[#19253C]">CV đính kèm:</span> {cv.vi_tri_ung_tuyen} ({cv.so_nam_kinh_nghiem} năm KN) — {cv.ky_nang_chinh.join(', ')}
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <p className="text-sm text-[#5A6782] leading-relaxed">
          Khi nhấn <strong>Bắt đầu phỏng vấn</strong>, hệ thống sẽ trừ 1 lượt phỏng vấn trong tháng, bắt đầu đếm ngược thời gian và AI Giám khảo sẽ gửi câu hỏi mở đầu.
        </p>

        <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onBackToSetup}
            className="px-4 py-2.5 text-sm font-medium text-[#19253C] bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Chọn lại bài toán
          </button>
          <button
            type="button"
            disabled={starting}
            onClick={handleStartSession}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7] disabled:opacity-60"
          >
            <Play className="w-4 h-4" />
            <span>{starting ? 'Đang kết nối AI...' : 'Bắt đầu phỏng vấn'}</span>
          </button>
        </div>
      </div>
    );
  }

  if (session.trang_thai === 'COMPLETED') {
    return (
      <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4">
        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
        <h2 className="font-display text-xl font-bold text-[#19253C]">
          Phiên phỏng vấn đã hoàn thành
        </h2>
        <p className="text-sm text-[#5A6782]">
          Bài làm và lịch sử hội thoại của phiên này đã được khóa và lưu vào hồ sơ đánh giá.
        </p>
        <button
          type="button"
          onClick={() => onSessionCompleted(session.id)}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7]"
        >
          Xem báo cáo đánh giá Rubric
        </button>
      </div>
    );
  }

  const hintsRemaining = Math.max(0, session.gioi_han_goi_y_snapshot - session.goi_y_da_dung);

  return (
    <div className="space-y-4">
      {/* Active Session Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-sm sm:text-base font-bold text-[#19253C] truncate">
            {problem?.tieu_de}
          </h2>
          <p className="text-xs text-[#5A6782]">
            {draftState === 'SAVING'
              ? 'Bản nháp chưa nộp · Đang lưu...'
              : draftState === 'UNSAVED'
              ? 'Bản nháp chưa nộp · Chưa đồng bộ'
              : 'Bản nháp chưa nộp · Đã lưu tự động'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-sm font-bold tabular-nums ${
              remainingSec <= 60
                ? 'bg-red-50 border-red-200 text-red-700'
                : remainingSec <= 300
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-[#F4F7FC] border-slate-200 text-[#19253C]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTimer(remainingSec)}</span>
          </div>

          <button
            type="button"
            onClick={() => setSubmitModalOpen(true)}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7] whitespace-nowrap"
          >
            Nộp bài &amp; kết thúc
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Split-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left Pane: AI Interviewer & Problem Spec */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl flex flex-col h-[680px]">
          <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1 p-1 bg-[#F4F7FC] rounded-lg">
              <button
                type="button"
                onClick={() => setLeftTab('chat')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  leftTab === 'chat' ? 'bg-white text-[#19253C] shadow-xs' : 'text-[#5A6782]'
                }`}
              >
                Đối thoại AI ({dialogue.length})
              </button>
              <button
                type="button"
                onClick={() => setLeftTab('problem')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  leftTab === 'problem' ? 'bg-white text-[#19253C] shadow-xs' : 'text-[#5A6782]'
                }`}
              >
                Đề bài &amp; Test mẫu
              </button>
            </div>

            <button
              type="button"
              disabled={hintsRemaining <= 0 || requestingHint}
              onClick={handleRequestHint}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#5447DC] bg-[#5447DC]/10 rounded-lg hover:bg-[#5447DC]/15 disabled:opacity-50 whitespace-nowrap"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>
                {requestingHint ? 'Đang tạo...' : `Gợi ý (${hintsRemaining}/${session.gioi_han_goi_y_snapshot})`}
              </span>
            </button>
          </div>

          {leftTab === 'chat' ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {dialogue.map((turn) => {
                  const isCandidate = turn.vai_tro === 'CANDIDATE';
                  const typeLabel =
                    turn.loai === 'HINT'
                      ? 'Gợi ý định hướng'
                      : turn.loai === 'FEEDBACK'
                      ? 'Nhận xét của AI'
                      : turn.loai === 'ANSWER'
                      ? 'Bạn trả lời'
                      : 'AI Giám khảo';
                  return (
                    <div
                      key={turn.id}
                      className={`p-3.5 rounded-xl border text-sm ${
                        isCandidate
                          ? 'bg-[#5447DC]/5 border-[#5447DC]/20 ml-6'
                          : turn.loai === 'HINT'
                          ? 'bg-amber-50/70 border-amber-200 mr-4'
                          : 'bg-[#F4F7FC] border-slate-200 mr-4'
                      }`}
                    >
                      <p
                        className={`text-[11px] font-semibold mb-1 ${
                          turn.loai === 'HINT'
                            ? 'text-amber-800'
                            : isCandidate
                            ? 'text-[#5447DC]'
                            : 'text-[#19253C]'
                        }`}
                      >
                        {typeLabel}
                      </p>
                      <p className="text-[#19253C] leading-relaxed whitespace-pre-wrap">
                        {turn.noi_dung}
                      </p>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendChat} className="p-3 border-t border-slate-200 flex gap-2 shrink-0">
                <textarea
                  rows={2}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChat(e);
                    }
                  }}
                  placeholder="Trình bày hướng tiếp cận, độ phức tạp Big-O hoặc trả lời câu hỏi..."
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:border-[#5447DC]"
                />
                <button
                  type="submit"
                  disabled={sendingChat || !chatInput.trim()}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7] disabled:opacity-50 self-end inline-flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>{sendingChat ? '...' : 'Gửi'}</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
              <div>
                <h3 className="font-semibold text-[#19253C] mb-1">Mô tả bài toán</h3>
                <p className="text-[#5A6782] leading-relaxed">{problem?.mo_ta_chi_tiet}</p>
              </div>
              <div className="p-3.5 rounded-lg bg-[#F4F7FC] border border-slate-200 text-xs space-y-1">
                <p><strong className="text-[#19253C]">Hàm mục tiêu:</strong> <code className="font-mono">{problem?.ham_muc_tieu}</code></p>
                <p><strong className="text-[#19253C]">Đầu vào:</strong> {problem?.yeu_cau_dau_vao}</p>
                <p><strong className="text-[#19253C]">Đầu ra:</strong> {problem?.yeu_cau_dau_ra}</p>
              </div>
              {problem?.rang_buoc && problem.rang_buoc.length > 0 && (
                <div>
                  <h4 className="font-semibold text-[#19253C] mb-1">Ràng buộc</h4>
                  <ul className="list-disc pl-5 text-xs font-mono text-[#5A6782] space-y-1">
                    {problem.rang_buoc.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <h4 className="font-semibold text-[#19253C] mb-2">Test Case mẫu (Sample)</h4>
                <div className="space-y-2">
                  {(problem?.sample_tests || []).map((tc) => (
                    <div key={tc.id} className="p-3 rounded-lg bg-[#F4F7FC] border border-slate-200 font-mono text-xs">
                      <p className="font-sans font-semibold text-[#19253C]">{tc.ten_test}</p>
                      <p className="mt-1 text-[#5A6782]">Input: <span className="text-[#19253C]">{tc.dau_vao}</span></p>
                      <p className="text-[#5A6782]">Expected: <span className="text-emerald-700">{tc.dau_ra_mong_doi}</span></p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Pane: Code Editor & Sandbox Output */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl flex flex-col h-[680px] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <select
                value={language}
                onChange={(e) => {
                  const nextLang = e.target.value as CodeLanguage;
                  setLanguage(nextLang);
                  if (problem?.code_mau[nextLang] && code.trim() === (problem.code_mau[language] || '').trim()) {
                    setCode(problem.code_mau[nextLang]);
                  }
                }}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white"
              >
                <option value="javascript">JavaScript (Node.js)</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python 3</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  if (problem?.code_mau[language]) setCode(problem.code_mau[language]);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#5A6782] hover:text-[#19253C] border border-slate-200 rounded-lg"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi phục mẫu</span>
              </button>
            </div>

            <button
              type="button"
              disabled={runningSample}
              onClick={handleRunSample}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#19253C] bg-[#F4F7FC] border border-slate-200 rounded-lg hover:border-[#5447DC] disabled:opacity-60 whitespace-nowrap"
            >
              <Terminal className="w-3.5 h-3.5 text-[#5447DC]" />
              <span>{runningSample ? 'Đang chạy...' : 'Chạy thử (Sample)'}</span>
            </button>
          </div>

          {/* Code Editor with line numbers */}
          <div className="flex-1 flex bg-[#19253C] text-slate-100 overflow-hidden min-h-0">
            <div className="py-3 px-3 text-right select-none font-mono text-xs leading-6 text-slate-500 border-r border-slate-700/60 tabular-nums overflow-hidden">
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const el = e.currentTarget;
                  const start = el.selectionStart;
                  const end = el.selectionEnd;
                  const next = code.substring(0, start) + '  ' + code.substring(end);
                  setCode(next);
                  requestAnimationFrame(() => {
                    el.selectionStart = el.selectionEnd = start + 2;
                  });
                }
              }}
              spellCheck={false}
              className="code-editor flex-1 p-3 bg-transparent text-slate-100 font-mono text-xs leading-6 resize-none focus:outline-none overflow-auto"
            />
          </div>

          {/* Sandbox Results Console */}
          <div className="h-[210px] border-t border-slate-200 bg-[#F4F7FC] p-4 overflow-y-auto shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#19253C]">
                Kết quả Sandbox (chỉ chạy Test Sample công khai)
              </span>
              {latestRun && (
                <span
                  className={`text-xs font-mono font-semibold tabular-nums ${
                    latestRun.loi_bien_dich || latestRun.so_test_dat < latestRun.tong_test
                      ? 'text-red-700'
                      : 'text-emerald-700'
                  }`}
                >
                  Đạt {latestRun.so_test_dat}/{latestRun.tong_test} test mẫu
                </span>
              )}
            </div>

            {!latestRun ? (
              <p className="text-xs text-[#5A6782]">
                Nhấn "Chạy thử (Sample)" để kiểm tra logic trên các bộ dữ liệu mẫu trước khi nộp bài.
              </p>
            ) : latestRun.loi_bien_dich ? (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 font-mono text-xs text-red-700 whitespace-pre-wrap">
                {latestRun.loi_bien_dich}
              </div>
            ) : (
              <div className="space-y-2">
                {latestRun.chi_tiet_sample.map((tc) => (
                  <div
                    key={tc.test_case_id}
                    className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      {tc.dat ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <span className="font-semibold text-[#19253C]">{tc.ten_test}</span>
                      <span className={tc.dat ? 'text-emerald-700' : 'text-red-700'}>
                        {tc.dat ? 'Đạt' : 'Chưa đạt'}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-[#5A6782] tabular-nums">
                      Thực tế: <span className="text-[#19253C]">{tc.dau_ra_thuc_te ?? tc.thong_bao_loi}</span> · Kỳ vọng: <span className="text-emerald-700">{tc.dau_ra_mong_doi}</span> · {tc.thoi_gian_ms}ms
                    </div>
                  </div>
                ))}
                {latestRun.stdout && (
                  <pre className="p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-[#19253C] whitespace-pre-wrap">
                    Stdout: {latestRun.stdout}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={submitModalOpen}
        title="Xác nhận nộp bài và kết thúc phiên?"
        description="Sau khi nộp bài, hệ thống sẽ khóa mã nguồn, chạy toàn bộ Test Case (bao gồm Test ẩn) và gọi AI chấm điểm báo cáo Rubric. Bạn không thể chỉnh sửa lại phiên này sau khi xác nhận."
        confirmLabel="Nộp bài & chấm điểm"
        loading={submitting}
        onConfirm={() => handleFinalSubmit('SUBMIT')}
        onCancel={() => setSubmitModalOpen(false)}
      />
    </div>
  );
};

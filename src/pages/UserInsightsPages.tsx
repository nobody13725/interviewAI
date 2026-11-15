import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Code2,
  Eye,
  History,
  Play,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react';
import { apiFetch, difficultyLabel, formatViDate, formatViDateTime } from '../lib/api';
import type {
  CodeRunResult,
  DialogueTurn,
  EvaluationReport,
  InterviewSession,
  ProblemItem,
  RefactorSuggestion,
  ScreenId,
} from '../types';

// ==================== M11: REPORT & REFACTORING ====================
export const M11ReportPage: React.FC<{
  sessionId: string;
  onNavigate: (s: ScreenId) => void;
}> = ({ sessionId, onNavigate }) => {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [problem, setProblem] = useState<ProblemItem | null>(null);
  const [runs, setRuns] = useState<CodeRunResult[]>([]);
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [refactor, setRefactor] = useState<RefactorSuggestion | null>(null);
  const [tab, setTab] = useState<'report' | 'refactor'>('report');
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [generatingRefactor, setGeneratingRefactor] = useState(false);
  const [error, setError] = useState('');

  const loadDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{
        session: InterviewSession;
        problem: ProblemItem | null;
        runs: CodeRunResult[];
        report: EvaluationReport | null;
        refactor: RefactorSuggestion | null;
      }>(`/api/user/sessions/${sessionId}`);
      setSession(res.session);
      setProblem(res.problem);
      setRuns(res.runs);
      setReport(res.report);
      setRefactor(res.refactor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải báo cáo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [sessionId]);

  const handleRetryReport = async () => {
    if (!report) return;
    setRetrying(true);
    setError('');
    try {
      const res = await apiFetch<{ report: EvaluationReport }>(
        `/api/user/reports/${report.id}/retry`,
        { method: 'POST' }
      );
      setReport(res.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Thử lại thất bại.');
    } finally {
      setRetrying(false);
    }
  };

  const handleGenerateRefactor = async () => {
    if (!report) return;
    setGeneratingRefactor(true);
    setError('');
    try {
      const res = await apiFetch<{ refactor: RefactorSuggestion }>(
        `/api/user/reports/${report.id}/refactor`,
        { method: 'POST' }
      );
      setRefactor(res.refactor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể sinh gợi ý tối ưu mã nguồn.');
    } finally {
      setGeneratingRefactor(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-[#5A6782]">
        Đang tải báo cáo đánh giá...
      </div>
    );
  }

  if (!session || !report) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
        <p className="text-sm text-[#5A6782]">{error || 'Phiên này chưa có báo cáo đánh giá.'}</p>
        <button
          type="button"
          onClick={() => onNavigate('M12')}
          className="px-4 py-2 text-sm font-semibold text-white bg-[#5447DC] rounded-lg"
        >
          Về lịch sử phiên
        </button>
      </div>
    );
  }

  const submitRun = runs.find((r) => r.loai_chay === 'SUBMIT');

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#5A6782]">
            <span>{problem?.tieu_de}</span>
            <span aria-hidden="true">·</span>
            <span>Nộp lúc {formatViDateTime(session.ket_thuc_at)}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{session.ngon_ngu}</span>
          </div>
          <h2 className="mt-1 font-display text-xl font-bold text-[#19253C]">
            Báo cáo đánh giá năng lực theo Rubric
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-[#F4F7FC] border border-slate-200 rounded-lg">
            <button
              type="button"
              onClick={() => setTab('report')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                tab === 'report' ? 'bg-white text-[#19253C] shadow-xs' : 'text-[#5A6782]'
              }`}
            >
              Kết quả Rubric
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('refactor');
                if (!refactor && report.trang_thai === 'READY' && !generatingRefactor) {
                  handleGenerateRefactor();
                }
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                tab === 'refactor' ? 'bg-white text-[#19253C] shadow-xs' : 'text-[#5A6782]'
              }`}
            >
              Tối ưu mã nguồn (Refactoring)
            </button>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('M12')}
            className="px-3.5 py-2 text-xs font-semibold text-[#19253C] border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Xem lịch sử
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {report.trang_thai === 'FAILED' && (
        <div className="bg-white border border-red-200 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display text-base font-bold text-red-700">
                Quá trình chấm điểm AI gặp sự cố (FAILED)
              </h3>
              <p className="mt-1 text-sm text-[#5A6782]">
                {report.ly_do_loi || 'Không nhận được phản hồi hợp lệ từ dịch vụ đánh giá.'}
              </p>
              <p className="mt-1 text-xs text-[#5A6782]">
                Hệ thống không hiển thị điểm giả. Mã nguồn đã nộp và kết quả chạy test vẫn được bảo toàn.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={retrying}
            onClick={handleRetryReport}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7] disabled:opacity-60"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{retrying ? 'Đang chấm lại...' : 'Thử đánh giá lại'}</span>
          </button>
        </div>
      )}

      {(report.trang_thai === 'PENDING' || report.trang_thai === 'PROCESSING') && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-[#5A6782]">
          Báo cáo đang ở trạng thái {report.trang_thai}. Nhấn làm mới sau vài giây.
        </div>
      )}

      {report.trang_thai === 'READY' && tab === 'report' && (
        <div className="space-y-6">
          {/* Top Score + Test Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-[#5A6782]">Điểm tổng kết (FR33)</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-4xl font-extrabold text-[#19253C] tabular-nums">
                    {report.diem_tong_ket?.toFixed(1)}
                  </span>
                  <span className="text-sm text-[#5A6782]">/ 100</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#5447DC]">{report.xep_loai}</p>
              </div>

              {submitRun && (
                <div className="mt-6 pt-4 border-t border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#5A6782]">Tổng Test Case đạt</span>
                    <span className="font-mono font-semibold text-[#19253C] tabular-nums">
                      {submitRun.so_test_dat} / {submitRun.tong_test}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5A6782]">Test ẩn (Hidden) đạt</span>
                    <span className="font-mono font-semibold text-[#19253C] tabular-nums">
                      {submitRun.so_hidden_dat ?? 0} / {submitRun.tong_hidden ?? 0}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="font-display text-base font-bold text-[#19253C]">Nhận xét tổng quan</h3>
              <p className="text-sm text-[#5A6782] leading-relaxed">{report.nhan_xet_tong_quan}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-200 text-xs">
                <div>
                  <p className="font-semibold text-emerald-700 mb-1.5">Điểm mạnh</p>
                  <ul className="space-y-1 text-[#5A6782] list-disc pl-4">
                    {(report.diem_manh || []).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-amber-700 mb-1.5">Cần cải thiện</p>
                  <ul className="space-y-1 text-[#5A6782] list-disc pl-4">
                    {(report.diem_yeu || []).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-[#5447DC] mb-1.5">Bước tiếp theo</p>
                  <ul className="space-y-1 text-[#5A6782] list-disc pl-4">
                    {(report.buoc_tiep_theo || []).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Rubric Breakdown Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-display text-base font-bold text-[#19253C]">
                Bảng điểm chi tiết theo tiêu chí Rubric
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F4F7FC] text-xs text-[#5A6782]">
                  <tr>
                    <th className="py-3 px-6 font-semibold">Tiêu chí</th>
                    <th className="py-3 px-4 font-semibold text-right">Trọng số</th>
                    <th className="py-3 px-4 font-semibold text-right">Điểm đạt</th>
                    <th className="py-3 px-6 font-semibold">Nhận xét chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(report.chi_tiet_tieu_chi || []).map((c) => (
                    <tr key={c.tieu_chi_id}>
                      <td className="py-3.5 px-6 font-semibold text-[#19253C]">{c.ten_tieu_chi}</td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#5A6782]">
                        {c.trong_so}%
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums text-[#5447DC]">
                        {c.diem} / {c.diem_toi_da}
                      </td>
                      <td className="py-3.5 px-6 text-xs text-[#5A6782]">{c.nhan_xet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {report.trang_thai === 'READY' && tab === 'refactor' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-base font-bold text-[#19253C]">
                Đề xuất tối ưu hóa mã nguồn (AI Refactoring)
              </h3>
              <p className="text-xs text-[#5A6782] mt-1">
                Phân tích bổ sung độc lập — không làm thay đổi mã nguồn đã nộp hoặc điểm số báo cáo.
              </p>
            </div>
            {!refactor && (
              <button
                type="button"
                disabled={generatingRefactor}
                onClick={handleGenerateRefactor}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7] disabled:opacity-60"
              >
                <Sparkles className="w-4 h-4" />
                <span>{generatingRefactor ? 'Đang phân tích...' : 'Tạo đề xuất tối ưu'}</span>
              </button>
            )}
          </div>

          {generatingRefactor && (
            <p className="text-sm text-[#5A6782] py-6 text-center">
              AI đang phân tích độ phức tạp và cấu trúc mã nguồn của bạn...
            </p>
          )}

          {refactor && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-lg bg-[#F4F7FC] border border-slate-200">
                  <span className="font-semibold text-[#5A6782]">Độ phức tạp ban đầu:</span>
                  <p className="mt-1 font-mono text-[#19253C]">{refactor.do_phuc_tap_truoc}</p>
                </div>
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="font-semibold text-emerald-800">Độ phức tạp sau tối ưu:</span>
                  <p className="mt-1 font-mono text-emerald-900">{refactor.do_phuc_tap_sau}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-[#5A6782] mb-2">Mã nguồn bạn đã nộp</p>
                  <pre className="p-4 rounded-lg bg-[#19253C] text-slate-200 font-mono text-xs leading-relaxed overflow-x-auto">
                    {refactor.ma_nguon_goc}
                  </pre>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#5447DC] mb-2">Mã nguồn đề xuất tối ưu</p>
                  <pre className="p-4 rounded-lg bg-[#19253C] text-emerald-300 font-mono text-xs leading-relaxed overflow-x-auto">
                    {refactor.ma_nguon_toi_uu}
                  </pre>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-[#19253C] mb-2">Các điểm cải tiến chính</h4>
                <ul className="list-disc pl-5 text-sm text-[#5A6782] space-y-1.5">
                  {refactor.giai_thich_cai_tien.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==================== M12: HISTORY & IMMUTABLE REPLAY ====================
export const M12HistoryPage: React.FC<{
  onOpenSession: (sessionId: string) => void;
  onOpenReport: (sessionId: string) => void;
}> = ({ onOpenSession, onOpenReport }) => {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replay, setReplay] = useState<{
    session: InterviewSession;
    dialogue: DialogueTurn[];
    runs: CodeRunResult[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ sessions: InterviewSession[] }>('/api/user/sessions')
      .then((res) => {
        setSessions(res.sessions);
        if (res.sessions.length > 0) setSelectedId(res.sessions[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    apiFetch<{ session: InterviewSession; dialogue: DialogueTurn[]; runs: CodeRunResult[] }>(
      `/api/user/sessions/${selectedId}`
    ).then(setReplay);
  }, [selectedId]);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-[#5A6782]">
        Đang tải lịch sử phiên phỏng vấn...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="font-display text-base font-bold text-[#19253C]">
            Danh sách phiên phỏng vấn ({sessions.length})
          </h2>
        </div>
        {sessions.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#5A6782]">
            Bạn chưa có phiên phỏng vấn nào.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 max-h-[620px] overflow-y-auto">
            {sessions.map((s) => {
              const active = selectedId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left p-4 transition-colors ${
                    active ? 'bg-[#5447DC]/5' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-[#5A6782]">
                    <span>{formatViDate(s.ngay_tao)}</span>
                    <span
                      className={`font-semibold ${
                        s.trang_thai === 'COMPLETED'
                          ? 'text-emerald-700'
                          : s.trang_thai === 'ACTIVE'
                          ? 'text-[#5447DC]'
                          : 'text-amber-700'
                      }`}
                    >
                      {s.trang_thai}
                    </span>
                  </div>
                  <p className="mt-1 font-display text-sm font-bold text-[#19253C]">
                    {s.problem_title}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between text-xs text-[#5A6782]">
                    <span>{s.position_name} · {s.ngon_ngu}</span>
                    {s.report_score !== null && s.report_score !== undefined && (
                      <span className="font-mono font-bold text-[#5447DC] tabular-nums">
                        {s.report_score.toFixed(1)} / 100
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="lg:col-span-7">
        {replay ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <p className="text-xs text-[#5A6782]">
                  Bản ghi phiên phỏng vấn (chỉ đọc) · {formatViDateTime(replay.session.ngay_tao)}
                </p>
                <h3 className="font-display text-lg font-bold text-[#19253C]">
                  {sessions.find((x) => x.id === replay.session.id)?.problem_title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {(replay.session.trang_thai === 'READY' || replay.session.trang_thai === 'ACTIVE') && (
                  <button
                    type="button"
                    onClick={() => onOpenSession(replay.session.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7]"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{replay.session.trang_thai === 'READY' ? 'Bắt đầu ngay' : 'Tiếp tục phiên'}</span>
                  </button>
                )}
                {replay.session.trang_thai === 'COMPLETED' && (
                  <button
                    type="button"
                    onClick={() => onOpenReport(replay.session.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem báo cáo Rubric</span>
                  </button>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-[#19253C] mb-2">
                Dòng thời gian hội thoại ({replay.dialogue.length} lượt)
              </h4>
              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {replay.dialogue.length === 0 ? (
                  <p className="text-xs text-[#5A6782]">Chưa có lượt trao đổi nào.</p>
                ) : (
                  replay.dialogue.map((d) => (
                    <div key={d.id} className="p-3 rounded-lg bg-[#F4F7FC] border border-slate-200 text-xs">
                      <div className="flex justify-between font-semibold text-[#19253C] mb-1">
                        <span>{d.vai_tro === 'CANDIDATE' ? 'Ứng viên' : `AI (${d.loai})`}</span>
                        <span className="font-mono text-[11px] text-[#5A6782]">{formatViDateTime(d.thoi_gian)}</span>
                      </div>
                      <p className="text-[#5A6782] leading-relaxed">{d.noi_dung}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-[#19253C] mb-2">Mã nguồn lưu trữ trong phiên</h4>
              <pre className="p-4 rounded-lg bg-[#19253C] text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto max-h-[200px]">
                {replay.session.ma_nguon_da_nop || replay.session.ma_nguon_hien_tai}
              </pre>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-[#5A6782]">
            <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p>Chọn một phiên phỏng vấn bên trái để xem lại toàn bộ bản ghi.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== M13: PERSONAL COMPETENCY ANALYTICS ====================
export const M13AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<{
    timeline: Array<{
      report_id: string;
      session_id: string;
      date: string;
      problem_title: string;
      difficulty: 'EASY' | 'MEDIUM' | 'HARD';
      score: number;
      grade: string;
      rubric_version: number;
    }>;
    criteriaAverages: Array<{ name: string; avgPercent: number; count: number }>;
    summary: {
      completedReports: number;
      avgScore: number;
      highestScore: number;
      rubricVersionsUsed: number[];
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/user/analytics')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-[#5A6782]">
        Đang tổng hợp dữ liệu năng lực cá nhân...
      </div>
    );
  }

  const pts = data.timeline;
  const chartW = 640;
  const chartH = 200;
  const pad = 28;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-[#5A6782]">Báo cáo hoàn tất (READY)</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#19253C] tabular-nums">
            {data.summary.completedReports}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-[#5A6782]">Điểm trung bình</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#5447DC] tabular-nums">
            {data.summary.avgScore.toFixed(1)} / 100
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-[#5A6782]">Điểm cao nhất</p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
            {data.summary.highestScore.toFixed(1)} / 100
          </p>
        </div>
      </div>

      {data.summary.rubricVersionsUsed.length > 1 && (
        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
          Lưu ý đối chiếu: Dữ liệu tổng hợp qua nhiều phiên bản Rubric ({data.summary.rubricVersionsUsed.map((v) => `v${v}`).join(', ')}).
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-display text-base font-bold text-[#19253C]">
            Xu hướng điểm số qua các phiên đã chấm
          </h3>
          {pts.length === 0 ? (
            <p className="mt-6 text-sm text-[#5A6782]">Chưa có báo cáo READY để vẽ biểu đồ.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-52">
                {[0, 25, 50, 75, 100].map((val) => {
                  const y = chartH - pad - (val / 100) * (chartH - 2 * pad);
                  return (
                    <g key={val}>
                      <line x1={pad} y1={y} x2={chartW - pad} y2={y} stroke="#E2E8F0" strokeDasharray="3 3" />
                      <text x={4} y={y + 4} fontSize="10" fill="#5A6782" fontFamily="JetBrains Mono">
                        {val}
                      </text>
                    </g>
                  );
                })}
                {pts.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#5447DC"
                    strokeWidth="2.5"
                    points={pts
                      .map((p, i) => {
                        const x = pad + (i / (pts.length - 1)) * (chartW - 2 * pad);
                        const y = chartH - pad - (p.score / 100) * (chartH - 2 * pad);
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />
                )}
                {pts.map((p, i) => {
                  const x = pts.length === 1 ? chartW / 2 : pad + (i / (pts.length - 1)) * (chartW - 2 * pad);
                  const y = chartH - pad - (p.score / 100) * (chartH - 2 * pad);
                  return (
                    <g key={p.report_id}>
                      <circle cx={x} cy={y} r="5" fill="#5447DC" stroke="#FFFFFF" strokeWidth="2" />
                      <text
                        x={x}
                        y={y - 10}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="600"
                        fill="#19253C"
                        fontFamily="JetBrains Mono"
                      >
                        {p.score.toFixed(1)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-display text-base font-bold text-[#19253C]">
            Trung bình theo trụ cột Rubric
          </h3>
          <div className="mt-4 space-y-4">
            {data.criteriaAverages.map((c) => (
              <div key={c.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#19253C]">{c.name}</span>
                  <span className="font-mono font-semibold text-[#5447DC] tabular-nums">
                    {c.avgPercent}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#F4F7FC] overflow-hidden border border-slate-200">
                  <div className="h-full bg-[#5447DC]" style={{ width: `${c.avgPercent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Equivalent Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-display text-base font-bold text-[#19253C]">
            Bảng dữ liệu chi tiết các phiên đánh giá
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F4F7FC] text-xs text-[#5A6782]">
              <tr>
                <th className="py-3 px-6 font-semibold">Ngày hoàn thành</th>
                <th className="py-3 px-6 font-semibold">Bài toán</th>
                <th className="py-3 px-4 font-semibold">Độ khó</th>
                <th className="py-3 px-4 font-semibold text-right">Rubric</th>
                <th className="py-3 px-6 font-semibold text-right">Điểm tổng kết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {pts.map((row) => (
                <tr key={row.report_id}>
                  <td className="py-3 px-6 text-xs text-[#5A6782] font-mono tabular-nums">
                    {formatViDate(row.date)}
                  </td>
                  <td className="py-3 px-6 font-medium text-[#19253C]">{row.problem_title}</td>
                  <td className="py-3 px-4 text-xs text-[#5A6782]">{difficultyLabel(row.difficulty)}</td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-[#5A6782]">
                    v{row.rubric_version}
                  </td>
                  <td className="py-3 px-6 text-right font-mono font-bold text-[#5447DC] tabular-nums">
                    {row.score.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==================== M14: BUG & FEEDBACK SUBMISSION ====================
export const M14FeedbackPage: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [type, setType] = useState('BUG_SANDBOX');
  const [sessionId, setSessionId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const loadAll = async () => {
    const [fb, sess] = await Promise.all([
      apiFetch<{ feedback: any[] }>('/api/user/feedback'),
      apiFetch<{ sessions: InterviewSession[] }>('/api/user/sessions'),
    ]);
    setList(fb.feedback);
    setSessions(sess.sessions);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg('');
    setErr('');
    try {
      const linked = sessions.find((s) => s.id === sessionId);
      await apiFetch('/api/user/feedback', {
        method: 'POST',
        body: JSON.stringify({
          loai_phan_hoi: type,
          phien_id: sessionId || undefined,
          bai_toan_id: linked?.bai_toan_id || undefined,
          tieu_de: title,
          noi_dung: content,
        }),
      });
      setTitle('');
      setContent('');
      setSessionId('');
      setMsg('Đã gửi phản hồi tới đội ngũ quản trị.');
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gửi phản hồi thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <form onSubmit={handleSubmit} className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h2 className="font-display text-lg font-bold text-[#19253C]">Gửi báo lỗi hoặc góp ý</h2>
        {msg && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
            {msg}
          </div>
        )}
        {err && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
            {err}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[#19253C] mb-1.5">Phân loại</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="BUG_SANDBOX">Lỗi Sandbox / Thực thi mã</option>
            <option value="AI_FEEDBACK">Phản hồi về câu hỏi / chấm điểm AI</option>
            <option value="CONTENT_ISSUE">Sai sót đề bài / Test Case</option>
            <option value="FEATURE_REQUEST">Đề xuất cải tiến tính năng</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#19253C] mb-1.5">
            Gắn với phiên phỏng vấn (tùy chọn)
          </label>
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="">Không gắn phiên cụ thể</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.problem_title} ({formatViDate(s.ngay_tao)})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#19253C] mb-1.5">Tiêu đề</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Mô tả ngắn gọn vấn đề..."
            className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#19253C] mb-1.5">Chi tiết</label>
          <textarea
            rows={4}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Mô tả bước tái hiện hoặc đề xuất cụ thể..."
            className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7] disabled:opacity-60"
        >
          <Send className="w-4 h-4" />
          <span>{submitting ? 'Đang gửi...' : 'Gửi phản hồi'}</span>
        </button>
      </form>

      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-display text-base font-bold text-[#19253C] mb-4">
          Phản hồi đã gửi ({list.length})
        </h3>
        {list.length === 0 ? (
          <p className="text-sm text-[#5A6782]">Bạn chưa gửi phản hồi nào.</p>
        ) : (
          <div className="space-y-3">
            {list.map((fb) => (
              <div key={fb.id} className="p-4 rounded-xl bg-[#F4F7FC] border border-slate-200 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[#19253C]">{fb.tieu_de}</span>
                  <span
                    className={`font-semibold ${
                      fb.trang_thai === 'RESOLVED'
                        ? 'text-emerald-700'
                        : fb.trang_thai === 'IN_REVIEW'
                        ? 'text-[#5447DC]'
                        : fb.trang_thai === 'DISMISSED'
                        ? 'text-[#5A6782]'
                        : 'text-amber-700'
                    }`}
                  >
                    {fb.trang_thai}
                  </span>
                </div>
                <p className="text-xs text-[#5A6782]">{fb.noi_dung}</p>
                {fb.ghi_chu_xu_ly && (
                  <p className="text-xs text-[#19253C] pt-2 border-t border-slate-200">
                    <strong>Phản hồi từ Admin:</strong> {fb.ghi_chu_xu_ly}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

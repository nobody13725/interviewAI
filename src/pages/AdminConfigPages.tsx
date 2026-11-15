import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { apiFetch, formatViDateTime } from '../lib/api';
import type {
  DifficultyLevel,
  FeedbackStatus,
  PositionItem,
  PublishStatus,
  ScreenId,
  ServiceTier,
  TopicItem,
} from '../types';

// ==================== M20: AI CONTENT GENERATOR & APPROVAL ====================
export const M20AiContentPage: React.FC<{
  onNavigate: (s: ScreenId) => void;
}> = ({ onNavigate }) => {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [posId, setPosId] = useState('');
  const [topId, setTopId] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('MEDIUM');
  const [promptReq, setPromptReq] = useState('');
  const [activeDraft, setActiveDraft] = useState<any | null>(null);
  const [checklist, setChecklist] = useState({ spec: false, tests: false, code: false });
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    const res = await apiFetch<{ drafts: any[]; positions: PositionItem[]; topics: TopicItem[] }>(
      '/api/admin/ai-drafts'
    );
    setDrafts(res.drafts);
    setPositions(res.positions);
    setTopics(res.topics);
    if (!posId && res.positions.length > 0) setPosId(res.positions[0].id);
    if (!topId && res.topics.length > 0) setTopId(res.topics[0].id);
  };

  useEffect(() => {
    load();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setErr('');
    setMsg('');
    try {
      const res = await apiFetch<{ draft: any }>('/api/admin/ai-drafts/generate', {
        method: 'POST',
        body: JSON.stringify({
          vi_tri_id: posId,
          chu_de_id: topId,
          do_kho: difficulty,
          yeu_cau_prompt: promptReq,
        }),
      });
      setActiveDraft(res.draft);
      setChecklist({ spec: false, tests: false, code: false });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Sinh nháp bài toán thất bại.');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!activeDraft) return;
    setApproving(true);
    setErr('');
    try {
      await apiFetch(`/api/admin/ai-drafts/${activeDraft.id}/approve`, {
        method: 'PUT',
        body: JSON.stringify({ du_lieu_nhap: activeDraft.du_lieu_nhap }),
      });
      setMsg('Đã lưu bản nháp đã duyệt vào Ngân hàng bài toán (trạng thái DRAFT). Bạn có thể phát hành tại M18.');
      await load();
      setActiveDraft((prev: any) => (prev ? { ...prev, trang_thai: 'APPROVED' } : null));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Lỗi phê duyệt bản nháp.');
    } finally {
      setApproving(false);
    }
  };

  const readyToApprove = checklist.spec && checklist.tests && checklist.code;

  return (
    <div className="space-y-6">
      {err && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
          {err}
        </div>
      )}
      {msg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700 flex items-center justify-between">
          <span>{msg}</span>
          <button type="button" onClick={() => onNavigate('M18')} className="font-semibold underline">
            Mở M18 để phát hành
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-5">
          <form onSubmit={handleGenerate} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h2 className="font-display text-base font-bold text-[#19253C]">
              Sinh bản nháp bài toán bằng AI
            </h2>
            <div>
              <label className="block text-xs font-semibold text-[#19253C] mb-1">Vị trí</label>
              <select
                value={posId}
                onChange={(e) => setPosId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>{p.ten_vi_tri}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#19253C] mb-1">Chủ đề</label>
              <select
                value={topId}
                onChange={(e) => setTopId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>{t.ten_chu_de}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#19253C] mb-1">Độ khó</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="EASY">Cơ bản</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HARD">Nâng cao</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#19253C] mb-1">Yêu cầu trọng tâm</label>
              <textarea
                rows={3}
                value={promptReq}
                onChange={(e) => setPromptReq(e.target.value)}
                placeholder="Ví dụ: Bài toán hàng đợi xử lý task ưu tiên, độ phức tạp O(n log n)..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <button
              type="submit"
              disabled={generating}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7] disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              <span>{generating ? 'AI đang sinh đề...' : 'Sinh nháp bài toán'}</span>
            </button>
          </form>

          {drafts.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-[#19253C] mb-3">Bản nháp đã sinh ({drafts.length})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {drafts.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setActiveDraft(d);
                      setChecklist({ spec: false, tests: false, code: false });
                    }}
                    className={`w-full text-left p-3 rounded-lg border text-xs ${
                      activeDraft?.id === d.id
                        ? 'border-[#5447DC] bg-[#5447DC]/5'
                        : 'border-slate-200 bg-[#F4F7FC]'
                    }`}
                  >
                    <p className="font-semibold text-[#19253C] truncate">
                      {d.du_lieu_nhap?.tieu_de || 'Bản nháp'}
                    </p>
                    <p className="text-[#5A6782] mt-0.5">
                      {d.trang_thai === 'APPROVED' ? 'Đã duyệt' : 'Chưa duyệt'} · {formatViDateTime(d.ngay_tao)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6">
          {activeDraft?.du_lieu_nhap ? (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="text-xs font-semibold text-amber-700">
                    {activeDraft.trang_thai === 'APPROVED' ? 'Đã lưu DRAFT vào ngân hàng' : 'Chưa duyệt — Kiểm tra trước khi lưu'}
                  </span>
                  <h3 className="font-display text-lg font-bold text-[#19253C]">
                    {activeDraft.du_lieu_nhap.tieu_de}
                  </h3>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A6782] mb-1">Tiêu đề (có thể chỉnh sửa)</label>
                <input
                  type="text"
                  value={activeDraft.du_lieu_nhap.tieu_de}
                  onChange={(e) =>
                    setActiveDraft({
                      ...activeDraft,
                      du_lieu_nhap: { ...activeDraft.du_lieu_nhap, tieu_de: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A6782] mb-1">Mô tả chi tiết</label>
                <textarea
                  rows={4}
                  value={activeDraft.du_lieu_nhap.mo_ta_chi_tiet}
                  onChange={(e) =>
                    setActiveDraft({
                      ...activeDraft,
                      du_lieu_nhap: { ...activeDraft.du_lieu_nhap, mo_ta_chi_tiet: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-[#19253C] mb-2">
                  Test Cases AI đề xuất ({activeDraft.du_lieu_nhap.test_cases?.length || 0})
                </p>
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {(activeDraft.du_lieu_nhap.test_cases || []).map((tc: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-[#F4F7FC] border border-slate-200 font-mono text-xs">
                      <span className="font-sans font-semibold text-[#19253C]">{tc.ten_test}</span> ({tc.loai}):{' '}
                      {tc.dau_vao} → {tc.dau_ra_mong_doi}
                    </div>
                  ))}
                </div>
              </div>

              {activeDraft.trang_thai !== 'APPROVED' && (
                <div className="pt-4 border-t border-slate-200 space-y-2.5">
                  <p className="text-xs font-semibold text-[#19253C]">Checklist kiểm duyệt bắt buộc:</p>
                  <label className="flex items-center gap-2 text-xs text-[#5A6782]">
                    <input
                      type="checkbox"
                      checked={checklist.spec}
                      onChange={(e) => setChecklist({ ...checklist, spec: e.target.checked })}
                    />
                    <span>Đã kiểm tra đề bài và ràng buộc kỹ thuật chính xác</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[#5A6782]">
                    <input
                      type="checkbox"
                      checked={checklist.tests}
                      onChange={(e) => setChecklist({ ...checklist, tests: e.target.checked })}
                    />
                    <span>Đã rà soát định dạng JSON của Test Sample &amp; Hidden</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[#5A6782]">
                    <input
                      type="checkbox"
                      checked={checklist.code}
                      onChange={(e) => setChecklist({ ...checklist, code: e.target.checked })}
                    />
                    <span>Đã xác nhận chữ ký hàm mục tiêu đồng nhất</span>
                  </label>

                  <button
                    type="button"
                    disabled={!readyToApprove || approving}
                    onClick={handleApprove}
                    className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7] disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{approving ? 'Đang lưu...' : 'Lưu đã duyệt (tạo bài DRAFT)'}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-[#5A6782]">
              Chọn tham số bên trái và nhấn <strong>Sinh nháp bài toán</strong> để AI tạo đề mẫu kiểm duyệt.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== M21: PROMPT TEMPLATES VERSIONING ====================
export const M21PromptsPage: React.FC = () => {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [sysContent, setSysContent] = useState('');
  const [usrContent, setUsrContent] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    const res = await apiFetch<{ prompts: any[]; versions: any[] }>('/api/admin/prompts');
    setPrompts(res.prompts);
    setVersions(res.versions);
    const firstId = selectedPromptId || res.prompts[0]?.id || '';
    if (firstId) {
      setSelectedPromptId(firstId);
      const tpl = res.prompts.find((p) => p.id === firstId);
      const curVer = res.versions.find((v) => v.id === tpl?.phien_ban_hien_hanh_id);
      if (curVer) {
        setSysContent(curVer.noi_dung_system);
        setUsrContent(curVer.noi_dung_user_template);
      }
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectPrompt = (id: string) => {
    setSelectedPromptId(id);
    setMsg('');
    const tpl = prompts.find((p) => p.id === id);
    const curVer = versions.find((v) => v.id === tpl?.phien_ban_hien_hanh_id);
    if (curVer) {
      setSysContent(curVer.noi_dung_system);
      setUsrContent(curVer.noi_dung_user_template);
      setChangeNote('');
    }
  };

  const handlePublishNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    await apiFetch(`/api/admin/prompts/${selectedPromptId}/versions`, {
      method: 'POST',
      body: JSON.stringify({
        noi_dung_system: sysContent,
        noi_dung_user_template: usrContent,
        mo_ta_thay_doi: changeNote || 'Cập nhật nội dung Prompt',
      }),
    });
    setChangeNote('');
    setMsg('Đã phát hành phiên bản Prompt mới. Các phiên bản cũ được lưu bất biến.');
    await load();
  };

  const promptVersions = versions
    .filter((v) => v.prompt_id === selectedPromptId)
    .sort((a, b) => b.so_phien_ban - a.so_phien_ban);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="font-display text-base font-bold text-[#19253C]">Mẫu Prompt hệ thống</h2>
        </div>
        <div className="divide-y divide-slate-200">
          {prompts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => selectPrompt(p.id)}
              className={`w-full text-left p-4 transition-colors ${
                selectedPromptId === p.id ? 'bg-[#5447DC]/5' : 'hover:bg-slate-50'
              }`}
            >
              <p className="font-mono text-xs text-[#5447DC] font-semibold">{p.ma_prompt}</p>
              <p className="text-sm font-semibold text-[#19253C] mt-0.5">{p.ten_prompt}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-8 space-y-5">
        <form onSubmit={handlePublishNewVersion} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="font-display text-base font-bold text-[#19253C]">
            Phát hành phiên bản Prompt mới (bất biến phiên bản cũ)
          </h3>
          {msg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
              {msg}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-[#19253C] mb-1">System Instruction</label>
            <textarea
              rows={4}
              required
              value={sysContent}
              onChange={(e) => setSysContent(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#19253C] mb-1">User Prompt Template</label>
            <textarea
              rows={2}
              value={usrContent}
              onChange={(e) => setUsrContent(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#19253C] mb-1">Ghi chú thay đổi</label>
            <input
              type="text"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="Ví dụ: Tăng độ chặt chẽ khi nhắc độ phức tạp bộ nhớ..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7]"
          >
            Phát hành phiên bản mới
          </button>
        </form>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h4 className="text-xs font-semibold text-[#19253C] mb-3">
            Lịch sử phiên bản ({promptVersions.length})
          </h4>
          <div className="space-y-2.5">
            {promptVersions.map((v) => (
              <div key={v.id} className="p-3.5 rounded-lg bg-[#F4F7FC] border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between font-semibold text-[#19253C]">
                  <span className="font-mono">Phiên bản v{v.so_phien_ban} · {v.trang_thai}</span>
                  <span className="text-[#5A6782]">{formatViDateTime(v.ngay_tao)}</span>
                </div>
                <p className="text-[#5A6782]">{v.mo_ta_thay_doi}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== M22: RUBRICS & WEIGHT VALIDATION ====================
export const M22RubricsPage: React.FC = () => {
  const [rubric, setRubric] = useState<any | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    const res = await apiFetch<{ rubrics: any[]; versions: any[] }>('/api/admin/rubrics');
    const main = res.rubrics[0] || null;
    setRubric(main);
    setVersions(res.versions);
    const activeVer = res.versions.find((v) => v.id === main?.phien_ban_hien_hanh_id) || res.versions[0];
    if (activeVer) {
      setCriteria(activeVer.tieu_chi.map((c: any) => ({ ...c })));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totalWeight = criteria.reduce((sum, c) => sum + Number(c.trong_so || 0), 0);

  const handleAddCriterion = () => {
    setCriteria([
      ...criteria,
      {
        id: `crit_${Date.now()}`,
        ten_tieu_chi: 'Tiêu chí mới',
        mo_ta: '',
        trong_so: 0,
        diem_toi_da: 10,
      },
    ]);
  };

  const handlePublish = async (publishNow: boolean) => {
    if (!rubric) return;
    setErr('');
    setMsg('');
    try {
      await apiFetch(`/api/admin/rubrics/${rubric.id}/versions`, {
        method: 'POST',
        body: JSON.stringify({ tieu_chi: criteria, publish_now: publishNow }),
      });
      setMsg(publishNow ? 'Đã phát hành phiên bản Rubric mới (Tổng trọng số = 100%).' : 'Đã lưu nháp Rubric.');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Lỗi lưu Rubric.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="font-display text-lg font-bold text-[#19253C]">{rubric?.ten_rubric}</h2>
            <p className="text-xs text-[#5A6782] mt-1">{rubric?.mo_ta}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`font-mono text-sm font-bold tabular-nums ${
                Math.abs(totalWeight - 100) < 0.001 ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              Tổng trọng số: {totalWeight}% / 100%
            </span>
          </div>
        </div>

        {err && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
            {err}
          </div>
        )}
        {msg && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
            {msg}
          </div>
        )}

        <div className="space-y-3">
          {criteria.map((c, idx) => (
            <div key={c.id} className="p-4 rounded-lg bg-[#F4F7FC] border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-4">
                <label className="block text-[11px] font-semibold text-[#5A6782] mb-1">Tên tiêu chí</label>
                <input
                  type="text"
                  value={c.ten_tieu_chi}
                  onChange={(e) => {
                    const next = [...criteria];
                    next[idx].ten_tieu_chi = e.target.value;
                    setCriteria(next);
                  }}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div className="md:col-span-4">
                <label className="block text-[11px] font-semibold text-[#5A6782] mb-1">Mô tả chấm điểm</label>
                <input
                  type="text"
                  value={c.mo_ta}
                  onChange={(e) => {
                    const next = [...criteria];
                    next[idx].mo_ta = e.target.value;
                    setCriteria(next);
                  }}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-[#5A6782] mb-1">Trọng số (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={c.trong_so}
                  onChange={(e) => {
                    const next = [...criteria];
                    next[idx].trong_so = Number(e.target.value) || 0;
                    setCriteria(next);
                  }}
                  className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div className="md:col-span-2 flex items-end justify-end gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold text-[#5A6782] mb-1">Thang điểm</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={c.diem_toi_da}
                    onChange={(e) => {
                      const next = [...criteria];
                      next[idx].diem_toi_da = Number(e.target.value) || 10;
                      setCriteria(next);
                    }}
                    className="w-full px-2.5 py-1.5 text-sm font-mono bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setCriteria(criteria.filter((_, i) => i !== idx))}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  aria-label="Xóa tiêu chí"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={handleAddCriterion}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#19253C] border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm tiêu chí</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePublish(false)}
              className="px-4 py-2 text-sm font-medium text-[#19253C] border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Lưu bản nháp
            </button>
            <button
              type="button"
              onClick={() => handlePublish(true)}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7]"
            >
              Phát hành Rubric mới
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-sm font-bold text-[#19253C] mb-3">
          Các phiên bản Rubric ({versions.length})
        </h3>
        <div className="space-y-2">
          {versions
            .slice()
            .sort((a, b) => b.so_phien_ban - a.so_phien_ban)
            .map((v) => (
              <div key={v.id} className="p-3 rounded-lg bg-[#F4F7FC] border border-slate-200 flex items-center justify-between text-xs">
                <span className="font-mono font-semibold text-[#19253C]">
                  Rubric v{v.so_phien_ban} · {v.trang_thai} · {v.tieu_chi.length} tiêu chí
                </span>
                <span className="text-[#5A6782]">{formatViDateTime(v.ngay_tao)}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

// ==================== M23: SERVICE TIERS & QUOTAS ====================
export const M23TiersPage: React.FC = () => {
  const [tiers, setTiers] = useState<ServiceTier[]>([]);
  const [editing, setEditing] = useState<ServiceTier | null>(null);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const res = await apiFetch<{ tiers: ServiceTier[] }>('/api/admin/tiers');
    setTiers(res.tiers);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    await apiFetch(`/api/admin/tiers/${editing.id}`, {
      method: 'PUT',
      body: JSON.stringify(editing),
    });
    setMsg(`Đã cập nhật thông số gói "${editing.ten_goi}".`);
    setEditing(null);
    await load();
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-[#5A6782]">
        Cấu hình thông tin hiển thị và hạn mức sử dụng các gói dịch vụ (hệ thống không tích hợp cổng thanh toán trực tuyến).
      </p>

      {msg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
          {msg}
        </div>
      )}

      {editing && (
        <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="font-display text-base font-bold text-[#19253C]">
            Chỉnh sửa gói: {editing.ten_goi}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#19253C] mb-1">Giá hiển thị</label>
              <input
                type="text"
                value={editing.gia_hien_thi}
                onChange={(e) => setEditing({ ...editing, gia_hien_thi: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#19253C] mb-1">Lượt phỏng vấn / tháng</label>
              <input
                type="number"
                min={1}
                value={editing.so_luot_phong_van_thang}
                onChange={(e) =>
                  setEditing({ ...editing, so_luot_phong_van_thang: Number(e.target.value) || 1 })
                }
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#19253C] mb-1">Giới hạn gợi ý / phiên</label>
              <input
                type="number"
                min={0}
                value={editing.gioi_han_goi_y_phien}
                onChange={(e) =>
                  setEditing({ ...editing, gioi_han_goi_y_phien: Number(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#19253C] mb-1">Trạng thái</label>
              <select
                value={editing.trang_thai}
                onChange={(e) => setEditing({ ...editing, trang_thai: e.target.value as PublishStatus })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="DRAFT">DRAFT</option>
                <option value="HIDDEN">HIDDEN</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7]"
            >
              Lưu thay đổi
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 text-sm font-medium text-[#5A6782] border border-slate-200 rounded-lg"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {tiers.map((t) => (
          <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-[#5447DC]">{t.trang_thai}</span>
                <span className="font-mono font-bold text-[#19253C]">{t.gia_hien_thi}</span>
              </div>
              <h3 className="mt-1 font-display text-lg font-bold text-[#19253C]">{t.ten_goi}</h3>
              <p className="mt-1 text-xs text-[#5A6782]">{t.mo_ta}</p>
              <div className="mt-4 pt-3 border-t border-slate-200 text-xs space-y-1 font-mono">
                <p>Phiên/tháng: {t.so_luot_phong_van_thang}</p>
                <p>Gợi ý/phiên: {t.gioi_han_goi_y_phien}</p>
                <p>CV tối đa: {t.gioi_han_cv_mb} MB</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditing({ ...t })}
              className="w-full py-2 text-xs font-semibold text-[#19253C] border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Chỉnh sửa hạn mức
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== M24: FEEDBACK TRIAGE ====================
export const M24FeedbackTriagePage: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | FeedbackStatus>('ALL');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    const res = await apiFetch<{ feedback: any[] }>('/api/admin/feedback');
    setList(res.feedback);
    const map: Record<string, string> = {};
    res.feedback.forEach((f) => {
      map[f.id] = f.ghi_chu_xu_ly || '';
    });
    setNotes(map);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, trang_thai: FeedbackStatus) => {
    await apiFetch(`/api/admin/feedback/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ trang_thai, ghi_chu_xu_ly: notes[id] || '' }),
    });
    await load();
  };

  const filtered = list.filter((f) => filter === 'ALL' || f.trang_thai === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg w-fit">
        {(['ALL', 'OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'] as const).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setFilter(st)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              filter === st ? 'bg-[#5447DC] text-white' : 'text-[#5A6782] hover:text-[#19253C]'
            }`}
          >
            {st === 'ALL' ? 'Tất cả' : st}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((fb) => (
          <div key={fb.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs text-[#5A6782]">
                  {fb.user_name} ({fb.user_email}) · {fb.loai_phan_hoi} · {formatViDateTime(fb.ngay_tao)}
                </p>
                <h3 className="font-display text-base font-bold text-[#19253C]">{fb.tieu_de}</h3>
              </div>
              <span className="text-xs font-semibold text-[#5447DC]">{fb.trang_thai}</span>
            </div>

            <p className="text-sm text-[#5A6782]">{fb.noi_dung}</p>

            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={notes[fb.id] || ''}
                onChange={(e) => setNotes({ ...notes, [fb.id]: e.target.value })}
                placeholder="Nhập ghi chú xử lý gửi lại ứng viên..."
                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => updateStatus(fb.id, 'IN_REVIEW')}
                  className="px-3 py-2 text-xs font-semibold text-[#5447DC] border border-[#5447DC]/30 rounded-lg hover:bg-[#5447DC]/5"
                >
                  Đang xem xét
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(fb.id, 'RESOLVED')}
                  className="px-3 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                >
                  Đã xử lý
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(fb.id, 'DISMISSED')}
                  className="px-3 py-2 text-xs font-semibold text-[#5A6782] border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

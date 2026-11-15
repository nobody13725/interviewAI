import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  FileText,
  Heart,
  Play,
  Search,
  Upload,
} from 'lucide-react';
import { apiFetch, difficultyLabel, formatViDate } from '../lib/api';
import type {
  CVConfirmed,
  CodeLanguage,
  PositionItem,
  ProblemItem,
  QuotaInfo,
  ScreenId,
  TopicItem,
  UserProfile,
} from '../types';

// ==================== M06: USER PROFILE ====================
export const M06ProfilePage: React.FC<{
  profile: UserProfile | null;
  quota: QuotaInfo | null;
  onProfileUpdated: (p: UserProfile) => void;
}> = ({ profile, quota, onProfileUpdated }) => {
  const [hoTen, setHoTen] = useState(profile?.ho_ten || '');
  const [title, setTitle] = useState(profile?.tieu_de_nghe_nghiep || '');
  const [exp, setExp] = useState(String(profile?.kinh_nghiem_nam ?? 1));
  const [targetPos, setTargetPos] = useState(profile?.muc_tieu_vi_tri || '');
  const [skills, setSkills] = useState((profile?.ky_nang || []).join(', '));
  const [bio, setBio] = useState(profile?.gioi_thieu || '');
  const [defaultLang, setDefaultLang] = useState<CodeLanguage>(profile?.ngon_ngu_mac_dinh || 'javascript');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (profile) {
      setHoTen(profile.ho_ten);
      setTitle(profile.tieu_de_nghe_nghiep);
      setExp(String(profile.kinh_nghiem_nam));
      setTargetPos(profile.muc_tieu_vi_tri);
      setSkills(profile.ky_nang.join(', '));
      setBio(profile.gioi_thieu);
      setDefaultLang(profile.ngon_ngu_mac_dinh);
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      const res = await apiFetch<{ profile: UserProfile }>('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          ho_ten: hoTen,
          tieu_de_nghe_nghiep: title,
          kinh_nghiem_nam: Number(exp) || 0,
          muc_tieu_vi_tri: targetPos,
          ky_nang: skills.split(',').map((s) => s.trim()).filter(Boolean),
          gioi_thieu: bio,
          ngon_ngu_mac_dinh: defaultLang,
        }),
      });
      onProfileUpdated(res.profile);
      setMsg('Đã lưu cập nhật hồ sơ cá nhân.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Lỗi lưu hồ sơ.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="font-display text-lg font-bold text-[#19253C]">Thông tin hồ sơ ứng viên</h2>
        <p className="text-sm text-[#5A6782] mt-1">
          Thông tin này giúp AI Interviewer điều chỉnh ngữ cảnh câu hỏi phù hợp với định hướng nghề nghiệp của bạn.
        </p>

        {msg && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
            {msg}
          </div>
        )}
        {err && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
            {err}
          </div>
        )}

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#19253C] mb-1.5">Họ và tên</label>
              <input
                type="text"
                required
                value={hoTen}
                onChange={(e) => setHoTen(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#5447DC]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#19253C] mb-1.5">Chức danh hiện tại</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#5447DC]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#19253C] mb-1.5">Số năm kinh nghiệm</label>
              <input
                type="number"
                min={0}
                max={40}
                value={exp}
                onChange={(e) => setExp(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:border-[#5447DC]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#19253C] mb-1.5">Vị trí mục tiêu</label>
              <input
                type="text"
                value={targetPos}
                onChange={(e) => setTargetPos(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#5447DC]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#19253C] mb-1.5">Ngôn ngữ code mặc định</label>
              <select
                value={defaultLang}
                onChange={(e) => setDefaultLang(e.target.value as CodeLanguage)}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#5447DC]"
              >
                <option value="javascript">JavaScript (Node.js)</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python 3</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#19253C] mb-1.5">
              Kỹ năng chuyên môn (phân tách bằng dấu phẩy)
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#5447DC]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#19253C] mb-1.5">Giới thiệu ngắn</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#5447DC]"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7] disabled:opacity-60"
            >
              {saving ? 'Đang lưu...' : 'Lưu hồ sơ'}
            </button>
          </div>
        </form>
      </div>

      <div className="lg:col-span-4 space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-display text-base font-bold text-[#19253C]">Gói dịch vụ &amp; Hạn mức tháng</h3>
          {quota ? (
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#5A6782]">Gói hiện tại</span>
                <span className="font-semibold text-[#19253C]">{quota.tier?.ten_goi}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5A6782]">Lượt phỏng vấn còn lại</span>
                <span className="font-mono font-bold text-[#5447DC] tabular-nums">
                  {quota.luot_con_lai} / {quota.luot_toi_da}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5A6782]">Giới hạn gợi ý / phiên</span>
                <span className="font-mono tabular-nums text-[#19253C]">
                  {quota.tier?.gioi_han_goi_y_phien} lượt
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5A6782]">Dung lượng CV tối đa</span>
                <span className="font-mono tabular-nums text-[#19253C]">
                  {quota.tier?.gioi_han_cv_mb} MB
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// ==================== M07: PROBLEM BANK & FAVORITES ====================
export const M07ProblemBankPage: React.FC<{
  onStartSetupWithProblem: (problemId: string) => void;
}> = ({ onStartSetupWithProblem }) => {
  const [problems, setProblems] = useState<ProblemItem[]>([]);
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [selected, setSelected] = useState<ProblemItem | null>(null);
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('ALL');
  const [diffFilter, setDiffFilter] = useState('ALL');
  const [favOnly, setFavOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{
        problems: ProblemItem[];
        positions: PositionItem[];
        topics: TopicItem[];
      }>('/api/user/problems');
      setProblems(data.problems);
      setPositions(data.positions);
      setTopics(data.topics);
      if (data.problems.length > 0 && !selected) {
        setSelected(data.problems[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleFavorite = async (problemId: string) => {
    const res = await apiFetch<{ is_favorite: boolean }>(`/api/user/favorites/${problemId}`, {
      method: 'POST',
    });
    setProblems((prev) =>
      prev.map((p) => (p.id === problemId ? { ...p, is_favorite: res.is_favorite } : p))
    );
    if (selected?.id === problemId) {
      setSelected((prev) => (prev ? { ...prev, is_favorite: res.is_favorite } : null));
    }
  };

  const posMap = new Map(positions.map((p) => [p.id, p.ten_vi_tri]));
  const topicMap = new Map(topics.map((t) => [t.id, t.ten_chu_de]));

  const filtered = problems.filter((p) => {
    if (posFilter !== 'ALL' && p.vi_tri_id !== posFilter) return false;
    if (diffFilter !== 'ALL' && p.do_kho !== diffFilter) return false;
    if (favOnly && !p.is_favorite) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return p.tieu_de.toLowerCase().includes(q) || p.mo_ta_chi_tiet.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm bài toán theo tên hoặc mô tả..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#5447DC]"
          />
        </div>
        <select
          value={posFilter}
          onChange={(e) => setPosFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
        >
          <option value="ALL">Tất cả vị trí</option>
          {positions.map((p) => (
            <option key={p.id} value={p.id}>{p.ten_vi_tri}</option>
          ))}
        </select>
        <select
          value={diffFilter}
          onChange={(e) => setDiffFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
        >
          <option value="ALL">Mọi độ khó</option>
          <option value="EASY">Cơ bản</option>
          <option value="MEDIUM">Trung bình</option>
          <option value="HARD">Nâng cao</option>
        </select>
        <button
          type="button"
          onClick={() => setFavOnly((v) => !v)}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
            favOnly
              ? 'bg-[#5447DC] text-white border-[#5447DC]'
              : 'bg-white text-[#19253C] border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Heart className={`w-4 h-4 ${favOnly ? 'fill-current' : ''}`} />
          <span>Yêu thích</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-[#5A6782]">
          Đang tải danh sách bài toán...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm font-semibold text-[#19253C]">Không có bài toán nào khớp bộ lọc.</p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setPosFilter('ALL');
              setDiffFilter('ALL');
              setFavOnly(false);
            }}
            className="mt-3 px-4 py-2 text-xs font-semibold text-[#5447DC] border border-[#5447DC]/30 rounded-lg hover:bg-[#5447DC]/5"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3">
            {filtered.map((p) => {
              const active = selected?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelected(p)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelected(p)}
                  className={`p-4 rounded-xl border cursor-pointer transition-colors ${
                    active ? 'bg-white border-[#5447DC]' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-[#5A6782]">
                        <span>{posMap.get(p.vi_tri_id)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{difficultyLabel(p.do_kho)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{p.thoi_luong_phut_mac_dinh}p</span>
                      </div>
                      <h3 className="mt-1 font-display text-sm font-bold text-[#19253C]">{p.tieu_de}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(p.id);
                      }}
                      className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                        p.is_favorite ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:text-rose-600'
                      }`}
                      aria-label="Đánh dấu yêu thích"
                    >
                      <Heart className={`w-4 h-4 ${p.is_favorite ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-7">
            {selected && (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[#5A6782]">
                      <span>{posMap.get(selected.vi_tri_id)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{topicMap.get(selected.chu_de_id)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{difficultyLabel(selected.do_kho)}</span>
                    </div>
                    <h2 className="mt-1 font-display text-xl font-bold text-[#19253C]">
                      {selected.tieu_de}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => onStartSetupWithProblem(selected.id)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7] whitespace-nowrap"
                  >
                    <Play className="w-4 h-4" />
                    <span>Cấu hình phỏng vấn</span>
                  </button>
                </div>

                <div className="mt-5 space-y-4 text-sm">
                  <div>
                    <h4 className="font-semibold text-[#19253C] mb-1">Đề bài</h4>
                    <p className="text-[#5A6782] leading-relaxed">{selected.mo_ta_chi_tiet}</p>
                  </div>

                  {selected.rang_buoc?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-[#19253C] mb-1">Ràng buộc kỹ thuật</h4>
                      <ul className="list-disc pl-5 text-xs text-[#5A6782] space-y-1 font-mono">
                        {selected.rang_buoc.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold text-[#19253C] mb-2">Test Case mẫu (Sample)</h4>
                    <div className="space-y-2">
                      {(selected.sample_tests || []).map((tc) => (
                        <div key={tc.id} className="p-3 rounded-lg bg-[#F4F7FC] border border-slate-200 font-mono text-xs">
                          <p className="font-sans font-semibold text-[#19253C]">{tc.ten_test}</p>
                          <p className="mt-1 text-[#5A6782]">Input: <span className="text-[#19253C]">{tc.dau_vao}</span></p>
                          <p className="text-[#5A6782]">Expected: <span className="text-emerald-700">{tc.dau_ra_mong_doi}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== M08: SESSION SETUP / READY ====================
export const M08SetupPage: React.FC<{
  preselectedProblemId?: string | null;
  quota: QuotaInfo | null;
  defaultLanguage?: CodeLanguage;
  onSessionReady: (sessionId: string) => void;
  onNavigate: (s: ScreenId) => void;
}> = ({ preselectedProblemId, quota, defaultLanguage = 'javascript', onSessionReady, onNavigate }) => {
  const [problems, setProblems] = useState<ProblemItem[]>([]);
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [confirmedCvs, setConfirmedCvs] = useState<CVConfirmed[]>([]);
  const [selectedProblemId, setSelectedProblemId] = useState(preselectedProblemId || '');
  const [language, setLanguage] = useState<CodeLanguage>(defaultLanguage);
  const [duration, setDuration] = useState(30);
  const [cvId, setCvId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch<{ problems: ProblemItem[]; positions: PositionItem[]; topics: TopicItem[] }>('/api/user/problems'),
      apiFetch<{ confirmed: CVConfirmed[] }>('/api/user/cv'),
    ])
      .then(([pData, cData]) => {
        setProblems(pData.problems);
        setPositions(pData.positions);
        setTopics(pData.topics);
        const readyCvs = cData.confirmed.filter((c) => c.da_xac_nhan);
        setConfirmedCvs(readyCvs);
        if (readyCvs.length > 0) setCvId(readyCvs[0].id);

        const initialProb =
          pData.problems.find((p) => p.id === preselectedProblemId) || pData.problems[0];
        if (initialProb) {
          setSelectedProblemId(initialProb.id);
          setDuration(initialProb.thoi_luong_phut_mac_dinh);
        }
      })
      .finally(() => setLoading(false));
  }, [preselectedProblemId]);

  const selectedProb = problems.find((p) => p.id === selectedProblemId);
  const posMap = new Map(positions.map((p) => [p.id, p.ten_vi_tri]));
  const topicMap = new Map(topics.map((t) => [t.id, t.ten_chu_de]));

  const handleCreateReadySession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProblemId) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await apiFetch<{ session: { id: string } }>('/api/user/sessions', {
        method: 'POST',
        body: JSON.stringify({
          bai_toan_id: selectedProblemId,
          ngon_ngu: language,
          thoi_luong_phut: duration,
          cv_xac_nhan_id: cvId || undefined,
        }),
      });
      onSessionReady(res.session.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo phiên phỏng vấn.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-[#5A6782]">
        Đang tải cấu hình phòng phỏng vấn...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <form
        onSubmit={handleCreateReadySession}
        className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5"
      >
        <div>
          <h2 className="font-display text-lg font-bold text-[#19253C]">
            Cấu hình phiên phỏng vấn mới (READY)
          </h2>
          <p className="text-sm text-[#5A6782] mt-1">
            Tạo phiên ở trạng thái sẵn sàng. Hệ thống chưa bấm giờ và chưa trừ lượt cho đến khi bạn xác nhận bắt đầu trong phòng phỏng vấn.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[#19253C] mb-1.5">Chọn bài toán phỏng vấn</label>
          <select
            value={selectedProblemId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedProblemId(id);
              const found = problems.find((p) => p.id === id);
              if (found) setDuration(found.thoi_luong_phut_mac_dinh);
            }}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#5447DC]"
          >
            {problems.map((p) => (
              <option key={p.id} value={p.id}>
                [{difficultyLabel(p.do_kho)}] {p.tieu_de} — {posMap.get(p.vi_tri_id)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#19253C] mb-1.5">Ngôn ngữ lập trình</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as CodeLanguage)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#5447DC]"
            >
              <option value="javascript">JavaScript (Node.js)</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python 3</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#19253C] mb-1.5">
              Thời lượng phiên (phút)
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#5447DC]"
            >
              <option value={20}>20 phút</option>
              <option value={25}>25 phút</option>
              <option value={30}>30 phút</option>
              <option value={35}>35 phút</option>
              <option value={45}>45 phút</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-[#19253C]">
              Đính kèm CV đã xác nhận (tùy chọn)
            </label>
            <button
              type="button"
              onClick={() => onNavigate('M09')}
              className="text-xs font-semibold text-[#5447DC] hover:underline"
            >
              Tải hoặc cập nhật CV
            </button>
          </div>
          <select
            value={cvId}
            onChange={(e) => setCvId(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#5447DC]"
          >
            <option value="">Không đính kèm CV</option>
            {confirmedCvs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.vi_tri_ung_tuyen} ({c.so_nam_kinh_nghiem} năm KN) — Đã xác nhận
              </option>
            ))}
          </select>
        </div>

        <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-4">
          <p className="text-xs text-[#5A6782]">
            Hạn mức còn lại:{' '}
            <span className="font-mono font-bold text-[#19253C] tabular-nums">
              {quota?.luot_con_lai ?? 0}/{quota?.luot_toi_da ?? 0}
            </span>{' '}
            lượt tháng này
          </p>
          <button
            type="submit"
            disabled={submitting || (quota?.luot_con_lai ?? 0) <= 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7] disabled:opacity-60 whitespace-nowrap"
          >
            <Play className="w-4 h-4" />
            <span>{submitting ? 'Đang khởi tạo...' : 'Chuẩn bị phòng phỏng vấn'}</span>
          </button>
        </div>
      </form>

      {/* Problem Preview Card */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
        <p className="text-xs font-semibold text-[#5447DC]">Thông tin bài toán đã chọn</p>
        {selectedProb ? (
          <div className="mt-3 space-y-4">
            <h3 className="font-display text-lg font-bold text-[#19253C]">{selectedProb.tieu_de}</h3>
            <div className="flex items-center gap-2 text-xs text-[#5A6782]">
              <span>{posMap.get(selectedProb.vi_tri_id)}</span>
              <span aria-hidden="true">·</span>
              <span>{topicMap.get(selectedProb.chu_de_id)}</span>
              <span aria-hidden="true">·</span>
              <span>{difficultyLabel(selectedProb.do_kho)}</span>
            </div>
            <p className="text-sm text-[#5A6782] leading-relaxed">{selectedProb.mo_ta_chi_tiet}</p>
            <div className="pt-3 border-t border-slate-200 text-xs text-[#5A6782] space-y-1.5">
              <p>Hàm mục tiêu: <code className="font-mono text-[#19253C]">{selectedProb.ham_muc_tieu}</code></p>
              <p>Test mẫu công khai: <span className="font-mono tabular-nums text-[#19253C]">{selectedProb.sample_tests?.length || 0}</span></p>
              <p>Gợi ý tối đa trong phiên: <span className="font-mono tabular-nums text-[#19253C]">{quota?.tier?.gioi_han_goi_y_phien ?? 2} lượt</span></p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ==================== M09: CV UPLOAD & CONFIRMATION ====================
export const M09CvUploadPage: React.FC<{
  quota: QuotaInfo | null;
  onNavigate: (s: ScreenId) => void;
}> = ({ quota, onNavigate }) => {
  const [confirmedList, setConfirmedList] = useState<CVConfirmed[]>([]);
  const [consent, setConsent] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileFormat, setFileFormat] = useState<'PDF' | 'DOCX' | 'TXT'>('TXT');
  const [fileSize, setFileSize] = useState(0);
  const [rawText, setRawText] = useState('');
  const [step, setStep] = useState<'IDLE' | 'EXTRACTING' | 'REVIEW' | 'CONFIRMED'>('IDLE');
  const [draftCv, setDraftCv] = useState<CVConfirmed | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCvs = async () => {
    const data = await apiFetch<{ confirmed: CVConfirmed[] }>('/api/user/cv');
    setConfirmedList(data.confirmed);
  };

  useEffect(() => {
    loadCvs();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toUpperCase();
    if (!ext || !['PDF', 'DOCX', 'TXT'].includes(ext)) {
      setError('Chỉ hỗ trợ định dạng PDF, DOCX hoặc TXT.');
      return;
    }
    setFileName(file.name);
    setFileFormat(ext as 'PDF' | 'DOCX' | 'TXT');
    setFileSize(file.size);

    if (ext === 'TXT') {
      const text = await file.text();
      setRawText(text);
    } else {
      const buf = await file.arrayBuffer();
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const raw = decoder.decode(buf).replace(/[^\x20-\x7E\n\r\t\u00C0-\u1EF9]/g, ' ');
      const compact = raw.replace(/\s+/g, ' ').trim();
      setRawText(
        compact.length > 60
          ? compact.slice(0, 12000)
          : `Hồ sơ tệp ${file.name}. Vui lòng bổ sung hoặc dán tóm tắt nội dung CV nếu tệp PDF/DOCX bị mã hóa nhị phân.`
      );
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!consent) {
      setError('Vui lòng đánh dấu đồng ý cho phép hệ thống trích xuất và xử lý CV.');
      return;
    }
    setStep('EXTRACTING');
    try {
      const res = await apiFetch<{ cv: CVConfirmed }>('/api/user/cv/upload', {
        method: 'POST',
        body: JSON.stringify({
          ten_tep: fileName || 'CV_Ung_Vien.txt',
          dinh_dang: fileFormat,
          kich_thuoc_bytes: fileSize || new Blob([rawText]).size,
          noi_dung_tho: rawText,
          da_dong_y: consent,
        }),
      });
      setDraftCv(res.cv);
      setStep('REVIEW');
      await loadCvs();
    } catch (err) {
      setStep('IDLE');
      setError(err instanceof Error ? err.message : 'Lỗi phân tích CV.');
    }
  };

  const handleConfirmDraft = async () => {
    if (!draftCv) return;
    setSaving(true);
    setError('');
    try {
      const res = await apiFetch<{ cv: CVConfirmed }>(`/api/user/cv/${draftCv.id}/confirm`, {
        method: 'PUT',
        body: JSON.stringify(draftCv),
      });
      setDraftCv(res.cv);
      setStep('CONFIRMED');
      await loadCvs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi xác nhận CV.');
    } finally {
      setSaving(false);
    }
  };

  const steps = ['Tải tệp', 'Trích xuất văn bản', 'Phân tích AI', 'Xác nhận'];
  const activeStepIdx =
    step === 'IDLE' ? 0 : step === 'EXTRACTING' ? 2 : step === 'REVIEW' ? 3 : 4;

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {steps.map((label, idx) => {
            const done = idx < activeStepIdx;
            const current = idx === activeStepIdx;
            return (
              <div
                key={label}
                className={`p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                  done
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : current
                    ? 'bg-[#5447DC]/10 border-[#5447DC]/30 text-[#5447DC]'
                    : 'bg-[#F4F7FC] border-slate-200 text-[#5A6782]'
                }`}
              >
                <span className="font-mono">{idx + 1}.</span>
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload & Extract Form */}
        <form onSubmit={handleAnalyze} className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#19253C]">Tải lên &amp; Trích xuất CV</h2>
          <p className="text-xs text-[#5A6782]">
            Hỗ trợ PDF, DOCX, TXT · Giới hạn gói hiện tại: {quota?.tier?.gioi_han_cv_mb ?? 5} MB.
          </p>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <label className="block border border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-[#5447DC] hover:bg-[#F4F7FC]/60 transition-colors">
            <Upload className="w-6 h-6 text-[#5447DC] mx-auto mb-2" />
            <span className="block text-sm font-semibold text-[#19253C]">
              {fileName ? `Đã chọn: ${fileName}` : 'Chọn tệp CV từ máy tính (.pdf, .docx, .txt)'}
            </span>
            <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileChange} className="hidden" />
          </label>

          <div>
            <label className="block text-xs font-semibold text-[#19253C] mb-1.5">
              Nội dung CV trích xuất (có thể dán trực tiếp để AI phân tích chính xác hơn)
            </label>
            <textarea
              rows={6}
              required
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                if (!fileName) {
                  setFileName('CV_Nhap_Truc_Tiep.txt');
                  setFileFormat('TXT');
                }
              }}
              placeholder="Dán nội dung CV của bạn (kinh nghiệm, kỹ năng, dự án nổi bật)..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#5447DC]"
            />
          </div>

          <label className="flex items-start gap-2.5 text-xs text-[#19253C] cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-[#5447DC] focus:ring-[#5447DC]"
            />
            <span>
              Tôi đồng ý cho phép hệ thống trích xuất và phân tích nội dung CV này bằng AI nhằm phục vụ cá nhân hóa câu hỏi phỏng vấn.
            </span>
          </label>

          <button
            type="submit"
            disabled={step === 'EXTRACTING' || !consent || rawText.trim().length < 20}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7] disabled:opacity-60"
          >
            {step === 'EXTRACTING' ? 'AI đang phân tích CV...' : 'Trích xuất & Phân tích CV'}
          </button>
        </form>

        {/* Editable Extracted Preview */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#19253C]">Kiểm tra &amp; Xác nhận dữ liệu CV</h2>
            {draftCv && (
              <span
                className={`text-xs font-semibold ${
                  draftCv.da_xac_nhan ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {draftCv.da_xac_nhan ? 'Đã xác nhận' : 'Chưa xác nhận'}
              </span>
            )}
          </div>

          {draftCv ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5A6782] mb-1">Vị trí ứng tuyển</label>
                  <input
                    type="text"
                    value={draftCv.vi_tri_ung_tuyen}
                    onChange={(e) =>
                      setDraftCv({ ...draftCv, vi_tri_ung_tuyen: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5A6782] mb-1">Số năm kinh nghiệm</label>
                  <input
                    type="number"
                    min={0}
                    value={draftCv.so_nam_kinh_nghiem}
                    onChange={(e) =>
                      setDraftCv({ ...draftCv, so_nam_kinh_nghiem: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A6782] mb-1">
                  Kỹ năng chính (phân tách bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  value={draftCv.ky_nang_chinh.join(', ')}
                  onChange={(e) =>
                    setDraftCv({
                      ...draftCv,
                      ky_nang_chinh: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A6782] mb-1">Tóm tắt năng lực</label>
                <textarea
                  rows={3}
                  value={draftCv.tom_tat_nang_luc}
                  onChange={(e) =>
                    setDraftCv({ ...draftCv, tom_tat_nang_luc: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleConfirmDraft}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7] disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{saving ? 'Đang xác nhận...' : 'Xác nhận sử dụng CV này'}</span>
                </button>
                {draftCv.da_xac_nhan && (
                  <button
                    type="button"
                    onClick={() => onNavigate('M08')}
                    className="text-xs font-semibold text-[#5447DC] hover:underline"
                  >
                    Dùng cho phỏng vấn mới →
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-[#5A6782]">
              <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p>Tải CV và nhấn Trích xuất để kiểm tra dữ liệu trước khi xác nhận.</p>
            </div>
          )}

          {/* Previously Confirmed CVs */}
          {confirmedList.length > 0 && (
            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs font-semibold text-[#19253C] mb-2">CV đã lưu gần đây</p>
              <div className="space-y-2">
                {confirmedList.slice(0, 3).map((cv) => (
                  <div
                    key={cv.id}
                    onClick={() => setDraftCv(cv)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setDraftCv(cv)}
                    className="p-3 rounded-lg bg-[#F4F7FC] border border-slate-200 flex items-center justify-between text-xs cursor-pointer hover:border-[#5447DC]"
                  >
                    <div>
                      <p className="font-semibold text-[#19253C]">
                        {cv.vi_tri_ung_tuyen} ({cv.so_nam_kinh_nghiem} năm)
                      </p>
                      <p className="text-[#5A6782] truncate max-w-[260px]">
                        {cv.ky_nang_chinh.join(' · ')}
                      </p>
                    </div>
                    <span className={cv.da_xac_nhan ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                      {cv.da_xac_nhan ? 'Đã xác nhận' : 'Chưa xác nhận'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

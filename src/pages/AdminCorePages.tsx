import React, { useEffect, useState } from 'react';
import {
  CheckSquare,
  Edit3,
  Eye,
  EyeOff,
  Lock,
  Plus,
  Search,
  Trash2,
  Unlock,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { apiFetch, difficultyLabel, formatViDate } from '../lib/api';
import type {
  DifficultyLevel,
  PositionItem,
  ProblemItem,
  PublishStatus,
  ScreenId,
  ServiceTier,
  TopicItem,
} from '../types';

// ==================== M15: ADMIN DASHBOARD ====================
export const M15AdminDashboardPage: React.FC<{
  onNavigate: (s: ScreenId) => void;
}> = ({ onNavigate }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/admin/dashboard')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-[#5A6782]">
        Đang tải bảng điều khiển quản trị...
      </div>
    );
  }

  const { kpis, problemsByTopic, recentSessions } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-[#5A6782]">Ứng viên hoạt động</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#19253C] tabular-nums">
            {kpis.activeUsers} / {kpis.totalUsers}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-[#5A6782]">Bài toán đã phát hành</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#5447DC] tabular-nums">
            {kpis.publishedProblems} / {kpis.totalProblems}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-[#5A6782]">Phiên phỏng vấn hoàn tất</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#19253C] tabular-nums">
            {kpis.completedSessions} / {kpis.totalSessions}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-[#5A6782]">Phản hồi chờ xử lý</p>
          <p className="mt-1 font-mono text-2xl font-bold text-amber-700 tabular-nums">
            {kpis.openFeedback}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-base font-bold text-[#19253C]">
              Phân bổ bài toán theo chủ đề
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('M18')}
              className="text-xs font-semibold text-[#5447DC] hover:underline"
            >
              Quản lý đề
            </button>
          </div>
          <div className="space-y-3.5">
            {problemsByTopic.map((item: any) => (
              <div key={item.topic_id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#19253C]">{item.topic_name}</span>
                  <span className="font-mono text-[#5A6782] tabular-nums">
                    {item.published} phát hành / {item.count} tổng
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#F4F7FC] border border-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-[#5447DC]"
                    style={{ width: `${Math.min(100, (item.count / Math.max(1, kpis.totalProblems)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-[#19253C]">
              Phiên phỏng vấn gần đây trên hệ thống
            </h3>
            <span className="font-mono text-xs text-[#5A6782] tabular-nums">
              Điểm TB: {kpis.avgPlatformScore}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F4F7FC] text-xs text-[#5A6782]">
                <tr>
                  <th className="py-3 px-5 font-semibold">Ứng viên</th>
                  <th className="py-3 px-5 font-semibold">Bài toán</th>
                  <th className="py-3 px-4 font-semibold">Trạng thái</th>
                  <th className="py-3 px-5 font-semibold text-right">Điểm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentSessions.map((s: any) => (
                  <tr key={s.id}>
                    <td className="py-3 px-5 font-medium text-[#19253C]">{s.user_name}</td>
                    <td className="py-3 px-5 text-xs text-[#5A6782]">{s.problem_title}</td>
                    <td className="py-3 px-4 text-xs font-semibold text-[#19253C]">{s.trang_thai}</td>
                    <td className="py-3 px-5 text-right font-mono tabular-nums text-[#5447DC] font-semibold">
                      {s.score !== null ? s.score.toFixed(1) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== M16: ADMIN USER MANAGEMENT ====================
export const M16UsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [tiers, setTiers] = useState<ServiceTier[]>([]);
  const [search, setSearch] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<any | null>(null);
  const [err, setErr] = useState('');

  const load = async () => {
    const res = await apiFetch<{ users: any[]; tiers: ServiceTier[] }>('/api/admin/users');
    setUsers(res.users);
    setTiers(res.tiers);
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggleLock = async () => {
    if (!confirmTarget) return;
    setErr('');
    const nextStatus = confirmTarget.trang_thai === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    try {
      await apiFetch(`/api/admin/users/${confirmTarget.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ trang_thai: nextStatus }),
      });
      setConfirmTarget(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Lỗi cập nhật trạng thái.');
      setConfirmTarget(null);
    }
  };

  const handleTierChange = async (userId: string, tierId: string) => {
    await apiFetch(`/api/admin/users/${userId}/tier`, {
      method: 'PATCH',
      body: JSON.stringify({ goi_dich_vu_id: tierId }),
    });
    await load();
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return u.email.toLowerCase().includes(q) || u.ho_ten.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tài khoản theo email hoặc họ tên..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#5447DC]"
          />
        </div>
        <span className="text-xs text-[#5A6782]">
          Tổng số: <strong className="font-mono text-[#19253C]">{filtered.length}</strong> tài khoản
        </span>
      </div>

      {err && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
          {err}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F4F7FC] text-xs text-[#5A6782]">
              <tr>
                <th className="py-3 px-5 font-semibold">Người dùng</th>
                <th className="py-3 px-4 font-semibold">Vai trò</th>
                <th className="py-3 px-4 font-semibold">Gói dịch vụ</th>
                <th className="py-3 px-4 font-semibold text-right">Phiên</th>
                <th className="py-3 px-4 font-semibold">Trạng thái</th>
                <th className="py-3 px-5 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td className="py-3.5 px-5">
                    <p className="font-semibold text-[#19253C]">{u.ho_ten}</p>
                    <p className="text-xs font-mono text-[#5A6782]">{u.email}</p>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-semibold text-[#19253C]">{u.vai_tro}</td>
                  <td className="py-3.5 px-4">
                    {u.vai_tro === 'USER' ? (
                      <select
                        value={u.tier_id}
                        onChange={(e) => handleTierChange(u.id, e.target.value)}
                        className="px-2.5 py-1 text-xs border border-slate-200 rounded-md bg-white"
                      >
                        {tiers.map((t) => (
                          <option key={t.id} value={t.id}>{t.ten_goi}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-[#5A6782]">Quản trị hệ thống</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs">
                    {u.session_count}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-semibold">
                    <span className={u.trang_thai === 'ACTIVE' ? 'text-emerald-700' : 'text-red-700'}>
                      {u.trang_thai === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    {u.vai_tro === 'USER' ? (
                      <button
                        type="button"
                        onClick={() => setConfirmTarget(u)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                          u.trang_thai === 'ACTIVE'
                            ? 'text-red-700 border-red-200 hover:bg-red-50'
                            : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        {u.trang_thai === 'ACTIVE' ? (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Khóa</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Mở khóa</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-xs text-[#5A6782]">Được bảo vệ</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(confirmTarget)}
        title={confirmTarget?.trang_thai === 'ACTIVE' ? 'Khóa tài khoản ứng viên?' : 'Mở khóa tài khoản?'}
        description={
          confirmTarget?.trang_thai === 'ACTIVE'
            ? `Tài khoản ${confirmTarget?.email} sẽ bị thu hồi phiên đăng nhập ngay lập tức và không thể truy cập hệ thống.`
            : `Tài khoản ${confirmTarget?.email} sẽ được khôi phục quyền đăng nhập.`
        }
        confirmLabel={confirmTarget?.trang_thai === 'ACTIVE' ? 'Xác nhận khóa' : 'Xác nhận mở khóa'}
        danger={confirmTarget?.trang_thai === 'ACTIVE'}
        onConfirm={handleToggleLock}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
};

// ==================== M17: POSITIONS & TOPICS CATALOG ====================
export const M17CatalogPage: React.FC = () => {
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [posName, setPosName] = useState('');
  const [posDesc, setPosDesc] = useState('');
  const [topName, setTopName] = useState('');
  const [topDesc, setTopDesc] = useState('');
  const [topPosId, setTopPosId] = useState('');

  const load = async () => {
    const res = await apiFetch<{ positions: PositionItem[]; topics: TopicItem[] }>('/api/admin/catalog');
    setPositions(res.positions);
    setTopics(res.topics);
    if (!topPosId && res.positions.length > 0) setTopPosId(res.positions[0].id);
  };

  useEffect(() => {
    load();
  }, []);

  const addPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/positions', {
      method: 'POST',
      body: JSON.stringify({ ten_vi_tri: posName, mo_ta: posDesc }),
    });
    setPosName('');
    setPosDesc('');
    await load();
  };

  const togglePositionStatus = async (p: PositionItem) => {
    await apiFetch(`/api/admin/positions/${p.id}`, {
      method: 'PUT',
      body: JSON.stringify({ trang_thai: p.trang_thai === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE' }),
    });
    await load();
  };

  const addTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/topics', {
      method: 'POST',
      body: JSON.stringify({ ten_chu_de: topName, mo_ta: topDesc, vi_tri_id: topPosId }),
    });
    setTopName('');
    setTopDesc('');
    await load();
  };

  const toggleTopicStatus = async (t: TopicItem) => {
    await apiFetch(`/api/admin/topics/${t.id}`, {
      method: 'PUT',
      body: JSON.stringify({ trang_thai: t.trang_thai === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE' }),
    });
    await load();
  };

  const posMap = new Map(positions.map((p) => [p.id, p.ten_vi_tri]));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Positions */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <h2 className="font-display text-lg font-bold text-[#19253C]">Vị trí tuyển dụng (Positions)</h2>
        <form onSubmit={addPosition} className="space-y-3 p-4 rounded-lg bg-[#F4F7FC] border border-slate-200">
          <input
            type="text"
            required
            value={posName}
            onChange={(e) => setPosName(e.target.value)}
            placeholder="Tên vị trí mới (ví dụ: DevOps Engineer)"
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
          />
          <input
            type="text"
            value={posDesc}
            onChange={(e) => setPosDesc(e.target.value)}
            placeholder="Mô tả ngắn gọn..."
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm vị trí</span>
          </button>
        </form>

        <div className="divide-y divide-slate-200">
          {positions.map((p) => (
            <div key={p.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#19253C]">{p.ten_vi_tri}</p>
                <p className="text-xs text-[#5A6782]">{p.mo_ta}</p>
              </div>
              <button
                type="button"
                onClick={() => togglePositionStatus(p)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border ${
                  p.trang_thai === 'ACTIVE'
                    ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
                    : 'text-[#5A6782] border-slate-200 bg-slate-50'
                }`}
              >
                {p.trang_thai === 'ACTIVE' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{p.trang_thai === 'ACTIVE' ? 'Hiển thị' : 'Đang ẩn'}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Topics */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <h2 className="font-display text-lg font-bold text-[#19253C]">Chủ đề phỏng vấn (Topics)</h2>
        <form onSubmit={addTopic} className="space-y-3 p-4 rounded-lg bg-[#F4F7FC] border border-slate-200">
          <select
            value={topPosId}
            onChange={(e) => setTopPosId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
          >
            {positions.map((p) => (
              <option key={p.id} value={p.id}>{p.ten_vi_tri}</option>
            ))}
          </select>
          <input
            type="text"
            required
            value={topName}
            onChange={(e) => setTopName(e.target.value)}
            placeholder="Tên chủ đề mới..."
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
          />
          <input
            type="text"
            value={topDesc}
            onChange={(e) => setTopDesc(e.target.value)}
            placeholder="Mô tả nội dung chủ đề..."
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm chủ đề</span>
          </button>
        </form>

        <div className="divide-y divide-slate-200">
          {topics.map((t) => (
            <div key={t.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#19253C]">{t.ten_chu_de}</p>
                <p className="text-xs text-[#5A6782]">
                  {posMap.get(t.vi_tri_id)} · {t.mo_ta}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleTopicStatus(t)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border ${
                  t.trang_thai === 'ACTIVE'
                    ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
                    : 'text-[#5A6782] border-slate-200 bg-slate-50'
                }`}
              >
                {t.trang_thai === 'ACTIVE' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{t.trang_thai === 'ACTIVE' ? 'Hiển thị' : 'Đang ẩn'}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==================== M18: PROBLEMS MANAGER & EDITOR ====================
export const M18ProblemsPage: React.FC<{
  onOpenTestCases: (problemId: string) => void;
}> = ({ onOpenTestCases }) => {
  const [problems, setProblems] = useState<ProblemItem[]>([]);
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [editing, setEditing] = useState<ProblemItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  // Form states
  const [tieuDe, setTieuDe] = useState('');
  const [viTriId, setViTriId] = useState('');
  const [chuDeId, setChuDeId] = useState('');
  const [doKho, setDoKho] = useState<DifficultyLevel>('MEDIUM');
  const [moTa, setMoTa] = useState('');
  const [dauVao, setDauVao] = useState('');
  const [dauRa, setDauRa] = useState('');
  const [hamMucTieu, setHamMucTieu] = useState('solve');
  const [duration, setDuration] = useState(30);
  const [jsTemplate, setJsTemplate] = useState('');

  const load = async () => {
    const res = await apiFetch<{
      problems: ProblemItem[];
      positions: PositionItem[];
      topics: TopicItem[];
    }>('/api/admin/problems');
    setProblems(res.problems);
    setPositions(res.positions);
    setTopics(res.topics);
  };

  useEffect(() => {
    load();
  }, []);

  const startCreate = () => {
    setEditing(null);
    setCreating(true);
    setErr('');
    setMsg('');
    setTieuDe('');
    setViTriId(positions[0]?.id || '');
    setChuDeId(topics[0]?.id || '');
    setDoKho('MEDIUM');
    setMoTa('');
    setDauVao('');
    setDauRa('');
    setHamMucTieu('solveProblem');
    setDuration(30);
    setJsTemplate('function solveProblem(input) {\n  return null;\n}');
  };

  const startEdit = (p: ProblemItem) => {
    setCreating(false);
    setEditing(p);
    setErr('');
    setMsg('');
    setTieuDe(p.tieu_de);
    setViTriId(p.vi_tri_id);
    setChuDeId(p.chu_de_id);
    setDoKho(p.do_kho);
    setMoTa(p.mo_ta_chi_tiet);
    setDauVao(p.yeu_cau_dau_vao);
    setDauRa(p.yeu_cau_dau_ra);
    setHamMucTieu(p.ham_muc_tieu);
    setDuration(p.thoi_luong_phut_mac_dinh);
    setJsTemplate(p.code_mau.javascript);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    const payload = {
      tieu_de: tieuDe,
      vi_tri_id: viTriId,
      chu_de_id: chuDeId,
      do_kho: doKho,
      mo_ta_chi_tiet: moTa,
      yeu_cau_dau_vao: dauVao,
      yeu_cau_dau_ra: dauRa,
      ham_muc_tieu: hamMucTieu,
      thoi_luong_phut_mac_dinh: duration,
      code_mau: {
        javascript: jsTemplate,
        typescript: jsTemplate.replace(/^function\s+([A-Za-z0-9_]+)/, 'function $1'),
        python: `def ${hamMucTieu}(*args):\n    pass`,
      },
    };

    try {
      if (editing) {
        await apiFetch(`/api/admin/problems/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setMsg('Đã cập nhật bài toán.');
      } else {
        await apiFetch('/api/admin/problems', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setMsg('Đã tạo bài toán mới ở trạng thái DRAFT.');
      }
      setCreating(false);
      setEditing(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Lỗi lưu bài toán.');
    }
  };

  const handleStatusChange = async (id: string, nextStatus: PublishStatus) => {
    setErr('');
    setMsg('');
    try {
      await apiFetch(`/api/admin/problems/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ trang_thai: nextStatus }),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Không thể đổi trạng thái phát hành.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#5A6782]">
          Bài toán chỉ được phát hành (PUBLISHED) khi có ít nhất 1 Test Case SAMPLE đang hoạt động.
        </p>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7]"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo bài toán mới</span>
        </button>
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

      {(creating || editing) && (
        <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="font-display text-base font-bold text-[#19253C]">
            {editing ? `Chỉnh sửa: ${editing.tieu_de}` : 'Thêm bài toán mới (DRAFT)'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#19253C] mb-1">Tiêu đề bài toán</label>
              <input
                type="text"
                required
                value={tieuDe}
                onChange={(e) => setTieuDe(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#19253C] mb-1">Vị trí</label>
              <select
                value={viTriId}
                onChange={(e) => setViTriId(e.target.value)}
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
                value={chuDeId}
                onChange={(e) => setChuDeId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>{t.ten_chu_de}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#19253C] mb-1">Độ khó</label>
              <select
                value={doKho}
                onChange={(e) => setDoKho(e.target.value as DifficultyLevel)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="EASY">Cơ bản</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HARD">Nâng cao</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#19253C] mb-1">Tên hàm mục tiêu</label>
              <input
                type="text"
                required
                value={hamMucTieu}
                onChange={(e) => setHamMucTieu(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#19253C] mb-1">Thời lượng mặc định (phút)</label>
              <input
                type="number"
                min={10}
                max={90}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#19253C] mb-1">Mô tả chi tiết</label>
            <textarea
              rows={3}
              required
              value={moTa}
              onChange={(e) => setMoTa(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#19253C] mb-1">Yêu cầu đầu vào</label>
              <input
                type="text"
                value={dauVao}
                onChange={(e) => setDauVao(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#19253C] mb-1">Yêu cầu đầu ra</label>
              <input
                type="text"
                value={dauRa}
                onChange={(e) => setDauRa(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#19253C] mb-1">Starter Code (JavaScript)</label>
            <textarea
              rows={4}
              value={jsTemplate}
              onChange={(e) => setJsTemplate(e.target.value)}
              className="w-full px-3 py-2 font-mono text-xs bg-[#19253C] text-slate-100 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7]"
            >
              Lưu bài toán
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
              className="px-4 py-2 text-sm font-medium text-[#5A6782] border border-slate-200 rounded-lg"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F4F7FC] text-xs text-[#5A6782]">
              <tr>
                <th className="py-3 px-5 font-semibold">Bài toán</th>
                <th className="py-3 px-4 font-semibold">Độ khó</th>
                <th className="py-3 px-4 font-semibold text-right">Sample / Hidden</th>
                <th className="py-3 px-4 font-semibold">Trạng thái</th>
                <th className="py-3 px-5 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {problems.map((p) => (
                <tr key={p.id}>
                  <td className="py-3.5 px-5">
                    <p className="font-semibold text-[#19253C]">{p.tieu_de}</p>
                    <p className="text-xs font-mono text-[#5A6782]">
                      {p.ham_muc_tieu} · cập nhật {formatViDate(p.ngay_cap_nhat)}
                    </p>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-[#5A6782]">{difficultyLabel(p.do_kho)}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                    {p.sample_count} / {p.hidden_count}
                  </td>
                  <td className="py-3.5 px-4">
                    <select
                      value={p.trang_thai}
                      onChange={(e) => handleStatusChange(p.id, e.target.value as PublishStatus)}
                      className="px-2.5 py-1 text-xs font-semibold border border-slate-200 rounded-md bg-white"
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="PUBLISHED">PUBLISHED</option>
                      <option value="HIDDEN">HIDDEN</option>
                    </select>
                  </td>
                  <td className="py-3.5 px-5 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#19253C] border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Sửa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenTestCases(p.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#5447DC] border border-[#5447DC]/30 rounded-lg hover:bg-[#5447DC]/5"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Test Case</span>
                    </button>
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

// ==================== M19: TEST CASES MANAGER ====================
export const M19TestCasesPage: React.FC<{
  initialProblemId?: string | null;
}> = ({ initialProblemId }) => {
  const [problems, setProblems] = useState<ProblemItem[]>([]);
  const [selectedProbId, setSelectedProbId] = useState(initialProblemId || '');
  const [testCases, setTestCases] = useState<any[]>([]);
  const [tenTest, setTenTest] = useState('');
  const [loai, setLoai] = useState<'SAMPLE' | 'HIDDEN'>('SAMPLE');
  const [dauVao, setDauVao] = useState('[[1, 2], 3]');
  const [dauRa, setDauRa] = useState('true');
  const [giaiThich, setGiaiThich] = useState('');
  const [err, setErr] = useState('');
  const [switchWarning, setSwitchWarning] = useState<any | null>(null);

  useEffect(() => {
    apiFetch<{ problems: ProblemItem[] }>('/api/admin/problems').then((res) => {
      setProblems(res.problems);
      const id = initialProblemId || res.problems[0]?.id || '';
      setSelectedProbId(id);
    });
  }, [initialProblemId]);

  const loadTests = async (probId: string) => {
    if (!probId) return;
    const res = await apiFetch<{ testCases: any[] }>(`/api/admin/problems/${probId}/test-cases`);
    setTestCases(res.testCases);
  };

  useEffect(() => {
    if (selectedProbId) loadTests(selectedProbId);
  }, [selectedProbId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      await apiFetch(`/api/admin/problems/${selectedProbId}/test-cases`, {
        method: 'POST',
        body: JSON.stringify({
          ten_test: tenTest,
          loai,
          dau_vao: dauVao,
          dau_ra_mong_doi: dauRa,
          giai_thich: giaiThich,
        }),
      });
      setTenTest('');
      setGiaiThich('');
      await loadTests(selectedProbId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Lỗi thêm Test Case.');
    }
  };

  const handleDelete = async (tcId: string) => {
    setErr('');
    try {
      await apiFetch(`/api/admin/test-cases/${tcId}`, { method: 'DELETE' });
      await loadTests(selectedProbId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Không thể xóa Test Case.');
    }
  };

  const confirmSwitchType = async () => {
    if (!switchWarning) return;
    setErr('');
    try {
      await apiFetch(`/api/admin/test-cases/${switchWarning.id}`, {
        method: 'PUT',
        body: JSON.stringify({ loai: switchWarning.loai === 'HIDDEN' ? 'SAMPLE' : 'HIDDEN' }),
      });
      setSwitchWarning(null);
      await loadTests(selectedProbId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Không thể đổi loại Test Case.');
      setSwitchWarning(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <label className="text-xs font-semibold text-[#19253C] whitespace-nowrap">Chọn bài toán:</label>
          <select
            value={selectedProbId}
            onChange={(e) => setSelectedProbId(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          >
            {problems.map((p) => (
              <option key={p.id} value={p.id}>
                {p.tieu_de} ({p.trang_thai})
              </option>
            ))}
          </select>
        </div>
      </div>

      {err && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={handleAdd} className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="font-display text-base font-bold text-[#19253C]">Thêm Test Case mới</h3>
          <div>
            <label className="block text-xs font-semibold text-[#19253C] mb-1">Tên Test Case</label>
            <input
              type="text"
              required
              value={tenTest}
              onChange={(e) => setTenTest(e.target.value)}
              placeholder="Ví dụ: Biên mảng rỗng"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#19253C] mb-1">Phân loại</label>
            <select
              value={loai}
              onChange={(e) => setLoai(e.target.value as 'SAMPLE' | 'HIDDEN')}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
            >
              <option value="SAMPLE">SAMPLE (Công khai cho ứng viên)</option>
              <option value="HIDDEN">HIDDEN (Chấm ẩn khi nộp bài)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#19253C] mb-1">Đầu vào (JSON mảng tham số)</label>
            <input
              type="text"
              required
              value={dauVao}
              onChange={(e) => setDauVao(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#19253C] mb-1">Đầu ra mong đợi (JSON)</label>
            <input
              type="text"
              required
              value={dauRa}
              onChange={(e) => setDauRa(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#19253C] mb-1">Giải thích (tùy chọn)</label>
            <input
              type="text"
              value={giaiThich}
              onChange={(e) => setGiaiThich(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7]"
          >
            Thêm Test Case
          </button>
        </form>

        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="font-display text-base font-bold text-[#19253C]">
              Danh sách Test Case ({testCases.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-200">
            {testCases.map((tc) => (
              <div key={tc.id} className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#19253C]">{tc.ten_test}</span>
                    <span aria-hidden="true">·</span>
                    <span className={tc.loai === 'SAMPLE' ? 'text-[#5447DC] font-semibold' : 'text-amber-700 font-semibold'}>
                      {tc.loai}
                    </span>
                  </div>
                  <p className="font-mono text-[#5A6782]">
                    Input: <span className="text-[#19253C]">{tc.dau_vao}</span> → Output:{' '}
                    <span className="text-emerald-700">{tc.dau_ra_mong_doi}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSwitchWarning(tc)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-[#19253C] border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    Đổi sang {tc.loai === 'HIDDEN' ? 'SAMPLE' : 'HIDDEN'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(tc.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                    aria-label="Xóa Test Case"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(switchWarning)}
        title="Xác nhận thay đổi phân loại Test Case?"
        description={
          switchWarning?.loai === 'HIDDEN'
            ? `Cảnh báo: Chuyển "${switchWarning?.ten_test}" từ HIDDEN sang SAMPLE sẽ công khai bộ dữ liệu kiểm thử này cho toàn bộ ứng viên.`
            : `Chuyển "${switchWarning?.ten_test}" sang HIDDEN sẽ ẩn chi tiết đầu vào/đầu ra với ứng viên.`
        }
        confirmLabel="Xác nhận chuyển"
        onConfirm={confirmSwitchType}
        onCancel={() => setSwitchWarning(null)}
      />
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  Code2,
  Eye,
  EyeOff,
  FileCheck2,
  LineChart,
  Lock,
  MessageSquare,
  Play,
  Terminal,
} from 'lucide-react';
import { apiFetch, difficultyLabel, setStoredToken } from '../lib/api';
import type {
  AuthUser,
  PositionItem,
  ProblemItem,
  QuotaInfo,
  ScreenId,
  ServiceTier,
  TopicItem,
  UserProfile,
} from '../types';

interface PublicOverviewData {
  tiers: ServiceTier[];
  positions: PositionItem[];
  topics: TopicItem[];
  sampleProblems: ProblemItem[];
  stats: { totalProblems: number; totalTopics: number; totalPositions: number };
}

export const M01LandingPage: React.FC<{
  overview: PublicOverviewData | null;
  user: AuthUser | null;
  onNavigate: (s: ScreenId) => void;
}> = ({ overview, user, onNavigate }) => {
  const [previewTab, setPreviewTab] = useState<'dialogue' | 'sandbox' | 'rubric'>('dialogue');

  return (
    <div className="bg-[#F4F7FC]">
      {/* Hero Split Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-[1280px] mx-auto px-6 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-xs font-semibold tracking-wide text-[#5447DC] mb-3">
              Nền tảng phỏng vấn kỹ thuật &amp; đánh giá năng lực chuẩn Rubric
            </p>
            <h1 className="font-display text-[clamp(2.15rem,4vw,3.35rem)] font-extrabold leading-[1.12] tracking-tight text-[#19253C] text-balance">
              Luyện phỏng vấn kỹ thuật như buổi đánh giá thực tế
            </h1>
            <p className="mt-5 text-base sm:text-lg text-[#5A6782] leading-relaxed max-w-xl">
              Thực hành đối thoại trực tiếp với AI Giám khảo theo ngữ cảnh CV, viết và chạy thử mã nguồn ngay trên trình duyệt, sau đó nhận báo cáo điểm số minh bạch theo từng tiêu chí Rubric.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate(user ? (user.vai_tro === 'ADMIN' ? 'M15' : 'M08') : 'M04')}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7] transition-colors whitespace-nowrap shrink-0"
              >
                <span>{user ? 'Vào thiết lập phỏng vấn' : 'Bắt đầu luyện tập miễn phí'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('M03')}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-[#19253C] bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Xem chủ đề mẫu</span>
              </button>
            </div>

            <div className="mt-10 pt-6 border-t border-slate-200 grid grid-cols-3 gap-6">
              <div>
                <p className="font-mono text-2xl font-bold text-[#19253C] tabular-nums">
                  {overview?.stats.totalProblems ?? 6}+
                </p>
                <p className="text-xs text-[#5A6782] mt-1">Bài toán chuẩn hóa</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-[#19253C] tabular-nums">
                  {overview?.stats.totalPositions ?? 4}
                </p>
                <p className="text-xs text-[#5A6782] mt-1">Vị trí kỹ thuật</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-[#19253C] tabular-nums">
                  4 trụ cột
                </p>
                <p className="text-xs text-[#5A6782] mt-1">Thang điểm Rubric 100</p>
              </div>
            </div>
          </div>

          {/* Interactive Preview Panel */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="h-full rounded-xl border border-slate-200 bg-[#F4F7FC] p-4 sm:p-5 flex flex-col">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('dialogue')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      previewTab === 'dialogue'
                        ? 'bg-[#5447DC] text-white'
                        : 'text-[#5A6782] hover:text-[#19253C]'
                    }`}
                  >
                    AI Hỏi đáp
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('sandbox')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      previewTab === 'sandbox'
                        ? 'bg-[#5447DC] text-white'
                        : 'text-[#5A6782] hover:text-[#19253C]'
                    }`}
                  >
                    Code Sandbox
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('rubric')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      previewTab === 'rubric'
                        ? 'bg-[#5447DC] text-white'
                        : 'text-[#5A6782] hover:text-[#19253C]'
                    }`}
                  >
                    Báo cáo Rubric
                  </button>
                </div>
                <span className="font-mono text-xs text-[#5A6782] tabular-nums hidden sm:inline">
                  25:00 · Backend
                </span>
              </div>

              <div className="flex-1 mt-4 rounded-lg bg-white border border-slate-200 p-5 flex flex-col justify-between">
                {previewTab === 'dialogue' && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-[#5447DC] mb-1">
                        AI Giám khảo · Câu hỏi mở đầu
                      </p>
                      <p className="text-sm text-[#19253C] leading-relaxed bg-[#F4F7FC] p-3.5 rounded-lg border border-slate-200">
                        Với bài toán Gộp khoảng thời gian chồng lấn (Merge Intervals), trước khi bắt đầu cài đặt hàm, bạn sẽ xử lý dữ liệu đầu vào chưa sắp xếp như thế nào để đạt độ phức tạp O(n log n)?
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#5A6782] mb-1">
                        Trả lời của ứng viên
                      </p>
                      <p className="text-sm text-[#19253C] leading-relaxed bg-[#5447DC]/5 p-3.5 rounded-lg border border-[#5447DC]/20">
                        Em tạo bản sao mảng và sắp xếp tăng dần theo thời điểm bắt đầu, sau đó duyệt tuần tự và so sánh với khoảng cuối cùng đã gộp.
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-[#5A6782]">
                      <span>Gợi ý định hướng khả dụng: 5/5 lượt</span>
                      <span className="font-medium text-[#5447DC]">Không tiết lộ lời giải</span>
                    </div>
                  </div>
                )}

                {previewTab === 'sandbox' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#5A6782]">
                      <span className="font-mono font-medium text-[#19253C]">mergeIntervals.js</span>
                      <span>JavaScript · Node VM Sandbox</span>
                    </div>
                    <pre className="p-3.5 rounded-lg bg-[#19253C] text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto">
{`function mergeIntervals(intervals) {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const res = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = res[res.length - 1];
    if (sorted[i][0] <= last[1]) last[1] = Math.max(last[1], sorted[i][1]);
    else res.push(sorted[i]);
  }
  return res;
}`}
                    </pre>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                      <span className="text-emerald-700 font-medium">
                        Đạt 2/2 Test Case mẫu (2 ms)
                      </span>
                      <span className="text-[#5A6782]">Test ẩn được chấm khi nộp bài</span>
                    </div>
                  </div>
                )}

                {previewTab === 'rubric' && (
                  <div className="space-y-4">
                    <div className="flex items-baseline justify-between border-b border-slate-100 pb-3">
                      <div>
                        <p className="text-xs text-[#5A6782]">Điểm tổng kết Rubric v1</p>
                        <p className="font-mono text-3xl font-bold text-[#19253C] tabular-nums">
                          90.0 <span className="text-sm font-normal text-[#5A6782]">/ 100</span>
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-700">
                        Xuất sắc (Senior Ready)
                      </span>
                    </div>
                    <div className="space-y-2.5 text-xs">
                      {[
                        { name: 'Độ chính xác & Edge Cases (35%)', score: '9.5 / 10' },
                        { name: 'Hiệu năng & Độ phức tạp (25%)', score: '9.0 / 10' },
                        { name: 'Chất lượng Mã nguồn (20%)', score: '8.5 / 10' },
                        { name: 'Giao tiếp Kỹ thuật (20%)', score: '8.8 / 10' },
                      ].map((row) => (
                        <div key={row.name} className="flex items-center justify-between py-1">
                          <span className="text-[#19253C]">{row.name}</span>
                          <span className="font-mono font-semibold text-[#5447DC] tabular-nums">
                            {row.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mechanism to Outcome Flow */}
      <section className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#19253C] tracking-tight">
            Quy trình luyện tập khép kín từ chuẩn bị đến phản hồi
          </h2>
          <p className="mt-3 text-[#5A6782]">
            Mỗi phiên mô phỏng giữ nguyên kỷ luật thời gian thực, bảo toàn bản nháp khi thao tác và chỉ trừ lượt khi bạn xác nhận bắt đầu.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-[#5447DC]/10 text-[#5447DC] flex items-center justify-center mb-4">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-[#19253C]">
              01. Thiết lập bài toán &amp; CV
            </h3>
            <p className="mt-2 text-sm text-[#5A6782] leading-relaxed">
              Chọn vị trí, chủ đề, ngôn ngữ lập trình và tùy chọn đính kèm CV đã kiểm tra. Hệ thống kiểm tra hạn mức trước khi tạo phiên sẵn sàng.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-[#5447DC]/10 text-[#5447DC] flex items-center justify-center mb-4">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-[#19253C]">
              02. Đối thoại &amp; Code Sandbox
            </h3>
            <p className="mt-2 text-sm text-[#5A6782] leading-relaxed">
              Trao đổi giải pháp với AI Giám khảo, xin gợi ý định hướng theo giới hạn phiên và chạy thử trực tiếp với bộ Test Case mẫu.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-[#5447DC]/10 text-[#5447DC] flex items-center justify-center mb-4">
              <LineChart className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-[#19253C]">
              03. Chấm Rubric &amp; Refactoring
            </h3>
            <p className="mt-2 text-sm text-[#5A6782] leading-relaxed">
              Chấm tự động cả Test ẩn sau khi nộp bài, xem điểm chi tiết theo Rubric cố định và nhận gợi ý tối ưu hóa mã nguồn độc lập.
            </p>
          </div>
        </div>
      </section>

      {/* Tracks & CTA */}
      <section className="max-w-[1280px] mx-auto px-6 pb-20">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#19253C]">
              Sẵn sàng kiểm chứng năng lực lập trình và giải quyết vấn đề?
            </h2>
            <p className="mt-2 text-sm text-[#5A6782]">
              Khám phá ngân hàng bài toán theo từng vị trí kỹ sư hoặc đăng nhập tài khoản dùng thử để trải nghiệm ngay phòng phỏng vấn.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('M02')}
              className="px-4 py-2.5 text-sm font-semibold text-[#19253C] bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              Xem chi tiết gói
            </button>
            <button
              type="button"
              onClick={() => onNavigate('M05')}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7] whitespace-nowrap"
            >
              Đăng nhập ngay
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export const M02PricingPage: React.FC<{
  tiers: ServiceTier[];
  user: AuthUser | null;
  onNavigate: (s: ScreenId) => void;
}> = ({ tiers, user, onNavigate }) => {
  return (
    <div className="max-w-[1280px] mx-auto px-6 py-14">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#19253C] tracking-tight">
          Bảng giá &amp; Hạn mức sử dụng dịch vụ
        </h1>
        <p className="mt-3 text-[#5A6782] leading-relaxed">
          Thông tin các gói dịch vụ đang phát hành và hạn mức tài nguyên mỗi tháng. Đây là trang tham khảo chính sách hạn mức, không thực hiện giao dịch thanh toán trực tuyến.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={`rounded-xl bg-white p-6 flex flex-col justify-between ${
              tier.noi_bat
                ? 'border-2 border-[#5447DC]'
                : 'border border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-xl font-bold text-[#19253C]">{tier.ten_goi}</h2>
                {tier.noi_bat && (
                  <span className="text-xs font-semibold text-[#5447DC]">Phổ biến</span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-[#5A6782]">{tier.doi_tuong}</p>

              <div className="mt-5 pb-5 border-b border-slate-200 flex items-baseline gap-2">
                <span className="font-mono text-3xl font-bold text-[#19253C] tabular-nums">
                  {tier.gia_hien_thi}
                </span>
                <span className="text-xs text-[#5A6782]">/ {tier.chu_ky}</span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center bg-[#F4F7FC] rounded-lg p-3 border border-slate-200">
                <div>
                  <p className="font-mono text-base font-bold text-[#19253C] tabular-nums">
                    {tier.so_luot_phong_van_thang}
                  </p>
                  <p className="text-[11px] text-[#5A6782]">Phiên / tháng</p>
                </div>
                <div>
                  <p className="font-mono text-base font-bold text-[#19253C] tabular-nums">
                    {tier.gioi_han_goi_y_phien}
                  </p>
                  <p className="text-[11px] text-[#5A6782]">Gợi ý / phiên</p>
                </div>
                <div>
                  <p className="font-mono text-base font-bold text-[#19253C] tabular-nums">
                    {tier.gioi_han_cv_mb} MB
                  </p>
                  <p className="text-[11px] text-[#5A6782]">Tệp CV tối đa</p>
                </div>
              </div>

              <ul className="mt-5 space-y-2.5 text-sm text-[#19253C]">
                {tier.quyen_loi.map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#5447DC] shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onNavigate(user ? 'M08' : 'M04')}
                className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors ${
                  tier.noi_bat
                    ? 'bg-[#5447DC] text-white hover:bg-[#4437C7]'
                    : 'bg-white text-[#19253C] border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {user ? 'Đi tới thiết lập phỏng vấn' : 'Đăng ký tài khoản miễn phí'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Matrix */}
      <div className="mt-12 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-display text-lg font-bold text-[#19253C]">
            Ma trận đối chiếu hạn mức kỹ thuật
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F4F7FC] text-[#5A6782] text-xs">
              <tr>
                <th className="py-3 px-6 font-semibold">Thông số hạn mức</th>
                {tiers.map((t) => (
                  <th key={t.id} className="py-3 px-6 font-semibold text-right">
                    {t.ten_goi}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="py-3.5 px-6 text-[#19253C]">Số lượt phỏng vấn mỗi tháng</td>
                {tiers.map((t) => (
                  <td key={t.id} className="py-3.5 px-6 text-right font-mono tabular-nums">
                    {t.so_luot_phong_van_thang} lượt
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3.5 px-6 text-[#19253C]">Giới hạn gợi ý định hướng mỗi phiên</td>
                {tiers.map((t) => (
                  <td key={t.id} className="py-3.5 px-6 text-right font-mono tabular-nums">
                    {t.gioi_han_goi_y_phien} lượt
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3.5 px-6 text-[#19253C]">Dung lượng tệp CV tối đa</td>
                {tiers.map((t) => (
                  <td key={t.id} className="py-3.5 px-6 text-right font-mono tabular-nums">
                    {t.gioi_han_cv_mb} MB
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3.5 px-6 text-[#19253C]">Chấm điểm Rubric &amp; Refactoring AI</td>
                {tiers.map((t) => (
                  <td key={t.id} className="py-3.5 px-6 text-right text-emerald-700 font-medium">
                    Đầy đủ
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const M03SampleTopicsPage: React.FC<{
  overview: PublicOverviewData | null;
  user: AuthUser | null;
  onNavigate: (s: ScreenId) => void;
}> = ({ overview, user, onNavigate }) => {
  const [selectedPos, setSelectedPos] = useState<string>('ALL');
  const [selectedProb, setSelectedProb] = useState<ProblemItem | null>(null);

  const problems = (overview?.sampleProblems || []).filter(
    (p) => selectedPos === 'ALL' || p.vi_tri_id === selectedPos
  );

  useEffect(() => {
    if (!selectedProb && problems.length > 0) {
      setSelectedProb(problems[0]);
    }
  }, [problems, selectedProb]);

  const posMap = new Map((overview?.positions || []).map((p) => [p.id, p.ten_vi_tri]));
  const topicMap = new Map((overview?.topics || []).map((t) => [t.id, t.ten_chu_de]));

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-14">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#19253C] tracking-tight">
            Chủ đề phỏng vấn &amp; Bài toán mẫu
          </h1>
          <p className="mt-2 text-[#5A6782]">
            Khám phá cấu trúc đề bài và bộ Test Case mẫu công khai trước khi tạo tài khoản luyện tập.
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedPos('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
              selectedPos === 'ALL'
                ? 'bg-[#5447DC] text-white'
                : 'text-[#5A6782] hover:text-[#19253C]'
            }`}
          >
            Tất cả vị trí
          </button>
          {(overview?.positions || []).map((pos) => (
            <button
              key={pos.id}
              type="button"
              onClick={() => setSelectedPos(pos.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                selectedPos === pos.id
                  ? 'bg-[#5447DC] text-white'
                  : 'text-[#5A6782] hover:text-[#19253C]'
              }`}
            >
              {pos.ten_vi_tri}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-3">
          {problems.map((p) => {
            const active = selectedProb?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedProb(p)}
                className={`w-full text-left p-5 rounded-xl border transition-colors ${
                  active
                    ? 'bg-white border-[#5447DC]'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 text-xs text-[#5A6782]">
                  <span>{posMap.get(p.vi_tri_id)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{topicMap.get(p.chu_de_id)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-[#19253C]">{difficultyLabel(p.do_kho)}</span>
                </div>
                <h3 className="mt-1.5 font-display text-base font-bold text-[#19253C]">
                  {p.tieu_de}
                </h3>
                <p className="mt-1.5 text-xs text-[#5A6782] line-clamp-2">{p.mo_ta_chi_tiet}</p>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-7">
          {selectedProb ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#5A6782]">
                    <span>{posMap.get(selectedProb.vi_tri_id)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{topicMap.get(selectedProb.chu_de_id)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{selectedProb.thoi_luong_phut_mac_dinh} phút</span>
                  </div>
                  <h2 className="mt-1 font-display text-xl font-bold text-[#19253C]">
                    {selectedProb.tieu_de}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate(user ? 'M08' : 'M05')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7] whitespace-nowrap"
                >
                  <Play className="w-4 h-4" />
                  <span>{user ? 'Luyện bài này' : 'Đăng nhập để thực hành'}</span>
                </button>
              </div>

              <div className="mt-5 space-y-5 text-sm">
                <div>
                  <h4 className="font-semibold text-[#19253C] mb-1.5">Mô tả bài toán</h4>
                  <p className="text-[#5A6782] leading-relaxed">{selectedProb.mo_ta_chi_tiet}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-lg bg-[#F4F7FC] border border-slate-200">
                    <p className="text-xs font-semibold text-[#19253C] mb-1">Đầu vào</p>
                    <p className="text-xs text-[#5A6782]">{selectedProb.yeu_cau_dau_vao}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-[#F4F7FC] border border-slate-200">
                    <p className="text-xs font-semibold text-[#19253C] mb-1">Đầu ra mong đợi</p>
                    <p className="text-xs text-[#5A6782]">{selectedProb.yeu_cau_dau_ra}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-[#19253C] mb-2">Ví dụ Test Case công khai (Sample)</h4>
                  <div className="space-y-2.5">
                    {(selectedProb.sample_tests || []).map((tc) => (
                      <div key={tc.id} className="p-3.5 rounded-lg bg-[#F4F7FC] border border-slate-200 font-mono text-xs">
                        <p className="font-sans font-semibold text-[#19253C] mb-1">{tc.ten_test}</p>
                        <p className="text-[#5A6782]">Input: <span className="text-[#19253C]">{tc.dau_vao}</span></p>
                        <p className="text-[#5A6782]">Output: <span className="text-emerald-700 font-semibold">{tc.dau_ra_mong_doi}</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const M04RegisterPage: React.FC<{
  onNavigate: (s: ScreenId) => void;
  onSuccessMessage: (msg: string) => void;
}> = ({ onNavigate, onSuccessMessage }) => {
  const [hoTen, setHoTen] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPass) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ho_ten: hoTen, email, password }),
      });
      onSuccessMessage('Đăng ký tài khoản thành công. Vui lòng đăng nhập để bắt đầu.');
      onNavigate('M05');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-14">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-[#19253C]">Tạo tài khoản ứng viên</h1>
        <p className="mt-1.5 text-sm text-[#5A6782]">
          Khởi tạo hồ sơ luyện phỏng vấn AI miễn phí với gói Starter.
        </p>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#19253C] mb-1.5">Họ và tên</label>
            <input
              type="text"
              required
              value={hoTen}
              onChange={(e) => setHoTen(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn An"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#5447DC]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#19253C] mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#5447DC]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#19253C] mb-1.5">
              Mật khẩu (tối thiểu 8 ký tự)
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 pr-10 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#5447DC]"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#19253C]"
                aria-label="Ẩn/hiện mật khẩu"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#19253C] mb-1.5">
              Nhập lại mật khẩu
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              required
              minLength={8}
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#5447DC]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7] transition-colors disabled:opacity-60"
          >
            {loading ? 'Đang tạo tài khoản...' : 'Đăng ký tài khoản'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-[#5A6782]">
          Đã có tài khoản?{' '}
          <button
            type="button"
            onClick={() => onNavigate('M05')}
            className="font-semibold text-[#5447DC] hover:underline"
          >
            Đăng nhập tại đây
          </button>
        </p>
      </div>
    </div>
  );
};

export const M05LoginPage: React.FC<{
  noticeMessage?: string;
  onLoginSuccess: (payload: {
    token: string;
    user: AuthUser;
    profile: UserProfile | null;
    quota: QuotaInfo | null;
  }) => void;
  onNavigate: (s: ScreenId) => void;
}> = ({ noticeMessage, onLoginSuccess, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch<{
        token: string;
        user: AuthUser;
        profile: UserProfile | null;
        quota: QuotaInfo | null;
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });
      setStoredToken(data.token);
      onLoginSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(email, password);
  };

  return (
    <div className="max-w-md mx-auto px-6 py-14">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="flex items-center gap-2 text-[#5447DC] mb-2">
          <Lock className="w-4 h-4" />
          <span className="text-xs font-semibold">Xác thực hệ thống</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-[#19253C]">Đăng nhập hệ thống</h1>
        <p className="mt-1.5 text-sm text-[#5A6782]">
          Truy cập phòng phỏng vấn AI hoặc bảng điều khiển quản trị theo vai trò tài khoản.
        </p>

        {noticeMessage && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
            {noticeMessage}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#19253C] mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@aced.io.vn"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#5447DC]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#19253C] mb-1.5">Mật khẩu</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 pr-10 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#5447DC]"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#19253C]"
                aria-label="Ẩn/hiện mật khẩu"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7] transition-colors disabled:opacity-60"
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>

        {/* Demo Quick Access */}
        <div className="mt-6 pt-5 border-t border-slate-200">
          <p className="text-xs font-semibold text-[#5A6782] mb-2.5">
            Tài khoản trải nghiệm nhanh:
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setEmail('user@aced.io.vn');
                setPassword('User@12345');
                performLogin('user@aced.io.vn', 'User@12345');
              }}
              className="px-3 py-2 text-xs font-semibold text-[#19253C] bg-[#F4F7FC] border border-slate-200 rounded-lg hover:border-[#5447DC] transition-colors text-left"
            >
              <span className="block">Ứng viên (USER)</span>
              <span className="font-mono text-[11px] text-[#5A6782]">user@aced.io.vn</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setEmail('admin@aced.io.vn');
                setPassword('Admin@12345');
                performLogin('admin@aced.io.vn', 'Admin@12345');
              }}
              className="px-3 py-2 text-xs font-semibold text-[#19253C] bg-[#F4F7FC] border border-slate-200 rounded-lg hover:border-[#5447DC] transition-colors text-left"
            >
              <span className="block">Quản trị (ADMIN)</span>
              <span className="font-mono text-[11px] text-[#5A6782]">admin@aced.io.vn</span>
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-[#5A6782]">
          Chưa có tài khoản?{' '}
          <button
            type="button"
            onClick={() => onNavigate('M04')}
            className="font-semibold text-[#5447DC] hover:underline"
          >
            Tạo tài khoản mới
          </button>
        </p>
      </div>
    </div>
  );
};

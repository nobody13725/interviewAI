import React, { useEffect, useState } from 'react';
import { PublicLayout, WorkspaceLayout } from './components/Layout';
import { apiFetch, getStoredToken, setStoredToken } from './lib/api';
import {
  M15AdminDashboardPage,
  M16UsersPage,
  M17CatalogPage,
  M18ProblemsPage,
  M19TestCasesPage,
} from './pages/AdminCorePages';
import {
  M20AiContentPage,
  M21PromptsPage,
  M22RubricsPage,
  M23TiersPage,
  M24FeedbackTriagePage,
} from './pages/AdminConfigPages';
import { M10InterviewWorkspace } from './pages/InterviewWorkspace';
import {
  M01LandingPage,
  M02PricingPage,
  M03SampleTopicsPage,
  M04RegisterPage,
  M05LoginPage,
} from './pages/PublicPages';
import {
  M11ReportPage,
  M12HistoryPage,
  M13AnalyticsPage,
  M14FeedbackPage,
} from './pages/UserInsightsPages';
import {
  M06ProfilePage,
  M07ProblemBankPage,
  M08SetupPage,
  M09CvUploadPage,
} from './pages/UserPracticePages';
import type {
  AuthUser,
  PositionItem,
  ProblemItem,
  QuotaInfo,
  ScreenId,
  ServiceTier,
  TopicItem,
  UserProfile,
} from './types';

interface PublicOverviewData {
  tiers: ServiceTier[];
  positions: PositionItem[];
  topics: TopicItem[];
  sampleProblems: ProblemItem[];
  stats: { totalProblems: number; totalTopics: number; totalPositions: number };
}

const SCREEN_META: Record<ScreenId, { title: string; crumbs: string[] }> = {
  M01: { title: 'Giới thiệu nền tảng', crumbs: ['Trang chủ'] },
  M02: { title: 'Bảng giá & Hạn mức', crumbs: ['Trang chủ', 'Bảng giá'] },
  M03: { title: 'Chủ đề phỏng vấn mẫu', crumbs: ['Trang chủ', 'Chủ đề mẫu'] },
  M04: { title: 'Đăng ký tài khoản', crumbs: ['Trang chủ', 'Đăng ký'] },
  M05: { title: 'Đăng nhập hệ thống', crumbs: ['Trang chủ', 'Đăng nhập'] },
  M06: { title: 'Hồ sơ cá nhân', crumbs: ['Ứng viên', 'Hồ sơ'] },
  M07: { title: 'Ngân hàng bài toán & Yêu thích', crumbs: ['Ứng viên', 'Bài toán'] },
  M08: { title: 'Cấu hình phỏng vấn', crumbs: ['Ứng viên', 'Thiết lập phiên'] },
  M09: { title: 'Tải & Xác nhận CV', crumbs: ['Ứng viên', 'Hồ sơ CV'] },
  M10: { title: 'Phòng phỏng vấn & Code Sandbox', crumbs: ['Ứng viên', 'Phiên trực tiếp'] },
  M11: { title: 'Báo cáo đánh giá & Refactoring', crumbs: ['Ứng viên', 'Báo cáo Rubric'] },
  M12: { title: 'Lịch sử & Bản ghi phiên', crumbs: ['Ứng viên', 'Lịch sử'] },
  M13: { title: 'Thống kê năng lực cá nhân', crumbs: ['Ứng viên', 'Thống kê'] },
  M14: { title: 'Gửi báo lỗi & Phản hồi', crumbs: ['Ứng viên', 'Phản hồi'] },
  M15: { title: 'Bảng điều khiển quản trị', crumbs: ['Quản trị', 'Tổng quan'] },
  M16: { title: 'Quản lý tài khoản người dùng', crumbs: ['Quản trị', 'Người dùng'] },
  M17: { title: 'Danh mục Vị trí & Chủ đề', crumbs: ['Quản trị', 'Danh mục'] },
  M18: { title: 'Quản lý & Biên tập bài toán', crumbs: ['Quản trị', 'Bài toán'] },
  M19: { title: 'Quản lý Test Case (Sample & Hidden)', crumbs: ['Quản trị', 'Test Case'] },
  M20: { title: 'Sinh nội dung AI & Kiểm duyệt', crumbs: ['Quản trị', 'Sinh đề AI'] },
  M21: { title: 'Quản lý Prompt Templates', crumbs: ['Quản trị', 'Prompt'] },
  M22: { title: 'Quản lý Rubric & Trọng số', crumbs: ['Quản trị', 'Rubric'] },
  M23: { title: 'Cấu hình Gói dịch vụ & Hạn mức', crumbs: ['Quản trị', 'Gói dịch vụ'] },
  M24: { title: 'Tiếp nhận & Xử lý phản hồi', crumbs: ['Quản trị', 'Phản hồi'] },
};

const PUBLIC_SCREENS = new Set<ScreenId>(['M01', 'M02', 'M03', 'M04', 'M05']);
const ADMIN_SCREENS = new Set<ScreenId>([
  'M15', 'M16', 'M17', 'M18', 'M19', 'M20', 'M21', 'M22', 'M23', 'M24',
]);

export default function App() {
  const [screen, setScreen] = useState<ScreenId>('M01');
  const [overview, setOverview] = useState<PublicOverviewData | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [hydrating, setHydrating] = useState(true);

  const [loginNotice, setLoginNotice] = useState('');
  const [selectedProblemForSetup, setSelectedProblemForSetup] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeReportSessionId, setActiveReportSessionId] = useState<string | null>(null);
  const [adminTestProblemId, setAdminTestProblemId] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      const data = await apiFetch<PublicOverviewData>('/api/public/overview');
      setOverview(data);
    } catch {
      // ignore initial overview failure
    }
  };

  const refreshMe = async () => {
    const token = getStoredToken();
    if (!token) {
      setHydrating(false);
      return;
    }
    try {
      const data = await apiFetch<{
        user: AuthUser;
        profile: UserProfile | null;
        quota: QuotaInfo | null;
      }>('/api/auth/me');
      setUser(data.user);
      setProfile(data.profile);
      setQuota(data.quota);
    } catch {
      setStoredToken(null);
      setUser(null);
      setProfile(null);
      setQuota(null);
    } finally {
      setHydrating(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    refreshMe();
  }, []);

  const navigate = (next: ScreenId) => {
    setLoginNotice('');
    if (!PUBLIC_SCREENS.has(next) && !user) {
      setScreen('M05');
      return;
    }
    if (ADMIN_SCREENS.has(next) && user?.vai_tro !== 'ADMIN') {
      setScreen('M08');
      return;
    }
    setScreen(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setStoredToken(null);
    setUser(null);
    setProfile(null);
    setQuota(null);
    setScreen('M01');
  };

  if (hydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7FC] text-sm text-[#5A6782]">
        Đang khởi tạo phiên làm việc...
      </div>
    );
  }

  // Public Pages M01-M05
  if (PUBLIC_SCREENS.has(screen) || !user) {
    return (
      <PublicLayout currentScreen={screen} onNavigate={navigate} user={user}>
        {screen === 'M01' && (
          <M01LandingPage overview={overview} user={user} onNavigate={navigate} />
        )}
        {screen === 'M02' && (
          <M02PricingPage tiers={overview?.tiers || []} user={user} onNavigate={navigate} />
        )}
        {screen === 'M03' && (
          <M03SampleTopicsPage overview={overview} user={user} onNavigate={navigate} />
        )}
        {screen === 'M04' && (
          <M04RegisterPage
            onNavigate={navigate}
            onSuccessMessage={(msg) => setLoginNotice(msg)}
          />
        )}
        {(screen === 'M05' || !PUBLIC_SCREENS.has(screen)) && (
          <M05LoginPage
            noticeMessage={loginNotice}
            onNavigate={navigate}
            onLoginSuccess={(payload) => {
              setUser(payload.user);
              setProfile(payload.profile);
              setQuota(payload.quota);
              setLoginNotice('');
              setScreen(payload.user.vai_tro === 'ADMIN' ? 'M15' : 'M08');
            }}
          />
        )}
      </PublicLayout>
    );
  }

  const meta = SCREEN_META[screen] || SCREEN_META.M08;

  return (
    <WorkspaceLayout
      currentScreen={screen}
      onNavigate={navigate}
      user={user}
      profile={profile}
      quota={quota}
      onLogout={handleLogout}
      pageTitle={meta.title}
      breadcrumbs={meta.crumbs}
      headerActions={
        user.vai_tro === 'USER' && screen !== 'M10' ? (
          <button
            type="button"
            onClick={() => navigate('M08')}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7] whitespace-nowrap shrink-0"
          >
            Phỏng vấn mới
          </button>
        ) : null
      }
    >
      {/* USER SCREENS M06 - M14 */}
      {screen === 'M06' && (
        <M06ProfilePage
          profile={profile}
          quota={quota}
          onProfileUpdated={(p) => setProfile(p)}
        />
      )}
      {screen === 'M07' && (
        <M07ProblemBankPage
          onStartSetupWithProblem={(probId) => {
            setSelectedProblemForSetup(probId);
            setScreen('M08');
          }}
        />
      )}
      {screen === 'M08' && (
        <M08SetupPage
          preselectedProblemId={selectedProblemForSetup}
          quota={quota}
          defaultLanguage={profile?.ngon_ngu_mac_dinh}
          onSessionReady={(sessionId) => {
            setActiveSessionId(sessionId);
            setScreen('M10');
          }}
          onNavigate={navigate}
        />
      )}
      {screen === 'M09' && (
        <M09CvUploadPage quota={quota} onNavigate={navigate} />
      )}
      {screen === 'M10' && activeSessionId && (
        <M10InterviewWorkspace
          sessionId={activeSessionId}
          onQuotaRefresh={refreshMe}
          onSessionCompleted={(sessId) => {
            setActiveReportSessionId(sessId);
            refreshMe();
            setScreen('M11');
          }}
          onBackToSetup={() => setScreen('M08')}
        />
      )}
      {screen === 'M10' && !activeSessionId && (
        <M08SetupPage
          quota={quota}
          defaultLanguage={profile?.ngon_ngu_mac_dinh}
          onSessionReady={(sessionId) => {
            setActiveSessionId(sessionId);
            setScreen('M10');
          }}
          onNavigate={navigate}
        />
      )}
      {screen === 'M11' && activeReportSessionId && (
        <M11ReportPage sessionId={activeReportSessionId} onNavigate={navigate} />
      )}
      {screen === 'M11' && !activeReportSessionId && (
        <M12HistoryPage
          onOpenSession={(id) => {
            setActiveSessionId(id);
            setScreen('M10');
          }}
          onOpenReport={(id) => {
            setActiveReportSessionId(id);
            setScreen('M11');
          }}
        />
      )}
      {screen === 'M12' && (
        <M12HistoryPage
          onOpenSession={(id) => {
            setActiveSessionId(id);
            setScreen('M10');
          }}
          onOpenReport={(id) => {
            setActiveReportSessionId(id);
            setScreen('M11');
          }}
        />
      )}
      {screen === 'M13' && <M13AnalyticsPage />}
      {screen === 'M14' && <M14FeedbackPage />}

      {/* ADMIN SCREENS M15 - M24 */}
      {screen === 'M15' && <M15AdminDashboardPage onNavigate={navigate} />}
      {screen === 'M16' && <M16UsersPage />}
      {screen === 'M17' && <M17CatalogPage />}
      {screen === 'M18' && (
        <M18ProblemsPage
          onOpenTestCases={(probId) => {
            setAdminTestProblemId(probId);
            setScreen('M19');
          }}
        />
      )}
      {screen === 'M19' && <M19TestCasesPage initialProblemId={adminTestProblemId} />}
      {screen === 'M20' && <M20AiContentPage onNavigate={navigate} />}
      {screen === 'M21' && <M21PromptsPage />}
      {screen === 'M22' && <M22RubricsPage />}
      {screen === 'M23' && <M23TiersPage />}
      {screen === 'M24' && <M24FeedbackTriagePage />}
    </WorkspaceLayout>
  );
}

import React, { useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Briefcase,
  CheckSquare,
  Code2,
  CreditCard,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareWarning,
  Play,
  Sliders,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import type { AuthUser, QuotaInfo, ScreenId, UserProfile } from '../types';

interface PublicLayoutProps {
  currentScreen: ScreenId;
  onNavigate: (s: ScreenId) => void;
  user: AuthUser | null;
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({
  currentScreen,
  onNavigate,
  user,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: Array<{ id: ScreenId; label: string }> = [
    { id: 'M01', label: 'Giới thiệu' },
    { id: 'M02', label: 'Bảng giá' },
    { id: 'M03', label: 'Chủ đề mẫu' },
    { id: 'M05', label: user ? 'Không gian làm việc' : 'Đăng nhập' },
  ];

  const handleNavClick = (id: ScreenId) => {
    setMobileMenuOpen(false);
    if (id === 'M05' && user) {
      onNavigate(user.vai_tro === 'ADMIN' ? 'M15' : 'M08');
      return;
    }
    onNavigate(id);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FC] text-[#19253C]">
      {/* Strict 3-zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single clean text element wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('M01')}
            className="font-display text-xl font-bold tracking-tight text-[#19253C] whitespace-nowrap shrink-0 hover:text-[#5447DC] transition-colors"
          >
            aced.io
          </button>

          {/* Zone 2: 4 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5A6782]">
            {navItems.map((item) => {
              const active = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                    active
                      ? 'text-[#5447DC] border-[#5447DC]'
                      : 'border-transparent hover:text-[#19253C] hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary CTA */}
          <div className="hidden md:flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onNavigate(user ? (user.vai_tro === 'ADMIN' ? 'M15' : 'M08') : 'M04')}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#5447DC] rounded-lg hover:bg-[#4437C7] transition-colors whitespace-nowrap shrink-0"
            >
              {user ? 'Vào luyện tập' : 'Tạo tài khoản'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden p-2 text-[#19253C] rounded-lg hover:bg-slate-100"
            aria-label="Mở menu điều hướng"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-6 py-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className="block w-full text-left py-2.5 text-sm font-medium text-[#19253C] hover:text-[#5447DC]"
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate(user ? (user.vai_tro === 'ADMIN' ? 'M15' : 'M08') : 'M04');
              }}
              className="w-full mt-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#5447DC] rounded-lg"
            >
              {user ? 'Vào luyện tập' : 'Tạo tài khoản'}
            </button>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-[#5A6782]">
          <div>
            <span className="font-display font-bold text-[#19253C]">aced.io</span>
            <span className="mx-2 text-slate-300">·</span>
            <span>Nền tảng giả lập phỏng vấn kỹ thuật &amp; đánh giá kỹ năng theo Rubric</span>
          </div>
          <div className="flex items-center gap-6">
            <button type="button" onClick={() => onNavigate('M02')} className="hover:text-[#19253C]">
              Bảng giá
            </button>
            <button type="button" onClick={() => onNavigate('M03')} className="hover:text-[#19253C]">
              Chủ đề mẫu
            </button>
            <button type="button" onClick={() => onNavigate('M05')} className="hover:text-[#19253C]">
              Đăng nhập
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

interface WorkspaceLayoutProps {
  currentScreen: ScreenId;
  onNavigate: (s: ScreenId) => void;
  user: AuthUser;
  profile: UserProfile | null;
  quota: QuotaInfo | null;
  onLogout: () => void;
  pageTitle: string;
  breadcrumbs: string[];
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  currentScreen,
  onNavigate,
  user,
  profile,
  quota,
  onLogout,
  pageTitle,
  breadcrumbs,
  headerActions,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdmin = user.vai_tro === 'ADMIN';

  const userMenu: Array<{ id: ScreenId; label: string; icon: React.ReactNode }> = [
    { id: 'M08', label: 'Thiết lập phỏng vấn', icon: <Play className="w-4 h-4" /> },
    { id: 'M07', label: 'Ngân hàng bài toán', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'M09', label: 'Hồ sơ CV', icon: <FileText className="w-4 h-4" /> },
    { id: 'M12', label: 'Lịch sử & Bản ghi', icon: <History className="w-4 h-4" /> },
    { id: 'M13', label: 'Thống kê năng lực', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'M06', label: 'Hồ sơ cá nhân', icon: <User className="w-4 h-4" /> },
    { id: 'M14', label: 'Báo lỗi & Phản hồi', icon: <MessageSquareWarning className="w-4 h-4" /> },
  ];

  const adminMenu: Array<{ id: ScreenId; label: string; icon: React.ReactNode }> = [
    { id: 'M15', label: 'Tổng quan quản trị', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'M16', label: 'Tài khoản người dùng', icon: <Users className="w-4 h-4" /> },
    { id: 'M17', label: 'Vị trí & Chủ đề', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'M18', label: 'Ngân hàng bài toán', icon: <Code2 className="w-4 h-4" /> },
    { id: 'M19', label: 'Quản lý Test Case', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'M20', label: 'Sinh bài toán AI', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'M21', label: 'Prompt Templates', icon: <Sliders className="w-4 h-4" /> },
    { id: 'M22', label: 'Rubric & Thang điểm', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'M23', label: 'Gói dịch vụ & Hạn mức', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'M24', label: 'Xử lý phản hồi', icon: <MessageSquareWarning className="w-4 h-4" /> },
  ];

  const activeItems = isAdmin ? adminMenu : userMenu;

  const SidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-[260px]">
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 shrink-0">
        <button
          type="button"
          onClick={() => onNavigate('M01')}
          className="font-display text-xl font-bold tracking-tight text-[#19253C] hover:text-[#5447DC]"
        >
          aced.io
        </button>
        <span className="text-xs font-medium text-[#5A6782]">
          {isAdmin ? 'Quản trị' : 'Ứng viên'}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {activeItems.map((item) => {
          const active =
            currentScreen === item.id ||
            (item.id === 'M12' && currentScreen === 'M11') ||
            (item.id === 'M08' && currentScreen === 'M10');
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSidebarOpen(false);
                onNavigate(item.id);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[#5447DC]/10 text-[#5447DC]'
                  : 'text-[#5A6782] hover:bg-slate-100 hover:text-[#19253C]'
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Quota Summary for USER */}
      {!isAdmin && quota && (
        <div className="mx-3 mb-3 p-3.5 rounded-lg bg-[#F4F7FC] border border-slate-200">
          <div className="flex items-center justify-between text-xs font-medium text-[#19253C]">
            <span className="truncate">{quota.tier?.ten_goi}</span>
            <span className="font-mono tabular-nums text-[#5447DC]">
              {quota.luot_con_lai}/{quota.luot_toi_da} lượt
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-[#5447DC] transition-all"
              style={{
                width: `${Math.min(100, Math.round((quota.luot_da_dung / Math.max(1, quota.luot_toi_da)) * 100))}%`,
              }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-[#5A6782]">
            Tối đa {quota.tier?.gioi_han_goi_y_phien} gợi ý mỗi phiên
          </p>
        </div>
      )}

      <div className="p-3 border-t border-slate-200 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#19253C] truncate">
            {profile?.ho_ten || user.email}
          </p>
          <p className="text-xs text-[#5A6782] truncate">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          title="Đăng xuất"
          className="p-2 text-[#5A6782] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F4F7FC] text-[#19253C]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block shrink-0">{SidebarContent}</aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="fixed inset-0 bg-[#19253C]/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 h-full">{SidebarContent}</div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar inside Workspace */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-[#19253C] hover:bg-slate-100 rounded-lg"
              aria-label="Mở thanh điều hướng"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-[#5A6782] truncate">
                {breadcrumbs.map((b, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span>/</span>}
                    <span className={i === breadcrumbs.length - 1 ? 'text-[#19253C] font-medium' : ''}>
                      {b}
                    </span>
                  </React.Fragment>
                ))}
              </div>
              <h1 className="font-display text-base sm:text-lg font-bold text-[#19253C] truncate">
                {pageTitle}
              </h1>
            </div>
          </div>
          {headerActions && <div className="flex items-center gap-3 shrink-0">{headerActions}</div>}
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

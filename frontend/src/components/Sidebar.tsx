"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard, Upload, FileText, Brain, BookOpen, Layers,
  Search, BarChart3, LogOut, Sparkles, Settings, Shield,
  Globe, Calendar, MessageSquare
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload Notes", icon: Upload },
  { href: "/notes", label: "My Notes", icon: FileText },
  { href: "/ai-chat", label: "AI Assistant", icon: Brain },
  { href: "/flashcards/big-questions", label: "Big Questions", icon: MessageSquare },
  { href: "/quiz", label: "Quizzes", icon: BookOpen },
  { href: "/flashcards", label: "Flashcards", icon: Layers },
  { href: "/revision", label: "Revision Planner", icon: Calendar },
  { href: "/translate", label: "Translate", icon: Globe },
  { href: "/search", label: "Search", icon: Search },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <Sparkles className="text-brand-600" size={24} />
          <span className="font-bold text-lg text-gray-900 dark:text-white">NoteMind AI</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}

        {user?.role === "admin" && (
          <Link
            href="/admin"
            onClick={onClose}
            className={clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname.startsWith("/admin")
                ? "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            <Shield size={18} />
            Admin Panel
          </Link>
        )}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-1">
        <Link
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Settings size={18} />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{user?.display_name}</p>
          <p className="text-xs text-gray-400 truncate">{user?.role}</p>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
        <NavContent />
      </aside>

      {/* Mobile Drawer Overlay */}
      <div
        className={clsx(
          "fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Mobile Drawer */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 shadow-xl lg:hidden transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}

import { Link } from "@heroui/link";

import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 ml-64 transition-all duration-300">
        {/* <Navbar /> */}
        <main className="flex-1 overflow-y-auto p-6 pt-20">
          <div className="container mx-auto max-w-7xl">{children}</div>
        </main>
        <footer className="w-full flex items-center justify-center py-3 border-t border-divider bg-content1">
          <p className="text-sm text-default-500">AGYENKWA Company limited</p>
        </footer>
      </div>
    </div>
  );
}

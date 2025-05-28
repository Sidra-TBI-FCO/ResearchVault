import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Mock user data - in a real app this would come from an auth context
  const user = {
    name: "Jane Doe, Ph.D.",
    role: "Investigator",
    initials: "JD"
  };

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(prev => !prev);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile sidebar */}
      <div className={cn(
        "fixed inset-0 z-40 flex md:hidden",
        mobileSidebarOpen ? "block" : "hidden"
      )}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={toggleMobileSidebar}></div>
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <Sidebar user={user} mobile={true} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <Sidebar user={user} />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onMenuClick={toggleMobileSidebar} />
        
        <main className="flex-1 overflow-y-auto p-6 bg-sidra-teal-light/10">
          {children}
        </main>
      </div>
    </div>
  );
}

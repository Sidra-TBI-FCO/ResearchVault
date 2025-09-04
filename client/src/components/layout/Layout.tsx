import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { DatabaseStatus } from "../DatabaseStatus";
import { cn } from "@/lib/utils";
import { useCurrentUser, DUMMY_USERS } from "@/hooks/useCurrentUser";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { currentUser, setCurrentUser } = useCurrentUser();

  const handleUserSwitch = (userId: number) => {
    const user = DUMMY_USERS.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
    }
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
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white h-full">
          <Sidebar 
            currentUser={currentUser} 
            availableUsers={DUMMY_USERS}
            onUserSwitch={handleUserSwitch}
            mobile={true} 
            onClose={toggleMobileSidebar} 
          />
        </div>
      </div>

      {/* Desktop sidebar */}
      <Sidebar 
        currentUser={currentUser} 
        availableUsers={DUMMY_USERS}
        onUserSwitch={handleUserSwitch}
      />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onMenuClick={toggleMobileSidebar} />
        
        <main className="overflow-y-auto p-6 bg-sidra-teal-light/10">
          <DatabaseStatus />
          {children}
        </main>
      </div>
    </div>
  );
}

import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { DatabaseStatus } from "../DatabaseStatus";
import { cn } from "@/lib/utils";

interface DummyUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface LayoutProps {
  children: React.ReactNode;
}

// Dummy users for development/testing (not in database)
const DUMMY_USERS: DummyUser[] = [
  { id: 1, name: 'Dr. Sarah Chen', email: 's.chen@research.org', role: 'Investigator' },
  { id: 2, name: 'Dr. Michael Rodriguez', email: 'm.rodriguez@research.org', role: 'Staff Scientist' },
  { id: 3, name: 'Dr. Emily Hassan', email: 'e.hassan@research.org', role: 'Physician' },
  { id: 4, name: 'Dr. James Wilson', email: 'j.wilson@research.org', role: 'Research Scientist' },
  { id: 5, name: 'Lisa Thompson', email: 'l.thompson@research.org', role: 'Lab Manager' },
  { id: 6, name: 'Dr. Alex Kumar', email: 'a.kumar@research.org', role: 'Postdoctoral Researcher' },
  { id: 7, name: 'Maria Santos', email: 'm.santos@research.org', role: 'PhD Student' },
  { id: 8, name: 'Iris Administrator', email: 'iris.admin@research.org', role: 'Management' },
];

export default function Layout({ children }: LayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<DummyUser>(DUMMY_USERS[0]); // Default to first user

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
        
        <main className="flex-1 overflow-y-auto p-6 bg-sidra-teal-light/10">
          <DatabaseStatus />
          {children}
        </main>
      </div>
    </div>
  );
}

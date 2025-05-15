import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Beaker, LayoutDashboard, Users, FlaskConical, Database, 
  BookOpen, Award, FileText, Table, Handshake, PieChart,
  Settings, LogOut
} from "lucide-react";

interface SidebarProps {
  user: {
    name: string;
    role: string;
    initials: string;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const [location] = useLocation();

  const navItems = [
    { 
      href: "/",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-4 h-4 mr-3" />
    },
    { 
      href: "/scientists",
      label: "Scientists & Staff",
      icon: <Users className="w-4 h-4 mr-3" />
    },
    { 
      href: "/programs",
      label: "Programs (PRM)",
      icon: <Beaker className="w-4 h-4 mr-3" />
    },

    { 
      href: "/projects",
      label: "Projects",
      icon: <FlaskConical className="w-4 h-4 mr-3" />
    },
    { 
      href: "/data-management",
      label: "Data Management",
      icon: <Database className="w-4 h-4 mr-3" />
    },
    { 
      href: "/publications",
      label: "Publications",
      icon: <BookOpen className="w-4 h-4 mr-3" />
    },
    { 
      href: "/patents",
      label: "Patents",
      icon: <Award className="w-4 h-4 mr-3" />
    },
    { 
      href: "/irb",
      label: "IRB Applications",
      icon: <FileText className="w-4 h-4 mr-3" />
    },
    { 
      href: "/ibc",
      label: "IBC Applications",
      icon: <Table className="w-4 h-4 mr-3" />
    },
    { 
      href: "/contracts",
      label: "Research Contracts",
      icon: <Handshake className="w-4 h-4 mr-3" />
    },
    { 
      href: "/reports",
      label: "Reports",
      icon: <PieChart className="w-4 h-4 mr-3" />
    }
  ];

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 border-r border-neutral-100">
        {/* Logo/Brand */}
        <div className="h-16 flex items-center px-4 border-b border-neutral-100">
          <div className="flex items-center space-x-2">
            <Beaker className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg text-primary">ResearchHub</span>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-neutral-100">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 font-medium">
              {user.initials}
            </div>
            <div>
              <div className="font-medium">{user.name}</div>
              <div className="text-sm text-neutral-200">{user.role}</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 pt-2 pb-4 overflow-y-auto">
          <div className="px-2 space-y-1">
            {navItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                  location === item.href 
                    ? "bg-primary-50 text-primary-600 font-medium" 
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        
        {/* Bottom Nav */}
        <div className="border-t border-neutral-100 p-4">
          <div className="flex items-center">
            <button className="flex items-center text-sm text-neutral-300 hover:text-primary-500">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </button>
            <div className="border-l border-neutral-100 h-5 mx-3"></div>
            <button className="flex items-center text-sm text-neutral-300 hover:text-primary-500">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Beaker, LayoutDashboard, Users, FlaskConical, Database, 
  BookOpen, Award, FileText, Table, Handshake, PieChart,
  Settings, LogOut, UserPlus, X, Shield, Biohazard, Building
} from "lucide-react";

interface SidebarProps {
  user: {
    name: string;
    role: string;
    initials: string;
  };
  mobile?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ user, mobile = false, onClose }: SidebarProps) {
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
      label: "Projects (PRJ)",
      icon: <Table className="w-4 h-4 mr-3" />
    },
    { 
      href: "/research-activities",
      label: "Research Activities (SDR)",
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
      href: "/irb-office",
      label: "IRB Office",
      icon: <Shield className="w-4 h-4 mr-3" />
    },
    { 
      href: "/irb-reviewer",
      label: "IRB Reviewer",
      icon: <FileText className="w-4 h-4 mr-3" />
    },
    { 
      href: "/ibc",
      label: "IBC Applications",
      icon: <Biohazard className="w-4 h-4 mr-3" />
    },
    { 
      href: "/ibc-office",
      label: "IBC Office",
      icon: <Building className="w-4 h-4 mr-3" />
    },
    { 
      href: "/ibc-reviewer",
      label: "IBC Reviewer",
      icon: <Biohazard className="w-4 h-4 mr-3" />
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
    <div className={mobile ? "flex flex-shrink-0 h-full" : "hidden md:flex md:flex-shrink-0"}>
      <div className={cn(
        "flex flex-col w-64 border-r border-sidra-teal-light/30 bg-white",
        mobile ? "h-full" : ""
      )}>
        {/* Logo/Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidra-teal-light/30 bg-sidra-gradient">
          <div className="flex items-center space-x-2">
            <Beaker className="h-5 w-5 text-white" />
            <span className="font-semibold text-lg text-white">Sidra Research Portal</span>
          </div>
          {mobile && onClose && (
            <button 
              onClick={onClose}
              className="text-white hover:text-sidra-teal-light"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-sidra-teal-light/30">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-sidra-teal-light flex items-center justify-center text-sidra-teal-dark font-medium">
              {user.initials}
            </div>
            <div>
              <div className="font-medium text-sidra-navy">{user.name}</div>
              <div className="text-sm text-sidra-gray">{user.role}</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className={cn(
          "flex-1 pt-2 pb-4",
          mobile ? "overflow-y-auto max-h-[calc(100vh-200px)]" : "overflow-y-auto"
        )}>
          <div className="px-2 space-y-1">
            {navItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => {
                  // Close mobile menu when navigation item is clicked
                  if (mobile && onClose) {
                    onClose();
                  }
                }}
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-lg transition-colors",
                  location === item.href 
                    ? "bg-sidra-teal text-white font-medium shadow-sm" 
                    : "text-sidra-navy hover:bg-sidra-teal-light/20 hover:text-sidra-teal-dark"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        
        {/* Bottom Nav */}
        <div className={cn(
          "border-t border-neutral-100 p-4",
          mobile ? "flex-shrink-0" : ""
        )}>
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

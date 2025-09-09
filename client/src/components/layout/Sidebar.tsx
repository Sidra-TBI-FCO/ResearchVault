import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Beaker, LayoutDashboard, Users, FlaskConical, Database, 
  BookOpen, Award, FileText, Table, Handshake, PieChart,
  Settings, LogOut, UserPlus, X, Shield, Biohazard, Building,
  FolderTree, FileCheck, ShieldCheck, TestTube, TrendingUp, ChevronDown, Eye
} from "lucide-react";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme, themes } from "@/contexts/ThemeContext";

interface DummyUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface SidebarProps {
  currentUser: DummyUser;
  availableUsers: DummyUser[];
  onUserSwitch: (userId: number) => void;
  mobile?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ currentUser, availableUsers, onUserSwitch, mobile = false, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { isHidden, isReadOnly } = usePermissions();
  const { themeName } = useTheme();

  const handleUserSwitch = (userId: string) => {
    onUserSwitch(parseInt(userId));
  };

  // Generate initials from user name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Map href to navigation item identifier
  const getNavigationItemId = (href: string): string => {
    const pathMap: Record<string, string> = {
      "/": "dashboard",
      "/scientists": "scientists",
      "/facilities": "facilities", 
      "/programs": "programs",
      "/projects": "projects",
      "/research-activities": "research-activities",
      "/irb": "irb-applications",
      "/irb-office": "irb-office",
      "/irb-reviewer": "irb-reviewer",
      "/ibc": "ibc-applications",
      "/ibc-office": "ibc-office",
      "/ibc-reviewer": "ibc-reviewer",
      "/data-management": "data-management",
      "/contracts": "contracts",
      "/publications": "publications",
      "/outcome-office": "outcome-office",
      "/patents": "patents",
      "/reports": "reports",
      "/grants": "grants",
      "/certifications": "certifications",
      "/settings": "settings"
    };
    return pathMap[href] || href.substring(1);
  };

  const navigationSections = [
    {
      title: "Dashboard",
      items: [
        { 
          href: "/",
          label: "Dashboard",
          icon: <LayoutDashboard className="w-4 h-4 mr-3" />
        }
      ]
    },
    {
      title: "Research Management",
      items: [
        { 
          href: "/scientists",
          label: "Scientists & Staff",
          icon: <Users className="w-4 h-4 mr-3" />
        },
        { 
          href: "/facilities",
          label: "Facilities",
          icon: <Building className="w-4 h-4 mr-3" />
        },
        { 
          href: "/programs",
          label: "Programs (PRM)",
          icon: <Beaker className="w-4 h-4 mr-3" />
        },
        { 
          href: "/projects",
          label: "Projects (PRJ)",
          icon: <FlaskConical className="w-4 h-4 mr-3" />
        },
        { 
          href: "/research-activities",
          label: "Research Activities (SDR)",
          icon: <Database className="w-4 h-4 mr-3" />
        },
        { 
          href: "/certifications",
          label: "Certifications",
          icon: <ShieldCheck className="w-4 h-4 mr-3" />
        }
      ]
    },
    {
      title: "IRB Compliance",
      items: [
        { 
          href: "/irb",
          label: "IRB Applications",
          icon: <Shield className="w-4 h-4 mr-3" />
        },
        { 
          href: "/irb-office",
          label: "IRB Office",
          icon: <Building className="w-4 h-4 mr-3" />
        },
        { 
          href: "/irb-reviewer",
          label: "IRB Reviewer",
          icon: <FileCheck className="w-4 h-4 mr-3" />
        }
      ]
    },
    {
      title: "IBC Compliance",
      items: [
        { 
          href: "/ibc",
          label: "IBC Applications",
          icon: <Biohazard className="w-4 h-4 mr-3" />
        },
        { 
          href: "/ibc-office",
          label: "IBC Office",
          icon: <TestTube className="w-4 h-4 mr-3" />
        },
        { 
          href: "/ibc-reviewer",
          label: "IBC Reviewer",
          icon: <ShieldCheck className="w-4 h-4 mr-3" />
        }
      ]
    },
    {
      title: "Research Data Management",
      items: [
        { 
          href: "/data-management",
          label: "Data Management Plans",
          icon: <FileText className="w-4 h-4 mr-3" />
        },
        { 
          href: "/contracts",
          label: "Research Contracts",
          icon: <Handshake className="w-4 h-4 mr-3" />
        },
        { 
          href: "/grants",
          label: "Grants Office",
          icon: <PieChart className="w-4 h-4 mr-3" />
        }
      ]
    },
    {
      title: "Outcomes & Reports",
      items: [
        { 
          href: "/publications",
          label: "Publications",
          icon: <BookOpen className="w-4 h-4 mr-3" />
        },
        { 
          href: "/outcome-office",
          label: "Outcome Office",
          icon: <Building className="w-4 h-4 mr-3" />
        },
        { 
          href: "/patents",
          label: "Patents",
          icon: <Award className="w-4 h-4 mr-3" />
        },
        { 
          href: "/reports",
          label: "Reports",
          icon: <TrendingUp className="w-4 h-4 mr-3" />
        }
      ]
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
          <div className="flex flex-col space-y-0.5">
            <div className="flex items-center space-x-2">
              <Beaker className="h-5 w-5 text-white" />
              <span className="font-semibold text-lg text-white">IRIS</span>
            </div>
            <div className="text-xs text-white/80 ml-7">
              {themes[themeName].name}
            </div>
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
          <div className="flex items-center space-x-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-sidra-teal-light flex items-center justify-center text-sidra-teal-dark font-medium">
              {getInitials(currentUser.role)}
            </div>
            <div className="flex-1">
              <div className="font-medium text-sidra-navy">{currentUser.role}</div>
              <div className="text-xs text-sidra-gray">Role-based Testing</div>
            </div>
          </div>
          
          {/* Role Selector */}
          <Select value={currentUser.id.toString()} onValueChange={handleUserSwitch}>
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue placeholder="Switch role..." />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.map((user) => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 rounded-full bg-sidra-teal-light flex items-center justify-center text-xs text-sidra-teal-dark font-medium">
                      {getInitials(user.role)}
                    </div>
                    <span>{user.role}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Navigation */}
        <nav className={cn(
          "flex-1 pt-2 pb-4",
          mobile ? "overflow-y-auto max-h-[calc(100vh-200px)]" : "overflow-y-auto"
        )}>
          <div className="px-2 space-y-4">
            {navigationSections.map((section, sectionIndex) => (
              <div key={section.title}>
                {sectionIndex > 0 && (
                  <div className="px-3 py-2">
                    <h3 className="text-xs font-semibold text-sidra-gray uppercase tracking-wider">
                      {section.title}
                    </h3>
                  </div>
                )}
                <div className={sectionIndex === 0 ? "space-y-1" : "space-y-1 mt-1"}>
                  {section.items
                    .filter((item) => {
                      const navItemId = getNavigationItemId(item.href);
                      return !isHidden(currentUser.role, navItemId);
                    })
                    .map((item) => {
                      const navItemId = getNavigationItemId(item.href);
                      const itemIsReadOnly = isReadOnly(currentUser.role, navItemId);
                      
                      return (
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
                              : "text-sidra-navy hover:bg-sidra-teal-light/20 hover:text-sidra-teal-dark",
                            itemIsReadOnly && "opacity-80"
                          )}
                        >
                          {item.icon}
                          <span className="flex-1">{item.label}</span>
                          {itemIsReadOnly && (
                            <Eye className="w-3 h-3 ml-2 opacity-60" />
                          )}
                        </Link>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </nav>
        
        {/* Bottom Nav */}
        <div className={cn(
          "border-t border-neutral-100 p-4",
          mobile ? "flex-shrink-0" : ""
        )}>
          <div className="flex items-center">
            <Link 
              href="/settings"
              className="flex items-center text-sm text-neutral-300 hover:text-primary-500"
              onClick={() => {
                // Close mobile menu when navigation item is clicked
                if (mobile && onClose) {
                  onClose();
                }
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Link>
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

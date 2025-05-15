import { Link } from "wouter";
import { 
  PlusCircle, Upload, ClipboardList, Handshake
} from "lucide-react";

interface QuickLinkProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}

function QuickLink({ icon, title, description, href }: QuickLinkProps) {
  return (
    <Link href={href}>
      <a className="flex items-center p-3 border border-neutral-100 rounded-md hover:border-primary-300 hover:bg-primary-50 transition-colors">
        <div className="h-10 w-10 rounded bg-primary-100 flex items-center justify-center text-primary-500 mr-3">
          {icon}
        </div>
        <div>
          <p className="font-medium text-neutral-400">{title}</p>
          <p className="text-xs text-neutral-200">{description}</p>
        </div>
      </a>
    </Link>
  );
}

export default function QuickLinks() {
  const links = [
    {
      icon: <PlusCircle className="h-5 w-5" />,
      title: "Create New Project",
      description: "Start a new research initiative",
      href: "/projects/create"
    },
    {
      icon: <Upload className="h-5 w-5" />,
      title: "Submit Publication",
      description: "Add a new research publication",
      href: "/publications/create"
    },
    {
      icon: <ClipboardList className="h-5 w-5" />,
      title: "Apply for IRB",
      description: "Submit a new IRB application",
      href: "/irb/create"
    },
    {
      icon: <Handshake className="h-5 w-5" />,
      title: "Manage Contracts",
      description: "Review and create research contracts",
      href: "/contracts"
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-neutral-100">
        <h2 className="font-medium text-lg">Quick Links</h2>
      </div>
      <div className="p-6 space-y-4">
        {links.map((link, index) => (
          <QuickLink
            key={index}
            icon={link.icon}
            title={link.title}
            description={link.description}
            href={link.href}
          />
        ))}
      </div>
    </div>
  );
}

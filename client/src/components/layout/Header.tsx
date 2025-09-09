import { useState } from "react";
import { Search, Bell, Menu, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality here
    console.log("Searching for:", searchQuery);
  };

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-primary/30 bg-card shadow-sm">
      <div className="flex items-center md:hidden">
        <button
          className="text-primary hover:text-primary/80"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>
      
      <div className="flex items-center">
        <form onSubmit={handleSearch} className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-muted-foreground" />
          </span>
          <Input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-input rounded-lg text-sm placeholder:text-muted-foreground focus:border-primary focus:ring-primary bg-background text-foreground"
            placeholder="Search projects, people, resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </div>
      
      <div className="flex items-center space-x-4">
        <button className="text-primary hover:text-primary/80 relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-destructive"></span>
        </button>
        <button className="text-primary hover:text-primary/80">
          <HelpCircle className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

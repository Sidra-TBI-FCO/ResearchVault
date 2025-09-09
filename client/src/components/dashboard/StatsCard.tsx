import { cn } from "@/lib/utils";
import { 
  ArrowUpCircle, ArrowDownCircle, MinusCircle, 
  FlaskConical, BookOpen, Award, Clock 
} from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number;
  change?: number; // percentage change
  type: 'projects' | 'publications' | 'patents' | 'applications';
}

export default function StatsCard({ title, value, change, type }: StatsCardProps) {
  // Determine icon based on type
  const getIcon = () => {
    switch (type) {
      case 'projects':
        return <FlaskConical className="h-6 w-6 text-primary" />;
      case 'publications':
        return <BookOpen className="h-6 w-6 text-primary" />;
      case 'patents':
        return <Award className="h-6 w-6 text-primary" />;
      case 'applications':
        return <Clock className="h-6 w-6 text-primary" />;
      default:
        return <FlaskConical className="h-6 w-6 text-primary" />;
    }
  };

  // Determine background color based on type
  const getBgColor = () => {
    switch (type) {
      case 'projects':
        return 'bg-primary/10';
      case 'publications':
        return 'bg-primary/10';
      case 'patents':
        return 'bg-primary/10';
      case 'applications':
        return 'bg-primary/10';
      default:
        return 'bg-primary/10';
    }
  };

  // Render the change indicator and text
  const renderChange = () => {
    if (change === undefined) return null;
    
    if (change > 0) {
      return (
        <span className="text-green-600 dark:text-green-400 flex items-center text-sm">
          <ArrowUpCircle className="w-4 h-4 mr-1" />
          {change.toFixed(1)}%
        </span>
      );
    } else if (change < 0) {
      return (
        <span className="text-red-600 dark:text-red-400 flex items-center text-sm">
          <ArrowDownCircle className="w-4 h-4 mr-1" />
          {Math.abs(change).toFixed(1)}%
        </span>
      );
    } else {
      return (
        <span className="text-muted-foreground flex items-center text-sm">
          <MinusCircle className="w-4 h-4 mr-1" />
          0%
        </span>
      );
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-sm p-6 border">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="text-3xl font-semibold mt-1 text-foreground">{value}</p>
        </div>
        <div className={cn("rounded-full p-2", getBgColor())}>
          {getIcon()}
        </div>
      </div>
      
      {change !== undefined && (
        <div className="mt-4 flex items-center">
          {renderChange()}
          <span className="text-muted-foreground text-sm ml-2">vs previous period</span>
        </div>
      )}
    </div>
  );
}

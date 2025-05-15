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
        return <FlaskConical className="h-6 w-6 text-primary-500" />;
      case 'publications':
        return <BookOpen className="h-6 w-6 text-blue-500" />;
      case 'patents':
        return <Award className="h-6 w-6 text-amber-500" />;
      case 'applications':
        return <Clock className="h-6 w-6 text-yellow-500" />;
      default:
        return <FlaskConical className="h-6 w-6 text-primary-500" />;
    }
  };

  // Determine background color based on type
  const getBgColor = () => {
    switch (type) {
      case 'projects':
        return 'bg-primary-50';
      case 'publications':
        return 'bg-blue-50';
      case 'patents':
        return 'bg-amber-50';
      case 'applications':
        return 'bg-yellow-50';
      default:
        return 'bg-primary-50';
    }
  };

  // Render the change indicator and text
  const renderChange = () => {
    if (change === undefined) return null;
    
    if (change > 0) {
      return (
        <span className="text-green-500 flex items-center text-sm">
          <ArrowUpCircle className="w-4 h-4 mr-1" />
          {change.toFixed(1)}%
        </span>
      );
    } else if (change < 0) {
      return (
        <span className="text-red-500 flex items-center text-sm">
          <ArrowDownCircle className="w-4 h-4 mr-1" />
          {Math.abs(change).toFixed(1)}%
        </span>
      );
    } else {
      return (
        <span className="text-neutral-400 flex items-center text-sm">
          <MinusCircle className="w-4 h-4 mr-1" />
          0%
        </span>
      );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-neutral-200 text-sm">{title}</p>
          <p className="text-3xl font-semibold mt-1 text-neutral-400">{value}</p>
        </div>
        <div className={cn("rounded-full p-2", getBgColor())}>
          {getIcon()}
        </div>
      </div>
      
      {change !== undefined && (
        <div className="mt-4 flex items-center">
          {renderChange()}
          <span className="text-neutral-200 text-sm ml-2">vs previous period</span>
        </div>
      )}
    </div>
  );
}

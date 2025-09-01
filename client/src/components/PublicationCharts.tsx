import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface Publication {
  id: number;
  title: string;
  authors: string;
  journal: string;
  volume: string;
  issue: string;
  pages: string;
  doi: string;
  publicationDate: string;
  publicationType: string;
  status: string;
  abstract: string;
  authorshipType: string;
  authorPosition: number | null;
}

interface AuthorshipStats {
  year: number;
  authorshipType: string;
  count: number;
}

interface PublicationChartsProps {
  scientistId: number;
  yearsSince?: number;
}

const authorshipColors = {
  'First Author': '#3b82f6', // blue
  'Contributing Author': '#10b981', // green
  'Senior/Last Author': '#8b5cf6', // purple
  'Corresponding Author': '#ef4444', // red
};

const authorshipOrder = ['First Author', 'Contributing Author', 'Senior/Last Author', 'Corresponding Author'];
const chartAuthorshipOrder = ['First Author', 'Contributing Author', 'Senior/Last Author']; // Exclude Corresponding Author from chart to avoid overlap

export function PublicationCharts({ scientistId, yearsSince = 5 }: PublicationChartsProps) {
  const { data: publications = [], isLoading: pubLoading } = useQuery({
    queryKey: [`/api/scientists/${scientistId}/publications?years=${yearsSince}`],
  });

  const { data: authorshipStats = [], isLoading: statsLoading } = useQuery({
    queryKey: [`/api/scientists/${scientistId}/authorship-stats?years=${yearsSince}`],
  });

  // Calculate impact factor statistics
  const impactFactorStats = React.useMemo(() => {
    if (!publications.length) return null;
    
    const withImpactFactor = publications.filter(pub => pub.journal && pub.publicationDate);
    const totalPubs = withImpactFactor.length;
    
    if (totalPubs === 0) return null;

    // Simple calculation since we don't have impact factor data yet
    return {
      totalWithJournal: totalPubs,
      averageImpactFactor: 0, // Will be calculated with actual data
      highImpactPubs: 0 // Publications in Q1 journals
    };
  }, [publications]);

  const chartData = React.useMemo(() => {
    if (!authorshipStats.length) return [];
    
    const yearMap = new Map();
    authorshipStats.forEach((stat: AuthorshipStats) => {
      if (!yearMap.has(stat.year)) {
        yearMap.set(stat.year, { year: stat.year });
      }
      
      // Handle compound authorship types by splitting on comma
      const types = stat.authorshipType.split(',').map(type => type.trim());
      types.forEach(type => {
        // Combine Senior Author and Last Author into Senior/Last Author
        const mappedType = (type === 'Senior Author' || type === 'Last Author') ? 'Senior/Last Author' : type;
        const currentCount = yearMap.get(stat.year)[mappedType] || 0;
        yearMap.get(stat.year)[mappedType] = currentCount + parseInt(stat.count.toString());
      });
    });
    
    return Array.from(yearMap.values()).sort((a, b) => a.year - b.year);
  }, [authorshipStats]);

  if (pubLoading || statsLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Publication Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPublications = publications.length;
  const authorshipCounts = publications.reduce((acc: Record<string, number>, pub: Publication) => {
    // Handle compound authorship types by splitting on comma and trimming
    const types = pub.authorshipType.split(',').map(type => type.trim());
    types.forEach(type => {
      // Combine Senior Author and Last Author into Senior/Last Author
      if (type === 'Senior Author' || type === 'Last Author') {
        acc['Senior/Last Author'] = (acc['Senior/Last Author'] || 0) + 1;
      } else {
        acc[type] = (acc[type] || 0) + 1;
      }
    });
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Publication Statistics</CardTitle>
          <CardDescription>
            {totalPublications} publications (Published or In Press only) with authorship breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            {authorshipOrder.map((type) => {
              const count = authorshipCounts[type] || 0;
              if (count === 0) return null;
              return (
                <div key={type} className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">{type}</div>
                  <div className="text-lg font-bold text-gray-900">{count}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Impact Factor Summary */}
      {impactFactorStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Journal Impact Metrics
            </CardTitle>
            <CardDescription>
              Impact factor statistics for publications with journal information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{impactFactorStats.totalWithJournal}</div>
                <div className="text-sm text-blue-600">Publications with Journal</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {impactFactorStats.averageImpactFactor > 0 ? impactFactorStats.averageImpactFactor.toFixed(2) : 'N/A'}
                </div>
                <div className="text-sm text-green-600">Average Impact Factor</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{impactFactorStats.highImpactPubs}</div>
                <div className="text-sm text-purple-600">High Impact (Q1)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Authorship Trends Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Authorship Trends
            </CardTitle>
            <CardDescription>
              Publications by authorship type per year (Published or In Press only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {chartAuthorshipOrder.map((type) => (
                    <Bar 
                      key={type}
                      dataKey={type} 
                      stackId="authorship"
                      fill={authorshipColors[type as keyof typeof authorshipColors]} 
                      name={type}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
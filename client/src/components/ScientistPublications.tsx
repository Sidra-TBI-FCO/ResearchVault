import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, BarChart3 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { format } from "date-fns";

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

interface ScientistPublicationsProps {
  scientistId: number;
  yearsSince?: number;
}

const authorshipColors = {
  'First Author': '#3b82f6', // blue
  'Contributing Author': '#10b981', // green
  'Senior Author': '#8b5cf6', // purple
  'Last Author': '#f59e0b', // amber
  'Corresponding Author': '#ef4444', // red
};

const authorshipOrder = ['First Author', 'Contributing Author', 'Senior Author', 'Last Author', 'Corresponding Author'];

export function ScientistPublications({ scientistId, yearsSince = 5 }: ScientistPublicationsProps) {
  const { data: publications = [], isLoading: pubLoading } = useQuery({
    queryKey: ['/api/scientists', scientistId, 'publications', { years: yearsSince }],
    enabled: !!scientistId,
  });

  const { data: authorshipStats = [], isLoading: statsLoading } = useQuery({
    queryKey: ['/api/scientists', scientistId, 'authorship-stats', { years: yearsSince }],
    enabled: !!scientistId,
  });

  const getAuthorshipBadgeColor = (type: string) => {
    switch (type) {
      case 'First Author': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Contributing Author': return 'bg-green-100 text-green-800 border-green-300';
      case 'Senior Author': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Last Author': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Corresponding Author': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatDOILink = (doi: string) => {
    if (!doi) return null;
    const url = doi.startsWith('http') ? doi : `https://doi.org/${doi}`;
    return url;
  };

  // Transform stats data for chart
  const chartData = React.useMemo(() => {
    const yearMap = new Map();
    
    authorshipStats.forEach((stat: AuthorshipStats) => {
      if (!yearMap.has(stat.year)) {
        yearMap.set(stat.year, { year: stat.year });
      }
      yearMap.get(stat.year)[stat.authorshipType] = stat.count;
    });

    return Array.from(yearMap.values()).sort((a, b) => a.year - b.year);
  }, [authorshipStats]);

  if (pubLoading || statsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Publications (Last {yearsSince} Years)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPublications = publications.length;
  const authorshipCounts = publications.reduce((acc: Record<string, number>, pub: Publication) => {
    acc[pub.authorshipType] = (acc[pub.authorshipType] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Publications Summary (Last {yearsSince} Years)
          </CardTitle>
          <CardDescription>
            {totalPublications} publications with authorship tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {authorshipOrder.map((type) => {
              const count = authorshipCounts[type] || 0;
              return (
                <div key={type} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-600">{type}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Authorship Trends Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Authorship Trends by Year
            </CardTitle>
            <CardDescription>
              Number of publications by authorship type per year
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {authorshipOrder.map((type) => (
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

      {/* Publications List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Publications</CardTitle>
          <CardDescription>
            Detailed list of publications with full author listings including external collaborators
          </CardDescription>
        </CardHeader>
        <CardContent>
          {publications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No publications found in the last {yearsSince} years
            </div>
          ) : (
            <div className="space-y-6">
              {publications.map((pub: Publication) => (
                <div key={pub.id} className="border-l-4 border-gray-200 pl-4 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900 mb-2">
                        {pub.title}
                      </h3>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getAuthorshipBadgeColor(pub.authorshipType)}>
                          {pub.authorshipType}
                          {pub.authorPosition && ` (Position ${pub.authorPosition})`}
                        </Badge>
                        <Badge variant="outline">{pub.status}</Badge>
                      </div>

                      <p className="text-gray-700 text-sm mb-2">
                        <strong>Authors:</strong> {pub.authors}
                      </p>

                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <strong>{pub.journal}</strong>
                          {pub.volume && ` ${pub.volume}`}
                          {pub.issue && `(${pub.issue})`}
                          {pub.pages && `: ${pub.pages}`}
                        </p>
                        <p>
                          Published: {format(new Date(pub.publicationDate), 'MMMM d, yyyy')}
                        </p>
                        {pub.abstract && (
                          <p className="text-gray-700 mt-2 text-sm leading-relaxed">
                            {pub.abstract}
                          </p>
                        )}
                      </div>
                    </div>

                    {pub.doi && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        asChild
                        className="shrink-0"
                      >
                        <a 
                          href={formatDOILink(pub.doi)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          DOI
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
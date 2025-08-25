import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText } from "lucide-react";
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

interface PublicationsListProps {
  scientistId: number;
  yearsSince?: number;
}

const authorshipColors = {
  'First Author': 'bg-blue-100 text-blue-800',
  'Contributing Author': 'bg-green-100 text-green-800',
  'Senior/Last Author': 'bg-purple-100 text-purple-800',
  'Corresponding Author': 'bg-red-100 text-red-800',
};

export function PublicationsList({ scientistId, yearsSince = 5 }: PublicationsListProps) {
  const { data: publications = [], isLoading } = useQuery({
    queryKey: [`/api/scientists/${scientistId}/publications?years=${yearsSince}`],
  });

  if (isLoading) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Publications (Last {yearsSince} Years)
        </CardTitle>
        <CardDescription>
          {publications.length} publications (Published or In Press only) with external collaborator tracking
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {publications.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No publications found for the selected time period.</p>
          ) : (
            publications.map((pub: Publication) => (
              <div key={pub.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900 leading-tight">{pub.title}</h4>
                  <Badge 
                    variant="secondary" 
                    className={`ml-2 text-xs ${(() => {
                      // Map Senior Author and Last Author to Senior/Last Author for display
                      const displayType = pub.authorshipType.split(',').map(type => {
                        const trimmed = type.trim();
                        return (trimmed === 'Senior Author' || trimmed === 'Last Author') ? 'Senior/Last Author' : trimmed;
                      }).join(', ');
                      return authorshipColors[displayType as keyof typeof authorshipColors] || 'bg-gray-100 text-gray-800';
                    })()}`}
                  >
                    {(() => {
                      // Display combined authorship type
                      return pub.authorshipType.split(',').map(type => {
                        const trimmed = type.trim();
                        return (trimmed === 'Senior Author' || trimmed === 'Last Author') ? 'Senior/Last Author' : trimmed;
                      }).join(', ');
                    })()}
                  </Badge>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">{pub.authors}</p>
                
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">{pub.journal}</span>
                  {pub.volume && <span>Vol. {pub.volume}</span>}
                  {pub.issue && <span>({pub.issue})</span>}
                  {pub.pages && <span>pp. {pub.pages}</span>}
                  {pub.publicationDate && (
                    <span>({format(new Date(pub.publicationDate), 'yyyy')})</span>
                  )}
                </div>
                
                {pub.doi && (
                  <div className="mt-2">
                    <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                      <a 
                        href={`https://doi.org/${pub.doi}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        DOI: {pub.doi}
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
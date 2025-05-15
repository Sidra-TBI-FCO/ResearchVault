import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout/Layout";

// Dashboard
import Dashboard from "@/pages/dashboard";

// Scientists
import ScientistsList from "@/pages/scientists";
import CreateScientist from "@/pages/scientists/create";
import ScientistDetail from "@/pages/scientists/detail";

// Programs (PRM)
import ProgramsList from "@/pages/programs";
import ProgramDetail from "@/pages/programs/detail";

// Projects (PRJ)
import ProjectList from "@/pages/projects";
import ProjectDetail from "@/pages/projects/detail";
import CreateProject from "@/pages/projects/create";

// Research Activities (SDR)
import ResearchActivitiesList from "@/pages/research-activities";
import CreateResearchActivity from "@/pages/research-activities/create";
import ResearchActivityDetail from "@/pages/research-activities/detail";
import ResearchActivityTeam from "@/pages/research-activities/team";

// Data Management Plans
import DataManagementList from "@/pages/data-management";
import CreateDataManagement from "@/pages/data-management/create";
import DataManagementPlanDetail from "@/pages/data-management-plans/detail";

// Publications
import PublicationsList from "@/pages/publications";
import CreatePublication from "@/pages/publications/create";
import PublicationDetail from "@/pages/publications/detail";

// Patents
import PatentsList from "@/pages/patents";
import CreatePatent from "@/pages/patents/create";
import PatentDetail from "@/pages/patents/detail";

// IRB Applications
import IrbList from "@/pages/irb";
import CreateIrb from "@/pages/irb/create";
import IrbApplicationDetail from "@/pages/irb-applications/detail";

// IBC Applications
import IbcList from "@/pages/ibc";
import CreateIbc from "@/pages/ibc/create";
import IbcApplicationDetail from "@/pages/ibc-applications/detail";

// Research Contracts
import ContractsList from "@/pages/contracts";
import CreateContract from "@/pages/contracts/create";
import ResearchContractDetail from "@/pages/research-contracts/detail";

// Research Teams
import TeamsList from "@/pages/teams";
import TeamDetail from "@/pages/teams/detail";

function Router() {
  return (
    <Layout>
      <Switch>
        {/* Dashboard */}
        <Route path="/" component={Dashboard} />
        
        {/* Scientists & Staff */}
        <Route path="/scientists" component={ScientistsList} />
        <Route path="/scientists/create" component={CreateScientist} />
        <Route path="/scientists/:id" component={ScientistDetail} />

        {/* Programs */}
        <Route path="/programs" component={ProgramsList} />
        <Route path="/programs/:id" component={ProgramDetail} />
        
        {/* Projects (PRJ) */}
        <Route path="/projects" component={ProjectList} />
        <Route path="/projects/create" component={CreateProject} />
        <Route path="/projects/:id" component={ProjectDetail} />
        
        {/* Research Activities (SDR) */}
        <Route path="/research-activities" component={ResearchActivitiesList} />
        <Route path="/research-activities/create" component={CreateResearchActivity} />
        <Route path="/research-activities/:id" component={ResearchActivityDetail} />
        <Route path="/research-activities/:id/team" component={ResearchActivityTeam} />
        
        {/* Data Management Plans */}
        <Route path="/data-management" component={DataManagementList} />
        <Route path="/data-management/create" component={CreateDataManagement} />
        <Route path="/data-management-plans/:id" component={DataManagementPlanDetail} />
        <Route path="/data-management/:id" component={DataManagementPlanDetail} />
        
        {/* Publications */}
        <Route path="/publications" component={PublicationsList} />
        <Route path="/publications/create" component={CreatePublication} />
        <Route path="/publications/:id" component={PublicationDetail} />
        
        {/* Patents */}
        <Route path="/patents" component={PatentsList} />
        <Route path="/patents/create" component={CreatePatent} />
        <Route path="/patents/:id" component={PatentDetail} />
        
        {/* IRB Applications */}
        <Route path="/irb" component={IrbList} />
        <Route path="/irb/create" component={CreateIrb} />
        <Route path="/irb-applications/:id" component={IrbApplicationDetail} />
        <Route path="/irb/:id" component={IrbApplicationDetail} />
        
        {/* IBC Applications */}
        <Route path="/ibc" component={IbcList} />
        <Route path="/ibc/create" component={CreateIbc} />
        <Route path="/ibc-applications/:id" component={IbcApplicationDetail} />
        <Route path="/ibc/:id" component={IbcApplicationDetail} />
        
        {/* Research Contracts */}
        <Route path="/contracts" component={ContractsList} />
        <Route path="/contracts/create" component={CreateContract} />
        <Route path="/research-contracts/:id" component={ResearchContractDetail} />
        <Route path="/contracts/:id" component={ResearchContractDetail} />
        
        {/* Research Teams */}
        <Route path="/teams" component={TeamsList} />
        <Route path="/teams/:id" component={TeamDetail} />
        
        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

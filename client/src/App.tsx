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

// Programs (PRM)
import ProgramsList from "@/pages/programs";

// Projects (PRJ)
import ProjectGroupsList from "@/pages/project-groups";

// Projects
import ProjectsList from "@/pages/projects";
import CreateProject from "@/pages/projects/create";

// Data Management Plans
import DataManagementList from "@/pages/data-management";
import CreateDataManagement from "@/pages/data-management/create";

// Publications
import PublicationsList from "@/pages/publications";
import CreatePublication from "@/pages/publications/create";

// Patents
import PatentsList from "@/pages/patents";
import CreatePatent from "@/pages/patents/create";

// IRB Applications
import IrbList from "@/pages/irb";
import CreateIrb from "@/pages/irb/create";

// IBC Applications
import IbcList from "@/pages/ibc";
import CreateIbc from "@/pages/ibc/create";

// Research Contracts
import ContractsList from "@/pages/contracts";
import CreateContract from "@/pages/contracts/create";

function Router() {
  return (
    <Layout>
      <Switch>
        {/* Dashboard */}
        <Route path="/" component={Dashboard} />
        
        {/* Scientists & Staff */}
        <Route path="/scientists" component={ScientistsList} />
        <Route path="/scientists/create" component={CreateScientist} />

        {/* Programs */}
        <Route path="/programs" component={ProgramsList} />
        
        {/* Projects (PRJ) */}
        <Route path="/projects" component={ProjectGroupsList} />
        <Route path="/projects/create" component={CreateProject} />
        <Route path="/projects/:id" component={ProjectGroupsList} />
        
        {/* Research Activities (SDR) */}
        <Route path="/research-activities" component={ProjectsList} />
        <Route path="/research-activities/create" component={CreateProject} />
        <Route path="/research-activities/:id" component={CreateProject} />
        
        {/* Data Management Plans */}
        <Route path="/data-management" component={DataManagementList} />
        <Route path="/data-management/create" component={CreateDataManagement} />
        
        {/* Publications */}
        <Route path="/publications" component={PublicationsList} />
        <Route path="/publications/create" component={CreatePublication} />
        
        {/* Patents */}
        <Route path="/patents" component={PatentsList} />
        <Route path="/patents/create" component={CreatePatent} />
        
        {/* IRB Applications */}
        <Route path="/irb" component={IrbList} />
        <Route path="/irb/create" component={CreateIrb} />
        
        {/* IBC Applications */}
        <Route path="/ibc" component={IbcList} />
        <Route path="/ibc/create" component={CreateIbc} />
        
        {/* Research Contracts */}
        <Route path="/contracts" component={ContractsList} />
        <Route path="/contracts/create" component={CreateContract} />
        
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

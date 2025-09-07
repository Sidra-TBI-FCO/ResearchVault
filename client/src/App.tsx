import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout/Layout";
import { PermissionsProvider } from "@/hooks/usePermissions";
import { CurrentUserProvider } from "@/hooks/useCurrentUser";

// Dashboard
import Dashboard from "@/pages/dashboard";

// Scientists
import ScientistsList from "@/pages/scientists";
import CreateScientist from "@/pages/scientists/create";
import EditScientist from "@/pages/scientists/edit";
import RoleAccessConfig from "@/pages/scientists/role-access-config";
import ScientistDetail from "@/pages/scientists/detail";

// Facilities
import FacilitiesList from "@/pages/facilities";
import CreateBuilding from "@/pages/facilities/buildings/create";
import EditBuilding from "@/pages/facilities/buildings/edit";
import CreateRoom from "@/pages/facilities/rooms/create";
import EditRoom from "@/pages/facilities/rooms/edit";

// Programs (PRM)
import ProgramsList from "@/pages/programs";
import ProgramDetail from "@/pages/programs/detail";
import EditProgram from "@/pages/programs/edit";

// Projects (PRJ)
import ProjectList from "@/pages/projects";
import ProjectDetail from "@/pages/projects/detail";
import CreateProject from "@/pages/projects/create";
import EditProject from "@/pages/projects/edit";

// Research Activities (SDR)
import ResearchActivitiesList from "@/pages/research-activities";
import CreateResearchActivity from "@/pages/research-activities/create";
import EditResearchActivity from "@/pages/research-activities/edit";
import ResearchActivityDetail from "@/pages/research-activities/detail";
import ResearchActivityTeam from "@/pages/research-activities/team";

// Data Management Plans
import DataManagementList from "@/pages/data-management";
import CreateDataManagement from "@/pages/data-management/create";
import DataManagementPlanDetail from "@/pages/data-management-plans/detail";
import EditDataManagementPlan from "@/pages/data-management-plans/edit";

// Publications
import PublicationsList from "@/pages/publications";
import CreatePublication from "@/pages/publications/create";
import PublicationDetail from "@/pages/publications/detail";
import EditPublication from "@/pages/publications/edit";

// Publication Office
import PublicationOffice from "@/pages/publication-office/index";

// Patents
import PatentsList from "@/pages/patents";
import CreatePatent from "@/pages/patents/create";
import PatentDetail from "@/pages/patents/detail";
import EditPatent from "@/pages/patents/edit";

// IRB Applications
import IrbList from "@/pages/irb";
import CreateIrb from "@/pages/irb/create";
// Submission wizard removed - restored to original Protocol Assembly approach
import IrbDocumentTemplates from "@/pages/irb/document-templates";
import IrbApplicationDetail from "@/pages/irb-applications/detail";
import EditIrbApplication from "@/pages/irb-applications/edit";

// IRB Office
import IrbOfficePortal from "@/pages/irb-office";
import IrbOfficeProtocolDetail from "@/pages/irb-office/protocol-detail";
import IrbBoardManager from "@/pages/irb-office/board-manager";
import ProtocolAssembly from "@/pages/irb/protocol-assembly";

// IRB Reviewer
import IrbReviewerDashboard from "@/pages/irb-reviewer/index";
import IrbProtocolReview from "@/pages/irb-reviewer/protocol-review";

// IBC Applications
import IbcList from "@/pages/ibc";
import CreateIbc from "@/pages/ibc/create";
import IbcApplicationDetail from "@/pages/ibc-applications/detail";
import EditIbcApplication from "@/pages/ibc-applications/edit";

// IBC Office
import IbcOfficePage from "@/pages/ibc-office";
import IbcProtocolDetailPage from "@/pages/ibc-office/protocol-detail";

// IBC Board Members
import CreateIbcBoardMember from "@/pages/ibc-board-members/create";

// IBC Reviewer
import IbcReviewerPage from "@/pages/ibc-reviewer";
import IbcReviewPage from "@/pages/ibc-reviewer/review";

// Research Contracts
import ContractsList from "@/pages/contracts";
import CreateContract from "@/pages/contracts/create";
import ResearchContractDetail from "@/pages/research-contracts/detail";
import EditResearchContract from "@/pages/research-contracts/edit";

// Grants
import GrantsList from "@/pages/grants";
import CreateGrant from "@/pages/grants/create";
import EditGrant from "@/pages/grants/edit";

// Research Teams
import TeamsList from "@/pages/teams";
import TeamDetail from "@/pages/teams/detail";

// Reports
import ReportsPage from "@/pages/reports";

// Certifications
import CertificationsPage from "@/pages/certifications";

// Settings page removed

function Router() {
  return (
    <Layout>
      <Switch>
        {/* Dashboard */}
        <Route path="/" component={Dashboard} />
        
        {/* Scientists & Staff */}
        <Route path="/scientists" component={ScientistsList} />
        <Route path="/scientists/create" component={CreateScientist} />
        <Route path="/scientists/role-access-config" component={RoleAccessConfig} />
        <Route path="/scientists/:id/edit" component={EditScientist} />
        <Route path="/scientists/:id" component={ScientistDetail} />

        {/* Facilities */}
        <Route path="/facilities" component={FacilitiesList} />
        <Route path="/facilities/buildings/create" component={CreateBuilding} />
        <Route path="/facilities/buildings/edit/:id" component={EditBuilding} />
        <Route path="/facilities/rooms/create" component={CreateRoom} />
        <Route path="/facilities/rooms/edit/:id" component={EditRoom} />

        {/* Programs */}
        <Route path="/programs" component={ProgramsList} />
        <Route path="/programs/:id/edit" component={EditProgram} />
        <Route path="/programs/:id" component={ProgramDetail} />
        
        {/* Projects (PRJ) */}
        <Route path="/projects" component={ProjectList} />
        <Route path="/projects/create" component={CreateProject} />
        <Route path="/projects/:id/edit" component={EditProject} />
        <Route path="/projects/:id" component={ProjectDetail} />
        
        {/* Research Activities (SDR) */}
        <Route path="/research-activities" component={ResearchActivitiesList} />
        <Route path="/research-activities/create" component={CreateResearchActivity} />
        <Route path="/research-activities/:id/edit" component={EditResearchActivity} />
        <Route path="/research-activities/:id" component={ResearchActivityDetail} />
        <Route path="/research-activities/:id/team" component={ResearchActivityTeam} />
        
        {/* Data Management Plans */}
        <Route path="/data-management" component={DataManagementList} />
        <Route path="/data-management/create" component={CreateDataManagement} />
        <Route path="/data-management-plans/:id/edit" component={EditDataManagementPlan} />
        <Route path="/data-management-plans/:id" component={DataManagementPlanDetail} />
        <Route path="/data-management/:id" component={DataManagementPlanDetail} />
        
        {/* Publications */}
        <Route path="/publications" component={PublicationsList} />
        <Route path="/publications/create" component={CreatePublication} />
        <Route path="/publications/:id/edit" component={EditPublication} />
        <Route path="/publications/:id" component={PublicationDetail} />
        
        {/* Outcome Office */}
        <Route path="/outcome-office" component={PublicationOffice} />
        
        {/* Patents */}
        <Route path="/patents" component={PatentsList} />
        <Route path="/patents/create" component={CreatePatent} />
        <Route path="/patents/:id/edit" component={EditPatent} />
        <Route path="/patents/:id" component={PatentDetail} />
        
        {/* IRB Office - Put these BEFORE IRB Applications to avoid conflicts */}
        <Route path="/irb-office" component={IrbOfficePortal} />
        <Route path="/irb-office/board-manager" component={IrbBoardManager} />
        <Route path="/irb-office/:id" component={IrbOfficeProtocolDetail} />
        <Route path="/irb-office/protocols/:id" component={IrbOfficeProtocolDetail} />
        <Route path="/irb-office/protocol/:id" component={IrbOfficeProtocolDetail} />
        
        {/* IRB Reviewer */}
        <Route path="/irb-reviewer" component={IrbReviewerDashboard} />
        <Route path="/irb-reviewer/:id" component={IrbProtocolReview} />
        
        {/* IRB Applications */}
        <Route path="/irb" component={IrbList} />
        <Route path="/irb/create" component={CreateIrb} />
        <Route path="/irb/templates" component={IrbDocumentTemplates} />
        <Route path="/irb/:id/submit" component={ProtocolAssembly} />
        <Route path="/irb/:id/assembly" component={ProtocolAssembly} />
        <Route path="/irb-applications/:id/edit" component={EditIrbApplication} />
        <Route path="/irb-applications/:id" component={IrbApplicationDetail} />
        <Route path="/irb/:id" component={IrbApplicationDetail} />
        
        {/* IBC Office - Put these BEFORE IBC Applications to avoid conflicts */}
        <Route path="/ibc-office" component={IbcOfficePage} />
        <Route path="/ibc-office/protocol-detail/:id" component={IbcProtocolDetailPage} />
        
        {/* IBC Board Members */}
        <Route path="/ibc-board-members/create" component={CreateIbcBoardMember} />
        
        {/* IBC Reviewer */}
        <Route path="/ibc-reviewer" component={IbcReviewerPage} />
        <Route path="/ibc-reviewer/review/:id" component={IbcReviewPage} />
        
        {/* IBC Applications */}
        <Route path="/ibc" component={IbcList} />
        <Route path="/ibc/create" component={CreateIbc} />
        <Route path="/ibc-applications/:id/edit" component={EditIbcApplication} />
        <Route path="/ibc-applications/:id" component={IbcApplicationDetail} />

        
        {/* Research Contracts */}
        <Route path="/contracts" component={ContractsList} />
        <Route path="/contracts/create" component={CreateContract} />
        <Route path="/research-contracts/:id/edit" component={EditResearchContract} />
        <Route path="/research-contracts/:id" component={ResearchContractDetail} />
        <Route path="/contracts/:id" component={ResearchContractDetail} />
        
        {/* Grants */}
        <Route path="/grants" component={GrantsList} />
        <Route path="/grants/create" component={CreateGrant} />
        <Route path="/grants/:id/edit" component={EditGrant} />
        
        {/* Research Teams */}
        <Route path="/teams" component={TeamsList} />
        <Route path="/teams/:id" component={TeamDetail} />
        
        {/* Certifications */}
        <Route path="/certifications" component={CertificationsPage} />
        
        {/* Reports */}
        <Route path="/reports" component={ReportsPage} />
        
        {/* Settings page removed */}
        
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
        <CurrentUserProvider>
          <PermissionsProvider>
            <Toaster />
            <Router />
          </PermissionsProvider>
        </CurrentUserProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

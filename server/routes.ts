import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./databaseStorage";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import {
  insertScientistSchema,
  insertResearchActivitySchema,
  insertProjectMemberSchema,
  insertDataManagementPlanSchema,
  insertPublicationSchema,
  insertPublicationAuthorSchema,
  insertPatentSchema,
  insertIrbApplicationSchema,
  insertIbcApplicationSchema,
  insertResearchContractSchema,
  insertProgramSchema,
  insertProjectSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up API routes
  const apiRouter = app.route('/api');

  // Health check for database connection
  app.get('/api/health/database', async (req: Request, res: Response) => {
    try {
      // Test database connection with a simple query
      await storage.getDashboardStats();
      res.json(true);
    } catch (error) {
      console.error("Database health check failed:", error);
      res.json(false);
    }
  });

  // Dashboard
  app.get('/api/dashboard/stats', async (req: Request, res: Response) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  app.get('/api/dashboard/recent-projects', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const activities = await storage.getRecentResearchActivities(limit);
      
      // Research activities are returned as-is, lead scientist info comes from team membership
      const enhancedActivities = activities;
      
      res.json(enhancedActivities);
    } catch (error) {
      console.error("Error fetching recent research activities:", error);
      res.status(500).json({ message: "Failed to fetch recent research activities" });
    }
  });

  app.get('/api/dashboard/upcoming-deadlines', async (req: Request, res: Response) => {
    try {
      const deadlines = await storage.getUpcomingDeadlines();
      res.json(deadlines);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch upcoming deadlines" });
    }
  });

  // Programs (PRM)
  app.get('/api/programs', async (req: Request, res: Response) => {
    try {
      const programs = await storage.getPrograms();
      res.json(programs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch programs" });
    }
  });

  app.get('/api/programs/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid program ID" });
      }

      const program = await storage.getProgram(id);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }
      
      res.json(program);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch program" });
    }
  });
  
  app.get('/api/programs/:id/projects', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid program ID" });
      }

      const projects = await storage.getProjectsForProgram(id);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects for program:", error);
      res.status(500).json({ message: "Failed to fetch projects for program" });
    }
  });

  app.post('/api/programs', async (req: Request, res: Response) => {
    try {
      const validateData = insertProgramSchema.parse(req.body);
      const program = await storage.createProgram(validateData);
      res.status(201).json(program);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create program" });
    }
  });

  app.patch('/api/programs/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid program ID" });
      }

      const validateData = insertProgramSchema.partial().parse(req.body);
      const program = await storage.updateProgram(id, validateData);
      
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }
      
      res.json(program);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update program" });
    }
  });

  app.delete('/api/programs/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid program ID" });
      }

      const success = await storage.deleteProgram(id);
      
      if (!success) {
        return res.status(404).json({ message: "Program not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete program" });
    }
  });

  // Projects (PRJ)
  app.get('/api/projects', async (req: Request, res: Response) => {
    try {
      const programId = req.query.programId ? parseInt(req.query.programId as string) : undefined;
      
      let projects;
      if (programId && !isNaN(programId)) {
        projects = await storage.getProjectsForProgram(programId);
      } else {
        projects = await storage.getProjects();
      }
      
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post('/api/projects', async (req: Request, res: Response) => {
    try {
      const validateData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validateData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.patch('/api/projects/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const validateData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, validateData);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete('/api/projects/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const success = await storage.deleteProject(id);
      
      if (!success) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Scientists
  app.get('/api/scientists', async (req: Request, res: Response) => {
    try {
      const includeActivityCount = req.query.includeActivityCount === 'true';
      
      if (includeActivityCount) {
        const scientists = await storage.getScientistsWithActivityCount();
        res.json(scientists);
      } else {
        const scientists = await storage.getScientists();
        res.json(scientists);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scientists" });
    }
  });

  app.get('/api/scientists/:id/research-activities', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get research activities where scientist is a team member
      const activities = await storage.getResearchActivitiesForScientist(id);
      
      // Enhance with project and program information
      const enhancedActivities = await Promise.all(
        activities.map(async (activity) => {
          let project = null;
          let program = null;
          let memberRole = null;
          
          // Get project info if activity has projectId
          if (activity.projectId) {
            project = await storage.getProject(activity.projectId);
            
            // Get program info if project has programId
            if (project?.programId) {
              program = await storage.getProgram(project.programId);
            }
          }
          
          // Get member role from project_members table
          const members = await storage.getProjectMembers(activity.id);
          const member = members.find(m => m.scientistId === id);
          memberRole = member?.role || null;
          
          return {
            ...activity,
            project,
            program,
            memberRole
          };
        })
      );
      
      res.json(enhancedActivities);
    } catch (error) {
      console.error('Error fetching scientist research activities:', error);
      res.status(500).json({ message: 'Failed to fetch research activities' });
    }
  });

  app.get('/api/scientists/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid scientist ID" });
      }

      const scientist = await storage.getScientist(id);
      if (!scientist) {
        return res.status(404).json({ message: "Scientist not found" });
      }

      res.json(scientist);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scientist" });
    }
  });

  app.get('/api/scientists/:id/publications', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid scientist ID" });
      }

      const yearsSince = req.query.years ? parseInt(req.query.years as string) : 5;
      const publications = await storage.getPublicationsForScientist(id, yearsSince);
      
      res.json(publications);
    } catch (error) {
      console.error('Error fetching scientist publications:', error);
      res.status(500).json({ message: "Failed to fetch scientist publications" });
    }
  });

  app.get('/api/scientists/:id/authorship-stats', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid scientist ID" });
      }

      const yearsSince = req.query.years ? parseInt(req.query.years as string) : 5;
      const stats = await storage.getAuthorshipStatsByYear(id, yearsSince);
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch authorship statistics" });
    }
  });

  app.post('/api/scientists', async (req: Request, res: Response) => {
    try {
      const validateData = insertScientistSchema.parse(req.body);
      const scientist = await storage.createScientist(validateData);
      res.status(201).json(scientist);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create scientist" });
    }
  });

  app.patch('/api/scientists/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid scientist ID" });
      }

      const validateData = insertScientistSchema.partial().parse(req.body);
      const scientist = await storage.updateScientist(id, validateData);
      
      if (!scientist) {
        return res.status(404).json({ message: "Scientist not found" });
      }
      
      res.json(scientist);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update scientist" });
    }
  });

  app.delete('/api/scientists/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid scientist ID" });
      }

      const success = await storage.deleteScientist(id);
      
      if (!success) {
        return res.status(404).json({ message: "Scientist not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete scientist" });
    }
  });

  app.get('/api/staff', async (req: Request, res: Response) => {
    try {
      const staff = await storage.getStaff();
      res.json(staff);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  app.get('/api/principal-investigators', async (req: Request, res: Response) => {
    try {
      const pis = await storage.getPrincipalInvestigators();
      res.json(pis);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch principal investigators" });
    }
  });
  
  // Research Activities
  app.get('/api/research-activities', async (req: Request, res: Response) => {
    try {
      const activities = await storage.getResearchActivities();
      
      // Directly return the activities without enhancement for now
      // This will identify if the enhancement is causing issues
      res.json(activities);
    } catch (error) {
      console.error("Error fetching research activities:", error);
      res.status(500).json({ message: "Failed to fetch research activities" });
    }
  });
  
  app.get('/api/research-activities/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid research activity ID" });
      }

      const activity = await storage.getResearchActivity(id);
      if (!activity) {
        return res.status(404).json({ message: "Research activity not found" });
      }
      
      // Get project details if projectId exists
      let project = null;
      if (activity.projectId) {
        project = await storage.getProject(activity.projectId);
      }
      
      // Principal Investigator details now come from team membership
      
      const enhancedActivity = {
        ...activity,
        project: project ? {
          id: project.id,
          name: project.name,
          projectId: project.projectId
        } : null
      };
      
      res.json(enhancedActivity);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch research activity" });
    }
  });

  // Projects
  app.get('/api/projects', async (req: Request, res: Response) => {
    try {
      const scientistId = req.query.scientistId ? parseInt(req.query.scientistId as string) : undefined;
      
      let projects;
      if (scientistId && !isNaN(scientistId)) {
        projects = await storage.getProjectsForScientist(scientistId);
      } else {
        projects = await storage.getProjects();
      }
      
      // Enhance projects with lead scientist details
      const enhancedProjects = await Promise.all(projects.map(async (project) => {
        const leadScientist = await storage.getScientist(project.leadScientistId);
        return {
          ...project,
          leadScientist: leadScientist ? {
            id: leadScientist.id,
            name: leadScientist.name,
            profileImageInitials: leadScientist.profileImageInitials
          } : null
        };
      }));
      
      res.json(enhancedProjects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get lead scientist
      const leadScientist = await storage.getScientist(project.leadScientistId);
      
      // Get team members
      const teamMembers = await storage.getProjectMembers(id);
      const enhancedTeamMembers = await Promise.all(teamMembers.map(async (member) => {
        const scientist = await storage.getScientist(member.scientistId);
        return {
          ...member,
          scientist: scientist ? {
            id: scientist.id,
            name: scientist.name,
            title: scientist.title,
            profileImageInitials: scientist.profileImageInitials
          } : null
        };
      }));

      const enhancedProject = {
        ...project,
        leadScientist: leadScientist ? {
          id: leadScientist.id,
          name: leadScientist.name,
          title: leadScientist.title,
          profileImageInitials: leadScientist.profileImageInitials
        } : null,
        teamMembers: enhancedTeamMembers
      };

      res.json(enhancedProject);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post('/api/projects', async (req: Request, res: Response) => {
    try {
      const validateData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validateData);
      
      // Automatically add lead scientist as a team member
      await storage.addProjectMember({
        projectId: project.id,
        scientistId: project.leadScientistId,
        role: "Principal Investigator"
      });
      
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.patch('/api/projects/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const validateData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, validateData);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete('/api/projects/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const success = await storage.deleteProject(id);
      
      if (!success) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Project Research Activities
  app.get('/api/projects/:id/research-activities', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const activities = await storage.getResearchActivitiesForProject(id);
      
      // Directly return activities without enhancement for now
      res.json(activities);
    } catch (error) {
      console.error("Error fetching research activities for project:", error);
      res.status(500).json({ message: "Failed to fetch research activities for project" });
    }
  });

  // Project Members
  app.get('/api/projects/:id/members', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Get project's research activities
      const activities = await storage.getResearchActivitiesForProject(id);
      
      if (activities.length === 0) {
        return res.json([]);
      }
      
      // Get members for each research activity
      const allMembers = [];
      for (const activity of activities) {
        const members = await storage.getProjectMembers(activity.id);
        
        // Enhance team members with scientist details
        const enhancedMembers = await Promise.all(members.map(async (member) => {
          const scientist = await storage.getScientist(member.scientistId);
          return {
            ...member,
            researchActivityTitle: activity.title,
            scientist: scientist ? {
              id: scientist.id,
              name: scientist.name,
              title: scientist.title,
              profileImageInitials: scientist.profileImageInitials
            } : null
          };
        }));
        
        allMembers.push(...enhancedMembers);
      }
      
      res.json(allMembers);
    } catch (error) {
      console.error("Error fetching project members:", error);
      res.status(500).json({ message: "Failed to fetch project members" });
    }
  });

  app.post('/api/projects/:id/members', async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Need to select a research activity for this project
      const { researchActivityId, scientistId, role } = req.body;
      
      if (!researchActivityId) {
        return res.status(400).json({ message: "Research activity ID is required" });
      }
      
      // Validate that the research activity belongs to this project
      const researchActivity = await storage.getResearchActivity(researchActivityId);
      if (!researchActivity) {
        return res.status(404).json({ message: "Research activity not found" });
      }
      
      if (researchActivity.projectId !== projectId) {
        return res.status(400).json({ message: "Research activity does not belong to this project" });
      }
      
      const validateData = insertProjectMemberSchema.parse({
        researchActivityId,
        scientistId,
        role
      });
      
      // Check if scientist exists
      const scientist = await storage.getScientist(validateData.scientistId);
      if (!scientist) {
        return res.status(404).json({ message: "Scientist not found" });
      }
            
      const member = await storage.addProjectMember(validateData);
      
      // Return enhanced member with scientist details
      const enhancedMember = {
        ...member,
        researchActivityTitle: researchActivity.title,
        scientist: {
          id: scientist.id,
          name: scientist.name,
          title: scientist.title,
          profileImageInitials: scientist.profileImageInitials
        }
      };
      
      res.status(201).json(enhancedMember);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error adding project member:", error);
      res.status(500).json({ message: "Failed to add project member" });
    }
  });

  app.delete('/api/projects/:projectId/members/:scientistId', async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const scientistId = parseInt(req.params.scientistId);
      const researchActivityId = req.query.researchActivityId ? parseInt(req.query.researchActivityId as string) : undefined;
      
      if (isNaN(projectId) || isNaN(scientistId)) {
        return res.status(400).json({ message: "Invalid ID parameters" });
      }
      
      if (!researchActivityId) {
        return res.status(400).json({ message: "Research activity ID is required" });
      }
      
      // Validate that the research activity belongs to this project
      const researchActivity = await storage.getResearchActivity(researchActivityId);
      if (!researchActivity) {
        return res.status(404).json({ message: "Research activity not found" });
      }
      
      if (researchActivity.projectId !== projectId) {
        return res.status(400).json({ message: "Research activity does not belong to this project" });
      }

      // Note: Principal Investigator role is now managed through team membership

      const success = await storage.removeProjectMember(researchActivityId, scientistId);
      
      if (!success) {
        return res.status(404).json({ message: "Project member not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing project member:", error);
      res.status(500).json({ message: "Failed to remove project member" });
    }
  });

  // Research Activity Members - Direct access routes
  app.get('/api/research-activities/:id/members', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid research activity ID" });
      }

      const members = await storage.getProjectMembers(id);
      
      // Enhance team members with scientist details
      const enhancedMembers = await Promise.all(members.map(async (member) => {
        const scientist = await storage.getScientist(member.scientistId);
        return {
          ...member,
          scientist: scientist ? {
            id: scientist.id,
            name: scientist.name,
            title: scientist.title,
            email: scientist.email,
            staffId: scientist.staffId,
            profileImageInitials: scientist.profileImageInitials
          } : null
        };
      }));
      
      res.json(enhancedMembers);
    } catch (error) {
      console.error("Error fetching research activity members:", error);
      res.status(500).json({ message: "Failed to fetch research activity members" });
    }
  });

  app.post('/api/research-activities/:id/members', async (req: Request, res: Response) => {
    try {
      const researchActivityId = parseInt(req.params.id);
      if (isNaN(researchActivityId)) {
        return res.status(400).json({ message: "Invalid research activity ID" });
      }

      const { scientistId, role } = req.body;
      
      const validateData = insertProjectMemberSchema.parse({
        researchActivityId,
        scientistId,
        role
      });
      
      // Check if scientist exists
      const scientist = await storage.getScientist(validateData.scientistId);
      if (!scientist) {
        return res.status(404).json({ message: "Scientist not found" });
      }
      
      // Validate role assignment: Only Investigators can be Principal Investigators
      if (validateData.role === "Principal Investigator" && scientist.title !== "Investigator") {
        return res.status(400).json({ 
          message: "Only scientists with the job title 'Investigator' can be assigned the role of Principal Investigator" 
        });
      }
      
      // Check if member already exists
      const existingMembers = await storage.getProjectMembers(researchActivityId);
      const memberExists = existingMembers.some(m => m.scientistId === scientistId);
      if (memberExists) {
        return res.status(400).json({ message: "Scientist is already a member of this research activity" });
      }
      
      // Enforce role constraints: Only 1 Principal Investigator and 1 Lead Scientist per research activity
      const currentRoles = existingMembers.map(m => m.role);
      
      if (validateData.role === "Principal Investigator") {
        const hasPrincipalInvestigator = currentRoles.includes("Principal Investigator");
        if (hasPrincipalInvestigator) {
          return res.status(400).json({ 
            message: "Each research activity can only have one Principal Investigator" 
          });
        }
      }
      
      if (validateData.role === "Lead Scientist") {
        const hasLeadScientist = currentRoles.includes("Lead Scientist");
        if (hasLeadScientist) {
          return res.status(400).json({ 
            message: "Each research activity can only have one Lead Scientist" 
          });
        }
      }
            
      const member = await storage.addProjectMember(validateData);
      
      // Return enhanced member with scientist details
      const enhancedMember = {
        ...member,
        scientist: {
          id: scientist.id,
          name: scientist.name,
          title: scientist.title,
          email: scientist.email,
          staffId: scientist.staffId,
          profileImageInitials: scientist.profileImageInitials
        }
      };
      
      res.status(201).json(enhancedMember);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error adding research activity member:", error);
      res.status(500).json({ message: "Failed to add research activity member" });
    }
  });

  app.delete('/api/research-activities/:id/members/:scientistId', async (req: Request, res: Response) => {
    try {
      const researchActivityId = parseInt(req.params.id);
      const scientistId = parseInt(req.params.scientistId);
      
      if (isNaN(researchActivityId) || isNaN(scientistId)) {
        return res.status(400).json({ message: "Invalid ID parameters" });
      }
      
      // Note: Principal Investigator role is now managed through team membership

      const success = await storage.removeProjectMember(researchActivityId, scientistId);
      
      if (!success) {
        return res.status(404).json({ message: "Research activity member not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing research activity member:", error);
      res.status(500).json({ message: "Failed to remove research activity member" });
    }
  });

  // Data Management Plans
  app.get('/api/data-management-plans', async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      let plans;
      if (projectId && !isNaN(projectId)) {
        const plan = await storage.getDataManagementPlanForProject(projectId);
        plans = plan ? [plan] : [];
      } else {
        plans = await storage.getDataManagementPlans();
      }
      
      // Enhance plans with project details
      const enhancedPlans = await Promise.all(plans.map(async (plan) => {
        const project = await storage.getProject(plan.projectId);
        return {
          ...plan,
          project: project ? {
            id: project.id,
            title: project.title
          } : null
        };
      }));
      
      res.json(enhancedPlans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch data management plans" });
    }
  });

  app.get('/api/data-management-plans/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid data management plan ID" });
      }

      const plan = await storage.getDataManagementPlan(id);
      if (!plan) {
        return res.status(404).json({ message: "Data management plan not found" });
      }

      // Get project details
      const project = await storage.getProject(plan.projectId);
      
      const enhancedPlan = {
        ...plan,
        project: project ? {
          id: project.id,
          title: project.title
        } : null
      };

      res.json(enhancedPlan);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch data management plan" });
    }
  });

  app.post('/api/data-management-plans', async (req: Request, res: Response) => {
    try {
      const validateData = insertDataManagementPlanSchema.parse(req.body);
      
      // Check if project exists
      const project = await storage.getProject(validateData.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if a plan already exists for this project
      const existingPlan = await storage.getDataManagementPlanForProject(validateData.projectId);
      if (existingPlan) {
        return res.status(409).json({ message: "A data management plan already exists for this project" });
      }
      
      const plan = await storage.createDataManagementPlan(validateData);
      res.status(201).json(plan);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create data management plan" });
    }
  });

  app.patch('/api/data-management-plans/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid data management plan ID" });
      }

      const validateData = insertDataManagementPlanSchema.partial().parse(req.body);
      const plan = await storage.updateDataManagementPlan(id, validateData);
      
      if (!plan) {
        return res.status(404).json({ message: "Data management plan not found" });
      }
      
      res.json(plan);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update data management plan" });
    }
  });

  app.delete('/api/data-management-plans/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid data management plan ID" });
      }

      const success = await storage.deleteDataManagementPlan(id);
      
      if (!success) {
        return res.status(404).json({ message: "Data management plan not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete data management plan" });
    }
  });

  // Publications
  app.get('/api/publications', async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      let publications;
      if (projectId && !isNaN(projectId)) {
        publications = await storage.getPublicationsForProject(projectId);
      } else {
        publications = await storage.getPublications();
      }
      
      // Enhance publications with project details
      const enhancedPublications = await Promise.all(publications.map(async (pub) => {
        const project = pub.projectId ? await storage.getProject(pub.projectId) : null;
        return {
          ...pub,
          project: project ? {
            id: project.id,
            title: project.title
          } : null
        };
      }));
      
      res.json(enhancedPublications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch publications" });
    }
  });

  app.get('/api/publications/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid publication ID" });
      }

      const publication = await storage.getPublication(id);
      if (!publication) {
        return res.status(404).json({ message: "Publication not found" });
      }

      // Get project details
      const project = publication.projectId ? await storage.getProject(publication.projectId) : null;
      
      const enhancedPublication = {
        ...publication,
        project: project ? {
          id: project.id,
          title: project.title
        } : null
      };

      res.json(enhancedPublication);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch publication" });
    }
  });

  app.post('/api/publications', async (req: Request, res: Response) => {
    try {
      const validateData = insertPublicationSchema.parse(req.body);
      
      // Check if project exists if projectId is provided
      if (validateData.projectId) {
        const project = await storage.getProject(validateData.projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
      }
      
      const publication = await storage.createPublication(validateData);
      res.status(201).json(publication);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create publication" });
    }
  });

  app.patch('/api/publications/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid publication ID" });
      }

      const validateData = insertPublicationSchema.partial().parse(req.body);
      
      // Check if project exists if projectId is provided
      if (validateData.projectId) {
        const project = await storage.getProject(validateData.projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
      }
      
      const publication = await storage.updatePublication(id, validateData);
      
      if (!publication) {
        return res.status(404).json({ message: "Publication not found" });
      }
      
      res.json(publication);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update publication" });
    }
  });

  app.delete('/api/publications/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid publication ID" });
      }

      const success = await storage.deletePublication(id);
      
      if (!success) {
        return res.status(404).json({ message: "Publication not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete publication" });
    }
  });

  // Publication Authors
  app.get('/api/publications/:id/authors', async (req: Request, res: Response) => {
    try {
      const publicationId = parseInt(req.params.id);
      if (isNaN(publicationId)) {
        return res.status(400).json({ message: "Invalid publication ID" });
      }

      const authors = await storage.getPublicationAuthors(publicationId);
      res.json(authors);
    } catch (error) {
      console.error("Error fetching publication authors:", error);
      res.status(500).json({ message: "Failed to fetch publication authors", error: error.message });
    }
  });

  app.post('/api/publications/:id/authors', async (req: Request, res: Response) => {
    try {
      const publicationId = parseInt(req.params.id);
      if (isNaN(publicationId)) {
        return res.status(400).json({ message: "Invalid publication ID" });
      }

      const validateData = insertPublicationAuthorSchema.parse({
        ...req.body,
        publicationId
      });

      // Check if scientist is already an author
      const existingAuthors = await storage.getPublicationAuthors(publicationId);
      const existingAuthor = existingAuthors.find(author => author.scientistId === validateData.scientistId);

      if (existingAuthor) {
        // Update existing author by combining authorship types
        const existingTypes = existingAuthor.authorshipType.split(',').map(t => t.trim());
        const newTypes = validateData.authorshipType.split(',').map(t => t.trim());
        
        // Combine types, avoiding duplicates
        const combinedTypes = [...new Set([...existingTypes, ...newTypes])];
        
        const updatedAuthor = await storage.updatePublicationAuthor(
          publicationId,
          validateData.scientistId,
          {
            authorshipType: combinedTypes.join(', '),
            authorPosition: validateData.authorPosition || existingAuthor.authorPosition
          }
        );
        res.status(200).json(updatedAuthor);
      } else {
        // Add new author
        const author = await storage.addPublicationAuthor(validateData);
        res.status(201).json(author);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to add publication author" });
    }
  });

  app.delete('/api/publications/:publicationId/authors/:scientistId', async (req: Request, res: Response) => {
    try {
      const publicationId = parseInt(req.params.publicationId);
      const scientistId = parseInt(req.params.scientistId);
      
      if (isNaN(publicationId) || isNaN(scientistId)) {
        return res.status(400).json({ message: "Invalid publication or scientist ID" });
      }

      const success = await storage.removePublicationAuthor(publicationId, scientistId);
      
      if (!success) {
        return res.status(404).json({ message: "Publication author not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove publication author" });
    }
  });

  // Patents
  app.get('/api/patents', async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      let patents;
      if (projectId && !isNaN(projectId)) {
        patents = await storage.getPatentsForProject(projectId);
      } else {
        patents = await storage.getPatents();
      }
      
      // Enhance patents with project details
      const enhancedPatents = await Promise.all(patents.map(async (patent) => {
        const project = patent.projectId ? await storage.getProject(patent.projectId) : null;
        return {
          ...patent,
          project: project ? {
            id: project.id,
            title: project.title
          } : null
        };
      }));
      
      res.json(enhancedPatents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patents" });
    }
  });

  app.get('/api/patents/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid patent ID" });
      }

      const patent = await storage.getPatent(id);
      if (!patent) {
        return res.status(404).json({ message: "Patent not found" });
      }

      // Get project details
      const project = patent.projectId ? await storage.getProject(patent.projectId) : null;
      
      const enhancedPatent = {
        ...patent,
        project: project ? {
          id: project.id,
          title: project.title
        } : null
      };

      res.json(enhancedPatent);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patent" });
    }
  });

  app.post('/api/patents', async (req: Request, res: Response) => {
    try {
      const validateData = insertPatentSchema.parse(req.body);
      
      // Check if project exists if projectId is provided
      if (validateData.projectId) {
        const project = await storage.getProject(validateData.projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
      }
      
      const patent = await storage.createPatent(validateData);
      res.status(201).json(patent);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create patent" });
    }
  });

  app.patch('/api/patents/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid patent ID" });
      }

      const validateData = insertPatentSchema.partial().parse(req.body);
      
      // Check if project exists if projectId is provided
      if (validateData.projectId) {
        const project = await storage.getProject(validateData.projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
      }
      
      const patent = await storage.updatePatent(id, validateData);
      
      if (!patent) {
        return res.status(404).json({ message: "Patent not found" });
      }
      
      res.json(patent);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update patent" });
    }
  });

  app.delete('/api/patents/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid patent ID" });
      }

      const success = await storage.deletePatent(id);
      
      if (!success) {
        return res.status(404).json({ message: "Patent not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete patent" });
    }
  });

  // IRB Applications
  app.get('/api/irb-applications', async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      let applications;
      if (projectId && !isNaN(projectId)) {
        applications = await storage.getIrbApplicationsForProject(projectId);
      } else {
        applications = await storage.getIrbApplications();
      }
      
      // Enhance applications with project and PI details
      const enhancedApplications = await Promise.all(applications.map(async (app) => {
        const project = await storage.getProject(app.projectId);
        const pi = await storage.getScientist(app.principalInvestigatorId);
        
        return {
          ...app,
          project: project ? {
            id: project.id,
            title: project.title
          } : null,
          principalInvestigator: pi ? {
            id: pi.id,
            name: pi.name,
            profileImageInitials: pi.profileImageInitials
          } : null
        };
      }));
      
      res.json(enhancedApplications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch IRB applications" });
    }
  });

  app.get('/api/irb-applications/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IRB application ID" });
      }

      const application = await storage.getIrbApplication(id);
      if (!application) {
        return res.status(404).json({ message: "IRB application not found" });
      }

      // Get related details
      const project = await storage.getProject(application.projectId);
      const pi = await storage.getScientist(application.principalInvestigatorId);
      
      const enhancedApplication = {
        ...application,
        project: project ? {
          id: project.id,
          title: project.title
        } : null,
        principalInvestigator: pi ? {
          id: pi.id,
          name: pi.name,
          profileImageInitials: pi.profileImageInitials
        } : null
      };

      res.json(enhancedApplication);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch IRB application" });
    }
  });

  app.post('/api/irb-applications', async (req: Request, res: Response) => {
    try {
      const validateData = insertIrbApplicationSchema.parse(req.body);
      
      // Check if project exists
      const project = await storage.getProject(validateData.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if principal investigator exists
      const pi = await storage.getScientist(validateData.principalInvestigatorId);
      if (!pi) {
        return res.status(404).json({ message: "Principal investigator not found" });
      }
      
      const application = await storage.createIrbApplication(validateData);
      res.status(201).json(application);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create IRB application" });
    }
  });

  app.patch('/api/irb-applications/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IRB application ID" });
      }

      const validateData = insertIrbApplicationSchema.partial().parse(req.body);
      
      // Check if project exists if projectId is provided
      if (validateData.projectId) {
        const project = await storage.getProject(validateData.projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
      }
      
      // Check if principal investigator exists if provided
      if (validateData.principalInvestigatorId) {
        const pi = await storage.getScientist(validateData.principalInvestigatorId);
        if (!pi) {
          return res.status(404).json({ message: "Principal investigator not found" });
        }
      }
      
      const application = await storage.updateIrbApplication(id, validateData);
      
      if (!application) {
        return res.status(404).json({ message: "IRB application not found" });
      }
      
      res.json(application);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update IRB application" });
    }
  });

  app.delete('/api/irb-applications/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IRB application ID" });
      }

      const success = await storage.deleteIrbApplication(id);
      
      if (!success) {
        return res.status(404).json({ message: "IRB application not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete IRB application" });
    }
  });

  // IBC Applications
  app.get('/api/ibc-applications', async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      let applications;
      if (projectId && !isNaN(projectId)) {
        applications = await storage.getIbcApplicationsForProject(projectId);
      } else {
        applications = await storage.getIbcApplications();
      }
      
      // Enhance applications with project and PI details
      const enhancedApplications = await Promise.all(applications.map(async (app) => {
        const project = await storage.getProject(app.projectId);
        const pi = await storage.getScientist(app.principalInvestigatorId);
        
        return {
          ...app,
          project: project ? {
            id: project.id,
            title: project.title
          } : null,
          principalInvestigator: pi ? {
            id: pi.id,
            name: pi.name,
            profileImageInitials: pi.profileImageInitials
          } : null
        };
      }));
      
      res.json(enhancedApplications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch IBC applications" });
    }
  });

  app.get('/api/ibc-applications/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC application ID" });
      }

      const application = await storage.getIbcApplication(id);
      if (!application) {
        return res.status(404).json({ message: "IBC application not found" });
      }

      // Get related details
      const project = await storage.getProject(application.projectId);
      const pi = await storage.getScientist(application.principalInvestigatorId);
      
      const enhancedApplication = {
        ...application,
        project: project ? {
          id: project.id,
          title: project.title
        } : null,
        principalInvestigator: pi ? {
          id: pi.id,
          name: pi.name,
          profileImageInitials: pi.profileImageInitials
        } : null
      };

      res.json(enhancedApplication);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch IBC application" });
    }
  });

  app.post('/api/ibc-applications', async (req: Request, res: Response) => {
    try {
      const validateData = insertIbcApplicationSchema.parse(req.body);
      
      // Check if project exists
      const project = await storage.getProject(validateData.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if principal investigator exists
      const pi = await storage.getScientist(validateData.principalInvestigatorId);
      if (!pi) {
        return res.status(404).json({ message: "Principal investigator not found" });
      }
      
      const application = await storage.createIbcApplication(validateData);
      res.status(201).json(application);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create IBC application" });
    }
  });

  app.patch('/api/ibc-applications/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC application ID" });
      }

      const validateData = insertIbcApplicationSchema.partial().parse(req.body);
      
      // Check if project exists if projectId is provided
      if (validateData.projectId) {
        const project = await storage.getProject(validateData.projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
      }
      
      // Check if principal investigator exists if provided
      if (validateData.principalInvestigatorId) {
        const pi = await storage.getScientist(validateData.principalInvestigatorId);
        if (!pi) {
          return res.status(404).json({ message: "Principal investigator not found" });
        }
      }
      
      const application = await storage.updateIbcApplication(id, validateData);
      
      if (!application) {
        return res.status(404).json({ message: "IBC application not found" });
      }
      
      res.json(application);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update IBC application" });
    }
  });

  app.delete('/api/ibc-applications/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC application ID" });
      }

      const success = await storage.deleteIbcApplication(id);
      
      if (!success) {
        return res.status(404).json({ message: "IBC application not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete IBC application" });
    }
  });

  // Research Contracts
  app.get('/api/research-contracts', async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      let contracts;
      if (projectId && !isNaN(projectId)) {
        contracts = await storage.getResearchContractsForProject(projectId);
      } else {
        contracts = await storage.getResearchContracts();
      }
      
      // Enhance contracts with project and PI details
      const enhancedContracts = await Promise.all(contracts.map(async (contract) => {
        const project = await storage.getProject(contract.projectId);
        const pi = contract.principalInvestigatorId ? 
          await storage.getScientist(contract.principalInvestigatorId) : null;
        
        return {
          ...contract,
          project: project ? {
            id: project.id,
            title: project.title
          } : null,
          principalInvestigator: pi ? {
            id: pi.id,
            name: pi.name,
            profileImageInitials: pi.profileImageInitials
          } : null
        };
      }));
      
      res.json(enhancedContracts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch research contracts" });
    }
  });

  app.get('/api/research-contracts/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid research contract ID" });
      }

      const contract = await storage.getResearchContract(id);
      if (!contract) {
        return res.status(404).json({ message: "Research contract not found" });
      }

      // Get related details
      const project = await storage.getProject(contract.projectId);
      const pi = contract.principalInvestigatorId ? 
        await storage.getScientist(contract.principalInvestigatorId) : null;
      
      const enhancedContract = {
        ...contract,
        project: project ? {
          id: project.id,
          title: project.title
        } : null,
        principalInvestigator: pi ? {
          id: pi.id,
          name: pi.name,
          profileImageInitials: pi.profileImageInitials
        } : null
      };

      res.json(enhancedContract);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch research contract" });
    }
  });

  app.post('/api/research-contracts', async (req: Request, res: Response) => {
    try {
      const validateData = insertResearchContractSchema.parse(req.body);
      
      // Check if project exists
      const project = await storage.getProject(validateData.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if principal investigator exists if provided
      if (validateData.principalInvestigatorId) {
        const pi = await storage.getScientist(validateData.principalInvestigatorId);
        if (!pi) {
          return res.status(404).json({ message: "Principal investigator not found" });
        }
      }
      
      const contract = await storage.createResearchContract(validateData);
      res.status(201).json(contract);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create research contract" });
    }
  });

  app.patch('/api/research-contracts/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid research contract ID" });
      }

      const validateData = insertResearchContractSchema.partial().parse(req.body);
      
      // Check if project exists if projectId is provided
      if (validateData.projectId) {
        const project = await storage.getProject(validateData.projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
      }
      
      // Check if principal investigator exists if provided
      if (validateData.principalInvestigatorId) {
        const pi = await storage.getScientist(validateData.principalInvestigatorId);
        if (!pi) {
          return res.status(404).json({ message: "Principal investigator not found" });
        }
      }
      
      const contract = await storage.updateResearchContract(id, validateData);
      
      if (!contract) {
        return res.status(404).json({ message: "Research contract not found" });
      }
      
      res.json(contract);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update research contract" });
    }
  });

  app.delete('/api/research-contracts/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid research contract ID" });
      }

      const success = await storage.deleteResearchContract(id);
      
      if (!success) {
        return res.status(404).json({ message: "Research contract not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete research contract" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

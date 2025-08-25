import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./databaseStorage";
import { ZodError, z } from "zod";
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
  insertIbcApplicationCommentSchema,
  insertIbcBoardMemberSchema,
  insertIbcSubmissionSchema,
  insertIbcDocumentSchema,
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
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const principalInvestigatorId = req.query.principalInvestigatorId ? parseInt(req.query.principalInvestigatorId as string) : undefined;
      
      let activities;
      if (projectId && !isNaN(projectId)) {
        activities = await storage.getResearchActivitiesForProject(projectId);
      } else if (principalInvestigatorId && !isNaN(principalInvestigatorId)) {
        activities = await storage.getResearchActivitiesForScientist(principalInvestigatorId);
      } else {
        activities = await storage.getResearchActivities();
      }
      
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

  app.get('/api/research-activities/:id/staff', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid research activity ID" });
      }

      // Get all project members for this research activity
      const members = await storage.getProjectMembers(id);
      
      // Get scientist details for each member
      const staffPromises = members.map(async (member) => {
        const scientist = await storage.getScientist(member.scientistId);
        return scientist;
      });
      
      const staff = await Promise.all(staffPromises);
      // Filter out any null values and return only the staff
      const validStaff = staff.filter(scientist => scientist !== undefined);
      
      res.json(validStaff);
    } catch (error) {
      console.error("Error fetching research activity staff:", error);
      res.status(500).json({ message: "Failed to fetch research activity staff" });
    }
  });

  app.post('/api/research-activities', async (req: Request, res: Response) => {
    try {
      const validatedData = insertResearchActivitySchema.parse(req.body);
      const newActivity = await storage.createResearchActivity(validatedData);
      res.status(201).json(newActivity);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error creating research activity:", error);
      res.status(500).json({ message: "Failed to create research activity" });
    }
  });

  app.put('/api/research-activities/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid research activity ID" });
      }

      const validatedData = insertResearchActivitySchema.partial().parse(req.body);
      const updatedActivity = await storage.updateResearchActivity(id, validatedData);
      
      if (!updatedActivity) {
        return res.status(404).json({ message: "Research activity not found" });
      }
      
      res.json(updatedActivity);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error updating research activity:", error);
      res.status(500).json({ message: "Failed to update research activity" });
    }
  });

  app.delete('/api/research-activities/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid research activity ID" });
      }

      await storage.deleteResearchActivity(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting research activity:", error);
      res.status(500).json({ message: "Failed to delete research activity" });
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

  // Get all project members across all projects
  app.get('/api/project-members', async (req: Request, res: Response) => {
    try {
      const allMembers = await storage.getAllProjectMembers();
      res.json(allMembers);
    } catch (error) {
      console.error("Error fetching all project members:", error);
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
      const researchActivityId = req.query.researchActivityId ? parseInt(req.query.researchActivityId as string) : undefined;
      
      let publications;
      if (researchActivityId && !isNaN(researchActivityId)) {
        publications = await storage.getPublicationsForResearchActivity(researchActivityId);
      } else {
        publications = await storage.getPublications();
      }
      
      // Enhance publications with research activity details
      const enhancedPublications = await Promise.all(publications.map(async (pub) => {
        const researchActivity = pub.researchActivityId ? await storage.getResearchActivity(pub.researchActivityId) : null;
        return {
          ...pub,
          researchActivity: researchActivity ? {
            id: researchActivity.id,
            sdrNumber: researchActivity.sdrNumber,
            title: researchActivity.title
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

      // Get research activity details
      const researchActivity = publication.researchActivityId ? await storage.getResearchActivity(publication.researchActivityId) : null;
      
      const enhancedPublication = {
        ...publication,
        researchActivity: researchActivity ? {
          id: researchActivity.id,
          sdrNumber: researchActivity.sdrNumber,
          title: researchActivity.title
        } : null
      };

      res.json(enhancedPublication);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch publication" });
    }
  });

  app.post('/api/publications', async (req: Request, res: Response) => {
    try {
      // Create a validation schema that makes authors optional for concept status
      const createPublicationSchema = insertPublicationSchema.extend({
        authors: z.string().optional().nullable(),
      });
      
      const validateData = createPublicationSchema.parse(req.body);
      
      // Set default status to "Concept" if not provided
      const publicationData = {
        ...validateData,
        status: validateData.status || "Concept"
      };
      
      // Check if research activity exists if researchActivityId is provided
      if (publicationData.researchActivityId) {
        const researchActivity = await storage.getResearchActivity(publicationData.researchActivityId);
        if (!researchActivity) {
          return res.status(404).json({ message: "Research activity not found" });
        }
      }
      
      const publication = await storage.createPublication(publicationData);
      res.status(201).json(publication);
    } catch (error) {
      console.error("Publication creation error:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create publication", error: error.message });
    }
  });

  app.patch('/api/publications/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid publication ID" });
      }

      const validateData = insertPublicationSchema.partial().parse(req.body);
      
      // Check if research activity exists if researchActivityId is provided
      if (validateData.researchActivityId) {
        const researchActivity = await storage.getResearchActivity(validateData.researchActivityId);
        if (!researchActivity) {
          return res.status(404).json({ message: "Research activity not found" });
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

  // Manuscript History
  app.get('/api/publications/:id/history', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid publication ID" });
      }

      const history = await storage.getManuscriptHistory(id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch manuscript history" });
    }
  });

  // Publication Status Management
  app.patch('/api/publications/:id/status', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid publication ID" });
      }

      const { status, changedBy, changes, updatedFields } = req.body;
      
      if (!status || !changedBy) {
        return res.status(400).json({ message: "Status and changedBy are required" });
      }

      // Validate status transition
      const currentPublication = await storage.getPublication(id);
      if (!currentPublication) {
        return res.status(404).json({ message: "Publication not found" });
      }

      // Status validation logic
      const validTransitions = {
        'Concept': ['Complete Draft'],
        'Complete Draft': ['Vetted for submission'],
        'Vetted for submission': ['Submitted for review with pre-publication', 'Submitted for review without pre-publication'],
        'Submitted for review with pre-publication': ['Under review'],
        'Submitted for review without pre-publication': ['Under review'],
        'Under review': ['Accepted/In Press'],
        'Accepted/In Press': ['Published']
      };

      const currentStatus = currentPublication.status || 'Concept';
      if (!validTransitions[currentStatus]?.includes(status)) {
        return res.status(400).json({ 
          message: `Invalid status transition from "${currentStatus}" to "${status}"` 
        });
      }

      // Field validation based on status
      const validationErrors = [];
      
      if (status === 'Complete Draft' && (!currentPublication.authors || currentPublication.authors.trim() === '')) {
        validationErrors.push('Authorship field is required for Complete Draft status');
      }
      
      if (status === 'Vetted for submission' && !currentPublication.vettedForSubmissionByIpOffice) {
        validationErrors.push('IP office approval is required for Vetted for submission status. Please update this in the publication edit form.');
      }
      
      if (status === 'Submitted for review with pre-publication' && 
          (!currentPublication.prepublicationUrl || !currentPublication.prepublicationSite)) {
        validationErrors.push('Prepublication URL and site are required for pre-publication submission');
      }
      
      if (['Under review', 'Accepted/In Press'].includes(status) && 
          (!currentPublication.journal || currentPublication.journal.trim() === '')) {
        validationErrors.push('Journal name is required for this status');
      }
      
      if (status === 'Published' && 
          (!currentPublication.publicationDate || !currentPublication.doi)) {
        validationErrors.push('Publication date and DOI are required for Published status');
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({ message: validationErrors.join('; ') });
      }

      // Status updates are handled by updatePublicationStatus method below

      const updatedPublication = await storage.updatePublicationStatus(id, status, changedBy, changes);
      
      if (!updatedPublication) {
        return res.status(404).json({ message: "Publication not found" });
      }
      
      res.json(updatedPublication);
    } catch (error) {
      console.error('Error updating publication status:', error);
      res.status(500).json({ message: "Failed to update publication status" });
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
      const researchActivityId = req.query.researchActivityId ? parseInt(req.query.researchActivityId as string) : undefined;
      
      let applications;
      if (researchActivityId && !isNaN(researchActivityId)) {
        applications = await storage.getIrbApplicationsForResearchActivity(researchActivityId);
      } else {
        applications = await storage.getIrbApplications();
      }
      
      // Enhance applications with research activity and PI details
      const enhancedApplications = await Promise.all(applications.map(async (app) => {
        const researchActivity = app.researchActivityId ? await storage.getResearchActivity(app.researchActivityId) : null;
        const pi = await storage.getScientist(app.principalInvestigatorId);
        
        return {
          ...app,
          researchActivity: researchActivity ? {
            id: researchActivity.id,
            sdrNumber: researchActivity.sdrNumber,
            title: researchActivity.title
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
      // Generate IRB number automatically - simple increment approach
      const currentYear = new Date().getFullYear();
      const existingApps = await storage.getIrbApplications();
      const yearlyApps = existingApps.filter(app => 
        app.irbNumber && app.irbNumber.startsWith(`IRB-${currentYear}-`)
      );
      
      // Get the highest existing number and add 1
      const existingNumbers = yearlyApps
        .map(app => {
          const match = app.irbNumber?.match(/IRB-\d{4}-(\d{3})/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter(num => num > 0);
      
      const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
      const nextNumber = maxNumber + 1;
      const irbNumber = `IRB-${currentYear}-${nextNumber.toString().padStart(3, '0')}`;
      
      const validateData = {
        ...req.body,
        irbNumber,
        workflowStatus: req.body.workflowStatus || 'draft',
        status: 'Active', // Required field for database
      };
      
      // Check if research activity exists
      const researchActivity = await storage.getResearchActivity(validateData.researchActivityId);
      if (!researchActivity) {
        return res.status(404).json({ message: "Research activity not found" });
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
      console.error('IRB application creation error:', error);
      res.status(500).json({ message: "Failed to create IRB application" });
    }
  });

  app.patch('/api/irb-applications/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IRB application ID" });
      }

      console.log('Updating IRB application with data:', req.body);

      // Handle submission comments separately
      if (req.body.submissionComment) {
        const currentApp = await storage.getIrbApplication(id);
        if (currentApp) {
          let existingResponses = {};
          
          // Handle both string and object formats for piResponses
          if (currentApp.piResponses) {
            if (typeof currentApp.piResponses === 'string') {
              try {
                existingResponses = JSON.parse(currentApp.piResponses);
              } catch (e) {
                console.error('Error parsing existing PI responses:', e);
                existingResponses = {};
              }
            } else if (typeof currentApp.piResponses === 'object') {
              existingResponses = currentApp.piResponses;
            }
          }
          
          const newResponse = {
            timestamp: new Date().toISOString(),
            comment: req.body.submissionComment,
            workflowStatus: req.body.workflowStatus || 'resubmitted'
          };
          existingResponses[Date.now()] = newResponse;
          req.body.piResponses = JSON.stringify(existingResponses);
          delete req.body.submissionComment; // Remove from body to avoid validation issues
        }
      }

      // Skip validation for protocol team members updates and documents updates
      let validateData = req.body;
      
      // Always convert date strings to Date objects if present
      if (req.body.submissionDate && typeof req.body.submissionDate === 'string') {
        req.body.submissionDate = new Date(req.body.submissionDate);
      }
      if (req.body.initialApprovalDate && typeof req.body.initialApprovalDate === 'string') {
        req.body.initialApprovalDate = new Date(req.body.initialApprovalDate);
      }
      if (req.body.expirationDate && typeof req.body.expirationDate === 'string') {
        req.body.expirationDate = new Date(req.body.expirationDate);
      }
      
      if (!req.body.protocolTeamMembers && !req.body.documents && !req.body.piResponses) {
        validateData = insertIrbApplicationSchema.partial().parse(req.body);
      }
      
      // Check if research activity exists if researchActivityId is provided
      if (validateData.researchActivityId) {
        const researchActivity = await storage.getResearchActivity(validateData.researchActivityId);
        if (!researchActivity) {
          return res.status(404).json({ message: "Research activity not found" });
        }
      }
      
      // Check if principal investigator exists if principalInvestigatorId is provided
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
        console.error('Validation error:', error);
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error('IRB application update error:', error);
      res.status(500).json({ message: "Failed to update IRB application", error: error.message });
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

      // Get related research activities (SDRs)
      const researchActivities = await storage.getResearchActivitiesForIbcApplication(id);
      const pi = await storage.getScientist(application.principalInvestigatorId);
      
      const enhancedApplication = {
        ...application,
        researchActivities: researchActivities.map(activity => ({
          id: activity.id,
          sdrNumber: activity.sdrNumber,
          title: activity.title,
          status: activity.status
        })),
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
      console.log("=== IBC Application Creation Debug ===");
      console.log("Full request body:", JSON.stringify(req.body, null, 2));
      
      const { researchActivityIds, isDraft, ...applicationData } = req.body;
      console.log("Extracted researchActivityIds:", researchActivityIds);
      console.log("Is draft:", isDraft);
      console.log("Application data after extraction:", JSON.stringify(applicationData, null, 2));
      
      console.log("Adding auto-generated fields...");
      // Add auto-generated fields before validation
      const dataWithAutoFields = {
        ...applicationData,
        ibcNumber: applicationData.ibcNumber || await storage.generateNextIbcNumber(),
        status: isDraft ? "Draft" : (applicationData.status || "Submitted"),
        workflowStatus: isDraft ? "draft" : (applicationData.workflowStatus || "submitted"),
        riskLevel: applicationData.riskLevel || "moderate"
      };
      console.log("Data with auto-generated fields:", JSON.stringify(dataWithAutoFields, null, 2));
      
      console.log("Validating with schema...");
      const validateData = insertIbcApplicationSchema.parse(dataWithAutoFields);
      console.log("Schema validation successful:", JSON.stringify(validateData, null, 2));
      
      // Check if principal investigator exists
      console.log("Checking principal investigator with ID:", validateData.principalInvestigatorId);
      const pi = await storage.getScientist(validateData.principalInvestigatorId);
      if (!pi) {
        console.log("Principal investigator not found");
        return res.status(404).json({ message: "Principal investigator not found" });
      }
      console.log("Principal investigator found:", pi.name);
      
      // Validate research activities if provided
      if (researchActivityIds && Array.isArray(researchActivityIds)) {
        console.log("Validating research activities:", researchActivityIds);
        for (const activityId of researchActivityIds) {
          const activity = await storage.getResearchActivity(activityId);
          if (!activity) {
            console.log(`Research activity with ID ${activityId} not found`);
            return res.status(404).json({ message: `Research activity with ID ${activityId} not found` });
          }
          console.log(`Research activity ${activityId} found:`, activity.title);
        }
      }
      
      console.log("Creating IBC application...");
      const application = await storage.createIbcApplication(validateData, researchActivityIds || []);
      console.log("IBC application created successfully:", application.id);
      
      res.status(201).json(application);
    } catch (error) {
      console.error("Error creating IBC application:", error);
      if (error instanceof ZodError) {
        console.log("Zod validation error:", fromZodError(error).message);
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.log("Generic error:", error.message);
      res.status(500).json({ message: "Failed to create IBC application", error: error.message });
    }
  });

  app.patch('/api/ibc-applications/:id', async (req: Request, res: Response) => {
    try {
      console.log('PATCH /api/ibc-applications/:id called');
      console.log('Request params:', req.params);
      console.log('Request body:', req.body);
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC application ID" });
      }

      // Extract isDraft flag and remove it from validation data
      const { isDraft, ...bodyData } = req.body;
      console.log('isDraft:', isDraft);
      console.log('bodyData:', bodyData);
      
      const validateData = insertIbcApplicationSchema.partial().parse(bodyData);
      console.log('Validated data after schema parsing:', validateData);
      
      // Handle status based on isDraft flag
      if (isDraft !== undefined) {
        if (isDraft) {
          validateData.status = 'draft';
        } else {
          validateData.status = 'submitted';
          // Set submission date when submitting
          if (!validateData.submissionDate) {
            validateData.submissionDate = new Date();
          }
        }
        console.log('Status set to:', validateData.status);
        console.log('Submission date set to:', validateData.submissionDate);
      }
      
      // Handle status changes for timeline tracking
      if (validateData.status) {
        const currentTime = new Date();
        
        // Set vetted date when moving to vetted status
        if (validateData.status === 'vetted' && !validateData.vettedDate) {
          validateData.vettedDate = currentTime;
        }
        
        // Set under review date when moving to under_review status
        if (validateData.status === 'under_review' && !validateData.underReviewDate) {
          validateData.underReviewDate = currentTime;
        }
        
        // Set approval date when moving to active status
        if (validateData.status === 'active' && !validateData.approvalDate) {
          validateData.approvalDate = currentTime;
        }
      }
      
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
      
      // Get the current application for status change tracking
      const currentApplication = await storage.getIbcApplication(id);
      if (!currentApplication) {
        return res.status(404).json({ message: "IBC application not found" });
      }

      console.log('About to call storage.updateIbcApplication with:', id, validateData);
      const application = await storage.updateIbcApplication(id, validateData);
      console.log('storage.updateIbcApplication result:', application);
      
      if (!application) {
        return res.status(404).json({ message: "IBC application not found" });
      }

      // Create office comment if reviewComments are provided
      if (req.body.reviewComments) {
        await storage.createIbcApplicationComment({
          applicationId: id,
          commentType: 'office_comment',
          authorType: 'office',
          authorName: 'IBC Office',
          comment: req.body.reviewComments,
          isInternal: false
        });
      }

      // Create status change comment if status changed
      if (validateData.status && validateData.status !== currentApplication.status) {
        const statusLabels = {
          'draft': 'Draft',
          'submitted': 'Submitted',
          'vetted': 'Vetted',
          'under_review': 'Under Review',
          'active': 'Active',
          'expired': 'Expired'
        };
        
        await storage.createIbcApplicationComment({
          applicationId: id,
          commentType: 'status_change',
          authorType: 'system',
          authorName: 'System',
          comment: `Status changed from ${statusLabels[currentApplication.status] || currentApplication.status} to ${statusLabels[validateData.status] || validateData.status}`,
          statusFrom: currentApplication.status,
          statusTo: validateData.status,
          isInternal: false
        });
      }
      
      res.json(application);
    } catch (error) {
      console.error('Error in PATCH /api/ibc-applications/:id:', error);
      if (error instanceof ZodError) {
        console.error('Zod validation error details:', fromZodError(error).message);
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error('Non-Zod error:', error);
      res.status(500).json({ message: "Failed to update IBC application", error: error.message });
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

  // Get research activities for an IBC application
  app.get('/api/ibc-applications/:id/research-activities', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC application ID" });
      }

      const researchActivities = await storage.getResearchActivitiesForIbcApplication(id);
      res.json(researchActivities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch research activities for IBC application" });
    }
  });

  // Get personnel data for an IBC application
  app.get('/api/ibc-applications/:id/personnel', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC application ID" });
      }

      const application = await storage.getIbcApplication(id);
      if (!application) {
        return res.status(404).json({ message: "IBC application not found" });
      }

      // Get personnel from the application's protocolTeamMembers field if it exists
      if (application.protocolTeamMembers && Array.isArray(application.protocolTeamMembers)) {
        // Enhance personnel data with scientist details
        const enhancedPersonnel = await Promise.all(
          application.protocolTeamMembers.map(async (person: any) => {
            if (person.scientistId) {
              const scientist = await storage.getScientist(person.scientistId);
              return {
                ...person,
                scientist: scientist ? {
                  id: scientist.id,
                  name: scientist.name,
                  email: scientist.email,
                  department: scientist.department,
                  title: scientist.title,
                  profileImageInitials: scientist.profileImageInitials
                } : null
              };
            }
            return person;
          })
        );
        
        res.json(enhancedPersonnel);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error("Error fetching IBC application personnel:", error);
      res.status(500).json({ message: "Failed to fetch personnel for IBC application" });
    }
  });

  // Add research activity to IBC application
  app.post('/api/ibc-applications/:id/research-activities', async (req: Request, res: Response) => {
    try {
      const ibcApplicationId = parseInt(req.params.id);
      const { researchActivityId } = req.body;

      if (isNaN(ibcApplicationId)) {
        return res.status(400).json({ message: "Invalid IBC application ID" });
      }

      if (!researchActivityId || isNaN(researchActivityId)) {
        return res.status(400).json({ message: "Valid research activity ID is required" });
      }

      // Check if IBC application exists
      const ibcApplication = await storage.getIbcApplication(ibcApplicationId);
      if (!ibcApplication) {
        return res.status(404).json({ message: "IBC application not found" });
      }

      // Check if research activity exists
      const researchActivity = await storage.getResearchActivity(researchActivityId);
      if (!researchActivity) {
        return res.status(404).json({ message: "Research activity not found" });
      }

      const linkage = await storage.addResearchActivityToIbcApplication(ibcApplicationId, researchActivityId);
      res.status(201).json(linkage);
    } catch (error) {
      res.status(500).json({ message: "Failed to add research activity to IBC application" });
    }
  });

  // Remove research activity from IBC application
  app.delete('/api/ibc-applications/:id/research-activities/:activityId', async (req: Request, res: Response) => {
    try {
      const ibcApplicationId = parseInt(req.params.id);
      const researchActivityId = parseInt(req.params.activityId);

      if (isNaN(ibcApplicationId)) {
        return res.status(400).json({ message: "Invalid IBC application ID" });
      }

      if (isNaN(researchActivityId)) {
        return res.status(400).json({ message: "Invalid research activity ID" });
      }

      const success = await storage.removeResearchActivityFromIbcApplication(ibcApplicationId, researchActivityId);
      
      if (!success) {
        return res.status(404).json({ message: "Research activity not linked to this IBC application" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove research activity from IBC application" });
    }
  });

  // Submit reviewer feedback for IBC application
  app.post('/api/ibc-applications/:id/reviewer-feedback', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC application ID" });
      }

      const { comments, recommendation } = req.body;
      
      if (!comments || !recommendation) {
        return res.status(400).json({ message: "Comments and recommendation are required" });
      }

      // Get the current application
      const application = await storage.getIbcApplication(id);
      if (!application) {
        return res.status(404).json({ message: "IBC application not found" });
      }

      // Create the reviewer feedback comment in the comments table
      await storage.createIbcApplicationComment({
        applicationId: id,
        commentType: 'reviewer_feedback',
        authorType: 'reviewer',
        authorName: 'IBC Reviewer',
        comment: comments,
        recommendation: recommendation,
        isInternal: false
      });

      // Update status based on recommendation
      let newStatus = application.status;
      let statusChangeComment = '';
      
      if (recommendation === 'approve') {
        newStatus = 'active';
        statusChangeComment = 'Application approved by reviewer';
      } else if (recommendation === 'reject') {
        newStatus = 'expired';
        statusChangeComment = 'Application rejected by reviewer';
      } else if (recommendation === 'minor_revisions' || recommendation === 'major_revisions') {
        newStatus = 'vetted'; // Return to office for revision handling
        statusChangeComment = `Application returned to office for ${recommendation.replace('_', ' ')}`;
      } else {
        newStatus = 'under_review'; // Stay under review for other cases
        statusChangeComment = 'Application remains under review';
      }

      // Create status change comment if status changed
      if (newStatus !== application.status) {
        await storage.createIbcApplicationComment({
          applicationId: id,
          commentType: 'status_change',
          authorType: 'system',
          authorName: 'System',
          comment: statusChangeComment,
          statusFrom: application.status,
          statusTo: newStatus,
          isInternal: false
        });
      }

      const updatedApplication = await storage.updateIbcApplication(id, {
        status: newStatus,
        workflowStatus: newStatus, // Keep workflow status in sync with status
        underReviewDate: newStatus === 'under_review' ? new Date() : application.underReviewDate,
        approvalDate: newStatus === 'active' ? new Date() : application.approvalDate,
        vettedDate: newStatus === 'vetted' ? new Date() : application.vettedDate,
      });

      res.json({ 
        message: "Review submitted successfully",
        application: updatedApplication 
      });
    } catch (error) {
      console.error("Error submitting reviewer feedback:", error);
      res.status(500).json({ message: "Failed to submit reviewer feedback" });
    }
  });

  // Get comments for IBC application
  app.get('/api/ibc-applications/:id/comments', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC application ID" });
      }

      const comments = await storage.getIbcApplicationComments(id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching IBC application comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Submit PI comment for IBC application
  app.post('/api/ibc-applications/:id/pi-comment', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC application ID" });
      }

      const { comment } = req.body;
      
      if (!comment || !comment.trim()) {
        return res.status(400).json({ message: "Comment is required" });
      }

      // Get the current application to get PI info
      const application = await storage.getIbcApplication(id);
      if (!application) {
        return res.status(404).json({ message: "IBC application not found" });
      }

      // Get PI details for the comment
      const pi = await storage.getScientist(application.principalInvestigatorId);
      const piName = pi ? pi.name : 'Principal Investigator';

      // Create the PI comment in the comments table
      await storage.createIbcApplicationComment({
        applicationId: id,
        commentType: 'pi_response',
        authorType: 'pi',
        authorName: piName,
        authorId: application.principalInvestigatorId,
        comment: comment.trim(),
        isInternal: false
      });

      res.json({ 
        message: "Comment submitted successfully"
      });
    } catch (error) {
      console.error("Error submitting PI comment:", error);
      res.status(500).json({ message: "Failed to submit comment" });
    }
  });

  // IBC Board Members
  app.get('/api/ibc-board-members', async (req: Request, res: Response) => {
    try {
      const boardMembers = await storage.getIbcBoardMembers();
      res.json(boardMembers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch IBC board members" });
    }
  });

  app.get('/api/ibc-board-members/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC board member ID" });
      }

      const boardMember = await storage.getIbcBoardMember(id);
      if (!boardMember) {
        return res.status(404).json({ message: "IBC board member not found" });
      }

      res.json(boardMember);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch IBC board member" });
    }
  });

  app.post('/api/ibc-board-members', async (req: Request, res: Response) => {
    try {
      // Create a simplified validation that accepts string dates
      const validateData = {
        scientistId: req.body.scientistId,
        role: req.body.role,
        appointmentDate: req.body.appointmentDate,
        termEndDate: req.body.termEndDate,
        expertise: req.body.expertise || [],
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        notes: req.body.notes
      };
      
      // Basic validation
      if (!validateData.scientistId || !validateData.role || !validateData.termEndDate) {
        return res.status(400).json({ message: "Missing required fields: scientistId, role, termEndDate" });
      }
      
      // Check if scientist exists
      const scientist = await storage.getScientist(validateData.scientistId);
      if (!scientist) {
        return res.status(404).json({ message: "Scientist not found" });
      }
      
      const boardMember = await storage.createIbcBoardMember(validateData);
      res.status(201).json(boardMember);
    } catch (error) {
      console.error("Board member creation error:", error);
      res.status(500).json({ message: "Failed to create IBC board member" });
    }
  });

  app.patch('/api/ibc-board-members/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC board member ID" });
      }

      const validateData = insertIbcBoardMemberSchema.partial().parse(req.body);
      
      // Check if scientist exists if scientistId is provided
      if (validateData.scientistId) {
        const scientist = await storage.getScientist(validateData.scientistId);
        if (!scientist) {
          return res.status(404).json({ message: "Scientist not found" });
        }
      }
      
      const boardMember = await storage.updateIbcBoardMember(id, validateData);
      
      if (!boardMember) {
        return res.status(404).json({ message: "IBC board member not found" });
      }
      
      res.json(boardMember);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update IBC board member" });
    }
  });

  app.delete('/api/ibc-board-members/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC board member ID" });
      }

      const success = await storage.deleteIbcBoardMember(id);
      
      if (!success) {
        return res.status(404).json({ message: "IBC board member not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete IBC board member" });
    }
  });

  // IBC Submissions
  app.get('/api/ibc-submissions', async (req: Request, res: Response) => {
    try {
      const applicationId = req.query.applicationId ? parseInt(req.query.applicationId as string) : undefined;
      
      let submissions;
      if (applicationId && !isNaN(applicationId)) {
        submissions = await storage.getIbcSubmissionsForApplication(applicationId);
      } else {
        submissions = await storage.getIbcSubmissions();
      }
      
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch IBC submissions" });
    }
  });

  app.get('/api/ibc-submissions/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC submission ID" });
      }

      const submission = await storage.getIbcSubmission(id);
      if (!submission) {
        return res.status(404).json({ message: "IBC submission not found" });
      }

      res.json(submission);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch IBC submission" });
    }
  });

  app.post('/api/ibc-submissions', async (req: Request, res: Response) => {
    try {
      const validateData = insertIbcSubmissionSchema.parse(req.body);
      
      // Check if application exists
      const application = await storage.getIbcApplication(validateData.applicationId);
      if (!application) {
        return res.status(404).json({ message: "IBC application not found" });
      }
      
      // Check if submitted by scientist exists
      const scientist = await storage.getScientist(validateData.submittedBy);
      if (!scientist) {
        return res.status(404).json({ message: "Submitting scientist not found" });
      }
      
      const submission = await storage.createIbcSubmission(validateData);
      res.status(201).json(submission);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create IBC submission" });
    }
  });

  app.patch('/api/ibc-submissions/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC submission ID" });
      }

      const validateData = insertIbcSubmissionSchema.partial().parse(req.body);
      const submission = await storage.updateIbcSubmission(id, validateData);
      
      if (!submission) {
        return res.status(404).json({ message: "IBC submission not found" });
      }
      
      res.json(submission);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update IBC submission" });
    }
  });

  app.delete('/api/ibc-submissions/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC submission ID" });
      }

      const success = await storage.deleteIbcSubmission(id);
      
      if (!success) {
        return res.status(404).json({ message: "IBC submission not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete IBC submission" });
    }
  });

  // IBC Documents
  app.get('/api/ibc-documents', async (req: Request, res: Response) => {
    try {
      const applicationId = req.query.applicationId ? parseInt(req.query.applicationId as string) : undefined;
      
      let documents;
      if (applicationId && !isNaN(applicationId)) {
        documents = await storage.getIbcDocumentsForApplication(applicationId);
      } else {
        documents = await storage.getIbcDocuments();
      }
      
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch IBC documents" });
    }
  });

  app.get('/api/ibc-documents/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC document ID" });
      }

      const document = await storage.getIbcDocument(id);
      if (!document) {
        return res.status(404).json({ message: "IBC document not found" });
      }

      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch IBC document" });
    }
  });

  app.post('/api/ibc-documents', async (req: Request, res: Response) => {
    try {
      const validateData = insertIbcDocumentSchema.parse(req.body);
      
      // Check if application exists (if provided)
      if (validateData.applicationId) {
        const application = await storage.getIbcApplication(validateData.applicationId);
        if (!application) {
          return res.status(404).json({ message: "IBC application not found" });
        }
      }
      
      // Check if uploaded by scientist exists
      const scientist = await storage.getScientist(validateData.uploadedBy);
      if (!scientist) {
        return res.status(404).json({ message: "Uploading scientist not found" });
      }
      
      const document = await storage.createIbcDocument(validateData);
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create IBC document" });
    }
  });

  app.patch('/api/ibc-documents/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC document ID" });
      }

      const validateData = insertIbcDocumentSchema.partial().parse(req.body);
      const document = await storage.updateIbcDocument(id, validateData);
      
      if (!document) {
        return res.status(404).json({ message: "IBC document not found" });
      }
      
      res.json(document);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update IBC document" });
    }
  });

  app.delete('/api/ibc-documents/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC document ID" });
      }

      const success = await storage.deleteIbcDocument(id);
      
      if (!success) {
        return res.status(404).json({ message: "IBC document not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete IBC document" });
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

  // IRB Board Members API
  app.get('/api/irb-board-members', async (req: Request, res: Response) => {
    try {
      const members = await storage.getIrbBoardMembers();
      res.json(members);
    } catch (error) {
      console.error('Error fetching IRB board members:', error);
      res.status(500).json({ message: "Failed to fetch IRB board members" });
    }
  });

  app.get('/api/irb-board-members/active', async (req: Request, res: Response) => {
    try {
      const members = await storage.getActiveIrbBoardMembers();
      res.json(members);
    } catch (error) {
      console.error('Error fetching active IRB board members:', error);
      res.status(500).json({ message: "Failed to fetch active IRB board members" });
    }
  });

  app.get('/api/irb-board-members/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid board member ID" });
      }

      const member = await storage.getIrbBoardMember(id);
      if (!member) {
        return res.status(404).json({ message: "IRB board member not found" });
      }

      res.json(member);
    } catch (error) {
      console.error('Error fetching IRB board member:', error);
      res.status(500).json({ message: "Failed to fetch IRB board member" });
    }
  });

  app.post('/api/irb-board-members', async (req: Request, res: Response) => {
    try {
      console.log('Creating IRB board member with data:', req.body);
      
      // Validate required fields
      if (!req.body.scientistId || !req.body.role) {
        return res.status(400).json({ message: "Scientist ID and role are required" });
      }

      // Check for existing chair or deputy chair if trying to assign these roles
      if (req.body.role === 'chair' || req.body.role === 'deputy_chair') {
        const existingMembers = await storage.getIrbBoardMembers();
        const existingRole = existingMembers.find(m => m.role === req.body.role && m.isActive);
        
        if (existingRole) {
          const roleLabel = req.body.role === 'chair' ? 'Chair' : 'Deputy Chair';
          return res.status(400).json({ 
            message: `An active ${roleLabel} already exists. Please deactivate the current ${roleLabel} first.` 
          });
        }
      }

      // Set default term end date to 3 years from now if not provided
      if (!req.body.termEndDate) {
        const threeYearsFromNow = new Date();
        threeYearsFromNow.setFullYear(threeYearsFromNow.getFullYear() + 3);
        req.body.termEndDate = threeYearsFromNow.toISOString();
      }

      // Ensure expertise is an array
      if (typeof req.body.expertise === 'string') {
        req.body.expertise = [req.body.expertise];
      } else if (!req.body.expertise) {
        req.body.expertise = [];
      }

      const member = await storage.createIrbBoardMember(req.body);
      console.log('Successfully created IRB board member:', member);
      res.status(201).json(member);
    } catch (error) {
      console.error('Error creating IRB board member:', error);
      res.status(500).json({ message: "Failed to create IRB board member", error: error.message });
    }
  });

  app.patch('/api/irb-board-members/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid board member ID" });
      }

      console.log('Updating IRB board member with data:', req.body);

      // Check for existing chair or deputy chair if trying to assign these roles
      if (req.body.role === 'chair' || req.body.role === 'deputy_chair') {
        const existingMembers = await storage.getIrbBoardMembers();
        const existingRole = existingMembers.find(m => m.role === req.body.role && m.isActive && m.id !== id);
        
        if (existingRole) {
          const roleLabel = req.body.role === 'chair' ? 'Chair' : 'Deputy Chair';
          return res.status(400).json({ 
            message: `An active ${roleLabel} already exists. Please change the current ${roleLabel} to member first.` 
          });
        }
      }

      const member = await storage.updateIrbBoardMember(id, req.body);
      if (!member) {
        return res.status(404).json({ message: "IRB board member not found" });
      }

      res.json(member);
    } catch (error) {
      console.error('Error updating IRB board member:', error);
      res.status(500).json({ message: "Failed to update IRB board member", error: error.message });
    }
  });

  app.delete('/api/irb-board-members/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid board member ID" });
      }

      const success = await storage.deleteIrbBoardMember(id);
      if (!success) {
        return res.status(404).json({ message: "IRB board member not found" });
      }

      res.json({ message: "IRB board member deleted successfully" });
    } catch (error) {
      console.error('Error deleting IRB board member:', error);
      res.status(500).json({ message: "Failed to delete IRB board member", error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

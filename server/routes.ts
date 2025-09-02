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
  insertProjectSchema,
  insertBuildingSchema,
  insertRoomSchema,
  insertIbcApplicationRoomSchema,
  insertIbcBackboneSourceRoomSchema,
  insertIbcApplicationPpeSchema,
  insertRolePermissionSchema
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

  // Get scientists filtered by role for room supervisor/manager selection
  app.get('/api/scientists/investigators', async (req: Request, res: Response) => {
    try {
      const investigators = await storage.getScientistsByRole('investigator');
      res.json(investigators);
    } catch (error) {
      console.error('Error fetching investigators:', error);
      res.status(500).json({ message: "Failed to fetch investigators" });
    }
  });

  app.get('/api/scientists/scientific-staff', async (req: Request, res: Response) => {
    try {
      const scientificStaff = await storage.getScientistsByRole('staff|management|post-doctoral|research');
      res.json(scientificStaff);
    } catch (error) {
      console.error('Error fetching scientific staff:', error);
      res.status(500).json({ message: "Failed to fetch scientific staff" });
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

  // Sidra Score calculation for all scientists
  app.post('/api/scientists/sidra-scores', async (req: Request, res: Response) => {
    try {
      const { years = 5, impactFactorYear = "publication", multipliers = {} } = req.body;
      
      // Default multipliers
      const defaultMultipliers = {
        'First Author': 2,
        'Last Author': 2,
        'Senior Author': 2,
        'Corresponding Author': 2
      };
      
      const finalMultipliers = { ...defaultMultipliers, ...multipliers };
      
      // Get only scientific staff (exclude administrative staff)
      const allScientists = await storage.getScientists();
      const scientists = allScientists.filter(scientist => scientist.staffType === 'scientific');
      
      // Calculate scores for each scientist
      const rankings = await Promise.all(scientists.map(async (scientist) => {
        let totalScore = 0;
        let publicationsCount = 0;
        let missingImpactFactorPublications: string[] = [];
        let calculationDetails: any[] = [];
        
        try {
          // Get all publications and filter for ones where this scientist is an internal author
          const allPublications = await storage.getPublications();
          const scientistPublications = [];
          
          // First, get all publications where this scientist is an internal author
          for (const publication of allPublications) {
            try {
              const authors = await storage.getPublicationAuthors(publication.id);
              const scientistAuthor = authors.find(author => author.scientistId === scientist.id);
              
              if (scientistAuthor) {
                // Check if publication is within time period
                if (publication.publicationDate) {
                  const pubDate = new Date(publication.publicationDate);
                  const cutoffDate = new Date();
                  cutoffDate.setFullYear(cutoffDate.getFullYear() - years);
                  
                  if (pubDate >= cutoffDate) {
                    scientistPublications.push({
                      ...publication,
                      authorshipType: scientistAuthor.authorshipType
                    });
                  }
                }
              }
            } catch (error) {
              console.error(`Error checking authorship for publication ${publication.id}:`, error);
              continue;
            }
          }
          
          // Now calculate scores for publications where scientist is internal author
          for (const publication of scientistPublications) {
            try {
              // Only count published publications with impact factors
              if (!publication.status || !['Published', 'Published *', 'Accepted/In Press'].includes(publication.status)) {
                continue;
              }
              
              if (!publication.journal || publication.journal.trim() === '') {
                continue;
              }
              
              // Get journal impact factor based on configured year
              const pubYear = publication.publicationDate ? new Date(publication.publicationDate).getFullYear() : new Date().getFullYear();
              
              let targetYear;
              if (impactFactorYear === "prior") {
                targetYear = pubYear - 1;
              } else if (impactFactorYear === "publication") {
                targetYear = pubYear;
              } else { // "latest"
                targetYear = new Date().getFullYear();
              }
              
              let impactFactor;
              let actualYear = targetYear;
              let usedFallback = false;
              
              try {
                console.log(`Looking for impact factor: journal="${publication.journal.trim()}", targetYear=${targetYear}`);
                impactFactor = await storage.getImpactFactorByJournalAndYear(publication.journal.trim(), targetYear);
                
                // If no impact factor found for target year, try fallback years
                if (!impactFactor) {
                  console.log(`No impact factor found for ${publication.journal.trim()} in ${targetYear}, trying fallbacks...`);
                  usedFallback = true;
                  if (impactFactorYear === "latest") {
                    // For latest, try previous years going back from current year
                    for (let fallbackYear = new Date().getFullYear() - 1; fallbackYear >= 2020; fallbackYear--) {
                      impactFactor = await storage.getImpactFactorByJournalAndYear(publication.journal.trim(), fallbackYear);
                      if (impactFactor) {
                        console.log(`Found fallback impact factor for ${publication.journal.trim()} in ${fallbackYear}`);
                        actualYear = fallbackYear;
                        break;
                      }
                    }
                  } else {
                    // For prior/publication year, try adjacent years
                    const fallbackYears = [targetYear + 1, targetYear - 1, targetYear + 2, targetYear - 2];
                    for (const fallbackYear of fallbackYears) {
                      if (fallbackYear >= 2020) {
                        impactFactor = await storage.getImpactFactorByJournalAndYear(publication.journal.trim(), fallbackYear);
                        if (impactFactor) {
                          console.log(`Found fallback impact factor for ${publication.journal.trim()} in ${fallbackYear}`);
                          actualYear = fallbackYear;
                          break;
                        }
                      }
                    }
                  }
                } else {
                  console.log(`Found exact impact factor for ${publication.journal.trim()} in ${targetYear}: ${impactFactor.impactFactor}`);
                }
              } catch (error) {
                console.error(`Error getting impact factor for journal "${publication.journal}" year ${targetYear}:`, error);
                continue;
              }
              
              if (!impactFactor?.impactFactor || isNaN(impactFactor.impactFactor)) {
                // Track publications without impact factors
                missingImpactFactorPublications.push(publication.title);
                continue;
              }
              
              publicationsCount++;
              
              // Parse authorship types and apply multipliers
              const authorshipTypes = publication.authorshipType.split(',').map(type => type.trim());
              let multiplier = 1; // Base multiplier
              let appliedMultipliers: string[] = [];
              
              for (const type of authorshipTypes) {
                if (finalMultipliers[type] && !isNaN(finalMultipliers[type])) {
                  if (finalMultipliers[type] > multiplier) {
                    multiplier = finalMultipliers[type];
                    appliedMultipliers = [type];
                  } else if (finalMultipliers[type] === multiplier && !appliedMultipliers.includes(type)) {
                    appliedMultipliers.push(type);
                  }
                }
              }
              
              const publicationScore = impactFactor.impactFactor * multiplier;
              totalScore += publicationScore;
              
              // Store calculation details
              calculationDetails.push({
                title: publication.title,
                journal: publication.journal,
                publicationDate: publication.publicationDate,
                impactFactor: impactFactor.impactFactor,
                targetYear: targetYear,
                actualYear: actualYear,
                usedFallback: usedFallback,
                authorshipTypes: authorshipTypes,
                appliedMultipliers: appliedMultipliers,
                multiplier: multiplier,
                publicationScore: publicationScore
              });
            } catch (pubError) {
              console.error(`Error processing publication ${publication.id} for scientist ${scientist.id}:`, pubError);
              continue;
            }
          }
        } catch (scientistError) {
          console.error(`Error processing scientist ${scientist.id}:`, scientistError);
        }
        
        return {
          id: scientist.id,
          honorificTitle: scientist.honorificTitle,
          firstName: scientist.firstName,
          lastName: scientist.lastName,
          jobTitle: scientist.jobTitle,
          department: scientist.department,
          publicationsCount,
          sidraScore: totalScore,
          missingImpactFactorPublications,
          calculationDetails
        };
      }));
      
      // Sort by score descending
      rankings.sort((a, b) => b.sidraScore - a.sidraScore);
      
      res.json(rankings);
    } catch (error) {
      console.error('Error calculating Sidra scores:', error);
      res.status(500).json({ message: "Failed to calculate Sidra scores" });
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
      
      // Create initial history entry for publication creation
      await storage.createManuscriptHistoryEntry({
        publicationId: publication.id,
        fromStatus: '',
        toStatus: publication.status || 'Concept',
        changedBy: 1, // Default user - could be enhanced with actual session user
        changeReason: 'Publication created',
      });
      
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
      
      if (status === 'Complete Draft') {
        const finalAuthors = updatedFields?.authors || currentPublication.authors;
        if (!finalAuthors || finalAuthors.trim() === '') {
          validationErrors.push('Authorship field is required for Complete Draft status');
        }
      }
      
      if (status === 'Vetted for submission' && !currentPublication.vettedForSubmissionByIpOffice) {
        validationErrors.push('IP office approval is required for Vetted for submission status. Please update this in the publication edit form.');
      }
      
      if (status === 'Submitted for review with pre-publication') {
        const finalUrl = (updatedFields?.prepublicationUrl?.trim() || currentPublication.prepublicationUrl?.trim()) || '';
        const finalSite = (updatedFields?.prepublicationSite?.trim() || currentPublication.prepublicationSite?.trim()) || '';
        if (!finalUrl || !finalSite) {
          validationErrors.push('Prepublication URL and site are required for pre-publication submission');
        }
      }
      
      if (['Under review', 'Accepted/In Press'].includes(status)) {
        const finalJournal = updatedFields?.journal || currentPublication.journal;
        if (!finalJournal || finalJournal.trim() === '') {
          validationErrors.push('Journal name is required for this status');
        }
      }
      
      if (status === 'Published') {
        const finalDate = updatedFields?.publicationDate || currentPublication.publicationDate;
        const finalDoi = updatedFields?.doi || currentPublication.doi;
        if (!finalDate || !finalDoi) {
          validationErrors.push('Publication date and DOI are required for Published status');
        }
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({ message: validationErrors.join('; ') });
      }

      // First update publication fields if provided
      if (updatedFields && Object.keys(updatedFields).length > 0) {
        await storage.updatePublication(id, updatedFields);
      }

      // Then update status and create history
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

  // Publication Export  
  app.post('/api/publications/export', async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, journal, scientist, status } = req.body;
      
      // Get all publications first
      const allPublications = await storage.getPublications();
      
      // Apply filters
      let filteredPublications = allPublications;
      
      if (startDate || endDate) {
        filteredPublications = filteredPublications.filter(pub => {
          if (!pub.publicationDate) return false;
          const pubDate = new Date(pub.publicationDate);
          if (startDate && pubDate < new Date(startDate)) return false;
          if (endDate && pubDate > new Date(endDate)) return false;
          return true;
        });
      }
      
      if (journal) {
        filteredPublications = filteredPublications.filter(pub => 
          pub.journal?.toLowerCase().includes(journal.toLowerCase())
        );
      }
      
      if (status && status !== 'all') {
        filteredPublications = filteredPublications.filter(pub => 
          pub.status === status
        );
      }
      
      if (scientist) {
        filteredPublications = filteredPublications.filter(pub => 
          pub.authors?.toLowerCase().includes(scientist.toLowerCase())
        );
      }
      
      // Format as text for copy-paste
      const formattedText = filteredPublications.map(pub => {
        const year = pub.publicationDate ? new Date(pub.publicationDate).getFullYear() : 'N/A';
        return `${pub.title}\n${pub.authors || 'No authors listed'}\n${pub.journal || 'No journal'} ${pub.volume ? `${pub.volume}` : ''}${pub.issue ? `(${pub.issue})` : ''}${pub.pages ? `: ${pub.pages}` : ''} (${year})\n${pub.doi ? `DOI: ${pub.doi}` : 'No DOI'}\nStatus: ${pub.status || 'Unknown'}\n\n---\n\n`;
      }).join('');
      
      res.json({ 
        count: filteredPublications.length,
        formattedText,
        publications: filteredPublications
      });
    } catch (error) {
      console.error('Error exporting publications:', error);
      res.status(500).json({ message: "Failed to export publications" });
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
      
      // IBC applications are not directly linked to projects, so ignore projectId filter
      const applications = await storage.getIbcApplications();
      
      // Enhance applications with PI details (IBC applications are not directly linked to projects)
      const enhancedApplications = await Promise.all(applications.map(async (app) => {
        const pi = await storage.getScientist(app.principalInvestigatorId);
        
        return {
          ...app,
          principalInvestigator: pi ? {
            id: pi.id,
            name: pi.name,
            profileImageInitials: pi.profileImageInitials
          } : null
        };
      }));
      
      res.json(enhancedApplications);
    } catch (error) {
      console.error('Error fetching IBC applications:', error);
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

  // IBC Application Facilities Routes
  
  // Get rooms for IBC application
  app.get('/api/ibc-applications/:id/rooms', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const rooms = await storage.getIbcApplicationRooms(id);
      res.json(rooms);
    } catch (error) {
      console.error('Error getting IBC application rooms:', error);
      res.status(500).json({ message: "Failed to fetch IBC application rooms" });
    }
  });

  // Add room to IBC application
  app.post('/api/ibc-applications/:id/rooms', async (req: Request, res: Response) => {
    try {
      const applicationId = parseInt(req.params.id);
      const validatedData = insertIbcApplicationRoomSchema.parse({
        ...req.body,
        applicationId
      });
      const newRoom = await storage.addRoomToIbcApplication(validatedData);
      res.status(201).json(newRoom);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).toString() });
      } else {
        console.error('Error adding room to IBC application:', error);
        res.status(500).json({ message: "Failed to add room to IBC application" });
      }
    }
  });

  // Remove room from IBC application
  app.delete('/api/ibc-applications/:id/rooms/:roomId', async (req: Request, res: Response) => {
    try {
      const applicationId = parseInt(req.params.id);
      const roomId = parseInt(req.params.roomId);
      const success = await storage.removeRoomFromIbcApplication(applicationId, roomId);
      if (success) {
        res.json({ message: "Room removed from IBC application successfully" });
      } else {
        res.status(404).json({ message: "Room not found in IBC application" });
      }
    } catch (error) {
      console.error('Error removing room from IBC application:', error);
      res.status(500).json({ message: "Failed to remove room from IBC application" });
    }
  });

  // Get backbone source room assignments for IBC application
  app.get('/api/ibc-applications/:id/backbone-source-rooms', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const assignments = await storage.getIbcBackboneSourceRooms(id);
      res.json(assignments);
    } catch (error) {
      console.error('Error getting IBC backbone source rooms:', error);
      res.status(500).json({ message: "Failed to fetch IBC backbone source rooms" });
    }
  });

  // Add backbone source room assignment
  app.post('/api/ibc-applications/:id/backbone-source-rooms', async (req: Request, res: Response) => {
    try {
      const applicationId = parseInt(req.params.id);
      const validatedData = insertIbcBackboneSourceRoomSchema.parse({
        ...req.body,
        applicationId
      });
      const newAssignment = await storage.addBackboneSourceRoom(validatedData);
      res.status(201).json(newAssignment);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).toString() });
      } else {
        console.error('Error adding backbone source room:', error);
        res.status(500).json({ message: "Failed to add backbone source room assignment" });
      }
    }
  });

  // Remove backbone source room assignment
  app.delete('/api/ibc-applications/:id/backbone-source-rooms/:backboneSource/:roomId', async (req: Request, res: Response) => {
    try {
      const applicationId = parseInt(req.params.id);
      const backboneSource = req.params.backboneSource;
      const roomId = parseInt(req.params.roomId);
      const success = await storage.removeBackboneSourceRoom(applicationId, backboneSource, roomId);
      if (success) {
        res.json({ message: "Backbone source room assignment removed successfully" });
      } else {
        res.status(404).json({ message: "Backbone source room assignment not found" });
      }
    } catch (error) {
      console.error('Error removing backbone source room assignment:', error);
      res.status(500).json({ message: "Failed to remove backbone source room assignment" });
    }
  });

  // Get PPE for IBC application
  app.get('/api/ibc-applications/:id/ppe', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const roomId = req.query.roomId ? parseInt(req.query.roomId as string) : undefined;
      
      let ppe;
      if (roomId) {
        ppe = await storage.getIbcApplicationPpeForRoom(id, roomId);
      } else {
        ppe = await storage.getIbcApplicationPpe(id);
      }
      res.json(ppe);
    } catch (error) {
      console.error('Error getting IBC application PPE:', error);
      res.status(500).json({ message: "Failed to fetch IBC application PPE" });
    }
  });

  // Add PPE to IBC application
  app.post('/api/ibc-applications/:id/ppe', async (req: Request, res: Response) => {
    try {
      const applicationId = parseInt(req.params.id);
      const validatedData = insertIbcApplicationPpeSchema.parse({
        ...req.body,
        applicationId
      });
      const newPpe = await storage.addPpeToIbcApplication(validatedData);
      res.status(201).json(newPpe);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).toString() });
      } else {
        console.error('Error adding PPE to IBC application:', error);
        res.status(500).json({ message: "Failed to add PPE to IBC application" });
      }
    }
  });

  // Remove PPE from IBC application
  app.delete('/api/ibc-applications/:id/ppe/:roomId/:ppeItem', async (req: Request, res: Response) => {
    try {
      const applicationId = parseInt(req.params.id);
      const roomId = parseInt(req.params.roomId);
      const ppeItem = decodeURIComponent(req.params.ppeItem);
      const success = await storage.removePpeFromIbcApplication(applicationId, roomId, ppeItem);
      if (success) {
        res.json({ message: "PPE removed from IBC application successfully" });
      } else {
        res.status(404).json({ message: "PPE not found in IBC application" });
      }
    } catch (error) {
      console.error('Error removing PPE from IBC application:', error);
      res.status(500).json({ message: "Failed to remove PPE from IBC application" });
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

  // Buildings API routes
  app.get('/api/buildings', async (req: Request, res: Response) => {
    try {
      const buildings = await storage.getBuildings();
      res.json(buildings);
    } catch (error) {
      console.error('Error fetching buildings:', error);
      res.status(500).json({ message: "Failed to fetch buildings" });
    }
  });

  app.get('/api/buildings/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid building ID" });
      }

      const building = await storage.getBuilding(id);
      if (!building) {
        return res.status(404).json({ message: "Building not found" });
      }

      res.json(building);
    } catch (error) {
      console.error('Error fetching building:', error);
      res.status(500).json({ message: "Failed to fetch building" });
    }
  });

  app.post('/api/buildings', async (req: Request, res: Response) => {
    try {
      const parsedData = insertBuildingSchema.parse(req.body);
      const building = await storage.createBuilding(parsedData);
      res.status(201).json(building);
    } catch (error) {
      console.error('Error creating building:', error);
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Failed to create building" });
    }
  });

  app.patch('/api/buildings/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid building ID" });
      }

      const parsedData = insertBuildingSchema.partial().parse(req.body);
      const building = await storage.updateBuilding(id, parsedData);
      if (!building) {
        return res.status(404).json({ message: "Building not found" });
      }

      res.json(building);
    } catch (error) {
      console.error('Error updating building:', error);
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Failed to update building" });
    }
  });

  app.delete('/api/buildings/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid building ID" });
      }

      const success = await storage.deleteBuilding(id);
      if (!success) {
        return res.status(404).json({ message: "Building not found" });
      }

      res.json({ message: "Building deleted successfully" });
    } catch (error) {
      console.error('Error deleting building:', error);
      res.status(500).json({ message: "Failed to delete building" });
    }
  });

  // Rooms API routes
  app.get('/api/rooms', async (req: Request, res: Response) => {
    try {
      const buildingId = req.query.buildingId ? parseInt(req.query.buildingId as string) : undefined;
      
      if (buildingId) {
        const rooms = await storage.getRoomsByBuilding(buildingId);
        res.json(rooms);
      } else {
        const rooms = await storage.getRooms();
        res.json(rooms);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  app.get('/api/rooms/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid room ID" });
      }

      const room = await storage.getRoom(id);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      res.json(room);
    } catch (error) {
      console.error('Error fetching room:', error);
      res.status(500).json({ message: "Failed to fetch room" });
    }
  });

  app.post('/api/rooms', async (req: Request, res: Response) => {
    try {
      const parsedData = insertRoomSchema.parse(req.body);
      
      // Validate supervisor and manager roles if provided
      if (parsedData.roomSupervisorId) {
        const supervisor = await storage.getScientist(parsedData.roomSupervisorId);
        if (!supervisor || !supervisor.title || !supervisor.title.toLowerCase().includes('investigator')) {
          return res.status(400).json({ 
            message: "Room supervisor must be a scientist with 'Investigator' in their title" 
          });
        }
      }
      
      if (parsedData.roomManagerId) {
        const manager = await storage.getScientist(parsedData.roomManagerId);
        if (!manager || !manager.title || 
            !(manager.title.toLowerCase().includes('staff') || 
              manager.title.toLowerCase().includes('management') ||
              manager.title.toLowerCase().includes('post-doctoral') ||
              manager.title.toLowerCase().includes('research'))) {
          return res.status(400).json({ 
            message: "Room manager must be a scientist with Management, Staff, Post-doctoral, or Research role" 
          });
        }
      }

      const room = await storage.createRoom(parsedData);
      res.status(201).json(room);
    } catch (error) {
      console.error('Error creating room:', error);
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  app.patch('/api/rooms/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid room ID" });
      }

      const parsedData = insertRoomSchema.partial().parse(req.body);
      
      // Validate supervisor and manager roles if being updated
      if (parsedData.roomSupervisorId) {
        const supervisor = await storage.getScientist(parsedData.roomSupervisorId);
        if (!supervisor || !supervisor.title || !supervisor.title.toLowerCase().includes('investigator')) {
          return res.status(400).json({ 
            message: "Room supervisor must be a scientist with 'Investigator' in their title" 
          });
        }
      }
      
      if (parsedData.roomManagerId) {
        const manager = await storage.getScientist(parsedData.roomManagerId);
        if (!manager || !manager.title || 
            !(manager.title.toLowerCase().includes('staff') || 
              manager.title.toLowerCase().includes('management') ||
              manager.title.toLowerCase().includes('post-doctoral') ||
              manager.title.toLowerCase().includes('research'))) {
          return res.status(400).json({ 
            message: "Room manager must be a scientist with Management, Staff, Post-doctoral, or Research role" 
          });
        }
      }

      const room = await storage.updateRoom(id, parsedData);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      res.json(room);
    } catch (error) {
      console.error('Error updating room:', error);
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Failed to update room" });
    }
  });

  app.delete('/api/rooms/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid room ID" });
      }

      const success = await storage.deleteRoom(id);
      if (!success) {
        return res.status(404).json({ message: "Room not found" });
      }

      res.json({ message: "Room deleted successfully" });
    } catch (error) {
      console.error('Error deleting room:', error);
      res.status(500).json({ message: "Failed to delete room" });
    }
  });

  // Additional utility routes for facilities
  app.get('/api/buildings/:id/rooms', async (req: Request, res: Response) => {
    try {
      const buildingId = parseInt(req.params.id);
      if (isNaN(buildingId)) {
        return res.status(400).json({ message: "Invalid building ID" });
      }

      const rooms = await storage.getRoomsByBuilding(buildingId);
      res.json(rooms);
    } catch (error) {
      console.error('Error fetching building rooms:', error);
      res.status(500).json({ message: "Failed to fetch building rooms" });
    }
  });

  // Role Permissions Routes
  app.get('/api/role-permissions', async (req: Request, res: Response) => {
    try {
      const permissions = await storage.getRolePermissions();
      res.json(permissions);
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      res.status(500).json({ message: "Failed to fetch role permissions" });
    }
  });

  app.post('/api/role-permissions', async (req: Request, res: Response) => {
    try {
      const validateData = insertRolePermissionSchema.parse(req.body);
      const permission = await storage.createRolePermission(validateData);
      res.status(201).json(permission);
    } catch (error) {
      console.error('Error creating role permission:', error);
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Failed to create role permission" });
    }
  });

  app.patch('/api/role-permissions/:jobTitle/:navigationItem', async (req: Request, res: Response) => {
    try {
      const { jobTitle, navigationItem } = req.params;
      const { accessLevel } = req.body;
      
      if (!accessLevel || !["hide", "view", "edit"].includes(accessLevel)) {
        return res.status(400).json({ message: "Invalid access level" });
      }

      const permission = await storage.updateRolePermission(jobTitle, navigationItem, accessLevel);
      if (!permission) {
        return res.status(404).json({ message: "Role permission not found" });
      }
      
      res.json(permission);
    } catch (error) {
      console.error('Error updating role permission:', error);
      res.status(500).json({ message: "Failed to update role permission" });
    }
  });

  app.post('/api/role-permissions/bulk', async (req: Request, res: Response) => {
    try {
      const { permissions } = req.body;
      if (!Array.isArray(permissions)) {
        return res.status(400).json({ message: "Permissions must be an array" });
      }

      const results = await storage.updateRolePermissionsBulk(permissions);
      res.json(results);
    } catch (error) {
      console.error('Error bulk updating role permissions:', error);
      res.status(500).json({ message: "Failed to bulk update role permissions" });
    }
  });

  // Journal Impact Factors Routes
  app.get('/api/journal-impact-factors', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const sortField = req.query.sortField as string || 'rank';
      const sortDirection = (req.query.sortDirection as 'asc' | 'desc') || 'asc';
      const searchTerm = req.query.searchTerm as string || '';
      const yearFilter = req.query.yearFilter as string || '';

      const result = await storage.getJournalImpactFactors({
        limit,
        offset,
        sortField,
        sortDirection,
        searchTerm,
        yearFilter
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching journal impact factors:', error);
      res.status(500).json({ message: "Failed to fetch journal impact factors" });
    }
  });

  app.get('/api/journal-impact-factors/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid impact factor ID" });
      }

      const factor = await storage.getJournalImpactFactor(id);
      if (!factor) {
        return res.status(404).json({ message: "Impact factor not found" });
      }

      res.json(factor);
    } catch (error) {
      console.error('Error fetching journal impact factor:', error);
      res.status(500).json({ message: "Failed to fetch journal impact factor" });
    }
  });

  app.get('/api/journal-impact-factors/journal/:journalName/year/:year', async (req: Request, res: Response) => {
    try {
      const { journalName, year } = req.params;
      const yearNum = parseInt(year);
      
      if (isNaN(yearNum)) {
        return res.status(400).json({ message: "Invalid year" });
      }

      const factor = await storage.getImpactFactorByJournalAndYear(journalName, yearNum);
      if (!factor) {
        return res.status(404).json({ message: "Impact factor not found for this journal and year" });
      }

      res.json(factor);
    } catch (error) {
      console.error('Error fetching journal impact factor:', error);
      res.status(500).json({ message: "Failed to fetch journal impact factor" });
    }
  });

  app.get('/api/journal-impact-factors/historical/:journalName', async (req: Request, res: Response) => {
    try {
      const { journalName } = req.params;
      const decodedJournalName = decodeURIComponent(journalName);
      
      const historicalData = await storage.getHistoricalImpactFactors(decodedJournalName);
      res.json(historicalData);
    } catch (error) {
      console.error('Error fetching historical impact factors:', error);
      res.status(500).json({ message: "Failed to fetch historical impact factors" });
    }
  });

  app.post('/api/journal-impact-factors', async (req: Request, res: Response) => {
    try {
      const { insertJournalImpactFactorSchema } = await import("@shared/schema");
      const parsedData = insertJournalImpactFactorSchema.parse(req.body);
      
      const factor = await storage.createJournalImpactFactor(parsedData);
      res.status(201).json(factor);
    } catch (error: any) {
      console.error('Error creating journal impact factor:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to create journal impact factor" });
    }
  });

  app.post('/api/journal-impact-factors/import-csv', async (req: Request, res: Response) => {
    try {
      const { csvData } = req.body;
      if (!csvData || !Array.isArray(csvData)) {
        return res.status(400).json({ message: "CSV data must be an array" });
      }

      const results = [];
      for (const row of csvData) {
        try {
          const impactFactor = {
            journalName: row.journalName,
            abbreviatedJournal: row.abbreviatedJournal || null,
            year: row.year,
            publisher: row.publisher || null,
            issn: row.issn || null,
            eissn: row.eissn || null,
            totalCites: row.totalCites || null,
            totalArticles: row.totalArticles || null,
            citableItems: row.citableItems || null,
            citedHalfLife: row.citedHalfLife || null,
            citingHalfLife: row.citingHalfLife || null,
            impactFactor: row.impactFactor,
            fiveYearJif: row.fiveYearJif || null,
            jifWithoutSelfCites: row.jifWithoutSelfCites || null,
            jci: row.jci || null,
            quartile: row.quartile,
            rank: row.rank,
            totalCitations: row.totalCitations || null // Keep for backward compatibility
          };
          
          const created = await storage.createJournalImpactFactor(impactFactor);
          results.push(created);
        } catch (error) {
          console.error('Error importing row:', row, error);
        }
      }

      res.json({ imported: results.length, total: csvData.length });
    } catch (error) {
      console.error('Error importing CSV data:', error);
      res.status(500).json({ message: "Failed to import CSV data" });
    }
  });

  app.patch('/api/journal-impact-factors/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid impact factor ID" });
      }

      const { insertJournalImpactFactorSchema } = await import("@shared/schema");
      const parsedData = insertJournalImpactFactorSchema.partial().parse(req.body);
      
      const factor = await storage.updateJournalImpactFactor(id, parsedData);
      if (!factor) {
        return res.status(404).json({ message: "Impact factor not found" });
      }

      res.json(factor);
    } catch (error: any) {
      console.error('Error updating journal impact factor:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to update journal impact factor" });
    }
  });

  // Publication Import Routes
  app.get('/api/publications/import/pmid/:pmid', async (req: Request, res: Response) => {
    try {
      const pmid = req.params.pmid;
      
      // Fetch from PubMed E-utilities API
      const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`;
      const summaryResponse = await fetch(summaryUrl);
      
      if (!summaryResponse.ok) {
        return res.status(404).json({ message: "PMID not found" });
      }
      
      const summaryData = await summaryResponse.json();
      const pubmedData = summaryData.result?.[pmid];
      
      if (!pubmedData) {
        return res.status(404).json({ message: "Publication not found for this PMID" });
      }
      
      // Parse PubMed data
      const authors = pubmedData.authors?.map((author: any) => 
        author.name
      ).join(', ') || '';
      
      const publication = {
        title: pubmedData.title || '',
        authors: authors,
        journal: pubmedData.fulljournalname || pubmedData.source || '',
        year: pubmedData.pubdate ? new Date(pubmedData.pubdate).getFullYear() : null,
        volume: pubmedData.volume || '',
        issue: pubmedData.issue || '',
        pages: pubmedData.pages || '',
        doi: pubmedData.elocationid?.replace('doi: ', '') || pubmedData.articleids?.find((id: any) => id.idtype === 'doi')?.value || '',
        pmid: pmid,
        abstract: pubmedData.abstract || '',
        publicationDate: pubmedData.pubdate ? new Date(pubmedData.pubdate).toISOString().split('T')[0] : ''
      };
      
      res.json(publication);
    } catch (error) {
      console.error('Error fetching PubMed data:', error);
      res.status(500).json({ message: "Failed to fetch publication data from PubMed" });
    }
  });

  app.get('/api/publications/import/doi/:doi', async (req: Request, res: Response) => {
    try {
      const doi = decodeURIComponent(req.params.doi);
      
      // Fetch from CrossRef API
      const crossrefUrl = `https://api.crossref.org/works/${doi}`;
      const crossrefResponse = await fetch(crossrefUrl);
      
      if (!crossrefResponse.ok) {
        return res.status(404).json({ message: "DOI not found" });
      }
      
      const crossrefData = await crossrefResponse.json();
      const work = crossrefData.message;
      
      if (!work) {
        return res.status(404).json({ message: "Publication not found for this DOI" });
      }
      
      // Parse CrossRef data
      const authors = work.author?.map((author: any) => 
        `${author.given || ''} ${author.family || ''}`.trim()
      ).join(', ') || '';
      
      const publication = {
        title: work.title?.[0] || '',
        authors: authors,
        journal: work['container-title']?.[0] || '',
        year: work.published?.['date-parts']?.[0]?.[0] || work.created?.['date-parts']?.[0]?.[0] || null,
        volume: work.volume || '',
        issue: work.issue || '',
        pages: work.page || '',
        doi: work.DOI || doi,
        pmid: '', // CrossRef doesn't provide PMID
        abstract: work.abstract || '',
        publicationDate: work.published?.['date-parts']?.[0] ? 
          new Date(work.published['date-parts'][0][0], (work.published['date-parts'][0][1] || 1) - 1, work.published['date-parts'][0][2] || 1).toISOString().split('T')[0] : ''
      };
      
      res.json(publication);
    } catch (error) {
      console.error('Error fetching CrossRef data:', error);
      res.status(500).json({ message: "Failed to fetch publication data from CrossRef" });
    }
  });

  app.delete('/api/journal-impact-factors/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid impact factor ID" });
      }

      const success = await storage.deleteJournalImpactFactor(id);
      if (!success) {
        return res.status(404).json({ message: "Impact factor not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting journal impact factor:', error);
      res.status(500).json({ message: "Failed to delete journal impact factor" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

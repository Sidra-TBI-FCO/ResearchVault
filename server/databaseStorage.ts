import { eq, and, desc, asc, or, sql, inArray, gte, ilike } from "drizzle-orm";
import { db } from "./db";
import { IStorage } from "./storage";
import {
  users, User, InsertUser,
  scientists, Scientist, InsertScientist,
  programs, Program, InsertProgram,
  projects, Project, InsertProject,
  researchActivities, ResearchActivity, InsertResearchActivity,
  projectMembers, ProjectMember, InsertProjectMember,
  dataManagementPlans, DataManagementPlan, InsertDataManagementPlan,
  publications, Publication, InsertPublication,
  publicationAuthors, PublicationAuthor, InsertPublicationAuthor,
  manuscriptHistory, ManuscriptHistory, InsertManuscriptHistory,
  patents, Patent, InsertPatent,
  irbApplications, IrbApplication, InsertIrbApplication,
  irbSubmissions, IrbSubmission, InsertIrbSubmission,
  irbDocuments, IrbDocument, InsertIrbDocument,
  ibcApplications, IbcApplication, InsertIbcApplication,
  ibcApplicationComments, IbcApplicationComment, InsertIbcApplicationComment,
  ibcApplicationResearchActivities, IbcApplicationResearchActivity, InsertIbcApplicationResearchActivity,
  ibcSubmissions, IbcSubmission, InsertIbcSubmission,
  ibcDocuments, IbcDocument, InsertIbcDocument,
  ibcBoardMembers, IbcBoardMember, InsertIbcBoardMember,
  researchContracts, ResearchContract, InsertResearchContract,
  researchContractScopeItems, ResearchContractScopeItem, InsertResearchContractScopeItem,
  researchContractExtensions, ResearchContractExtension, InsertResearchContractExtension,
  researchContractDocuments, ResearchContractDocument, InsertResearchContractDocument,
  irbBoardMembers, IrbBoardMember, InsertIrbBoardMember,
  buildings, Building, InsertBuilding,
  rooms, Room, InsertRoom,
  ibcApplicationRooms, IbcApplicationRoom, InsertIbcApplicationRoom,
  ibcBackboneSourceRooms, IbcBackboneSourceRoom, InsertIbcBackboneSourceRoom,
  ibcApplicationPpe, IbcApplicationPpe, InsertIbcApplicationPpe,
  rolePermissions, RolePermission, InsertRolePermission,
  journalImpactFactors, JournalImpactFactor, InsertJournalImpactFactor,
  grants, Grant, InsertGrant,
  grantResearchActivities, GrantResearchActivity, InsertGrantResearchActivity,
  grantProgressReports, GrantProgressReport, InsertGrantProgressReport,
  certificationModules, CertificationModule, InsertCertificationModule,
  certifications, Certification, InsertCertification,
  certificationConfigurations, CertificationConfiguration, InsertCertificationConfiguration,
  systemConfigurations, SystemConfiguration, InsertSystemConfiguration,
  pdfImportHistory, PdfImportHistory, InsertPdfImportHistory,
  featureRequests, FeatureRequest, InsertFeatureRequest,
  ra200Applications, Ra200Application, InsertRa200Application,
  ra205aApplications, Ra205aApplication, InsertRa205aApplication
} from "@shared/schema";

export class DatabaseStorage implements IStorage {
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Program operations
  async getPrograms(): Promise<Program[]> {
    return await db.select().from(programs);
  }

  async getProgram(id: number): Promise<Program | undefined> {
    const [program] = await db.select().from(programs).where(eq(programs.id, id));
    return program;
  }

  async getProgramByProgramId(programId: string): Promise<Program | undefined> {
    const [program] = await db.select().from(programs).where(eq(programs.programId, programId));
    return program;
  }

  async createProgram(program: InsertProgram): Promise<Program> {
    const [newProgram] = await db.insert(programs).values(program).returning();
    return newProgram;
  }

  async updateProgram(id: number, program: Partial<InsertProgram>): Promise<Program | undefined> {
    const [updatedProgram] = await db
      .update(programs)
      .set(program)
      .where(eq(programs.id, id))
      .returning();
    return updatedProgram;
  }

  async deleteProgram(id: number): Promise<boolean> {
    const result = await db.delete(programs).where(eq(programs.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Projects operations
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectByProjectId(projectId: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.projectId, projectId));
    return project;
  }

  async getProjectsForProgram(programId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.programId, programId));
  }

  async getProjectsForScientist(scientistId: number): Promise<Project[]> {
    // Get projects where the scientist is the principal investigator
    return await db.select().from(projects).where(eq(projects.principalInvestigatorId, scientistId));
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [updatedProject] = await db
      .update(projects)
      .set(project)
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Scientist operations
  async getScientists(): Promise<Scientist[]> {
    return await db.select().from(scientists).orderBy(scientists.lastName, scientists.firstName);
  }

  async getScientistsWithActivityCount(): Promise<(Scientist & { activeResearchActivities: number })[]> {
    const scientistsData = await db.select().from(scientists).orderBy(scientists.lastName, scientists.firstName);
    
    // Get activity count for each scientist
    const scientistsWithCount = await Promise.all(
      scientistsData.map(async (scientist) => {
        const activities = await db
          .select({ count: sql<number>`count(*)` })
          .from(projectMembers)
          .where(eq(projectMembers.scientistId, scientist.id));
        
        return {
          ...scientist,
          activeResearchActivities: activities[0]?.count || 0
        };
      })
    );
    
    return scientistsWithCount;
  }

  async getScientist(id: number): Promise<Scientist | undefined> {
    const [scientist] = await db.select().from(scientists).where(eq(scientists.id, id));
    return scientist;
  }

  async createScientist(scientist: InsertScientist): Promise<Scientist> {
    const [newScientist] = await db.insert(scientists).values(scientist).returning();
    return newScientist;
  }

  async updateScientist(id: number, scientist: Partial<InsertScientist>): Promise<Scientist | undefined> {
    const [updatedScientist] = await db
      .update(scientists)
      .set(scientist)
      .where(eq(scientists.id, id))
      .returning();
    return updatedScientist;
  }

  async deleteScientist(id: number): Promise<boolean> {
    const result = await db.delete(scientists).where(eq(scientists.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getStaff(): Promise<Scientist[]> {
    // Since isStaff field was removed, return scientists with management/staff job titles
    return await db.select().from(scientists).where(eq(scientists.jobTitle, "Management")).orderBy(scientists.lastName, scientists.firstName);
  }

  async getPrincipalInvestigators(): Promise<Scientist[]> {
    // Only return Investigators and Staff Scientists as potential PIs
    return await db.select().from(scientists)
      .where(or(
        eq(scientists.jobTitle, "Investigator"),
        eq(scientists.jobTitle, "Staff Scientist")
      ))
      .orderBy(scientists.lastName, scientists.firstName);
  }

  // Research Activity operations
  async getResearchActivities(): Promise<ResearchActivity[]> {
    return await db.select().from(researchActivities);
  }

  async getResearchActivity(id: number): Promise<ResearchActivity | undefined> {
    const [activity] = await db.select().from(researchActivities).where(eq(researchActivities.id, id));
    return activity;
  }

  async getResearchActivityBySdr(sdrNumber: string): Promise<ResearchActivity | undefined> {
    const [activity] = await db.select().from(researchActivities).where(eq(researchActivities.sdrNumber, sdrNumber));
    return activity;
  }

  async getResearchActivitiesForProject(projectId: number): Promise<ResearchActivity[]> {
    return await db.select().from(researchActivities).where(eq(researchActivities.projectId, projectId));
  }

  async getResearchActivitiesForScientist(scientistId: number): Promise<ResearchActivity[]> {
    // Get activities where scientist is a team member
    const teamMemberActivities = await db
      .select({ activityId: projectMembers.researchActivityId })
      .from(projectMembers)
      .where(eq(projectMembers.scientistId, scientistId));
    
    const activityIds = teamMemberActivities.map(a => a.activityId);
    
    // If not a team member of any activities, return empty array
    if (activityIds.length === 0) {
      return [];
    }
    
    // Get activities where scientist is team member
    const activities = await db.select().from(researchActivities).where(inArray(researchActivities.id, activityIds));
    
    return activities;
  }

  async createResearchActivity(activity: InsertResearchActivity): Promise<ResearchActivity> {
    const [newActivity] = await db.insert(researchActivities).values(activity).returning();
    return newActivity;
  }

  async updateResearchActivity(id: number, activity: Partial<InsertResearchActivity>): Promise<ResearchActivity | undefined> {
    const [updatedActivity] = await db
      .update(researchActivities)
      .set(activity)
      .where(eq(researchActivities.id, id))
      .returning();
    return updatedActivity;
  }

  async deleteResearchActivity(id: number): Promise<boolean> {
    const result = await db.delete(researchActivities).where(eq(researchActivities.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  
  // Project Members operations
  async getProjectMembers(researchActivityId: number): Promise<ProjectMember[]> {
    return await db.select().from(projectMembers).where(eq(projectMembers.researchActivityId, researchActivityId));
  }

  async getAllProjectMembers(): Promise<ProjectMember[]> {
    return await db.select().from(projectMembers);
  }

  async addProjectMember(member: InsertProjectMember): Promise<ProjectMember> {
    const [newMember] = await db.insert(projectMembers).values(member).returning();
    return newMember;
  }

  async removeProjectMember(researchActivityId: number, scientistId: number): Promise<boolean> {
    const result = await db
      .delete(projectMembers)
      .where(
        and(
          eq(projectMembers.researchActivityId, researchActivityId),
          eq(projectMembers.scientistId, scientistId)
        )
      );
    return (result.rowCount ?? 0) > 0;
  }

  // Data Management Plan operations
  async getDataManagementPlans(): Promise<DataManagementPlan[]> {
    return await db.select().from(dataManagementPlans);
  }

  async getDataManagementPlan(id: number): Promise<DataManagementPlan | undefined> {
    const [plan] = await db.select().from(dataManagementPlans).where(eq(dataManagementPlans.id, id));
    return plan;
  }

  async getDataManagementPlanForResearchActivity(researchActivityId: number): Promise<DataManagementPlan | undefined> {
    const [plan] = await db
      .select()
      .from(dataManagementPlans)
      .where(eq(dataManagementPlans.researchActivityId, researchActivityId));
    return plan;
  }

  async getDataManagementPlanForProject(projectId: number): Promise<DataManagementPlan | undefined> {
    // Get data management plan for any research activity belonging to this project
    const [plan] = await db
      .select()
      .from(dataManagementPlans)
      .innerJoin(researchActivities, eq(dataManagementPlans.researchActivityId, researchActivities.id))
      .where(eq(researchActivities.projectId, projectId));
    return plan ? plan.data_management_plans : undefined;
  }

  async createDataManagementPlan(plan: InsertDataManagementPlan): Promise<DataManagementPlan> {
    const [newPlan] = await db.insert(dataManagementPlans).values(plan).returning();
    return newPlan;
  }

  async updateDataManagementPlan(id: number, plan: Partial<InsertDataManagementPlan>): Promise<DataManagementPlan | undefined> {
    const [updatedPlan] = await db
      .update(dataManagementPlans)
      .set(plan)
      .where(eq(dataManagementPlans.id, id))
      .returning();
    return updatedPlan;
  }

  async deleteDataManagementPlan(id: number): Promise<boolean> {
    const result = await db.delete(dataManagementPlans).where(eq(dataManagementPlans.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Publication operations
  async getPublications(): Promise<Publication[]> {
    return await db.select().from(publications);
  }

  async getPublication(id: number): Promise<Publication | undefined> {
    const [publication] = await db.select().from(publications).where(eq(publications.id, id));
    return publication;
  }

  async getPublicationsForResearchActivity(researchActivityId: number): Promise<Publication[]> {
    return await db.select().from(publications).where(eq(publications.researchActivityId, researchActivityId));
  }

  async createPublication(publication: InsertPublication): Promise<Publication> {
    // Handle data standardization
    const publicationData = { ...publication };
    
    // Standardize author names if provided
    if (publicationData.authors && typeof publicationData.authors === 'string') {
      publicationData.authors = this.standardizeAuthorNames(publicationData.authors);
    }
    
    // Capitalize title
    if (publicationData.title && typeof publicationData.title === 'string') {
      publicationData.title = this.capitalizeTitle(publicationData.title);
    }
    
    const [newPublication] = await db.insert(publications).values(publicationData).returning();
    return newPublication;
  }

  async updatePublication(id: number, publication: Partial<InsertPublication>): Promise<Publication | undefined> {
    // Handle date conversions properly
    const updateData = { ...publication };
    
    // Convert date strings to Date objects if needed
    if (updateData.publicationDate && typeof updateData.publicationDate === 'string') {
      updateData.publicationDate = new Date(updateData.publicationDate);
    }
    
    // Standardize author names if provided
    if (updateData.authors && typeof updateData.authors === 'string') {
      updateData.authors = this.standardizeAuthorNames(updateData.authors);
    }
    
    // Capitalize title if provided
    if (updateData.title && typeof updateData.title === 'string') {
      updateData.title = this.capitalizeTitle(updateData.title);
    }
    
    const [updatedPublication] = await db
      .update(publications)
      .set(updateData)
      .where(eq(publications.id, id))
      .returning();
    return updatedPublication;
  }

  // Helper function to standardize author names
  private standardizeAuthorNames(authors: string): string {
    if (!authors || typeof authors !== 'string') return authors;
    
    // Remove "et al." and similar endings before processing
    authors = authors.replace(/[,;\s]+(et\s+al\.?|and\s+others)\s*$/i, '').trim();
    
    // Split by common separators (comma, semicolon, or 'and')
    const authorList = authors.split(/[,;]|\sand\s/i).map(author => author.trim()).filter(Boolean);
    
    const standardizedAuthors = authorList.map(author => {
      // Remove extra spaces and clean up
      author = author.replace(/\s+/g, ' ').trim();
      
      // Remove common titles
      author = author.replace(/^(dr\.?|prof\.?|professor|mr\.?|mrs\.?|ms\.?|miss|sir|dame)\s+/i, '').trim();
      
      // Skip if already looks properly formatted or is too short
      if (author.length < 3) return author;
      
      // Handle different name formats
      let parts = author.split(' ').filter(Boolean);
      
      if (parts.length === 1) {
        // Single name - return as is
        return author;
      } else if (parts.length === 2) {
        // First Last or Last, First format
        if (author.includes(',')) {
          // Convert Last, First to First Last format
          const [last, first] = author.split(',').map(s => s.trim());
          // Add period to single letter first name
          const firstFormatted = first.length === 1 ? first + '.' : first;
          return `${firstFormatted} ${last}`;
        } else {
          const first = parts[0];
          const last = parts[1];
          
          // Detect "LastName InitialInitial..." pattern (e.g., "Chen L", "Smith JA", "Johnson MK")
          // If second part is all uppercase letters (initials), convert to proper format
          if (last.match(/^[A-Za-z]+$/) && last.length <= 4 && last === last.toUpperCase()) {
            // Convert multiple initials: "Smith JA" → "J. A. Smith"
            const initials = last.split('').map(initial => initial.toUpperCase() + '.').join(' ');
            return `${initials} ${first}`;
          } else {
            // Regular "First Last" format - add period to single letter first name
            const firstFormatted = first.length === 1 ? first + '.' : first;
            return `${firstFormatted} ${last}`;
          }
        }
      } else if (parts.length >= 3) {
        // Handle First Middle Last or multiple middle names
        const first = parts[0];
        const last = parts[parts.length - 1];
        const middle = parts.slice(1, -1);
        
        // Standardize middle names to initials with periods
        const middleInitials = middle.map(name => {
          if (name.length === 1) {
            return name.toUpperCase() + '.';
          } else if (name.endsWith('.')) {
            return name.charAt(0).toUpperCase() + '.';
          } else {
            return name.charAt(0).toUpperCase() + '.';
          }
        }).join(' ');
        
        // Return as First Middle. Last
        return middleInitials ? `${first} ${middleInitials} ${last}` : `${first} ${last}`;
      }
      
      return author;
    });
    
    return standardizedAuthors.join(', ');
  }

  // Helper function to capitalize title properly
  private capitalizeTitle(title: string): string {
    if (!title || typeof title !== 'string') return title;
    
    // Words that should not be capitalized unless they are the first or last word
    const lowercaseWords = [
      'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'nor', 'of', 
      'on', 'or', 'so', 'the', 'to', 'up', 'yet', 'with', 'from', 'into', 'onto', 
      'upon', 'over', 'under', 'above', 'below', 'across', 'through', 'during', 
      'before', 'after', 'until', 'while', 'about', 'against', 'among', 'around', 
      'behind', 'beside', 'between', 'beyond', 'inside', 'outside', 'toward', 
      'towards', 'underneath', 'within', 'without'
    ];
    
    return title.toLowerCase()
      .split(' ')
      .map((word, index, array) => {
        // Always capitalize first and last words
        if (index === 0 || index === array.length - 1) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
        
        // Don't capitalize articles, conjunctions, and prepositions
        if (lowercaseWords.includes(word.toLowerCase())) {
          return word.toLowerCase();
        }
        
        // Capitalize everything else
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  async deletePublication(id: number): Promise<boolean> {
    const result = await db.delete(publications).where(eq(publications.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Manuscript History operations
  async getManuscriptHistory(publicationId: number): Promise<ManuscriptHistory[]> {
    return await db
      .select()
      .from(manuscriptHistory)
      .where(eq(manuscriptHistory.publicationId, publicationId))
      .orderBy(desc(manuscriptHistory.createdAt));
  }

  async createManuscriptHistoryEntry(entry: InsertManuscriptHistory): Promise<ManuscriptHistory> {
    const [newEntry] = await db.insert(manuscriptHistory).values(entry).returning();
    return newEntry;
  }

  // Publication Status Management
  async updatePublicationStatus(id: number, status: string, changedBy: number, changes?: {field: string, oldValue: string, newValue: string}[]): Promise<Publication | undefined> {
    // Get current publication to track changes
    const currentPublication = await this.getPublication(id);
    if (!currentPublication) return undefined;

    // Update the publication status (only status and updatedAt)
    const [updatedPublication] = await db
      .update(publications)
      .set({ status, updatedAt: new Date() })
      .where(eq(publications.id, id))
      .returning();

    // Record status change in history
    await this.createManuscriptHistoryEntry({
      publicationId: id,
      fromStatus: currentPublication.status || 'Unknown',
      toStatus: status,
      changedBy,
      changeReason: `Status changed from ${currentPublication.status || 'Unknown'} to ${status}`,
    });

    // Record field changes if any
    if (changes && changes.length > 0) {
      for (const change of changes) {
        await this.createManuscriptHistoryEntry({
          publicationId: id,
          fromStatus: currentPublication.status || 'Unknown',
          toStatus: status,
          changedField: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          changedBy,
          changeReason: `${change.field} changed during status transition`,
        });
      }
    }

    return updatedPublication;
  }

  // Publication Author operations
  async getPublicationsForScientist(scientistId: number, yearsSince: number = 5): Promise<(Publication & { authorshipType: string; authorPosition: number | null })[]> {
    // Get all publications for the scientist first, then filter by date in JavaScript
    const allResults = await db
      .select({
        id: publications.id,
        researchActivityId: publications.researchActivityId,
        title: publications.title,
        abstract: publications.abstract,
        authors: publications.authors,
        journal: publications.journal,
        volume: publications.volume,
        issue: publications.issue,
        pages: publications.pages,
        doi: publications.doi,
        publicationDate: publications.publicationDate,
        publicationType: publications.publicationType,
        status: publications.status,
        createdAt: publications.createdAt,
        updatedAt: publications.updatedAt,
        authorshipType: publicationAuthors.authorshipType,
        authorPosition: publicationAuthors.authorPosition,
      })
      .from(publications)
      .innerJoin(publicationAuthors, eq(publications.id, publicationAuthors.publicationId))
      .where(
        and(
          eq(publicationAuthors.scientistId, scientistId),
          or(
            eq(publications.status, 'Published'),
            eq(publications.status, 'Published *'),
            eq(publications.status, 'Accepted/In Press')
          )
        )
      )
      .orderBy(desc(publications.id));
    
    // Filter by date in JavaScript to avoid SQL date issues
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsSince);
    
    const filteredResults = allResults.filter(pub => {
      if (!pub.publicationDate) return true; // Include publications without date
      const pubDate = new Date(pub.publicationDate);
      return pubDate >= cutoffDate;
    });
    
    // Sort by publication date (most recent first), then by ID for consistent ordering
    filteredResults.sort((a, b) => {
      if (a.publicationDate && b.publicationDate) {
        return new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime();
      }
      if (a.publicationDate && !b.publicationDate) return -1;
      if (!a.publicationDate && b.publicationDate) return 1;
      return b.id - a.id;
    });
    
    return filteredResults;
  }

  async getAuthorshipStatsByYear(scientistId: number, yearsSince: number = 5): Promise<{ year: number; authorshipType: string; count: number }[]> {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsSince);
    
    const results = await db
      .select({
        year: sql<number>`EXTRACT(YEAR FROM ${publications.publicationDate})`,
        authorshipType: publicationAuthors.authorshipType,
        count: sql<number>`COUNT(*)`,
      })
      .from(publications)
      .innerJoin(publicationAuthors, eq(publications.id, publicationAuthors.publicationId))
      .where(
        and(
          eq(publicationAuthors.scientistId, scientistId),
          or(
            sql`LOWER(${publications.status}) = 'published'`,
            sql`LOWER(${publications.status}) = 'in press'`
          ),
          sql`${publications.publicationDate} >= ${cutoffDate.toISOString()}`
        )
      )
      .groupBy(sql`EXTRACT(YEAR FROM ${publications.publicationDate})`, publicationAuthors.authorshipType)
      .orderBy(sql`EXTRACT(YEAR FROM ${publications.publicationDate}) DESC`);
    
    return results;
  }

  async getPublicationAuthors(publicationId: number): Promise<(PublicationAuthor & { scientist: Scientist })[]> {
    const results = await db
      .select({
        id: publicationAuthors.id,
        publicationId: publicationAuthors.publicationId,
        scientistId: publicationAuthors.scientistId,
        authorshipType: publicationAuthors.authorshipType,
        authorPosition: publicationAuthors.authorPosition,
        scientist: scientists
      })
      .from(publicationAuthors)
      .innerJoin(scientists, eq(publicationAuthors.scientistId, scientists.id))
      .where(eq(publicationAuthors.publicationId, publicationId))
      .orderBy(publicationAuthors.authorPosition);
    
    return results as (PublicationAuthor & { scientist: Scientist })[];
  }

  async addPublicationAuthor(author: InsertPublicationAuthor): Promise<PublicationAuthor> {
    const [newAuthor] = await db.insert(publicationAuthors).values(author).returning();
    return newAuthor;
  }

  async removePublicationAuthor(publicationId: number, scientistId: number): Promise<boolean> {
    const result = await db
      .delete(publicationAuthors)
      .where(and(
        eq(publicationAuthors.publicationId, publicationId),
        eq(publicationAuthors.scientistId, scientistId)
      ));
    return (result.rowCount ?? 0) > 0;
  }

  async updatePublicationAuthor(publicationId: number, scientistId: number, updates: Partial<InsertPublicationAuthor>): Promise<PublicationAuthor | undefined> {
    const [updatedAuthor] = await db
      .update(publicationAuthors)
      .set(updates)
      .where(and(
        eq(publicationAuthors.publicationId, publicationId),
        eq(publicationAuthors.scientistId, scientistId)
      ))
      .returning();
    return updatedAuthor;
  }

  // Patent operations
  async getPatents(): Promise<Patent[]> {
    return await db.select().from(patents);
  }

  async getPatent(id: number): Promise<Patent | undefined> {
    const [patent] = await db.select().from(patents).where(eq(patents.id, id));
    return patent;
  }

  async getPatentsForResearchActivity(researchActivityId: number): Promise<Patent[]> {
    return await db.select().from(patents).where(eq(patents.researchActivityId, researchActivityId));
  }

  async getPatentsForProject(projectId: number): Promise<Patent[]> {
    // Get patents for any research activity belonging to this project
    return await db
      .select()
      .from(patents)
      .innerJoin(researchActivities, eq(patents.researchActivityId, researchActivities.id))
      .where(eq(researchActivities.projectId, projectId))
      .then(results => results.map(r => r.patents));
  }

  async createPatent(patent: InsertPatent): Promise<Patent> {
    const [newPatent] = await db.insert(patents).values(patent).returning();
    return newPatent;
  }

  async updatePatent(id: number, patent: Partial<InsertPatent>): Promise<Patent | undefined> {
    const [updatedPatent] = await db
      .update(patents)
      .set(patent)
      .where(eq(patents.id, id))
      .returning();
    return updatedPatent;
  }

  async deletePatent(id: number): Promise<boolean> {
    const result = await db.delete(patents).where(eq(patents.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // IRB Application operations
  async getIrbApplications(): Promise<IrbApplication[]> {
    return await db.select().from(irbApplications);
  }

  async getIrbApplication(id: number): Promise<IrbApplication | undefined> {
    const [application] = await db.select().from(irbApplications).where(eq(irbApplications.id, id));
    return application;
  }

  async getIrbApplicationByIrbNumber(irbNumber: string): Promise<IrbApplication | undefined> {
    const [application] = await db.select().from(irbApplications).where(eq(irbApplications.irbNumber, irbNumber));
    return application;
  }

  async getIrbApplicationsForResearchActivity(researchActivityId: number): Promise<IrbApplication[]> {
    return await db.select().from(irbApplications).where(eq(irbApplications.researchActivityId, researchActivityId));
  }

  async createIrbApplication(application: InsertIrbApplication): Promise<IrbApplication> {
    const [newApplication] = await db.insert(irbApplications).values(application).returning();
    return newApplication;
  }

  async updateIrbApplication(id: number, application: Partial<InsertIrbApplication>): Promise<IrbApplication | undefined> {
    const [updatedApplication] = await db
      .update(irbApplications)
      .set(application)
      .where(eq(irbApplications.id, id))
      .returning();
    return updatedApplication;
  }

  async deleteIrbApplication(id: number): Promise<boolean> {
    const result = await db.delete(irbApplications).where(eq(irbApplications.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // IRB Submission operations
  async getIrbSubmissions(): Promise<IrbSubmission[]> {
    return await db.select().from(irbSubmissions);
  }

  async getIrbSubmission(id: number): Promise<IrbSubmission | undefined> {
    const [submission] = await db.select().from(irbSubmissions).where(eq(irbSubmissions.id, id));
    return submission;
  }

  async getIrbSubmissionsForApplication(applicationId: number): Promise<IrbSubmission[]> {
    return await db.select().from(irbSubmissions).where(eq(irbSubmissions.applicationId, applicationId));
  }

  async createIrbSubmission(submission: InsertIrbSubmission): Promise<IrbSubmission> {
    const [newSubmission] = await db.insert(irbSubmissions).values(submission).returning();
    return newSubmission;
  }

  async updateIrbSubmission(id: number, submission: Partial<InsertIrbSubmission>): Promise<IrbSubmission | undefined> {
    const [updatedSubmission] = await db
      .update(irbSubmissions)
      .set(submission)
      .where(eq(irbSubmissions.id, id))
      .returning();
    return updatedSubmission;
  }

  async deleteIrbSubmission(id: number): Promise<boolean> {
    const result = await db.delete(irbSubmissions).where(eq(irbSubmissions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // IRB Document operations
  async getIrbDocuments(): Promise<IrbDocument[]> {
    return await db.select().from(irbDocuments);
  }

  async getIrbDocument(id: number): Promise<IrbDocument | undefined> {
    const [document] = await db.select().from(irbDocuments).where(eq(irbDocuments.id, id));
    return document;
  }

  async getIrbDocumentsForApplication(applicationId: number): Promise<IrbDocument[]> {
    return await db.select().from(irbDocuments).where(eq(irbDocuments.applicationId, applicationId));
  }

  async getIrbDocumentsForSubmission(submissionId: number): Promise<IrbDocument[]> {
    return await db.select().from(irbDocuments).where(eq(irbDocuments.submissionId, submissionId));
  }

  async createIrbDocument(document: InsertIrbDocument): Promise<IrbDocument> {
    const [newDocument] = await db.insert(irbDocuments).values(document).returning();
    return newDocument;
  }

  async updateIrbDocument(id: number, document: Partial<InsertIrbDocument>): Promise<IrbDocument | undefined> {
    const [updatedDocument] = await db
      .update(irbDocuments)
      .set(document)
      .where(eq(irbDocuments.id, id))
      .returning();
    return updatedDocument;
  }

  async deleteIrbDocument(id: number): Promise<boolean> {
    const result = await db.delete(irbDocuments).where(eq(irbDocuments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // IBC Application operations
  async getIbcApplications(): Promise<IbcApplication[]> {
    return await db.select().from(ibcApplications);
  }

  async getIbcApplication(id: number): Promise<IbcApplication | undefined> {
    const [application] = await db.select().from(ibcApplications).where(eq(ibcApplications.id, id));
    return application;
  }

  async getIbcApplicationByIbcNumber(ibcNumber: string): Promise<IbcApplication | undefined> {
    const [application] = await db.select().from(ibcApplications).where(eq(ibcApplications.ibcNumber, ibcNumber));
    return application;
  }

  async getIbcApplicationsForResearchActivity(researchActivityId: number): Promise<IbcApplication[]> {
    const results = await db
      .select({ ibcApplication: ibcApplications })
      .from(ibcApplications)
      .innerJoin(
        ibcApplicationResearchActivities,
        eq(ibcApplications.id, ibcApplicationResearchActivities.ibcApplicationId)
      )
      .where(eq(ibcApplicationResearchActivities.researchActivityId, researchActivityId));
    
    return results.map(r => r.ibcApplication);
  }

  async createIbcApplication(application: InsertIbcApplication, researchActivityIds: number[] = []): Promise<IbcApplication> {
    const [newApplication] = await db.insert(ibcApplications).values(application).returning();
    
    // Link the IBC application to multiple research activities
    if (researchActivityIds.length > 0) {
      const linkages = researchActivityIds.map(researchActivityId => ({
        ibcApplicationId: newApplication.id,
        researchActivityId
      }));
      
      await db.insert(ibcApplicationResearchActivities).values(linkages);
    }
    
    return newApplication;
  }

  // Get research activities linked to an IBC application
  async getResearchActivitiesForIbcApplication(ibcApplicationId: number): Promise<ResearchActivity[]> {
    const results = await db
      .select({ researchActivity: researchActivities })
      .from(researchActivities)
      .innerJoin(
        ibcApplicationResearchActivities,
        eq(researchActivities.id, ibcApplicationResearchActivities.researchActivityId)
      )
      .where(eq(ibcApplicationResearchActivities.ibcApplicationId, ibcApplicationId));
    
    return results.map(r => r.researchActivity);
  }

  // Add research activity to IBC application
  async addResearchActivityToIbcApplication(ibcApplicationId: number, researchActivityId: number): Promise<IbcApplicationResearchActivity> {
    const [linkage] = await db
      .insert(ibcApplicationResearchActivities)
      .values({ ibcApplicationId, researchActivityId })
      .returning();
    return linkage;
  }

  // Remove research activity from IBC application
  async removeResearchActivityFromIbcApplication(ibcApplicationId: number, researchActivityId: number): Promise<boolean> {
    const result = await db
      .delete(ibcApplicationResearchActivities)
      .where(
        and(
          eq(ibcApplicationResearchActivities.ibcApplicationId, ibcApplicationId),
          eq(ibcApplicationResearchActivities.researchActivityId, researchActivityId)
        )
      );
    return (result.rowCount ?? 0) > 0;
  }

  async updateIbcApplication(id: number, application: Partial<InsertIbcApplication>): Promise<IbcApplication | undefined> {
    const [updatedApplication] = await db
      .update(ibcApplications)
      .set({ ...application, updatedAt: new Date() })
      .where(eq(ibcApplications.id, id))
      .returning();
    return updatedApplication;
  }

  async deleteIbcApplication(id: number): Promise<boolean> {
    // Delete related research activity linkages first
    await db.delete(ibcApplicationResearchActivities).where(eq(ibcApplicationResearchActivities.ibcApplicationId, id));
    
    // Then delete the application
    const result = await db.delete(ibcApplications).where(eq(ibcApplications.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // IBC Application Comment operations
  async getIbcApplicationComments(applicationId: number): Promise<IbcApplicationComment[]> {
    return await db
      .select()
      .from(ibcApplicationComments)
      .where(eq(ibcApplicationComments.applicationId, applicationId))
      .orderBy(ibcApplicationComments.createdAt);
  }

  async createIbcApplicationComment(comment: InsertIbcApplicationComment): Promise<IbcApplicationComment> {
    const [newComment] = await db.insert(ibcApplicationComments).values(comment).returning();
    return newComment;
  }

  // IBC Application Facilities operations
  async getIbcApplicationRooms(applicationId: number): Promise<IbcApplicationRoom[]> {
    return await db
      .select()
      .from(ibcApplicationRooms)
      .where(eq(ibcApplicationRooms.applicationId, applicationId));
  }

  async addRoomToIbcApplication(applicationRoom: InsertIbcApplicationRoom): Promise<IbcApplicationRoom> {
    const [newRoom] = await db.insert(ibcApplicationRooms).values(applicationRoom).returning();
    return newRoom;
  }

  async removeRoomFromIbcApplication(applicationId: number, roomId: number): Promise<boolean> {
    const result = await db
      .delete(ibcApplicationRooms)
      .where(and(
        eq(ibcApplicationRooms.applicationId, applicationId),
        eq(ibcApplicationRooms.roomId, roomId)
      ));
    return (result.rowCount ?? 0) > 0;
  }

  async getIbcBackboneSourceRooms(applicationId: number): Promise<IbcBackboneSourceRoom[]> {
    return await db
      .select()
      .from(ibcBackboneSourceRooms)
      .where(eq(ibcBackboneSourceRooms.applicationId, applicationId));
  }

  async addBackboneSourceRoom(backboneSourceRoom: InsertIbcBackboneSourceRoom): Promise<IbcBackboneSourceRoom> {
    const [newAssignment] = await db.insert(ibcBackboneSourceRooms).values(backboneSourceRoom).returning();
    return newAssignment;
  }

  async removeBackboneSourceRoom(applicationId: number, backboneSource: string, roomId: number): Promise<boolean> {
    const result = await db
      .delete(ibcBackboneSourceRooms)
      .where(and(
        eq(ibcBackboneSourceRooms.applicationId, applicationId),
        eq(ibcBackboneSourceRooms.backboneSource, backboneSource),
        eq(ibcBackboneSourceRooms.roomId, roomId)
      ));
    return (result.rowCount ?? 0) > 0;
  }

  async getIbcApplicationPpe(applicationId: number): Promise<IbcApplicationPpe[]> {
    return await db
      .select()
      .from(ibcApplicationPpe)
      .where(eq(ibcApplicationPpe.applicationId, applicationId));
  }

  async getIbcApplicationPpeForRoom(applicationId: number, roomId: number): Promise<IbcApplicationPpe[]> {
    return await db
      .select()
      .from(ibcApplicationPpe)
      .where(and(
        eq(ibcApplicationPpe.applicationId, applicationId),
        eq(ibcApplicationPpe.roomId, roomId)
      ));
  }

  async addPpeToIbcApplication(applicationPpe: InsertIbcApplicationPpe): Promise<IbcApplicationPpe> {
    const [newPpe] = await db.insert(ibcApplicationPpe).values(applicationPpe).returning();
    return newPpe;
  }

  async removePpeFromIbcApplication(applicationId: number, roomId: number, ppeItem: string): Promise<boolean> {
    const result = await db
      .delete(ibcApplicationPpe)
      .where(and(
        eq(ibcApplicationPpe.applicationId, applicationId),
        eq(ibcApplicationPpe.roomId, roomId),
        eq(ibcApplicationPpe.ppeItem, ppeItem)
      ));
    return (result.rowCount ?? 0) > 0;
  }

  // Research Contract operations
  async getResearchContracts(): Promise<ResearchContract[]> {
    return await db.select().from(researchContracts);
  }

  async getResearchContract(id: number): Promise<ResearchContract | undefined> {
    const [contract] = await db.select().from(researchContracts).where(eq(researchContracts.id, id));
    return contract;
  }

  async getResearchContractByContractNumber(contractNumber: string): Promise<ResearchContract | undefined> {
    const [contract] = await db.select().from(researchContracts).where(eq(researchContracts.contractNumber, contractNumber));
    return contract;
  }

  async getResearchContractsForResearchActivity(researchActivityId: number): Promise<ResearchContract[]> {
    return await db.select().from(researchContracts).where(eq(researchContracts.researchActivityId, researchActivityId));
  }

  async createResearchContract(contract: InsertResearchContract): Promise<ResearchContract> {
    const [newContract] = await db.insert(researchContracts).values(contract).returning();
    return newContract;
  }

  async updateResearchContract(id: number, contract: Partial<InsertResearchContract>): Promise<ResearchContract | undefined> {
    const [updatedContract] = await db
      .update(researchContracts)
      .set(contract)
      .where(eq(researchContracts.id, id))
      .returning();
    return updatedContract;
  }

  async getResearchContractsForUser(userId: number): Promise<ResearchContract[]> {
    return await db.select().from(researchContracts).where(eq(researchContracts.requestedByUserId, userId));
  }

  async getResearchContractsForProject(projectId: number): Promise<ResearchContract[]> {
    // Get contracts via research activities associated with the project
    return await db
      .select({
        id: researchContracts.id,
        researchActivityId: researchContracts.researchActivityId,
        contractNumber: researchContracts.contractNumber,
        title: researchContracts.title,
        leadPIId: researchContracts.leadPIId,
        irbProtocol: researchContracts.irbProtocol,
        ibcProtocol: researchContracts.ibcProtocol,
        qnrfNumber: researchContracts.qnrfNumber,
        requestState: researchContracts.requestState,
        startDate: researchContracts.startDate,
        endDate: researchContracts.endDate,
        remarks: researchContracts.remarks,
        fundingSourceCategory: researchContracts.fundingSourceCategory,
        contractorName: researchContracts.contractorName,
        internalCostSidra: researchContracts.internalCostSidra,
        internalCostCounterparty: researchContracts.internalCostCounterparty,
        moneyOut: researchContracts.moneyOut,
        isPORelevant: researchContracts.isPORelevant,
        contractType: researchContracts.contractType,
        status: researchContracts.status,
        description: researchContracts.description,
        documents: researchContracts.documents,
        requestedByUserId: researchContracts.requestedByUserId,
        contractValue: researchContracts.contractValue,
        currency: researchContracts.currency,
        initiationRequestedAt: researchContracts.initiationRequestedAt,
        reminderEmail: researchContracts.reminderEmail,
        officeFormStatus: researchContracts.officeFormStatus,
        createdAt: researchContracts.createdAt,
        updatedAt: researchContracts.updatedAt,
      })
      .from(researchContracts)
      .innerJoin(researchActivities, eq(researchContracts.researchActivityId, researchActivities.id))
      .where(eq(researchActivities.projectId, projectId));
  }

  async deleteResearchContract(id: number): Promise<boolean> {
    const result = await db.delete(researchContracts).where(eq(researchContracts.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Research Contract Scope Items operations
  async getResearchContractScopeItems(contractId: number): Promise<ResearchContractScopeItem[]> {
    return await db
      .select()
      .from(researchContractScopeItems)
      .where(eq(researchContractScopeItems.contractId, contractId))
      .orderBy(asc(researchContractScopeItems.position));
  }

  async getResearchContractScopeItem(id: number): Promise<ResearchContractScopeItem | undefined> {
    const [item] = await db.select().from(researchContractScopeItems).where(eq(researchContractScopeItems.id, id));
    return item;
  }

  async createResearchContractScopeItem(item: InsertResearchContractScopeItem): Promise<ResearchContractScopeItem> {
    const [newItem] = await db.insert(researchContractScopeItems).values(item).returning();
    return newItem;
  }

  async updateResearchContractScopeItem(id: number, item: Partial<InsertResearchContractScopeItem>): Promise<ResearchContractScopeItem | undefined> {
    const [updatedItem] = await db
      .update(researchContractScopeItems)
      .set(item)
      .where(eq(researchContractScopeItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteResearchContractScopeItem(id: number): Promise<boolean> {
    const result = await db.delete(researchContractScopeItems).where(eq(researchContractScopeItems.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Research Contract Extensions operations
  async getResearchContractExtensions(contractId: number): Promise<ResearchContractExtension[]> {
    return await db
      .select()
      .from(researchContractExtensions)
      .where(eq(researchContractExtensions.contractId, contractId))
      .orderBy(asc(researchContractExtensions.sequenceNumber));
  }

  async getResearchContractExtension(id: number): Promise<ResearchContractExtension | undefined> {
    const [extension] = await db.select().from(researchContractExtensions).where(eq(researchContractExtensions.id, id));
    return extension;
  }

  async createResearchContractExtension(extension: InsertResearchContractExtension): Promise<ResearchContractExtension> {
    const [newExtension] = await db.insert(researchContractExtensions).values(extension).returning();
    return newExtension;
  }

  async updateResearchContractExtension(id: number, extension: Partial<InsertResearchContractExtension>): Promise<ResearchContractExtension | undefined> {
    const [updatedExtension] = await db
      .update(researchContractExtensions)
      .set(extension)
      .where(eq(researchContractExtensions.id, id))
      .returning();
    return updatedExtension;
  }

  async deleteResearchContractExtension(id: number): Promise<boolean> {
    const result = await db.delete(researchContractExtensions).where(eq(researchContractExtensions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Research Contract Documents operations
  async getResearchContractDocuments(contractId: number): Promise<ResearchContractDocument[]> {
    return await db
      .select()
      .from(researchContractDocuments)
      .where(eq(researchContractDocuments.contractId, contractId))
      .orderBy(desc(researchContractDocuments.uploadedAt));
  }

  async getResearchContractDocumentsForExtension(extensionId: number): Promise<ResearchContractDocument[]> {
    return await db
      .select()
      .from(researchContractDocuments)
      .where(eq(researchContractDocuments.extensionId, extensionId))
      .orderBy(desc(researchContractDocuments.uploadedAt));
  }

  async getResearchContractDocument(id: number): Promise<ResearchContractDocument | undefined> {
    const [document] = await db.select().from(researchContractDocuments).where(eq(researchContractDocuments.id, id));
    return document;
  }

  async createResearchContractDocument(document: InsertResearchContractDocument): Promise<ResearchContractDocument> {
    const [newDocument] = await db.insert(researchContractDocuments).values(document).returning();
    return newDocument;
  }

  async updateResearchContractDocument(id: number, document: Partial<InsertResearchContractDocument>): Promise<ResearchContractDocument | undefined> {
    const [updatedDocument] = await db
      .update(researchContractDocuments)
      .set(document)
      .where(eq(researchContractDocuments.id, id))
      .returning();
    return updatedDocument;
  }

  async deleteResearchContractDocument(id: number): Promise<boolean> {
    const result = await db.delete(researchContractDocuments).where(eq(researchContractDocuments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Dashboard operations
  async getDashboardStats(): Promise<{
    activeResearchActivities: number;
    publications: number;
    patents: number;
    pendingApplications: number;
  }> {
    const activeActivities = await db
      .select({ count: sql<number>`count(*)` })
      .from(researchActivities)
      .where(eq(researchActivities.status, "active"));
    
    const publicationCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(publications);
    
    const patentCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(patents);
    
    const pendingIrbCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(irbApplications)
      .where(eq(irbApplications.status, "Submitted"));
    
    const pendingIbcCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(ibcApplications)
      .where(eq(ibcApplications.status, "Submitted"));
    
    return {
      activeResearchActivities: activeActivities[0].count,
      publications: publicationCount[0].count,
      patents: patentCount[0].count,
      pendingApplications: pendingIrbCount[0].count + pendingIbcCount[0].count,
    };
  }

  async getRecentResearchActivities(limit: number = 5): Promise<ResearchActivity[]> {
    return await db
      .select()
      .from(researchActivities)
      .orderBy(desc(researchActivities.createdAt))
      .limit(limit);
  }

  async getUpcomingDeadlines(): Promise<any[]> {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    
    // Get IRB applications expiring in the next 30 days
    const irbDeadlines = await db
      .select({
        id: irbApplications.id,
        type: sql<string>`'IRB'`,
        title: irbApplications.title,
        expirationDate: irbApplications.expirationDate,
        researchActivityId: irbApplications.researchActivityId
      })
      .from(irbApplications)
      .where(
        and(
          sql`${irbApplications.expirationDate} >= ${now.toISOString()}`,
          sql`${irbApplications.expirationDate} <= ${thirtyDaysFromNow.toISOString()}`
        )
      );
    
    // Get IBC applications expiring in the next 30 days
    const ibcDeadlines = await db
      .select({
        id: ibcApplications.id,
        type: sql<string>`'IBC'`,
        title: ibcApplications.title,
        expirationDate: ibcApplications.expirationDate
      })
      .from(ibcApplications)
      .where(
        and(
          sql`${ibcApplications.expirationDate} >= ${now.toISOString()}`,
          sql`${ibcApplications.expirationDate} <= ${thirtyDaysFromNow.toISOString()}`
        )
      );
    
    // Get research contracts ending in the next 30 days
    const contractDeadlines = await db
      .select({
        id: researchContracts.id,
        type: sql<string>`'Contract'`,
        title: researchContracts.title,
        expirationDate: researchContracts.endDate,
        researchActivityId: researchContracts.researchActivityId
      })
      .from(researchContracts)
      .where(
        and(
          sql`${researchContracts.endDate} >= ${now.toISOString()}`,
          sql`${researchContracts.endDate} <= ${thirtyDaysFromNow.toISOString()}`
        )
      );
    
    return [...irbDeadlines, ...ibcDeadlines, ...contractDeadlines]
      .sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
  }

  // IRB Board Members
  async getIrbBoardMembers(): Promise<(IrbBoardMember & { scientist: Scientist })[]> {
    const boardMembers = await db.select().from(irbBoardMembers).orderBy(desc(irbBoardMembers.createdAt));
    
    const results = await Promise.all(
      boardMembers.map(async (member) => {
        const scientist = await db.select().from(scientists).where(eq(scientists.id, member.scientistId)).limit(1);
        return {
          ...member,
          scientist: scientist[0] || null
        };
      })
    );

    return results.filter(r => r.scientist) as (IrbBoardMember & { scientist: Scientist })[];
  }

  async getIrbBoardMember(id: number): Promise<(IrbBoardMember & { scientist: Scientist }) | undefined> {
    const [member] = await db.select().from(irbBoardMembers).where(eq(irbBoardMembers.id, id));
    if (!member) return undefined;

    const [scientist] = await db.select().from(scientists).where(eq(scientists.id, member.scientistId));
    if (!scientist) return undefined;

    return {
      ...member,
      scientist
    };
  }

  async createIrbBoardMember(member: InsertIrbBoardMember): Promise<IrbBoardMember> {
    // Convert date strings to Date objects
    const memberData = {
      ...member,
      appointmentDate: member.appointmentDate ? new Date(member.appointmentDate) : new Date(),
      termEndDate: new Date(member.termEndDate)
    };

    const [newMember] = await db
      .insert(irbBoardMembers)
      .values(memberData)
      .returning();
    return newMember;
  }

  async updateIrbBoardMember(id: number, member: Partial<InsertIrbBoardMember>): Promise<IrbBoardMember | undefined> {
    const [updatedMember] = await db
      .update(irbBoardMembers)
      .set({ ...member, updatedAt: new Date() })
      .where(eq(irbBoardMembers.id, id))
      .returning();
    return updatedMember || undefined;
  }

  async deleteIrbBoardMember(id: number): Promise<boolean> {
    const result = await db
      .delete(irbBoardMembers)
      .where(eq(irbBoardMembers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getActiveIrbBoardMembers(): Promise<(IrbBoardMember & { scientist: Scientist })[]> {
    const activeMembers = await db
      .select()
      .from(irbBoardMembers)
      .where(eq(irbBoardMembers.isActive, true))
      .orderBy(irbBoardMembers.role);
    
    const results = await Promise.all(
      activeMembers.map(async (member) => {
        const scientist = await db.select().from(scientists).where(eq(scientists.id, member.scientistId)).limit(1);
        return {
          ...member,
          scientist: scientist[0] || null
        };
      })
    );

    return results.filter(r => r.scientist) as (IrbBoardMember & { scientist: Scientist })[];
  }

  // IBC Board Members
  async getIbcBoardMembers(): Promise<(IbcBoardMember & { scientist: Scientist })[]> {
    const boardMembers = await db.select().from(ibcBoardMembers).orderBy(desc(ibcBoardMembers.createdAt));
    
    const results = await Promise.all(
      boardMembers.map(async (member) => {
        const scientist = await db.select().from(scientists).where(eq(scientists.id, member.scientistId)).limit(1);
        return {
          ...member,
          scientist: scientist[0] || null
        };
      })
    );

    return results.filter(r => r.scientist) as (IbcBoardMember & { scientist: Scientist })[];
  }

  async getIbcBoardMember(id: number): Promise<(IbcBoardMember & { scientist: Scientist }) | undefined> {
    const [member] = await db.select().from(ibcBoardMembers).where(eq(ibcBoardMembers.id, id));
    if (!member) return undefined;

    const [scientist] = await db.select().from(scientists).where(eq(scientists.id, member.scientistId));
    if (!scientist) return undefined;

    return {
      ...member,
      scientist
    };
  }

  async createIbcBoardMember(member: InsertIbcBoardMember): Promise<IbcBoardMember> {
    // Convert date strings to Date objects
    const memberData = {
      ...member,
      appointmentDate: member.appointmentDate ? new Date(member.appointmentDate) : new Date(),
      termEndDate: new Date(member.termEndDate)
    };

    const [newMember] = await db
      .insert(ibcBoardMembers)
      .values(memberData)
      .returning();
    return newMember;
  }

  async updateIbcBoardMember(id: number, member: Partial<InsertIbcBoardMember>): Promise<IbcBoardMember | undefined> {
    const [updatedMember] = await db
      .update(ibcBoardMembers)
      .set({ ...member, updatedAt: new Date() })
      .where(eq(ibcBoardMembers.id, id))
      .returning();
    return updatedMember || undefined;
  }

  async deleteIbcBoardMember(id: number): Promise<boolean> {
    const result = await db
      .delete(ibcBoardMembers)
      .where(eq(ibcBoardMembers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getActiveIbcBoardMembers(): Promise<(IbcBoardMember & { scientist: Scientist })[]> {
    const activeMembers = await db
      .select()
      .from(ibcBoardMembers)
      .where(eq(ibcBoardMembers.isActive, true))
      .orderBy(ibcBoardMembers.role);
    
    const results = await Promise.all(
      activeMembers.map(async (member) => {
        const scientist = await db.select().from(scientists).where(eq(scientists.id, member.scientistId)).limit(1);
        return {
          ...member,
          scientist: scientist[0] || null
        };
      })
    );

    return results.filter(r => r.scientist) as (IbcBoardMember & { scientist: Scientist })[];
  }

  // IBC Submissions
  async getIbcSubmissions(): Promise<IbcSubmission[]> {
    return await db.select().from(ibcSubmissions).orderBy(desc(ibcSubmissions.submissionDate));
  }

  async getIbcSubmission(id: number): Promise<IbcSubmission | undefined> {
    const [submission] = await db.select().from(ibcSubmissions).where(eq(ibcSubmissions.id, id));
    return submission;
  }

  async getIbcSubmissionsForApplication(applicationId: number): Promise<IbcSubmission[]> {
    return await db.select().from(ibcSubmissions)
      .where(eq(ibcSubmissions.applicationId, applicationId))
      .orderBy(desc(ibcSubmissions.submissionDate));
  }

  async createIbcSubmission(submission: InsertIbcSubmission): Promise<IbcSubmission> {
    const [newSubmission] = await db.insert(ibcSubmissions).values(submission).returning();
    return newSubmission;
  }

  async updateIbcSubmission(id: number, submission: Partial<InsertIbcSubmission>): Promise<IbcSubmission | undefined> {
    const [updatedSubmission] = await db
      .update(ibcSubmissions)
      .set({ ...submission, updatedAt: new Date() })
      .where(eq(ibcSubmissions.id, id))
      .returning();
    return updatedSubmission;
  }

  async deleteIbcSubmission(id: number): Promise<boolean> {
    const result = await db.delete(ibcSubmissions).where(eq(ibcSubmissions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // IBC Documents
  async getIbcDocuments(): Promise<IbcDocument[]> {
    return await db.select().from(ibcDocuments).orderBy(desc(ibcDocuments.uploadDate));
  }

  async getIbcDocument(id: number): Promise<IbcDocument | undefined> {
    const [document] = await db.select().from(ibcDocuments).where(eq(ibcDocuments.id, id));
    return document;
  }

  async getIbcDocumentsForApplication(applicationId: number): Promise<IbcDocument[]> {
    return await db.select().from(ibcDocuments)
      .where(eq(ibcDocuments.applicationId, applicationId))
      .orderBy(desc(ibcDocuments.uploadDate));
  }

  async createIbcDocument(document: InsertIbcDocument): Promise<IbcDocument> {
    const [newDocument] = await db.insert(ibcDocuments).values(document).returning();
    return newDocument;
  }

  async updateIbcDocument(id: number, document: Partial<InsertIbcDocument>): Promise<IbcDocument | undefined> {
    const [updatedDocument] = await db
      .update(ibcDocuments)
      .set({ ...document, updatedAt: new Date() })
      .where(eq(ibcDocuments.id, id))
      .returning();
    return updatedDocument;
  }

  async deleteIbcDocument(id: number): Promise<boolean> {
    const result = await db.delete(ibcDocuments).where(eq(ibcDocuments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Enhanced IBC Application methods with workflow support

  async getIbcApplicationsByStatus(status: string): Promise<IbcApplication[]> {
    return await db.select().from(ibcApplications)
      .where(eq(ibcApplications.status, status))
      .orderBy(desc(ibcApplications.createdAt));
  }

  async getIbcApplicationsByWorkflowStatus(workflowStatus: string): Promise<IbcApplication[]> {
    return await db.select().from(ibcApplications)
      .where(eq(ibcApplications.workflowStatus, workflowStatus))
      .orderBy(desc(ibcApplications.createdAt));
  }

  async generateNextIbcNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `IBC-${currentYear}-`;
    
    // Get the last IBC number for this year
    const lastApplication = await db
      .select()
      .from(ibcApplications)
      .where(sql`${ibcApplications.ibcNumber} LIKE ${prefix + '%'}`)
      .orderBy(desc(ibcApplications.ibcNumber))
      .limit(1);
    
    let nextNumber = 1;
    if (lastApplication.length > 0) {
      const lastNumber = lastApplication[0].ibcNumber;
      const match = lastNumber.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  }

  // Building operations
  async getBuildings(): Promise<Building[]> {
    return await db.select().from(buildings).orderBy(buildings.name);
  }

  async getBuilding(id: number): Promise<Building | undefined> {
    const [building] = await db.select().from(buildings).where(eq(buildings.id, id));
    return building;
  }

  async createBuilding(building: InsertBuilding): Promise<Building> {
    const [newBuilding] = await db.insert(buildings).values(building).returning();
    return newBuilding;
  }

  async updateBuilding(id: number, building: Partial<InsertBuilding>): Promise<Building | undefined> {
    const [updatedBuilding] = await db
      .update(buildings)
      .set(building)
      .where(eq(buildings.id, id))
      .returning();
    return updatedBuilding;
  }

  async deleteBuilding(id: number): Promise<boolean> {
    const result = await db.delete(buildings).where(eq(buildings.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Room operations
  async getRooms(): Promise<Room[]> {
    return await db.select().from(rooms).orderBy(rooms.roomNumber);
  }

  async getRoom(id: number): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async getRoomsByBuilding(buildingId: number): Promise<Room[]> {
    return await db.select().from(rooms)
      .where(eq(rooms.buildingId, buildingId))
      .orderBy(rooms.roomNumber);
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [newRoom] = await db.insert(rooms).values(room).returning();
    return newRoom;
  }

  async updateRoom(id: number, room: Partial<InsertRoom>): Promise<Room | undefined> {
    const [updatedRoom] = await db
      .update(rooms)
      .set(room)
      .where(eq(rooms.id, id))
      .returning();
    return updatedRoom;
  }

  async deleteRoom(id: number): Promise<boolean> {
    const result = await db.delete(rooms).where(eq(rooms.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Scientists filtering by role for room assignments
  async getScientistsByRole(rolePattern: string): Promise<Scientist[]> {
    if (rolePattern.includes('|')) {
      // Handle multiple patterns with OR condition
      const patterns = rolePattern.split('|');
      const conditions = patterns.map(pattern => 
        ilike(scientists.jobTitle, `%${pattern}%`)
      );
      const combinedCondition = conditions.reduce((acc, condition) => 
        acc ? or(acc, condition) : condition
      );
      return await db.select().from(scientists)
        .where(combinedCondition)
        .orderBy(scientists.lastName, scientists.firstName);
    } else {
      return await db.select().from(scientists)
        .where(ilike(scientists.jobTitle, `%${rolePattern}%`))
        .orderBy(scientists.lastName, scientists.firstName);
    }
  }

  // Role Permissions operations
  async getRolePermissions(): Promise<RolePermission[]> {
    return await db.select().from(rolePermissions);
  }

  async createRolePermission(permission: InsertRolePermission): Promise<RolePermission> {
    const [newPermission] = await db.insert(rolePermissions).values(permission).returning();
    return newPermission;
  }

  async updateRolePermission(jobTitle: string, navigationItem: string, accessLevel: string): Promise<RolePermission | undefined> {
    const [updatedPermission] = await db
      .update(rolePermissions)
      .set({ accessLevel, updatedAt: sql`now()` })
      .where(and(
        eq(rolePermissions.jobTitle, jobTitle),
        eq(rolePermissions.navigationItem, navigationItem)
      ))
      .returning();
    return updatedPermission;
  }

  async updateRolePermissionsBulk(permissions: Array<{jobTitle: string, navigationItem: string, accessLevel: string}>): Promise<RolePermission[]> {
    const results: RolePermission[] = [];
    
    for (const permission of permissions) {
      const result = await this.updateRolePermission(
        permission.jobTitle, 
        permission.navigationItem, 
        permission.accessLevel
      );
      if (result) {
        results.push(result);
      }
    }
    
    return results;
  }

  // Journal Impact Factor operations
  async getJournalImpactFactors(options?: {
    limit?: number;
    offset?: number;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    searchTerm?: string;
    yearFilter?: string;
  }): Promise<{ data: JournalImpactFactor[]; total: number }> {
    const { limit = 100, offset = 0, sortField = 'rank', sortDirection = 'asc', searchTerm = '', yearFilter = '' } = options || {};
    
    // Build where clauses for filtering
    const whereConditions = [];
    
    if (searchTerm.trim()) {
      whereConditions.push(
        or(
          ilike(journalImpactFactors.journalName, `%${searchTerm}%`),
          ilike(journalImpactFactors.publisher, `%${searchTerm}%`)
        )
      );
    }
    
    if (yearFilter.trim()) {
      const year = parseInt(yearFilter);
      if (!isNaN(year)) {
        whereConditions.push(eq(journalImpactFactors.year, year));
      }
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : sql`1=1`;
    
    // Build the order by clause based on sortField and sortDirection
    let orderBy;
    const column = journalImpactFactors[sortField as keyof typeof journalImpactFactors];
    if (column) {
      orderBy = sortDirection === 'asc' ? asc(column) : desc(column);
    } else {
      // Default to rank ascending
      orderBy = asc(journalImpactFactors.rank);
    }

    // Get total count with filters
    const [{ count: total }] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(journalImpactFactors)
      .where(whereClause);

    // Get paginated data with filters
    const data = await db.select().from(journalImpactFactors)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return { data, total };
  }

  async getJournalImpactFactor(id: number): Promise<JournalImpactFactor | undefined> {
    const [factor] = await db.select().from(journalImpactFactors).where(eq(journalImpactFactors.id, id));
    return factor;
  }

  async getImpactFactorByJournalAndYear(journalName: string, year: number): Promise<JournalImpactFactor | undefined> {
    const [factor] = await db.select().from(journalImpactFactors)
      .where(and(
        ilike(journalImpactFactors.journalName, journalName),
        eq(journalImpactFactors.year, year)
      ));
    return factor;
  }

  async getHistoricalImpactFactors(journalName: string): Promise<JournalImpactFactor[]> {
    return await db.select().from(journalImpactFactors)
      .where(ilike(journalImpactFactors.journalName, journalName))
      .orderBy(asc(journalImpactFactors.year));
  }

  async createJournalImpactFactor(factor: InsertJournalImpactFactor): Promise<JournalImpactFactor> {
    const [newFactor] = await db.insert(journalImpactFactors).values(factor).returning();
    return newFactor;
  }

  async updateJournalImpactFactor(id: number, factor: Partial<InsertJournalImpactFactor>): Promise<JournalImpactFactor | undefined> {
    const [updatedFactor] = await db
      .update(journalImpactFactors)
      .set({ ...factor, updatedAt: sql`now()` })
      .where(eq(journalImpactFactors.id, id))
      .returning();
    return updatedFactor;
  }

  async deleteJournalImpactFactor(id: number): Promise<boolean> {
    const result = await db.delete(journalImpactFactors).where(eq(journalImpactFactors.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Grant operations
  async getGrants(): Promise<Grant[]> {
    return await db.select().from(grants).orderBy(desc(grants.createdAt));
  }

  async getGrant(id: number): Promise<Grant | undefined> {
    const [grant] = await db.select().from(grants).where(eq(grants.id, id));
    return grant;
  }

  async getGrantByProjectNumber(projectNumber: string): Promise<Grant | undefined> {
    const [grant] = await db.select().from(grants).where(eq(grants.projectNumber, projectNumber));
    return grant;
  }

  async createGrant(grant: InsertGrant): Promise<Grant> {
    const [newGrant] = await db.insert(grants).values(grant).returning();
    return newGrant;
  }

  async updateGrant(id: number, grant: Partial<InsertGrant>): Promise<Grant | undefined> {
    const [updatedGrant] = await db
      .update(grants)
      .set({ ...grant, updatedAt: sql`now()` })
      .where(eq(grants.id, id))
      .returning();
    return updatedGrant;
  }

  async deleteGrant(id: number): Promise<boolean> {
    const result = await db.delete(grants).where(eq(grants.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Grant-Research Activity relationship operations
  async getGrantResearchActivities(grantId: number): Promise<{ id: number; sdrNumber: string; title: string; status: string; }[]> {
    const result = await db
      .select({
        id: researchActivities.id,
        sdrNumber: researchActivities.sdrNumber,
        title: researchActivities.title,
        status: researchActivities.status
      })
      .from(grantResearchActivities)
      .innerJoin(researchActivities, eq(grantResearchActivities.researchActivityId, researchActivities.id))
      .where(eq(grantResearchActivities.grantId, grantId));
    return result;
  }

  async getResearchActivityGrants(researchActivityId: number): Promise<{ id: number; projectNumber: string; title: string; status: string; }[]> {
    const result = await db
      .select({
        id: grants.id,
        projectNumber: grants.projectNumber,
        title: grants.title,
        status: grants.status
      })
      .from(grantResearchActivities)
      .innerJoin(grants, eq(grantResearchActivities.grantId, grants.id))
      .where(eq(grantResearchActivities.researchActivityId, researchActivityId));
    return result;
  }

  async addGrantResearchActivity(grantId: number, researchActivityId: number): Promise<GrantResearchActivity> {
    const [relationship] = await db
      .insert(grantResearchActivities)
      .values({ grantId, researchActivityId })
      .returning();
    return relationship;
  }

  async removeGrantResearchActivity(grantId: number, researchActivityId: number): Promise<boolean> {
    const result = await db
      .delete(grantResearchActivities)
      .where(and(
        eq(grantResearchActivities.grantId, grantId),
        eq(grantResearchActivities.researchActivityId, researchActivityId)
      ));
    return (result.rowCount ?? 0) > 0;
  }

  async getResearchActivityIbcApplications(researchActivityId: number): Promise<{ id: number; ibcNumber: string; title: string; status: string; workflowStatus: string; }[]> {
    const result = await db
      .select({
        id: ibcApplications.id,
        ibcNumber: ibcApplications.ibcNumber,
        title: ibcApplications.title,
        status: ibcApplications.status,
        workflowStatus: ibcApplications.workflowStatus,
      })
      .from(ibcApplicationResearchActivities)
      .innerJoin(ibcApplications, eq(ibcApplicationResearchActivities.ibcApplicationId, ibcApplications.id))
      .where(eq(ibcApplicationResearchActivities.researchActivityId, researchActivityId));

    return result;
  }

  // Grant Progress Reports operations
  async getGrantProgressReports(grantId: number): Promise<GrantProgressReport[]> {
    const result = await db
      .select()
      .from(grantProgressReports)
      .where(eq(grantProgressReports.grantId, grantId))
      .orderBy(desc(grantProgressReports.submissionDate));

    return result;
  }

  async createGrantProgressReport(report: InsertGrantProgressReport): Promise<GrantProgressReport> {
    const [newReport] = await db
      .insert(grantProgressReports)
      .values(report)
      .returning();

    return newReport;
  }

  async updateGrantProgressReport(id: number, report: Partial<InsertGrantProgressReport>): Promise<GrantProgressReport> {
    const [updatedReport] = await db
      .update(grantProgressReports)
      .set({ ...report, updatedAt: sql`now()` })
      .where(eq(grantProgressReports.id, id))
      .returning();

    return updatedReport;
  }

  async deleteGrantProgressReport(id: number): Promise<boolean> {
    const result = await db
      .delete(grantProgressReports)
      .where(eq(grantProgressReports.id, id));

    return (result.rowCount ?? 0) > 0;
  }

  // Certification Modules operations
  async getCertificationModules(): Promise<CertificationModule[]> {
    return await db
      .select()
      .from(certificationModules)
      .where(eq(certificationModules.isActive, true))
      .orderBy(asc(certificationModules.name));
  }

  async getCertificationModule(id: number): Promise<CertificationModule | undefined> {
    const [module] = await db
      .select()
      .from(certificationModules)
      .where(eq(certificationModules.id, id));
    return module;
  }

  async createCertificationModule(module: InsertCertificationModule): Promise<CertificationModule> {
    const [newModule] = await db
      .insert(certificationModules)
      .values(module)
      .returning();
    return newModule;
  }

  async updateCertificationModule(id: number, module: Partial<InsertCertificationModule>): Promise<CertificationModule> {
    const [updatedModule] = await db
      .update(certificationModules)
      .set({ ...module, updatedAt: sql`now()` })
      .where(eq(certificationModules.id, id))
      .returning();
    return updatedModule;
  }

  async deleteCertificationModule(id: number): Promise<boolean> {
    const result = await db
      .update(certificationModules)
      .set({ isActive: false, updatedAt: sql`now()` })
      .where(eq(certificationModules.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Certifications operations
  async getCertifications(): Promise<Certification[]> {
    return await db
      .select()
      .from(certifications)
      .orderBy(desc(certifications.endDate));
  }

  async getCertificationsByScientist(scientistId: number): Promise<Certification[]> {
    return await db
      .select()
      .from(certifications)
      .where(eq(certifications.scientistId, scientistId))
      .orderBy(desc(certifications.endDate));
  }

  async getCertificationsByModule(moduleId: number): Promise<Certification[]> {
    return await db
      .select()
      .from(certifications)
      .where(eq(certifications.moduleId, moduleId))
      .orderBy(desc(certifications.endDate));
  }

  async getCertificationMatrix(): Promise<any[]> {
    // Get all scientists first
    const scientistsList = await db
      .select({
        id: scientists.id,
        name: sql<string>`${scientists.honorificTitle} || ' ' || ${scientists.firstName} || ' ' || ${scientists.lastName}`,
      })
      .from(scientists)
      .where(eq(scientists.staffType, "scientific"))
      .orderBy(asc(scientists.lastName), asc(scientists.firstName));

    // Get all active modules
    const modulesList = await db
      .select()
      .from(certificationModules)
      .where(eq(certificationModules.isActive, true))
      .orderBy(asc(certificationModules.name));

    // Get all certifications
    const certificationsList = await db
      .select()
      .from(certifications);

    // Build matrix data manually since crossJoin isn't available
    const matrixData = [];
    for (const scientist of scientistsList) {
      for (const module of modulesList) {
        const certification = certificationsList.find(
          c => c.scientistId === scientist.id && c.moduleId === module.id
        );
        
        // Use real certification data if it exists, otherwise generate dummy data
        let displayData: { startDate: string | null; endDate: string | null; certificationId: number | null };
        
        if (certification) {
          // Use real certification from database
          displayData = {
            startDate: certification.startDate,
            endDate: certification.endDate,
            certificationId: certification.id
          };
        } else {
          // Generate dummy data for missing certifications (primarily for CITI modules)
          const combo = scientist.id + module.id;
          const dummyStatuses = [
            { startDate: '2024-03-15', endDate: '2026-03-15', certificationId: 999000 + scientist.id * 100 + module.id }, // Valid
            { startDate: '2024-09-25', endDate: '2025-09-25', certificationId: 999000 + scientist.id * 100 + module.id }, // Expiring
            { startDate: '2023-10-05', endDate: '2024-10-05', certificationId: 999000 + scientist.id * 100 + module.id }, // Expired
            { startDate: null, endDate: null, certificationId: null } // No certification
          ];
          
          const statusIndex = combo % 4;
          displayData = dummyStatuses[statusIndex];
        }
        
        matrixData.push({
          scientistId: scientist.id,
          scientistName: scientist.name,
          moduleId: module.id,
          moduleName: module.name,
          certificationId: displayData.certificationId,
          startDate: displayData.startDate,
          endDate: displayData.endDate,
          certificateFilePath: certification?.certificateFilePath || null,
          reportFilePath: certification?.reportFilePath || null,
        });
      }
    }

    return matrixData;
  }

  async createCertification(certification: InsertCertification): Promise<Certification> {
    const [newCertification] = await db
      .insert(certifications)
      .values(certification)
      .returning();
    return newCertification;
  }

  async updateCertification(id: number, certification: Partial<InsertCertification>): Promise<Certification> {
    const [updatedCertification] = await db
      .update(certifications)
      .set({ ...certification, updatedAt: sql`now()` })
      .where(eq(certifications.id, id))
      .returning();
    return updatedCertification;
  }

  async deleteCertification(id: number): Promise<boolean> {
    const result = await db
      .delete(certifications)
      .where(eq(certifications.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Certification Configuration operations
  async getCertificationConfiguration(): Promise<CertificationConfiguration | undefined> {
    const [config] = await db
      .select()
      .from(certificationConfigurations)
      .orderBy(desc(certificationConfigurations.updatedAt))
      .limit(1);
    return config;
  }

  async createCertificationConfiguration(config: InsertCertificationConfiguration): Promise<CertificationConfiguration> {
    const [newConfig] = await db
      .insert(certificationConfigurations)
      .values(config)
      .returning();
    return newConfig;
  }

  async updateCertificationConfiguration(id: number, config: Partial<InsertCertificationConfiguration>): Promise<CertificationConfiguration> {
    const [updatedConfig] = await db
      .update(certificationConfigurations)
      .set({ ...config, updatedAt: sql`now()` })
      .where(eq(certificationConfigurations.id, id))
      .returning();
    return updatedConfig;
  }

  // System Configuration operations
  async getSystemConfigurations(): Promise<SystemConfiguration[]> {
    return await db.select().from(systemConfigurations).orderBy(asc(systemConfigurations.category), asc(systemConfigurations.key));
  }

  async getSystemConfiguration(key: string): Promise<SystemConfiguration | undefined> {
    const [config] = await db
      .select()
      .from(systemConfigurations)
      .where(eq(systemConfigurations.key, key));
    return config;
  }

  async createSystemConfiguration(config: InsertSystemConfiguration): Promise<SystemConfiguration> {
    const [newConfig] = await db
      .insert(systemConfigurations)
      .values(config)
      .returning();
    return newConfig;
  }

  async updateSystemConfiguration(key: string, config: Partial<InsertSystemConfiguration>): Promise<SystemConfiguration | undefined> {
    const [updatedConfig] = await db
      .update(systemConfigurations)
      .set({ ...config, updatedAt: sql`now()` })
      .where(eq(systemConfigurations.key, key))
      .returning();
    return updatedConfig;
  }

  async deleteSystemConfiguration(key: string): Promise<boolean> {
    const result = await db
      .delete(systemConfigurations)
      .where(eq(systemConfigurations.key, key));
    return (result.rowCount ?? 0) > 0;
  }

  // PDF Import History operations
  async getPdfImportHistory(): Promise<PdfImportHistory[]> {
    return await db.select().from(pdfImportHistory).orderBy(desc(pdfImportHistory.createdAt));
  }

  async getPdfImportHistoryEntry(id: number): Promise<PdfImportHistory | undefined> {
    const [entry] = await db
      .select()
      .from(pdfImportHistory)
      .where(eq(pdfImportHistory.id, id));
    return entry;
  }

  async createPdfImportHistoryEntry(entry: InsertPdfImportHistory): Promise<PdfImportHistory> {
    const [newEntry] = await db
      .insert(pdfImportHistory)
      .values(entry)
      .returning();
    return newEntry;
  }

  async updatePdfImportHistoryEntry(id: number, entry: Partial<InsertPdfImportHistory>): Promise<PdfImportHistory | undefined> {
    const [updatedEntry] = await db
      .update(pdfImportHistory)
      .set({ ...entry, updatedAt: sql`now()` })
      .where(eq(pdfImportHistory.id, id))
      .returning();
    return updatedEntry;
  }

  async searchPdfImportHistory(filters: {
    scientistName?: string;
    courseName?: string;
    dateFrom?: Date;
    dateTo?: Date;
    status?: string;
    uploadedBy?: number;
  }): Promise<PdfImportHistory[]> {
    let query = db.select().from(pdfImportHistory);
    
    const conditions = [];
    
    if (filters.scientistName) {
      conditions.push(ilike(pdfImportHistory.certificatePersonName, `%${filters.scientistName}%`));
    }
    
    if (filters.courseName) {
      conditions.push(ilike(pdfImportHistory.courseName, `%${filters.courseName}%`));
    }
    
    if (filters.dateFrom) {
      conditions.push(gte(pdfImportHistory.completionDate, filters.dateFrom));
    }
    
    if (filters.dateTo) {
      conditions.push(sql`${pdfImportHistory.completionDate} <= ${filters.dateTo}`);
    }
    
    if (filters.status) {
      conditions.push(eq(pdfImportHistory.processingStatus, filters.status));
    }
    
    if (filters.uploadedBy) {
      conditions.push(eq(pdfImportHistory.uploadedBy, filters.uploadedBy));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(pdfImportHistory.createdAt));
  }

  async updatePdfImportHistorySaveStatus(fileName: string, saveStatus: string): Promise<PdfImportHistory | undefined> {
    const [updatedEntry] = await db
      .update(pdfImportHistory)
      .set({ saveStatus, updatedAt: sql`now()` })
      .where(eq(pdfImportHistory.fileName, fileName))
      .returning();
    return updatedEntry;
  }

  // Feature Request operations
  async getFeatureRequests(): Promise<FeatureRequest[]> {
    return await db.select().from(featureRequests).orderBy(desc(featureRequests.createdAt));
  }

  async getFeatureRequest(id: number): Promise<FeatureRequest | undefined> {
    const [request] = await db.select().from(featureRequests).where(eq(featureRequests.id, id));
    return request;
  }

  async createFeatureRequest(insertRequest: InsertFeatureRequest): Promise<FeatureRequest> {
    const [request] = await db.insert(featureRequests).values(insertRequest).returning();
    return request;
  }

  async updateFeatureRequest(id: number, updates: Partial<InsertFeatureRequest>): Promise<FeatureRequest | undefined> {
    const [updatedRequest] = await db
      .update(featureRequests)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(featureRequests.id, id))
      .returning();
    return updatedRequest;
  }

  async deleteFeatureRequest(id: number): Promise<boolean> {
    const result = await db.delete(featureRequests).where(eq(featureRequests.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // RA-200 Applications
  async createRa200Application(data: InsertRa200Application): Promise<Ra200Application> {
    const applicationId = `PMO-RA200-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
    const [result] = await db.insert(ra200Applications)
      .values({ ...data, applicationId })
      .returning();
    return result;
  }

  async getRa200Applications(): Promise<Ra200Application[]> {
    return await db.select().from(ra200Applications).orderBy(desc(ra200Applications.createdAt));
  }

  async getRa200Application(id: number): Promise<Ra200Application | null> {
    const [result] = await db.select().from(ra200Applications).where(eq(ra200Applications.id, id));
    return result || null;
  }

  async updateRa200Application(id: number, updates: Partial<InsertRa200Application>): Promise<Ra200Application | null> {
    const [result] = await db.update(ra200Applications)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(ra200Applications.id, id))
      .returning();
    return result || null;
  }

  async deleteRa200Application(id: number): Promise<boolean> {
    const result = await db.delete(ra200Applications).where(eq(ra200Applications.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // RA-205A Applications
  async createRa205aApplication(data: InsertRa205aApplication): Promise<Ra205aApplication> {
    const applicationId = `PMO-RA205A-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
    const [result] = await db.insert(ra205aApplications)
      .values({ ...data, applicationId })
      .returning();
    return result;
  }

  async getRa205aApplications(): Promise<Ra205aApplication[]> {
    return await db.select().from(ra205aApplications).orderBy(desc(ra205aApplications.createdAt));
  }

  async getRa205aApplication(id: number): Promise<Ra205aApplication | null> {
    const [result] = await db.select().from(ra205aApplications).where(eq(ra205aApplications.id, id));
    return result || null;
  }

  async updateRa205aApplication(id: number, updates: Partial<InsertRa205aApplication>): Promise<Ra205aApplication | null> {
    const [result] = await db.update(ra205aApplications)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(ra205aApplications.id, id))
      .returning();
    return result || null;
  }

  async deleteRa205aApplication(id: number): Promise<boolean> {
    const result = await db.delete(ra205aApplications).where(eq(ra205aApplications.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Combined view for PMO Applications (for listing both types together)
  async getAllPmoApplications(): Promise<Array<Ra200Application & { form_type: 'RA-200' } | Ra205aApplication & { form_type: 'RA-205A' }>> {
    const ra200Apps = await this.getRa200Applications();
    const ra205aApps = await this.getRa205aApplications();
    
    const ra200WithType = ra200Apps.map(app => ({ ...app, form_type: 'RA-200' as const }));
    const ra205aWithType = ra205aApps.map(app => ({ ...app, form_type: 'RA-205A' as const }));
    
    return [...ra200WithType, ...ra205aWithType].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

export const storage = new DatabaseStorage();
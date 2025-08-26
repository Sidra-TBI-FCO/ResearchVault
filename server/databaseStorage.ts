import { eq, and, desc, or, sql, inArray, gte } from "drizzle-orm";
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
  irbBoardMembers, IrbBoardMember, InsertIrbBoardMember
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
    return result.rowCount > 0;
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
    return result.rowCount > 0;
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
    return result.rowCount > 0;
  }

  async getStaff(): Promise<Scientist[]> {
    // Since isStaff field was removed, return scientists with management/staff job titles
    return await db.select().from(scientists).where(eq(scientists.title, "Management")).orderBy(scientists.lastName, scientists.firstName);
  }

  async getPrincipalInvestigators(): Promise<Scientist[]> {
    // Since isStaff field was removed, return all scientists as potential PIs
    return await db.select().from(scientists).orderBy(scientists.lastName, scientists.firstName);
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
    return result.rowCount > 0;
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
    return result.rowCount > 0;
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
    return result.rowCount > 0;
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
    const [newPublication] = await db.insert(publications).values(publication).returning();
    return newPublication;
  }

  async updatePublication(id: number, publication: Partial<InsertPublication>): Promise<Publication | undefined> {
    // Handle date conversions properly
    const updateData = { ...publication };
    
    console.log('Original publication data:', publication);
    console.log('PublicationDate type:', typeof updateData.publicationDate);
    console.log('PublicationDate value:', updateData.publicationDate);
    
    // Convert date strings to Date objects if needed
    if (updateData.publicationDate && typeof updateData.publicationDate === 'string') {
      console.log('Converting date string to Date object:', updateData.publicationDate);
      updateData.publicationDate = new Date(updateData.publicationDate);
      console.log('Converted date:', updateData.publicationDate);
    }
    
    const [updatedPublication] = await db
      .update(publications)
      .set(updateData)
      .where(eq(publications.id, id))
      .returning();
    return updatedPublication;
  }

  async deletePublication(id: number): Promise<boolean> {
    const result = await db.delete(publications).where(eq(publications.id, id));
    return result.rowCount > 0;
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
            eq(publications.status, 'published'),
            eq(publications.status, 'In Press')
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
    return result.rowCount > 0;
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
    return result.rowCount > 0;
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
    return result.rowCount > 0;
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
    return result.rowCount > 0;
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
    return result.rowCount > 0;
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
    return result.rowCount > 0;
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
    return result.rowCount > 0;
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

  async deleteResearchContract(id: number): Promise<boolean> {
    const result = await db.delete(researchContracts).where(eq(researchContracts.id, id));
    return result.rowCount > 0;
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
    return result.rowCount > 0;
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
    return result.rowCount > 0;
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
    return result.rowCount > 0;
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
    return result.rowCount > 0;
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
}

export const storage = new DatabaseStorage();
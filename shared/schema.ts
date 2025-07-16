import { pgTable, text, serial, integer, timestamp, boolean, json, uniqueIndex, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema (for authentication)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Scientists schema
export const scientists = pgTable("scientists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  title: text("title"),
  email: text("email").notNull().unique(),
  staffId: text("staff_id").unique(), // 5-digit staff ID for badges
  department: text("department"),
  role: text("role"),
  bio: text("bio"),
  profileImageInitials: text("profile_image_initials"), // Storing initials for avatar
  isStaff: boolean("is_staff").default(false), // True for staff, false for principal investigators
  supervisorId: integer("supervisor_id"), // For staff members, references scientists.id
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertScientistSchema = createInsertSchema(scientists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Programs (PRM) - The highest level of research organization
export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  programId: text("program_id").notNull().unique(), // PRM number
  name: text("name").notNull(),
  description: text("description"),
  programDirectorId: integer("program_director_id"), // Program Director (references scientists.id)
  researchCoLeadId: integer("research_co_lead_id"), // Research Co-Lead (references scientists.id)
  clinicalCoLead1Id: integer("clinical_co_lead_1_id"), // Clinical Co-Lead 1 (references scientists.id)
  clinicalCoLead2Id: integer("clinical_co_lead_2_id"), // Clinical Co-Lead 2 (references scientists.id)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProgramSchema = createInsertSchema(programs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Projects (PRJ) - Collections of related research activities
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  projectId: text("project_id").notNull().unique(), // PRJ number
  programId: integer("program_id"), // references programs.id
  name: text("name").notNull(),
  description: text("description"),
  principalInvestigatorId: integer("principal_investigator_id"), // Principal Investigator (references scientists.id)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Research Activities (SDR) - Individual research projects
export const researchActivities = pgTable("research_activities", {
  id: serial("id").primaryKey(),
  sdrNumber: text("sdr_number").notNull().unique(), // SDR number
  projectId: integer("project_id"), // references projects.id
  title: text("title").notNull(),
  shortTitle: text("short_title"), // Short, catchy title for better recognition
  description: text("description"),
  status: text("status").notNull().default("planning"), // planning, active, completed, on_hold
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  leadScientistId: integer("lead_scientist_id"), // Lead Scientist (references scientists.id)
  budgetHolderId: integer("budget_holder_id"), // references scientists.id
  lineManagerId: integer("line_manager_id"), // references scientists.id
  additionalNotificationEmail: text("additional_notification_email"),
  sidraBranch: text("sidra_branch"), // Research, Clinical, External
  budgetSource: text("budget_source"), // IRF, PI Budget, QNRF, etc.
  objectives: text("objectives"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResearchActivitySchema = createInsertSchema(researchActivities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// This is no longer needed as we have a proper Projects schema now
// export const insertProjectSchema = insertResearchActivitySchema;

// Project Team Members (Many-to-Many relationship)
export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  researchActivityId: integer("research_activity_id").notNull(), // references researchActivities.id
  scientistId: integer("scientist_id").notNull(), // references scientists.id
  role: text("role"), // PI, Co-PI, Researcher, Lab Technician, etc.
}, (table) => {
  return {
    projectScientistIdx: uniqueIndex("project_scientist_idx").on(table.researchActivityId, table.scientistId),
  };
});

export const insertProjectMemberSchema = createInsertSchema(projectMembers).omit({
  id: true,
});

// Data Management Plans
export const dataManagementPlans = pgTable("data_management_plans", {
  id: serial("id").primaryKey(),
  researchActivityId: integer("research_activity_id").notNull(), // references researchActivities.id
  dmpNumber: text("dmp_number").notNull().unique(), // DMP number
  title: text("title").notNull(),
  description: text("description"),
  dataCollectionMethods: text("data_collection_methods"),
  dataStoragePlan: text("data_storage_plan"),
  dataSharingPlan: text("data_sharing_plan"),
  retentionPeriod: text("retention_period"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDataManagementPlanSchema = createInsertSchema(dataManagementPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Publications
export const publications = pgTable("publications", {
  id: serial("id").primaryKey(),
  researchActivityId: integer("research_activity_id"), // references researchActivities.id
  title: text("title").notNull(),
  abstract: text("abstract"),
  authors: text("authors").notNull(),
  journal: text("journal"),
  volume: text("volume"),
  issue: text("issue"),
  pages: text("pages"),
  doi: text("doi"), // Digital Object Identifier
  publicationDate: timestamp("publication_date"),
  publicationType: text("publication_type"), // Journal Article, Conference Paper, Book, etc.
  status: text("status"), // Published, Submitted, In Preparation, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPublicationSchema = createInsertSchema(publications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  publicationDate: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    },
    z.date().nullable().optional()
  )
});

// Publication Authors (Many-to-Many relationship to track authorship types)
export const publicationAuthors = pgTable("publication_authors", {
  id: serial("id").primaryKey(),
  publicationId: integer("publication_id").notNull(), // references publications.id
  scientistId: integer("scientist_id").notNull(), // references scientists.id
  authorshipType: text("authorship_type").notNull(), // First Author, Contributing Author, Senior Author, Last Author, Corresponding Author
  authorPosition: integer("author_position"), // Position in author list (1, 2, 3, etc.)
}, (table) => {
  return {
    publicationScientistIdx: uniqueIndex("publication_scientist_idx").on(table.publicationId, table.scientistId),
  };
});

export const insertPublicationAuthorSchema = createInsertSchema(publicationAuthors).omit({
  id: true,
});

// Patents
export const patents = pgTable("patents", {
  id: serial("id").primaryKey(),
  researchActivityId: integer("research_activity_id"), // references researchActivities.id
  title: text("title").notNull(),
  inventors: text("inventors").notNull(),
  filingDate: timestamp("filing_date"),
  grantDate: timestamp("grant_date"),
  patentNumber: text("patent_number"),
  status: text("status").notNull(), // Filed, Granted, Rejected, etc.
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPatentSchema = createInsertSchema(patents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// IRB Applications (Institutional Review Board)
export const irbApplications = pgTable("irb_applications", {
  id: serial("id").primaryKey(),
  researchActivityId: integer("research_activity_id"), // references researchActivities.id
  irbNumber: text("irb_number").notNull().unique(), // Sidra IRB number
  irbNetNumber: text("irb_net_number"), // IRBNet allocated number
  oldNumber: text("old_number"), // Old allocated number
  title: text("title").notNull(),
  shortTitle: text("short_title"), // Short title for better recognition
  principalInvestigatorId: integer("principal_investigator_id").notNull(), // references scientists.id
  additionalNotificationEmail: text("additional_notification_email"),
  protocolType: text("protocol_type"), // Exempt, Expedited, Full Board, etc.
  isInterventional: boolean("is_interventional").default(false), // Is interventional clinical study
  submissionDate: timestamp("submission_date"),
  initialApprovalDate: date("initial_approval_date"),
  expirationDate: date("expiration_date"),
  status: text("status").notNull(), // Active, Inactive, etc.
  subjectEnrollmentReasons: text("subject_enrollment_reasons").array(), // Sample Collection, Data Collection, etc.
  description: text("description"),
  documents: json("documents"), // Store metadata for related documents
  
  // Enhanced workflow and submission fields
  workflowStatus: text("workflow_status").notNull().default("draft"), // draft, submitted, under_review, approved, rejected, etc.
  submissionType: text("submission_type").default("initial"), // initial, amendment, continuing_review, closure
  version: integer("version").default(1), // Version control for submissions
  formData: json("form_data"), // Store dynamic form responses
  riskLevel: text("risk_level"), // minimal, greater_than_minimal, high
  vulnerablePopulations: text("vulnerable_populations").array(), // children, pregnant_women, prisoners, etc.
  studyDesign: text("study_design"), // observational, interventional, survey, etc.
  dataCollectionMethods: text("data_collection_methods").array(), // surveys, interviews, medical_records, etc.
  expectedParticipants: integer("expected_participants"),
  studyDuration: text("study_duration"), // Duration in months or description
  fundingSource: text("funding_source"),
  conflictOfInterest: boolean("conflict_of_interest").default(false),
  multiSite: boolean("multi_site").default(false),
  internationalSites: boolean("international_sites").default(false),
  
  // Review tracking
  reviewerAssignments: json("reviewer_assignments"), // Track assigned reviewers
  reviewComments: json("review_comments"), // Compiled reviewer feedback
  piResponses: json("pi_responses"), // PI responses to reviewer comments
  
  // Compliance fields
  requiresMonitoring: boolean("requires_monitoring").default(false),
  monitoringFrequency: text("monitoring_frequency"), // annually, semi_annually, etc.
  reportingRequirements: text("reporting_requirements").array(),
  protocolTeamMembers: json("protocol_team_members"), // Store protocol team member assignments
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIrbApplicationSchema = createInsertSchema(irbApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// IRB Submissions - Track individual submission instances within an application
export const irbSubmissions = pgTable("irb_submissions", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(), // references irbApplications.id
  submissionType: text("submission_type").notNull(), // initial, amendment, continuing_review, closure, adverse_event
  version: integer("version").notNull().default(1),
  submittedBy: integer("submitted_by").notNull(), // references scientists.id
  submissionDate: timestamp("submission_date").defaultNow(),
  dueDate: timestamp("due_date"), // For continuing reviews, etc.
  
  // Submission content
  formData: json("form_data"), // Dynamic form responses specific to submission type
  changes: text("changes"), // Description of changes for amendments
  documents: json("documents"), // Documents uploaded with this submission
  
  // Review workflow
  workflowStatus: text("workflow_status").notNull().default("submitted"), // submitted, under_review, approved, rejected, returned_for_revision
  reviewerAssignments: json("reviewer_assignments"),
  reviewComments: json("review_comments"),
  piResponses: json("pi_responses"),
  finalDecision: text("final_decision"), // approved, approved_with_modifications, disapproved
  decisionDate: timestamp("decision_date"),
  decisionRationale: text("decision_rationale"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIrbSubmissionSchema = createInsertSchema(irbSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// IRB Documents - Track all documents associated with applications
export const irbDocuments = pgTable("irb_documents", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id"), // references irbApplications.id
  submissionId: integer("submission_id"), // references irbSubmissions.id (optional, for submission-specific docs)
  documentType: text("document_type").notNull(), // protocol, consent_form, investigator_brochure, cv, etc.
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  version: integer("version").default(1),
  uploadedBy: integer("uploaded_by").notNull(), // references scientists.id
  isRequired: boolean("is_required").default(false),
  status: text("status").default("active"), // active, superseded, deleted
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIrbDocumentSchema = createInsertSchema(irbDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// IBC Applications (Institutional Biosafety Committee)
export const ibcApplications = pgTable("ibc_applications", {
  id: serial("id").primaryKey(),
  ibcNumber: text("ibc_number").notNull().unique(), // IBC Project Number
  cayuseProtocolNumber: text("cayuse_protocol_number"), // Cayuse Protocol Number
  title: text("title").notNull(),
  shortTitle: text("short_title"), // Short title for recognition
  principalInvestigatorId: integer("principal_investigator_id").notNull(), // references scientists.id
  additionalNotificationEmail: text("additional_notification_email"),
  
  // Enhanced biosafety-specific fields
  biosafetyLevel: text("biosafety_level").notNull(), // BSL-1, BSL-2, BSL-3, BSL-4
  biologicalAgents: json("biological_agents"), // List of biological agents/organisms
  chemicalAgents: json("chemical_agents"), // Chemical hazards
  radiologicalMaterials: json("radiological_materials"), // Radioactive materials
  recombinantDNA: boolean("recombinant_dna").default(false),
  humanMaterials: boolean("human_materials").default(false),
  animalWork: boolean("animal_work").default(false),
  fieldWork: boolean("field_work").default(false),
  
  // Room and facility assignments
  approvedRooms: json("approved_rooms"), // Room numbers and their biosafety levels
  containmentProcedures: text("containment_procedures"),
  wasteDisposalPlan: text("waste_disposal_plan"),
  emergencyProcedures: text("emergency_procedures"),
  
  // Personnel and training
  authorizedPersonnel: json("authorized_personnel"), // Scientists authorized for this protocol
  trainingRequirements: json("training_requirements"), // Required training courses
  medicalSurveillance: boolean("medical_surveillance").default(false),
  
  // Workflow and submission tracking
  submissionDate: timestamp("submission_date"),
  approvalDate: date("approval_date"),
  expirationDate: date("expiration_date"),
  lastReviewDate: date("last_review_date"),
  nextReviewDate: date("next_review_date"),
  
  status: text("status").notNull(), // Active, Inactive, Expired, Under Review
  workflowStatus: text("workflow_status").notNull().default("draft"), // draft, submitted, under_review, approved, rejected, etc.
  submissionType: text("submission_type").notNull().default("initial"), // initial, amendment, renewal
  version: integer("version").notNull().default(1),
  
  // Risk assessment and compliance
  riskLevel: text("risk_level").notNull(), // low, moderate, high
  requiresMonitoring: boolean("requires_monitoring").default(false),
  monitoringFrequency: text("monitoring_frequency"), // monthly, quarterly, annually
  reportingRequirements: text("reporting_requirements"),
  
  // Review and decision tracking
  reviewerAssignments: json("reviewer_assignments"), // Assigned IBC reviewers
  reviewComments: json("review_comments"), // IBC reviewer feedback
  piResponses: json("pi_responses"), // PI responses to reviewer comments
  protocolTeamMembers: json("protocol_team_members"), // Team members with roles and access
  
  description: text("description"),
  documents: json("documents"), // Store metadata for approval letters, applications, etc.
  formData: json("form_data"), // Store form-specific data
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIbcApplicationSchema = createInsertSchema(ibcApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Junction table for IBC Applications and Research Activities (many-to-many)
export const ibcApplicationResearchActivities = pgTable("ibc_application_research_activities", {
  id: serial("id").primaryKey(),
  ibcApplicationId: integer("ibc_application_id").notNull(), // references ibcApplications.id
  researchActivityId: integer("research_activity_id").notNull(), // references researchActivities.id
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueIbcSdr: uniqueIndex().on(table.ibcApplicationId, table.researchActivityId)
}));

export const insertIbcApplicationResearchActivitySchema = createInsertSchema(ibcApplicationResearchActivities).omit({
  id: true,
  createdAt: true,
});

// Research Contracts
export const researchContracts = pgTable("research_contracts", {
  id: serial("id").primaryKey(),
  researchActivityId: integer("research_activity_id"), // references researchActivities.id
  contractNumber: text("contract_number").notNull().unique(), // Contract Number
  title: text("title").notNull(),
  leadPIId: integer("lead_pi_id"), // references scientists.id
  irbProtocol: text("irb_protocol"), // Related IRB Protocol
  ibcProtocol: text("ibc_protocol"), // Related IBC Protocol
  qnrfNumber: text("qnrf_number"), // QNRF Number if applicable
  requestState: text("request_state"), // State of the request
  startDate: date("start_date"),
  endDate: date("end_date"),
  remarks: text("remarks"),
  fundingSourceCategory: text("funding_source_category"), // QNRF, PI Fund, IRF Fund, etc.
  contractorName: text("contractor_name"),
  internalCostSidra: integer("internal_cost_sidra"), // Internal Costs by Sidra in QAR
  internalCostCounterparty: integer("internal_cost_counterparty"), // Internal Costs for Counterparty in QAR
  moneyOut: integer("money_out"), // Amount of money transferred from Sidra to counterparty
  isPORelevant: boolean("is_po_relevant").default(false), // PO relevant flag
  contractType: text("contract_type"), // Collaboration, Service, Material Transfer, etc.
  status: text("status").notNull(), // Draft, Active, Completed, Terminated, etc.
  description: text("description"),
  documents: json("documents"), // Store metadata for contract documents
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResearchContractSchema = createInsertSchema(researchContracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// IRB Board Members
export const irbBoardMembers = pgTable("irb_board_members", {
  id: serial("id").primaryKey(),
  scientistId: integer("scientist_id").notNull(), // references scientists.id
  role: text("role").notNull(), // member, chair, deputy_chair
  expertise: text("expertise").array(), // Areas of expertise
  appointmentDate: timestamp("appointment_date").defaultNow(),
  termEndDate: timestamp("term_end_date").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIrbBoardMemberSchema = createInsertSchema(irbBoardMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// IBC Board Members (similar to IRB Board Members)
export const ibcBoardMembers = pgTable("ibc_board_members", {
  id: serial("id").primaryKey(),
  scientistId: integer("scientist_id").notNull(), // references scientists.id
  role: text("role").notNull(), // member, chair, deputy_chair
  expertise: text("expertise").array(), // Areas of expertise (microbiology, biosafety, etc.)
  biosafetyTraining: json("biosafety_training"), // Training certifications
  appointmentDate: timestamp("appointment_date").defaultNow(),
  termEndDate: timestamp("term_end_date").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIbcBoardMemberSchema = createInsertSchema(ibcBoardMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// IBC Submissions (tracking workflow submissions)
export const ibcSubmissions = pgTable("ibc_submissions", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(), // references ibcApplications.id
  submissionType: text("submission_type").notNull(), // initial, amendment, renewal, continuation
  submissionDate: timestamp("submission_date").defaultNow(),
  submittedBy: integer("submitted_by").notNull(), // references scientists.id
  documents: json("documents"), // Documents submitted with this submission
  reviewStatus: text("review_status").notNull().default("pending"), // pending, in_review, approved, rejected
  reviewDate: timestamp("review_date"),
  reviewedBy: integer("reviewed_by"), // references scientists.id
  reviewComments: text("review_comments"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIbcSubmissionSchema = createInsertSchema(ibcSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// IBC Documents (tracking protocol documents)
export const ibcDocuments = pgTable("ibc_documents", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id"), // references ibcApplications.id
  submissionId: integer("submission_id"), // references ibcSubmissions.id
  documentType: text("document_type").notNull(), // protocol, sop, training_records, etc.
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  uploadedBy: integer("uploaded_by").notNull(), // references scientists.id
  uploadDate: timestamp("upload_date").defaultNow(),
  version: integer("version").notNull().default(1),
  isCurrentVersion: boolean("is_current_version").default(true),
  reviewStatus: text("review_status").default("pending"), // pending, approved, rejected
  reviewComments: text("review_comments"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIbcDocumentSchema = createInsertSchema(ibcDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Export types for all schemas
export type Program = typeof programs.$inferSelect;
export type InsertProgram = z.infer<typeof insertProgramSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Scientist = typeof scientists.$inferSelect;
export type InsertScientist = z.infer<typeof insertScientistSchema>;

export type ResearchActivity = typeof researchActivities.$inferSelect;
export type InsertResearchActivity = z.infer<typeof insertResearchActivitySchema>;

export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;

export type DataManagementPlan = typeof dataManagementPlans.$inferSelect;
export type InsertDataManagementPlan = z.infer<typeof insertDataManagementPlanSchema>;

export type Publication = typeof publications.$inferSelect;
export type InsertPublication = z.infer<typeof insertPublicationSchema>;

export type PublicationAuthor = typeof publicationAuthors.$inferSelect;
export type InsertPublicationAuthor = z.infer<typeof insertPublicationAuthorSchema>;

export type Patent = typeof patents.$inferSelect;
export type InsertPatent = z.infer<typeof insertPatentSchema>;

export type IrbApplication = typeof irbApplications.$inferSelect;
export type InsertIrbApplication = z.infer<typeof insertIrbApplicationSchema>;

export type IrbSubmission = typeof irbSubmissions.$inferSelect;
export type InsertIrbSubmission = z.infer<typeof insertIrbSubmissionSchema>;

export type IrbDocument = typeof irbDocuments.$inferSelect;
export type InsertIrbDocument = z.infer<typeof insertIrbDocumentSchema>;

export type IbcApplication = typeof ibcApplications.$inferSelect;
export type InsertIbcApplication = z.infer<typeof insertIbcApplicationSchema>;

export type IbcSubmission = typeof ibcSubmissions.$inferSelect;
export type InsertIbcSubmission = z.infer<typeof insertIbcSubmissionSchema>;

export type IbcDocument = typeof ibcDocuments.$inferSelect;
export type InsertIbcDocument = z.infer<typeof insertIbcDocumentSchema>;

export type IbcBoardMember = typeof ibcBoardMembers.$inferSelect;
export type InsertIbcBoardMember = z.infer<typeof insertIbcBoardMemberSchema>;

export type IbcApplicationResearchActivity = typeof ibcApplicationResearchActivities.$inferSelect;
export type InsertIbcApplicationResearchActivity = z.infer<typeof insertIbcApplicationResearchActivitySchema>;

export type ResearchContract = typeof researchContracts.$inferSelect;
export type InsertResearchContract = z.infer<typeof insertResearchContractSchema>;

export type IrbBoardMember = typeof irbBoardMembers.$inferSelect;
export type InsertIrbBoardMember = z.infer<typeof insertIrbBoardMemberSchema>;
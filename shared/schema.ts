import { pgTable, text, serial, integer, timestamp, boolean, json, uniqueIndex, date, numeric } from "drizzle-orm/pg-core";
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
  honorificTitle: text("honorific_title").notNull(), // Dr, Mr, Ms, Prof, etc.
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  jobTitle: text("job_title"), // Job title (Investigator, Manager, etc.)
  email: text("email").notNull().unique(),
  staffId: text("staff_id").unique(), // 5-digit staff ID for badges
  department: text("department"),
  bio: text("bio"),
  profileImageInitials: text("profile_image_initials"), // Storing initials for avatar
  supervisorId: integer("supervisor_id"), // Line manager, references scientists.id (optional)
  staffType: text("staff_type").notNull().default("scientific"), // scientific, administrative
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
  budgetHolderId: integer("budget_holder_id"), // references scientists.id (Principal Investigator/Budget Holder)
  lineManagerId: integer("line_manager_id"), // references scientists.id (legacy field, not used in forms)
  additionalNotificationEmail: text("additional_notification_email"),
  sidraBranch: text("sidra_branch"), // Research, Clinical, External
  budgetSource: text("budget_source").array(), // IRF, PI Budget, QNRF, etc.
  objectives: text("objectives"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  staffScientistId: integer("staff_scientist_id"), // references scientists.id (legacy field)
  grantCodes: text("grant_codes").array(), // Grant codes corresponding to budget sources
  // NOTE: leadScientistId removed - Lead Scientist is now managed through projectMembers table only
});

export const insertResearchActivitySchema = createInsertSchema(researchActivities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startDate: true,
  endDate: true,
}).extend({
  // Accept both Date objects and ISO string dates
  startDate: z.union([
    z.date(),
    z.string().datetime().transform((val) => new Date(val)),
    z.literal("").transform(() => undefined)
  ]).optional(),
  endDate: z.union([
    z.date(),
    z.string().datetime().transform((val) => new Date(val)),
    z.literal("").transform(() => undefined)
  ]).optional(),
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
  authors: text("authors"),
  journal: text("journal"),
  volume: text("volume"),
  issue: text("issue"),
  pages: text("pages"),
  doi: text("doi"), // Digital Object Identifier
  pmid: text("pmid"), // PubMed ID for imported publications
  publicationDate: timestamp("publication_date"),
  publicationType: text("publication_type"), // Journal Article, Conference Paper, Book, etc.
  status: text("status").default("Concept"), // Workflow status
  vettedForSubmissionByIpOffice: boolean("vetted_for_submission_by_ip_office").default(false),
  prepublicationUrl: text("prepublication_url"), // URL/DOI for prepublication
  prepublicationSite: text("prepublication_site"), // bioRxiv, arXiv, etc.
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

// Manuscript History - Track changes in title/authorship during status changes
export const manuscriptHistory = pgTable("manuscript_history", {
  id: serial("id").primaryKey(),
  publicationId: integer("publication_id").notNull(), // references publications.id
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  changedField: text("changed_field"), // 'title' or 'authors'
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedBy: integer("changed_by").notNull(), // references scientists.id
  changeReason: text("change_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertManuscriptHistorySchema = createInsertSchema(manuscriptHistory).omit({
  id: true,
  createdAt: true,
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
  irbnetIbcNumber: text("irbnet_ibc_number"), // IRBnet IBC Number
  title: text("title").notNull(),
  shortTitle: text("short_title"), // Short title for recognition
  principalInvestigatorId: integer("principal_investigator_id").notNull(), // references scientists.id
  additionalNotificationEmail: text("additional_notification_email"),
  
  // Enhanced biosafety-specific fields
  biosafetyLevel: text("biosafety_level").notNull(), // BSL-1, BSL-2, BSL-3, BSL-4
  riskGroupClassification: text("risk_group_classification"), // Risk Group 1, 2, 3, 4
  
  // Biosafety Options (mandatory yes/no questions)
  recombinantSyntheticNucleicAcid: boolean("recombinant_synthetic_nucleic_acid").default(false),
  wholeAnimalsAnimalMaterial: boolean("whole_animals_animal_material").default(false),
  
  // Sub-options for Whole Animals/Animal Material (shown when wholeAnimalsAnimalMaterial is true)
  animalMaterialSubOptions: json("animal_material_sub_options"), // Array of selected sub-options
  
  humanNonHumanPrimateMaterial: boolean("human_non_human_primate_material").default(false),
  
  // Sub-option for Human/Non-Human Primate Material
  introducingPrimateMaterialIntoAnimals: boolean("introducing_primate_material_into_animals"), // Optional field
  
  microorganismsInfectiousMaterial: boolean("microorganisms_infectious_material").default(false),
  biologicalToxins: boolean("biological_toxins").default(false),
  nanoparticles: boolean("nanoparticles").default(false),
  arthropods: boolean("arthropods").default(false),
  plants: boolean("plants").default(false),
  
  biologicalAgents: json("biological_agents"), // List of biological agents/organisms
  chemicalAgents: json("chemical_agents"), // Chemical hazards
  radiologicalMaterials: json("radiological_materials"), // Radioactive materials
  recombinantDNA: boolean("recombinant_dna").default(false),
  humanMaterials: boolean("human_materials").default(false),
  animalWork: boolean("animal_work").default(false),
  fieldWork: boolean("field_work").default(false),
  
  // Detailed Methods Section
  materialAndMethods: text("material_and_methods"), // Detailed experimental protocols
  proceduresInvolvingInfectiousAgents: text("procedures_involving_infectious_agents"),
  nucleicAcidExtractionMethods: text("nucleic_acid_extraction_methods"),
  cellCultureProcedures: text("cell_culture_procedures"),
  animalProcedures: text("animal_procedures"), // If animal work is involved
  
  // Protocol Summary Checkboxes (from Section F)
  usingRecombinantDNAForDetection: boolean("using_recombinant_dna_detection").default(false),
  creatingGenomicLibraries: boolean("creating_genomic_libraries").default(false),
  cloningVectorConstruction: boolean("cloning_vector_construction").default(false),
  expressionInCulturedCells: boolean("expression_cultured_cells").default(false),
  useOfHumanCellLines: boolean("use_human_cell_lines").default(false),
  useOfAnimalCellLines: boolean("use_animal_cell_lines").default(false),
  useOfStemCells: boolean("use_stem_cells").default(false),
  riskGroup2Or3Genes: boolean("risk_group_2_3_genes").default(false),
  administeringToAnimals: boolean("administering_to_animals").default(false),
  largeCultureVolumes: boolean("large_culture_volumes").default(false),
  infectiousVirusWork: boolean("infectious_virus_work").default(false),
  toxinGenes: boolean("toxin_genes").default(false),
  
  // Room and facility assignments
  approvedRooms: json("approved_rooms"), // Room numbers and their biosafety levels
  containmentProcedures: text("containment_procedures"),
  wasteDisposalPlan: text("waste_disposal_plan"),
  emergencyProcedures: text("emergency_procedures"),
  
  // Laboratory Policies Compliance (Section G)
  labPoliciesCompliance: json("lab_policies_compliance"), // Yes/No answers to safety checklist
  disinfectionMethods: json("disinfection_methods"), // Methods and contact times
  wasteSterilizationMethods: json("waste_sterilization_methods"),
  requiredPPE: json("required_ppe"), // Personal protective equipment per BSL
  
  // Risk Assessment (from paper form)
  hazardAssessment: json("hazard_assessment"), // Risk assessment table
  safetyControls: json("safety_controls"), // Controls in place
  additionalRecommendedControls: text("additional_recommended_controls"),
  
  // Related protocol numbers
  iacucProtocolNumber: text("iacuc_protocol_number"), // IACUC Protocol if animal work
  irbProtocolNumber: text("irb_protocol_number"), // IRB Protocol if human subjects
  
  // Personnel and training (simplified)
  medicalSurveillance: boolean("medical_surveillance").default(false),
  
  // Workflow and submission tracking
  submissionDate: timestamp("submission_date"),
  vettedDate: timestamp("vetted_date"), // When moved to vetted status
  underReviewDate: timestamp("under_review_date"), // When moved to under review status
  approvalDate: timestamp("approval_date"),
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
  reviewComments: json("review_comments"), // IBC reviewer feedback (array of comments with timestamps)
  piResponses: json("pi_responses"), // PI responses to reviewer comments
  protocolTeamMembers: json("protocol_team_members"), // Team members with roles and access
  
  description: text("description"),
  protocolSummary: text("protocol_summary"), // Key protocols/methods summary
  
  // NIH Guidelines Section III-A/B/C (High Risk)
  nihSectionABC: json("nih_section_abc"), // Section III-A/B/C requirements and approvals
  
  // NIH Guidelines Section III-D (IBC Approval Required)
  nihSectionD: json("nih_section_d"), // IBC approval requirements
  
  // NIH Guidelines Section III-E (Registration Required)
  nihSectionE: json("nih_section_e"), // Registration simultaneous with initiation
  
  // NIH Guidelines Section III-F (Exempt)
  nihSectionF: json("nih_section_f"), // Exempt experiments
  
  // NIH Guidelines Appendix C (Biological Agents)
  nihAppendixC: json("nih_appendix_c"), // Biological agent classifications
  
  // Hazardous Procedures
  hazardousProcedures: json("hazardous_procedures"), // Array of hazardous procedures with controls and PPE
  
  // Synthetic Experiments
  syntheticExperiments: json("synthetic_experiments"), // Synthetic experiments data including vectors, inserts, and exposures
  
  // Additional Details (fourth sub-tab under recombinant RNA)
  proposedBiosafetyLevels: json("proposed_biosafety_levels"), // Array of selected biosafety levels (ABSL 1, ABSL 2A, etc.)
  hostOrganismDnaPropagation: text("host_organism_dna_propagation"), // Host organism for DNA propagation
  purificationMeasures: text("purification_measures"), // Measures to avoid aerosol production during purification
  providedRestrictionVectorMaps: boolean("provided_restriction_vector_maps"), // Yes/No - provided maps to biosafety office
  viralGenomeRegionsAltered: text("viral_genome_regions_altered"), // Viral genome regions deleted/altered
  assayingWildTypeViral: boolean("assaying_wild_type_viral"), // Yes/No - assaying for wild-type viral particles

  // Transport/Shipping Section
  deviatingFromLocalTransport: boolean("deviating_from_local_transport"), // Yes/No - deviating from local transport standard practice
  deviatingFromLocalTransportDetails: text("deviating_from_local_transport_details"), // Details if deviating from local transport
  transportingBioHazardousToOffCampus: boolean("transporting_bio_hazardous_to_off_campus"), // Yes/No - transporting bio-hazardous materials to off campus
  transportingBioHazardousToOffCampusDetails: text("transporting_bio_hazardous_to_off_campus_details"), // Details if transporting bio-hazardous to off campus
  receivingBiologicalFromOffCampus: boolean("receiving_biological_from_off_campus"), // Yes/No - receiving biological samples from off campus locations

  // Dual Use Section
  dualUseAgentsAndToxins: json("dual_use_agents_and_toxins"), // Array of selected agents and toxins
  dualUseCategoriesApply: boolean("dual_use_categories_apply"), // Yes/No - does work fall under dual use categories
  dualUseCategoriesExplanation: text("dual_use_categories_explanation"), // Explanation if dual use categories apply
  dualUseExperimentCategories: json("dual_use_experiment_categories"), // Array of selected experiment categories
  handleMoreThan10Liters: boolean("handle_more_than_10_liters"), // Yes/No - handling >10L culture
  geneDriveSystemCrispr: boolean("gene_drive_system_crispr"), // Yes/No - gene drive system creation
  
  documents: json("documents"), // Store metadata for approval letters, applications, etc.
  formData: json("form_data"), // Store form-specific data
  
  // Inactivation and Decontamination
  inactivationDecontamination: json("inactivation_decontamination"), // All inactivation and decontamination data
  
  // Disposal procedures
  disposal: json("disposal"), // All disposal procedure data
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// IBC Application Comments - separate table for tracking communication history
export const ibcApplicationComments = pgTable("ibc_application_comments", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(), // references ibcApplications.id
  commentType: text("comment_type").notNull(), // 'office_comment', 'reviewer_feedback', 'pi_response', 'status_change'
  authorType: text("author_type").notNull(), // 'office', 'reviewer', 'pi', 'system'
  authorId: integer("author_id"), // references scientists.id (optional for system comments)
  authorName: text("author_name").notNull(), // Display name for the comment author
  comment: text("comment").notNull(),
  recommendation: text("recommendation"), // For reviewer feedback: 'approve', 'reject', 'minor_revisions', 'major_revisions'
  statusFrom: text("status_from"), // Previous status for status change comments
  statusTo: text("status_to"), // New status for status change comments
  isInternal: boolean("is_internal").default(false), // True for office-only comments
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertIbcApplicationCommentSchema = createInsertSchema(ibcApplicationComments).omit({
  id: true,
  createdAt: true,
});

export type InsertIbcApplicationComment = z.infer<typeof insertIbcApplicationCommentSchema>;
export type IbcApplicationComment = typeof ibcApplicationComments.$inferSelect;

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

// Buildings and Rooms (Facilities Management)
export const buildings = pgTable("buildings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  description: text("description"),
  totalFloors: integer("totalFloors"),
  maxOccupancy: integer("maxOccupancy"),
  emergencyContact: text("emergencyContact"),
  safetyNotes: text("safetyNotes"),
});

export const insertBuildingSchema = createInsertSchema(buildings).omit({
  id: true,
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  buildingId: integer("buildingId").notNull(), // references buildings.id
  roomNumber: text("roomNumber").notNull(),
  floor: integer("floor"),
  roomType: text("roomType"),
  capacity: integer("capacity"),
  area: numeric("area"),
  biosafetyLevel: text("biosafetyLevel"),
  roomSupervisorId: integer("roomSupervisorId"), // references scientists.id (must have title "Investigator")
  roomManagerId: integer("roomManagerId"), // references scientists.id (must have title containing "Scientific Staff")
  certifications: json("certifications"), // Array of certification types
  availablePpe: json("availablePpe"), // Array of available PPE equipment
  equipment: text("equipment"),
  specialFeatures: text("specialFeatures"),
  accessRestrictions: text("accessRestrictions"),
  maintenanceNotes: text("maintenanceNotes"),
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
});

// IBC Application Facilities Integration
export const ibcApplicationRooms = pgTable("ibc_application_rooms", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(), // references ibcApplications.id
  roomId: integer("room_id").notNull(), // references rooms.id
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertIbcApplicationRoomSchema = createInsertSchema(ibcApplicationRooms).omit({
  id: true,
  createdAt: true,
});

// Backbone Source Room Assignments
export const ibcBackboneSourceRooms = pgTable("ibc_backbone_source_rooms", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(), // references ibcApplications.id
  backboneSource: text("backbone_source").notNull(), // Must match a backbone source from the application's synthetic experiments
  roomId: integer("room_id").notNull(), // references rooms.id (must be a room assigned to this application)
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertIbcBackboneSourceRoomSchema = createInsertSchema(ibcBackboneSourceRooms).omit({
  id: true,
  createdAt: true,
});

// PPE Usage for IBC Applications
export const ibcApplicationPpe = pgTable("ibc_application_ppe", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(), // references ibcApplications.id
  roomId: integer("room_id").notNull(), // references rooms.id (must be a room assigned to this application)
  ppeItem: text("ppe_item").notNull(), // Must be available in the room's availablePpe array
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertIbcApplicationPpeSchema = createInsertSchema(ibcApplicationPpe).omit({
  id: true,
  createdAt: true,
});

// Role permissions schema - stores access level for each role/navigation item combination
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  jobTitle: text("job_title").notNull(), // e.g., "Investigator", "PhD Student", etc.
  navigationItem: text("navigation_item").notNull(), // e.g., "facilities", "programs", etc.
  accessLevel: text("access_level").notNull(), // "hide", "view", or "edit"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Ensure unique combination of jobTitle and navigationItem
  uniqueJobTitleNavItem: uniqueIndex("unique_job_title_nav_item").on(table.jobTitle, table.navigationItem),
}));

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
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

export type ManuscriptHistory = typeof manuscriptHistory.$inferSelect;
export type InsertManuscriptHistory = z.infer<typeof insertManuscriptHistorySchema>;

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

export type Building = typeof buildings.$inferSelect;
export type InsertBuilding = z.infer<typeof insertBuildingSchema>;

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;

export type IbcApplicationRoom = typeof ibcApplicationRooms.$inferSelect;
export type InsertIbcApplicationRoom = z.infer<typeof insertIbcApplicationRoomSchema>;
export type IbcBackboneSourceRoom = typeof ibcBackboneSourceRooms.$inferSelect;
export type InsertIbcBackboneSourceRoom = z.infer<typeof insertIbcBackboneSourceRoomSchema>;
export type IbcApplicationPpe = typeof ibcApplicationPpe.$inferSelect;
export type InsertIbcApplicationPpe = z.infer<typeof insertIbcApplicationPpeSchema>;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

// Journal Impact Factors schema
export const journalImpactFactors = pgTable("journal_impact_factors", {
  id: serial("id").primaryKey(),
  journalName: text("journal_name").notNull(),
  abbreviatedJournal: text("abbreviated_journal"),
  year: integer("year").notNull(),
  publisher: text("publisher"),
  issn: text("issn"),
  eissn: text("eissn"),
  totalCites: integer("total_cites"),
  totalArticles: integer("total_articles"),
  citableItems: integer("citable_items"),
  citedHalfLife: numeric("cited_half_life", { precision: 10, scale: 3 }),
  citingHalfLife: numeric("citing_half_life", { precision: 10, scale: 3 }),
  impactFactor: numeric("impact_factor", { precision: 10, scale: 3 }), // JIF 2024
  fiveYearJif: numeric("five_year_jif", { precision: 10, scale: 3 }),
  jifWithoutSelfCites: numeric("jif_without_self_cites", { precision: 10, scale: 3 }),
  jci: numeric("jci", { precision: 10, scale: 3 }),
  quartile: text("quartile"), // Q1, Q2, Q3, Q4
  rank: integer("rank"),
  totalCitations: integer("total_citations"), // Keep for backward compatibility
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create unique index for journal + year combination

export const insertJournalImpactFactorSchema = createInsertSchema(journalImpactFactors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertJournalImpactFactor = z.infer<typeof insertJournalImpactFactorSchema>;
export type JournalImpactFactor = typeof journalImpactFactors.$inferSelect;

// Grants schema
export const grants = pgTable("grants", {
  id: serial("id").primaryKey(),
  cycle: text("cycle"), // Grant cycle (e.g., "2023-1")
  projectNumber: text("project_number").notNull().unique(), // Project identifier
  lpiId: integer("lpi_id"), // Lead Principal Investigator (references scientists.id)
  researcherId: integer("researcher_id"), // Researcher/Clinician (references scientists.id)
  title: text("title").notNull(),
  requestedAmount: numeric("requested_amount", { precision: 12, scale: 2 }), // Amount requested
  awardedAmount: numeric("awarded_amount", { precision: 12, scale: 2 }), // Amount awarded
  submittedYear: integer("submitted_year"), // Year grant was submitted
  awarded: boolean("awarded").default(false), // Whether the grant was awarded (Yes/No)
  awardedYear: integer("awarded_year"), // Year grant was awarded
  runningTimeYears: integer("running_time_years"), // How many years the grant has been running
  currentGrantYear: text("current_grant_year"), // What year we are in (e.g., "1/3", "2/5")
  status: text("status").notNull().default("submitted"), // active, completed, cancelled, etc.
  startDate: date("start_date"), // Grant start date
  endDate: date("end_date"), // Grant end date
  collaborators: text("collaborators").array(), // Array of collaborator names/institutions
  description: text("description"), // Grant description/abstract
  fundingAgency: text("funding_agency"), // Funding source/agency
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGrantSchema = createInsertSchema(grants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGrant = z.infer<typeof insertGrantSchema>;
export type Grant = typeof grants.$inferSelect;
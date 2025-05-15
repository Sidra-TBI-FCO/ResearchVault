import { pgTable, text, serial, integer, timestamp, boolean, json, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Scientists schema
export const scientists = pgTable("scientists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title"),
  email: text("email").notNull().unique(),
  department: text("department"),
  role: text("role"),
  bio: text("bio"),
  profileImageInitials: text("profile_image_initials"), // Storing initials for avatar
  isStaff: boolean("is_staff").default(false), // True for staff, false for principal investigators
  supervisorId: integer("supervisor_id").references(() => scientists.id), // For staff members
});

export const insertScientistSchema = createInsertSchema(scientists).omit({
  id: true
});

// Projects schema
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("planning"), // planning, active, completed, on_hold
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  leadScientistId: integer("lead_scientist_id").notNull().references(() => scientists.id),
  funding: text("funding"),
  budget: text("budget"),
  objectives: text("objectives"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Project Team Members (Many-to-Many relationship)
export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  scientistId: integer("scientist_id").notNull().references(() => scientists.id),
  role: text("role"), // PI, Co-PI, Researcher, Lab Technician, etc.
}, (table) => {
  return {
    projectScientistIdx: uniqueIndex("project_scientist_idx").on(table.projectId, table.scientistId),
  };
});

export const insertProjectMemberSchema = createInsertSchema(projectMembers).omit({
  id: true,
});

// Data Management Plans
export const dataManagementPlans = pgTable("data_management_plans", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
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
  projectId: integer("project_id").references(() => projects.id),
  status: text("status"), // Published, Submitted, In Preparation, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPublicationSchema = createInsertSchema(publications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Patents
export const patents = pgTable("patents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  inventors: text("inventors").notNull(),
  filingDate: timestamp("filing_date"),
  grantDate: timestamp("grant_date"),
  patentNumber: text("patent_number"),
  status: text("status").notNull(), // Filed, Granted, Rejected, etc.
  description: text("description"),
  projectId: integer("project_id").references(() => projects.id),
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
  projectId: integer("project_id").notNull().references(() => projects.id),
  title: text("title").notNull(),
  principalInvestigatorId: integer("principal_investigator_id").notNull().references(() => scientists.id),
  submissionDate: timestamp("submission_date"),
  approvalDate: timestamp("approval_date"),
  expirationDate: timestamp("expiration_date"),
  status: text("status").notNull(), // Submitted, Approved, Rejected, Expired, etc.
  protocolNumber: text("protocol_number"),
  riskLevel: text("risk_level"), // Minimal, Greater Than Minimal, etc.
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIrbApplicationSchema = createInsertSchema(irbApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// IBC Applications (Institutional Biosafety Committee)
export const ibcApplications = pgTable("ibc_applications", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  title: text("title").notNull(),
  principalInvestigatorId: integer("principal_investigator_id").notNull().references(() => scientists.id),
  submissionDate: timestamp("submission_date"),
  approvalDate: timestamp("approval_date"),
  expirationDate: timestamp("expiration_date"),
  status: text("status").notNull(), // Submitted, Approved, Rejected, Expired, etc.
  protocolNumber: text("protocol_number"),
  biosafetyLevel: text("biosafety_level"), // BSL-1, BSL-2, BSL-3, BSL-4
  description: text("description"),
  agents: text("agents"), // Biological agents used
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIbcApplicationSchema = createInsertSchema(ibcApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Research Contracts
export const researchContracts = pgTable("research_contracts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  title: text("title").notNull(),
  contractorName: text("contractor_name").notNull(),
  contractType: text("contract_type"), // Collaboration, Service, Material Transfer, etc.
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  value: text("value"), // Financial value
  status: text("status").notNull(), // Draft, Active, Completed, Terminated, etc.
  description: text("description"),
  principalInvestigatorId: integer("principal_investigator_id").references(() => scientists.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResearchContractSchema = createInsertSchema(researchContracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Export types for all schemas
export type Scientist = typeof scientists.$inferSelect;
export type InsertScientist = z.infer<typeof insertScientistSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;

export type DataManagementPlan = typeof dataManagementPlans.$inferSelect;
export type InsertDataManagementPlan = z.infer<typeof insertDataManagementPlanSchema>;

export type Publication = typeof publications.$inferSelect;
export type InsertPublication = z.infer<typeof insertPublicationSchema>;

export type Patent = typeof patents.$inferSelect;
export type InsertPatent = z.infer<typeof insertPatentSchema>;

export type IrbApplication = typeof irbApplications.$inferSelect;
export type InsertIrbApplication = z.infer<typeof insertIrbApplicationSchema>;

export type IbcApplication = typeof ibcApplications.$inferSelect;
export type InsertIbcApplication = z.infer<typeof insertIbcApplicationSchema>;

export type ResearchContract = typeof researchContracts.$inferSelect;
export type InsertResearchContract = z.infer<typeof insertResearchContractSchema>;

// User schema (keeping the original user schema as it might be used for authentication)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

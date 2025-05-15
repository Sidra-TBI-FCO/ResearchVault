import { db } from "../server/db";
import { sql, eq } from "drizzle-orm";
import {
  users, insertUserSchema,
  scientists, insertScientistSchema,
  programs, insertProgramSchema,
  projectGroups, insertProjectGroupSchema,
  researchActivities, insertResearchActivitySchema,
  projectMembers, insertProjectMemberSchema,
  dataManagementPlans, insertDataManagementPlanSchema,
  publications, insertPublicationSchema,
  patents, insertPatentSchema,
  irbApplications, insertIrbApplicationSchema,
  ibcApplications, insertIbcApplicationSchema,
  researchContracts, insertResearchContractSchema
} from "../shared/schema";

async function seedDatabase() {
  console.log("Seeding database with sample data...");

  try {
    // Check if admin user already exists
    const existingAdmin = await db.select().from(users).where(eq(users.username, "admin"));
    
    let adminUser;
    if (existingAdmin.length === 0) {
      // Create admin user if it doesn't exist
      [adminUser] = await db.insert(users).values({
        username: "admin",
        password: "password123", // In a real app, this would be hashed
        name: "Administrator",
        email: "admin@example.com"
      }).returning();
      console.log("Created admin user with ID:", adminUser.id);
    } else {
      adminUser = existingAdmin[0];
      console.log("Admin user already exists with ID:", adminUser.id);
    }

    // Create scientists
    const scientistsData = [
      {
        name: "Dr. Emily Chen",
        firstName: "Emily",
        lastName: "Chen",
        title: "Principal Investigator",
        email: "emily.chen@example.com",
        department: "Genomics",
        role: "Investigator",
        bio: "Expert in precision medicine and cancer genomics",
        profileImageInitials: "EC",
        isStaff: false,
      },
      {
        name: "Dr. Michael Johnson",
        firstName: "Michael",
        lastName: "Johnson",
        title: "Investigator",
        email: "michael.johnson@example.com",
        department: "Immunology",
        role: "Investigator",
        bio: "Specializes in autoimmune disorders and immunotherapy",
        profileImageInitials: "MJ",
        isStaff: false,
      },
      {
        name: "Dr. Sarah Ahmed",
        firstName: "Sarah",
        lastName: "Ahmed",
        title: "Research Associate",
        email: "sarah.ahmed@example.com",
        department: "Neuroscience",
        role: "Data Scientist",
        bio: "Focuses on neurological disorders using ML approaches",
        profileImageInitials: "SA",
        isStaff: true,
        supervisorId: 1, // Will be updated after insertion
      },
      {
        name: "Dr. James Wilson",
        firstName: "James",
        lastName: "Wilson",
        title: "Lab Manager",
        email: "james.wilson@example.com",
        department: "Core Facilities",
        role: "Lab Operations",
        bio: "Manages laboratory operations and equipment",
        profileImageInitials: "JW",
        isStaff: true,
        supervisorId: 1, // Will be updated after insertion
      }
    ];

    const scientistsArray = [];
    for (const scientistData of scientistsData) {
      const [scientist] = await db.insert(scientists).values(scientistData).returning();
      scientistsArray.push(scientist);
      console.log(`Created scientist "${scientist.name}" with ID: ${scientist.id}`);
    }

    // Update supervisor IDs
    await db.update(scientists)
      .set({ supervisorId: scientistsArray[0].id })
      .where(sql`id = ${scientistsArray[2].id} OR id = ${scientistsArray[3].id}`);

    // Create programs (PRM)
    const programsData = [
      {
        programId: "PRM-001",
        name: "Cancer Genomics Program",
        description: "Comprehensive research program focused on cancer genomics and personalized medicine approaches"
      },
      {
        programId: "PRM-002",
        name: "Neurological Disorders Program",
        description: "Research program investigating causes and treatments for various neurological conditions"
      },
      {
        programId: "PRM-003",
        name: "Immune Dysregulations Program",
        description: "Program focused on understanding immune system dysregulations and developing immunotherapies"
      }
    ];

    const programEntities = [];
    for (const programData of programsData) {
      const [program] = await db.insert(programs).values(programData).returning();
      programEntities.push(program);
      console.log(`Created program "${program.name}" with ID: ${program.id}`);
    }

    // Create project groups (PRJ)
    const projectGroupsData = [
      {
        projectGroupId: "PRJ-001",
        programId: programEntities[0].id,
        name: "Precision Oncology Projects",
        description: "Collection of projects focused on precision approaches in oncology",
        leadScientistId: scientistsArray[0].id
      },
      {
        projectGroupId: "PRJ-002",
        programId: programEntities[1].id,
        name: "Neurodegenerative Diseases",
        description: "Projects investigating mechanisms and treatments for neurodegenerative disorders",
        leadScientistId: scientistsArray[2].id
      },
      {
        projectGroupId: "PRJ-003",
        programId: programEntities[2].id,
        name: "Autoimmune Research",
        description: "Research projects focused on autoimmune disorders and treatments",
        leadScientistId: scientistsArray[1].id
      }
    ];

    const projectGroupEntities = [];
    for (const projectGroupData of projectGroupsData) {
      const [projectGroup] = await db.insert(projectGroups).values(projectGroupData).returning();
      projectGroupEntities.push(projectGroup);
      console.log(`Created project group "${projectGroup.name}" with ID: ${projectGroup.id}`);
    }

    // Create research activities (SDR)
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    
    const oneYearFromNow = new Date(now);
    oneYearFromNow.setFullYear(now.getFullYear() + 1);

    const researchActivitiesData = [
      {
        sdrNumber: "SDR-001",
        projectGroupId: projectGroupEntities[0].id,
        title: "Genomic Profiling of Rare Cancers",
        shortTitle: "Rare Cancer Genomics",
        description: "Comprehensive genomic profiling of rare cancer types to identify novel therapeutic targets",
        status: "active",
        startDate: sixMonthsAgo,
        endDate: oneYearFromNow,
        leadPIId: scientistsArray[0].id,
        budgetHolderId: scientistsArray[0].id,
        lineManagerId: scientistsArray[3].id,
        sidraBranch: "Research",
        budgetSource: "IRF",
        objectives: "1. Perform whole-genome sequencing on 100 rare cancer samples\n2. Identify novel mutations and potential therapeutic targets\n3. Validate findings using functional studies"
      },
      {
        sdrNumber: "SDR-002",
        projectGroupId: projectGroupEntities[1].id,
        title: "Neural Circuit Mapping in Alzheimer's Disease",
        shortTitle: "Alzheimer's Neural Circuits",
        description: "Investigation of neural circuit alterations in Alzheimer's disease using advanced imaging techniques",
        status: "planning",
        startDate: now,
        endDate: oneYearFromNow,
        leadPIId: scientistsArray[2].id,
        budgetHolderId: scientistsArray[0].id,
        lineManagerId: scientistsArray[0].id,
        sidraBranch: "Research",
        budgetSource: "QNRF",
        objectives: "1. Map neural circuits in Alzheimer's disease models\n2. Identify circuit alterations associated with cognitive decline\n3. Test therapeutic approaches to restore circuit function"
      },
      {
        sdrNumber: "SDR-003",
        projectGroupId: projectGroupEntities[2].id,
        title: "Novel Immunotherapies for Autoimmune Disorders",
        shortTitle: "Autoimmune Immunotherapies",
        description: "Development and testing of novel immunotherapeutic approaches for autoimmune disorders",
        status: "active",
        startDate: sixMonthsAgo,
        endDate: oneYearFromNow,
        leadPIId: scientistsArray[1].id,
        budgetHolderId: scientistsArray[1].id,
        lineManagerId: scientistsArray[0].id,
        sidraBranch: "Clinical",
        budgetSource: "PI Budget",
        objectives: "1. Develop targeted immunotherapies for specific autoimmune disorders\n2. Test efficacy in preclinical models\n3. Initiate clinical trials for promising candidates"
      }
    ];

    const researchActivityEntities = [];
    for (const researchActivityData of researchActivitiesData) {
      const [researchActivity] = await db.insert(researchActivities).values(researchActivityData).returning();
      researchActivityEntities.push(researchActivity);
      console.log(`Created research activity "${researchActivity.title}" with ID: ${researchActivity.id}`);
    }

    // Create project members
    const projectMembersData = [
      {
        researchActivityId: researchActivityEntities[0].id,
        scientistId: scientistsArray[0].id,
        role: "Principal Investigator"
      },
      {
        researchActivityId: researchActivityEntities[0].id,
        scientistId: scientistsArray[3].id,
        role: "Lab Manager"
      },
      {
        researchActivityId: researchActivityEntities[1].id,
        scientistId: scientistsArray[2].id,
        role: "Principal Investigator"
      },
      {
        researchActivityId: researchActivityEntities[1].id,
        scientistId: scientistsArray[0].id,
        role: "Collaborator"
      },
      {
        researchActivityId: researchActivityEntities[2].id,
        scientistId: scientistsArray[1].id,
        role: "Principal Investigator"
      },
      {
        researchActivityId: researchActivityEntities[2].id,
        scientistId: scientistsArray[2].id,
        role: "Data Analyst"
      }
    ];

    for (const memberData of projectMembersData) {
      const [member] = await db.insert(projectMembers).values(memberData).returning();
      console.log(`Added member to project, ID: ${member.id}`);
    }

    // Create data management plans
    const dataManagementPlansData = [
      {
        researchActivityId: researchActivityEntities[0].id,
        dmpNumber: "DMP-001",
        title: "Data Management Plan for Genomic Profiling",
        description: "Comprehensive plan for managing genomic data from rare cancer samples",
        dataCollectionMethods: "Whole-genome sequencing, RNA-seq, and proteomics",
        dataStoragePlan: "Primary data stored on secure servers with daily backups to redundant systems",
        dataSharingPlan: "De-identified data will be shared through controlled access in compliance with patient consent",
        retentionPeriod: "10 years post-publication"
      },
      {
        researchActivityId: researchActivityEntities[1].id,
        dmpNumber: "DMP-002",
        title: "Neural Imaging Data Management Plan",
        description: "Plan for managing large-scale imaging data from neural circuit mapping",
        dataCollectionMethods: "Advanced microscopy, fMRI, and electrophysiology",
        dataStoragePlan: "Raw imaging data stored on dedicated high-capacity servers with off-site backup",
        dataSharingPlan: "Processed data to be shared via neuroscience data repositories after publication",
        retentionPeriod: "5 years post-publication"
      },
      {
        researchActivityId: researchActivityEntities[2].id,
        dmpNumber: "DMP-003",
        title: "Immunotherapy Clinical Data Management Plan",
        description: "Plan for managing clinical and laboratory data from immunotherapy trials",
        dataCollectionMethods: "Clinical assessments, immunological assays, and patient-reported outcomes",
        dataStoragePlan: "Data stored in HIPAA-compliant secure database with encrypted backups",
        dataSharingPlan: "Anonymized data to be shared with collaborators and in immunology data repositories after trial completion",
        retentionPeriod: "15 years post-publication"
      }
    ];

    for (const planData of dataManagementPlansData) {
      const [plan] = await db.insert(dataManagementPlans).values(planData).returning();
      console.log(`Created data management plan "${plan.title}" with ID: ${plan.id}`);
    }

    // Create publications
    const publicationsData = [
      {
        researchActivityId: researchActivityEntities[0].id,
        title: "Genomic Landscape of Rare Pediatric Cancers",
        abstract: "This study presents a comprehensive genomic analysis of 50 rare pediatric cancer samples, identifying novel mutational signatures and potential therapeutic targets.",
        authors: "Chen E, Wilson J, et al.",
        journal: "Nature Genetics",
        volume: "55",
        issue: "3",
        pages: "324-336",
        doi: "10.1038/ng.12345",
        publicationDate: new Date("2023-06-15"),
        publicationType: "Journal Article",
        status: "Published"
      },
      {
        researchActivityId: researchActivityEntities[2].id,
        title: "Novel Immunotherapy Approach for Treatment-Resistant Lupus",
        abstract: "This paper describes a new immunotherapeutic approach targeting specific T cell populations in treatment-resistant lupus patients.",
        authors: "Johnson M, Ahmed S, et al.",
        journal: "Journal of Immunology",
        volume: "210",
        issue: "2",
        pages: "112-125",
        doi: "10.4049/jimmunol.54321",
        publicationDate: new Date("2023-08-10"),
        publicationType: "Journal Article",
        status: "Published"
      }
    ];

    for (const publicationData of publicationsData) {
      const [publication] = await db.insert(publications).values(publicationData).returning();
      console.log(`Created publication "${publication.title}" with ID: ${publication.id}`);
    }

    // Create patents
    const patentsData = [
      {
        researchActivityId: researchActivityEntities[0].id,
        title: "Method for Identifying Novel Cancer Biomarkers Using Integrated Genomic Analysis",
        inventors: "Emily Chen, James Wilson",
        filingDate: new Date("2023-04-20"),
        status: "Filed",
        description: "A novel method combining genomic, transcriptomic, and proteomic data to identify cancer biomarkers with high specificity and sensitivity."
      },
      {
        researchActivityId: researchActivityEntities[1].id,
        title: "Neural Circuit Imaging and Analysis System for Neurodegenerative Disorders",
        inventors: "Sarah Ahmed, James Wilson",
        filingDate: new Date("2023-08-15"),
        status: "Filed",
        description: "A novel system for imaging and analyzing neural circuits in patients with neurodegenerative disorders, using advanced machine learning algorithms."
      }
    ];

    for (const patentData of patentsData) {
      const [patent] = await db.insert(patents).values(patentData).returning();
      console.log(`Created patent "${patent.title}" with ID: ${patent.id}`);
    }

    // Create IRB applications
    const twoMonthsFromNow = new Date(now);
    twoMonthsFromNow.setMonth(now.getMonth() + 2);

    const irbApplicationsData = [
      {
        researchActivityId: researchActivityEntities[0].id,
        irbNumber: "IRB-2023-057",
        irbNetNumber: "IRB00012345",
        title: "Genomic Profiling of Rare Pediatric Cancers for Therapeutic Target Identification",
        shortTitle: "Rare Pediatric Cancer Genomics",
        principalInvestigatorId: scientistsArray[0].id,
        protocolType: "Full Board",
        isInterventional: false,
        submissionDate: sixMonthsAgo,
        initialApprovalDate: new Date("2023-01-15"),
        expirationDate: new Date("2024-01-14"),
        status: "Active",
        subjectEnrollmentReasons: ["Sample Collection", "Data Collection"],
        description: "This study aims to collect and analyze genomic data from rare pediatric cancer samples to identify novel therapeutic targets.",
        documents: {
          approvalLetter: "approval_letter_2023_057.pdf",
          protocol: "protocol_2023_057.pdf"
        }
      },
      {
        researchActivityId: researchActivityEntities[2].id,
        irbNumber: "IRB-2023-102",
        irbNetNumber: "IRB00067890",
        title: "Phase I Clinical Trial of Novel Immunotherapy for Treatment-Resistant Lupus",
        shortTitle: "Immunotherapy for Lupus",
        principalInvestigatorId: scientistsArray[1].id,
        protocolType: "Full Board",
        isInterventional: true,
        submissionDate: new Date("2023-09-10"),
        initialApprovalDate: new Date("2023-10-05"),
        expirationDate: twoMonthsFromNow,
        status: "Active",
        subjectEnrollmentReasons: ["Sample Collection", "Data Collection", "Treatment"],
        description: "A phase I clinical trial to evaluate the safety and preliminary efficacy of a novel immunotherapy approach in patients with treatment-resistant lupus.",
        documents: {
          approvalLetter: "approval_letter_2023_102.pdf",
          protocol: "protocol_2023_102.pdf",
          informedConsent: "informed_consent_2023_102.pdf"
        }
      }
    ];

    for (const irbData of irbApplicationsData) {
      const [irb] = await db.insert(irbApplications).values(irbData).returning();
      console.log(`Created IRB application "${irb.irbNumber}" with ID: ${irb.id}`);
    }

    // Create IBC applications
    const ibcApplicationsData = [
      {
        researchActivityId: researchActivityEntities[0].id,
        ibcNumber: "IBC-2023-025",
        cayuseProtocolNumber: "CAYUSE-78901",
        title: "Use of Recombinant DNA in Cancer Genomics Research",
        principalInvestigatorId: scientistsArray[0].id,
        submissionDate: new Date("2023-02-10"),
        approvalDate: new Date("2023-03-05"),
        expirationDate: new Date("2024-03-04"),
        status: "Active",
        documents: {
          approvalLetter: "ibc_approval_2023_025.pdf",
          protocol: "ibc_protocol_2023_025.pdf"
        },
        peopleInvolved: [scientistsArray[0].id, scientistsArray[3].id]
      }
    ];

    for (const ibcData of ibcApplicationsData) {
      const [ibc] = await db.insert(ibcApplications).values(ibcData).returning();
      console.log(`Created IBC application "${ibc.ibcNumber}" with ID: ${ibc.id}`);
    }

    // Create research contracts
    const researchContractsData = [
      {
        researchActivityId: researchActivityEntities[2].id,
        contractNumber: "CONT-2023-078",
        title: "Collaborative Research Agreement for Immunotherapy Development",
        leadPIId: scientistsArray[1].id,
        irbProtocol: "IRB-2023-102",
        fundingSourceCategory: "Industry Collaboration",
        contractorName: "ImmuneTech Pharmaceuticals",
        internalCostSidra: 250000,
        internalCostCounterparty: 350000,
        moneyOut: 0,
        isPORelevant: true,
        contractType: "Collaboration",
        status: "Active",
        description: "Collaborative agreement with ImmuneTech Pharmaceuticals for the development and testing of novel immunotherapies for autoimmune disorders.",
        startDate: new Date("2023-10-15"),
        endDate: new Date("2024-10-14"),
        documents: {
          agreement: "contract_agreement_2023_078.pdf",
          budget: "contract_budget_2023_078.pdf"
        }
      },
      {
        researchActivityId: researchActivityEntities[1].id,
        contractNumber: "CONT-2023-045",
        title: "Data Analysis Services for Neural Circuit Mapping",
        leadPIId: scientistsArray[2].id,
        irbProtocol: "N/A",
        fundingSourceCategory: "Academic Collaboration",
        contractorName: "Neural Computing Center",
        internalCostSidra: 120000,
        internalCostCounterparty: 0,
        moneyOut: 120000,
        isPORelevant: true,
        contractType: "Service",
        status: "Active",
        description: "Contract for specialized neural data analysis services to support the Alzheimer's neural circuit mapping project.",
        startDate: new Date("2023-07-01"),
        endDate: new Date("2024-06-30"),
        documents: {
          agreement: "contract_agreement_2023_045.pdf",
          budget: "contract_budget_2023_045.pdf"
        }
      }
    ];

    for (const contractData of researchContractsData) {
      const [contract] = await db.insert(researchContracts).values(contractData).returning();
      console.log(`Created research contract "${contract.contractNumber}" with ID: ${contract.id}`);
    }

    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

seedDatabase()
  .then(() => {
    console.log("Database seeding complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Database seeding failed:", error);
    process.exit(1);
  });
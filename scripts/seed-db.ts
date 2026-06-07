import { db } from "../server/db";
import { eq } from "drizzle-orm";
import {
  users,
  scientists,
  programs,
  projects,
  researchActivities,
  projectMembers,
  dataManagementPlans,
  publications,
  patents,
  irbApplications,
  ibcApplications,
  researchContracts,
  grants,
  buildings,
  rooms,
} from "../shared/schema";

async function seedDatabase() {
  console.log("Seeding database with sample data...");

  try {
    // Check if admin user already exists
    const existingAdmin = await db.select().from(users).where(eq(users.username, "admin"));
    
    let adminUser;
    if (existingAdmin.length === 0) {
      [adminUser] = await db.insert(users).values({
        username: "admin",
        password: "password123",
        name: "Administrator",
        email: "admin@research.org",
        role: "Management"
      }).returning();
      console.log("Created admin user with ID:", adminUser.id);
    } else {
      adminUser = existingAdmin[0];
      console.log("Admin user already exists with ID:", adminUser.id);
    }

    // Create 3 Scientific Staff Members
    const scientificStaff = [
      {
        honorificTitle: "Dr",
        firstName: "Emily",
        lastName: "Chen",
        jobTitle: "Investigator",
        email: "emily.chen@research.org",
        staffId: "10001",
        department: "Genomics",
        bio: "Expert in precision medicine and cancer genomics with 15 years of research experience",
        profileImageInitials: "EC",
        staffType: "scientific",
      },
      {
        honorificTitle: "Prof",
        firstName: "Michael",
        lastName: "Johnson",
        jobTitle: "Investigator",
        email: "michael.johnson@research.org",
        staffId: "10002",
        department: "Immunology",
        bio: "Specializes in autoimmune disorders and immunotherapy development",
        profileImageInitials: "MJ",
        staffType: "scientific",
      },
      {
        honorificTitle: "Dr",
        firstName: "Sarah",
        lastName: "Ahmed",
        jobTitle: "Investigator",
        email: "sarah.ahmed@research.org",
        staffId: "10003",
        department: "Neuroscience",
        bio: "Focuses on neurological disorders using machine learning approaches",
        profileImageInitials: "SA",
        staffType: "scientific",
      },
    ];

    // Create 3 Administrative Staff Members
    const administrativeStaff = [
      {
        honorificTitle: "Mr",
        firstName: "James",
        lastName: "Wilson",
        jobTitle: "Lab Manager",
        email: "james.wilson@research.org",
        staffId: "20001",
        department: "Core Facilities",
        bio: "Manages laboratory operations and equipment across multiple research centers",
        profileImageInitials: "JW",
        staffType: "administrative",
      },
      {
        honorificTitle: "Ms",
        firstName: "Lisa",
        lastName: "Thompson",
        jobTitle: "Research Coordinator",
        email: "lisa.thompson@research.org",
        staffId: "20002",
        department: "Research Administration",
        bio: "Coordinates research projects and manages compliance documentation",
        profileImageInitials: "LT",
        staffType: "administrative",
      },
      {
        honorificTitle: "Mr",
        firstName: "David",
        lastName: "Martinez",
        jobTitle: "Grants Administrator",
        email: "david.martinez@research.org",
        staffId: "20003",
        department: "Finance",
        bio: "Manages grant applications, budgets, and financial reporting",
        profileImageInitials: "DM",
        staffType: "administrative",
      },
    ];

    const allStaffData = [...scientificStaff, ...administrativeStaff];
    const scientistsArray = [];
    
    for (const staffData of allStaffData) {
      // Check if scientist already exists
      const existing = await db.select().from(scientists).where(eq(scientists.email, staffData.email));
      if (existing.length === 0) {
        const [scientist] = await db.insert(scientists).values(staffData).returning();
        scientistsArray.push(scientist);
        console.log(`Created ${staffData.staffType} staff: ${staffData.firstName} ${staffData.lastName} (ID: ${scientist.id})`);
      } else {
        scientistsArray.push(existing[0]);
        console.log(`Staff already exists: ${staffData.firstName} ${staffData.lastName}`);
      }
    }

    // Set supervisors for administrative staff (scientific staff supervise admin staff)
    await db.update(scientists)
      .set({ supervisorId: scientistsArray[0].id })
      .where(eq(scientists.id, scientistsArray[3].id));
    await db.update(scientists)
      .set({ supervisorId: scientistsArray[1].id })
      .where(eq(scientists.id, scientistsArray[4].id));
    await db.update(scientists)
      .set({ supervisorId: scientistsArray[2].id })
      .where(eq(scientists.id, scientistsArray[5].id));

    // Create 3 Programs
    const programsData = [
      {
        programId: "PRM-001",
        name: "Cancer Genomics Program",
        description: "Comprehensive research program focused on cancer genomics and personalized medicine approaches",
        programDirectorId: scientistsArray[0].id,
      },
      {
        programId: "PRM-002",
        name: "Neurological Disorders Program",
        description: "Research program investigating causes and treatments for various neurological conditions",
        programDirectorId: scientistsArray[2].id,
      },
      {
        programId: "PRM-003",
        name: "Immune Dysregulations Program",
        description: "Program focused on understanding immune system dysregulations and developing immunotherapies",
        programDirectorId: scientistsArray[1].id,
      }
    ];

    const programEntities = [];
    for (const programData of programsData) {
      const existing = await db.select().from(programs).where(eq(programs.programId, programData.programId));
      if (existing.length === 0) {
        const [program] = await db.insert(programs).values(programData).returning();
        programEntities.push(program);
        console.log(`Created program: ${program.name} (ID: ${program.id})`);
      } else {
        programEntities.push(existing[0]);
        console.log(`Program already exists: ${programData.name}`);
      }
    }

    // Create 3 Projects
    const projectsData = [
      {
        projectId: "PRJ-001",
        programId: programEntities[0].id,
        name: "Precision Oncology Initiative",
        description: "Collection of projects focused on precision approaches in oncology",
        principalInvestigatorId: scientistsArray[0].id,
      },
      {
        projectId: "PRJ-002",
        programId: programEntities[1].id,
        name: "Neurodegenerative Disease Research",
        description: "Projects investigating mechanisms and treatments for neurodegenerative disorders",
        principalInvestigatorId: scientistsArray[2].id,
      },
      {
        projectId: "PRJ-003",
        programId: programEntities[2].id,
        name: "Autoimmune Therapy Development",
        description: "Research projects focused on autoimmune disorders and novel treatments",
        principalInvestigatorId: scientistsArray[1].id,
      }
    ];

    const projectEntities = [];
    for (const projectData of projectsData) {
      const existing = await db.select().from(projects).where(eq(projects.projectId, projectData.projectId));
      if (existing.length === 0) {
        const [project] = await db.insert(projects).values(projectData).returning();
        projectEntities.push(project);
        console.log(`Created project: ${project.name} (ID: ${project.id})`);
      } else {
        projectEntities.push(existing[0]);
        console.log(`Project already exists: ${projectData.name}`);
      }
    }

    // Create 3 Research Activities (SDR)
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    const oneYearFromNow = new Date(now);
    oneYearFromNow.setFullYear(now.getFullYear() + 1);

    const researchActivitiesData = [
      {
        sdrNumber: "SDR-2024-001",
        projectId: projectEntities[0].id,
        title: "Genomic Profiling of Rare Pediatric Cancers",
        shortTitle: "Rare Cancer Genomics",
        description: "Comprehensive genomic profiling of rare cancer types to identify novel therapeutic targets",
        status: "active",
        startDate: sixMonthsAgo,
        endDate: oneYearFromNow,
        budgetHolderId: scientistsArray[0].id,
        sidraBranch: "Research",
        budgetSource: ["IRF", "QNRF"],
        objectives: "1. Perform whole-genome sequencing on 100 rare cancer samples\n2. Identify novel mutations and potential therapeutic targets\n3. Validate findings using functional studies",
      },
      {
        sdrNumber: "SDR-2024-002",
        projectId: projectEntities[1].id,
        title: "Neural Circuit Mapping in Alzheimer's Disease",
        shortTitle: "Alzheimer's Neural Circuits",
        description: "Investigation of neural circuit alterations in Alzheimer's disease using advanced imaging techniques",
        status: "active",
        startDate: now,
        endDate: oneYearFromNow,
        budgetHolderId: scientistsArray[2].id,
        sidraBranch: "Research",
        budgetSource: ["PI Budget"],
        objectives: "1. Map neural circuits in Alzheimer's disease models\n2. Identify circuit alterations associated with cognitive decline\n3. Test therapeutic approaches to restore circuit function",
      },
      {
        sdrNumber: "SDR-2024-003",
        projectId: projectEntities[2].id,
        title: "Novel Immunotherapies for Autoimmune Disorders",
        shortTitle: "Autoimmune Immunotherapies",
        description: "Development and testing of novel immunotherapeutic approaches for autoimmune disorders",
        status: "planning",
        startDate: sixMonthsAgo,
        endDate: oneYearFromNow,
        budgetHolderId: scientistsArray[1].id,
        sidraBranch: "Clinical",
        budgetSource: ["External Grant"],
        objectives: "1. Develop targeted immunotherapies for specific autoimmune disorders\n2. Test efficacy in preclinical models\n3. Initiate clinical trials for promising candidates",
      }
    ];

    const researchActivityEntities = [];
    for (const activityData of researchActivitiesData) {
      const existing = await db.select().from(researchActivities).where(eq(researchActivities.sdrNumber, activityData.sdrNumber));
      if (existing.length === 0) {
        const [activity] = await db.insert(researchActivities).values(activityData).returning();
        researchActivityEntities.push(activity);
        console.log(`Created SDR: ${activity.sdrNumber} - ${activity.title} (ID: ${activity.id})`);
      } else {
        researchActivityEntities.push(existing[0]);
        console.log(`SDR already exists: ${activityData.sdrNumber}`);
      }
    }

    // Create project members
    const projectMembersData = [
      { researchActivityId: researchActivityEntities[0].id, scientistId: scientistsArray[0].id, role: "Principal Investigator" },
      { researchActivityId: researchActivityEntities[0].id, scientistId: scientistsArray[3].id, role: "Lab Manager" },
      { researchActivityId: researchActivityEntities[1].id, scientistId: scientistsArray[2].id, role: "Principal Investigator" },
      { researchActivityId: researchActivityEntities[1].id, scientistId: scientistsArray[0].id, role: "Collaborator" },
      { researchActivityId: researchActivityEntities[2].id, scientistId: scientistsArray[1].id, role: "Principal Investigator" },
      { researchActivityId: researchActivityEntities[2].id, scientistId: scientistsArray[4].id, role: "Research Coordinator" },
    ];

    for (const memberData of projectMembersData) {
      try {
        await db.insert(projectMembers).values(memberData).returning();
        console.log(`Added project member to SDR ID ${memberData.researchActivityId}`);
      } catch (e) {
        console.log(`Project member already exists or error: ${e}`);
      }
    }

    // Create 3 Data Management Plans
    const dataManagementPlansData = [
      {
        researchActivityId: researchActivityEntities[0].id,
        dmpNumber: "DMP-2024-001",
        title: "Data Management Plan for Genomic Profiling",
        description: "Comprehensive plan for managing genomic data from rare cancer samples",
        dataCollectionMethods: "Whole-genome sequencing, RNA-seq, and proteomics",
        dataStoragePlan: "Primary data stored on secure servers with daily backups",
        dataSharingPlan: "De-identified data will be shared through controlled access",
        retentionPeriod: "10 years post-publication",
      },
      {
        researchActivityId: researchActivityEntities[1].id,
        dmpNumber: "DMP-2024-002",
        title: "Neural Imaging Data Management Plan",
        description: "Plan for managing large-scale imaging data from neural circuit mapping",
        dataCollectionMethods: "Advanced microscopy, fMRI, and electrophysiology",
        dataStoragePlan: "Raw imaging data stored on dedicated high-capacity servers",
        dataSharingPlan: "Processed data to be shared via neuroscience repositories",
        retentionPeriod: "5 years post-publication",
      },
      {
        researchActivityId: researchActivityEntities[2].id,
        dmpNumber: "DMP-2024-003",
        title: "Immunotherapy Clinical Data Management Plan",
        description: "Plan for managing clinical and laboratory data from immunotherapy trials",
        dataCollectionMethods: "Clinical assessments, immunological assays, patient-reported outcomes",
        dataStoragePlan: "Data stored in HIPAA-compliant secure database",
        dataSharingPlan: "Anonymized data to be shared after trial completion",
        retentionPeriod: "15 years post-publication",
      }
    ];

    for (const planData of dataManagementPlansData) {
      const existing = await db.select().from(dataManagementPlans).where(eq(dataManagementPlans.dmpNumber, planData.dmpNumber));
      if (existing.length === 0) {
        const [plan] = await db.insert(dataManagementPlans).values(planData).returning();
        console.log(`Created DMP: ${plan.dmpNumber} (ID: ${plan.id})`);
      } else {
        console.log(`DMP already exists: ${planData.dmpNumber}`);
      }
    }

    // Create 3 Publications
    const publicationsData = [
      {
        researchActivityId: researchActivityEntities[0].id,
        title: "Genomic Landscape of Rare Pediatric Cancers: A Comprehensive Analysis",
        abstract: "This study presents a comprehensive genomic analysis of 50 rare pediatric cancer samples, identifying novel mutational signatures and potential therapeutic targets.",
        authors: "Chen E, Wilson J, Thompson L, et al.",
        journal: "Nature Genetics",
        volume: "55",
        issue: "3",
        pages: "324-336",
        doi: "10.1038/ng.2024.12345",
        publicationDate: new Date("2024-06-15"),
        publicationType: "Journal Article",
        status: "Published",
        vettedForSubmissionByIpOffice: true,
      },
      {
        researchActivityId: researchActivityEntities[1].id,
        title: "Neural Circuit Alterations in Early-Stage Alzheimer's Disease",
        abstract: "Advanced imaging techniques reveal novel neural circuit changes in early Alzheimer's disease progression.",
        authors: "Ahmed S, Chen E, Martinez D, et al.",
        journal: "Nature Neuroscience",
        volume: "24",
        issue: "7",
        pages: "892-904",
        doi: "10.1038/nn.2024.67890",
        publicationDate: new Date("2024-02-20"),
        publicationType: "Journal Article",
        status: "Accepted/In Press",
        vettedForSubmissionByIpOffice: true,
      },
      {
        researchActivityId: researchActivityEntities[2].id,
        title: "Novel Immunotherapy Approach for Treatment-Resistant Lupus",
        abstract: "This paper describes a new immunotherapeutic approach targeting specific T cell populations in treatment-resistant lupus patients.",
        authors: "Johnson M, Ahmed S, Thompson L, et al.",
        journal: "Journal of Immunology",
        volume: "210",
        issue: "2",
        pages: "112-125",
        doi: "10.4049/jimmunol.2024.54321",
        publicationDate: new Date("2024-08-10"),
        publicationType: "Journal Article",
        status: "Submitted",
        vettedForSubmissionByIpOffice: false,
      }
    ];

    for (const pubData of publicationsData) {
      const existing = await db.select().from(publications).where(eq(publications.doi, pubData.doi!));
      if (existing.length === 0) {
        const [pub] = await db.insert(publications).values(pubData).returning();
        console.log(`Created Publication: ${pub.title.substring(0, 50)}... (ID: ${pub.id})`);
      } else {
        console.log(`Publication already exists: ${pubData.title.substring(0, 50)}...`);
      }
    }

    // Create 3 Patents
    const patentsData = [
      {
        researchActivityId: researchActivityEntities[0].id,
        title: "Method for Identifying Novel Cancer Biomarkers Using Integrated Genomic Analysis",
        inventors: "Emily Chen, James Wilson",
        filingDate: new Date("2024-04-20"),
        status: "Filed",
        description: "A novel method combining genomic, transcriptomic, and proteomic data to identify cancer biomarkers with high specificity and sensitivity.",
      },
      {
        researchActivityId: researchActivityEntities[1].id,
        title: "Neural Circuit Imaging and Analysis System for Neurodegenerative Disorders",
        inventors: "Sarah Ahmed, James Wilson",
        filingDate: new Date("2024-08-15"),
        status: "Filed",
        description: "A novel system for imaging and analyzing neural circuits in patients with neurodegenerative disorders using advanced machine learning algorithms.",
      },
      {
        researchActivityId: researchActivityEntities[2].id,
        title: "Targeted T-Cell Modulation for Autoimmune Disease Treatment",
        inventors: "Michael Johnson, Lisa Thompson",
        filingDate: new Date("2024-02-10"),
        grantDate: new Date("2024-11-01"),
        patentNumber: "US11,234,567",
        status: "Granted",
        description: "A method for selectively modulating T-cell populations to treat autoimmune disorders while preserving protective immunity.",
      }
    ];

    for (const patentData of patentsData) {
      const existing = await db.select().from(patents).where(eq(patents.title, patentData.title));
      if (existing.length === 0) {
        const [patent] = await db.insert(patents).values(patentData).returning();
        console.log(`Created Patent: ${patent.title.substring(0, 50)}... (ID: ${patent.id})`);
      } else {
        console.log(`Patent already exists: ${patentData.title.substring(0, 50)}...`);
      }
    }

    // Create 3 IRB Applications
    const twoMonthsFromNow = new Date(now);
    twoMonthsFromNow.setMonth(now.getMonth() + 2);
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    const irbApplicationsData = [
      {
        researchActivityId: researchActivityEntities[0].id,
        irbNumber: "IRB-2024-001",
        irbNetNumber: "IRB00012345",
        title: "Genomic Profiling of Rare Pediatric Cancers for Therapeutic Target Identification",
        shortTitle: "Rare Pediatric Cancer Genomics",
        principalInvestigatorId: scientistsArray[0].id,
        protocolType: "Full Board",
        isInterventional: false,
        submissionDate: oneYearAgo,
        initialApprovalDate: "2024-01-15",
        expirationDate: "2025-01-14",
        status: "Active",
        workflowStatus: "approved",
        subjectEnrollmentReasons: ["Sample Collection", "Data Collection"],
        description: "This study aims to collect and analyze genomic data from rare pediatric cancer samples to identify novel therapeutic targets.",
        riskLevel: "minimal",
      },
      {
        researchActivityId: researchActivityEntities[1].id,
        irbNumber: "IRB-2024-002",
        irbNetNumber: "IRB00067890",
        title: "Neural Imaging Study in Alzheimer's Disease Patients",
        shortTitle: "Alzheimer's Imaging Study",
        principalInvestigatorId: scientistsArray[2].id,
        protocolType: "Expedited",
        isInterventional: false,
        submissionDate: sixMonthsAgo,
        initialApprovalDate: "2024-06-20",
        expirationDate: "2025-06-19",
        status: "Active",
        workflowStatus: "approved",
        subjectEnrollmentReasons: ["Data Collection"],
        description: "A non-interventional study to collect neural imaging data from patients with early-stage Alzheimer's disease.",
        riskLevel: "minimal",
      },
      {
        researchActivityId: researchActivityEntities[2].id,
        irbNumber: "IRB-2024-003",
        irbNetNumber: "IRB00011111",
        title: "Phase I Clinical Trial of Novel Immunotherapy for Treatment-Resistant Lupus",
        shortTitle: "Immunotherapy for Lupus",
        principalInvestigatorId: scientistsArray[1].id,
        protocolType: "Full Board",
        isInterventional: true,
        submissionDate: new Date("2024-09-10"),
        initialApprovalDate: "2024-10-05",
        expirationDate: twoMonthsFromNow.toISOString().split('T')[0],
        status: "Active",
        workflowStatus: "approved",
        subjectEnrollmentReasons: ["Sample Collection", "Data Collection", "Treatment"],
        description: "A phase I clinical trial to evaluate the safety and preliminary efficacy of a novel immunotherapy approach in patients with treatment-resistant lupus.",
        riskLevel: "greater_than_minimal",
      }
    ];

    for (const irbData of irbApplicationsData) {
      const existing = await db.select().from(irbApplications).where(eq(irbApplications.irbNumber, irbData.irbNumber));
      if (existing.length === 0) {
        const [irb] = await db.insert(irbApplications).values(irbData).returning();
        console.log(`Created IRB: ${irb.irbNumber} (ID: ${irb.id})`);
      } else {
        console.log(`IRB already exists: ${irbData.irbNumber}`);
      }
    }

    // Create 3 IBC Applications
    const ibcApplicationsData = [
      {
        ibcNumber: "IBC-2024-001",
        cayuseProtocolNumber: "CAYUSE-78901",
        title: "Use of Recombinant DNA in Cancer Genomics Research",
        shortTitle: "Cancer rDNA Research",
        principalInvestigatorId: scientistsArray[0].id,
        biosafetyLevel: "BSL-2",
        riskGroupClassification: "Risk Group 2",
        recombinantSyntheticNucleicAcid: true,
        recombinantDNA: true,
        submissionDate: new Date("2024-02-10"),
        approvalDate: new Date("2024-03-05"),
        expirationDate: "2025-03-04",
        status: "Active",
        workflowStatus: "approved",
        riskLevel: "moderate",
        description: "Protocol for the use of recombinant DNA techniques in cancer genomics research including lentiviral vectors for gene expression studies.",
      },
      {
        ibcNumber: "IBC-2024-002",
        cayuseProtocolNumber: "CAYUSE-78902",
        title: "Biosafety Protocol for Neuroimaging with Fluorescent Markers",
        shortTitle: "Neuro Fluorescent Markers",
        principalInvestigatorId: scientistsArray[2].id,
        biosafetyLevel: "BSL-1",
        riskGroupClassification: "Risk Group 1",
        recombinantSyntheticNucleicAcid: false,
        recombinantDNA: false,
        submissionDate: new Date("2024-05-15"),
        approvalDate: new Date("2024-06-01"),
        expirationDate: "2025-06-01",
        status: "Active",
        workflowStatus: "approved",
        riskLevel: "low",
        description: "Biosafety protocol for the use of fluorescent markers in neuroimaging studies of Alzheimer's disease models.",
      },
      {
        ibcNumber: "IBC-2024-003",
        cayuseProtocolNumber: "CAYUSE-78903",
        title: "Human Cell Line Work for Immunotherapy Development",
        shortTitle: "Immunotherapy Cell Lines",
        principalInvestigatorId: scientistsArray[1].id,
        biosafetyLevel: "BSL-2",
        riskGroupClassification: "Risk Group 2",
        humanNonHumanPrimateMaterial: true,
        useOfHumanCellLines: true,
        submissionDate: new Date("2024-07-20"),
        approvalDate: new Date("2024-08-15"),
        expirationDate: "2025-08-15",
        status: "Active",
        workflowStatus: "approved",
        riskLevel: "moderate",
        description: "Protocol for working with human cell lines in the development of novel immunotherapies for autoimmune disorders.",
      }
    ];

    for (const ibcData of ibcApplicationsData) {
      const existing = await db.select().from(ibcApplications).where(eq(ibcApplications.ibcNumber, ibcData.ibcNumber));
      if (existing.length === 0) {
        const [ibc] = await db.insert(ibcApplications).values(ibcData).returning();
        console.log(`Created IBC: ${ibc.ibcNumber} (ID: ${ibc.id})`);
      } else {
        console.log(`IBC already exists: ${ibcData.ibcNumber}`);
      }
    }

    // Create 3 Research Contracts
    const researchContractsData = [
      {
        researchActivityId: researchActivityEntities[0].id,
        contractNumber: "CNT-2024-001",
        title: "Genomic Sequencing Equipment Collaboration",
        leadPIId: scientistsArray[0].id,
        requestedByUserId: adminUser.id,
        irbProtocol: "IRB-2024-001",
        fundingSourceCategory: "Equipment Lease",
        contractorName: "GenomeTech Solutions",
        internalCostSidra: 850000,
        moneyOut: 850000,
        isPORelevant: true,
        contractType: "Service",
        status: "active",
        description: "Equipment lease agreement for next-generation genomic sequencing platform.",
        startDate: "2024-03-01",
        endDate: "2025-02-28",
        contractValue: "850000.00",
        currency: "QAR",
      },
      {
        researchActivityId: researchActivityEntities[1].id,
        contractNumber: "CNT-2024-002",
        title: "Neuroimaging Service Agreement",
        leadPIId: scientistsArray[2].id,
        requestedByUserId: adminUser.id,
        fundingSourceCategory: "Service Agreement",
        contractorName: "NeuroImage Labs Inc",
        internalCostSidra: 180000,
        moneyOut: 180000,
        isPORelevant: true,
        contractType: "Service",
        status: "active",
        description: "Specialized neuroimaging analysis services for Alzheimer's research.",
        startDate: "2024-05-01",
        endDate: "2025-04-30",
        contractValue: "180000.00",
        currency: "USD",
      },
      {
        researchActivityId: researchActivityEntities[2].id,
        contractNumber: "CNT-2024-003",
        title: "Clinical Trial Material Supply Agreement",
        leadPIId: scientistsArray[1].id,
        requestedByUserId: adminUser.id,
        irbProtocol: "IRB-2024-003",
        fundingSourceCategory: "Research Grant",
        contractorName: "BioPharm Supplies Ltd",
        internalCostSidra: 500000,
        moneyOut: 500000,
        isPORelevant: true,
        contractType: "Material Transfer",
        status: "active",
        description: "Supply agreement for clinical trial materials for immunotherapy study.",
        startDate: "2024-09-01",
        endDate: "2026-08-31",
        contractValue: "500000.00",
        currency: "QAR",
      }
    ];

    for (const contractData of researchContractsData) {
      const existing = await db.select().from(researchContracts).where(eq(researchContracts.contractNumber, contractData.contractNumber));
      if (existing.length === 0) {
        const [contract] = await db.insert(researchContracts).values(contractData).returning();
        console.log(`Created Contract: ${contract.contractNumber} (ID: ${contract.id})`);
      } else {
        console.log(`Contract already exists: ${contractData.contractNumber}`);
      }
    }

    // Create 3 Grants
    const grantsData = [
      {
        cycle: "2024-1",
        projectNumber: "NPRP-2024-001",
        lpiId: scientistsArray[0].id,
        investigatorType: "Researcher",
        title: "Precision Medicine Approaches for Rare Pediatric Cancers",
        requestedAmount: "1500000.00",
        awardedAmount: "1200000.00",
        submittedYear: 2024,
        awarded: true,
        awardedYear: 2024,
        runningTimeYears: 1,
        currentGrantYear: "1/3",
        status: "active",
        grantType: "Local",
        startDate: "2024-01-01",
        endDate: "2026-12-31",
        reportingIntervalMonths: 6,
        collaborators: ["Qatar Foundation", "Weill Cornell Medicine - Qatar"],
        description: "This grant supports precision medicine research for rare pediatric cancers, including genomic profiling and therapeutic target identification.",
        fundingAgency: "Qatar National Research Fund (QNRF)",
      },
      {
        cycle: "2024-2",
        projectNumber: "NIH-R01-2024-002",
        lpiId: scientistsArray[2].id,
        investigatorType: "Researcher",
        title: "Neural Circuit Dynamics in Alzheimer's Disease Progression",
        requestedAmount: "2000000.00",
        awardedAmount: "1800000.00",
        submittedYear: 2024,
        awarded: true,
        awardedYear: 2024,
        runningTimeYears: 1,
        currentGrantYear: "1/5",
        status: "active",
        grantType: "International",
        startDate: "2024-04-01",
        endDate: "2029-03-31",
        reportingIntervalMonths: 12,
        collaborators: ["Mayo Clinic", "Johns Hopkins University"],
        description: "NIH-funded research to map neural circuit changes in early-stage Alzheimer's disease and identify potential therapeutic targets.",
        fundingAgency: "National Institutes of Health (NIH)",
      },
      {
        cycle: "2024-1",
        projectNumber: "IRF-2024-003",
        lpiId: scientistsArray[1].id,
        investigatorType: "Clinician",
        title: "Novel Immunotherapy Development for Autoimmune Disorders",
        requestedAmount: "800000.00",
        awardedAmount: "750000.00",
        submittedYear: 2024,
        awarded: true,
        awardedYear: 2024,
        runningTimeYears: 1,
        currentGrantYear: "1/2",
        status: "active",
        grantType: "Local",
        startDate: "2024-06-01",
        endDate: "2026-05-31",
        reportingIntervalMonths: 6,
        collaborators: ["Hamad Medical Corporation"],
        description: "Internal research fund supporting the development of targeted immunotherapies for treatment-resistant autoimmune conditions.",
        fundingAgency: "Internal Research Fund (IRF)",
      }
    ];

    for (const grantData of grantsData) {
      const existing = await db.select().from(grants).where(eq(grants.projectNumber, grantData.projectNumber));
      if (existing.length === 0) {
        const [grant] = await db.insert(grants).values(grantData).returning();
        console.log(`Created Grant: ${grant.projectNumber} (ID: ${grant.id})`);
      } else {
        console.log(`Grant already exists: ${grantData.projectNumber}`);
      }
    }

    // Create Buildings and Rooms for facilities
    const buildingsData = [
      {
        name: "Research Tower A",
        address: "123 Research Campus Drive",
        description: "Main research building housing genomics and immunology labs",
        totalFloors: 8,
        maxOccupancy: 500,
        emergencyContact: "security@research.org",
        safetyNotes: "BSL-2 certified labs on floors 3-5",
      },
      {
        name: "Neuroscience Building",
        address: "456 Science Way",
        description: "Dedicated neuroscience research facility with imaging center",
        totalFloors: 4,
        maxOccupancy: 200,
        emergencyContact: "neuro-safety@research.org",
        safetyNotes: "MRI safety protocols required for floor 2",
      }
    ];

    const buildingEntities = [];
    for (const buildingData of buildingsData) {
      const existing = await db.select().from(buildings).where(eq(buildings.name, buildingData.name));
      if (existing.length === 0) {
        const [building] = await db.insert(buildings).values(buildingData).returning();
        buildingEntities.push(building);
        console.log(`Created Building: ${building.name} (ID: ${building.id})`);
      } else {
        buildingEntities.push(existing[0]);
        console.log(`Building already exists: ${buildingData.name}`);
      }
    }

    // Create Rooms
    if (buildingEntities.length > 0) {
      const roomsData = [
        {
          buildingId: buildingEntities[0].id,
          roomNumber: "301",
          floor: 3,
          roomType: "Laboratory",
          capacity: 15,
          area: "120.5",
          biosafetyLevel: "BSL-2",
          roomSupervisorId: scientistsArray[0].id,
          equipment: "Sequencing equipment, PCR machines, centrifuges",
          specialFeatures: "HEPA filtration, negative pressure",
        },
        {
          buildingId: buildingEntities[0].id,
          roomNumber: "402",
          floor: 4,
          roomType: "Laboratory",
          capacity: 12,
          area: "100.0",
          biosafetyLevel: "BSL-2",
          roomSupervisorId: scientistsArray[1].id,
          equipment: "Flow cytometry, cell culture hoods, incubators",
          specialFeatures: "Cell culture certified, UV sterilization",
        },
        {
          buildingId: buildingEntities[1].id,
          roomNumber: "201",
          floor: 2,
          roomType: "Imaging Suite",
          capacity: 5,
          area: "80.0",
          biosafetyLevel: "BSL-1",
          roomSupervisorId: scientistsArray[2].id,
          equipment: "MRI scanner, fluorescence microscopes",
          specialFeatures: "RF shielded, temperature controlled",
        }
      ];

      for (const roomData of roomsData) {
        const existing = await db.select().from(rooms).where(eq(rooms.roomNumber, roomData.roomNumber));
        if (existing.length === 0) {
          const [room] = await db.insert(rooms).values(roomData).returning();
          console.log(`Created Room: ${room.roomNumber} (ID: ${room.id})`);
        } else {
          console.log(`Room already exists: ${roomData.roomNumber}`);
        }
      }
    }

    console.log("\n=== Database Seeding Complete! ===");
    console.log("Created:");
    console.log("- 3 Scientific Staff");
    console.log("- 3 Administrative Staff");
    console.log("- 3 Programs");
    console.log("- 3 Projects");
    console.log("- 3 Research Activities (SDR)");
    console.log("- 3 Data Management Plans");
    console.log("- 3 Publications");
    console.log("- 3 Patents");
    console.log("- 3 IRB Applications");
    console.log("- 3 IBC Applications");
    console.log("- 3 Research Contracts");
    console.log("- 3 Grants");
    console.log("- 2 Buildings with 3 Rooms");
    
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

seedDatabase()
  .then(() => {
    console.log("Seed complete, exiting...");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });

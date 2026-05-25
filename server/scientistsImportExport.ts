import * as XLSX from "xlsx";
import { z } from "zod";
import { Scientist, InsertScientist } from "@shared/schema";

export const EXPORT_COLUMNS: Array<{ header: string; key: keyof Scientist | "supervisorEmail" }> = [
  { header: "Staff ID", key: "staffId" },
  { header: "Honorific Title", key: "honorificTitle" },
  { header: "First Name", key: "firstName" },
  { header: "Last Name", key: "lastName" },
  { header: "Email", key: "email" },
  { header: "Job Title", key: "jobTitle" },
  { header: "Staff Type", key: "staffType" },
  { header: "Department", key: "department" },
  { header: "Initials", key: "profileImageInitials" },
  { header: "Line Manager Email", key: "supervisorEmail" },
  { header: "ORCID ID", key: "orcidId" },
  { header: "LinkedIn URL", key: "linkedInUrl" },
  { header: "Google Scholar URL", key: "googleScholarUrl" },
  { header: "Web of Science ID", key: "webOfScienceId" },
  { header: "Bio", key: "bio" },
];

const HEADER_TO_KEY: Record<string, string> = EXPORT_COLUMNS.reduce((acc, col) => {
  acc[col.header.toLowerCase().trim()] = col.key as string;
  return acc;
}, {} as Record<string, string>);

export function scientistsToRows(scientists: Scientist[]): Record<string, any>[] {
  const idToEmail = new Map<number, string>();
  scientists.forEach(s => idToEmail.set(s.id, s.email));

  return scientists.map(s => {
    const row: Record<string, any> = {};
    for (const col of EXPORT_COLUMNS) {
      if (col.key === "supervisorEmail") {
        row[col.header] = s.supervisorId ? idToEmail.get(s.supervisorId) ?? "" : "";
      } else {
        const v = (s as any)[col.key];
        row[col.header] = v == null ? "" : v;
      }
    }
    return row;
  });
}

export function buildExportBuffer(
  scientists: Scientist[],
  format: "xlsx" | "csv"
): { buffer: Buffer; mime: string; filename: string } {
  const rows = scientistsToRows(scientists);
  const ws = XLSX.utils.json_to_sheet(rows, {
    header: EXPORT_COLUMNS.map(c => c.header),
  });
  ws["!cols"] = EXPORT_COLUMNS.map(c => ({ wch: Math.max(c.header.length + 2, 18) }));

  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(ws);
    return {
      buffer: Buffer.from(csv, "utf-8"),
      mime: "text/csv; charset=utf-8",
      filename: `staff-export-${stamp}.csv`,
    };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Staff");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return {
    buffer,
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename: `staff-export-${stamp}.xlsx`,
  };
}

export function parseUploadedFile(base64: string, fileName: string): Record<string, any>[] {
  const buf = Buffer.from(base64, "base64");
  const isCsv = fileName.toLowerCase().endsWith(".csv");
  const wb = XLSX.read(buf, { type: "buffer", raw: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("File contains no sheets");
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "", raw: false });
  return rows;
}

// Row schema for import — what we extract from each file row (without id)
const ROW_REQUIRED_HONORIFICS = ["Dr.", "Prof.", "Mr.", "Ms.", "Mrs.", "Mx.", "none"];

const fileRowSchema = z.object({
  staffId: z.string().trim().optional(),
  honorificTitle: z.string().trim().min(1, "Honorific Title is required"),
  firstName: z.string().trim().min(1, "First Name is required"),
  lastName: z.string().trim().min(1, "Last Name is required"),
  email: z.string().trim().toLowerCase().email("Invalid email"),
  jobTitle: z.string().trim().optional(),
  staffType: z.enum(["scientific", "administrative"]).default("scientific"),
  department: z.string().trim().optional(),
  profileImageInitials: z.string().trim().max(2).optional(),
  supervisorEmail: z.string().trim().toLowerCase().optional(),
  orcidId: z.string().trim().optional(),
  linkedInUrl: z.string().trim().optional(),
  googleScholarUrl: z.string().trim().optional(),
  webOfScienceId: z.string().trim().optional(),
  bio: z.string().optional(),
});

export type FileRow = z.infer<typeof fileRowSchema>;

export interface ImportRowError {
  rowNumber: number;
  identifier: string;
  errors: string[];
}

export interface ImportPreview {
  toInsert: FileRow[];
  toUpdate: Array<{ existingId: number; row: FileRow }>;
  toDelete: Array<{ id: number; email: string; name: string }>;
  errors: ImportRowError[];
  unchanged: number;
}

function normaliseRow(raw: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [header, value] of Object.entries(raw)) {
    const key = HEADER_TO_KEY[String(header).toLowerCase().trim()];
    if (!key) continue;
    out[key] = typeof value === "string" ? value : value == null ? "" : String(value);
  }
  return out;
}

export function buildImportPreview(
  fileRows: Record<string, any>[],
  existing: Scientist[]
): ImportPreview {
  const errors: ImportRowError[] = [];
  const toInsert: FileRow[] = [];
  const toUpdate: Array<{ existingId: number; row: FileRow }> = [];
  let unchanged = 0;

  const existingByEmail = new Map<string, Scientist>();
  existing.forEach(s => existingByEmail.set(s.email.toLowerCase(), s));

  const seenEmails = new Set<string>();
  const seenStaffIds = new Set<string>();
  const validRows: FileRow[] = [];

  fileRows.forEach((raw, idx) => {
    const rowNumber = idx + 2; // header row is row 1
    const normalised = normaliseRow(raw);

    // Strip empty optional strings → undefined so optional schema works
    for (const k of Object.keys(normalised)) {
      if (normalised[k] === "") normalised[k] = undefined;
    }

    const parsed = fileRowSchema.safeParse(normalised);
    const identifier =
      normalised.email ||
      `${normalised.firstName ?? ""} ${normalised.lastName ?? ""}`.trim() ||
      `row ${rowNumber}`;

    if (!parsed.success) {
      errors.push({
        rowNumber,
        identifier,
        errors: parsed.error.errors.map(e => `${e.path.join(".") || "row"}: ${e.message}`),
      });
      return;
    }

    const row = parsed.data;
    const rowErrors: string[] = [];

    if (seenEmails.has(row.email)) {
      rowErrors.push(`Duplicate email in file: ${row.email}`);
    }
    seenEmails.add(row.email);

    if (row.staffId) {
      if (seenStaffIds.has(row.staffId)) {
        rowErrors.push(`Duplicate Staff ID in file: ${row.staffId}`);
      }
      seenStaffIds.add(row.staffId);
    }

    if (row.supervisorEmail && row.supervisorEmail === row.email) {
      rowErrors.push("A staff member cannot be their own line manager");
    }

    if (rowErrors.length) {
      errors.push({ rowNumber, identifier, errors: rowErrors });
      return;
    }

    validRows.push(row);
  });

  // Second pass: resolve supervisor emails against existing + new
  const allKnownEmails = new Set<string>([
    ...Array.from(existingByEmail.keys()),
    ...validRows.map(r => r.email),
  ]);

  validRows.forEach((row, i) => {
    if (row.supervisorEmail && !allKnownEmails.has(row.supervisorEmail)) {
      const rowNumber = fileRows.findIndex(
        (r, j) => {
          const n = normaliseRow(r);
          return n.email && String(n.email).toLowerCase().trim() === row.email;
        }
      );
      errors.push({
        rowNumber: rowNumber === -1 ? i + 2 : rowNumber + 2,
        identifier: row.email,
        errors: [`Line manager email '${row.supervisorEmail}' is not in the file or current staff list`],
      });
      return;
    }

    const existingRecord = existingByEmail.get(row.email);
    if (existingRecord) {
      // Check if anything actually changed
      const supervisorIdNow = row.supervisorEmail
        ? Array.from(existingByEmail.values()).find(s => s.email.toLowerCase() === row.supervisorEmail)?.id ?? null
        : null;

      const matches =
        (existingRecord.staffId ?? "") === (row.staffId ?? "") &&
        existingRecord.honorificTitle === row.honorificTitle &&
        existingRecord.firstName === row.firstName &&
        existingRecord.lastName === row.lastName &&
        existingRecord.email.toLowerCase() === row.email &&
        (existingRecord.jobTitle ?? "") === (row.jobTitle ?? "") &&
        existingRecord.staffType === row.staffType &&
        (existingRecord.department ?? "") === (row.department ?? "") &&
        (existingRecord.profileImageInitials ?? "") === (row.profileImageInitials ?? "") &&
        (existingRecord.supervisorId ?? null) === supervisorIdNow &&
        (existingRecord.orcidId ?? "") === (row.orcidId ?? "") &&
        (existingRecord.linkedInUrl ?? "") === (row.linkedInUrl ?? "") &&
        (existingRecord.googleScholarUrl ?? "") === (row.googleScholarUrl ?? "") &&
        (existingRecord.webOfScienceId ?? "") === (row.webOfScienceId ?? "") &&
        (existingRecord.bio ?? "") === (row.bio ?? "");

      if (matches) {
        unchanged++;
      } else {
        toUpdate.push({ existingId: existingRecord.id, row });
      }
    } else {
      toInsert.push(row);
    }
  });

  // Anything in DB but not in file → delete
  const fileEmails = new Set(validRows.map(r => r.email));
  const toDelete = existing
    .filter(s => !fileEmails.has(s.email.toLowerCase()))
    .map(s => ({
      id: s.id,
      email: s.email,
      name: `${s.honorificTitle} ${s.firstName} ${s.lastName}`.trim(),
    }));

  return { toInsert, toUpdate, toDelete, errors, unchanged };
}

export function rowToInsertScientist(
  row: FileRow,
  emailToId: Map<string, number>
): InsertScientist {
  const supervisorId = row.supervisorEmail ? emailToId.get(row.supervisorEmail) ?? null : null;
  return {
    honorificTitle: row.honorificTitle,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    jobTitle: row.jobTitle ?? null,
    staffId: row.staffId ?? null,
    department: row.department ?? null,
    bio: row.bio ?? null,
    profileImageInitials:
      row.profileImageInitials ?? `${row.firstName[0] ?? ""}${row.lastName[0] ?? ""}`,
    supervisorId,
    staffType: row.staffType,
    orcidId: row.orcidId ?? null,
    linkedInUrl: row.linkedInUrl ?? null,
    googleScholarUrl: row.googleScholarUrl ?? null,
    webOfScienceId: row.webOfScienceId ?? null,
  } as InsertScientist;
}

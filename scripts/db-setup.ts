import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { createHash } from "crypto";

/**
 * A utility script to initialize the database with core data
 * This script handles:
 * 1. Checking and creating admin user if it doesn't exist
 * 2. Setting up other necessary seed data
 */
async function setupDatabase() {
  console.log("Setting up database...");
  
  try {
    // First check if the admin user exists
    let adminExists = false;
    try {
      const existingUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
      const userCount = existingUsers[0]?.count || 0;
      
      if (userCount > 0) {
        const adminUser = await db.select().from(users).where(eq(users.username, "admin"));
        adminExists = adminUser.length > 0;
        console.log("Admin user check:", adminExists ? "exists" : "doesn't exist");
      } else {
        console.log("No users found in database");
      }
    } catch (error) {
      console.warn("Error checking for admin user, table might not exist yet:", error);
    }
    
    // Create admin user if it doesn't exist
    if (!adminExists) {
      try {
        // Create a hash of the password instead of using bcrypt
        const hashedPassword = createHash('sha256').update('admin').digest('hex');
        const [user] = await db.insert(users).values({
          username: "admin",
          password: hashedPassword
        }).returning();
        
        console.log(`Created admin user with ID: ${user.id}`);
      } catch (error) {
        console.error("Error creating admin user:", error);
        // If it fails, it might be because the table doesn't exist yet or there's a constraint violation
        // We'll let the db:push command handle the schema creation
      }
    }
    
    console.log("Database setup completed successfully");
    return true;
  } catch (error) {
    console.error("Database setup failed:", error);
    return false;
  }
}

// Run the setup
setupDatabase()
  .then((success) => {
    console.log(success ? "Database setup completed" : "Database setup failed");
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Unexpected error during database setup:", error);
    process.exit(1);
  });
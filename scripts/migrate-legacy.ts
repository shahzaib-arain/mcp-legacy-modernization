import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const prisma = new PrismaClient();
const FILE_PATH = path.join(__dirname, '../nadra_records.txt');

async function main() {
  console.log('Starting migration...');

  // 1. Ensure default Admin is seeded
  const adminUsername = 'admin';
  const existingAdmin = await prisma.admin.findUnique({
    where: { username: adminUsername },
  });

  if (!existingAdmin) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    await prisma.admin.create({
      data: {
        username: adminUsername,
        password: hashedPassword,
        name: 'System Administrator',
      },
    });
    console.log('Seeded default admin user: admin / admin123');
  } else {
    console.log('Admin user already exists.');
  }

  // 2. Read and parse nadra_records.txt
  if (!fs.existsSync(FILE_PATH)) {
    console.error(`Legacy records file not found at: ${FILE_PATH}`);
    process.exit(1);
  }

  const content = fs.readFileSync(FILE_PATH, 'utf-8');
  const lines = content.split(/\r?\n/);
  
  if (lines.length === 0 || !lines[0].trim()) {
    console.error('Legacy records file is empty.');
    process.exit(1);
  }

  const totalRecords = parseInt(lines[0].trim(), 10);
  console.log(`File claims to have ${totalRecords} records.`);

  let importedCount = 0;
  let skippedCount = 0;
  
  // Each record is 7 lines long. First line is at index 1.
  let lineIndex = 1;
  for (let i = 0; i < totalRecords; i++) {
    // Check if we have enough lines left
    if (lineIndex + 6 >= lines.length) {
      console.warn(`Reached end of file early at line ${lineIndex}. Expected ${totalRecords} records, parsed ${i}.`);
      break;
    }

    const name = lines[lineIndex].trim();
    const fatherNic = lines[lineIndex + 1].trim();
    const motherName = lines[lineIndex + 2].trim();
    const birthCertificate = lines[lineIndex + 3].trim();
    const residentForm = lines[lineIndex + 4].trim();
    const maritalStatus = lines[lineIndex + 5].trim();
    const nic = lines[lineIndex + 6].trim();

    lineIndex += 7;

    // Skip empty records
    if (!nic) {
      skippedCount++;
      continue;
    }

    try {
      // Upsert to handle duplicates if any exist in the C++ file
      await prisma.citizenRecord.upsert({
        where: { nic },
        update: {
          name,
          fatherNic,
          motherName,
          birthCertificate,
          residentForm,
          maritalStatus,
        },
        create: {
          nic,
          name,
          fatherNic,
          motherName,
          birthCertificate,
          residentForm,
          maritalStatus,
        },
      });
      importedCount++;
      if (importedCount % 50 === 0) {
        console.log(`Processed ${importedCount} records...`);
      }
    } catch (error) {
      console.error(`Error importing record for NIC ${nic}:`, error);
      skippedCount++;
    }
  }

  console.log(`\nMigration completed successfully!`);
  console.log(`Total successfully imported/updated: ${importedCount}`);
  console.log(`Skipped: ${skippedCount}`);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

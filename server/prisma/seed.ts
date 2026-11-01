import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CASE_CATEGORIES = [
  {
    name: "Unpaid Wages",
    slug: "unpaid-wages",
    description:
      "Employment disputes related to withheld salary, unpaid overtime, wrongful deductions, or non-issuance of relieving documents.",
    isActive: true,
  },
  {
    name: "Tenant-Landlord Disputes",
    slug: "tenant-landlord-disputes",
    description:
      "Rental conflicts concerning security deposit refunds, illegal eviction threats, arbitrary rent increases, or maintenance obligations.",
    isActive: true,
  },
  {
    name: "Consumer Complaints",
    slug: "consumer-complaints",
    description:
      "Consumer protection disputes regarding defective products, deficiency in services, misleading claims, or denial of refunds/warranties.",
    isActive: true,
  },
];

const PRACTICE_AREAS = [
  {
    name: "Employment & Labor Law",
    slug: "employment-labor",
    description: "Legal representation for salary recovery, workplace disputes, and labor rights.",
  },
  {
    name: "Real Estate & Tenancy",
    slug: "real-estate-tenancy",
    description: "Legal assistance for rental agreements, tenant rights, eviction defense, and property matters.",
  },
  {
    name: "Consumer Protection",
    slug: "consumer-protection",
    description: "Advocacy before Consumer Disputes Redressal Commissions under the Consumer Protection Act.",
  },
  {
    name: "Civil Litigation",
    slug: "civil-litigation",
    description: "General civil recovery, breach of contract, and injunctive relief in civil courts.",
  },
];

async function seed() {
  console.log("🌱 Seeding database with initial taxonomy...");

  // Seed Case Categories
  for (const cat of CASE_CATEGORIES) {
    const record = await prisma.caseCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, isActive: cat.isActive },
      create: cat,
    });
    console.log(`  ✓ Case Category: ${record.name} (${record.slug})`);
  }

  // Seed Practice Areas
  for (const pa of PRACTICE_AREAS) {
    const record = await prisma.practiceArea.upsert({
      where: { slug: pa.slug },
      update: { name: pa.name, description: pa.description },
      create: pa,
    });
    console.log(`  ✓ Practice Area: ${record.name} (${record.slug})`);
  }

  console.log("✅ Database seeding completed successfully!");
}

seed()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

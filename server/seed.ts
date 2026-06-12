import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

// Use DIRECT_URL for seeding (direct connection — no pooler needed)
const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding TrustedNetworx CRM demo data...");

  // Reset (order matters for FKs)
  await prisma.activity.deleteMany();
  await prisma.formSubmission.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.form.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.webhook.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash("password123", 10);
  const admin = await prisma.user.create({
    data: { email: "admin@trustednetworx.com", password, name: "Alex Admin", role: "admin" },
  });
  const manager = await prisma.user.create({
    data: { email: "manager@trustednetworx.com", password, name: "Morgan Manager", role: "manager" },
  });
  console.log(`  ✓ Users: ${admin.email} / ${manager.email} (password: password123)`);

  const companySeeds = [
    { name: "Acme Manufacturing", website: "https://acme.example", industry: "Manufacturing", size: "200-500", city: "Columbus", state: "OH", leadSource: "Referral" },
    { name: "Bluewave Logistics", website: "https://bluewave.example", industry: "Logistics", size: "50-200", city: "Cleveland", state: "OH", leadSource: "Web Form" },
    { name: "Northstar Health", website: "https://northstar.example", industry: "Healthcare", size: "500+", city: "Cincinnati", state: "OH", leadSource: "Cold Outreach" },
    { name: "Pinnacle Realty", website: "https://pinnacle.example", industry: "Real Estate", size: "10-50", city: "Dayton", state: "OH", leadSource: "Event" },
    { name: "Vertex Software", website: "https://vertex.example", industry: "Technology", size: "50-200", city: "Columbus", state: "OH", leadSource: "Referral" },
  ];
  const companies = [];
  for (const c of companySeeds) {
    companies.push(await prisma.company.create({ data: { ...c, assignedUserId: admin.id } }));
  }
  console.log(`  ✓ Companies: ${companies.length}`);

  const contactSeeds = [
    { firstName: "Jane", lastName: "Cooper", title: "VP Operations", email: "jane@acme.example", phone: "614-555-0101", companyIdx: 0, leadStatus: "Qualified" },
    { firstName: "Robert", lastName: "Fox", title: "IT Director", email: "robert@bluewave.example", phone: "216-555-0144", companyIdx: 1, leadStatus: "Contacted" },
    { firstName: "Esther", lastName: "Howard", title: "CFO", email: "esther@northstar.example", phone: "513-555-0177", companyIdx: 2, leadStatus: "New" },
    { firstName: "Cameron", lastName: "Williamson", title: "Owner", email: "cameron@pinnacle.example", phone: "937-555-0190", companyIdx: 3, leadStatus: "Proposal Sent" },
    { firstName: "Brooklyn", lastName: "Simmons", title: "CTO", email: "brooklyn@vertex.example", phone: "614-555-0123", companyIdx: 4, leadStatus: "Won" },
    { firstName: "Devon", lastName: "Lane", title: "Procurement", email: "devon@acme.example", phone: "614-555-0156", companyIdx: 0, leadStatus: "New" },
  ];
  const contacts = [];
  for (const c of contactSeeds) {
    const { companyIdx, ...rest } = c;
    contacts.push(
      await prisma.contact.create({
        data: { ...rest, companyId: companies[companyIdx].id, assignedUserId: admin.id },
      })
    );
  }
  console.log(`  ✓ Contacts: ${contacts.length}`);

  const leadSeeds = [
    { name: "Acme — Network Security Audit", companyIdx: 0, contactIdx: 0, status: "Qualified", estimatedValue: 24000, source: "Referral" },
    { name: "Bluewave — Managed IT Services", companyIdx: 1, contactIdx: 1, status: "Contacted", estimatedValue: 48000, source: "Web Form" },
    { name: "Northstar — HIPAA Compliance Review", companyIdx: 2, contactIdx: 2, status: "New", estimatedValue: 36000, source: "Cold Outreach" },
    { name: "Pinnacle — VoIP Phone System", companyIdx: 3, contactIdx: 3, status: "Proposal Sent", estimatedValue: 12500, source: "Event" },
    { name: "Vertex — Cloud Migration", companyIdx: 4, contactIdx: 4, status: "Won", estimatedValue: 92000, source: "Referral" },
    { name: "Acme — Endpoint Protection Rollout", companyIdx: 0, contactIdx: 5, status: "New", estimatedValue: 18000, source: "Inbound" },
    { name: "Bluewave — Backup & DR", companyIdx: 1, contactIdx: 1, status: "Lost", estimatedValue: 15000, source: "Web Form" },
  ];
  const leads = [];
  for (const l of leadSeeds) {
    const { companyIdx, contactIdx, ...rest } = l;
    const lead = await prisma.lead.create({
      data: {
        ...rest,
        companyId: companies[companyIdx].id,
        contactId: contacts[contactIdx].id,
        assignedUserId: admin.id,
        nextFollowUp: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      },
    });
    leads.push(lead);
    await prisma.activity.create({
      data: { type: "created", description: `Lead "${lead.name}" created`, leadId: lead.id, userId: admin.id },
    });
  }
  console.log(`  ✓ Leads: ${leads.length}`);

  // Sample activities on the first lead
  await prisma.activity.create({
    data: { type: "call", description: "Discovery call — discussed current firewall setup and pain points.", leadId: leads[0].id, userId: admin.id },
  });
  await prisma.activity.create({
    data: { type: "email", description: "Sent follow-up email with audit scope and pricing.", leadId: leads[0].id, userId: manager.id },
  });

  // Sample lead-capture form
  await prisma.form.create({
    data: {
      name: "Contact Us",
      fields: JSON.stringify([
        { name: "name", label: "Full Name", type: "text", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "phone", label: "Phone", type: "tel", required: false },
        { name: "company", label: "Company", type: "text", required: false },
        { name: "message", label: "How can we help?", type: "textarea", required: true },
      ]),
      confirmationMessage: "Thanks for reaching out! A TrustedNetworx specialist will contact you within one business day.",
      notifyEmail: "sales@trustednetworx.com",
      spamProtection: true,
    },
  });
  console.log("  ✓ Sample form: Contact Us");

  console.log("\n✅ Seed complete. Log in with admin@trustednetworx.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

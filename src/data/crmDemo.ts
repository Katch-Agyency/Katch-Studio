import type { Lead, Profile } from "@/types";

/* ============================================================
   Demo CRM data — realistic seed team + leads, mirroring the
   example in the Employee Management spec:

     Ahmed (3) · Mohamed (5) · Ali (0)

   Seeded once per workspace (profiles empty + never seeded).
   ============================================================ */

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export function buildDemoTeam(): Profile[] {
  const team: Array<Omit<Profile, "createdAt" | "updatedAt"> & { h: number }> = [
    {
      id: "emp-ziad",
      name: "Ziad Essam",
      role: "Admin",
      status: "active",
      phone: "+20 100 111 2233",
      email: "ziad@katch.agency",
      h: 24 * 30,
    },
    {
      id: "emp-ahmed",
      name: "Ahmed Hassan",
      role: "Sales",
      status: "active",
      phone: "+20 101 222 3344",
      email: "ahmed@katch.agency",
      h: 24 * 28,
    },
    {
      id: "emp-mohamed",
      name: "Mohamed Samir",
      role: "Sales",
      status: "active",
      phone: "+20 102 333 4455",
      email: "mohamed@katch.agency",
      h: 24 * 21,
    },
    {
      id: "emp-ali",
      name: "Ali Mostafa",
      role: "Designer",
      status: "active",
      phone: "+20 103 444 5566",
      email: "ali@katch.agency",
      h: 24 * 14,
    },
  ];
  return team.map(({ h, ...p }) => ({ ...p, createdAt: hoursAgo(h), updatedAt: hoursAgo(h) }));
}

export function buildDemoLeads(): Lead[] {
  const rows: Array<{
    id: string;
    name: string;
    company: string;
    source: string;
    status: Lead["status"];
    assignedTo: string | null;
    h: number;
  }> = [
    /* Ahmed — 3 active + 1 won = 4 total */
    { id: "lead-101", name: "Nour El Din", company: "Nour Interiors", source: "Website", status: "new", assignedTo: "emp-ahmed", h: 6 },
    { id: "lead-102", name: "Farida Adel", company: "Farida Fashion", source: "Instagram", status: "contacted", assignedTo: "emp-ahmed", h: 30 },
    { id: "lead-103", name: "Tarek Mansour", company: "Mansour Gym", source: "Referral", status: "qualified", assignedTo: "emp-ahmed", h: 76 },
    { id: "lead-104", name: "Dina Fouad", company: "Dina Cosmetics", source: "WhatsApp", status: "won", assignedTo: "emp-ahmed", h: 24 * 12 },
    /* Mohamed — 5 active = 5 total */
    { id: "lead-201", name: "Omar Khaled", company: "OK Photography", source: "Website", status: "new", assignedTo: "emp-mohamed", h: 3 },
    { id: "lead-202", name: "Salma Ashour", company: "Salma Sweets", source: "Instagram", status: "new", assignedTo: "emp-mohamed", h: 9 },
    { id: "lead-203", name: "Hany Sobhy", company: "HS Auto Care", source: "WhatsApp", status: "contacted", assignedTo: "emp-mohamed", h: 27 },
    { id: "lead-204", name: "Mariam Fathy", company: "Mariam Clinic", source: "Referral", status: "contacted", assignedTo: "emp-mohamed", h: 50 },
    { id: "lead-205", name: "Youssef Nabil", company: "YN Trading", source: "Website", status: "qualified", assignedTo: "emp-mohamed", h: 98 },
    /* Ali — 0 active, 2 historical (kept visible after any deactivation) */
    { id: "lead-301", name: "Aya Kamel", company: "Aya Events", source: "Referral", status: "won", assignedTo: "emp-ali", h: 24 * 10 },
    { id: "lead-302", name: "Karim Ezzat", company: "KE Motors", source: "Walk-in", status: "lost", assignedTo: "emp-ali", h: 24 * 20 },
    /* Unassigned — ready to try Auto Assignment */
    { id: "lead-401", name: "Habiba Sherif", company: "HS Boutique", source: "Instagram", status: "new", assignedTo: null, h: 1 },
    { id: "lead-402", name: "Mostafa Gamal", company: "MG Coffee", source: "WhatsApp", status: "new", assignedTo: null, h: 2 },
  ];
  return rows.map(({ h, ...lead }) => ({ ...lead, notes: "", createdAt: hoursAgo(h), updatedAt: hoursAgo(h) }));
}

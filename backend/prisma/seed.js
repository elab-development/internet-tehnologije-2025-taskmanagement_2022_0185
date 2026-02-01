const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function upsertUser({ email, password, firstName, lastName }) {
  const hashedPassword = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: {
      hashedPassword,
      firstName,
      lastName
    },
    create: {
      email,
      hashedPassword,
      firstName,
      lastName
    }
  });
}

async function upsertPersonalList({ name, ownerUserId }) {
  const existing = await prisma.taskList.findFirst({
    where: {
      name,
      ownerUserId,
      teamId: null
    }
  });

  if (existing) {
    return prisma.taskList.update({
      where: { id: existing.id },
      data: { archived: false },
      select: { id: true }
    });
  }

  return prisma.taskList.create({
    data: {
      name,
      ownerUserId,
      teamId: null
    },
    select: { id: true }
  });
}

async function upsertTeamList({ name, teamId }) {
  const existing = await prisma.taskList.findFirst({
    where: {
      name,
      teamId,
      ownerUserId: null
    }
  });

  if (existing) {
    return prisma.taskList.update({
      where: { id: existing.id },
      data: { archived: false },
      select: { id: true }
    });
  }

  return prisma.taskList.create({
    data: {
      name,
      teamId,
      ownerUserId: null
    },
    select: { id: true }
  });
}

async function upsertTask({
  listId,
  title,
  description,
  dueDate,
  priority,
  status,
  completedAt
}) {
  const existing = await prisma.task.findFirst({
    where: {
      listId,
      title
    }
  });

  const data = {
    listId,
    title,
    description,
    dueDate,
    priority,
    status,
    completedAt
  };

  if (existing) {
    return prisma.task.update({
      where: { id: existing.id },
      data,
      select: { id: true }
    });
  }

  return prisma.task.create({
    data,
    select: { id: true }
  });
}

async function main() {
  const owner = await upsertUser({
    email: "owner@example.com",
    password: "password123",
    firstName: "Owner",
    lastName: "User"
  });

  const member = await upsertUser({
    email: "member@example.com",
    password: "password123",
    firstName: "Member",
    lastName: "User"
  });

  let team = await prisma.team.findFirst({
    where: {
      name: "Demo Team",
      createdByUserId: owner.id
    }
  });

  if (!team) {
    team = await prisma.team.create({
      data: {
        name: "Demo Team",
        description: "Seeded demo team",
        createdByUserId: owner.id
      }
    });
  }

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: owner.id
      }
    },
    update: { role: "OWNER" },
    create: {
      teamId: team.id,
      userId: owner.id,
      role: "OWNER"
    }
  });

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: member.id
      }
    },
    update: { role: "MEMBER" },
    create: {
      teamId: team.id,
      userId: member.id,
      role: "MEMBER"
    }
  });

  const personalList = await upsertPersonalList({
    name: "Owner Personal",
    ownerUserId: owner.id
  });

  const teamList = await upsertTeamList({
    name: "Team Backlog",
    teamId: team.id
  });

  const now = new Date();
  const soon = new Date(now.getTime() + 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  await upsertTask({
    listId: teamList.id,
    title: "Upcoming task",
    description: "Due soon task for filters",
    dueDate: soon,
    priority: "MEDIUM",
    status: "TODO",
    completedAt: null
  });

  await upsertTask({
    listId: teamList.id,
    title: "Overdue task",
    description: "Overdue task for filters",
    dueDate: yesterday,
    priority: "LOW",
    status: "TODO",
    completedAt: null
  });

  await upsertTask({
    listId: personalList.id,
    title: "Finished task",
    description: "Done task should be excluded from due filters",
    dueDate: yesterday,
    priority: "LOW",
    status: "DONE",
    completedAt: new Date()
  });

  await upsertTask({
    listId: teamList.id,
    title: "High priority search",
    description: "urgent keyword for q search",
    dueDate: null,
    priority: "HIGH",
    status: "IN_PROGRESS",
    completedAt: null
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

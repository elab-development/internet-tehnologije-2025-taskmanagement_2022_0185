import { describe, expect, it } from "vitest";
import {
  addMember,
  apiFetch,
  assertError,
  authHeader,
  createPersonalList,
  createTask,
  createTeam,
  createTeamList,
  createUser,
  login
} from "./helpers";

const PASSWORD = "password123";

function uniqueEmail(prefix: string) {
  return `${prefix}+${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

async function registerUser(email: string, password: string) {
  return apiFetch("/api/auth/register", {
    method: "POST",
    body: { email, password, firstName: "Test", lastName: "User" }
  });
}

async function createUserAndLogin(prefix: string) {
  const email = uniqueEmail(prefix);
  await createUser(email, PASSWORD, "Test", "User");
  const token = await login(email, PASSWORD);
  return { email, token };
}

describe("Auth", () => {
  it("register success", async () => {
    const email = uniqueEmail("register");
    const response = await registerUser(email, PASSWORD);
    expect(response.status).toBe(201);
    expect(response.json).toBeTruthy();
    const payload = response.json as { user: { email: string } };
    expect(payload.user.email).toBe(email);
  });

  it("register invalid email", async () => {
    const response = await registerUser("bad-email", PASSWORD);
    await assertError(response, 422, "VALIDATION_ERROR");
  });

  it("register password too short", async () => {
    const response = await registerUser(uniqueEmail("short"), "short");
    await assertError(response, 422, "VALIDATION_ERROR");
  });

  it("register duplicate email", async () => {
    const email = uniqueEmail("dup");
    await registerUser(email, PASSWORD);
    const response = await registerUser(email, PASSWORD);
    await assertError(response, 409, "EMAIL_IN_USE");
  });

  it("login success returns token", async () => {
    const email = uniqueEmail("login");
    await createUser(email, PASSWORD, "Test", "User");

    const response = await apiFetch("/api/auth/login", {
      method: "POST",
      body: { email, password: PASSWORD }
    });

    expect(response.status).toBe(200);
    const payload = response.json as { token: string };
    expect(payload.token).toBeTruthy();
  });

  it("login invalid credentials", async () => {
    const email = uniqueEmail("login-bad");
    await createUser(email, PASSWORD, "Test", "User");

    const response = await apiFetch("/api/auth/login", {
      method: "POST",
      body: { email, password: "wrongpass" }
    });

    await assertError(response, 401, "INVALID_CREDENTIALS");
  });

  it("login validation error", async () => {
    const response = await apiFetch("/api/auth/login", {
      method: "POST",
      body: {}
    });

    await assertError(response, 422, "VALIDATION_ERROR");
  });

  it("me returns current user", async () => {
    const email = uniqueEmail("me");
    const user = await createUser(email, PASSWORD, "Test", "User");
    const token = await login(email, PASSWORD);

    const response = await apiFetch("/api/auth/me", {
      headers: authHeader(token)
    });

    expect(response.status).toBe(200);
    const payload = response.json as { user: { id: string } };
    expect(payload.user.id).toBe(user.id);
  });

  it("me requires auth", async () => {
    const response = await apiFetch("/api/auth/me");
    await assertError(response, 401, "UNAUTHORIZED");
  });

  it("me rejects invalid token", async () => {
    const response = await apiFetch("/api/auth/me", {
      headers: { Authorization: "Bearer invalid" }
    });
    await assertError(response, 401, "UNAUTHORIZED");
  });

  it("logout returns ok", async () => {
    const response = await apiFetch("/api/auth/logout", { method: "POST" });
    expect(response.status).toBe(200);
    const payload = response.json as { ok: boolean };
    expect(payload.ok).toBe(true);
  });
});

describe("Task lists", () => {
  it("personal list CRUD", async () => {
    const { token } = await createUserAndLogin("lists");
    const list = await createPersonalList(token, "My Personal");

    const listResponse = await apiFetch(
      "/api/task-lists?scope=personal",
      { headers: authHeader(token) }
    );
    expect(listResponse.status).toBe(200);
    const listPayload = listResponse.json as { items: { id: string }[] };
    expect(listPayload.items.some((item) => item.id === list.id)).toBe(true);

    const patchResponse = await apiFetch(`/api/task-lists/${list.id}`, {
      method: "PATCH",
      headers: authHeader(token),
      body: { name: "Renamed", archived: true }
    });
    expect(patchResponse.status).toBe(200);
    const patched = patchResponse.json as { item: { name: string; archived: boolean } };
    expect(patched.item.name).toBe("Renamed");
    expect(patched.item.archived).toBe(true);

    const deleteResponse = await apiFetch(`/api/task-lists/${list.id}`, {
      method: "DELETE",
      headers: authHeader(token)
    });
    expect(deleteResponse.status).toBe(204);
  });

  it("ownership guard blocks other users", async () => {
    const owner = await createUserAndLogin("owner-list");
    const other = await createUserAndLogin("other-list");
    const list = await createPersonalList(owner.token, "Owner List");

    const patchResponse = await apiFetch(`/api/task-lists/${list.id}`, {
      method: "PATCH",
      headers: authHeader(other.token),
      body: { name: "Hacked" }
    });
    await assertError(patchResponse, 403, "FORBIDDEN");

    const deleteResponse = await apiFetch(`/api/task-lists/${list.id}`, {
      method: "DELETE",
      headers: authHeader(other.token)
    });
    await assertError(deleteResponse, 403, "FORBIDDEN");
  });

  it("team lists enforce membership", async () => {
    const owner = await createUserAndLogin("team-owner");
    const memberUser = await createUser(uniqueEmail("team-member"), PASSWORD, "Mem", "User");
    const memberToken = await login(memberUser.email, PASSWORD);
    const outsider = await createUserAndLogin("team-outsider");

    const team = await createTeam(owner.token, "Team One", "Desc");
    await addMember(owner.token, team.id, memberUser.email);

    const teamList = await createTeamList(owner.token, team.id, "Team List");

    const memberListResponse = await apiFetch(
      `/api/task-lists?scope=team&teamId=${team.id}`,
      { headers: authHeader(memberToken) }
    );
    expect(memberListResponse.status).toBe(200);
    const memberPayload = memberListResponse.json as { items: { id: string }[] };
    expect(memberPayload.items.some((item) => item.id === teamList.id)).toBe(true);

    const outsiderResponse = await apiFetch(
      `/api/task-lists?scope=team&teamId=${team.id}`,
      { headers: authHeader(outsider.token) }
    );
    await assertError(outsiderResponse, 403, "FORBIDDEN");

    const outsiderCreateResponse = await apiFetch("/api/task-lists", {
      method: "POST",
      headers: authHeader(outsider.token),
      body: { name: "Nope", scope: "team", teamId: team.id }
    });
    await assertError(outsiderCreateResponse, 403, "FORBIDDEN");
  });
});

describe("Tasks", () => {
  it("task CRUD", async () => {
    const owner = await createUserAndLogin("task-crud");
    const list = await createPersonalList(owner.token, "Task List");

    const task = await createTask(owner.token, list.id, {
      title: "First",
      description: "desc",
      dueDate: null,
      priority: "LOW",
      status: "TODO"
    });

    const patchResponse = await apiFetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: authHeader(owner.token),
      body: {
        title: "Updated",
        description: "new",
        dueDate: new Date().toISOString(),
        priority: "HIGH"
      }
    });
    expect(patchResponse.status).toBe(200);
    const patched = patchResponse.json as { item: { title: string; priority: string } };
    expect(patched.item.title).toBe("Updated");
    expect(patched.item.priority).toBe("HIGH");

    const deleteResponse = await apiFetch(`/api/tasks/${task.id}`, {
      method: "DELETE",
      headers: authHeader(owner.token)
    });
    expect(deleteResponse.status).toBe(204);
  });

  it("task access requires list access", async () => {
    const owner = await createUserAndLogin("task-owner");
    const other = await createUserAndLogin("task-other");
    const list = await createPersonalList(owner.token, "Task List");
    const task = await createTask(owner.token, list.id, {
      title: "Secret",
      description: null,
      dueDate: null,
      priority: "LOW",
      status: "TODO"
    });

    const createResponse = await apiFetch("/api/tasks", {
      method: "POST",
      headers: authHeader(other.token),
      body: {
        listId: list.id,
        title: "Hacked",
        priority: "LOW",
        status: "TODO"
      }
    });
    await assertError(createResponse, 403, "FORBIDDEN");

    const listResponse = await apiFetch(
      `/api/tasks?listId=${list.id}`,
      { headers: authHeader(other.token) }
    );
    await assertError(listResponse, 403, "FORBIDDEN");

    const patchResponse = await apiFetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: authHeader(other.token),
      body: { title: "Nope" }
    });
    await assertError(patchResponse, 403, "FORBIDDEN");

    const deleteResponse = await apiFetch(`/api/tasks/${task.id}`, {
      method: "DELETE",
      headers: authHeader(other.token)
    });
    await assertError(deleteResponse, 403, "FORBIDDEN");
  });

  it("completedAt rules", async () => {
    const owner = await createUserAndLogin("task-done");
    const list = await createPersonalList(owner.token, "Task List");

    const doneResponse = await apiFetch("/api/tasks", {
      method: "POST",
      headers: authHeader(owner.token),
      body: {
        listId: list.id,
        title: "Done now",
        priority: "LOW",
        status: "DONE"
      }
    });
    expect(doneResponse.status).toBe(201);
    const donePayload = doneResponse.json as { item: { completedAt: string | null } };
    expect(donePayload.item.completedAt).toBeTruthy();

    const todoResponse = await apiFetch("/api/tasks", {
      method: "POST",
      headers: authHeader(owner.token),
      body: {
        listId: list.id,
        title: "Todo",
        priority: "LOW",
        status: "TODO"
      }
    });
    expect(todoResponse.status).toBe(201);
    const todoPayload = todoResponse.json as { item: { completedAt: string | null; id: string } };
    expect(todoPayload.item.completedAt).toBeNull();

    const patchDone = await apiFetch(`/api/tasks/${todoPayload.item.id}`, {
      method: "PATCH",
      headers: authHeader(owner.token),
      body: { status: "DONE" }
    });
    expect(patchDone.status).toBe(200);
    const patchDonePayload = patchDone.json as { item: { completedAt: string | null } };
    expect(patchDonePayload.item.completedAt).toBeTruthy();

    const patchTodo = await apiFetch(`/api/tasks/${todoPayload.item.id}`, {
      method: "PATCH",
      headers: authHeader(owner.token),
      body: { status: "TODO" }
    });
    expect(patchTodo.status).toBe(200);
    const patchTodoPayload = patchTodo.json as { item: { completedAt: string | null } };
    expect(patchTodoPayload.item.completedAt).toBeNull();
  });

  it("filters work", async () => {
    const owner = await createUserAndLogin("task-filters");
    const list = await createPersonalList(owner.token, "Filter List");

    const now = Date.now();
    const soon = new Date(now + 60 * 60 * 1000).toISOString();
    const overdue = new Date(now - 60 * 60 * 1000).toISOString();

    const soonTask = await createTask(owner.token, list.id, {
      title: "Soon task",
      description: "due soon",
      dueDate: soon,
      priority: "MEDIUM",
      status: "TODO"
    });

    const overdueTask = await createTask(owner.token, list.id, {
      title: "Overdue task",
      description: "due overdue",
      dueDate: overdue,
      priority: "LOW",
      status: "TODO"
    });

    const doneTask = await createTask(owner.token, list.id, {
      title: "Done task",
      description: "done",
      dueDate: soon,
      priority: "LOW",
      status: "DONE"
    });

    const searchTask = await createTask(owner.token, list.id, {
      title: "FindMe",
      description: "UniqueKeyword",
      dueDate: null,
      priority: "HIGH",
      status: "IN_PROGRESS"
    });

    const statusResponse = await apiFetch(
      `/api/tasks?listId=${list.id}&status=IN_PROGRESS`,
      { headers: authHeader(owner.token) }
    );
    const statusPayload = statusResponse.json as { items: { id: string }[] };
    expect(statusPayload.items.map((item) => item.id)).toEqual([searchTask.id]);

    const priorityResponse = await apiFetch(
      `/api/tasks?listId=${list.id}&priority=HIGH`,
      { headers: authHeader(owner.token) }
    );
    const priorityPayload = priorityResponse.json as { items: { id: string }[] };
    expect(priorityPayload.items.map((item) => item.id)).toEqual([searchTask.id]);

    const queryResponse = await apiFetch(
      `/api/tasks?listId=${list.id}&q=uniquekeyword`,
      { headers: authHeader(owner.token) }
    );
    const queryPayload = queryResponse.json as { items: { id: string }[] };
    expect(queryPayload.items.map((item) => item.id)).toEqual([searchTask.id]);

    const soonResponse = await apiFetch(
      `/api/tasks?listId=${list.id}&due=soon`,
      { headers: authHeader(owner.token) }
    );
    const soonPayload = soonResponse.json as { items: { id: string }[] };
    expect(soonPayload.items.map((item) => item.id)).toContain(soonTask.id);
    expect(soonPayload.items.map((item) => item.id)).not.toContain(overdueTask.id);
    expect(soonPayload.items.map((item) => item.id)).not.toContain(doneTask.id);

    const overdueResponse = await apiFetch(
      `/api/tasks?listId=${list.id}&due=overdue`,
      { headers: authHeader(owner.token) }
    );
    const overduePayload = overdueResponse.json as { items: { id: string }[] };
    expect(overduePayload.items.map((item) => item.id)).toContain(overdueTask.id);
    expect(overduePayload.items.map((item) => item.id)).not.toContain(soonTask.id);
  });
});

describe("Task list deletion", () => {
  it("returns LIST_NOT_EMPTY when tasks exist", async () => {
    const owner = await createUserAndLogin("list-not-empty");
    const list = await createPersonalList(owner.token, "Not Empty");

    await createTask(owner.token, list.id, {
      title: "Task",
      description: null,
      dueDate: null,
      priority: "LOW",
      status: "TODO"
    });

    const deleteResponse = await apiFetch(`/api/task-lists/${list.id}`, {
      method: "DELETE",
      headers: authHeader(owner.token)
    });
    await assertError(deleteResponse, 409, "LIST_NOT_EMPTY");

    const tasksResponse = await apiFetch(`/api/tasks?listId=${list.id}`, {
      headers: authHeader(owner.token)
    });
    const tasksPayload = tasksResponse.json as { items: { id: string }[] };
    const taskId = tasksPayload.items[0].id;

    await apiFetch(`/api/tasks/${taskId}`, {
      method: "DELETE",
      headers: authHeader(owner.token)
    });

    const deleteResponse2 = await apiFetch(`/api/task-lists/${list.id}`, {
      method: "DELETE",
      headers: authHeader(owner.token)
    });
    expect(deleteResponse2.status).toBe(204);
  });
});

describe("Teams and members", () => {
  it("lists teams with my role", async () => {
    const owner = await createUserAndLogin("teams-list");
    const team = await createTeam(owner.token, "Demo Team", "desc");

    const response = await apiFetch("/api/teams", {
      headers: authHeader(owner.token)
    });
    expect(response.status).toBe(200);
    const payload = response.json as {
      items: { team: { id: string }; myRole: string }[];
    };
    const item = payload.items.find((entry) => entry.team.id === team.id);
    expect(item?.myRole).toBe("OWNER");
  });

  it("team details require membership", async () => {
    const owner = await createUserAndLogin("team-details-owner");
    const outsider = await createUserAndLogin("team-details-outsider");
    const team = await createTeam(owner.token, "Secret Team", "desc");

    const forbidden = await apiFetch(`/api/teams/${team.id}`, {
      headers: authHeader(outsider.token)
    });
    await assertError(forbidden, 403, "FORBIDDEN");

    const okResponse = await apiFetch(`/api/teams/${team.id}`, {
      headers: authHeader(owner.token)
    });
    expect(okResponse.status).toBe(200);
    const okPayload = okResponse.json as { members: { id: string }[] };
    expect(okPayload.members.length).toBeGreaterThan(0);
  });

  it("owner can add members; non-owner cannot", async () => {
    const owner = await createUserAndLogin("add-owner");
    const memberUser = await createUser(uniqueEmail("add-member"), PASSWORD, "Mem", "User");
    const nonMember = await createUserAndLogin("add-non-owner");
    const team = await createTeam(owner.token, "Add Team", "desc");

    const addResponse = await apiFetch(`/api/teams/${team.id}/members`, {
      method: "POST",
      headers: authHeader(owner.token),
      body: { email: memberUser.email }
    });
    expect(addResponse.status).toBe(201);

    const duplicateResponse = await apiFetch(`/api/teams/${team.id}/members`, {
      method: "POST",
      headers: authHeader(owner.token),
      body: { email: memberUser.email }
    });
    await assertError(duplicateResponse, 409, "ALREADY_MEMBER");

    const missingResponse = await apiFetch(`/api/teams/${team.id}/members`, {
      method: "POST",
      headers: authHeader(owner.token),
      body: { email: "missing@example.com" }
    });
    await assertError(missingResponse, 404, "USER_NOT_FOUND");

    const forbidden = await apiFetch(`/api/teams/${team.id}/members`, {
      method: "POST",
      headers: authHeader(nonMember.token),
      body: { email: memberUser.email }
    });
    await assertError(forbidden, 403, "FORBIDDEN");
  });

  it("owner can change roles and last owner is protected", async () => {
    const owner = await createUserAndLogin("role-owner");
    const memberUser = await createUser(uniqueEmail("role-member"), PASSWORD, "Mem", "User");
    const team = await createTeam(owner.token, "Role Team", "desc");

    const initialDetails = await apiFetch(`/api/teams/${team.id}`, {
      headers: authHeader(owner.token)
    });
    const initialMembers = (initialDetails.json as { members: { id: string; user: { email: string } }[] }).members;
    const ownerMember = initialMembers.find((entry) => entry.user.email === owner.email);

    const demoteLastOwner = await apiFetch(
      `/api/teams/${team.id}/members/${ownerMember?.id}`,
      {
        method: "PATCH",
        headers: authHeader(owner.token),
        body: { role: "MEMBER" }
      }
    );
    await assertError(demoteLastOwner, 409, "OWNER_MUST_TRANSFER");

    const added = await apiFetch(`/api/teams/${team.id}/members`, {
      method: "POST",
      headers: authHeader(owner.token),
      body: { email: memberUser.email }
    });
    const memberPayload = added.json as { member: { id: string } };

    const promote = await apiFetch(
      `/api/teams/${team.id}/members/${memberPayload.member.id}`,
      {
        method: "PATCH",
        headers: authHeader(owner.token),
        body: { role: "OWNER" }
      }
    );
    expect(promote.status).toBe(200);
  });

  it("owner can remove member; last owner is protected", async () => {
    const owner = await createUserAndLogin("remove-owner");
    const memberUser = await createUser(uniqueEmail("remove-member"), PASSWORD, "Mem", "User");
    const team = await createTeam(owner.token, "Remove Team", "desc");

    const added = await apiFetch(`/api/teams/${team.id}/members`, {
      method: "POST",
      headers: authHeader(owner.token),
      body: { email: memberUser.email }
    });
    const memberPayload = added.json as { member: { id: string } };

    const deleteResponse = await apiFetch(
      `/api/teams/${team.id}/members/${memberPayload.member.id}`,
      {
        method: "DELETE",
        headers: authHeader(owner.token)
      }
    );
    expect(deleteResponse.status).toBe(204);

    const teamDetails = await apiFetch(`/api/teams/${team.id}`, {
      headers: authHeader(owner.token)
    });
    const members = (teamDetails.json as { members: { id: string; user: { email: string } }[] }).members;
    const ownerMember = members.find((entry) => entry.user.email === owner.email);
    const deleteOwner = await apiFetch(
      `/api/teams/${team.id}/members/${ownerMember?.id}`,
      {
        method: "DELETE",
        headers: authHeader(owner.token)
      }
    );
    await assertError(deleteOwner, 409, "OWNER_MUST_TRANSFER");
  });

  it("member can leave, last owner cannot", async () => {
    const owner = await createUserAndLogin("leave-owner");
    const memberUser = await createUser(uniqueEmail("leave-member"), PASSWORD, "Mem", "User");
    const memberToken = await login(memberUser.email, PASSWORD);
    const team = await createTeam(owner.token, "Leave Team", "desc");

    await apiFetch(`/api/teams/${team.id}/members`, {
      method: "POST",
      headers: authHeader(owner.token),
      body: { email: memberUser.email }
    });

    const leaveResponse = await apiFetch(`/api/teams/${team.id}/leave`, {
      method: "POST",
      headers: authHeader(memberToken)
    });
    expect(leaveResponse.status).toBe(200);

    const memberTeams = await apiFetch("/api/teams", {
      headers: authHeader(memberToken)
    });
    const items = (memberTeams.json as { items: { team: { id: string } }[] }).items;
    expect(items.some((item) => item.team.id === team.id)).toBe(false);

    const ownerLeave = await apiFetch(`/api/teams/${team.id}/leave`, {
      method: "POST",
      headers: authHeader(owner.token)
    });
    await assertError(ownerLeave, 409, "OWNER_MUST_TRANSFER");
  });
});

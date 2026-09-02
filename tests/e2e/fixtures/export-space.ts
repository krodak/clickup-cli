/**
 * Idempotent fixture for export e2e tests, in the personal workspace only.
 *
 * Space "E2E Export"
 *   List "Export Roadmap"
 *     [milestone] "Export initiative"        <- stands in for an initiative type
 *        "Initiative subtask A" (open)
 *        "Initiative subtask B" (closed)
 *            "Nested subtask B.1"            <- depth 2
 *     "Standalone task"                      with 2 comments, one reply, 1 attachment
 *     "Archived task"                        archived
 *   Folder "Sprints" / List "Sprint 1"
 *     "Sprint task"
 *
 * Run standalone to (re)create: node --import tsx tests/e2e/fixtures/export-space.ts
 */
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ClickUpClient, Task } from '../../../src/api.js'

export const EXPORT_SPACE_NAME = 'E2E Export'
export const ROADMAP_LIST_NAME = 'Export Roadmap'
export const SPRINT_FOLDER_NAME = 'Sprints'
export const SPRINT_LIST_NAME = 'Sprint 1'
/** `milestone` in the personal workspace; the initiative-type stand-in. */
export const INITIATIVE_ITEM_ID = 1

export interface ExportFixture {
  teamId: string
  spaceId: string
  roadmapListId: string
  sprintListId: string
  initiativeId: string
  subtaskAId: string
  subtaskBId: string
  nestedId: string
  standaloneId: string
  archivedId: string
  sprintTaskId: string
}

async function findOrCreateTask(
  client: ClickUpClient,
  listId: string,
  existing: Task[],
  name: string,
  create: () => Promise<{ id: string }>,
): Promise<string> {
  const hit = existing.find(t => t.name === name)
  if (hit) return hit.id
  const created = await create()
  return created.id
}

export async function ensureExportFixture(
  client: ClickUpClient,
  teamId: string,
): Promise<ExportFixture> {
  const spaces = await client.getSpaces(teamId)
  const space =
    spaces.find(s => s.name === EXPORT_SPACE_NAME) ??
    (await client.createSpace(teamId, EXPORT_SPACE_NAME))

  const lists = await client.getLists(space.id)
  const roadmap =
    lists.find(l => l.name === ROADMAP_LIST_NAME) ??
    (await client.createList(space.id, ROADMAP_LIST_NAME))

  const folders = await client.getFolders(space.id)
  const folder =
    folders.find(f => f.name === SPRINT_FOLDER_NAME) ??
    (await client.createFolder(space.id, SPRINT_FOLDER_NAME))
  const folderLists = await client.getFolderLists(folder.id)
  const sprint =
    folderLists.find(l => l.name === SPRINT_LIST_NAME) ??
    (await client.createFolderList(folder.id, SPRINT_LIST_NAME))

  const active = await client.getTasksFromList(roadmap.id, {}, { includeClosed: true })
  const archivedTasks = await client.getTasksFromList(
    roadmap.id,
    {},
    { includeClosed: true, archived: true },
  )
  const existing = [...active, ...archivedTasks]

  const initiativeId = await findOrCreateTask(
    client,
    roadmap.id,
    existing,
    'Export initiative',
    () =>
      client.createTask(roadmap.id, {
        name: 'Export initiative',
        markdown_content: '# Initiative\n\nGroups the export fixture subtasks.',
        custom_item_id: INITIATIVE_ITEM_ID,
        tags: ['export-fixture'],
      }),
  )
  const subtaskAId = await findOrCreateTask(
    client,
    roadmap.id,
    existing,
    'Initiative subtask A',
    () => client.createTask(roadmap.id, { name: 'Initiative subtask A', parent: initiativeId }),
  )
  const subtaskBId = await findOrCreateTask(
    client,
    roadmap.id,
    existing,
    'Initiative subtask B',
    () =>
      client.createTask(roadmap.id, {
        name: 'Initiative subtask B',
        parent: initiativeId,
        status: 'complete',
      }),
  )
  const nestedId = await findOrCreateTask(client, roadmap.id, existing, 'Nested subtask B.1', () =>
    client.createTask(roadmap.id, { name: 'Nested subtask B.1', parent: subtaskBId }),
  )

  const standaloneExisted = existing.some(t => t.name === 'Standalone task')
  const standaloneId = await findOrCreateTask(client, roadmap.id, existing, 'Standalone task', () =>
    client.createTask(roadmap.id, {
      name: 'Standalone task',
      markdown_content: 'Has comments, a reply, and an attachment.',
    }),
  )
  if (!standaloneExisted) {
    const c1 = await client.postComment(standaloneId, 'First comment')
    await client.createThreadedComment(c1.id, 'Reply to first')
    await client.postComment(standaloneId, 'Second comment')
    const file = join(tmpdir(), 'cup-export-fixture.txt')
    writeFileSync(file, 'export fixture attachment\n')
    await client.createTaskAttachment(standaloneId, file, 'fixture.txt')
  }

  const archivedExisted = existing.some(t => t.name === 'Archived task')
  const archivedId = await findOrCreateTask(client, roadmap.id, existing, 'Archived task', () =>
    client.createTask(roadmap.id, { name: 'Archived task' }),
  )
  if (!archivedExisted) await client.updateTask(archivedId, { archived: true })

  const sprintExisting = await client.getTasksFromList(sprint.id, {}, { includeClosed: true })
  const sprintTaskId = await findOrCreateTask(
    client,
    sprint.id,
    sprintExisting,
    'Sprint task',
    () => client.createTask(sprint.id, { name: 'Sprint task' }),
  )

  return {
    teamId,
    spaceId: space.id,
    roadmapListId: roadmap.id,
    sprintListId: sprint.id,
    initiativeId,
    subtaskAId,
    subtaskBId,
    nestedId,
    standaloneId,
    archivedId,
    sprintTaskId,
  }
}

// Standalone entry point for seeding.
if (process.argv[1]?.endsWith('export-space.ts')) {
  const { config } = await import('dotenv')
  config({ path: '.env.test', quiet: true })
  const { ClickUpClient } = await import('../../../src/api.js')
  const token = process.env.CLICKUP_API_TOKEN
  if (!token) throw new Error('CLICKUP_API_TOKEN missing in .env.test')
  const client = new ClickUpClient({ apiToken: token })
  const teams = await client.getTeams()
  const team = teams.find(t => t.name === 'krodak')
  if (!team) throw new Error('Refusing to seed: personal workspace "krodak" not found')
  console.log(JSON.stringify(await ensureExportFixture(client, team.id), null, 2))
}

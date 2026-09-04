import type { Attachment, ClickUpClient, Comment, Task } from '../api.js'

/** A comment plus its threaded replies, as stored in comments.json. */
export interface ExportedComment extends Comment {
  replies: Comment[]
}

/** Everything fetched for one task before anything is written to disk. */
export interface TaskBundle {
  task: Task
  comments: ExportedComment[]
  attachments: Attachment[]
  subtaskIds: string[]
  fetchedAt: string
}

type BundleClient = Pick<
  ClickUpClient,
  'getTaskForExport' | 'getAllTaskComments' | 'getThreadedComments'
>

function replyCount(c: Comment): number {
  const count = Number(c.reply_count ?? 0)
  return Number.isFinite(count) ? count : 0
}

export async function fetchTaskBundle(client: BundleClient, taskId: string): Promise<TaskBundle> {
  const [task, rawComments] = await Promise.all([
    client.getTaskForExport(taskId),
    client.getAllTaskComments(taskId),
  ])
  const comments: ExportedComment[] = await Promise.all(
    rawComments.map(async c => ({
      ...c,
      replies: replyCount(c) > 0 ? await client.getThreadedComments(c.id) : [],
    })),
  )
  return {
    task,
    comments,
    attachments: task.attachments ?? [],
    subtaskIds: (task.subtasks ?? []).map(s => s.id),
    fetchedAt: new Date().toISOString(),
  }
}

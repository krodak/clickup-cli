import { commandMetadata, topLevelCommandDefinitions, topLevelCommandNames } from './metadata.js'
import type { CommandFlagDefinition, CommandMetadata } from './metadata.js'

const bashSpecialCaseCommands = new Set([
  'checklist',
  'time',
  'bulk',
  'filter',
  'favorite',
  'config',
  'profile',
  'completion',
  'chat',
])

function escapeSingleQuotes(value: string): string {
  return value.replaceAll("'", "'\\''")
}

function renderBashCommandCases(): string {
  return commandMetadata
    .filter(
      (command: CommandMetadata) =>
        !bashSpecialCaseCommands.has(command.name) &&
        ((command.flags?.length ?? 0) > 0 || command.bashFileCompletion),
    )
    .map((command: CommandMetadata) => {
      if (command.bashFileCompletion) {
        return `    ${command.name})
      if [[ "$cur" == -* ]]; then
        COMPREPLY=($(compgen -W "${command.flags?.join(' ') ?? ''}" -- "$cur"))
      else
        COMPREPLY=($(compgen -f -- "$cur"))
      fi
      ;;`
      }

      return `    ${command.name})
      COMPREPLY=($(compgen -W "${command.flags?.join(' ') ?? ''}" -- "$cur"))
      ;;`
    })
    .join('\n')
}

function renderZshTopLevelCommands(name: string): string {
  return topLevelCommandDefinitions(name)
    .map(command => `    '${command.name}:${escapeSingleQuotes(command.description)}'`)
    .join('\n')
}

function renderFishTopLevelCommands(name: string): string {
  return topLevelCommandDefinitions(name)
    .map(
      command =>
        `complete -c ${name} -n __fish_use_subcommand -a ${command.name} -d '${escapeSingleQuotes(command.description)}'`,
    )
    .join('\n')
}

function renderFishFlagDefinition(
  name: string,
  commandName: string,
  flag: CommandFlagDefinition,
): string {
  const parts = [`complete -c ${name} -n '__fish_seen_subcommand_from ${commandName}'`]

  if (flag.short) {
    parts.push(`-s ${flag.short.slice(1)}`)
  }

  parts.push(`-l ${flag.long.slice(2)}`)

  return parts.join(' ')
}

function renderFishTopLevelFlags(name: string): string {
  return topLevelCommandDefinitions()
    .filter(command => command.flags.length > 0)
    .flatMap(command =>
      command.flags.map(flag => renderFishFlagDefinition(name, command.name, flag)),
    )
    .join('\n')
}

function bashCompletion(name: string): string {
  return `_${name}_completions() {
  local cur prev words cword

  if type _init_completion &>/dev/null; then
    _init_completion || return
  else
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"
    words=("\${COMP_WORDS[@]}")
    cword=$COMP_CWORD
  fi

  local commands="${topLevelCommandNames().join(' ')}"

  if [[ $cword -eq 1 ]]; then
    COMPREPLY=($(compgen -W "$commands --help --version" -- "$cur"))
    return
  fi

  local cmd="\${words[1]}"

  case "$prev" in
    --priority)
      COMPREPLY=($(compgen -W "urgent high normal low" -- "$cur"))
      return
      ;;
    --status)
      COMPREPLY=($(compgen -W 'open "in progress" "in review" done closed' -- "$cur"))
      return
      ;;
  esac

  case "$cmd" in
${renderBashCommandCases()}
    checklist)
      if [[ $cword -eq 2 ]]; then
        COMPREPLY=($(compgen -W "view create delete add-item edit-item delete-item" -- "$cur"))
      fi
      ;;
    time)
      if [[ $cword -eq 2 ]]; then
        COMPREPLY=($(compgen -W "start stop status log list update delete" -- "$cur"))
      fi
      ;;
    bulk)
      if [[ $cword -eq 2 ]]; then
        COMPREPLY=($(compgen -W "status assign due-date tag" -- "$cur"))
      fi
      ;;
    favorite)
      if [[ $cword -eq 2 ]]; then
        COMPREPLY=($(compgen -W "add remove list" -- "$cur"))
      elif [[ $cword -eq 3 ]]; then
        local subcmd="\${words[2]}"
        case "$subcmd" in
          add)
            COMPREPLY=($(compgen -W "sprint-folder space list folder view task" -- "$cur"))
            ;;
        esac
      fi
      ;;
    profile)
      if [[ $cword -eq 2 ]]; then
        COMPREPLY=($(compgen -W "list add remove use" -- "$cur"))
      fi
      ;;
    config)
      if [[ $cword -eq 2 ]]; then
        COMPREPLY=($(compgen -W "get set path" -- "$cur"))
      elif [[ $cword -eq 3 ]]; then
        local subcmd="\${words[2]}"
        case "$subcmd" in
          get|set)
            COMPREPLY=($(compgen -W "apiToken teamId sprintFolderId" -- "$cur"))
            ;;
        esac
      fi
      ;;
    chat)
      if [[ $cword -eq 2 ]]; then
        COMPREPLY=($(compgen -W "channels channel send messages reply replies react unreact reactions channel-create dm channel-update channel-delete members followers message-update message-delete" -- "$cur"))
      fi
      ;;
    completion)
      COMPREPLY=($(compgen -W "bash zsh fish" -- "$cur"))
      ;;
  esac
}
complete -F _${name}_completions ${name}
`
}

function zshCompletion(name: string): string {
  return `#compdef ${name}

_${name}() {
  local -a commands
  commands=(
${renderZshTopLevelCommands(name)}
  )

  _arguments -C \\
    '(- *)--help[Show help]' \\
    '(- *)--version[Show version]' \\
    '1:command:->command' \\
    '*::arg:->args'

  case $state in
    command)
      _describe 'command' commands
      ;;
    args)
      case $words[1] in
        tasks)
          _arguments \\
            '--status[Filter by status]:status:(open "in progress" "in review" done closed)' \\
            '--list[Filter by list ID]:list_id:' \\
            '--space[Filter by space ID]:space_id:' \\
            '--name[Filter by name]:query:' \\
            '--type[Filter by task type]:type:' \\
            '--all[Include all tasks, not just mine]' \\
            '--include-closed[Include done/closed tasks]' \\
            '--assignee[Filter by assignee]:user_id:' \\
            '--tag[Filter by tag name]:tag:' \\
            '--due-before[Tasks due before date]:date:' \\
            '--due-after[Tasks due after date]:date:' \\
            '--created-after[Tasks created after date]:date:' \\
            '--created-before[Tasks created before date]:date:' \\
            '--field[Filter by custom field]:field_name_and_value:' \\
            '--json[Force JSON output]'
          ;;
        task)
          _arguments \\
            '1:task_id:' \\
            '--json[Force JSON output]'
          ;;
        update)
          _arguments \\
            '1:task_id:' \\
            '(-n --name)'{-n,--name}'[New task name]:text:' \\
            '(-d --description)'{-d,--description}'[New description]:text:' \\
            '--description-file[Read description from a file (- for stdin)]:path:_files' \\
            '(-s --status)'{-s,--status}'[New status]:status:(open "in progress" "in review" done closed)' \\
            '--priority[Priority level]:priority:(urgent high normal low)' \\
            '--due-date[Due date (YYYY-MM-DD or "none" to clear)]:date:' \\
            '--start-date[Start date]:date:' \\
            '--time-estimate[Time estimate]:duration:' \\
            '--assignee[Add assignee]:user_id:' \\
            '--remove-assignee[Remove assignee]:user_id:' \\
            '--parent[Set parent task]:task_id:' \\
            '--archive[Archive the task]' \\
            '--unarchive[Unarchive the task]' \\
            '--field[Set custom field]:field_name_and_value:' \\
            '--json[Force JSON output]'
          ;;
        create)
          _arguments \\
            '(-l --list)'{-l,--list}'[Target list ID]:list_id:' \\
            '(-n --name)'{-n,--name}'[Task name]:name:' \\
            '(-d --description)'{-d,--description}'[Task description]:text:' \\
            '--description-file[Read description from a file (- for stdin)]:path:_files' \\
            '--parent[Parent task ID]:task_id:' \\
            '(-s --status)'{-s,--status}'[Initial status]:status:(open "in progress" "in review" done closed)' \\
            '--priority[Priority level]:priority:(urgent high normal low)' \\
            '--due-date[Due date]:date:' \\
            '--assignee[Assignee user ID]:user_id:' \\
            '--tags[Comma-separated tag names]:tags:' \\
            '--custom-item-id[Custom task type ID]:id:' \\
            '--time-estimate[Time estimate]:duration:' \\
            '--template[Create from a task template]:template_id:' \\
            '--json[Force JSON output]'
          ;;
        sprint)
          _arguments \\
            '--status[Filter by status]:status:(open "in progress" "in review" done closed)' \\
            '--space[Narrow sprint search to a space]:space:' \\
            '--folder[Sprint folder ID]:folder_id:' \\
            '--include-closed[Include done/closed tasks]' \\
            '--json[Force JSON output]'
          ;;
        sprints)
          _arguments \\
            '--space[Filter by space]:space:' \\
            '--json[Force JSON output]'
          ;;
        subtasks)
          _arguments \\
            '1:task_id:' \\
            '--status[Filter by status]:status:(open "in progress" "in review" done closed)' \\
            '--name[Filter by name]:query:' \\
            '--include-closed[Include closed/done subtasks]' \\
            '--json[Force JSON output]'
          ;;
        comment)
          _arguments \\
            '1:task_id:' \\
            '(-m --message)'{-m,--message}'[Comment text]:text:' \\
            '--message-file[Read comment from a file (- for stdin)]:path:_files' \\
            '--notify-all[Notify all assignees]' \\
            '--mention[Mention a user (ID, email, username, or me)]:user:' \\
            '--json[Force JSON output]'
          ;;
        comments)
          _arguments \\
            '1:task_id:' \\
            '--json[Force JSON output]'
          ;;
        activity)
          _arguments \\
            '1:task_id:' \\
            '--json[Force JSON output]'
          ;;
        lists)
          _arguments \\
            '1:space_id:' \\
            '--name[Filter by name]:query:' \\
            '--json[Force JSON output]'
          ;;
        spaces)
          _arguments \\
            '--name[Filter spaces by name]:query:' \\
            '--my[Show only spaces where I have assigned tasks]' \\
            '--json[Force JSON output]'
          ;;
        inbox)
          _arguments \\
            '--include-closed[Include done/closed tasks]' \\
            '--json[Force JSON output]' \\
            '--days[Lookback period in days]:days:'
          ;;
        assigned)
          _arguments \\
            '--status[Show only tasks with this status]:status:(open "in progress" "in review" done closed)' \\
            '--include-closed[Include done/closed tasks]' \\
            '--json[Force JSON output]'
          ;;
        open)
          _arguments \\
            '1:query:' \\
            '--json[Output task JSON instead of opening]'
          ;;
        search)
          _arguments \\
            '1::query:' \\
            '--status[Filter by status]:status:(open "in progress" "in review" done closed)' \\
            '--list[Filter by list ID]:list_id:' \\
            '--space[Filter by space ID]:space_id:' \\
            '--all[Search all workspace tasks, not just mine]' \\
            '--include-closed[Include done/closed tasks in search]' \\
            '--assignee[Filter by assignee]:user_id:' \\
            '--tag[Filter by tag name]:tag:' \\
            '--due-before[Tasks due before date]:date:' \\
            '--due-after[Tasks due after date]:date:' \\
            '--created-after[Tasks created after date]:date:' \\
            '--created-before[Tasks created before date]:date:' \\
            '--field[Filter by custom field]:field_name_and_value:' \\
            '--json[Force JSON output]'
          ;;
        summary)
          _arguments \\
            '--hours[Completed-tasks lookback in hours]:hours:' \\
            '--json[Force JSON output]'
          ;;
        overdue)
          _arguments \\
            '--include-closed[Include done/closed overdue tasks]' \\
            '--all[Check all workspace tasks, not just mine]' \\
            '--json[Force JSON output]'
          ;;
        assign)
          _arguments \\
            '1:task_id:' \\
            '--to[Add assignee]:user_id:' \\
            '--remove[Remove assignee]:user_id:' \\
            '--json[Force JSON output]'
          ;;
        auth)
          _arguments \\
            '--json[Force JSON output]'
          ;;
        depend)
          _arguments \\
            '1:task_id:' \\
            '--on[Task that this task depends on]:task_id:' \\
            '--blocks[Task that this task blocks]:task_id:' \\
            '--remove[Remove the dependency instead of adding it]' \\
            '--json[Force JSON output]'
          ;;
        move)
          _arguments \\
            '1:task_id:' \\
            '--to[Add task to this list]:list_id:' \\
            '--remove[Remove task from this list]:list_id:' \\
            '--json[Force JSON output]'
          ;;
        field)
          _arguments \\
            '1:task_id:' \\
            '--set[Set field name and value]:name_and_value:' \\
            '--value-file[Read the field value from a file (- for stdin)]:path:_files' \\
            '--remove[Remove field value by name]:field_name:' \\
            '--json[Force JSON output]'
          ;;
        delete)
          _arguments \\
            '1:task_id:' \\
            '--confirm[Skip confirmation prompt]' \\
            '--json[Force JSON output]'
          ;;
        tag)
          _arguments \\
            '1:task_id:' \\
            '--add[Comma-separated tag names to add]:tags:' \\
            '--remove[Comma-separated tag names to remove]:tags:' \\
            '--json[Force JSON output]'
          ;;
        checklist)
          local -a checklist_cmds
          checklist_cmds=(
            'view:View checklists on a task'
            'create:Create a checklist on a task'
            'delete:Delete a checklist'
            'add-item:Add an item to a checklist'
            'edit-item:Edit a checklist item'
            'delete-item:Delete a checklist item'
          )
          _arguments -C \\
            '1:checklist command:->checklist_cmd' \\
            '*::checklist_arg:->checklist_args'
          case $state in
            checklist_cmd)
              _describe 'checklist command' checklist_cmds
              ;;
            checklist_args)
              case $words[1] in
                view)
                  _arguments '1:task_id:' '--json[Force JSON output]'
                  ;;
                create)
                  _arguments '1:task_id:' '2:name:' '--json[Force JSON output]'
                  ;;
                delete)
                  _arguments '1:checklist_id:' '--json[Force JSON output]'
                  ;;
                add-item)
                  _arguments '1:checklist_id:' '2:name:' '--json[Force JSON output]'
                  ;;
                edit-item)
                  _arguments \\
                    '1:checklist_id:' \\
                    '2:checklist_item_id:' \\
                    '--name[New item name]:name:' \\
                    '--resolved[Mark item as resolved]' \\
                    '--unresolved[Mark item as unresolved]' \\
                    '--assignee[Assign user by ID]:user_id:' \\
                    '--json[Force JSON output]'
                  ;;
                delete-item)
                  _arguments '1:checklist_id:' '2:checklist_item_id:' '--json[Force JSON output]'
                  ;;
              esac
              ;;
          esac
          ;;
        time)
          local -a time_cmds
          time_cmds=(
            'start:Start tracking time on a task'
            'stop:Stop the running timer'
            'status:Show the currently running timer'
            'log:Log a manual time entry'
            'list:List recent time entries'
            'update:Update a time entry'
            'delete:Delete a time entry'
          )
          _arguments -C \\
            '1:time command:->time_cmd' \\
            '*::time_arg:->time_args'
          case $state in
            time_cmd)
              _describe 'time command' time_cmds
              ;;
            time_args)
              case $words[1] in
                start)
                  _arguments \\
                    '1:task_id:' \\
                    '(-d --description)'{-d,--description}'[Description]:text:' \\
                    '--json[Force JSON output]'
                  ;;
                stop)
                  _arguments '--json[Force JSON output]'
                  ;;
                status)
                  _arguments '--json[Force JSON output]'
                  ;;
                log)
                  _arguments \\
                    '1:task_id:' \\
                    '2:duration:' \\
                    '(-d --description)'{-d,--description}'[Description]:text:' \\
                    '--json[Force JSON output]'
                  ;;
                list)
                  _arguments \\
                    '--days[Number of days to look back]:days:' \\
                    '--task[Filter by task ID]:task_id:' \\
                    '--space[Filter by space ID]:space_id:' \\
                    '--list[Filter by list ID]:list_id:' \\
                    '--assignee[Filter by assignee user ID]:user_id:' \\
                    '--all[Show all team entries]' \\
                    '--json[Force JSON output]'
                  ;;
                update)
                  _arguments \\
                    '1:time_entry_id:' \\
                    '(-d --description)'{-d,--description}'[New description]:text:' \\
                    '--duration[New duration]:duration:' \\
                    '--json[Force JSON output]'
                  ;;
                delete)
                  _arguments \\
                    '1:time_entry_id:' \\
                    '--json[Force JSON output]'
                  ;;
              esac
              ;;
          esac
          ;;
        comment-edit)
          _arguments \\
            '1:comment_id:' \\
            '(-m --message)'{-m,--message}'[New comment text]:text:' \\
            '--message-file[Read comment from a file (- for stdin)]:path:_files' \\
            '--resolved[Mark comment as resolved]' \\
            '--unresolved[Mark comment as unresolved]' \\
            '--mention[Mention a user (ID, email, username, or me)]:user:' \\
            '--json[Force JSON output]'
          ;;
        comment-delete)
          _arguments \\
            '1:comment_id:' \\
            '--task[Task to search for your comment (requires --mine)]:task_id:' \\
            '--mine[Delete one of my comments from the specified task]' \\
            '--match[Only match comments containing this text (requires --mine)]:text:' \\
            '--json[Force JSON output]'
          ;;
        replies)
          _arguments \\
            '1:comment_id:' \\
            '--json[Force JSON output]'
          ;;
        reply)
          _arguments \\
            '1:comment_id:' \\
            '(-m --message)'{-m,--message}'[Reply text]:text:' \\
            '--message-file[Read reply from a file (- for stdin)]:path:_files' \\
            '--notify-all[Notify all assignees]' \\
            '--mention[Mention a user (ID, email, username, or me)]:user:' \\
            '--json[Force JSON output]'
          ;;
        link)
          _arguments \\
            '1:task_id:' \\
            '2:links_to:' \\
            '--remove[Remove the link instead of adding it]' \\
            '--json[Force JSON output]'
          ;;
        attach)
          _arguments \\
            '1:task_id:' \\
            '2:file_path:_files' \\
            '--json[Force JSON output]'
          ;;
        docs)
          _arguments \\
            '1:query:' \\
            '--json[Force JSON output]'
          ;;
        doc)
          _arguments \\
            '1:doc_id:' \\
            '2:page_id:' \\
            '--json[Force JSON output]'
          ;;
        doc-pages)
          _arguments \\
            '1:doc_id:' \\
            '--json[Force JSON output]'
          ;;
        tags)
          _arguments \\
            '1:space_id:' \\
            '--json[Force JSON output]'
          ;;
        tag-create)
          _arguments \\
            '1:space_id:' \\
            '2:name:' \\
            '--fg[Foreground color]:color:' \\
            '--bg[Background color]:color:' \\
            '--json[Force JSON output]'
          ;;
        tag-delete)
          _arguments \\
            '1:space_id:' \\
            '2:name:' \\
            '--json[Force JSON output]'
          ;;
        members)
          _arguments \\
            '--json[Force JSON output]'
          ;;
        fields)
          _arguments \\
            '1:list_id:' \\
            '--json[Force JSON output]'
          ;;
        field-create)
          _arguments \\
            '1:name:' \\
            '(-t --type)'{-t,--type}'[Field type]:type:(text short_text number date checkbox drop_down labels email phone url currency)' \\
            '(-d --description)'{-d,--description}'[Field description]:text:' \\
            '--required[Make the field required]' \\
            '--json[Force JSON output]'
          ;;
        duplicate)
          _arguments \\
            '1:task_id:' \\
            '--json[Force JSON output]'
          ;;
        bulk)
          local -a bulk_cmds
          bulk_cmds=(
            'status:Update status of multiple tasks'
            'assign:Bulk assign or unassign a user from tasks'
            'due-date:Bulk set due date on tasks'
            'tag:Bulk add or remove a tag on tasks'
          )
          _arguments -C \\
            '1:bulk command:->bulk_cmd' \\
            '*::bulk_arg:->bulk_args'
          case $state in
            bulk_cmd)
              _describe 'bulk command' bulk_cmds
              ;;
            bulk_args)
              case $words[1] in
                status)
                  _arguments '1:status:' '*:task_ids:' '--json[Force JSON output]'
                  ;;
                assign)
                  _arguments '*:task_ids:' '--to[Add user (ID or me)]:userId:' '--remove[Remove user (ID or me)]:userId:' '--json[Force JSON output]'
                  ;;
                due-date)
                  _arguments '1:date:' '*:task_ids:' '--json[Force JSON output]'
                  ;;
                tag)
                  _arguments '1:tagName:' '*:task_ids:' '--add[Add tag]' '--remove[Remove tag]' '--json[Force JSON output]'
                  ;;
              esac
              ;;
          esac
          ;;
        goals)
          _arguments \\
            '--json[Force JSON output]'
          ;;
        goal-create)
          _arguments \\
            '1:name:' \\
            '(-d --description)'{-d,--description}'[Goal description]:text:' \\
            '--color[Goal color]:color:' \\
            '--json[Force JSON output]'
          ;;
        goal-update)
          _arguments \\
            '1:goal_id:' \\
            '(-n --name)'{-n,--name}'[New goal name]:text:' \\
            '(-d --description)'{-d,--description}'[New description]:text:' \\
            '--color[New color]:color:' \\
            '--json[Force JSON output]'
          ;;
        key-results)
          _arguments \\
            '1:goal_id:' \\
            '--json[Force JSON output]'
          ;;
        key-result-create)
          _arguments \\
            '1:goal_id:' \\
            '2:name:' \\
            '--type[Key result type]:type:(number percentage)' \\
            '--target[Target value]:number:' \\
            '--json[Force JSON output]'
          ;;
        key-result-update)
          _arguments \\
            '1:key_result_id:' \\
            '--progress[Current progress]:number:' \\
            '--note[Progress note]:text:' \\
            '--json[Force JSON output]'
          ;;
        key-result-delete)
          _arguments \\
            '1:key_result_id:' \\
            '--json[Force JSON output]'
          ;;
        goal-delete)
          _arguments \\
            '1:goal_id:' \\
            '--json[Force JSON output]'
          ;;
        doc-delete)
          _arguments \\
            '1:doc_id:' \\
            '--json[Force JSON output]'
          ;;
        doc-page-delete)
          _arguments \\
            '1:doc_id:' \\
            '2:page_id:' \\
            '--json[Force JSON output]'
          ;;
        tag-update)
          _arguments \\
            '1:space_id:' \\
            '2:tag_name:' \\
            '--name[New tag name]:text:' \\
            '--fg[New foreground color]:color:' \\
            '--bg[New background color]:color:' \\
            '--json[Force JSON output]'
          ;;
        task-types)
          _arguments \\
            '--json[Force JSON output]'
          ;;
        templates)
          _arguments \\
            '--json[Force JSON output]'
          ;;
        list-templates)
          _arguments \\
            '--json[Force JSON output]'
          ;;
        folder-templates)
          _arguments \\
            '--json[Force JSON output]'
          ;;
        list-from-template)
          _arguments \\
            '1:name:' \\
            '--template[Template ID]:template_id:' \\
            '--space[Create in this space]:space_id:' \\
            '--folder[Create in this folder]:folder_id:' \\
            '--json[Force JSON output]'
          ;;
        views)
          _arguments \\
            '1:list_id:' \\
            '--json[Force JSON output]'
          ;;
        view)
          _arguments \\
            '1:view_id:' \\
            '--json[Force JSON output]'
          ;;
        view-create)
          _arguments \\
            '1:list_id:' \\
            '2:name:' \\
            '(-t --type)'{-t,--type}'[View type]:type:(list board calendar gantt table timeline)' \\
            '--group-by[Group by field]:field:(status assignee priority due_date tag sprint)' \\
            '--json[Force JSON output]'
          ;;
        view-update)
          _arguments \\
            '1:view_id:' \\
            '(-n --name)'{-n,--name}'[New view name]:text:' \\
            '--group-by[Group by field]:field:(status assignee priority due_date tag sprint)' \\
            '--json[Force JSON output]'
          ;;
        view-delete)
          _arguments \\
            '1:view_id:' \\
            '--confirm[Skip confirmation prompt]' \\
            '--json[Force JSON output]'
          ;;
        folders)
          _arguments \\
            '1:space_id:' \\
            '--name[Filter by folder name]:text:' \\
            '--json[Force JSON output]'
          ;;
        space-create)
          _arguments \\
            '1:name:' \\
            '--json[Force JSON output]'
          ;;
        list-create)
          _arguments \\
            '1:space_id:' \\
            '2:name:' \\
            '--folder[Create inside a folder]:folder_id:' \\
            '--copy-statuses-from[Copy statuses from list or space]:id:' \\
            '--json[Force JSON output]'
          ;;
        folder-create)
          _arguments \\
            '1:space_id:' \\
            '2:name:' \\
            '--json[Force JSON output]'
          ;;
        list-rename)
          _arguments \\
            '1:list_id:' \\
            '2:new_name:' \\
            '--json[Force JSON output]'
          ;;
        folder-rename)
          _arguments \\
            '1:folder_id:' \\
            '2:new_name:' \\
            '--json[Force JSON output]'
          ;;
        space-rename)
          _arguments \\
            '1:space_id:' \\
            '2:new_name:' \\
            '--json[Force JSON output]'
          ;;
        doc-create)
          _arguments \\
            '1:title:' \\
            '(-c --content)'{-c,--content}'[Initial content]:text:' \\
            '--json[Force JSON output]'
          ;;
        doc-page-create)
          _arguments \\
            '1:doc_id:' \\
            '2:name:' \\
            '(-c --content)'{-c,--content}'[Page content]:text:' \\
            '--parent-page[Parent page ID]:page_id:' \\
            '--json[Force JSON output]'
          ;;
        doc-page-edit)
          _arguments \\
            '1:doc_id:' \\
            '2:page_id:' \\
            '--name[New page name]:text:' \\
            '(-c --content)'{-c,--content}'[New page content]:text:' \\
            '--json[Force JSON output]'
          ;;
        favorite)
          local -a favorite_cmds
          favorite_cmds=(
            'add:Add a favorite (types: sprint-folder, space, list, folder, view, task)'
            'remove:Remove a favorite by alias'
            'list:List saved favorites'
          )
          _arguments -C \\
            '1:favorite command:->favorite_cmd' \\
            '*::favorite_arg:->favorite_args'
          case $state in
            favorite_cmd)
              _describe 'favorite command' favorite_cmds
              ;;
            favorite_args)
              case $words[1] in
                add)
                  _arguments \\
                    '1:type:(sprint-folder space list folder view task)' \\
                    '2:id:' \\
                    '3:alias:' \\
                    '(-n --name)'{-n,--name}'[Display name]:name:' \\
                    '--json[Force JSON output]'
                  ;;
                remove)
                  _arguments '1:alias:' '--json[Force JSON output]'
                  ;;
                list)
                  _arguments '--type[Filter by entity type]:type:(sprint-folder space list folder view task)' '--json[Force JSON output]'
                  ;;
              esac
              ;;
          esac
          ;;
        filter)
          local -a filter_cmds
          filter_cmds=(
            'save:Save a command shortcut'
            'run:Run a saved shortcut'
            'list:List saved shortcuts'
            'delete:Delete a saved shortcut'
            'show:Show details of a saved shortcut'
          )
          _arguments -C \\
            '1:filter command:->filter_cmd' \\
            '*::filter_arg:->filter_args'
          case $state in
            filter_cmd)
              _describe 'filter command' filter_cmds
              ;;
            filter_args)
              case $words[1] in
                save)
                  _arguments \\
                    '1:name:' \\
                    '*:command:' \\
                    '(-d --description)'{-d,--description}'[Filter description]:text:' \\
                    '--json[Force JSON output]'
                  ;;
                run)
                  _arguments '1:name:'
                  ;;
                list)
                  _arguments '--json[Force JSON output]'
                  ;;
                delete)
                  _arguments '1:name:' '--json[Force JSON output]'
                  ;;
                show)
                  _arguments '1:name:' '--json[Force JSON output]'
                  ;;
                *)
                  _arguments '1:subcommand:(save run list delete show)'
                  ;;
              esac
              ;;
          esac
          ;;
        profile)
          local -a profile_cmds
          profile_cmds=(
            'list:List all profiles'
            'add:Add a new profile'
            'remove:Remove a profile'
            'use:Set the default profile'
          )
          _arguments -C \\
            '1:profile command:->profile_cmd' \\
            '*::profile_arg:->profile_args'
          case $state in
            profile_cmd)
              _describe 'profile command' profile_cmds
              ;;
            profile_args)
              case $words[1] in
                list)
                  _arguments '--json[Force JSON output]'
                  ;;
                add|remove|use)
                  _arguments '1:name:'
                  ;;
              esac
              ;;
          esac
          ;;
        config)
          local -a config_cmds
          config_cmds=(
            'get:Print a config value'
            'set:Set a config value'
            'path:Print config file path'
          )
          _arguments -C \\
            '1:config command:->config_cmd' \\
            '*::config_arg:->config_args'
          case $state in
            config_cmd)
              _describe 'config command' config_cmds
              ;;
            config_args)
              case $words[1] in
                get|set)
                  _arguments '1:key:(apiToken teamId sprintFolderId)'
                  ;;
              esac
              ;;
          esac
          ;;
        chat)
          local -a chat_cmds
          chat_cmds=(
            'channels:List chat channels'
            'channel:Show channel details'
            'send:Send a message to a channel'
            'messages:List recent messages in a channel'
            'reply:Reply to a message'
            'replies:List replies to a message'
            'react:Add a reaction to a message'
            'unreact:Remove a reaction from a message'
            'reactions:List reactions on a message'
            'channel-create:Create a new chat channel'
            'dm:Create or open a direct message'
            'channel-update:Update a channel'
            'channel-delete:Delete a channel'
            'members:List channel members'
            'followers:List channel followers'
            'message-update:Edit a message'
            'message-delete:Delete a message'
          )
          _arguments -C \\
            '1:chat command:->chat_cmd' \\
            '*::chat_arg:->chat_args'
          case $state in
            chat_cmd)
              _describe 'chat command' chat_cmds
              ;;
            chat_args)
              case $words[1] in
                channels)
                  _arguments \\
                    '--all[List all channels, not just followed]' \\
                    '--type[Filter by type]:type:(channel dm group_dm)' \\
                    '--json[Force JSON output]'
                  ;;
                channel)
                  _arguments '1:channel_id:' '--json[Force JSON output]'
                  ;;
                send)
                  _arguments \\
                    '1:channel_id:' \\
                    '(-m --message)'{-m,--message}'[Message content]:text:' \\
                    '--message-file[Read message from a file (- for stdin)]:path:_files' \\
                    '--post[Send as a post]' \\
                    '--title[Post title]:text:' \\
                    '--json[Force JSON output]'
                  ;;
                messages)
                  _arguments \\
                    '1:channel_id:' \\
                    '--limit[Max messages]:number:' \\
                    '--json[Force JSON output]'
                  ;;
                reply)
                  _arguments \\
                    '1:message_id:' \\
                    '(-m --message)'{-m,--message}'[Reply content]:text:' \\
                    '--message-file[Read reply from a file (- for stdin)]:path:_files' \\
                    '--json[Force JSON output]'
                  ;;
                replies)
                  _arguments \\
                    '1:message_id:' \\
                    '--limit[Max replies]:number:' \\
                    '--json[Force JSON output]'
                  ;;
                react)
                  _arguments \\
                    '1:message_id:' \\
                    '--emoji[Emoji name]:emoji:' \\
                    '--json[Force JSON output]'
                  ;;
                unreact)
                  _arguments \\
                    '1:message_id:' \\
                    '--emoji[Emoji name to remove]:emoji:' \\
                    '--json[Force JSON output]'
                  ;;
                reactions)
                  _arguments '1:message_id:' '--json[Force JSON output]'
                  ;;
                channel-create)
                  _arguments \\
                    '1:name:' \\
                    '--private[Create as private channel]' \\
                    '--topic[Channel topic]:text:' \\
                    '--space[Create on a space]:space_id:' \\
                    '--folder[Create on a folder]:folder_id:' \\
                    '--list[Create on a list]:list_id:' \\
                    '--json[Force JSON output]'
                  ;;
                dm)
                  _arguments '*:user_ids:' '--json[Force JSON output]'
                  ;;
                channel-update)
                  _arguments \\
                    '1:channel_id:' \\
                    '--name[New name]:text:' \\
                    '--topic[New topic]:text:' \\
                    '--description[New description]:text:' \\
                    '--visibility[PUBLIC or PRIVATE]:visibility:(PUBLIC PRIVATE)' \\
                    '--json[Force JSON output]'
                  ;;
                channel-delete)
                  _arguments \\
                    '1:channel_id:' \\
                    '--confirm[Skip confirmation prompt]' \\
                    '--json[Force JSON output]'
                  ;;
                members|followers)
                  _arguments '1:channel_id:' '--json[Force JSON output]'
                  ;;
                message-update)
                  _arguments \\
                    '1:message_id:' \\
                    '(-m --message)'{-m,--message}'[New message content]:text:' \\
                    '--message-file[Read message from a file (- for stdin)]:path:_files' \\
                    '--json[Force JSON output]'
                  ;;
                message-delete)
                  _arguments \\
                    '1:message_id:' \\
                    '--confirm[Skip confirmation prompt]' \\
                    '--json[Force JSON output]'
                  ;;
              esac
              ;;
          esac
          ;;
        completion)
          _arguments '1:shell:(bash zsh fish)'
          ;;
      esac
      ;;
  esac
}

_${name}
`
}

function fishCompletion(name: string): string {
  return `complete -c ${name} -f

complete -c ${name} -n __fish_use_subcommand -s h -l help -d 'Show help'
complete -c ${name} -n __fish_use_subcommand -s V -l version -d 'Show version'

${renderFishTopLevelCommands(name)}

${renderFishTopLevelFlags(name)}

complete -c ${name} -n '__fish_seen_subcommand_from update' -l priority -a 'urgent high normal low'
complete -c ${name} -n '__fish_seen_subcommand_from create' -l priority -a 'urgent high normal low'
complete -c ${name} -n '__fish_seen_subcommand_from key-result-create' -l type -a 'number percentage'

complete -c ${name} -n '__fish_seen_subcommand_from checklist; and not __fish_seen_subcommand_from view create delete add-item edit-item delete-item' -a view -d 'View checklists on a task'
complete -c ${name} -n '__fish_seen_subcommand_from checklist; and not __fish_seen_subcommand_from view create delete add-item edit-item delete-item' -a create -d 'Create a checklist on a task'
complete -c ${name} -n '__fish_seen_subcommand_from checklist; and not __fish_seen_subcommand_from view create delete add-item edit-item delete-item' -a delete -d 'Delete a checklist'
complete -c ${name} -n '__fish_seen_subcommand_from checklist; and not __fish_seen_subcommand_from view create delete add-item edit-item delete-item' -a add-item -d 'Add an item to a checklist'
complete -c ${name} -n '__fish_seen_subcommand_from checklist; and not __fish_seen_subcommand_from view create delete add-item edit-item delete-item' -a edit-item -d 'Edit a checklist item'
complete -c ${name} -n '__fish_seen_subcommand_from checklist; and not __fish_seen_subcommand_from view create delete add-item edit-item delete-item' -a delete-item -d 'Delete a checklist item'
complete -c ${name} -n '__fish_seen_subcommand_from view create delete add-item edit-item delete-item' -l json -d 'Force JSON output'
complete -c ${name} -n '__fish_seen_subcommand_from edit-item' -l name -d 'New item name'
complete -c ${name} -n '__fish_seen_subcommand_from edit-item' -l resolved -d 'Mark item as resolved'
complete -c ${name} -n '__fish_seen_subcommand_from edit-item' -l unresolved -d 'Mark item as unresolved'
complete -c ${name} -n '__fish_seen_subcommand_from edit-item' -l assignee -d 'Assign user by ID'

complete -c ${name} -n '__fish_seen_subcommand_from time; and not __fish_seen_subcommand_from start stop status log list update delete' -a start -d 'Start tracking time on a task'
complete -c ${name} -n '__fish_seen_subcommand_from time; and not __fish_seen_subcommand_from start stop status log list update delete' -a stop -d 'Stop the running timer'
complete -c ${name} -n '__fish_seen_subcommand_from time; and not __fish_seen_subcommand_from start stop status log list update delete' -a status -d 'Show the currently running timer'
complete -c ${name} -n '__fish_seen_subcommand_from time; and not __fish_seen_subcommand_from start stop status log list update delete' -a log -d 'Log a manual time entry'
complete -c ${name} -n '__fish_seen_subcommand_from time; and not __fish_seen_subcommand_from start stop status log list update delete' -a list -d 'List recent time entries'
complete -c ${name} -n '__fish_seen_subcommand_from time; and not __fish_seen_subcommand_from start stop status log list update delete' -a update -d 'Update a time entry'
complete -c ${name} -n '__fish_seen_subcommand_from time; and not __fish_seen_subcommand_from start stop status log list update delete' -a delete -d 'Delete a time entry'
complete -c ${name} -n '__fish_seen_subcommand_from start stop status log list update delete; and __fish_seen_subcommand_from time' -l json -d 'Force JSON output'
complete -c ${name} -n '__fish_seen_subcommand_from start; and __fish_seen_subcommand_from time' -s d -l description -d 'Description'
complete -c ${name} -n '__fish_seen_subcommand_from log; and __fish_seen_subcommand_from time' -s d -l description -d 'Description'
complete -c ${name} -n '__fish_seen_subcommand_from list; and __fish_seen_subcommand_from time' -l days -d 'Number of days to look back'
complete -c ${name} -n '__fish_seen_subcommand_from list; and __fish_seen_subcommand_from time' -l task -d 'Filter by task ID'
complete -c ${name} -n '__fish_seen_subcommand_from list; and __fish_seen_subcommand_from time' -l space -d 'Filter by space ID'
complete -c ${name} -n '__fish_seen_subcommand_from list; and __fish_seen_subcommand_from time' -l list -d 'Filter by list ID'
complete -c ${name} -n '__fish_seen_subcommand_from list; and __fish_seen_subcommand_from time' -l assignee -d 'Filter by assignee user ID'
complete -c ${name} -n '__fish_seen_subcommand_from list; and __fish_seen_subcommand_from time' -l all -d 'Show all team entries'
complete -c ${name} -n '__fish_seen_subcommand_from update; and __fish_seen_subcommand_from time' -s d -l description -d 'New description'
complete -c ${name} -n '__fish_seen_subcommand_from update; and __fish_seen_subcommand_from time' -l duration -d 'New duration'

complete -c ${name} -n '__fish_seen_subcommand_from attach' -F

complete -c ${name} -n '__fish_seen_subcommand_from bulk; and not __fish_seen_subcommand_from status assign due-date tag' -a status -d 'Update status of multiple tasks'
complete -c ${name} -n '__fish_seen_subcommand_from bulk; and not __fish_seen_subcommand_from status assign due-date tag' -a assign -d 'Bulk assign or unassign a user from tasks'
complete -c ${name} -n '__fish_seen_subcommand_from bulk; and not __fish_seen_subcommand_from status assign due-date tag' -a due-date -d 'Bulk set due date on tasks'
complete -c ${name} -n '__fish_seen_subcommand_from bulk; and not __fish_seen_subcommand_from status assign due-date tag' -a tag -d 'Bulk add or remove a tag on tasks'
complete -c ${name} -n '__fish_seen_subcommand_from status assign due-date tag; and __fish_seen_subcommand_from bulk' -l json -d 'Force JSON output'
complete -c ${name} -n '__fish_seen_subcommand_from assign; and __fish_seen_subcommand_from bulk' -l to -d 'Add user (ID or me)'
complete -c ${name} -n '__fish_seen_subcommand_from assign; and __fish_seen_subcommand_from bulk' -l remove -d 'Remove user (ID or me)'
complete -c ${name} -n '__fish_seen_subcommand_from tag; and __fish_seen_subcommand_from bulk' -l add -d 'Add tag'
complete -c ${name} -n '__fish_seen_subcommand_from tag; and __fish_seen_subcommand_from bulk' -l remove -d 'Remove tag'

complete -c ${name} -n '__fish_seen_subcommand_from chat; and not __fish_seen_subcommand_from channels channel send messages reply replies react unreact reactions channel-create dm channel-update channel-delete members followers message-update message-delete' -a channels -d 'List chat channels'
complete -c ${name} -n '__fish_seen_subcommand_from chat; and not __fish_seen_subcommand_from channels channel send messages reply replies react unreact reactions channel-create dm channel-update channel-delete members followers message-update message-delete' -a channel -d 'Show channel details'
complete -c ${name} -n '__fish_seen_subcommand_from chat; and not __fish_seen_subcommand_from channels channel send messages reply replies react unreact reactions channel-create dm channel-update channel-delete members followers message-update message-delete' -a send -d 'Send a message to a channel'
complete -c ${name} -n '__fish_seen_subcommand_from chat; and not __fish_seen_subcommand_from channels channel send messages reply replies react unreact reactions channel-create dm channel-update channel-delete members followers message-update message-delete' -a messages -d 'List recent messages'
complete -c ${name} -n '__fish_seen_subcommand_from chat; and not __fish_seen_subcommand_from channels channel send messages reply replies react unreact reactions channel-create dm channel-update channel-delete members followers message-update message-delete' -a reply -d 'Reply to a message'
complete -c ${name} -n '__fish_seen_subcommand_from chat; and not __fish_seen_subcommand_from channels channel send messages reply replies react unreact reactions channel-create dm channel-update channel-delete members followers message-update message-delete' -a replies -d 'List replies to a message'
complete -c ${name} -n '__fish_seen_subcommand_from chat; and not __fish_seen_subcommand_from channels channel send messages reply replies react unreact reactions channel-create dm channel-update channel-delete members followers message-update message-delete' -a react -d 'Add a reaction'
complete -c ${name} -n '__fish_seen_subcommand_from chat; and not __fish_seen_subcommand_from channels channel send messages reply replies react unreact reactions channel-create dm channel-update channel-delete members followers message-update message-delete' -a unreact -d 'Remove a reaction'
complete -c ${name} -n '__fish_seen_subcommand_from chat; and not __fish_seen_subcommand_from channels channel send messages reply replies react unreact reactions channel-create dm channel-update channel-delete members followers message-update message-delete' -a reactions -d 'List reactions'
complete -c ${name} -n '__fish_seen_subcommand_from chat; and not __fish_seen_subcommand_from channels channel send messages reply replies react unreact reactions channel-create dm channel-update channel-delete members followers message-update message-delete' -a channel-create -d 'Create a channel'
complete -c ${name} -n '__fish_seen_subcommand_from chat; and not __fish_seen_subcommand_from channels channel send messages reply replies react unreact reactions channel-create dm channel-update channel-delete members followers message-update message-delete' -a dm -d 'Create or open a DM'
complete -c ${name} -n '__fish_seen_subcommand_from chat; and not __fish_seen_subcommand_from channels channel send messages reply replies react unreact reactions channel-create dm channel-update channel-delete members followers message-update message-delete' -a channel-update -d 'Update a channel'
complete -c ${name} -n '__fish_seen_subcommand_from chat; and not __fish_seen_subcommand_from channels channel send messages reply replies react unreact reactions channel-create dm channel-update channel-delete members followers message-update message-delete' -a channel-delete -d 'Delete a channel'
complete -c ${name} -n '__fish_seen_subcommand_from chat; and not __fish_seen_subcommand_from channels channel send messages reply replies react unreact reactions channel-create dm channel-update channel-delete members followers message-update message-delete' -a members -d 'List channel members'
complete -c ${name} -n '__fish_seen_subcommand_from chat; and not __fish_seen_subcommand_from channels channel send messages reply replies react unreact reactions channel-create dm channel-update channel-delete members followers message-update message-delete' -a followers -d 'List channel followers'
complete -c ${name} -n '__fish_seen_subcommand_from chat; and not __fish_seen_subcommand_from channels channel send messages reply replies react unreact reactions channel-create dm channel-update channel-delete members followers message-update message-delete' -a message-update -d 'Edit a message'
complete -c ${name} -n '__fish_seen_subcommand_from chat; and not __fish_seen_subcommand_from channels channel send messages reply replies react unreact reactions channel-create dm channel-update channel-delete members followers message-update message-delete' -a message-delete -d 'Delete a message'
complete -c ${name} -n '__fish_seen_subcommand_from channels channel send messages reply replies react unreact reactions channel-create dm channel-update channel-delete members followers message-update message-delete; and __fish_seen_subcommand_from chat' -l json -d 'Force JSON output'
complete -c ${name} -n '__fish_seen_subcommand_from channels; and __fish_seen_subcommand_from chat' -l all -d 'List all channels'
complete -c ${name} -n '__fish_seen_subcommand_from channels; and __fish_seen_subcommand_from chat' -l type -d 'Filter by type'
complete -c ${name} -n '__fish_seen_subcommand_from send; and __fish_seen_subcommand_from chat' -s m -l message -d 'Message content'
complete -c ${name} -n '__fish_seen_subcommand_from send; and __fish_seen_subcommand_from chat' -l post -d 'Send as a post'
complete -c ${name} -n '__fish_seen_subcommand_from send; and __fish_seen_subcommand_from chat' -l title -d 'Post title'
complete -c ${name} -n '__fish_seen_subcommand_from messages; and __fish_seen_subcommand_from chat' -l limit -d 'Max messages'
complete -c ${name} -n '__fish_seen_subcommand_from reply; and __fish_seen_subcommand_from chat' -s m -l message -d 'Reply content'
complete -c ${name} -n '__fish_seen_subcommand_from replies; and __fish_seen_subcommand_from chat' -l limit -d 'Max replies'
complete -c ${name} -n '__fish_seen_subcommand_from react; and __fish_seen_subcommand_from chat' -l emoji -d 'Emoji name'
complete -c ${name} -n '__fish_seen_subcommand_from unreact; and __fish_seen_subcommand_from chat' -l emoji -d 'Emoji name to remove'
complete -c ${name} -n '__fish_seen_subcommand_from channel-create; and __fish_seen_subcommand_from chat' -l private -d 'Create as private'
complete -c ${name} -n '__fish_seen_subcommand_from channel-create; and __fish_seen_subcommand_from chat' -l topic -d 'Channel topic'
complete -c ${name} -n '__fish_seen_subcommand_from channel-create; and __fish_seen_subcommand_from chat' -l space -d 'Create on a space'
complete -c ${name} -n '__fish_seen_subcommand_from channel-create; and __fish_seen_subcommand_from chat' -l folder -d 'Create on a folder'
complete -c ${name} -n '__fish_seen_subcommand_from channel-create; and __fish_seen_subcommand_from chat' -l list -d 'Create on a list'
complete -c ${name} -n '__fish_seen_subcommand_from channel-update; and __fish_seen_subcommand_from chat' -l name -d 'New name'
complete -c ${name} -n '__fish_seen_subcommand_from channel-update; and __fish_seen_subcommand_from chat' -l topic -d 'New topic'
complete -c ${name} -n '__fish_seen_subcommand_from channel-update; and __fish_seen_subcommand_from chat' -l description -d 'New description'
complete -c ${name} -n '__fish_seen_subcommand_from channel-update; and __fish_seen_subcommand_from chat' -l visibility -d 'PUBLIC or PRIVATE'
complete -c ${name} -n '__fish_seen_subcommand_from channel-delete; and __fish_seen_subcommand_from chat' -l confirm -d 'Skip confirmation'
complete -c ${name} -n '__fish_seen_subcommand_from message-update; and __fish_seen_subcommand_from chat' -s m -l message -d 'New message content'
complete -c ${name} -n '__fish_seen_subcommand_from message-delete; and __fish_seen_subcommand_from chat' -l confirm -d 'Skip confirmation'

complete -c ${name} -n '__fish_seen_subcommand_from profile; and not __fish_seen_subcommand_from list add remove use' -a list -d 'List all profiles'
complete -c ${name} -n '__fish_seen_subcommand_from profile; and not __fish_seen_subcommand_from list add remove use' -a add -d 'Add a new profile'
complete -c ${name} -n '__fish_seen_subcommand_from profile; and not __fish_seen_subcommand_from list add remove use' -a remove -d 'Remove a profile'
complete -c ${name} -n '__fish_seen_subcommand_from profile; and not __fish_seen_subcommand_from list add remove use' -a use -d 'Set the default profile'
complete -c ${name} -n '__fish_seen_subcommand_from list; and __fish_seen_subcommand_from profile' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from config; and not __fish_seen_subcommand_from get set path' -a get -d 'Print a config value'
complete -c ${name} -n '__fish_seen_subcommand_from config; and not __fish_seen_subcommand_from get set path' -a set -d 'Set a config value'
complete -c ${name} -n '__fish_seen_subcommand_from config; and not __fish_seen_subcommand_from get set path' -a path -d 'Print config file path'
complete -c ${name} -n '__fish_seen_subcommand_from get set' -a 'apiToken teamId sprintFolderId' -d 'Config key'

complete -c ${name} -n '__fish_seen_subcommand_from completion' -a 'bash zsh fish' -d 'Shell type'

complete -c ${name} -n '__fish_seen_subcommand_from filter; and not __fish_seen_subcommand_from save run list delete show' -a save -d 'Save a command shortcut'
complete -c ${name} -n '__fish_seen_subcommand_from filter; and not __fish_seen_subcommand_from save run list delete show' -a run -d 'Run a saved shortcut'
complete -c ${name} -n '__fish_seen_subcommand_from filter; and not __fish_seen_subcommand_from save run list delete show' -a list -d 'List saved shortcuts'
complete -c ${name} -n '__fish_seen_subcommand_from filter; and not __fish_seen_subcommand_from save run list delete show' -a delete -d 'Delete a saved shortcut'
complete -c ${name} -n '__fish_seen_subcommand_from filter; and not __fish_seen_subcommand_from save run list delete show' -a show -d 'Show details of a saved shortcut'
complete -c ${name} -n '__fish_seen_subcommand_from save run list delete show; and __fish_seen_subcommand_from filter' -l json -d 'Force JSON output'
complete -c ${name} -n '__fish_seen_subcommand_from save; and __fish_seen_subcommand_from filter' -s d -l description -d 'Filter description'

complete -c ${name} -n '__fish_seen_subcommand_from favorite; and not __fish_seen_subcommand_from add remove list' -a add -d 'Add a favorite'
complete -c ${name} -n '__fish_seen_subcommand_from favorite; and not __fish_seen_subcommand_from add remove list' -a remove -d 'Remove a favorite'
complete -c ${name} -n '__fish_seen_subcommand_from favorite; and not __fish_seen_subcommand_from add remove list' -a list -d 'List saved favorites'
complete -c ${name} -n '__fish_seen_subcommand_from add; and __fish_seen_subcommand_from favorite' -a 'sprint-folder space list folder view task' -d 'Entity type'
complete -c ${name} -n '__fish_seen_subcommand_from add remove list; and __fish_seen_subcommand_from favorite' -l json -d 'Force JSON output'
complete -c ${name} -n '__fish_seen_subcommand_from add; and __fish_seen_subcommand_from favorite' -s n -l name -d 'Display name'
complete -c ${name} -n '__fish_seen_subcommand_from list; and __fish_seen_subcommand_from favorite' -l type -d 'Filter by entity type'
`
}

export function generateCompletion(shell: string, name = 'cup'): string {
  switch (shell) {
    case 'bash':
      return bashCompletion(name)
    case 'zsh':
      return zshCompletion(name)
    case 'fish':
      return fishCompletion(name)
    default:
      throw new Error(`Unsupported shell: ${shell}. Supported shells: bash, zsh, fish`)
  }
}

import { commandMetadata, topLevelCommandDefinitions, topLevelCommandNames } from './metadata.js'
import type { CommandFlagDefinition, CommandMetadata } from './metadata.js'

const bashSpecialCaseCommands = new Set(['checklist', 'time', 'bulk', 'config', 'completion'])

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
        COMPREPLY=($(compgen -W "status" -- "$cur"))
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
            '--include-closed[Include done/closed tasks]' \\
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
            '(-s --status)'{-s,--status}'[New status]:status:(open "in progress" "in review" done closed)' \\
            '--priority[Priority level]:priority:(urgent high normal low)' \\
            '--due-date[Due date]:date:' \\
            '--time-estimate[Time estimate]:duration:' \\
            '--assignee[Add assignee]:user_id:' \\
            '--parent[Set parent task]:task_id:' \\
            '--json[Force JSON output]'
          ;;
        create)
          _arguments \\
            '(-l --list)'{-l,--list}'[Target list ID]:list_id:' \\
            '(-n --name)'{-n,--name}'[Task name]:name:' \\
            '(-d --description)'{-d,--description}'[Task description]:text:' \\
            '(-p --parent)'{-p,--parent}'[Parent task ID]:task_id:' \\
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
            '--notify-all[Notify all assignees]' \\
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
            '1:query:' \\
            '--status[Filter by status]:status:(open "in progress" "in review" done closed)' \\
            '--include-closed[Include done/closed tasks in search]' \\
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
            '--resolved[Mark comment as resolved]' \\
            '--unresolved[Mark comment as unresolved]' \\
            '--json[Force JSON output]'
          ;;
        comment-delete)
          _arguments \\
            '1:comment_id:' \\
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
            '--notify-all[Notify all assignees]' \\
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
        duplicate)
          _arguments \\
            '1:task_id:' \\
            '--json[Force JSON output]'
          ;;
        bulk)
          local -a bulk_cmds
          bulk_cmds=(
            'status:Update status of multiple tasks'
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
        folders)
          _arguments \\
            '1:space_id:' \\
            '--name[Filter by folder name]:text:' \\
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
complete -c ${name} -n '__fish_seen_subcommand_from update; and __fish_seen_subcommand_from time' -s d -l description -d 'New description'
complete -c ${name} -n '__fish_seen_subcommand_from update; and __fish_seen_subcommand_from time' -l duration -d 'New duration'

complete -c ${name} -n '__fish_seen_subcommand_from attach' -F

complete -c ${name} -n '__fish_seen_subcommand_from bulk; and not __fish_seen_subcommand_from status' -a status -d 'Update status of multiple tasks'
complete -c ${name} -n '__fish_seen_subcommand_from status; and __fish_seen_subcommand_from bulk' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from config; and not __fish_seen_subcommand_from get set path' -a get -d 'Print a config value'
complete -c ${name} -n '__fish_seen_subcommand_from config; and not __fish_seen_subcommand_from get set path' -a set -d 'Set a config value'
complete -c ${name} -n '__fish_seen_subcommand_from config; and not __fish_seen_subcommand_from get set path' -a path -d 'Print config file path'
complete -c ${name} -n '__fish_seen_subcommand_from get set' -a 'apiToken teamId sprintFolderId' -d 'Config key'

complete -c ${name} -n '__fish_seen_subcommand_from completion' -a 'bash zsh fish' -d 'Shell type'
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

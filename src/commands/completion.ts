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

  local commands="init auth tasks task update create sprint sprints subtasks comment comment-edit comment-delete comments replies reply activity lists spaces inbox assigned open search summary overdue assign depend link attach move field delete tag tags checklist time docs doc doc-create doc-pages doc-page-create doc-page-edit folders config completion"

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
    tasks)
      COMPREPLY=($(compgen -W "--status --list --space --name --type --include-closed --json" -- "$cur"))
      ;;
    task)
      COMPREPLY=($(compgen -W "--json" -- "$cur"))
      ;;
    update)
      COMPREPLY=($(compgen -W "-n --name -d --description -s --status --priority --due-date --time-estimate --assignee --parent --json" -- "$cur"))
      ;;
    create)
      COMPREPLY=($(compgen -W "-l --list -n --name -d --description -p --parent -s --status --priority --due-date --assignee --tags --custom-item-id --time-estimate --json" -- "$cur"))
      ;;
    sprint)
      COMPREPLY=($(compgen -W "--status --space --folder --include-closed --json" -- "$cur"))
      ;;
    sprints)
      COMPREPLY=($(compgen -W "--space --json" -- "$cur"))
      ;;
    subtasks)
      COMPREPLY=($(compgen -W "--status --name --include-closed --json" -- "$cur"))
      ;;
    comment)
      COMPREPLY=($(compgen -W "-m --message --notify-all --json" -- "$cur"))
      ;;
    comments)
      COMPREPLY=($(compgen -W "--json" -- "$cur"))
      ;;
    activity)
      COMPREPLY=($(compgen -W "--json" -- "$cur"))
      ;;
    lists)
      COMPREPLY=($(compgen -W "--name --json" -- "$cur"))
      ;;
    spaces)
      COMPREPLY=($(compgen -W "--name --my --json" -- "$cur"))
      ;;
    inbox)
      COMPREPLY=($(compgen -W "--include-closed --json --days" -- "$cur"))
      ;;
    assigned)
      COMPREPLY=($(compgen -W "--status --include-closed --json" -- "$cur"))
      ;;
    open)
      COMPREPLY=($(compgen -W "--json" -- "$cur"))
      ;;
    search)
      COMPREPLY=($(compgen -W "--status --include-closed --json" -- "$cur"))
      ;;
    summary)
      COMPREPLY=($(compgen -W "--hours --json" -- "$cur"))
      ;;
    overdue)
      COMPREPLY=($(compgen -W "--include-closed --json" -- "$cur"))
      ;;
    assign)
      COMPREPLY=($(compgen -W "--to --remove --json" -- "$cur"))
      ;;
    auth)
      COMPREPLY=($(compgen -W "--json" -- "$cur"))
      ;;
    depend)
      COMPREPLY=($(compgen -W "--on --blocks --remove --json" -- "$cur"))
      ;;
    move)
      COMPREPLY=($(compgen -W "--to --remove --json" -- "$cur"))
      ;;
    field)
      COMPREPLY=($(compgen -W "--set --remove --json" -- "$cur"))
      ;;
    delete)
      COMPREPLY=($(compgen -W "--confirm --json" -- "$cur"))
      ;;
    tag)
      COMPREPLY=($(compgen -W "--add --remove --json" -- "$cur"))
      ;;
    checklist)
      if [[ $cword -eq 2 ]]; then
        COMPREPLY=($(compgen -W "view create delete add-item edit-item delete-item" -- "$cur"))
      fi
      ;;
    time)
      if [[ $cword -eq 2 ]]; then
        COMPREPLY=($(compgen -W "start stop status log list" -- "$cur"))
      fi
      ;;
    comment-edit)
      COMPREPLY=($(compgen -W "-m --message --resolved --unresolved --json" -- "$cur"))
      ;;
    comment-delete)
      COMPREPLY=($(compgen -W "--json" -- "$cur"))
      ;;
    replies)
      COMPREPLY=($(compgen -W "--json" -- "$cur"))
      ;;
    reply)
      COMPREPLY=($(compgen -W "-m --message --notify-all --json" -- "$cur"))
      ;;
    link)
      COMPREPLY=($(compgen -W "--remove --json" -- "$cur"))
      ;;
    attach)
      COMPREPLY=($(compgen -f -- "$cur"))
      ;;
    docs)
      COMPREPLY=($(compgen -W "--json" -- "$cur"))
      ;;
    doc)
      COMPREPLY=($(compgen -W "--json" -- "$cur"))
      ;;
    doc-pages)
      COMPREPLY=($(compgen -W "--json" -- "$cur"))
      ;;
    tags)
      COMPREPLY=($(compgen -W "--json" -- "$cur"))
      ;;
    folders)
      COMPREPLY=($(compgen -W "--name --json" -- "$cur"))
      ;;
    doc-create)
      COMPREPLY=($(compgen -W "-c --content --json" -- "$cur"))
      ;;
    doc-page-create)
      COMPREPLY=($(compgen -W "-c --content --parent-page --json" -- "$cur"))
      ;;
    doc-page-edit)
      COMPREPLY=($(compgen -W "--name -c --content --json" -- "$cur"))
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
    'init:Set up ${name} for the first time'
    'auth:Validate API token and show current user'
    'tasks:List tasks assigned to me'
    'task:Get task details'
    'update:Update a task'
    'create:Create a new task'
    'sprint:List my tasks in the current active sprint'
    'sprints:List all sprints in sprint folders'
    'subtasks:List subtasks of a task or initiative'
    'comment:Post a comment on a task'
    'comments:List comments on a task'
    'activity:Show task details and comments combined'
    'lists:List all lists in a space'
    'spaces:List spaces in your workspace'
    'inbox:Recently updated tasks grouped by time period'
    'assigned:Show all tasks assigned to me'
    'open:Open a task in the browser by ID or name'
    'search:Search my tasks by name'
    'summary:Daily standup summary'
    'overdue:List tasks that are past their due date'
    'assign:Assign or unassign users from a task'
    'depend:Add or remove task dependencies'
    'move:Add or remove a task from a list'
    'field:Set or remove a custom field value on a task'
    'delete:Delete a task'
    'tag:Add or remove tags from a task'
    'checklist:Manage checklists on a task'
    'time:Track time on tasks'
    'comment-edit:Edit an existing comment'
    'comment-delete:Delete a comment'
    'replies:List threaded replies on a comment'
    'reply:Reply to a comment'
    'link:Add or remove a link between two tasks'
    'attach:Upload a file attachment to a task'
    'docs:List workspace docs'
    'doc:View a doc or doc page'
    'doc-create:Create a new doc'
    'doc-pages:List all pages in a doc with content'
    'doc-page-create:Create a page in a doc'
    'doc-page-edit:Edit a doc page'
    'tags:List tags in a space'
    'folders:List folders in a space'
    'config:Manage CLI configuration'
    'completion:Output shell completion script'
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

complete -c ${name} -n __fish_use_subcommand -a init -d 'Set up ${name} for the first time'
complete -c ${name} -n __fish_use_subcommand -a auth -d 'Validate API token and show current user'
complete -c ${name} -n __fish_use_subcommand -a tasks -d 'List tasks assigned to me'
complete -c ${name} -n __fish_use_subcommand -a task -d 'Get task details'
complete -c ${name} -n __fish_use_subcommand -a update -d 'Update a task'
complete -c ${name} -n __fish_use_subcommand -a create -d 'Create a new task'
complete -c ${name} -n __fish_use_subcommand -a sprint -d 'List my tasks in the current active sprint'
complete -c ${name} -n __fish_use_subcommand -a sprints -d 'List all sprints in sprint folders'
complete -c ${name} -n __fish_use_subcommand -a subtasks -d 'List subtasks of a task or initiative'
complete -c ${name} -n __fish_use_subcommand -a comment -d 'Post a comment on a task'
complete -c ${name} -n __fish_use_subcommand -a comments -d 'List comments on a task'
complete -c ${name} -n __fish_use_subcommand -a activity -d 'Show task details and comments combined'
complete -c ${name} -n __fish_use_subcommand -a lists -d 'List all lists in a space'
complete -c ${name} -n __fish_use_subcommand -a spaces -d 'List spaces in your workspace'
complete -c ${name} -n __fish_use_subcommand -a inbox -d 'Recently updated tasks grouped by time period'
complete -c ${name} -n __fish_use_subcommand -a assigned -d 'Show all tasks assigned to me'
complete -c ${name} -n __fish_use_subcommand -a open -d 'Open a task in the browser by ID or name'
complete -c ${name} -n __fish_use_subcommand -a search -d 'Search my tasks by name'
complete -c ${name} -n __fish_use_subcommand -a summary -d 'Daily standup summary'
complete -c ${name} -n __fish_use_subcommand -a overdue -d 'List tasks that are past their due date'
complete -c ${name} -n __fish_use_subcommand -a assign -d 'Assign or unassign users from a task'
complete -c ${name} -n __fish_use_subcommand -a depend -d 'Add or remove task dependencies'
complete -c ${name} -n __fish_use_subcommand -a move -d 'Add or remove a task from a list'
complete -c ${name} -n __fish_use_subcommand -a field -d 'Set or remove a custom field value on a task'
complete -c ${name} -n __fish_use_subcommand -a delete -d 'Delete a task'
complete -c ${name} -n __fish_use_subcommand -a tag -d 'Add or remove tags from a task'
complete -c ${name} -n __fish_use_subcommand -a checklist -d 'Manage checklists on a task'
complete -c ${name} -n __fish_use_subcommand -a time -d 'Track time on tasks'
complete -c ${name} -n __fish_use_subcommand -a comment-edit -d 'Edit an existing comment'
complete -c ${name} -n __fish_use_subcommand -a comment-delete -d 'Delete a comment'
complete -c ${name} -n __fish_use_subcommand -a replies -d 'List threaded replies on a comment'
complete -c ${name} -n __fish_use_subcommand -a reply -d 'Reply to a comment'
complete -c ${name} -n __fish_use_subcommand -a link -d 'Add or remove a link between two tasks'
complete -c ${name} -n __fish_use_subcommand -a attach -d 'Upload a file attachment to a task'
complete -c ${name} -n __fish_use_subcommand -a docs -d 'List workspace docs'
complete -c ${name} -n __fish_use_subcommand -a doc -d 'View a doc or doc page'
complete -c ${name} -n __fish_use_subcommand -a doc-create -d 'Create a new doc'
complete -c ${name} -n __fish_use_subcommand -a doc-pages -d 'List all pages in a doc with content'
complete -c ${name} -n __fish_use_subcommand -a doc-page-create -d 'Create a page in a doc'
complete -c ${name} -n __fish_use_subcommand -a doc-page-edit -d 'Edit a doc page'
complete -c ${name} -n __fish_use_subcommand -a tags -d 'List tags in a space'
complete -c ${name} -n __fish_use_subcommand -a folders -d 'List folders in a space'
complete -c ${name} -n __fish_use_subcommand -a config -d 'Manage CLI configuration'
complete -c ${name} -n __fish_use_subcommand -a completion -d 'Output shell completion script'

complete -c ${name} -n '__fish_seen_subcommand_from auth' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from tasks' -l status -d 'Filter by status'
complete -c ${name} -n '__fish_seen_subcommand_from tasks' -l list -d 'Filter by list ID'
complete -c ${name} -n '__fish_seen_subcommand_from tasks' -l space -d 'Filter by space ID'
complete -c ${name} -n '__fish_seen_subcommand_from tasks' -l name -d 'Filter by name'
complete -c ${name} -n '__fish_seen_subcommand_from tasks' -l type -d 'Filter by task type'
complete -c ${name} -n '__fish_seen_subcommand_from tasks' -l include-closed -d 'Include done/closed tasks'
complete -c ${name} -n '__fish_seen_subcommand_from tasks' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from task' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from update' -s n -l name -d 'New task name'
complete -c ${name} -n '__fish_seen_subcommand_from update' -s d -l description -d 'New description'
complete -c ${name} -n '__fish_seen_subcommand_from update' -s s -l status -d 'New status'
complete -c ${name} -n '__fish_seen_subcommand_from update' -l priority -d 'Priority level' -a 'urgent high normal low'
complete -c ${name} -n '__fish_seen_subcommand_from update' -l due-date -d 'Due date'
complete -c ${name} -n '__fish_seen_subcommand_from update' -l time-estimate -d 'Time estimate'
complete -c ${name} -n '__fish_seen_subcommand_from update' -l assignee -d 'Add assignee'
complete -c ${name} -n '__fish_seen_subcommand_from update' -l parent -d 'Set parent task'
complete -c ${name} -n '__fish_seen_subcommand_from update' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from create' -s l -l list -d 'Target list ID'
complete -c ${name} -n '__fish_seen_subcommand_from create' -s n -l name -d 'Task name'
complete -c ${name} -n '__fish_seen_subcommand_from create' -s d -l description -d 'Task description'
complete -c ${name} -n '__fish_seen_subcommand_from create' -s p -l parent -d 'Parent task ID'
complete -c ${name} -n '__fish_seen_subcommand_from create' -s s -l status -d 'Initial status'
complete -c ${name} -n '__fish_seen_subcommand_from create' -l priority -d 'Priority level' -a 'urgent high normal low'
complete -c ${name} -n '__fish_seen_subcommand_from create' -l due-date -d 'Due date'
complete -c ${name} -n '__fish_seen_subcommand_from create' -l assignee -d 'Assignee user ID'
complete -c ${name} -n '__fish_seen_subcommand_from create' -l tags -d 'Comma-separated tag names'
complete -c ${name} -n '__fish_seen_subcommand_from create' -l custom-item-id -d 'Custom task type ID'
complete -c ${name} -n '__fish_seen_subcommand_from create' -l time-estimate -d 'Time estimate'
complete -c ${name} -n '__fish_seen_subcommand_from create' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from sprint' -l status -d 'Filter by status'
complete -c ${name} -n '__fish_seen_subcommand_from sprint' -l space -d 'Narrow sprint search to a space'
complete -c ${name} -n '__fish_seen_subcommand_from sprint' -l folder -d 'Sprint folder ID'
complete -c ${name} -n '__fish_seen_subcommand_from sprint' -l include-closed -d 'Include done/closed tasks'
complete -c ${name} -n '__fish_seen_subcommand_from sprint' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from sprints' -l space -d 'Filter by space'
complete -c ${name} -n '__fish_seen_subcommand_from sprints' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from subtasks' -l status -d 'Filter by status'
complete -c ${name} -n '__fish_seen_subcommand_from subtasks' -l name -d 'Filter by name'
complete -c ${name} -n '__fish_seen_subcommand_from subtasks' -l include-closed -d 'Include closed/done subtasks'
complete -c ${name} -n '__fish_seen_subcommand_from subtasks' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from comment' -s m -l message -d 'Comment text'
complete -c ${name} -n '__fish_seen_subcommand_from comment' -l notify-all -d 'Notify all assignees'
complete -c ${name} -n '__fish_seen_subcommand_from comment' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from comments' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from activity' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from lists' -l name -d 'Filter by name'
complete -c ${name} -n '__fish_seen_subcommand_from lists' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from spaces' -l name -d 'Filter spaces by name'
complete -c ${name} -n '__fish_seen_subcommand_from spaces' -l my -d 'Show only spaces where I have assigned tasks'
complete -c ${name} -n '__fish_seen_subcommand_from spaces' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from inbox' -l include-closed -d 'Include done/closed tasks'
complete -c ${name} -n '__fish_seen_subcommand_from inbox' -l json -d 'Force JSON output'
complete -c ${name} -n '__fish_seen_subcommand_from inbox' -l days -d 'Lookback period in days'

complete -c ${name} -n '__fish_seen_subcommand_from assigned' -l status -d 'Show only tasks with this status'
complete -c ${name} -n '__fish_seen_subcommand_from assigned' -l include-closed -d 'Include done/closed tasks'
complete -c ${name} -n '__fish_seen_subcommand_from assigned' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from open' -l json -d 'Output task JSON instead of opening'

complete -c ${name} -n '__fish_seen_subcommand_from search' -l status -d 'Filter by status'
complete -c ${name} -n '__fish_seen_subcommand_from search' -l include-closed -d 'Include done/closed tasks in search'
complete -c ${name} -n '__fish_seen_subcommand_from search' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from summary' -l hours -d 'Completed-tasks lookback in hours'
complete -c ${name} -n '__fish_seen_subcommand_from summary' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from overdue' -l include-closed -d 'Include done/closed overdue tasks'
complete -c ${name} -n '__fish_seen_subcommand_from overdue' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from assign' -l to -d 'Add assignee'
complete -c ${name} -n '__fish_seen_subcommand_from assign' -l remove -d 'Remove assignee'
complete -c ${name} -n '__fish_seen_subcommand_from assign' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from depend' -l on -d 'Task that this task depends on'
complete -c ${name} -n '__fish_seen_subcommand_from depend' -l blocks -d 'Task that this task blocks'
complete -c ${name} -n '__fish_seen_subcommand_from depend' -l remove -d 'Remove the dependency'
complete -c ${name} -n '__fish_seen_subcommand_from depend' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from move' -l to -d 'Add task to this list'
complete -c ${name} -n '__fish_seen_subcommand_from move' -l remove -d 'Remove task from this list'
complete -c ${name} -n '__fish_seen_subcommand_from move' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from field' -l set -d 'Set field name and value'
complete -c ${name} -n '__fish_seen_subcommand_from field' -l remove -d 'Remove field value by name'
complete -c ${name} -n '__fish_seen_subcommand_from field' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from delete' -l confirm -d 'Skip confirmation prompt'
complete -c ${name} -n '__fish_seen_subcommand_from delete' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from tag' -l add -d 'Comma-separated tag names to add'
complete -c ${name} -n '__fish_seen_subcommand_from tag' -l remove -d 'Comma-separated tag names to remove'
complete -c ${name} -n '__fish_seen_subcommand_from tag' -l json -d 'Force JSON output'

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

complete -c ${name} -n '__fish_seen_subcommand_from time; and not __fish_seen_subcommand_from start stop status log list' -a start -d 'Start tracking time on a task'
complete -c ${name} -n '__fish_seen_subcommand_from time; and not __fish_seen_subcommand_from start stop status log list' -a stop -d 'Stop the running timer'
complete -c ${name} -n '__fish_seen_subcommand_from time; and not __fish_seen_subcommand_from start stop status log list' -a status -d 'Show the currently running timer'
complete -c ${name} -n '__fish_seen_subcommand_from time; and not __fish_seen_subcommand_from start stop status log list' -a log -d 'Log a manual time entry'
complete -c ${name} -n '__fish_seen_subcommand_from time; and not __fish_seen_subcommand_from start stop status log list' -a list -d 'List recent time entries'
complete -c ${name} -n '__fish_seen_subcommand_from start stop status log list; and __fish_seen_subcommand_from time' -l json -d 'Force JSON output'
complete -c ${name} -n '__fish_seen_subcommand_from start; and __fish_seen_subcommand_from time' -s d -l description -d 'Description'
complete -c ${name} -n '__fish_seen_subcommand_from log; and __fish_seen_subcommand_from time' -s d -l description -d 'Description'
complete -c ${name} -n '__fish_seen_subcommand_from list; and __fish_seen_subcommand_from time' -l days -d 'Number of days to look back'
complete -c ${name} -n '__fish_seen_subcommand_from list; and __fish_seen_subcommand_from time' -l task -d 'Filter by task ID'

complete -c ${name} -n '__fish_seen_subcommand_from comment-delete' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from replies' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from reply' -s m -l message -d 'Reply text'
complete -c ${name} -n '__fish_seen_subcommand_from reply' -l notify-all -d 'Notify all assignees'
complete -c ${name} -n '__fish_seen_subcommand_from reply' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from link' -l remove -d 'Remove the link'
complete -c ${name} -n '__fish_seen_subcommand_from link' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from attach' -l json -d 'Force JSON output'
complete -c ${name} -n '__fish_seen_subcommand_from attach' -F

complete -c ${name} -n '__fish_seen_subcommand_from comment-edit' -s m -l message -d 'New comment text'
complete -c ${name} -n '__fish_seen_subcommand_from comment-edit' -l resolved -d 'Mark comment as resolved'
complete -c ${name} -n '__fish_seen_subcommand_from comment-edit' -l unresolved -d 'Mark comment as unresolved'
complete -c ${name} -n '__fish_seen_subcommand_from comment-edit' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from docs' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from doc' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from doc-pages' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from tags' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from folders' -l name -d 'Filter by folder name'
complete -c ${name} -n '__fish_seen_subcommand_from folders' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from doc-create' -s c -l content -d 'Initial content'
complete -c ${name} -n '__fish_seen_subcommand_from doc-create' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from doc-page-create' -s c -l content -d 'Page content'
complete -c ${name} -n '__fish_seen_subcommand_from doc-page-create' -l parent-page -d 'Parent page ID'
complete -c ${name} -n '__fish_seen_subcommand_from doc-page-create' -l json -d 'Force JSON output'

complete -c ${name} -n '__fish_seen_subcommand_from doc-page-edit' -l name -d 'New page name'
complete -c ${name} -n '__fish_seen_subcommand_from doc-page-edit' -s c -l content -d 'New page content'
complete -c ${name} -n '__fish_seen_subcommand_from doc-page-edit' -l json -d 'Force JSON output'

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

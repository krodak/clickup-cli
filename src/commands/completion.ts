function bashCompletion(): string {
  return `_cu_completions() {
  local cur prev words cword

  if type _init_completion &>/dev/null; then
    _init_completion || return
  else
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"
    words=("\${COMP_WORDS[@]}")
    cword=$COMP_CWORD
  fi

  local commands="init tasks initiatives task update create sprint subtasks comment comments lists spaces inbox assigned open summary overdue assign config completion"

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
    tasks|initiatives)
      COMPREPLY=($(compgen -W "--status --list --space --name --json" -- "$cur"))
      ;;
    task)
      COMPREPLY=($(compgen -W "--json" -- "$cur"))
      ;;
    update)
      COMPREPLY=($(compgen -W "--name --description --status --priority --due-date --assignee" -- "$cur"))
      ;;
    create)
      COMPREPLY=($(compgen -W "--list --name --description --parent --status --priority --due-date --assignee --tags" -- "$cur"))
      ;;
    sprint)
      COMPREPLY=($(compgen -W "--status --space --json" -- "$cur"))
      ;;
    subtasks)
      COMPREPLY=($(compgen -W "--json" -- "$cur"))
      ;;
    comment)
      COMPREPLY=($(compgen -W "--message" -- "$cur"))
      ;;
    comments)
      COMPREPLY=($(compgen -W "--json" -- "$cur"))
      ;;
    lists)
      COMPREPLY=($(compgen -W "--name --json" -- "$cur"))
      ;;
    spaces)
      COMPREPLY=($(compgen -W "--name --my --json" -- "$cur"))
      ;;
    inbox)
      COMPREPLY=($(compgen -W "--json --days" -- "$cur"))
      ;;
    assigned)
      COMPREPLY=($(compgen -W "--include-closed --json" -- "$cur"))
      ;;
    open)
      COMPREPLY=($(compgen -W "--json" -- "$cur"))
      ;;
    summary)
      COMPREPLY=($(compgen -W "--hours --json" -- "$cur"))
      ;;
    overdue)
      COMPREPLY=($(compgen -W "--json" -- "$cur"))
      ;;
    assign)
      COMPREPLY=($(compgen -W "--to --remove --json" -- "$cur"))
      ;;
    config)
      if [[ $cword -eq 2 ]]; then
        COMPREPLY=($(compgen -W "get set path" -- "$cur"))
      elif [[ $cword -eq 3 ]]; then
        local subcmd="\${words[2]}"
        case "$subcmd" in
          get|set)
            COMPREPLY=($(compgen -W "apiToken teamId" -- "$cur"))
            ;;
        esac
      fi
      ;;
    completion)
      COMPREPLY=($(compgen -W "bash zsh fish" -- "$cur"))
      ;;
  esac
}
complete -F _cu_completions cu
`
}

function zshCompletion(): string {
  return `#compdef cu

_cu() {
  local -a commands
  commands=(
    'init:Set up cu for the first time'
    'tasks:List tasks assigned to me'
    'initiatives:List initiatives assigned to me'
    'task:Get task details'
    'update:Update a task'
    'create:Create a new task'
    'sprint:List my tasks in the current active sprint'
    'subtasks:List subtasks of a task or initiative'
    'comment:Post a comment on a task'
    'comments:List comments on a task'
    'lists:List all lists in a space'
    'spaces:List spaces in your workspace'
    'inbox:Recently updated tasks grouped by time period'
    'assigned:Show all tasks assigned to me'
    'open:Open a task in the browser by ID or name'
    'summary:Daily standup summary'
    'overdue:List tasks that are past their due date'
    'assign:Assign or unassign users from a task'
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
        tasks|initiatives)
          _arguments \\
            '--status[Filter by status]:status:(open "in progress" "in review" done closed)' \\
            '--list[Filter by list ID]:list_id:' \\
            '--space[Filter by space ID]:space_id:' \\
            '--name[Filter by name]:query:' \\
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
            '--assignee[Add assignee]:user_id:'
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
            '--tags[Comma-separated tag names]:tags:'
          ;;
        sprint)
          _arguments \\
            '--status[Filter by status]:status:(open "in progress" "in review" done closed)' \\
            '--space[Narrow sprint search to a space]:space:' \\
            '--json[Force JSON output]'
          ;;
        subtasks)
          _arguments \\
            '1:task_id:' \\
            '--json[Force JSON output]'
          ;;
        comment)
          _arguments \\
            '1:task_id:' \\
            '(-m --message)'{-m,--message}'[Comment text]:text:'
          ;;
        comments)
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
            '--json[Force JSON output]' \\
            '--days[Lookback period in days]:days:'
          ;;
        assigned)
          _arguments \\
            '--include-closed[Include done/closed tasks]' \\
            '--json[Force JSON output]'
          ;;
        open)
          _arguments \\
            '1:query:' \\
            '--json[Output task JSON instead of opening]'
          ;;
        summary)
          _arguments \\
            '--hours[Completed-tasks lookback in hours]:hours:' \\
            '--json[Force JSON output]'
          ;;
        overdue)
          _arguments \\
            '--json[Force JSON output]'
          ;;
        assign)
          _arguments \\
            '1:task_id:' \\
            '--to[Add assignee]:user_id:' \\
            '--remove[Remove assignee]:user_id:' \\
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
                  _arguments '1:key:(apiToken teamId)'
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

_cu
`
}

function fishCompletion(): string {
  return `# Disable file completions
complete -c cu -f

# Global flags
complete -c cu -n __fish_use_subcommand -s h -l help -d 'Show help'
complete -c cu -n __fish_use_subcommand -s V -l version -d 'Show version'

# Commands
complete -c cu -n __fish_use_subcommand -a init -d 'Set up cu for the first time'
complete -c cu -n __fish_use_subcommand -a tasks -d 'List tasks assigned to me'
complete -c cu -n __fish_use_subcommand -a initiatives -d 'List initiatives assigned to me'
complete -c cu -n __fish_use_subcommand -a task -d 'Get task details'
complete -c cu -n __fish_use_subcommand -a update -d 'Update a task'
complete -c cu -n __fish_use_subcommand -a create -d 'Create a new task'
complete -c cu -n __fish_use_subcommand -a sprint -d 'List my tasks in the current active sprint'
complete -c cu -n __fish_use_subcommand -a subtasks -d 'List subtasks of a task or initiative'
complete -c cu -n __fish_use_subcommand -a comment -d 'Post a comment on a task'
complete -c cu -n __fish_use_subcommand -a comments -d 'List comments on a task'
complete -c cu -n __fish_use_subcommand -a lists -d 'List all lists in a space'
complete -c cu -n __fish_use_subcommand -a spaces -d 'List spaces in your workspace'
complete -c cu -n __fish_use_subcommand -a inbox -d 'Recently updated tasks grouped by time period'
complete -c cu -n __fish_use_subcommand -a assigned -d 'Show all tasks assigned to me'
complete -c cu -n __fish_use_subcommand -a open -d 'Open a task in the browser by ID or name'
complete -c cu -n __fish_use_subcommand -a summary -d 'Daily standup summary'
complete -c cu -n __fish_use_subcommand -a overdue -d 'List tasks that are past their due date'
complete -c cu -n __fish_use_subcommand -a assign -d 'Assign or unassign users from a task'
complete -c cu -n __fish_use_subcommand -a config -d 'Manage CLI configuration'
complete -c cu -n __fish_use_subcommand -a completion -d 'Output shell completion script'

# tasks / initiatives flags
complete -c cu -n '__fish_seen_subcommand_from tasks initiatives' -l status -d 'Filter by status'
complete -c cu -n '__fish_seen_subcommand_from tasks initiatives' -l list -d 'Filter by list ID'
complete -c cu -n '__fish_seen_subcommand_from tasks initiatives' -l space -d 'Filter by space ID'
complete -c cu -n '__fish_seen_subcommand_from tasks initiatives' -l name -d 'Filter by name'
complete -c cu -n '__fish_seen_subcommand_from tasks initiatives' -l json -d 'Force JSON output'

# task flags
complete -c cu -n '__fish_seen_subcommand_from task' -l json -d 'Force JSON output'

# update flags
complete -c cu -n '__fish_seen_subcommand_from update' -s n -l name -d 'New task name'
complete -c cu -n '__fish_seen_subcommand_from update' -s d -l description -d 'New description'
complete -c cu -n '__fish_seen_subcommand_from update' -s s -l status -d 'New status'
complete -c cu -n '__fish_seen_subcommand_from update' -l priority -d 'Priority level' -a 'urgent high normal low'
complete -c cu -n '__fish_seen_subcommand_from update' -l due-date -d 'Due date'
complete -c cu -n '__fish_seen_subcommand_from update' -l assignee -d 'Add assignee'

# create flags
complete -c cu -n '__fish_seen_subcommand_from create' -s l -l list -d 'Target list ID'
complete -c cu -n '__fish_seen_subcommand_from create' -s n -l name -d 'Task name'
complete -c cu -n '__fish_seen_subcommand_from create' -s d -l description -d 'Task description'
complete -c cu -n '__fish_seen_subcommand_from create' -s p -l parent -d 'Parent task ID'
complete -c cu -n '__fish_seen_subcommand_from create' -s s -l status -d 'Initial status'
complete -c cu -n '__fish_seen_subcommand_from create' -l priority -d 'Priority level' -a 'urgent high normal low'
complete -c cu -n '__fish_seen_subcommand_from create' -l due-date -d 'Due date'
complete -c cu -n '__fish_seen_subcommand_from create' -l assignee -d 'Assignee user ID'
complete -c cu -n '__fish_seen_subcommand_from create' -l tags -d 'Comma-separated tag names'

# sprint flags
complete -c cu -n '__fish_seen_subcommand_from sprint' -l status -d 'Filter by status'
complete -c cu -n '__fish_seen_subcommand_from sprint' -l space -d 'Narrow sprint search to a space'
complete -c cu -n '__fish_seen_subcommand_from sprint' -l json -d 'Force JSON output'

# subtasks flags
complete -c cu -n '__fish_seen_subcommand_from subtasks' -l json -d 'Force JSON output'

# comment flags
complete -c cu -n '__fish_seen_subcommand_from comment' -s m -l message -d 'Comment text'

# comments flags
complete -c cu -n '__fish_seen_subcommand_from comments' -l json -d 'Force JSON output'

# lists flags
complete -c cu -n '__fish_seen_subcommand_from lists' -l name -d 'Filter by name'
complete -c cu -n '__fish_seen_subcommand_from lists' -l json -d 'Force JSON output'

# spaces flags
complete -c cu -n '__fish_seen_subcommand_from spaces' -l name -d 'Filter spaces by name'
complete -c cu -n '__fish_seen_subcommand_from spaces' -l my -d 'Show only spaces where I have assigned tasks'
complete -c cu -n '__fish_seen_subcommand_from spaces' -l json -d 'Force JSON output'

# inbox flags
complete -c cu -n '__fish_seen_subcommand_from inbox' -l json -d 'Force JSON output'
complete -c cu -n '__fish_seen_subcommand_from inbox' -l days -d 'Lookback period in days'

# assigned flags
complete -c cu -n '__fish_seen_subcommand_from assigned' -l include-closed -d 'Include done/closed tasks'
complete -c cu -n '__fish_seen_subcommand_from assigned' -l json -d 'Force JSON output'

# open flags
complete -c cu -n '__fish_seen_subcommand_from open' -l json -d 'Output task JSON instead of opening'

# summary flags
complete -c cu -n '__fish_seen_subcommand_from summary' -l hours -d 'Completed-tasks lookback in hours'
complete -c cu -n '__fish_seen_subcommand_from summary' -l json -d 'Force JSON output'

# overdue flags
complete -c cu -n '__fish_seen_subcommand_from overdue' -l json -d 'Force JSON output'

# assign flags
complete -c cu -n '__fish_seen_subcommand_from assign' -l to -d 'Add assignee'
complete -c cu -n '__fish_seen_subcommand_from assign' -l remove -d 'Remove assignee'
complete -c cu -n '__fish_seen_subcommand_from assign' -l json -d 'Force JSON output'

# config subcommands
complete -c cu -n '__fish_seen_subcommand_from config; and not __fish_seen_subcommand_from get set path' -a get -d 'Print a config value'
complete -c cu -n '__fish_seen_subcommand_from config; and not __fish_seen_subcommand_from get set path' -a set -d 'Set a config value'
complete -c cu -n '__fish_seen_subcommand_from config; and not __fish_seen_subcommand_from get set path' -a path -d 'Print config file path'
complete -c cu -n '__fish_seen_subcommand_from get set' -a 'apiToken teamId' -d 'Config key'

# completion subcommand
complete -c cu -n '__fish_seen_subcommand_from completion' -a 'bash zsh fish' -d 'Shell type'
`
}

export function generateCompletion(shell: string): string {
  switch (shell) {
    case 'bash':
      return bashCompletion()
    case 'zsh':
      return zshCompletion()
    case 'fish':
      return fishCompletion()
    default:
      throw new Error(`Unsupported shell: ${shell}. Supported shells: bash, zsh, fish`)
  }
}

Output demos/agent-mode.gif

Set Shell bash
Set FontSize 14
Set Width 1200
Set Height 700
Set Padding 20
Set Theme "Dracula"
Set TypingSpeed 40ms
Set PlaybackSpeed 0.5

Type "# Agent reads task context (markdown output when piped)"
Enter
Sleep 1s

Type "cup task 86d2cpzm1 -p personal | head -25"
Enter
Sleep 3s

Type "# Agent checks sprint status (JSON for structured data)"
Enter
Sleep 1s

Type "cup sprint -p personal --json | jq '.[0] | {name, status, priority}'"
Enter
Sleep 3s

Type "# Agent posts a comment"
Enter
Sleep 1s

Type 'cup comment 86d2cpzm1 -p personal -m "Investigated auth flow - JWT with RS256 recommended"'
Enter
Sleep 3s

Type "# Agent updates task status"
Enter
Sleep 1s

Type 'cup update 86d2cpzm1 -p personal -s "to do"'
Enter
Sleep 3s

Sleep 1s

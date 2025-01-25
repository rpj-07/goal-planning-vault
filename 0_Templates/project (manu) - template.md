---
Created: <% tp.date.now("YYYY-MM-DD") %>
tags:
  - focus
  - project
title: "{{VALUE:⚒ Add Project}}"
date: "{{VALUE:date}}"
endDate: "{{VALUE:endDate}}"
Status: not started
subtitle: "{{VALUE:Project Subtitle}}"
start: 0
current: 
finish: 1
next-step:
---
```button
name Done
type command
action QuickAdd: set-done-with-date

```

%%
```js quickadd
const goalNotes = DataviewAPI.pages("#goal").where(
    (p) => !p.file.path.includes("Template")
).values;

const targetGoal = await this.quickAddApi.suggester(
    goalNotes.map((p) => p.file.name),
    goalNotes
);

// Überprüfen, ob eine `aliases`-Liste existiert und wähle den ersten Eintrag; falls nicht, verwende den Dateinamen
let alias = (targetGoal.aliases && targetGoal.aliases.length > 0) ? targetGoal.aliases[0] : targetGoal.file.name;
console.log("Gewähltes Ziel:", targetGoal); // Debugging: Zeigt `targetGoal` an
console.log("Alias:", alias); // Debugging: Zeigt den Alias oder den Fallback an

const targetGoalFile = app.vault.getAbstractFileByPath(targetGoal.file.path);
let markdownLink = this.app.fileManager.generateMarkdownLink(
    targetGoalFile,
    ""
);
markdownLink = `${markdownLink.slice(0, markdownLink.length - 2)}|${alias}${markdownLink.slice(markdownLink.length - 2)}`;
return `Goal:: ${markdownLink}`;
```
```js quickadd
const shouldProjectTrackProgress = await this.quickAddApi.yesNoPrompt(`Should this project track progress via markdown tasks?`, 'Enabling this will give the project note a Bar property, similarly to auto-tracked goals. The tasks are auto-tracked, so each time you check one off, you make progress.');
if (shouldProjectTrackProgress) return "Bar:: `$= dv.view('manuel-progress-bar', {file: 'P} {{VALUE:⚒ Add Project}}'})`";
```
%%


# {{VALUE:⚒ Add Project}}
## Project Info

## Thoughts

## Resources

## Review questions

## Tasks
#todo/focus
- [ ] 
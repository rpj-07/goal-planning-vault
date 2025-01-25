---
Created: <% tp.date.now("YYYY-MM-DD") %>
tags:
  - focus
  - weekgoal
date: "{{DATE}}"
endDate: "{{DATE:YYYY-MM-DD+7}}"
Status: not started
top-priority: true
start: 0
current: 0
finish: 1
next-step:
---

%%
```js quickadd
// Suche nach Notizen mit beiden Tags
const projectNotes = DataviewAPI.pages("#focus and #project").where(
    (p) => !p.file.path.includes("Template")
).values;

const targetProject = await this.quickAddApi.suggester(
    projectNotes.map((p) => p.file.name),
    projectNotes
);

// Überprüfen, ob eine `aliases`-Liste existiert und wähle den ersten Eintrag; falls nicht, verwende den Dateinamen
let alias = (targetProject.aliases && targetProject.aliases.length > 0) ? targetProject.aliases[0] : targetProject.file.name;
console.log("Gewähltes Projekt:", targetProject); // Debugging: Zeigt `targetProject` an
console.log("Alias:", alias); // Debugging: Zeigt den Alias oder den Fallback an

const targetProjectFile = app.vault.getAbstractFileByPath(targetProject.file.path);
let markdownLink = this.app.fileManager.generateMarkdownLink(
    targetProjectFile,
    ""
);
markdownLink = `${markdownLink.slice(0, markdownLink.length - 2)}|${alias}${markdownLink.slice(markdownLink.length - 2)}`;
return `Projekt:: ${markdownLink}`;
```
```js quickadd
const shouldProjectTrackProgress = await this.quickAddApi.yesNoPrompt(`Should this project track progress via markdown tasks?`, 'Enabling this will give the project note a Bar property, similarly to auto-tracked goals. The tasks are auto-tracked, so each time you check one off, you make progress.');
if (shouldProjectTrackProgress) return "Bar:: `$= dv.view('manuel-progress-bar', {file: 'W} {{VALUE:Wochenziel}}'})`";
```
%%

```button
name Done
type command
action QuickAdd: set-done-with-date
```


# <%tp.file.title%>

{{VALUE:comments}}

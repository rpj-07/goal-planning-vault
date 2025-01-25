---
Created: <% tp.date.now("YYYY-MM-DD") %>
tags:
  - focus
  - milestone
title: "{{VALUE:milestone}}"
aliases:
  - "{{VALUE:milestone}}"
date: "{{VALUE:date}}"
endDate: "{{VALUE:endDate}}"
Type: "{{VALUE:Life,Uni,School}}"
Status: 
Timespan: "{{VALUE:10 Years, 5 Years, 3 Years, 1 Year, 6 Months, 1 Month, 1 Week}}"
---
```button
name Done
type command
action QuickAdd: set-done-with-date
```

# <%tp.file.title%>

%%
Progress:: `$= dv.view('progress', {file: 'M} {{VALUE:milestone}}'})`
Target:: `$= dv.view('target', {file: 'M} {{VALUE:milestone}}'})`
Bar:: `$= dv.view('total-progress-bar', {file: 'M} {{VALUE:milestone}}'})`
Projects:: `$= const projects = dv.page('M} {{VALUE:milestone}}').file.inlinks.where(p => { const mp = dv.page(p.path); return mp.tags?.includes('project') && mp.status === 'in Progress'}); if (projects.length > 0) { dv.header(4, projects.length > 1 ? "Projects" : "Project"); dv.list(projects) }`
TimeProgress:: `$= dv.view('time-progress-bar', {file: 'M} M} {{VALUE:milestone}}'})`
```js quickadd
// Quartal Multiple-Choice
const quarters = ["Q1", "Q2", "Q3", "Q4"];
const getSelectedQuarters = async () => {
    const selected = [];
    
    const suggestQuarters = async () => {
        const remaining = quarters.filter(q => !selected.includes(q));
        if (remaining.length === 0) return false;
        
        // Füge Statusanzeige zur Auswahlliste hinzu
        const currentStatus = selected.length > 0 ? 
            `Bereits gewählt: ${selected.join(", ")}` : 
            "Keine Auswahl getroffen";
            
        const choice = await this.quickAddApi.suggester(
            [...remaining, "---" + currentStatus + "---", "✓ Fertig"],
            [...remaining, null, false]
        );
        
        if (choice === false || choice === null) return false;
        selected.push(choice);
        return true;
    };
    
    while (await suggestQuarters()) {}
    return selected;
};

const selectedQuarters = await getSelectedQuarters();

// Wenn keine Auswahl getroffen wurde
if (selectedQuarters.length === 0) {
    return "Keine Quartale ausgewählt";
}

// Formatiere die Ausgabe mit Templater-Syntax
const formattedQuarters = selectedQuarters.map(q => 
    `[[<%tp.date.now("YYYY")%> ${q}]]`
).join(", ");

return `Quartal:: ${formattedQuarters}`;
```
```js quickadd
const yearlyGoalNotes = DataviewAPI.pages("#yeargoal").where(
    (p) => !p.file.path.includes("Template")
).values;

const selectedYearlyGoal = await this.quickAddApi.suggester(
    yearlyGoalNotes.map((p) => p.file.name),
    yearlyGoalNotes
);

// Überprüfen ob Alias existiert, sonst Dateiname verwenden
let alias = (selectedYearlyGoal.aliases && selectedYearlyGoal.aliases.length > 0) ? 
    selectedYearlyGoal.aliases[0] : selectedYearlyGoal.file.name;

console.log("Ausgewähltes Jahresziel:", selectedYearlyGoal);
console.log("Alias:", alias);

const yearlyGoalFile = app.vault.getAbstractFileByPath(selectedYearlyGoal.file.path);
let markdownLink = this.app.fileManager.generateMarkdownLink(
    yearlyGoalFile,
    ""
);
markdownLink = `${markdownLink.slice(0, markdownLink.length - 2)}|${alias}${markdownLink.slice(markdownLink.length - 2)}`;
return `YearlyGoal:: ${markdownLink}`;
```
%%

## What does success look like? What are the key results?

- 

## Related core values

- 

## Projects to make this happen

### Ideas

-

### Created projects

```dataviewjs
const pages = dv.current().file.inlinks.where(p => dv.page(p.path).tags?.includes('project'));

dv.table(["Project", "Status", "Completed", "Tasks"], pages.map(p => {
	const page = dv.page(p.path);
	const tasks = page.file.tasks;
	return [
		page.file.link,
		page.status,
		tasks.where(t => t.fullyCompleted === true).length,
		tasks.length
	]
}));
```

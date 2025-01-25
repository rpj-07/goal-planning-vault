---
Created: 2025-01-25
tags:
  - milestone
  - focus
title: finish maths with an A+
aliases:
  - M} finish maths with an A+
date: 2025-01-01
endDate: 2025-01-25
Type: Life
Status: not started
Timespan: " 6 Months"
---
```button
name Done
type command
action QuickAdd: set-done-with-date
```

# M} finish maths with an A+

%%
Progress:: `$= dv.view('progress', {file: 'M} finish maths with an A+'})`
Target:: `$= dv.view('target', {file: 'M} finish maths with an A+'})`
Bar:: `$= dv.view('total-progress-bar', {file: 'M} finish maths with an A+'})`
Projects:: `$= const projects = dv.page('M} finish maths with an A+').file.inlinks.where(p => { const mp = dv.page(p.path); return mp.tags?.includes('project') && mp.status === 'in progress'}); if (projects.length > 0) { dv.header(4, projects.length > 1 ? "Projects" : "Project"); dv.list(projects) }`
TimeProgress:: `$= dv.view('time-progress-bar', {file: 'M} finish maths with an A+'})`
Quartal:: [[2025 Q1]]
YearlyGoal:: [[improve school]]
%%

## What does success look like? What are the key results?

- 

## Related core values

- 
## Projects to make this happen

### Ideas

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
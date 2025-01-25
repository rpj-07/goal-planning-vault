---
Created: 2025-01-25
tags:
  - focus
  - milestone
aliases:
  - listen to podcasts
date: 2025-02-25
endDate: 2025-07-24
Type: Life
Status: not started
Timespan: " 6 Months"
title: M} listen to podcasts
---
```button
name Done
type command
action QuickAdd: set-done-with-date
```

# M} listen to podcasts

%%
Progress:: `$= dv.view('progress', {file: 'M} listen to podcasts'})`
Target:: `$= dv.view('target', {file: 'M} listen to podcasts'})`
Bar:: `$= dv.view('total-progress-bar', {file: 'M} listen to podcasts'})`
Projects:: `$= const projects = dv.page('M} listen to podcasts').file.inlinks.where(p => { const mp = dv.page(p.path); return mp.tags?.includes('project') && mp.status === 'in Progress'}); if (projects.length > 0) { dv.header(4, projects.length > 1 ? "Projects" : "Project"); dv.list(projects) }`
TimeProgress:: `$= dv.view('time-progress-bar', {file: 'M} listen to podcasts'})`
Quartal:: [[2025 Q1]], [[2025 Q2]]
YearlyGoal:: [[learn extracurricular skills]]
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

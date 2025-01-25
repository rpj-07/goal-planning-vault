---
Created: <% tp.date.now("YYYY-MM-DD") %>
tags:
  - focus
  - yeargoal
title: "{{VALUE:goal}}"
date: "{{VALUE:date}}"
endDate: "{{VALUE:endDate}}"
Status: 
Timespan: "{{VALUE:10 Years, 5 Years, 3 Years, 1 Year, 6 Months, 1 Month, 1 Week}}"
---
```button
name Done
type command
action QuickAdd: set-done-with-date
```

# {{VALUE:goal}}

Bar:: `$= dv.view('goal-average-progress-bar', {file: '{{VALUE:goal}}'})`
TimeProgress:: `$= dv.view('time-progress-bar', {file: '<%tp.file.title%>'})`
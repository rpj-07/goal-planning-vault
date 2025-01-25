---
tags:
  - focus
aliases:
  - Home
cssclasses:
  - cards
  - cards-1-1
  - table-wide
---
# Dashboard

## Yearly goals
```dataview
TABLE
	YearlyGoal,
	Bar,
	TimeProgress
FROM #yeargoal 
WHERE type != "Archive" AND !contains(file.name, "emplate")
SORT Type DESC
```

## Milestones
```dataview
TABLE
	Milestone,
	Bar,
	TimeProgress
FROM #milestone
WHERE type != "Archive" AND !contains(file.name, "emplate")
SORT Type DESC
```

## Projects
```dataview
TABLE WITHOUT ID
	(link(file.path, alias[0])) as title,
	subtitle,
	Bar,
	("Milestone: " + link(Milestone, Milestone.alias)) as Milestone,
	TimeProgress
FROM #project
WHERE Status = "in progress"
```

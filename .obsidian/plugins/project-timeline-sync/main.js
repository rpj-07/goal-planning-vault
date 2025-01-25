'use strict';

var obsidian = require('obsidian');

// Settings Definition
class ProjectTimelineSyncSettings {
    constructor() {
        this.markwhenPath = 'goal planning/goal-timeline.mw';
        this.projectsFolderPath = 'goal planning/projects';
    }
}

// Settings Tab
class ProjectTimelineSyncSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        new obsidian.Setting(containerEl)
            .setName('Markwhen file path')
            .setDesc('Path to your Markwhen timeline file')
            .addText(text => text
                .setPlaceholder('path/to/timeline.mw')
                .setValue(this.plugin.settings.markwhenPath)
                .onChange(async (value) => {
                    this.plugin.settings.markwhenPath = value;
                    await this.plugin.saveSettings();
                }));

        new obsidian.Setting(containerEl)
            .setName('Projects folder path')
            .setDesc('Path to your projects folder')
            .addText(text => text
                .setPlaceholder('path/to/projects/folder')
                .setValue(this.plugin.settings.projectsFolderPath)
                .onChange(async (value) => {
                    this.plugin.settings.projectsFolderPath = value;
                    await this.plugin.saveSettings();
                }));
    }
}

class ProjectTimelineSync extends obsidian.Plugin {
    async onload() {
        console.log('Loading ProjectTimelineSync');

        // Load settings
        await this.loadSettings();

        // Add sync button
        this.addRibbonIcon('sync', 'Sync Projects with Timeline', async () => {
            console.log('Manual sync triggered');
            await this.fullSync();
        });

        // Add settings tab
        this.addSettingTab(new ProjectTimelineSyncSettingTab(this.app, this));

        // Watch for file deletions
        this.registerEvent(
            this.app.vault.on('delete', async (file) => {
                if (file.path.startsWith(this.settings.projectsFolderPath) && file.extension === 'md') {
                    console.log('Project file deleted:', file.path);
                    await this.removeFromTimeline(file);
                }
            })
        );
    }

    async loadSettings() {
        this.settings = Object.assign(new ProjectTimelineSyncSettings(), await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    // Extract display name from Goal property
    extractGoalName(content) {
        if (!content) return null;

        // Look for Goal property in content using RegEx that accounts for dataview format
        const goalMatch = content.match(/Milestone::\s*\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/);
        if (!goalMatch) return null;

        // Get the part before the pipe and remove everything before and including "}"
        const goalName = goalMatch[1].replace(/^.*?}/, '').trim();
        return goalName;
    }

    // Read Goal property from file content
    async getGoalProperty(file) {
        try {
            const content = await this.app.vault.read(file);
            return this.extractGoalName(content);
        } catch (error) {
            console.error(`Error reading Goal property from ${file.path}:`, error);
            return null;
        }
    }

    // Read tasks from project file
    async getProjectTasks(file) {
        const content = await this.app.vault.read(file);
        const tasks = [];
        const lines = content.split('\n');
        let inTasksSection = false;

        for (const line of lines) {
            // Check for Tasks section
            if (line.trim() === '## Tasks') {
                inTasksSection = true;
                continue;
            }
            // Exit if we hit another section
            if (inTasksSection && line.startsWith('##')) {
                break;
            }
            // Collect tasks if we're in the Tasks section
            if (inTasksSection) {
                const taskMatch = line.match(/^- \[([ x])\] (.*?)( ✅ \d{4}-\d{2}-\d{2})?$/);
                if (taskMatch) {
                    tasks.push({
                        completed: taskMatch[1] === 'x',
                        text: taskMatch[2],
                        completionDate: taskMatch[3] ? taskMatch[3].trim() : ''
                    });
                }
            }
        }

        return tasks;
    }

    // Format tasks for Markwhen
    formatTasks(tasks) {
        return tasks.map(task => {
            const checkbox = task.completed ? '[x]' : '[ ]';
            const completionDate = task.completed && task.completionDate ? ` ${task.completionDate}` : '';
            return `- ${checkbox} ${task.text}${completionDate}`;
        }).join('\n');
    }

    // Group projects by milestone and sort groups
    async groupProjectsByMilestone(projects) {
        const groupedProjects = new Map();
        const projectsWithoutGoal = [];

        for (const project of projects) {
            try {
                const goalName = await this.getGoalProperty(project.file);

                if (!goalName) {
                    projectsWithoutGoal.push(project.file.basename);
                    continue;
                }

                if (!groupedProjects.has(goalName)) {
                    groupedProjects.set(goalName, []);
                }
                groupedProjects.get(goalName).push(project);
            } catch (error) {
                console.error(`Error processing project ${project.file.path}:`, error);
            }
        }

        if (projectsWithoutGoal.length > 0) {
            const errorMessage = `Missing Goal property in: ${projectsWithoutGoal.join(', ')}`;
            console.error(errorMessage);
            new obsidian.Notice(errorMessage);
        }

        // Convert to array, sort, and convert back to Map
        const sortedEntries = Array.from(groupedProjects.entries()).sort((a, b) => {
            // Extract numbers from start of strings (if they exist)
            const aMatch = a[0].match(/^(\d+(?:\.\d+)?)/);
            const bMatch = b[0].match(/^(\d+(?:\.\d+)?)/);

            // If both have numbers, compare numerically
            if (aMatch && bMatch) {
                const aNum = parseFloat(aMatch[1]);
                const bNum = parseFloat(bMatch[1]);
                if (aNum !== bNum) return aNum - bNum;
            }
            // If only one has a number, put it first
            if (aMatch) return -1;
            if (bMatch) return 1;
            // Otherwise compare alphabetically
            return a[0].localeCompare(b[0]);
        });

        return new Map(sortedEntries);
    }

    async fullSync() {
        try {
            const markwhenFile = this.app.vault.getAbstractFileByPath(this.settings.markwhenPath);
            const projectsFolder = this.app.vault.getAbstractFileByPath(this.settings.projectsFolderPath);

            if (!markwhenFile || !projectsFolder) {
                console.error('Required files not found');
                new obsidian.Notice('Required files not found');
                return;
            }

            // Read Timeline Events
            const markwhenContent = await this.app.vault.read(markwhenFile);
            const timelineEvents = this.parseMarkwhenEvents(markwhenContent);
            const markwhenStat = await this.app.vault.adapter.stat(this.settings.markwhenPath);

            // Collect Project Events
            const projectsToSync = [];

            const processFile = async (file) => {
                if (file.extension === 'md') {
                    const metadata = this.app.metadataCache.getFileCache(file)?.frontmatter;

                    // Skip projects with status "done"
                    if (metadata?.Status === 'done') {
                        return;
                    }

                    if (metadata?.date && metadata?.endDate && metadata?.title) {
                        const projectStat = await this.app.vault.adapter.stat(file.path);
                        const timelineEvent = timelineEvents.find(e => e.fileName === `P} ${metadata.title}`);
                        const tasks = await this.getProjectTasks(file);

                        let shouldUpdateTimeline = false;

                        if (timelineEvent) {
                            // Compare modification dates only for date synchronization
                            const datesAreDifferent = metadata.date !== timelineEvent.startDate ||
                                metadata.endDate !== timelineEvent.endDate;

                            if (datesAreDifferent) {
                                if (projectStat.mtime > markwhenStat.mtime) {
                                    shouldUpdateTimeline = true;
                                } else if (markwhenStat.mtime > projectStat.mtime) {
                                    // Update project dates
                                    await this.updateProjectFile(file, {
                                        ...metadata,
                                        date: timelineEvent.startDate,
                                        endDate: timelineEvent.endDate
                                    });
                                }
                            } else {
                                shouldUpdateTimeline = true; // For tasks and status updates
                            }
                        } else {
                            shouldUpdateTimeline = true;
                        }

                        if (shouldUpdateTimeline) {
                            projectsToSync.push({
                                file: file,
                                metadata: metadata,
                                tasks: tasks
                            });
                        }
                    }
                }
            };

            // Process all files in the projects folder
            for (const child of projectsFolder.children) {
                await processFile(child);
            }

            // Group projects by milestones
            const groupedProjects = await this.groupProjectsByMilestone(projectsToSync);

            // Create new timeline content
            let newContent = '';
            for (const [goalName, projects] of groupedProjects) {
                newContent += `\ngroup ${goalName}\n`;

                for (const project of projects) {
                    const status = project.metadata.Status ? ` #${project.metadata.Status.replace(/\s+/g, '-')}` : '';
                    newContent += `${project.metadata.date}/${project.metadata.endDate}: [[P} ${project.metadata.title}]]${status}\n`;

                    // Add tasks
                    if (project.tasks.length > 0) {
                        newContent += this.formatTasks(project.tasks) + '\n';
                    }
                }

                newContent += 'end group\n\n';
            }

            // Update Timeline
            if (newContent.trim() !== markwhenContent.trim()) {
                await this.app.vault.modify(markwhenFile, newContent.trim());
                new obsidian.Notice('Timeline synchronized');
            } else {
                new obsidian.Notice('Everything already in sync');
            }

        } catch (error) {
            console.error('Error in fullSync:', error);
            new obsidian.Notice('Error during synchronization');
        }
    }

    /**
     * Neue Logik: Datum korrekt interpretieren
     */
    parseMarkwhenEvents(content) {
        const events = [];
        const lines = content.split('\n');

        for (const line of lines) {
            const match = line.match(/^(\d{4}(?:-\d{2}(?:-\d{2})?)??)\/(\d{4}(?:-\d{2}(?:-\d{2})?)?): \[\[(P\} .+?)\]\]/);
            if (match) {
                const rawStart = match[1];
                const rawEnd = match[2];

                // Hier transformDate aufrufen
                const startDate = this.transformDate(rawStart, 'start');
                const endDate = this.transformDate(rawEnd, 'end');

                events.push({
                    startDate: startDate,
                    endDate: endDate,
                    fileName: match[3]
                });
            }
        }
        return events;
    }

    /**
     * Stellt sicher, dass ein Datum wie gewünscht formatiert wird:
     *  - YYYY -> start: YYYY-01-01, end: (YYYY+1)-01-01
     *  - YYYY-MM -> start: YYYY-MM-01, end: (YYYY-MM+1)-01
     *  - YYYY-MM-DD -> bleibt unverändert
     */
    transformDate(dateString, mode) {
        // 1) Prüfen: Ist es nur YYYY?
        if (/^\d{4}$/.test(dateString)) {
            const year = parseInt(dateString, 10);
            if (mode === 'start') {
                return `${year}-01-01`;
            } else {
                return `${year + 1}-01-01`;
            }
        }

        // 2) Prüfen: Ist es YYYY-MM?
        if (/^\d{4}-\d{2}$/.test(dateString)) {
            let [year, month] = dateString.split('-');
            let y = parseInt(year, 10);
            let m = parseInt(month, 10);

            if (mode === 'start') {
                // YYYY-MM -> YYYY-MM-01
                return `${y}-${month}-01`;
            } else {
                // YYYY-MM -> (YYYY-MM + 1)-01
                m = m + 1;
                if (m > 12) {
                    m = 1;
                    y += 1;
                }
                const mm = m < 10 ? `0${m}` : `${m}`;
                return `${y}-${mm}-01`;
            }
        }

        // 3) Liegt bereits im Format YYYY-MM-DD vor? -> Unverändert lassen
        return dateString;
    }

    async updateProjectFile(file, metadata) {
        try {
            const content = await this.app.vault.read(file);
            const lines = content.split('\n');
            let inFrontmatter = false;
            let frontmatterStart = -1;
            let frontmatterEnd = -1;

            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim() === '---') {
                    if (!inFrontmatter) {
                        inFrontmatter = true;
                        frontmatterStart = i;
                    } else {
                        frontmatterEnd = i;
                        break;
                    }
                }
            }

            if (frontmatterStart === -1 || frontmatterEnd === -1) {
                console.error('Invalid frontmatter in file:', file.path);
                return;
            }

            const currentFrontmatter = lines.slice(frontmatterStart + 1, frontmatterEnd);
            const updatedFrontmatter = [];
            let dateUpdated = false;
            let endDateUpdated = false;

            for (const line of currentFrontmatter) {
                if (line.startsWith('date:')) {
                    updatedFrontmatter.push(`date: ${metadata.date}`);
                    dateUpdated = true;
                } else if (line.startsWith('endDate:')) {
                    updatedFrontmatter.push(`endDate: ${metadata.endDate}`);
                    endDateUpdated = true;
                } else {
                    updatedFrontmatter.push(line);
                }
            }

            if (!dateUpdated) {
                updatedFrontmatter.push(`date: ${metadata.date}`);
            }
            if (!endDateUpdated) {
                updatedFrontmatter.push(`endDate: ${metadata.endDate}`);
            }

            const newContent = [
                ...lines.slice(0, frontmatterStart + 1),
                ...updatedFrontmatter,
                ...lines.slice(frontmatterEnd)
            ].join('\n');

            await this.app.vault.modify(file, newContent);

        } catch (error) {
            console.error('Error in updateProjectFile:', error);
            throw error;
        }
    }

    async removeFromTimeline(deletedFile) {
        try {
            const markwhenFile = this.app.vault.getAbstractFileByPath(this.settings.markwhenPath);
            if (!markwhenFile) return;

            const content = await this.app.vault.read(markwhenFile);
            const lines = content.split('\n');

            const newContent = lines.filter(line => !line.includes(`[[P} ${deletedFile.basename.replace('P} ', '')}]]`)).join('\n');

            if (content !== newContent) {
                await this.app.vault.modify(markwhenFile, newContent);
                new obsidian.Notice('Removed deleted project from timeline');
            }
        } catch (error) {
            console.error('Error removing project from timeline:', error);
        }
    }

    onunload() {
        console.log('Unloading ProjectTimelineSync');
    }
}

module.exports = ProjectTimelineSync;

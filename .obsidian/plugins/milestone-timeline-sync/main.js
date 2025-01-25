'use strict';

const { Plugin, PluginSettingTab, Setting, Notice } = require('obsidian');

class MilestoneTimelineSyncSettings {
    constructor() {
        this.markwhenPath = '3_Areas/02_Zielsetzung/Zielsetzung (Meilensteine).mw';
        this.milestonesPath = '3_Areas/02_Zielsetzung/Meilensteine';
    }
}

class MilestoneTimelineSync extends Plugin {
    async onload() {
        console.log('Loading MilestoneTimelineSync');

        await this.loadSettings();

        this.addRibbonIcon('sync', 'Sync Milestones with Timeline', async () => {
            console.log('Manual sync triggered');
            await this.fullSync();
        });

        this.addSettingTab(new MilestoneTimelineSyncSettingTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign(new MilestoneTimelineSyncSettings(), await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    normalizeStartDate(date) {
        if (!date) return date;
        // Stelle sicher, dass date ein String ist
        date = String(date);

        if (date.match(/^\d{4}$/)) return `${date}-01-01`;
        if (date.match(/^\d{4}-\d{2}$/)) return `${date}-01`;
        return date;
    }

    normalizeEndDate(date) {
        if (!date) return date;
        // Stelle sicher, dass date ein String ist
        date = String(date);

        if (date.match(/^\d{4}$/)) {
            const year = parseInt(date) + 1;
            return `${year}-01-01`;
        }
        if (date.match(/^\d{4}-\d{2}$/)) {
            const [year, month] = date.split('-');
            const nextMonth = parseInt(month) + 1;
            if (nextMonth > 12) {
                return `${parseInt(year) + 1}-01-01`;
            }
            return `${year}-${String(nextMonth).padStart(2, '0')}-01`;
        }
        return date;
    }
    extractYearlyGoalName(content) {
        if (!content) return null;
        // Suche nach 'YearlyGoal:: [[...]]' im gesamten Inhalt
        const yearlyGoalMatch = content.match(/YearlyGoal::\s*"?\[\[([^|\]]+?)(?:\|[^\]]+?)?\]\]"?/);
        if (yearlyGoalMatch) {
            return yearlyGoalMatch[1].trim();
        }
        return null;
    }

    async getYearlyGoalProperty(file) {
        try {
            const content = await this.app.vault.read(file);
            return this.extractYearlyGoalName(content);
        } catch (error) {
            console.error(`Error reading YearlyGoal property from ${file.path}:`, error);
            return null;
        }
    }

    async groupMilestonesByYearlyGoal(milestones) {
        const groupedMilestones = new Map();
        const milestonesWithoutYearlyGoal = [];

        for (const milestone of milestones) {
            try {
                const YearlyGoalName = await this.getYearlyGoalProperty(milestone.file);
                if (!YearlyGoalName) {
                    milestonesWithoutYearlyGoal.push(milestone.file.basename);
                    continue;
                }
                if (!groupedMilestones.has(YearlyGoalName)) {
                    groupedMilestones.set(YearlyGoalName, []);
                }
                groupedMilestones.get(YearlyGoalName).push(milestone);
            } catch (error) {
                console.error(`Error processing milestone ${milestone.file.path}:`, error);
            }
        }

        if (milestonesWithoutYearlyGoal.length > 0) {
            const errorMessage = `Missing YearlyGoal property in: ${milestonesWithoutYearlyGoal.join(', ')}`;
            console.error(errorMessage);
            new Notice('Missing YearlyGoal property in some files. Check console for details.');
        }

        const sortedEntries = Array.from(groupedMilestones.entries())
            .sort((a, b) => {
                const aMatch = a[0].match(/^(\d+(?:\.\d+)?)/);
                const bMatch = b[0].match(/^(\d+(?:\.\d+)?)/);
                if (aMatch && bMatch) {
                    const aNum = parseFloat(aMatch[1]);
                    const bNum = parseFloat(bMatch[1]);
                    if (aNum !== bNum) return aNum - bNum;
                }
                return a[0].localeCompare(b[0]);
            });

        sortedEntries.forEach(([_, milestones]) => {
            milestones.sort((a, b) => {
                const dateA = new Date(this.normalizeStartDate(a.metadata.date));
                const dateB = new Date(this.normalizeStartDate(b.metadata.date));
                const dateCompare = dateA - dateB;
                if (dateCompare !== 0) return dateCompare;

                const endDateA = new Date(this.normalizeEndDate(a.metadata.endDate));
                const endDateB = new Date(this.normalizeEndDate(b.metadata.endDate));
                const endDateCompare = endDateA - endDateB;
                if (endDateCompare !== 0) return endDateCompare;

                return a.metadata.title.localeCompare(b.metadata.title);
            });
        });

        return new Map(sortedEntries);
    }

    parseTimelineEvents(content) {
        const events = [];
        const lines = content.split('\n');

        for (const line of lines) {
            const match = line.match(/^(\d{4}(?:-\d{2}(?:-\d{2})?)??)\/(\d{4}(?:-\d{2}(?:-\d{2})?)?): \[\[(.+?)\]\]/);
            if (match) {
                const startDate = this.normalizeStartDate(match[1]);
                const endDate = this.normalizeEndDate(match[2]);
                events.push({
                    startDate: startDate,
                    endDate: endDate,
                    fileName: match[3],
                    originalLine: line
                });
            }
        }
        return events;
    }

    async updateMilestoneFile(file, metadata) {
        try {
            console.log(`Updating milestone file: ${file.path}`, metadata);
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

            const normalizedStartDate = this.normalizeStartDate(metadata.date);
            const normalizedEndDate = this.normalizeEndDate(metadata.endDate);

            for (const line of currentFrontmatter) {
                if (line.startsWith('date:')) {
                    updatedFrontmatter.push(`date: ${normalizedStartDate}`);
                    dateUpdated = true;
                } else if (line.startsWith('endDate:')) {
                    updatedFrontmatter.push(`endDate: ${normalizedEndDate}`);
                    endDateUpdated = true;
                } else {
                    updatedFrontmatter.push(line);
                }
            }

            if (!dateUpdated) {
                updatedFrontmatter.push(`date: ${normalizedStartDate}`);
            }
            if (!endDateUpdated) {
                updatedFrontmatter.push(`endDate: ${normalizedEndDate}`);
            }

            const newContent = [
                ...lines.slice(0, frontmatterStart + 1),
                ...updatedFrontmatter,
                ...lines.slice(frontmatterEnd)
            ].join('\n');

            if (content !== newContent) {
                await this.app.vault.modify(file, newContent);
                console.log(`Updated milestone file ${file.path} with new dates:`, {
                    startDate: normalizedStartDate,
                    endDate: normalizedEndDate
                });
            }
        } catch (error) {
            console.error('Error in updateMilestoneFile:', error);
            throw error;
        }
    }

    validateMilestoneChanges(oldContent, newContent) {
        const oldMilestones = (oldContent.match(/\[\[.*?\]\]/g) || []);
        const newMilestones = (newContent.match(/\[\[.*?\]\]/g) || []);

        const removedMilestones = oldMilestones.filter(m => !newMilestones.includes(m));
        if (removedMilestones.length > 0) {
            console.warn('Milestones that would be removed:', removedMilestones);
            return {
                valid: false,
                removedCount: removedMilestones.length,
                removedMilestones: removedMilestones
            };
        }

        return {
            valid: true,
            oldCount: oldMilestones.length,
            newCount: newMilestones.length
        };
    }

    async fullSync() {
        try {
            const markwhenFile = this.app.vault.getAbstractFileByPath(this.settings.markwhenPath);
            const milestonesFolder = this.app.vault.getAbstractFileByPath(this.settings.milestonesPath);

            if (!markwhenFile || !milestonesFolder) {
                console.error('Required files not found');
                new Notice('Required files not found');
                return;
            }

            const markwhenContent = await this.app.vault.read(markwhenFile);
            const timelineEvents = this.parseTimelineEvents(markwhenContent);
            const markwhenStat = await this.app.vault.adapter.stat(this.settings.markwhenPath);

            const activeMilestones = new Set();
            const milestonesToSync = [];

            for (const child of milestonesFolder.children) {
                if (child.extension !== 'md') continue;

                const metadata = this.app.metadataCache.getFileCache(child)?.frontmatter;
                if (!metadata) continue;

                const tags = metadata.tags || [];
                if (!tags.includes('goal') && !tags.includes('focus')) continue;

                if (!metadata.date || !metadata.endDate || !metadata.title || metadata.Status === 'done') {
                    continue;
                }

                activeMilestones.add(child.basename);

                const milestoneStat = await this.app.vault.adapter.stat(child.path);
                const timelineEvent = timelineEvents.find(e => e.fileName === child.basename);
                let shouldUpdateTimeline = false;

                if (timelineEvent) {
                    const normalizedMetadataStart = this.normalizeStartDate(metadata.date);
                    const normalizedMetadataEnd = this.normalizeEndDate(metadata.endDate);
                    const normalizedTimelineStart = this.normalizeStartDate(timelineEvent.startDate);
                    const normalizedTimelineEnd = this.normalizeEndDate(timelineEvent.endDate);

                    const datesAreDifferent = normalizedMetadataStart !== normalizedTimelineStart ||
                        normalizedMetadataEnd !== normalizedTimelineEnd;

                    if (datesAreDifferent) {
                        if (milestoneStat.mtime > markwhenStat.mtime) {
                            shouldUpdateTimeline = true;
                        } else if (markwhenStat.mtime > milestoneStat.mtime) {
                            await this.updateMilestoneFile(child, {
                                ...metadata,
                                date: timelineEvent.startDate,
                                endDate: timelineEvent.endDate
                            });
                        }
                    } else {
                        shouldUpdateTimeline = true;
                    }
                } else {
                    shouldUpdateTimeline = true;
                }

                if (shouldUpdateTimeline) {
                    milestonesToSync.push({
                        file: child,
                        metadata: {
                            ...metadata,
                            date: this.normalizeStartDate(metadata.date),
                            endDate: this.normalizeEndDate(metadata.endDate)
                        }
                    });
                }
            }

            const groupedMilestones = await this.groupMilestonesByYearlyGoal(milestonesToSync);

            let newContent = '';
            for (const [YearlyGoalName, milestones] of groupedMilestones) {
                newContent += `\ngroup ${YearlyGoalName}\n`;

                for (const milestone of milestones) {
                    const status = milestone.metadata.Status ? ` #${milestone.metadata.Status.replace(/\s+/g, '-')}` : '';
                    newContent += `${milestone.metadata.date}/${milestone.metadata.endDate}: [[${milestone.file.basename}]]${status}\n`;
                }

                newContent += 'end group\n\n';
            }

            const validation = this.validateMilestoneChanges(markwhenContent, newContent);
            if (!validation.valid) {
                console.error(`Synchronization would remove ${validation.removedCount} milestones:`,
                    validation.removedMilestones);
                new Notice(`Sync aborted: Would remove ${validation.removedCount} milestones`);
                return;
            }

            if (newContent.trim() !== markwhenContent.trim() || !markwhenContent.trim()) {
                await this.app.vault.modify(markwhenFile, newContent.trim());
                new Notice(`Timeline synchronized (${validation.newCount} milestones)`);
                console.log('Timeline updated with new content');
            } else {
                new Notice('Everything already in sync');
                console.log('No changes needed');
            }

        } catch (error) {
            console.error('Error in fullSync:', error);
            new Notice('Error during synchronization');
        }
    }

    onunload() {
        console.log('Unloading MilestoneTimelineSync');
    }
}

class MilestoneTimelineSyncSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('Markwhen file path')
            .setDesc('Path to your Markwhen timeline file for milestones')
            .addText(text => text
                .setPlaceholder('path/to/timeline.mw')
                .setValue(this.plugin.settings.markwhenPath)
                .onChange(async (value) => {
                    this.plugin.settings.markwhenPath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Milestones folder path')
            .setDesc('Path to your milestones folder')
            .addText(text => text
                .setPlaceholder('path/to/milestones/folder')
                .setValue(this.plugin.settings.milestonesPath)
                .onChange(async (value) => {
                    this.plugin.settings.milestonesPath = value;
                    await this.plugin.saveSettings();
                }));
    }
}

module.exports = MilestoneTimelineSync;
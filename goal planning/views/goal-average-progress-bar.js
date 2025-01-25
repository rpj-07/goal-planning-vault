//
// goal-average-progress-bar.js
//

// 1) Container & Styling (wie bei deinen anderen Progress-Bars)
const containerEl = createDiv();
const align = input?.alignLeft ? "left" : "center";

Object.assign(containerEl.style, {
    display: "flex",
    flexDirection: "column",
    alignItems: align,
    justifyContent: "center",
});

// 2) Ziel-Seite laden
const goalPage = dv.page(input.file);
if (!goalPage) {
    containerEl.createEl("div", {
        text: "❌ error loading from the goal-site."
    });
    dv.paragraph(containerEl.innerHTML);
    return;
}

// 3) Alle Meilensteine finden, die dieses Ziel verlinken.
//    (Wir gehen davon aus: "Jahresziel: [[DeinZiel]]" oder ähnlicher Link.)
const meilensteinLinks = goalPage.file.inlinks;
if (!meilensteinLinks || meilensteinLinks.length === 0) {
    containerEl.createEl("div", {
        text: "no milestones found"
    });
    dv.paragraph(containerEl.innerHTML);
    return;
}

// Array für die ermittelten Prozentwerte jedes Meilensteins
let meilensteinProgressArray = [];

// 4) Für jeden Meilenstein dessen Projekte finden & Tasks sammeln
for (let link of meilensteinLinks) {
    const meilensteinPage = dv.page(link.path);
    if (!meilensteinPage) continue;

    // Finde alle Projekte, die auf diesen Meilenstein verlinken
    // (tags?.includes('project'))
    const projectLinks = meilensteinPage.file.inlinks.where(projLink => {
        const projPage = dv.page(projLink.path);
        if (!projPage) return false;
        return projPage.tags?.includes("project");
    });

    // Sammle Tasks aus allen Projekten
    let allTasks = [];
    for (let pLink of projectLinks) {
        const pPage = dv.page(pLink.path);
        if (!pPage) continue;
        // pPage.file.tasks enthält die Checkboxes
        allTasks.push(...pPage.file.tasks);
    }

    // Anzahl erledigter Tasks ermitteln
    let completedCount = allTasks.filter(t => t.completed).length;
    let totalCount = allTasks.length;

    // Fortschritt des Meilensteins in Prozent
    let meilensteinPercent = 0;
    if (totalCount > 0) {
        meilensteinPercent = (completedCount / totalCount) * 100;
    }

    meilensteinProgressArray.push(meilensteinPercent);
}

// 5) Durchschnitt aller Meilensteine
let avgPercent = 0;
if (meilensteinProgressArray.length > 0) {
    let sum = meilensteinProgressArray.reduce((acc, val) => acc + val, 0);
    avgPercent = sum / meilensteinProgressArray.length;
}

// Runden auf ganzzahlig
avgPercent = Math.round(avgPercent);

// 6) Ein <progress>-Element erstellen
const maxValue = 100;
const progressBar = containerEl.createEl("progress");
Object.assign(progressBar, {
    max: maxValue,
    value: avgPercent
});

// 7) Kurzer Text darunter
const progressText = containerEl.createEl("div");
progressText.textContent = `${avgPercent}% (average milestones)`;

// 8) HTML ausgeben
dv.paragraph(containerEl.innerHTML);

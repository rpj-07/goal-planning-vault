const containerEl = createDiv();
const align = input?.alignLeft ? "left" : "center";

Object.assign(containerEl.style, {
    display: "flex",
    flexDirection: "column",
    alignItems: align,
    justifyContent: "center",
});

// Hole die Seite, auf der dieses View eingebunden ist
const page = dv.page(input.file);
if (!page) {
    containerEl.createEl("div", { text: "❌ loading error." });
    dv.paragraph(containerEl.innerHTML);
    return;
}

// Lies `date` und `endDate` aus dem Frontmatter
const { date, endDate } = page;
if (!date || !endDate) {
    containerEl.createEl("div", {
        text: "❌ start- or enddate does not exist."
    });
    dv.paragraph(containerEl.innerHTML);
    return;
}

// `dv.date(...)` gibt ein Dataview-Datum zurück (typischerweise ein Luxon-/JS-Objekt)
const dStart = dv.date(date);
const dEnd = dv.date(endDate);

// Prüfe, ob beide Datumsangaben erfolgreich in ein DateTime-Objekt konvertiert wurden
if (!dStart || !dEnd) {
    containerEl.createEl("div", {
        text: "❌ error with the dateformat)."
    });
    dv.paragraph(containerEl.innerHTML);
    return;
}

// Rechne beide Werte in Millisekunden um (Date/DateTime → epoch)
const startMs = dStart.valueOf();
const endMs = dEnd.valueOf();

// Differenz in Millisekunden
let totalDiffMs = endMs - startMs;
// Falls die Differenz <= 0 ist, verhindern wir eine Division durch 0 (oder negative Werte)
if (totalDiffMs <= 0) totalDiffMs = 1;

// Umrechnen in Tage
let totalDays = totalDiffMs / (1000 * 60 * 60 * 24);

// Ermittle "heute" als Millisekunden
const nowMs = Date.now(); // reines JS
let daysElapsedMs = nowMs - startMs;
if (daysElapsedMs < 0) daysElapsedMs = 0; // Noch gar nicht gestartet
if (daysElapsedMs > totalDiffMs) daysElapsedMs = totalDiffMs; // Schon vorbei?

let daysElapsed = daysElapsedMs / (1000 * 60 * 60 * 24);

// Prozentualer Fortschritt
let percent = Math.round((daysElapsed / totalDays) * 100);

// <progress>-Element analog zu deinen anderen Scripts
const progressBar = containerEl.createEl("progress");
Object.assign(progressBar, {
    max: totalDays,
    value: daysElapsed
});

// Kleiner Anzeigetext
const progressText = containerEl.createEl("div");
progressText.textContent = `${percent}% completed (time)`;

// Alles an Dataview ausgeben
dv.paragraph(containerEl.innerHTML);

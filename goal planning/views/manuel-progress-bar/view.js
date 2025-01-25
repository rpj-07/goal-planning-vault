const containerEl = createDiv();
const align = input?.alignLeft ? "left" : "center";

Object.assign(containerEl.style, {
    display: "flex",
    "flex-direction": "column",
    "align-items": align,
    "justify-content": "center",
});

const { Start, Stand, Ziel } = dv.page(input.file);

// Überprüfen, ob alle erforderlichen Eigenschaften vorhanden sind
if (Start === undefined || Stand === undefined || Ziel === undefined) {
    containerEl.createEl("div", { text: "Fortschrittsdaten unvollständig." });
} else {
    // Berechnung des Fortschritts basierend auf Start, Stand und Ziel
    const isDescendingProgress = Ziel < Start;
    let max, value;

    if (isDescendingProgress) {
        max = Start - Ziel;
        value = Start - Stand;
    } else {
        max = Ziel - Start;
        value = Stand - Start;
    }

    // Verhindern, dass durch 0 geteilt wird
    const percent = max === 0 ? 100 : Math.round((value / max) * 100);
    const safePercent = Math.max(0, Math.min(percent, 100)); // Prozent zwischen 0 und 100 begrenzen

    // Fortschrittsbalken erstellen
    const progressBar = containerEl.createEl("progress");
    Object.assign(progressBar, {
        max: max,
        value: value
    });

    // Fortschrittstext hinzufügen
    const progressText = containerEl.createEl("div", { text: `${safePercent}% completed` });
    Object.assign(progressText.style, {
        "text-align": "center",
        "margin-top": "5px",
    });
}

dv.paragraph(containerEl.innerHTML);
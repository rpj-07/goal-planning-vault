module.exports = async ({ app }) => {
    const { vault, workspace } = app;

    // Aktive Datei holen
    const activeFile = workspace.getActiveFile();
    if (!activeFile) {
        new Notice("No active file found!");
        return;
    }

    // Dateiinhalt lesen
    const fileContent = await vault.read(activeFile);
    const yamlStart = fileContent.indexOf("---");
    const yamlEnd = fileContent.indexOf("---", yamlStart + 3);

    if (yamlStart === -1 || yamlEnd === -1) {
        new Notice("No YAML frontmatter found!");
        return;
    }

    // YAML-Frontmatter extrahieren
    const yamlContent = fileContent.substring(yamlStart + 3, yamlEnd).trim();
    const contentAfterYaml = fileContent.substring(yamlEnd + 3).trim();

    // YAML in ein Objekt konvertieren
    const yaml = parseYaml(yamlContent);

    // Status auf "done" setzen
    yaml.Status = "done";

    // Aktuelles Datum im Format "[[YYYY-MM-DD]]" einfügen
    const today = `[[${window.moment().format("YYYY-MM-DD")}]]`;

    // Datum hinzufügen, falls nicht vorhanden
    if (!yaml.completedDate) {
        yaml.completedDate = `"${today}"`; // Anführungszeichen hinzufügen
    }

    // YAML neu formatieren
    const newYaml = formatYaml(yaml);

    // Datei mit neuer YAML und ursprünglichem Inhalt aktualisieren
    const newFileContent = `---\n${newYaml}\n---\n\n${contentAfterYaml}`;
    await vault.modify(activeFile, newFileContent);

    new Notice("Status set to 'done' and date added!");
};

// YAML-Parsing-Funktion
function parseYaml(yamlString) {
    const lines = yamlString.split("\n");
    const yaml = {};

    lines.forEach(line => {
        const [key, ...rest] = line.split(":");
        const value = rest.join(":").trim();
        if (value.startsWith("- ")) {
            yaml[key.trim()] = value
                .split("\n")
                .map(item => item.replace("- ", "").trim());
        } else {
            yaml[key.trim()] = value || null;
        }
    });

    return yaml;
}

// YAML-Formatierungsfunktion
function formatYaml(yaml) {
    return Object.entries(yaml)
        .map(([key, value]) => {
            if (Array.isArray(value)) {
                return `${key}:\n` + value.map(v => `  - ${v}`).join("\n");
            } else {
                return `${key}: ${value ?? ""}`;
            }
        })
        .join("\n");
}

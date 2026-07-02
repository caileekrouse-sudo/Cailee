const scenarioInput = document.getElementById("scenario");
const lineSelect = document.getElementById("line");
const generateBtn = document.getElementById("generate-btn");
const errorMessage = document.getElementById("error-message");
const loading = document.getElementById("loading");
const formulaOutput = document.getElementById("formula-output");
const placeholder = document.getElementById("placeholder");
const outputActions = document.getElementById("output-actions");
const copyBtn = document.getElementById("copy-btn");
const printBtn = document.getElementById("print-btn");

function setLoading(isLoading) {
  generateBtn.disabled = isLoading;
  generateBtn.textContent = isLoading ? "Generating…" : "Generate Formula Card";
  loading.hidden = !isLoading;
  if (isLoading) {
    formulaOutput.hidden = true;
    placeholder.hidden = true;
    outputActions.hidden = true;
  }
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function clearError() {
  errorMessage.hidden = true;
  errorMessage.textContent = "";
}

async function generateFormula() {
  const scenario = scenarioInput.value.trim();
  const linePreference = lineSelect.value;

  clearError();

  if (!scenario) {
    showError("Please describe the client scenario first.");
    return;
  }

  setLoading(true);

  try {
    const res = await fetch("/api/generate-formula", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario, linePreference }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Something went wrong generating the formula card.");
    }

    formulaOutput.textContent = data.formulaCard;
    formulaOutput.hidden = false;
    outputActions.hidden = false;
    placeholder.hidden = true;
  } catch (err) {
    showError(err.message);
    placeholder.hidden = false;
  } finally {
    setLoading(false);
  }
}

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(formulaOutput.textContent);
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
  } catch {
    showError("Couldn't copy to clipboard — select and copy manually.");
  }
});

printBtn.addEventListener("click", () => {
  window.print();
});

generateBtn.addEventListener("click", generateFormula);

scenarioInput.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    generateFormula();
  }
});

const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../src/components/AdminPanel.tsx");
const content = fs.readFileSync(filePath, "utf-8");
const lines = content.split("\n");

lines.forEach((line, index) => {
  if (line.includes("gainDiff")) {
    console.log(`${index + 1}: ${line}`);
  }
});

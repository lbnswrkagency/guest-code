// summary.js

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import ora from "ora";
import { promisify } from "util";

// Promisify required functions for better async handling
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Use __dirname and __filename in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the specific directories and files to include
const includedPaths = [
  "client/src/Components",
  "client/src/App.js",
  "client/src/index.js",
  "server/controllers",
  "server/routes",
  "server/models",
  "server/server.js",
];

const basePath = "/Users/zaferguney/Desktop/PROJECTS/quiz-expotec"; // Replace with your actual project path
const outputPath = "./outputFile.txt"; // Output summary file

// Clear existing file content
fs.writeFileSync(outputPath, "");

// Initialize a spinner for a better experience
const spinner = ora("Starting to process files...").start();

// Log included paths for better visibility
console.log(chalk.blue("Included Paths:"));
includedPaths.forEach((includedPath) =>
  console.log(chalk.green(`- ${includedPath}`))
);

// Check if the path is in the includedPaths list (allow partial matches for directory traversal)
function isPathIncluded(filePath) {
  return includedPaths.some((includedPath) => filePath.includes(includedPath));
}

// Stream file content to outputFile.txt
function appendFileToOutput(filePath) {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(filePath, { encoding: "utf-8" });
    const writeStream = fs.createWriteStream(outputPath, { flags: "a" });

    writeStream.write(`\n\n--- ${filePath} ---\n\n`);
    readStream.pipe(writeStream);

    readStream.on("end", () => {
      console.log(chalk.green(`Appended file: ${filePath}`));
      resolve();
    });

    readStream.on("error", (err) => {
      console.log(chalk.red(`Error reading file: ${filePath}\n${err}`));
      reject(err);
    });
  });
}

// Recursively append files in the included directories
async function appendFilesInDirectory(dir) {
  spinner.text = `Processing directory: ${chalk.yellow(dir)}`;

  let files;
  try {
    files = await readdir(dir);
  } catch (err) {
    console.log(chalk.red(`Error reading directory: ${dir}\n${err}`));
    return;
  }

  if (files.length === 0) {
    console.log(chalk.yellow(`Directory is empty: ${dir}`));
    return;
  }

  for (const file of files) {
    const filePath = path.join(dir, file);
    let fileStat;

    try {
      fileStat = await stat(filePath);
    } catch (err) {
      console.log(
        chalk.red(`Error getting stats for file: ${filePath}\n${err}`)
      );
      continue;
    }

    if (fileStat.isDirectory()) {
      await appendFilesInDirectory(filePath); // Recursively go through subdirectories
    } else if (isPathIncluded(filePath)) {
      try {
        await appendFileToOutput(filePath); // Stream the file content to output
      } catch (error) {
        console.log(chalk.red(`Error processing file: ${filePath}\n${error}`));
      }
    }
  }
}

(async () => {
  try {
    await appendFilesInDirectory(basePath);
    spinner.succeed("File processing completed!");
    console.log(
      chalk.green("Relevant files have been summarized into outputFile.txt")
    );
  } catch (error) {
    spinner.fail("An error occurred during file processing.");
    console.error(chalk.red(`Error: ${error.message}`));
  }
})();

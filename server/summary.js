import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import ora from "ora";
import { promisify } from "util";

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const appendFile = promisify(fs.appendFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths you want to include in the summary
const includedPaths = [
  "client/src/Components",
  // "client/src/App.js",
  // "client/src/index.js",
  // "server/controllers",
  // "server/routes",
  // "server/models",
  // "server/server.js",
];

const basePath = path.resolve(__dirname, "..");
const outputPath = path.join(__dirname, "outputFile.txt");

const spinner = ora("Starting to process files...").start();

console.log(chalk.blue("Base Path:"), chalk.yellow(basePath));
console.log(chalk.blue("Included Paths:"));
includedPaths.forEach((includedPath) =>
  console.log(chalk.green(`- ${includedPath}`))
);

// File extensions to include
const allowedExtensions = [".js", ".jsx", ".ts", ".tsx", ".json"];

// Directories to exclude
const excludedPaths = ["node_modules", ".git", "build", "dist"];

function isFileIncluded(filePath) {
  const ext = path.extname(filePath);
  return allowedExtensions.includes(ext);
}

function isExcludedPath(filePath) {
  return excludedPaths.some((excluded) =>
    filePath.includes(path.sep + excluded + path.sep)
  );
}

async function appendFileToOutput(filePath) {
  try {
    const content = await readFile(filePath, "utf-8");
    await appendFile(
      outputPath,
      `\n\n--- ${path.relative(basePath, filePath)} ---\n\n${content}`
    );
    console.log(chalk.green(`Appended file: ${filePath}`));
  } catch (error) {
    console.log(chalk.red(`Error processing file: ${filePath}\n${error}`));
  }
}

async function processDirectory(dir) {
  if (isExcludedPath(dir)) {
    console.log(chalk.gray(`Skipping excluded directory: ${dir}`));
    return;
  }

  console.log(chalk.blue(`Processing directory: ${dir}`));
  spinner.text = `Processing directory: ${chalk.yellow(dir)}`;

  try {
    const files = await readdir(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const fileStat = await stat(filePath);

      if (fileStat.isDirectory()) {
        await processDirectory(filePath);
      } else if (isFileIncluded(filePath)) {
        await appendFileToOutput(filePath);
      } else {
        console.log(
          chalk.gray(`Skipping file with disallowed extension: ${filePath}`)
        );
      }
    }
  } catch (error) {
    console.log(chalk.red(`Error processing directory: ${dir}\n${error}`));
  }
}

(async () => {
  try {
    await writeFile(outputPath, "");
    console.log(chalk.yellow("Output file cleared"));

    for (const includedPath of includedPaths) {
      const fullPath = path.join(basePath, includedPath);
      console.log(chalk.blue(`Processing included path: ${fullPath}`));

      try {
        const pathStat = await stat(fullPath);
        if (pathStat.isDirectory()) {
          await processDirectory(fullPath);
        } else if (pathStat.isFile()) {
          if (isFileIncluded(fullPath)) {
            await appendFileToOutput(fullPath);
          } else {
            console.log(
              chalk.gray(`Skipping file with disallowed extension: ${fullPath}`)
            );
          }
        } else {
          console.log(
            chalk.red(`Path is neither file nor directory: ${fullPath}`)
          );
        }
      } catch (error) {
        console.log(chalk.red(`Error processing path: ${fullPath}\n${error}`));
      }
    }

    spinner.succeed("File processing completed!");
    console.log(
      chalk.green(`Relevant files have been summarized into ${outputPath}`)
    );

    const outputContent = await readFile(outputPath, "utf-8");
    console.log(chalk.yellow("Output File Content:"));
    console.log(outputContent || "No content written to file.");
  } catch (error) {
    spinner.fail("An error occurred during file processing.");
    console.error(chalk.red(`Error: ${error.message}`));
  }
})();

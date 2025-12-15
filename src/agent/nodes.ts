import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { AgentState } from "./state";
import * as tools from "./tools";
import * as vscode from 'vscode';
import { execPromisify } from '../shared/execPromisify';
import { logger } from "../shared/logger";

// Helper to initialize the model dynamically
function getModel(apiKey: string) {
  if (!apiKey) {
    throw new Error("Google API Key not provided to agent.");
  }

  return new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash-lite",
    temperature: 0,
    apiKey: apiKey
  });
}

// Node 1: Indexing
export async function initialIndexing(state: typeof AgentState.State) {
  logger.both.info("Agent: Step 1 - Indexing repository...");
  // Get all files in the workspace using native VS Code API
  const files = await tools.getWorkspaceFiles(state.workspaceRoot);
  return { allFilePaths: files };
}

// Node 2: Structure Extraction (combined with Node 1)
export async function structureExtraction(state: typeof AgentState.State) {
  logger.both.info(`Agent: Step 2 - Found ${state.allFilePaths.length} files in repository.`);
  // No additional work needed since we already have the file list from Node 1
  return {};
}

// Node 3: Initial Filtering (Fast Pass)
export async function initialFiltering(state: typeof AgentState.State) {
  logger.both.info("Agent: Step 3 - Filtering candidate files...");

  const model = getModel(state.apiKey);
  const structureContext = state.allFilePaths.join('\n');

  const prompt = `
    You are an expert software engineer assistant.
    The user wants to package specific parts of a codebase into a single file.

    User Query: "${state.userQuery}"

    Below is the list of all files in the repository:
    ---
    ${structureContext}
    ---

    Task: Select all file paths that appear relevant to the user's query based on their names and directory location.
    Be generous in this step; include any file that MIGHT be relevant.
    Do not hallucinate paths. Only select from the provided list.
  `;

  // Define the structured output schema
  const schema = z.object({
    candidates: z.array(z.string()).describe("List of relevant file paths found in the repository")
  });

  const structuredLlm = model.withStructuredOutput(schema);

  try {
    const result = await structuredLlm.invoke(prompt);
    logger.both.info(`Agent: Selected ${result.candidates.length} candidate files for deep analysis.`);

    // Ensure we don't return empty candidates if there are files available
    if (result.candidates.length === 0 && state.allFilePaths.length > 0) {
      logger.both.warn("Agent: No candidates selected, applying failsafe to select some files");
      // Failsafe: select a reasonable subset of files based on common patterns
      const fallbackCandidates = state.allFilePaths.filter(file =>
        file.includes('src') ||
        file.includes('lib') ||
        file.includes('app') ||
        file.match(/\.(ts|js|tsx|jsx|py|java|cs|cpp|c|go|rs|php)$/)
      ).slice(0, 20);

      return { candidateFiles: fallbackCandidates };
    }

    return { candidateFiles: result.candidates };
  } catch (error) {
    logger.both.error("Agent: Filtering failed", error);
    // Fallback: If LLM fails, return empty or apply failsafe
    if (state.allFilePaths.length > 0) {
      const fallbackCandidates = state.allFilePaths.filter(file =>
        file.match(/\.(ts|js|tsx|jsx|py|java|cs|cpp|c|go|rs|php)$/)
      ).slice(0, 20);
      return { candidateFiles: fallbackCandidates };
    }
    return { candidateFiles: [] };
  }
}

// Node 4: Relevance Confirmation (Deep Analysis)
export async function relevanceConfirmation(state: typeof AgentState.State) {
  const count = state.candidateFiles.length;
  logger.both.info(`Agent: Step 4 - Analyzing content of ${count} files...`);

  if (count === 0) {
    return { confirmedFiles: [] };
  }

  // Bulk fetch content using our optimized tool
  const contentMap = await tools.getFileContents(state.workspaceRoot, state.candidateFiles);

  const model = getModel(state.apiKey);
  const confirmed: string[] = [];

  // Define schema for the boolean check
  const checkSchema = z.object({
    isRelevant: z.boolean().describe("True if the file is necessary to answer the user query")
  });
  const checkLlm = model.withStructuredOutput(checkSchema);

  // Iterate and check (can be parallelized, but keeping sequential for reliability)
  for (const filePath of state.candidateFiles) {
    const content = contentMap.get(filePath);

    if (!content) {
      logger.both.warn(`Agent: Could not find content for ${filePath}`);
      continue;
    }

    // Truncate huge files to fit context window if necessary
    const snippet = content.slice(0, 30000);

    const prompt = `
      User Query: "${state.userQuery}"
      File Path: "${filePath}"

      File Content (Snippet):
      ---
      ${snippet}
      ---

      Based on the content, is this file strictly necessary to fulfill the user's request?
      Return true only if it contains logic, definitions, or data relevant to "${state.userQuery}".
    `;

    try {
      const result = await checkLlm.invoke(prompt);
      if (result.isRelevant) {
        confirmed.push(filePath);
      }
    } catch (e) {
      logger.both.error(`Agent: Error checking ${filePath}`, e);
    }
  }

  // Failsafe: ensure we have at least some files if candidates existed
  if (confirmed.length === 0 && state.candidateFiles.length > 0) {
    logger.both.warn("Agent: No files confirmed as relevant, applying failsafe");
    // Return first few candidates as a fallback
    const fallbackFiles = state.candidateFiles.slice(0, 5);
    logger.both.info(`Agent: Fallback selected ${fallbackFiles.length} files`);
    return { confirmedFiles: fallbackFiles };
  }

  logger.both.info(`Agent: Confirmed ${confirmed.length} files as strictly relevant.`);
  return { confirmedFiles: confirmed };
}

// Node 5: Command Generation
export async function commandGeneration(state: typeof AgentState.State) {
  logger.both.info("Agent: Step 5 - Generating final command...");

  if (state.confirmedFiles.length === 0) {
    logger.both.warn("Agent: No relevant files found. Skipping execution.");
    return { finalCommand: "" };
  }

  // Escape paths for safety (basic quoting)
  const includeFlag = state.confirmedFiles
    .map(f => `"${f}"`)
    .join(",");

  // Construct the CLI command using repomix with --include flag
  const command = `npx repomix --include ${includeFlag}`;

  return { finalCommand: command };
}

// Node 6: Final Execution (Cleanup & Run)
export async function finalExecution(state: typeof AgentState.State) {
  logger.both.info("Agent: Step 6 - Executing final run...");

  if (!state.finalCommand) {
    vscode.window.showWarningMessage("Repomix Agent: No relevant files found for your query.");
    return {};
  }

  // Execute the final command using the existing runner infrastructure
  try {
    await execPromisify(state.finalCommand, { cwd: state.workspaceRoot });
    vscode.window.showInformationMessage(`Agent successfully packaged ${state.confirmedFiles.length} files!`);
  } catch (error) {
    logger.both.error("Agent: Failed to execute final command", error);
    vscode.window.showErrorMessage(`Repomix Agent failed to execute: ${error}`);
  }

  return {};
}

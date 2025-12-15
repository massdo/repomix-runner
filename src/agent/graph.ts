import { StateGraph } from "@langchain/langgraph";
import { AgentState } from "./state";
import * as nodes from "./nodes";

export function createSmartRepomixGraph() {
  const workflow = new StateGraph(AgentState)
    // Add all the nodes we defined
    .addNode("indexing", nodes.initialIndexing)
    .addNode("structureExtraction", nodes.structureExtraction)
    .addNode("filtering", nodes.initialFiltering)
    .addNode("relevanceCheck", nodes.relevanceConfirmation)
    .addNode("commandGeneration", nodes.commandGeneration)
    .addNode("execution", nodes.finalExecution)

    // Define the flow (Edges)
    // Start -> Indexing
    .addEdge("__start__", "indexing")

    // Indexing -> Extract Structure
    .addEdge("indexing", "structureExtraction")

    // Structure -> Filter Files (Phase 1)
    .addEdge("structureExtraction", "filtering")

    // Filter -> Deep Check (Phase 2)
    .addEdge("filtering", "relevanceCheck")

    // Check -> Generate Command
    .addEdge("relevanceCheck", "commandGeneration")

    // Generate -> Execute & Cleanup
    .addEdge("commandGeneration", "execution")

    // End
    .addEdge("execution", "__end__");

  return workflow.compile();
}
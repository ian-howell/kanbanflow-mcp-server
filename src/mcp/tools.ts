import { z } from "@zod/zod";
import { mcpServer } from "./mod.ts";
import { logger } from "../utils/mod.ts";
import { KanbanFlowClient } from "../kanbanflow/mod.ts";
import { CreateTaskInputSchema, UpdateTaskInputSchema } from "../kanbanflow/schemas.ts";
import { UserResolver } from "./user-resolver.ts";

// Create a shared client instance
const client = new KanbanFlowClient();
const userResolver = new UserResolver(client);

mcpServer.registerTool(
    "getBoard",
    {
        description: "Get the board structure including columns, swimlanes, and colors from Kanbanflow",
        inputSchema: {},
    },
    async () => {
        try {
            logger.info("mcp tool invoked", { tool: "getBoard" });
            const board = await client.getBoard();
            logger.info("mcp tool succeeded", {
                tool: "getBoard",
                columnsCount: board.columns.length,
                swimlanesCount: board.swimlanes?.length ?? 0,
            });
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(board, null, 2),
                    },
                ],
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error("mcp tool failed", { tool: "getBoard", error: errorMessage });
            return {
                content: [
                    {
                        type: "text",
                        text: `Error fetching board: ${errorMessage}`,
                    },
                ],
                isError: true,
            };
        }
    },
);

mcpServer.registerTool(
    "getTasks",
    {
        description: "Get tasks from Kanbanflow. Without filters, returns all tasks. Use filters to narrow results or enable pagination.",
        inputSchema: {
            columnId: z.string().optional().describe("Filter by column ID"),
            columnName: z.string().optional().describe("Filter by column name"),
            columnIndex: z.number().optional().describe("Filter by column index (0-based)"),
            startTaskId: z.string().optional().describe("Task ID to start pagination from (use nextTaskId from previous response)"),
            startGroupingDate: z.string().optional().describe("Start date for date-grouped columns (YYYY-MM-DD format, cannot be combined with startTaskId)"),
            limit: z.number().optional().describe("Maximum number of tasks to return (enables pagination)"),
            order: z.enum(["asc", "desc"]).optional().describe("Sort order (asc or desc)"),
            includePosition: z.boolean().optional().describe("Include task position in the column"),
            resolveUsers: z.boolean().optional().describe("Resolve user IDs to names"),
        },
    },
    async (args) => {
        try {
            logger.info("mcp tool invoked", { tool: "getTasks", args });

            let tasks = await client.getTasks({
                columnId: args.columnId,
                columnName: args.columnName,
                columnIndex: args.columnIndex,
                startTaskId: args.startTaskId,
                startGroupingDate: args.startGroupingDate,
                limit: args.limit,
                order: args.order,
                includePosition: args.includePosition,
            });

            // Resolve user IDs if requested
            if (args.resolveUsers) {
                tasks = await userResolver.enrichTasks(tasks);
                logger.info("mcp data enriched with users", { tool: "getTasks" });
            }

            const totalTasks = tasks.reduce((sum, col) => sum + col.tasks.length, 0);
            const hasMore = tasks.some((col) => col.tasksLimited);
            const nextTaskId = tasks.find((col) => col.nextTaskId)?.nextTaskId;

            // Check if any filtering is applied
            const hasFilters = args.columnId || args.columnName || args.columnIndex !== undefined;

            logger.info("mcp tool succeeded", {
                tool: "getTasks",
                columnsCount: tasks.length,
                totalTasks,
                hasMore,
                nextTaskId,
                hasFilters,
                usersResolved: args.resolveUsers ?? false,
            });

            const response = {
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(tasks, null, 2),
                    },
                ],
                ...(hasFilters && {
                    _meta: {
                        pagination: {
                            hasMore,
                            nextTaskId: nextTaskId || null,
                            totalReturned: totalTasks,
                            limit: args.limit || null,
                            columnId: args.columnId || null,
                            columnName: args.columnName || null,
                            columnIndex: args.columnIndex !== undefined ? args.columnIndex : null,
                        },
                    },
                }),
            };

            return response;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error("mcp tool failed", { tool: "getTasks", error: errorMessage, args });
            return {
                content: [
                    {
                        type: "text",
                        text: `Error fetching tasks: ${errorMessage}`,
                    },
                ],
                isError: true,
            };
        }
    },
);

mcpServer.registerTool(
    "getTaskById",
    {
        description: "Get a specific task by ID from Kanbanflow",
        inputSchema: {
            taskId: z.string().describe("The ID of the task to retrieve"),
            includePosition: z.boolean().optional().describe("Include the task's position in the column"),
            resolveUsers: z.boolean().optional().describe("Resolve user IDs to names"),
        },
    },
    async (args) => {
        try {
            logger.info("mcp tool invoked", { tool: "getTaskById", taskId: args.taskId });
            let task = await client.getTaskById(args.taskId, args.includePosition ?? false);

            // Resolve user IDs if requested
            if (args.resolveUsers) {
                task = await userResolver.enrichTask(task);
                logger.info("mcp data enriched with users", { tool: "getTaskById" });
            }

            logger.info("mcp tool succeeded", {
                tool: "getTaskById",
                taskId: args.taskId,
                taskName: task.name,
                usersResolved: args.resolveUsers ?? false,
            });
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(task, null, 2),
                    },
                ],
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error("mcp tool failed", {
                tool: "getTaskById",
                error: errorMessage,
                taskId: args.taskId,
            });
            return {
                content: [
                    {
                        type: "text",
                        text: `Error fetching task ${args.taskId}: ${errorMessage}`,
                    },
                ],
                isError: true,
            };
        }
    },
);

mcpServer.registerTool(
    "getUsers",
    {
        description: "Get all users on the board from Kanbanflow",
        inputSchema: {},
    },
    async () => {
        try {
            logger.info("mcp tool invoked", { tool: "getUsers" });
            const users = await client.getUsers();
            logger.info("mcp tool succeeded", {
                tool: "getUsers",
                userCount: users.length,
            });
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(users, null, 2),
                    },
                ],
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error("mcp tool failed", { tool: "getUsers", error: errorMessage });
            return {
                content: [
                    {
                        type: "text",
                        text: `Error fetching users: ${errorMessage}`,
                    },
                ],
                isError: true,
            };
        }
    },
);

mcpServer.registerTool(
    "getComments",
    {
        description: "Get all comments for a specific task from Kanbanflow",
        inputSchema: {
            taskId: z.string().describe("The ID of the task to get comments for"),
            resolveUsers: z.boolean().optional().describe("Resolve user IDs to names"),
        },
    },
    async (args) => {
        try {
            logger.info("mcp tool invoked", { tool: "getComments", taskId: args.taskId });
            let comments = await client.getComments(args.taskId);

            // Resolve user IDs if requested
            if (args.resolveUsers) {
                comments = await userResolver.enrichComments(comments);
                logger.info("mcp data enriched with users", { tool: "getComments" });
            }

            logger.info("mcp tool succeeded", {
                tool: "getComments",
                taskId: args.taskId,
                commentCount: comments.length,
                usersResolved: args.resolveUsers ?? false,
            });
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(comments, null, 2),
                    },
                ],
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error("mcp tool failed", {
                tool: "getComments",
                error: errorMessage,
                taskId: args.taskId,
            });
            return {
                content: [
                    {
                        type: "text",
                        text: `Error fetching comments for task ${args.taskId}: ${errorMessage}`,
                    },
                ],
                isError: true,
            };
        }
    },
);

// --- Write operations ---

mcpServer.registerTool(
    "createTask",
    {
        description: "Create a new task on the Kanbanflow board. Requires at least a name and columnId. Use getBoard first to discover valid column/swimlane IDs.",
        inputSchema: CreateTaskInputSchema.shape,
    },
    async (args) => {
        try {
            logger.info("mcp tool invoked", { tool: "createTask", args });
            const result = await client.createTask(args);
            logger.info("mcp tool succeeded", {
                tool: "createTask",
                taskId: result.taskId,
                name: args.name,
                columnId: args.columnId,
            });
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error("mcp tool failed", { tool: "createTask", error: errorMessage, args });
            return {
                content: [
                    {
                        type: "text",
                        text: `Error creating task: ${errorMessage}`,
                    },
                ],
                isError: true,
            };
        }
    },
);

mcpServer.registerTool(
    "updateTask",
    {
        description: "Update an existing task on the Kanbanflow board. Only provided fields are changed (partial update). Can update name, description, color, responsible user, estimates, labels, subtasks, and collaborators.",
        inputSchema: {
            taskId: z.string().describe("The ID of the task to update"),
            ...UpdateTaskInputSchema.shape,
        },
    },
    async (args) => {
        try {
            const { taskId, ...updateFields } = args;
            logger.info("mcp tool invoked", { tool: "updateTask", taskId, fields: Object.keys(updateFields) });
            await client.updateTask(taskId, updateFields);
            logger.info("mcp tool succeeded", { tool: "updateTask", taskId });
            return {
                content: [
                    {
                        type: "text",
                        text: `Task ${taskId} updated successfully.`,
                    },
                ],
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error("mcp tool failed", { tool: "updateTask", error: errorMessage, taskId: args.taskId });
            return {
                content: [
                    {
                        type: "text",
                        text: `Error updating task ${args.taskId}: ${errorMessage}`,
                    },
                ],
                isError: true,
            };
        }
    },
);

mcpServer.registerTool(
    "deleteTask",
    {
        description: "Permanently delete a task from the Kanbanflow board. This action cannot be undone.",
        inputSchema: {
            taskId: z.string().describe("The ID of the task to delete"),
        },
    },
    async (args) => {
        try {
            logger.info("mcp tool invoked", { tool: "deleteTask", taskId: args.taskId });
            await client.deleteTask(args.taskId);
            logger.info("mcp tool succeeded", { tool: "deleteTask", taskId: args.taskId });
            return {
                content: [
                    {
                        type: "text",
                        text: `Task ${args.taskId} deleted successfully.`,
                    },
                ],
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error("mcp tool failed", { tool: "deleteTask", error: errorMessage, taskId: args.taskId });
            return {
                content: [
                    {
                        type: "text",
                        text: `Error deleting task ${args.taskId}: ${errorMessage}`,
                    },
                ],
                isError: true,
            };
        }
    },
);

mcpServer.registerTool(
    "moveTask",
    {
        description: "Move a task to a different column and/or swimlane on the Kanbanflow board. Use getBoard first to discover valid column/swimlane IDs.",
        inputSchema: {
            taskId: z.string().describe("The ID of the task to move"),
            columnId: z.string().describe("The target column ID to move the task to"),
            swimlaneId: z.string().optional().describe("The target swimlane ID (optional, keeps current swimlane if omitted)"),
            position: z.union([z.literal("top"), z.literal("bottom"), z.number()])
                .optional().describe("Position in the target column: 'top', 'bottom', or a numeric index"),
        },
    },
    async (args) => {
        try {
            const { taskId, columnId, swimlaneId, position } = args;
            logger.info("mcp tool invoked", { tool: "moveTask", taskId, columnId, swimlaneId, position });
            await client.updateTask(taskId, { columnId, swimlaneId, position });
            logger.info("mcp tool succeeded", { tool: "moveTask", taskId, columnId });
            return {
                content: [
                    {
                        type: "text",
                        text: `Task ${taskId} moved to column ${columnId}${swimlaneId ? ` in swimlane ${swimlaneId}` : ""} successfully.`,
                    },
                ],
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error("mcp tool failed", { tool: "moveTask", error: errorMessage, taskId: args.taskId });
            return {
                content: [
                    {
                        type: "text",
                        text: `Error moving task ${args.taskId}: ${errorMessage}`,
                    },
                ],
                isError: true,
            };
        }
    },
);

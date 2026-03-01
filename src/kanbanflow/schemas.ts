import { z } from "@zod/zod";

export const TaskNumberSchema = z.object({
    prefix: z.string().optional().describe("The prefix of the task number (e.g., 'KV')"),
    value: z.number().describe("The numeric value of the task number"),
});

export const TaskCollaboratorSchema = z.object({
    userId: z.string().describe("The user ID of the collaborator"),
});

export const TaskSchema = z.object({
    _id: z.string().describe("The unique ID of the task"),
    name: z.string().describe("The name/title of the task"),
    description: z.string().optional().describe("The description of the task"),
    color: z.string().describe("The color associated with the task"),
    columnId: z.string().describe("The ID of the column this task belongs to"),
    swimlaneId: z.string().optional().describe("The ID of the swimlane the task is in"),
    position: z.number().optional().describe("The index of the task in the column/swimlane"),
    totalSecondsSpent: z.number().optional().describe("Total seconds spent on the task"),
    totalSecondsEstimate: z.number().optional().describe("Total seconds estimated for the task"),
    pointsEstimate: z.number().optional().describe("Estimated points for the task"),
    number: TaskNumberSchema.optional().describe("The task number with prefix and value"),
    responsibleUserId: z.string().optional().describe("The user ID of the person responsible for the task"),
    collaborators: z.array(TaskCollaboratorSchema).optional().describe("Array of collaborators on the task"),
    groupingDate: z.string().optional().describe("Date if column is date grouped (YYYY-MM-DD)"),
    dates: z.array(z.unknown()).optional().describe("The dates of the task"),
    subTasks: z.array(z.unknown()).optional().describe("The subtasks of the task"),
    labels: z.array(z.unknown()).optional().describe("The labels of the task"),
    customFields: z.array(z.unknown()).optional().describe("The custom fields of the task"),
});

export const BoardColumnSchema = z.object({
    name: z.string().describe("The name of the column"),
    uniqueId: z.string().describe("The unique ID of the column"),
});

export const BoardSwimlaneSchema = z.object({
    name: z.string().describe("The name of the swimlane"),
    uniqueId: z.string().describe("The unique ID of the swimlane"),
});

export const BoardColorSchema = z.object({
    name: z.string().describe("The name of the color"),
    value: z.string().describe("The color value"),
    description: z.string().optional().describe("The description of the color"),
});

export const BoardResponseSchema = z.object({
    _id: z.string().describe("The ID of the board"),
    name: z.string().describe("The name of the board"),
    columns: z.array(BoardColumnSchema).describe("Array of columns in the board"),
    swimlanes: z.array(BoardSwimlaneSchema).optional().describe("Array of swimlanes in the board"),
    colors: z.array(BoardColorSchema).optional().describe("Array of colors available in the board"),
});

export const TasksColumnResponseSchema = z.object({
    columnId: z.string().describe("The unique ID of the column"),
    columnName: z.string().describe("The name of the column"),
    tasksLimited: z.boolean().describe("Whether there are more tasks to fetch"),
    nextTaskId: z.string().optional().describe("The ID of the next task for pagination"),
    tasks: z.array(TaskSchema).describe("Array of tasks in the column"),
});

export const TasksResponseSchema = z.array(TasksColumnResponseSchema).describe("Array of column responses with tasks");

export const UserSchema = z.object({
    _id: z.string().describe("The unique ID of the user"),
    fullName: z.string().describe("The full name of the user"),
    email: z.string().email().describe("The email address of the user"),
    role: z.string().optional().describe("The role of the user (e.g., admin, member)"),
});

export const UsersResponseSchema = z.array(UserSchema).describe("Array of users on the board");

export const CommentSchema = z.object({
    _id: z.string().describe("The unique ID of the comment"),
    text: z.string().describe("The comment text"),
    createdTimestamp: z.string().describe("ISO 8601 timestamp when comment was created"),
    authorUserId: z.string().describe("The ID of the user who created the comment"),
});

export const CommentsResponseSchema = z.array(CommentSchema).describe("Array of comments for a task");

// --- Write operation schemas ---

export const SubTaskInputSchema = z.object({
    name: z.string().describe("The name of the subtask"),
    finished: z.boolean().optional().describe("Whether the subtask is finished"),
    userId: z.string().optional().describe("The user ID assigned to the subtask"),
});

export const LabelInputSchema = z.object({
    name: z.string().describe("The label name"),
    pinned: z.boolean().optional().describe("Whether the label is pinned to the task card"),
});

export const CreateTaskInputSchema = z.object({
    name: z.string().describe("The name/title of the task"),
    columnId: z.string().describe("The ID of the column to create the task in"),
    swimlaneId: z.string().optional().describe("The ID of the swimlane to place the task in"),
    position: z.union([z.literal("top"), z.literal("bottom"), z.number()])
        .optional().describe("Position in the column: 'top', 'bottom', or a numeric index"),
    description: z.string().optional().describe("The description of the task"),
    color: z.string().optional().describe("The color of the task (e.g., 'yellow', 'white', 'magenta')"),
    responsibleUserId: z.string().optional().describe("The user ID of the person responsible"),
    totalSecondsEstimate: z.number().optional().describe("Estimated seconds for the task"),
    pointsEstimate: z.number().optional().describe("Estimated points for the task"),
    groupingDate: z.string().optional().describe("Date for date-grouped columns (YYYY-MM-DD)"),
    labels: z.array(LabelInputSchema).optional().describe("Labels to assign to the task"),
    subTasks: z.array(SubTaskInputSchema).optional().describe("Subtasks to create with the task"),
    collaborators: z.array(TaskCollaboratorSchema).optional().describe("Collaborators to assign"),
});

export const UpdateTaskInputSchema = z.object({
    name: z.string().optional().describe("The name/title of the task"),
    columnId: z.string().optional().describe("The ID of the column to move the task to"),
    swimlaneId: z.string().optional().describe("The ID of the swimlane to move the task to"),
    position: z.union([z.literal("top"), z.literal("bottom"), z.number()])
        .optional().describe("Position in the column: 'top', 'bottom', or a numeric index"),
    description: z.string().optional().describe("The description of the task"),
    color: z.string().optional().describe("The color of the task"),
    responsibleUserId: z.string().nullable().optional().describe("The user ID of the person responsible (null to unassign)"),
    totalSecondsEstimate: z.number().optional().describe("Estimated seconds for the task"),
    pointsEstimate: z.number().optional().describe("Estimated points for the task"),
    groupingDate: z.string().optional().describe("Date for date-grouped columns (YYYY-MM-DD)"),
    labels: z.array(LabelInputSchema).optional().describe("Labels to assign to the task"),
    subTasks: z.array(SubTaskInputSchema).optional().describe("Subtasks for the task"),
    collaborators: z.array(TaskCollaboratorSchema).optional().describe("Collaborators to assign"),
});

export const CreateTaskResponseSchema = z.object({
    taskId: z.string().describe("The ID of the created task"),
}).passthrough();

export const DeleteTaskResponseSchema = z.unknown().describe("Response from deleting a task (may be empty)");

import { z } from "@zod/zod";
import { config } from "../config.ts";
import { BoardResponseSchema, CommentsResponseSchema, CreateTaskResponseSchema, TaskSchema, TasksResponseSchema, UsersResponseSchema } from "./schemas.ts";
import type { Board, CommentsResponse, CreateTaskInput, CreateTaskResponse, GetTasksOptions, Task, TasksResponse, UpdateTaskInput, UsersResponse } from "./types.ts";

/**
 * Simple HTTP client for KanbanFlow API
 */
export class KanbanFlowClient {
    private readonly baseUrl: string;
    private readonly apiKey: string;

    constructor(apiKey?: string, baseUrl = "https://kanbanflow.com/api/v1") {
        this.apiKey = apiKey ?? config.KANBANFLOW_API_KEY;
        this.baseUrl = baseUrl;

        if (!this.apiKey) {
            throw new Error("KANBANFLOW_API_KEY is required");
        }
    }

    /**
     * Gets the authorization header for API requests
     */
    private getAuthHeader(): string {
        const credentials = `apiToken:${this.apiKey}`;
        const encoded = btoa(credentials);
        return `Basic ${encoded}`;
    }

    /**
     * Makes an HTTP request to the KanbanFlow API
     */
    private async request<T>(
        path: string,
        options: RequestInit = {},
    ): Promise<T> {
        const url = `${this.baseUrl}${path}`;
        const headers = {
            "Authorization": this.getAuthHeader(),
            "Content-Type": "application/json",
            ...options.headers,
        };

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => "Unknown error");
            throw new Error(
                `KanbanFlow API error ${response.status}: ${errorText}`,
            );
        }

        const text = await response.text();
        if (!text) {
            return undefined as T;
        }
        return JSON.parse(text) as T;
    }

    /**
     * Gets the board structure (columns, swimlanes, colors)
     */
    async getBoard(): Promise<Board> {
        try {
            const data = await this.request<unknown>("/board");
            return BoardResponseSchema.parse(data);
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new Error(`Invalid response format: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Gets tasks filtered by column with optional pagination
     */
    async getTasks(options?: GetTasksOptions): Promise<TasksResponse> {
        try {
            const params = new URLSearchParams();

            if (options?.columnId) {
                params.append("columnId", options.columnId);
            } else if (options?.columnName) {
                params.append("columnName", options.columnName);
            } else if (options?.columnIndex !== undefined) {
                params.append("columnIndex", options.columnIndex.toString());
            }

            if (options?.startTaskId) {
                params.append("startTaskId", options.startTaskId);
            }

            if (options?.startGroupingDate) {
                params.append("startGroupingDate", options.startGroupingDate);
            }

            if (options?.limit) {
                params.append("limit", options.limit.toString());
            }

            if (options?.order) {
                params.append("order", options.order);
            }

            if (options?.includePosition) {
                params.append("includePosition", "true");
            }

            const queryString = params.toString();
            const path = queryString ? `/tasks?${queryString}` : "/tasks";

            const data = await this.request<unknown>(path);
            return TasksResponseSchema.parse(data);
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new Error(`Invalid response format: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Gets a single task by ID
     */
    async getTaskById(
        taskId: string,
        includePosition = false,
    ): Promise<Task> {
        try {
            const params = new URLSearchParams();
            if (includePosition) {
                params.append("includePosition", "true");
            }

            const queryString = params.toString();
            const path = queryString ? `/tasks/${taskId}?${queryString}` : `/tasks/${taskId}`;

            const data = await this.request<unknown>(path);
            return TaskSchema.parse(data);
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new Error(`Invalid response format: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Gets all users on the board
     */
    async getUsers(): Promise<UsersResponse> {
        try {
            const data = await this.request<unknown>("/users");
            return UsersResponseSchema.parse(data);
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new Error(`Invalid response format: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Gets all comments for a specific task
     */
    async getComments(taskId: string): Promise<CommentsResponse> {
        try {
            const data = await this.request<unknown>(`/tasks/${taskId}/comments`);
            return CommentsResponseSchema.parse(data);
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new Error(`Invalid response format: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Creates a new task on the board
     */
    async createTask(input: CreateTaskInput): Promise<CreateTaskResponse> {
        try {
            const data = await this.request<unknown>("/tasks", {
                method: "POST",
                body: JSON.stringify(input),
            });
            return CreateTaskResponseSchema.parse(data);
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new Error(`Invalid response format: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Updates an existing task (partial update — only provided fields are changed)
     */
    async updateTask(taskId: string, input: UpdateTaskInput): Promise<void> {
        await this.request<undefined>(`/tasks/${taskId}`, {
            method: "POST",
            body: JSON.stringify(input),
        });
    }

    /**
     * Deletes a task by ID
     */
    async deleteTask(taskId: string): Promise<void> {
        await this.request<undefined>(`/tasks/${taskId}`, {
            method: "DELETE",
        });
    }
}

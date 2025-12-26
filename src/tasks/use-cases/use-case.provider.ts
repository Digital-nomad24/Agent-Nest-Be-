import { createTaskUseCase } from "./create-tasks.use-case";
import { deleteTaskUseCase } from "./delete-tasks.use-case";
import { listTasksUseCase } from "./list-tasks.use-case";
import { retrieveTaskUseCase } from "./retrieve-tasks.use-case";
import { updateTaskUseCase } from "./update-tasks.use-case";

export const USE_CASE_PROVIDER = [createTaskUseCase,listTasksUseCase,retrieveTaskUseCase,deleteTaskUseCase,updateTaskUseCase]
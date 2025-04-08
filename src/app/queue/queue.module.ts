import { Module } from "@nestjs/common";
import { DatabaseModule } from "@src/database/database.module";
import { QueueController } from "./queue.controller";
import { QueueService } from "./queue.service";
import { QueueRepository } from "./queue.respository";
import { QueueTasksService } from "./queue.tasks";

@Module({
    imports: [DatabaseModule],
    controllers: [QueueController],
    providers: [QueueService, QueueRepository, QueueTasksService]
})

export class QueueModule { }
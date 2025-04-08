import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueueRepository } from './queue.respository';

@Injectable()
export class QueueTasksService {
    private readonly logger = new Logger(QueueTasksService.name);

    constructor(private readonly queueRepository: QueueRepository) { }

    @Cron(CronExpression.EVERY_5_MINUTES)
    async clearExpiredEntriesTask() {
        this.logger.log('Running scheduled task: clearing expired queue entries');
        try {
            await this.queueRepository.clearExpiredEntries();
            this.logger.log('Successfully cleared expired queue entries');
        } catch (error) {
            this.logger.error(`Failed to clear expired entries: ${error.message}`, error.stack);
        }
    }
}
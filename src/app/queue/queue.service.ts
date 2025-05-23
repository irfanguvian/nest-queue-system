import { Injectable, Logger } from "@nestjs/common"
import { QueueRepository } from "./queue.respository"
import { v4 as uuidv4 } from 'uuid';
import { ResponseEntity } from "../../common/entities/response.entity";

@Injectable()
export class QueueService {
    constructor(
        private readonly queueRepository: QueueRepository,
    ) { }
    private readonly logger = new Logger(QueueService.name)

    async startQueue(product_code: string) {
        const result = new ResponseEntity({
            message: 'Queue started failed',
            success: false,
            data: { queue_id: '' },
            errors: [],
        })
        try {
            const queue_id = uuidv4();
            await this.queueRepository.create({ queue_id, product_code });
            result.success = true;
            result.message = 'Queue started successfully';
            result.data = {
                queue_id,
            }
            return result;
        } catch (error) {
            result.message = 'Failed to start queue';
            result.success = false;
            result.errors = [{ field: 'queue', message: ['Failed to start queue'] }];
            this.logger.error('Failed to start queue', error);
            return result;
        }
    }

    async checkStatus(queue_id: string) {
        const result = new ResponseEntity({
            message: 'Queue status checked failed',
            success: false,
            data: {
                queue_id: '',
                is_available: false,
                estimated_time: 0,
            },
            errors: [],
        })
        try {
            const isExist = await this.queueRepository.isQueueIDExists(queue_id);
            if (!isExist) {
                result.message = 'Queue ID not found';
                result.success = false;
                result.errors = [{ field: 'queue', message: ['Queue ID not found'] }];
                return result;
            }

            const is_available = await this.queueRepository.isAvailable(queue_id);
            const estimated_minutes = await this.queueRepository.getEstimatedWaitTime(queue_id);
            result.success = true;
            result.message = 'Queue status checked successfully';
            result.data = {
                queue_id,
                is_available,
                estimated_time: estimated_minutes.minutes,
            }

            return result;
        } catch (error) {
            console.error('Check queue status', error);
            result.message = 'Failed to check queue status';
            result.success = false;
            result.errors = [{ field: 'queue', message: ['Check queue status'] }];
            this.logger.error('Check queue status', error);
            return result;
        }
    }

    async enterRoom(queue_id: string) {
        const result = new ResponseEntity({
            message: 'Queue enter room failed',
            success: true,
            errors: [],
        })
        try {
            const success = await this.queueRepository.enterRoom(queue_id);
            if (!success) {
                throw new Error('Cannot enter room yet');
            }
            result.success = true;
            result.message = 'Queue enter room successfully';
            return result;
        } catch (error) {
            result.message = 'Failed to enter room';
            result.success = false;
            result.errors = [{ field: 'queue', message: ['Failed to enter room'] }];
            this.logger.error('Failed to enter room', error);
            return result;
        }
    }
}
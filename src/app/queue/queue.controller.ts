import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { QueueService } from "./queue.service";
import { CheckQueueStatusDto, EnterRoomDto, StartQueueDto } from "./queue.dto";
import { QueueTasksService } from "./queue.tasks";


@ApiTags('Queue')
@Controller('')
export class QueueController {
    constructor(
        private readonly queueService: QueueService,
        private readonly queueTasksService: QueueTasksService
    ) { }

    @ApiOperation({ summary: 'Start a new queue' })
    @ApiResponse({ status: 201, description: 'Queue has been successfully started.' })
    @ApiResponse({ status: 400, description: 'Invalid product code.' })
    @Post('start')
    async startQueue(@Body() body: StartQueueDto) {
        return this.queueService.startQueue(body.product_code);
    }

    @ApiOperation({ summary: 'Check the status of a queue' })
    @ApiParam({ name: 'queue_id', description: 'Queue ID to check status for' })
    @ApiResponse({ status: 200, description: 'Returns the queue status.' })
    @ApiResponse({ status: 404, description: 'Queue not found.' })
    @Get('status/:queue_id')
    async checkStatus(@Param() params: CheckQueueStatusDto) {
        return this.queueService.checkStatus(params.queue_id);
    }

    @ApiOperation({ summary: 'Enter the queue room' })
    @ApiResponse({ status: 200, description: 'Successfully entered the room.' })
    @ApiResponse({ status: 404, description: 'Queue not found.' })
    @Post('enter')
    async enterRoom(@Body() body: EnterRoomDto) {
        return this.queueService.enterRoom(body.queue_id);
    }

    @ApiOperation({ summary: 'Cron job endpoint for clearing expired queue entries' })
    @ApiResponse({ status: 200, description: 'Successfully cleared expired entries.' })
    @Get('cron')
    async runCronJob() {
        await this.queueTasksService.clearExpiredEntriesTask();
        return { success: true, message: 'Expired entries cleared successfully' };
    }
}
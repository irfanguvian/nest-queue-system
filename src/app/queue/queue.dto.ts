import { ApiProperty } from '@nestjs/swagger';

export class StartQueueDto {
    @ApiProperty({
        description: 'Product code for which queue is being started',
        example: 'PROD-001'
    })
    product_code: string;
}

export class CheckQueueStatusDto {
    @ApiProperty({
        description: 'Queue identifier',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    queue_id: string;
}

export class EnterRoomDto {
    @ApiProperty({
        description: 'Queue identifier for entering room',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    queue_id: string;
}
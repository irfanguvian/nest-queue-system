import { ApiProperty } from '@nestjs/swagger';

export class ResponseEntity<T = unknown> {
    @ApiProperty({
        example: {},
        description: 'Response data',
    })
    data?: T | null;
    @ApiProperty({
        example: "success | bad request",
        description: 'Response message',
    })
    message?: string;
    @ApiProperty({
        example: true,
        description: 'Success status',
    })
    success: boolean;
    @ApiProperty({
        example: [],
        description: 'Response errors',
    })
    errors?: { field: string; message: string[] }[];

    constructor({
        message,
        data,
        success,
        errors,
    }: {
        message?: string;
        data?: T;
        success: boolean;
        errors?: { field: string; message: string[] }[];
    }) {
        this.message = message || 'success';
        this.data = data || null;
        this.errors = errors;
        this.success = success;
    }
}
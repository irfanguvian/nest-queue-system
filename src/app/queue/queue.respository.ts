import { Injectable } from "@nestjs/common";
import { PrismaService } from "@src/database/services/prisma.service";
import * as moment from 'moment';

@Injectable()
export class QueueRepository {
    constructor(private readonly prismaservice: PrismaService) { }
    // private readonly logger = new Logger(QueueRepository.name)
    private readonly maxEnterRoom = 100
    async create(data: { queue_id: string; product_code: string }) {
        await this.prismaservice.queueProductSystem.create({ data });
    }

    async findByQueueId(queue_id: string) {
        return this.prismaservice.queueProductSystem.findUnique({ where: { queue_id } });
    }

    async isAvailable(queue_id: string): Promise<boolean> {
        const result = await this.prismaservice.$queryRawUnsafe<
            Array<{ position: number; total_entered: number }>
        >(`
        SELECT
            (SELECT COUNT(*) FROM "QueueProductSystem" AS q1
             WHERE q1."product_code" = q2."product_code"
               AND q1."created_at" <= q2."created_at") + 1 AS position,
            (SELECT COUNT(*) FROM "QueueProductSystem"
             WHERE "product_code" = q2."product_code"
               AND "entered_at" IS NOT NULL) AS total_entered
        FROM "QueueProductSystem" q2
        WHERE q2."queue_id" = $1
        LIMIT 1
        `, queue_id);

        if (!result || result.length === 0) return false;

        const { position, total_entered } = result[0];
        return total_entered < this.maxEnterRoom && total_entered + 1 >= position;
    }

    async enterRoom(queue_id: string): Promise<boolean> {
        const isAvailable = await this.isAvailable(queue_id);
        if (!isAvailable) return false;
        await this.prismaservice.queueProductSystem.update({
            where: { queue_id },
            data: { entered_at: new Date(), expired_at: moment().add(15, 'minutes').toDate() },
        });
        return true;
    }

    async getPositionInQueue(product_code: string): Promise<number> {
        const entries = await this.prismaservice.queueProductSystem.findMany({
            where: { product_code },
            orderBy: { created_at: 'asc' },
        });
        return entries.length;
    }

    async getPositionInQueueByQueueId(queue_id: string): Promise<number> {
        const current = await this.findByQueueId(queue_id);
        if (!current) return 0;

        const count = await this.prismaservice.queueProductSystem.count({
            where: {
                product_code: current.product_code,
                created_at: {
                    lte: current.created_at,
                },
            },
        });

        return count + 1; // Position is 1-based
    }

    async clearExpiredEntries() {
        await this.prismaservice.queueProductSystem.deleteMany({
            where: {
                expired_at: { lt: new Date() },
            },
        });
    }

    async isQueueIDExists(queue_id: string): Promise<boolean> {
        const result = await this.prismaservice.queueProductSystem.findUnique({
            where: { queue_id },
        });
        return !!result;
    }

    async getEstimatedWaitTime(queue_id: string): Promise<{ minutes: number }> {
        const current = await this.findByQueueId(queue_id);
        if (!current) return { minutes: -1 };

        const userPosition = await this.getPositionInQueueByQueueId(queue_id);

        if (userPosition <= this.maxEnterRoom) {
            // Already eligible
            return { minutes: 0 };
        }

        // Get the earliest active user inside the room (not expired)
        const firstActive = await this.prismaservice.queueProductSystem.findFirst({
            where: {
                product_code: current.product_code,
                expired_at: {
                    gt: new Date(), // still inside room
                },
            },
            orderBy: { expired_at: 'asc' },
        });

        if (!firstActive) {
            // No one is inside room now
            return { minutes: (userPosition - this.maxEnterRoom) * 15 };
        }

        // Time remaining for first user
        const now = moment();
        const expire = moment(firstActive.expired_at);
        const timeLeft = expire.diff(now, 'minutes');

        const estimatedMinutes = timeLeft + ((userPosition - this.maxEnterRoom - 1) * 15);
        return { minutes: Math.max(estimatedMinutes, 0) };
    }
}

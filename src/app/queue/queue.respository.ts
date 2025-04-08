import { Injectable } from "@nestjs/common";
import { PrismaService } from "@src/database/services/prisma.service";
import * as moment from "moment";

@Injectable()
export class QueueRepository {
    constructor(private readonly prismaservice: PrismaService) { }
    private readonly maxEnterRoom = 5;
    private readonly minutesProcessTime = 5;

    // Helper method for consistent UTC handling
    private getUTCTime() {
        return moment().utc();
    }

    async create(data: { queue_id: string; product_code: string }) {
        await this.prismaservice.queueProductSystem.create({ data });
    }

    async findByQueueId(queue_id: string) {
        return this.prismaservice.queueProductSystem.findUnique({
            where: { queue_id },
        });
    }

    async isAvailable(queue_id: string): Promise<boolean> {
        const queueEntry = await this.findByQueueId(queue_id);
        if (!queueEntry) return false;

        // Count number of people currently in the room for this product
        const inRoomCount = await this.prismaservice.queueProductSystem.count({
            where: {
                product_code: queueEntry.product_code,
                entered_at: { not: null },
                expired_at: { gt: this.getUTCTime().toDate() }, // Only count those who are still in the room
            },
        });

        // If room is not full, check if this user is among the next eligible people
        if (inRoomCount < this.maxEnterRoom) {
            // Get position of this user in waiting queue
            const waitingQueue = await this.prismaservice.queueProductSystem.findMany(
                {
                    where: {
                        product_code: queueEntry.product_code,
                        entered_at: null, // Not yet entered
                    },
                    orderBy: { created_at: "asc" }, // Order by creation time
                    take: this.maxEnterRoom - inRoomCount,
                },
            );

            // Find position of current queue_id in waiting list (0-based index)
            const waitingPosition = waitingQueue.findIndex(
                (entry) => entry.queue_id === queue_id,
            );

            // Eligible if one of the first (maxEnterRoom - inRoomCount) people in waiting queue
            return (
                waitingPosition >= 0 &&
                waitingPosition < this.maxEnterRoom - inRoomCount
            );
        }

        return false;
    }

    async enterRoom(queue_id: string): Promise<boolean> {
        const isAvailable = await this.isAvailable(queue_id);
        if (!isAvailable) return false;

        const now = this.getUTCTime();
        await this.prismaservice.queueProductSystem.update({
            where: { queue_id },
            data: {
                entered_at: now.toDate(),
                expired_at: now.clone().add(this.minutesProcessTime, "minutes").toDate(),
            },
        });
        return true;
    }

    async getPositionInQueue(product_code: string): Promise<number> {
        const entries = await this.prismaservice.queueProductSystem.count({
            where: { product_code },
        });
        return entries;
    }

    async clearExpiredEntries() {
        await this.prismaservice.queueProductSystem.deleteMany({
            where: {
                expired_at: { lt: this.getUTCTime().toDate() },
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

        // If already in the room
        if (current.entered_at) return { minutes: 0 };

        const now = this.getUTCTime().toDate();

        // Get information about current user's position and room availability in a single query
        const result = await this.prismaservice.$queryRaw<
            Array<{
                active_users_count: number;
                waiting_ahead: number;
            }>
        >`
            WITH RoomUsers AS (
                SELECT expired_at
                FROM "QueueProductSystem"
                WHERE product_code = ${current.product_code}
                  AND entered_at IS NOT NULL
                  AND expired_at > ${now}
                ORDER BY expired_at ASC
            ),
            WaitingQueue AS (
                SELECT 
                    queue_id,
                    ROW_NUMBER() OVER (ORDER BY created_at ASC) as position
                FROM "QueueProductSystem"
                WHERE product_code = ${current.product_code}
                  AND entered_at IS NULL
                ORDER BY created_at ASC
            )
            SELECT
                (SELECT COUNT(*) FROM RoomUsers) as active_users_count,
                (SELECT COUNT(*) FROM WaitingQueue WHERE position < 
                    (SELECT position FROM WaitingQueue WHERE queue_id = ${queue_id})
                ) as waiting_ahead
        `;

        // If query returned no results
        if (!result || result.length === 0) {
            return { minutes: -1 };
        }

        const active_users_count = Number.parseInt(String(result[0].active_users_count));
        const waiting_ahead = Number.parseInt(String(result[0].waiting_ahead));

        // If no waiting users ahead and room has space, can enter immediately
        if (waiting_ahead === 0 && active_users_count < this.maxEnterRoom) {
            return { minutes: 0 };
        }

        // Get earliest exit times from room, sorted
        const exitTimesResult = await this.prismaservice.$queryRaw<
            Array<{ exit_time: Date }>
        >`
            SELECT expired_at as exit_time
            FROM "QueueProductSystem" 
            WHERE product_code = ${current.product_code}
              AND entered_at IS NOT NULL
              AND expired_at > ${now}
            ORDER BY expired_at ASC
            LIMIT 10
        `;

        // Calculate when this user can enter
        const exitTimes = exitTimesResult.map((r) => moment.utc(r.exit_time));

        // Calculate estimated wait time
        const estimatedMinutes = this.calculateEstimatedWaitTime(
            exitTimes,
            waiting_ahead,
            active_users_count,
        );

        return { minutes: Math.max(0, estimatedMinutes + 1) };
    }

    /**
     * Calculate estimated wait time based on current room status and position in queue
     * @param exitTimes Array of moment objects representing when current users exit
     * @param waitingAhead Number of users ahead in waiting queue
     * @param activeUsersCount Current number of users in room
     * @returns Estimated wait time in minutes
     */
    private calculateEstimatedWaitTime(
        exitTimes: moment.Moment[],
        waitingAhead: number,
        activeUsersCount: number,
    ): number {
        const now = this.getUTCTime();
        let waitingAheadTemp = waitingAhead;
        const roomCapacity = this.maxEnterRoom;

        // Case 1: Room is not full and no one ahead - can enter immediately
        if (activeUsersCount < roomCapacity && waitingAhead === 0) {
            return 0;
        }

        // Case 2: Room is full or there are people ahead
        // Calculate available spots when people start leaving
        const availableSpots = roomCapacity - activeUsersCount;

        // If there are spots available, some people can enter immediately
        if (availableSpots > 0) {
            // If our position is within available spots, can enter immediately
            if (waitingAhead < availableSpots) {
                return 0;
            }

            // Otherwise, calculate how many people need to leave before we can enter
            waitingAheadTemp -= availableSpots;
        }

        // Sort exit times (should be sorted already, but making sure)
        exitTimes.sort((a, b) => a.valueOf() - b.valueOf());

        // If no one is in room or exit times are empty (shouldn't happen, but being safe)
        if (exitTimes.length === 0) {
            // Calculate based only on waiting queue position and room capacity
            const cycleTimeMinutes = this.minutesProcessTime; // each room cycle takes this.minutesProcessTime minutes
            const fullCycles = Math.floor(waitingAheadTemp / roomCapacity);
            const partialCycle = waitingAheadTemp % roomCapacity > 0 ? 1 : 0;

            return (fullCycles + partialCycle) * cycleTimeMinutes;
        }

        // Get time until first exit
        const timeToFirstExit = Math.max(0, exitTimes[0].diff(now, "minutes"));

        // If no one is ahead, we can enter when the first person exits
        if (waitingAheadTemp === 0) {
            return timeToFirstExit;
        }

        // For users ahead of us, calculate how many full room cycles needed
        const usersPerFullCycle = roomCapacity;
        const fullCycles = Math.floor(waitingAheadTemp / usersPerFullCycle);

        // Calculate position within the cycle (0-based)
        const positionInCycle = waitingAheadTemp % usersPerFullCycle;

        // Base wait time: time until first exit + full cycles time
        let waitTime = timeToFirstExit + fullCycles * this.minutesProcessTime;

        // If not at the start of a cycle, add time proportional to position
        if (positionInCycle > 0) {
            // If we have enough exit times, use the actual time for that position
            if (positionInCycle < exitTimes.length) {
                // Get the exact time when the user at this position will exit
                waitTime =
                    exitTimes[positionInCycle].diff(now, "minutes") + fullCycles * this.minutesProcessTime;
            } else {
                // Add proportional time for position in cycle
                waitTime += this.minutesProcessTime * (positionInCycle / usersPerFullCycle);
            }
        }

        return Math.max(0, waitTime);
    }
}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './app/queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || "info",
        formatters: {
          level: (label) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        genReqId: (req, res) => {
          if (req.id) return req.id;

          let id = req.headers["X-Request-Id"];
          if (id) return id;

          id = uuidv4();
          res.setHeader("X-Request-Id", id);

          return id;
        }
      }
    }),
    DatabaseModule,
    QueueModule,
  ],
  exports: [DatabaseModule]
})
export class AppModule { }

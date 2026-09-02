import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ManagerGuard } from '../admin/manager.guard';
import { LogService } from './log.service';
import { LogController } from './log.controller';
import { LogCaptureMiddleware } from './log-capture.middleware';

/**
 * Journalisation des requêtes HTTP.
 * Le middleware `LogCaptureMiddleware` est appliqué à TOUTES les routes
 * (`path: '*'`) : chaque appel d'API est tracé (console + tampon mémoire).
 */
@Module({
  controllers: [LogController],
  providers: [LogService, LogCaptureMiddleware, ManagerGuard],
  exports: [LogService],
})
export class LogModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LogCaptureMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}

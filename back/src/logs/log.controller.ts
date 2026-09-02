import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ManagerGuard } from '../admin/manager.guard';
import { LogService } from './log.service';

/**
 * Consultation des journaux de requêtes (back-office).
 * Réservée aux MANAGER : un apprenant ne doit pas pouvoir lire les traces
 * des requêtes de l'API (même masquées).
 */
@Controller('logs')
@UseGuards(JwtAuthGuard, ManagerGuard)
export class LogController {
  constructor(private readonly logService: LogService) {}

  @Get()
  getLogs(): {
    message: string;
    count: number;
    logs: ReturnType<LogService['getEntries']>;
    securityNote: string;
  } {
    const logs = this.logService.getEntries();
    return {
      message: 'Logs API sécurisés — informations confidentielles masquées',
      count: logs.length,
      logs,
      securityNote:
        'Les données sensibles (tokens JWT, clés API, mots de passe, en-têtes Authorization, cookies) sont volontairement masquées pour éviter la vulgarisation.',
    };
  }
}

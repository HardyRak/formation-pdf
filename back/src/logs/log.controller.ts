import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LogService } from './log.service';

@Controller('logs')
export class LogController {
  constructor(private readonly logService: LogService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
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
        'Les données sensibles (tokens JWT, clés API, mots de passe, en-têtes Authorization) sont volontairement masquées pour éviter la vulgarisation.',
    };
  }
}

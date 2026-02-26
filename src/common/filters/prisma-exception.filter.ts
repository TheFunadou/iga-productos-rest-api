import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
    catch(
        exception: Prisma.PrismaClientKnownRequestError,
        host: ArgumentsHost,
    ) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();

        const isDev = process.env.NODE_ENV !== 'production';

        let status = HttpStatus.BAD_REQUEST;
        let message = 'Error en base de datos';

        switch (exception.code) {
            /** 🔐 Constraints */
            case 'P2002':
                status = HttpStatus.CONFLICT;
                message = 'Violación de restricción única';
                break;

            case 'P2003':
                status = HttpStatus.BAD_REQUEST;
                message = 'Violación de clave foránea';
                break;

            case 'P2004':
                status = HttpStatus.BAD_REQUEST;
                message = 'Restricción de base de datos violada';
                break;

            case 'P2025':
                status = HttpStatus.NOT_FOUND;
                message = 'Registro no encontrado';
                break;

            case 'P2016':
                status = HttpStatus.NOT_FOUND;
                message = 'Registro relacionado no encontrado';
                break;

            case 'P2014':
                status = HttpStatus.BAD_REQUEST;
                message = 'Relación requerida violada';
                break;

            case 'P2006':
                status = HttpStatus.BAD_REQUEST;
                message = 'Valor inválido para el campo';
                break;

            case 'P2007':
                status = HttpStatus.BAD_REQUEST;
                message = 'Error de validación de datos';
                break;

            case 'P2010':
                status = HttpStatus.BAD_REQUEST;
                message = 'Error en consulta SQL';
                break;

            case 'P1001':
                status = HttpStatus.SERVICE_UNAVAILABLE;
                message = 'No se puede conectar a la base de datos';
                break;

            case 'P1002':
                status = HttpStatus.REQUEST_TIMEOUT;
                message = 'Timeout al conectar con la base de datos';
                break;

            case 'P1003':
                status = HttpStatus.INTERNAL_SERVER_ERROR;
                message = 'Base de datos no existe';
                break;

            default:
                status = HttpStatus.INTERNAL_SERVER_ERROR;
                message = 'Error desconocido de Prisma';
        }

        response.status(status).json({
            statusCode: status,
            message,
            error: 'PrismaError',
            ...(isDev && {
                prisma: {
                    code: exception.code,
                    meta: exception.meta,
                },
            }),
        });
    }
}

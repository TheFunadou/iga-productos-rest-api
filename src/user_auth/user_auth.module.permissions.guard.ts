// src/user_auth/user_auth.module.permissions.ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthUserPermissions, UserPayload, UserPermissions } from "./user_auth.dto";
import { ModulePermissionsMap } from "./user_auth.module.permissions.decorator";
import { CacheService } from "src/cache/cache.service";

@Injectable()
export class UserModulePermissionsGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private cacheService: CacheService
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user: UserPayload = request.user;

        if (!user) { throw new ForbiddenException("Usuario no autenticado"); }
        // Lee los permisos requeridos del decorador
        const requiredPermissions = this.reflector.get<ModulePermissionsMap>('modulePermissions', context.getHandler());

        const userPermissions = await this.cacheService.getData<AuthUserPermissions>({
            entity: "user:permissions",
            query: { uuid: user.uuid }
        });

        if (!userPermissions) throw new ForbiddenException("Necesitas inciar sesion para acceder a este recurso");
        //If the user is admin or superuser, allow access
        if (userPermissions.role === "ADMIN" || "SUPERUSER") return true;
        if (!userPermissions.permissions) throw new ForbiddenException("Necesitas tener permisos para acceder a este recurso");
        // Si no hay decorador, permite el acceso
        if (!requiredPermissions) return true;

        // Verifica cada módulo especificado
        for (const [module, permissions] of Object.entries(requiredPermissions)) {
            const check = userPermissions[module];
            if (!check) throw new ForbiddenException(`No tienes acceso al módulo ${module}`);
            for (const permission of permissions) {
                if (!check.includes(permission)) {
                    throw new ForbiddenException(`No tienes permiso de ${permission} en el módulo ${module}`);
                }
            }
        };
        return true;
    }
}
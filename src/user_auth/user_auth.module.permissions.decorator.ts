// src/user_auth/user_auth.module.permissions.decorator.ts
import { SetMetadata } from "@nestjs/common";
import { Modules, Permissions } from "./user_auth.dto";

// Tipo para el objeto de permisos
export type ModulePermissionsMap = Partial<Record<Modules, Permissions[]>>;

// Decorador
export const RequirePermissions = (permissions: ModulePermissionsMap) =>
    SetMetadata('modulePermissions', permissions);
import { ApiProperty, OmitType } from "@nestjs/swagger";
import { PaginationDTO } from "src/common/DTO/pagination.dto";

class UserLog {
    @ApiProperty({ example: "cuid" })
    id: string;
    @ApiProperty({ example: "cuid" })
    user_id: string;
    @ApiProperty({ example: "USER" })
    entity: string;
    @ApiProperty({ example: "cuid" })
    entity_id: string;
    @ApiProperty({ example: "CREATE" })
    action: string;
    @ApiProperty({ example: {} })
    metadata: any;
    @ApiProperty({ example: "2022-01-01T00:00:00.000Z" })
    created_at: Date;
};

class SafeUserLogs extends OmitType(UserLog, ["id", "user_id", "entity_id"] as const) {
    @ApiProperty({ example: "cuid" })
    user_uuid?: string | null;
    @ApiProperty({ example: "username" })
    username?: string | null;
};

export class GetUserLogsDashboard {
    @ApiProperty({ type: [SafeUserLogs] })
    data: SafeUserLogs[];
    @ApiProperty({ example: 1 })
    totalPages: number;
    @ApiProperty({ example: 1 })
    totalRecords: number;
};


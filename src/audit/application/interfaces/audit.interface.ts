
export interface UserLog {
    user: { name?: string, surname?: string, username?: string },
    entity: string;
    action: string;
    metadata?: any;
};


export interface UserLogsDashboard {
    data: UserLog[];
    totalRecords: number;
    totalPages: number;
    currentPage: number;
};

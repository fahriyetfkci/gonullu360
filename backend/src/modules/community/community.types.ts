export type GetDashboardStatsResult = Promise<{
    activeVolunteers: {
        total: number;
        regular: number;
        lowParticipation: number;
        monthlyIncrease: number;
    };
    completedEvents: {
        total: number;
        target: number;
        rate: number;
        yearlyIncrease: number;
    };
    monthlyVolunteers: {
        year: number;
        data: {
            month: string;
            genel: number;
            bölge: Record<string, number>;
            cinsiyet: Record<string, number>;
        }[];
    };
    eventParticipation: {
        count: number;
        name: string;
        target: number;
    }[];
    demographicData: {
        ageGroup: string;
        bölge: number;
        cinsiyet: Record<string, number>;
        aktif: number;
    }[];
    volunteers: {
        name: string;
        city: string;
        gender: string;
        age: number;
        date: string;
    }[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}>;

export type GetDashboardRangeResult = Promise<{
    startYear: number;
    endYear: number;
    data: {
        year: number;
        total: number;
        gender: {
            [x: string]: number;
        };
        region: {
            [x: string]: number;
        };
    }[];
}>;

export type GetDashboardYearBoundsResult = Promise<{
    minYear: number;
    maxYear: number;
}>;

export type GetVolunteerProfileResult = Promise<{
    dataSource: string;
    id: number;
    volunteerCode: string;
    name: string;
    status: string;
    active: boolean;
    city: string;
    department: string | null;
    gender: string;
    age: number;
    birthDate: Date | null;
    education: string;
    joinedAt: Date;
    photoUrl: string | null;
    contact: {
        phone: string | null;
        email: string | null;
        address: string | null;
    };
    interests: string[];
    educations: {
        level: string;
        id: number;
        volunteerId: number;
        department: string | null;
        school: string;
        startYear: number | null;
        endYear: number | null;
        current: boolean;
    }[];
    scores: {
        volunteering: number;
        participation: number;
    };
    targets: {
        volunteering: number;
        participation: number;
    };
    lastEvent: {
        id: string;
        name: string;
        date: Date;
        completed: boolean;
    } | null;
    events: {
        id: string;
        name: string;
        date: Date;
        completed: boolean;
    }[];
    managerNote: string | null;
    managerNoteMeta: {
        authorId: string | null;
        authorName: string | null;
        authorRole: import("@prisma/client").Role | null;
        updatedAt: Date | null;
    } | null;
    coverLetter: string | null;
    summary: {
        applicationCount: number;
        trainingCount: number;
        eventCount: number;
        documentCount: number;
        taskCount: number;
    };
} | undefined>;

export type UpdateVolunteerProfileResult = Promise<{
    dataSource: string;
    id: number;
    volunteerCode: string;
    name: string;
    status: string;
    active: boolean;
    city: string;
    department: string | null;
    gender: string;
    age: number;
    birthDate: Date | null;
    education: string;
    joinedAt: Date;
    photoUrl: string | null;
    contact: {
        phone: string | null;
        email: string | null;
        address: string | null;
    };
    interests: string[];
    educations: {
        level: string;
        id: number;
        volunteerId: number;
        department: string | null;
        school: string;
        startYear: number | null;
        endYear: number | null;
        current: boolean;
    }[];
    scores: {
        volunteering: number;
        participation: number;
    };
    targets: {
        volunteering: number;
        participation: number;
    };
    lastEvent: {
        id: string;
        name: string;
        date: Date;
        completed: boolean;
    } | null;
    events: {
        id: string;
        name: string;
        date: Date;
        completed: boolean;
    }[];
    managerNote: string | null;
    managerNoteMeta: {
        authorId: string | null;
        authorName: string | null;
        authorRole: import("@prisma/client").Role | null;
        updatedAt: Date | null;
    } | null;
    coverLetter: string | null;
    summary: {
        applicationCount: number;
        trainingCount: number;
        eventCount: number;
        documentCount: number;
        taskCount: number;
    };
} | undefined>;

export type ListNotificationsResult = Promise<{
    items: {
        message: string;
        id: number;
        createdAt: Date;
        userId: string;
        organizationId: string;
        read: boolean;
    }[];
    total: number;
    unreadCount: number;
}>;

export type CreateNotificationResult = Promise<{
    message: string;
    id: number;
    createdAt: Date;
    userId: string;
    organizationId: string;
    read: boolean;
}>;

export type MarkAllNotificationsReadResult = Promise<import("@prisma/client").Prisma.BatchPayload>;

export type MarkNotificationReadResult = Promise<{
    message: string;
    id: number;
    createdAt: Date;
    userId: string;
    organizationId: string;
    read: boolean;
} | null>;

export type DeleteNotificationResult = Promise<boolean>;

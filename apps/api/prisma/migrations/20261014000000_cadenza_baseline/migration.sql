-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "CadenzaStaff" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "staffType" TEXT NOT NULL DEFAULT 'STAFF',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaCustomer" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaInstructor" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaInstructor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaInstructorAvailability" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaInstructorAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaInstructorBlock" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaInstructorBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaRoom" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "roomType" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "rentalRate" DECIMAL(19,4),
    "rentalDurationHours" INTEGER NOT NULL DEFAULT 2,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaRoomCourse" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CadenzaRoomCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaRoomBooking" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(19,4) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'FOR_APPROVAL',
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaRoomBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaLessonPackage" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(19,4) NOT NULL,
    "numberOfSessions" INTEGER NOT NULL,
    "sessionDurationMinutes" INTEGER NOT NULL DEFAULT 60,
    "sessionsPerWeek" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaLessonPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaEnrollment" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "lessonPackageId" TEXT NOT NULL,
    "paymentObligationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'FOR_APPROVAL',
    "paymentExpiresAt" TIMESTAMP(3),
    "enrolledAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaLessonSession" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "instructorId" TEXT,
    "roomId" TEXT,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaLessonSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaAttendance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "markedByPersonId" TEXT,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "CadenzaAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaRescheduleRequest" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "requestedByPersonId" TEXT NOT NULL,
    "requestedStart" TIMESTAMP(3) NOT NULL,
    "requestedEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedByPersonId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaRescheduleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaCourse" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "packageId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "level" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaInstrumentType" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaInstrumentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaItemCategory" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaItemCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaCoursePackage" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CadenzaCoursePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaCourseMaterial" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "storageReference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaCourseMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaInstructorCourse" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaInstructorCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaAuditLog" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "personId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CadenzaAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaInstrument" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "itemCategoryId" TEXT,
    "resourceId" TEXT NOT NULL,
    "instrumentTypeId" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "rentalRate" DECIMAL(19,4),
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaInstrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaRentalPackage" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rentalRate" DECIMAL(19,4) NOT NULL,
    "rentalHours" INTEGER NOT NULL DEFAULT 8,
    "depositAmount" DECIMAL(19,4) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaRentalPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaRentalPackageItem" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "rentalPackageId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaRentalPackageItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaRental" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "rentalPackageId" TEXT,
    "rentalType" TEXT NOT NULL,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(19,4) NOT NULL,
    "refundableDeposit" DECIMAL(19,4) NOT NULL,
    "paymentObligationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'FOR_APPROVAL',
    "checkedOutAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaRental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenzaRentalItem" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaRentalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppMembershipRole" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "roleId" INTEGER NOT NULL,

    CONSTRAINT "AppMembershipRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppMembership" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentType" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "defaultCapacity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilitySchedule" (
    "id" TEXT NOT NULL,
    "appointmentTypeId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "slotDurationMinutes" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilitySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentSlot" (
    "id" TEXT NOT NULL,
    "appointmentTypeId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "bookedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "appointmentTypeId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "userId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "notes" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "checkedInAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "noShowAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalPolicy" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entityType" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalStep" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "approverType" TEXT NOT NULL,
    "approverValue" TEXT,
    "requiredCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalInstance" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "appId" TEXT,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "currentStepOrder" INTEGER NOT NULL DEFAULT 1,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "assigneeUserId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "actedByUserId" INTEGER,
    "actedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "App" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "App_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" INTEGER,
    "appId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseParticipant" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "roleKey" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseType" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseRecord" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "caseTypeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdByUserId" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseStatusHistory" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT,
    "changedByUserId" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dashboard" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dashboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardWidget" (
    "id" TEXT NOT NULL,
    "dashboardId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "permissionKey" TEXT,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardWidget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentType" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRequirement" (
    "id" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "formVersionId" TEXT,
    "workflowVersionId" TEXT,
    "fieldKey" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "allowedFileTypes" TEXT[],
    "maxSizeBytes" BIGINT,
    "condition" JSONB,
    "source" TEXT NOT NULL DEFAULT 'CLIENT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "appId" TEXT,
    "documentTypeId" TEXT,
    "ownerId" INTEGER,
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 'local',
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventOutbox" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "actorId" INTEGER,
    "payload" JSONB NOT NULL,
    "correlationId" TEXT NOT NULL,
    "causationId" TEXT,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotencyKey" TEXT,
    "processedAt" TIMESTAMP(3),
    "deadAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "leaseUntil" TIMESTAMP(3),
    "lockToken" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Form" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entityType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormVersion" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSection" (
    "id" TEXT NOT NULL,
    "formVersionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "visibility" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormField" (
    "id" TEXT NOT NULL,
    "formVersionId" TEXT NOT NULL,
    "sectionId" TEXT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" JSONB,
    "validation" JSONB,
    "visibility" JSONB,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormOption" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "FormOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "formVersionId" TEXT NOT NULL,
    "subjectType" TEXT,
    "subjectId" TEXT,
    "submittedByUserId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "values" JSONB NOT NULL,
    "validationErrors" JSONB,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "secretRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationEvent" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secretRef" TEXT,
    "events" TEXT[],
    "headers" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRule" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "entityType" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "conditions" JSONB NOT NULL,
    "templateId" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "recipientValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT,
    "templateId" TEXT,
    "notificationId" TEXT,
    "recipient" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "idempotencyKey" TEXT NOT NULL,
    "payload" JSONB,
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "destination" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentObligation" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "totalAmount" DECIMAL(19,4) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "method" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "providerReference" TEXT,
    "idempotencyKey" TEXT,
    "metadata" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRefund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "providerReference" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProviderEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "payloadHash" TEXT NOT NULL,
    "payload" JSONB,
    "errorMessage" TEXT,

    CONSTRAINT "PaymentProviderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "userId" INTEGER,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "suffix" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" JSONB,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementDefinition" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequirementDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseRequirement" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessRule" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "event" TEXT NOT NULL,
    "entityType" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaPolicy" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "workflowStepKey" TEXT,
    "durationSeconds" INTEGER NOT NULL,
    "warningSeconds" INTEGER,
    "escalationSeconds" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlaPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaInstance" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "warningAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3) NOT NULL,
    "escalatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlaInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "caseId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "assigneeUserId" INTEGER,
    "createdByUserId" INTEGER,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "authVersion" INTEGER NOT NULL DEFAULT 0,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAccount" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "appId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedByTokenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowVersion" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
    "workflowVersionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isInitial" BOOLEAN NOT NULL DEFAULT false,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTransition" (
    "id" TEXT NOT NULL,
    "workflowVersionId" TEXT NOT NULL,
    "fromStepId" TEXT NOT NULL,
    "toStepId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissionKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowInstance" (
    "id" TEXT NOT NULL,
    "workflowVersionId" TEXT NOT NULL,
    "currentStepId" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "startedByUserId" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WorkflowInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowHistory" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "fromStepId" TEXT,
    "toStepId" TEXT NOT NULL,
    "transitionId" TEXT,
    "actorId" INTEGER,
    "correlationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CadenzaStaff_appId_status_idx" ON "CadenzaStaff"("appId", "status");

-- CreateIndex
CREATE INDEX "CadenzaStaff_appId_staffType_status_idx" ON "CadenzaStaff"("appId", "staffType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaStaff_appId_personId_key" ON "CadenzaStaff"("appId", "personId");

-- CreateIndex
CREATE INDEX "CadenzaCustomer_appId_status_idx" ON "CadenzaCustomer"("appId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaCustomer_appId_personId_key" ON "CadenzaCustomer"("appId", "personId");

-- CreateIndex
CREATE INDEX "CadenzaInstructor_appId_status_idx" ON "CadenzaInstructor"("appId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaInstructor_appId_personId_key" ON "CadenzaInstructor"("appId", "personId");

-- CreateIndex
CREATE INDEX "CadenzaInstructorAvailability_appId_instructorId_dayOfWeek_idx" ON "CadenzaInstructorAvailability"("appId", "instructorId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaInstructorAvailability_appId_instructorId_dayOfWeek__key" ON "CadenzaInstructorAvailability"("appId", "instructorId", "dayOfWeek", "startMinute", "endMinute");

-- CreateIndex
CREATE INDEX "CadenzaInstructorBlock_appId_instructorId_startsAt_endsAt_idx" ON "CadenzaInstructorBlock"("appId", "instructorId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "CadenzaRoom_appId_roomType_status_idx" ON "CadenzaRoom"("appId", "roomType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaRoom_appId_resourceId_key" ON "CadenzaRoom"("appId", "resourceId");

-- CreateIndex
CREATE INDEX "CadenzaRoomCourse_appId_courseId_idx" ON "CadenzaRoomCourse"("appId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaRoomCourse_roomId_courseId_key" ON "CadenzaRoomCourse"("roomId", "courseId");

-- CreateIndex
CREATE INDEX "CadenzaRoomBooking_appId_roomId_scheduledStart_scheduledEnd_idx" ON "CadenzaRoomBooking"("appId", "roomId", "scheduledStart", "scheduledEnd");

-- CreateIndex
CREATE INDEX "CadenzaRoomBooking_appId_customerId_status_idx" ON "CadenzaRoomBooking"("appId", "customerId", "status");

-- CreateIndex
CREATE INDEX "CadenzaRoomBooking_appId_status_scheduledStart_idx" ON "CadenzaRoomBooking"("appId", "status", "scheduledStart");

-- CreateIndex
CREATE INDEX "CadenzaLessonPackage_appId_status_idx" ON "CadenzaLessonPackage"("appId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaLessonPackage_appId_name_key" ON "CadenzaLessonPackage"("appId", "name");

-- CreateIndex
CREATE INDEX "CadenzaEnrollment_appId_customerId_status_idx" ON "CadenzaEnrollment"("appId", "customerId", "status");

-- CreateIndex
CREATE INDEX "CadenzaEnrollment_appId_lessonPackageId_idx" ON "CadenzaEnrollment"("appId", "lessonPackageId");

-- CreateIndex
CREATE INDEX "CadenzaEnrollment_appId_status_paymentExpiresAt_idx" ON "CadenzaEnrollment"("appId", "status", "paymentExpiresAt");

-- CreateIndex
CREATE INDEX "CadenzaLessonSession_appId_scheduledStart_scheduledEnd_idx" ON "CadenzaLessonSession"("appId", "scheduledStart", "scheduledEnd");

-- CreateIndex
CREATE INDEX "CadenzaLessonSession_appId_instructorId_scheduledStart_idx" ON "CadenzaLessonSession"("appId", "instructorId", "scheduledStart");

-- CreateIndex
CREATE INDEX "CadenzaLessonSession_appId_roomId_scheduledStart_idx" ON "CadenzaLessonSession"("appId", "roomId", "scheduledStart");

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaAttendance_sessionId_key" ON "CadenzaAttendance"("sessionId");

-- CreateIndex
CREATE INDEX "CadenzaAttendance_markedByPersonId_idx" ON "CadenzaAttendance"("markedByPersonId");

-- CreateIndex
CREATE INDEX "CadenzaRescheduleRequest_appId_status_createdAt_idx" ON "CadenzaRescheduleRequest"("appId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "CadenzaRescheduleRequest_sessionId_idx" ON "CadenzaRescheduleRequest"("sessionId");

-- CreateIndex
CREATE INDEX "CadenzaRescheduleRequest_requestedByPersonId_idx" ON "CadenzaRescheduleRequest"("requestedByPersonId");

-- CreateIndex
CREATE INDEX "CadenzaRescheduleRequest_reviewedByPersonId_idx" ON "CadenzaRescheduleRequest"("reviewedByPersonId");

-- CreateIndex
CREATE INDEX "CadenzaCourse_appId_status_idx" ON "CadenzaCourse"("appId", "status");

-- CreateIndex
CREATE INDEX "CadenzaCourse_packageId_idx" ON "CadenzaCourse"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaCourse_packageId_name_key" ON "CadenzaCourse"("packageId", "name");

-- CreateIndex
CREATE INDEX "CadenzaInstrumentType_appId_status_idx" ON "CadenzaInstrumentType"("appId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaInstrumentType_appId_name_key" ON "CadenzaInstrumentType"("appId", "name");

-- CreateIndex
CREATE INDEX "CadenzaItemCategory_appId_status_idx" ON "CadenzaItemCategory"("appId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaItemCategory_appId_name_key" ON "CadenzaItemCategory"("appId", "name");

-- CreateIndex
CREATE INDEX "CadenzaCoursePackage_appId_packageId_idx" ON "CadenzaCoursePackage"("appId", "packageId");

-- CreateIndex
CREATE INDEX "CadenzaCoursePackage_appId_courseId_idx" ON "CadenzaCoursePackage"("appId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaCoursePackage_courseId_packageId_key" ON "CadenzaCoursePackage"("courseId", "packageId");

-- CreateIndex
CREATE INDEX "CadenzaCourseMaterial_courseId_idx" ON "CadenzaCourseMaterial"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaCourseMaterial_courseId_name_key" ON "CadenzaCourseMaterial"("courseId", "name");

-- CreateIndex
CREATE INDEX "CadenzaInstructorCourse_appId_courseId_status_idx" ON "CadenzaInstructorCourse"("appId", "courseId", "status");

-- CreateIndex
CREATE INDEX "CadenzaInstructorCourse_appId_instructorId_status_idx" ON "CadenzaInstructorCourse"("appId", "instructorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaInstructorCourse_appId_instructorId_courseId_key" ON "CadenzaInstructorCourse"("appId", "instructorId", "courseId");

-- CreateIndex
CREATE INDEX "CadenzaAuditLog_appId_createdAt_idx" ON "CadenzaAuditLog"("appId", "createdAt");

-- CreateIndex
CREATE INDEX "CadenzaAuditLog_appId_entityType_entityId_idx" ON "CadenzaAuditLog"("appId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "CadenzaAuditLog_appId_personId_idx" ON "CadenzaAuditLog"("appId", "personId");

-- CreateIndex
CREATE INDEX "CadenzaInstrument_appId_status_idx" ON "CadenzaInstrument"("appId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaInstrument_appId_resourceId_key" ON "CadenzaInstrument"("appId", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaInstrument_appId_serialNumber_key" ON "CadenzaInstrument"("appId", "serialNumber");

-- CreateIndex
CREATE INDEX "CadenzaRentalPackage_appId_status_idx" ON "CadenzaRentalPackage"("appId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaRentalPackage_appId_name_key" ON "CadenzaRentalPackage"("appId", "name");

-- CreateIndex
CREATE INDEX "CadenzaRentalPackageItem_appId_rentalPackageId_idx" ON "CadenzaRentalPackageItem"("appId", "rentalPackageId");

-- CreateIndex
CREATE INDEX "CadenzaRental_appId_scheduledStart_scheduledEnd_idx" ON "CadenzaRental"("appId", "scheduledStart", "scheduledEnd");

-- CreateIndex
CREATE INDEX "CadenzaRental_appId_customerId_status_idx" ON "CadenzaRental"("appId", "customerId", "status");

-- CreateIndex
CREATE INDEX "CadenzaRental_appId_rentalPackageId_idx" ON "CadenzaRental"("appId", "rentalPackageId");

-- CreateIndex
CREATE INDEX "CadenzaRentalItem_appId_rentalId_idx" ON "CadenzaRentalItem"("appId", "rentalId");

-- CreateIndex
CREATE INDEX "CadenzaRentalItem_appId_instrumentId_idx" ON "CadenzaRentalItem"("appId", "instrumentId");

-- CreateIndex
CREATE UNIQUE INDEX "CadenzaRentalItem_rentalId_instrumentId_key" ON "CadenzaRentalItem"("rentalId", "instrumentId");

-- CreateIndex
CREATE INDEX "AppMembershipRole_membershipId_idx" ON "AppMembershipRole"("membershipId");

-- CreateIndex
CREATE INDEX "AppMembershipRole_roleId_idx" ON "AppMembershipRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "AppMembershipRole_membershipId_roleId_key" ON "AppMembershipRole"("membershipId", "roleId");

-- CreateIndex
CREATE INDEX "AppMembership_userId_idx" ON "AppMembership"("userId");

-- CreateIndex
CREATE INDEX "AppMembership_appId_idx" ON "AppMembership"("appId");

-- CreateIndex
CREATE UNIQUE INDEX "AppMembership_appId_userId_key" ON "AppMembership"("appId", "userId");

-- CreateIndex
CREATE INDEX "AppointmentType_appId_idx" ON "AppointmentType"("appId");

-- CreateIndex
CREATE INDEX "AppointmentType_appId_isActive_idx" ON "AppointmentType"("appId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentType_appId_key_key" ON "AppointmentType"("appId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentType_id_appId_key" ON "AppointmentType"("id", "appId");

-- CreateIndex
CREATE INDEX "AvailabilitySchedule_appointmentTypeId_dayOfWeek_isActive_idx" ON "AvailabilitySchedule"("appointmentTypeId", "dayOfWeek", "isActive");

-- CreateIndex
CREATE INDEX "AppointmentSlot_startsAt_status_idx" ON "AppointmentSlot"("startsAt", "status");

-- CreateIndex
CREATE INDEX "AppointmentSlot_appointmentTypeId_startsAt_idx" ON "AppointmentSlot"("appointmentTypeId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentSlot_appointmentTypeId_startsAt_key" ON "AppointmentSlot"("appointmentTypeId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_appId_idx" ON "Appointment"("appId");

-- CreateIndex
CREATE INDEX "Appointment_appId_slotId_status_idx" ON "Appointment"("appId", "slotId", "status");

-- CreateIndex
CREATE INDEX "Appointment_appId_userId_createdAt_idx" ON "Appointment"("appId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "Appointment_appId_status_createdAt_idx" ON "Appointment"("appId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Appointment_appId_appointmentTypeId_status_idx" ON "Appointment"("appId", "appointmentTypeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_appId_referenceNumber_key" ON "Appointment"("appId", "referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_id_appId_key" ON "Appointment"("id", "appId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalPolicy_key_key" ON "ApprovalPolicy"("key");

-- CreateIndex
CREATE INDEX "ApprovalPolicy_entityType_active_priority_idx" ON "ApprovalPolicy"("entityType", "active", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalStep_policyId_stepOrder_key" ON "ApprovalStep"("policyId", "stepOrder");

-- CreateIndex
CREATE INDEX "ApprovalInstance_subjectType_subjectId_status_idx" ON "ApprovalInstance"("subjectType", "subjectId", "status");

-- CreateIndex
CREATE INDEX "ApprovalInstance_policyId_status_idx" ON "ApprovalInstance"("policyId", "status");

-- CreateIndex
CREATE INDEX "ApprovalInstance_appId_status_idx" ON "ApprovalInstance"("appId", "status");

-- CreateIndex
CREATE INDEX "ApprovalRequest_instanceId_status_idx" ON "ApprovalRequest"("instanceId", "status");

-- CreateIndex
CREATE INDEX "ApprovalRequest_assigneeUserId_status_idx" ON "ApprovalRequest"("assigneeUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "App_key_key" ON "App"("key");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_appId_createdAt_idx" ON "AuditLog"("appId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_appId_entityType_entityId_createdAt_idx" ON "AuditLog"("appId", "entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "CaseParticipant_caseId_roleKey_idx" ON "CaseParticipant"("caseId", "roleKey");

-- CreateIndex
CREATE INDEX "CaseParticipant_personId_idx" ON "CaseParticipant"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseParticipant_caseId_personId_roleKey_key" ON "CaseParticipant"("caseId", "personId", "roleKey");

-- CreateIndex
CREATE UNIQUE INDEX "CaseType_key_key" ON "CaseType"("key");

-- CreateIndex
CREATE INDEX "CaseType_isActive_idx" ON "CaseType"("isActive");

-- CreateIndex
CREATE INDEX "CaseRecord_appId_idx" ON "CaseRecord"("appId");

-- CreateIndex
CREATE INDEX "CaseRecord_appId_caseTypeId_status_idx" ON "CaseRecord"("appId", "caseTypeId", "status");

-- CreateIndex
CREATE INDEX "CaseRecord_appId_status_createdAt_idx" ON "CaseRecord"("appId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "CaseRecord_createdByUserId_idx" ON "CaseRecord"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseRecord_appId_caseNumber_key" ON "CaseRecord"("appId", "caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CaseRecord_id_appId_key" ON "CaseRecord"("id", "appId");

-- CreateIndex
CREATE INDEX "CaseStatusHistory_caseId_createdAt_idx" ON "CaseStatusHistory"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "CaseStatusHistory_changedByUserId_idx" ON "CaseStatusHistory"("changedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Dashboard_key_key" ON "Dashboard"("key");

-- CreateIndex
CREATE INDEX "DashboardWidget_dashboardId_sortOrder_idx" ON "DashboardWidget"("dashboardId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardWidget_dashboardId_key_key" ON "DashboardWidget"("dashboardId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentType_key_key" ON "DocumentType"("key");

-- CreateIndex
CREATE INDEX "DocumentRequirement_documentTypeId_idx" ON "DocumentRequirement"("documentTypeId");

-- CreateIndex
CREATE INDEX "DocumentRequirement_formVersionId_sortOrder_idx" ON "DocumentRequirement"("formVersionId", "sortOrder");

-- CreateIndex
CREATE INDEX "DocumentRequirement_workflowVersionId_sortOrder_idx" ON "DocumentRequirement"("workflowVersionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");

-- CreateIndex
CREATE INDEX "Document_appId_createdAt_idx" ON "Document"("appId", "createdAt");

-- CreateIndex
CREATE INDEX "Document_ownerId_createdAt_idx" ON "Document"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "Document_documentTypeId_idx" ON "Document"("documentTypeId");

-- CreateIndex
CREATE INDEX "Document_deletedAt_idx" ON "Document"("deletedAt");

-- CreateIndex
CREATE INDEX "Document_checksumSha256_idx" ON "Document"("checksumSha256");

-- CreateIndex
CREATE UNIQUE INDEX "EventOutbox_idempotencyKey_key" ON "EventOutbox"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EventOutbox_status_availableAt_createdAt_idx" ON "EventOutbox"("status", "availableAt", "createdAt");

-- CreateIndex
CREATE INDEX "EventOutbox_status_leaseUntil_idx" ON "EventOutbox"("status", "leaseUntil");

-- CreateIndex
CREATE INDEX "EventOutbox_status_deadAt_idx" ON "EventOutbox"("status", "deadAt");

-- CreateIndex
CREATE INDEX "EventOutbox_entityType_entityId_idx" ON "EventOutbox"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "EventOutbox_correlationId_idx" ON "EventOutbox"("correlationId");

-- CreateIndex
CREATE INDEX "Form_appId_idx" ON "Form"("appId");

-- CreateIndex
CREATE INDEX "Form_appId_isActive_idx" ON "Form"("appId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Form_appId_key_key" ON "Form"("appId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Form_id_appId_key" ON "Form"("id", "appId");

-- CreateIndex
CREATE INDEX "FormVersion_formId_status_idx" ON "FormVersion"("formId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FormVersion_formId_version_key" ON "FormVersion"("formId", "version");

-- CreateIndex
CREATE INDEX "FormSection_formVersionId_sortOrder_idx" ON "FormSection"("formVersionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "FormSection_formVersionId_key_key" ON "FormSection"("formVersionId", "key");

-- CreateIndex
CREATE INDEX "FormField_formVersionId_sortOrder_idx" ON "FormField"("formVersionId", "sortOrder");

-- CreateIndex
CREATE INDEX "FormField_sectionId_sortOrder_idx" ON "FormField"("sectionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "FormField_formVersionId_key_key" ON "FormField"("formVersionId", "key");

-- CreateIndex
CREATE INDEX "FormOption_fieldId_sortOrder_idx" ON "FormOption"("fieldId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "FormOption_fieldId_value_key" ON "FormOption"("fieldId", "value");

-- CreateIndex
CREATE INDEX "FormSubmission_formVersionId_status_idx" ON "FormSubmission"("formVersionId", "status");

-- CreateIndex
CREATE INDEX "FormSubmission_subjectType_subjectId_idx" ON "FormSubmission"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "FormSubmission_submittedByUserId_createdAt_idx" ON "FormSubmission"("submittedByUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_key_key" ON "Integration"("key");

-- CreateIndex
CREATE INDEX "Integration_type_active_idx" ON "Integration"("type", "active");

-- CreateIndex
CREATE INDEX "IntegrationEvent_event_active_idx" ON "IntegrationEvent"("event", "active");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationEvent_integrationId_event_key" ON "IntegrationEvent"("integrationId", "event");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEndpoint_key_key" ON "WebhookEndpoint"("key");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_active_idx" ON "WebhookEndpoint"("active");

-- CreateIndex
CREATE INDEX "WebhookDelivery_status_nextAttemptAt_idx" ON "WebhookDelivery"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "WebhookDelivery_endpointId_createdAt_idx" ON "WebhookDelivery"("endpointId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_key_key" ON "NotificationTemplate"("key");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRule_key_key" ON "NotificationRule"("key");

-- CreateIndex
CREATE INDEX "NotificationRule_event_active_priority_idx" ON "NotificationRule"("event", "active", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDelivery_idempotencyKey_key" ON "NotificationDelivery"("idempotencyKey");

-- CreateIndex
CREATE INDEX "NotificationDelivery_status_createdAt_idx" ON "NotificationDelivery"("status", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_recipient_createdAt_idx" ON "NotificationDelivery"("recipient", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_notificationId_channel_idx" ON "NotificationDelivery"("notificationId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_idempotencyKey_key" ON "Notification"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_enabled_idx" ON "NotificationPreference"("userId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_channel_key" ON "NotificationPreference"("userId", "channel");

-- CreateIndex
CREATE INDEX "PaymentObligation_appId_status_createdAt_idx" ON "PaymentObligation"("appId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentObligation_appId_referenceType_referenceId_idx" ON "PaymentObligation"("appId", "referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentObligation_appId_referenceType_referenceId_key" ON "PaymentObligation"("appId", "referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_obligationId_status_createdAt_idx" ON "Payment"("obligationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_provider_providerReference_idx" ON "Payment"("provider", "providerReference");

-- CreateIndex
CREATE INDEX "PaymentRefund_paymentId_status_createdAt_idx" ON "PaymentRefund"("paymentId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentProviderEvent_provider_receivedAt_idx" ON "PaymentProviderEvent"("provider", "receivedAt");

-- CreateIndex
CREATE INDEX "PaymentProviderEvent_status_receivedAt_idx" ON "PaymentProviderEvent"("status", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProviderEvent_provider_eventId_eventType_key" ON "PaymentProviderEvent"("provider", "eventId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "Person_userId_key" ON "Person"("userId");

-- CreateIndex
CREATE INDEX "Person_lastName_firstName_idx" ON "Person"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Person_email_idx" ON "Person"("email");

-- CreateIndex
CREATE INDEX "Person_isActive_idx" ON "Person"("isActive");

-- CreateIndex
CREATE INDEX "RequirementDefinition_appId_idx" ON "RequirementDefinition"("appId");

-- CreateIndex
CREATE INDEX "RequirementDefinition_appId_isActive_idx" ON "RequirementDefinition"("appId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementDefinition_appId_key_key" ON "RequirementDefinition"("appId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementDefinition_id_appId_key" ON "RequirementDefinition"("id", "appId");

-- CreateIndex
CREATE INDEX "CaseRequirement_caseId_status_idx" ON "CaseRequirement"("caseId", "status");

-- CreateIndex
CREATE INDEX "CaseRequirement_requirementId_idx" ON "CaseRequirement"("requirementId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseRequirement_caseId_requirementId_key" ON "CaseRequirement"("caseId", "requirementId");

-- CreateIndex
CREATE INDEX "Resource_appId_status_idx" ON "Resource"("appId", "status");

-- CreateIndex
CREATE INDEX "Resource_appId_type_idx" ON "Resource"("appId", "type");

-- CreateIndex
CREATE INDEX "Resource_appId_name_idx" ON "Resource"("appId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_appId_key_key" ON "Resource"("appId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessRule_key_key" ON "BusinessRule"("key");

-- CreateIndex
CREATE INDEX "BusinessRule_event_active_priority_idx" ON "BusinessRule"("event", "active", "priority");

-- CreateIndex
CREATE INDEX "BusinessRule_entityType_event_idx" ON "BusinessRule"("entityType", "event");

-- CreateIndex
CREATE UNIQUE INDEX "SlaPolicy_key_key" ON "SlaPolicy"("key");

-- CreateIndex
CREATE INDEX "SlaPolicy_entityType_active_idx" ON "SlaPolicy"("entityType", "active");

-- CreateIndex
CREATE INDEX "SlaInstance_subjectType_subjectId_status_idx" ON "SlaInstance"("subjectType", "subjectId", "status");

-- CreateIndex
CREATE INDEX "SlaInstance_status_dueAt_idx" ON "SlaInstance"("status", "dueAt");

-- CreateIndex
CREATE INDEX "SlaInstance_status_warningAt_idx" ON "SlaInstance"("status", "warningAt");

-- CreateIndex
CREATE INDEX "Task_appId_idx" ON "Task"("appId");

-- CreateIndex
CREATE INDEX "Task_appId_caseId_status_idx" ON "Task"("appId", "caseId", "status");

-- CreateIndex
CREATE INDEX "Task_appId_assigneeUserId_status_idx" ON "Task"("appId", "assigneeUserId", "status");

-- CreateIndex
CREATE INDEX "Task_appId_status_dueAt_idx" ON "Task"("appId", "status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "OAuthAccount_userId_idx" ON "OAuthAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccount_provider_providerAccountId_key" ON "OAuthAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "Role_appId_idx" ON "Role"("appId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_appId_name_key" ON "Role"("appId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Module_key_key" ON "Module"("key");

-- CreateIndex
CREATE INDEX "Permission_moduleId_idx" ON "Permission"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_moduleId_action_key" ON "Permission"("moduleId", "action");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_replacedByTokenId_key" ON "RefreshToken"("replacedByTokenId");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "RefreshToken_revokedAt_idx" ON "RefreshToken"("revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_usedAt_idx" ON "PasswordResetToken"("usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Workflow_key_key" ON "Workflow"("key");

-- CreateIndex
CREATE INDEX "WorkflowVersion_workflowId_status_idx" ON "WorkflowVersion"("workflowId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowVersion_workflowId_version_key" ON "WorkflowVersion"("workflowId", "version");

-- CreateIndex
CREATE INDEX "WorkflowStep_workflowVersionId_sortOrder_idx" ON "WorkflowStep"("workflowVersionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStep_workflowVersionId_key_key" ON "WorkflowStep"("workflowVersionId", "key");

-- CreateIndex
CREATE INDEX "WorkflowTransition_fromStepId_idx" ON "WorkflowTransition"("fromStepId");

-- CreateIndex
CREATE INDEX "WorkflowTransition_toStepId_idx" ON "WorkflowTransition"("toStepId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowTransition_workflowVersionId_key_key" ON "WorkflowTransition"("workflowVersionId", "key");

-- CreateIndex
CREATE INDEX "WorkflowInstance_subjectType_subjectId_idx" ON "WorkflowInstance"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "WorkflowInstance_workflowVersionId_idx" ON "WorkflowInstance"("workflowVersionId");

-- CreateIndex
CREATE INDEX "WorkflowInstance_currentStepId_idx" ON "WorkflowInstance"("currentStepId");

-- CreateIndex
CREATE INDEX "WorkflowHistory_instanceId_createdAt_idx" ON "WorkflowHistory"("instanceId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkflowHistory_actorId_idx" ON "WorkflowHistory"("actorId");

-- CreateIndex
CREATE INDEX "WorkflowHistory_correlationId_idx" ON "WorkflowHistory"("correlationId");

-- AddForeignKey
ALTER TABLE "CadenzaStaff" ADD CONSTRAINT "CadenzaStaff_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaStaff" ADD CONSTRAINT "CadenzaStaff_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaCustomer" ADD CONSTRAINT "CadenzaCustomer_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaCustomer" ADD CONSTRAINT "CadenzaCustomer_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaInstructor" ADD CONSTRAINT "CadenzaInstructor_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaInstructor" ADD CONSTRAINT "CadenzaInstructor_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaInstructorAvailability" ADD CONSTRAINT "CadenzaInstructorAvailability_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaInstructorAvailability" ADD CONSTRAINT "CadenzaInstructorAvailability_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "CadenzaInstructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaInstructorBlock" ADD CONSTRAINT "CadenzaInstructorBlock_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaInstructorBlock" ADD CONSTRAINT "CadenzaInstructorBlock_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "CadenzaInstructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRoom" ADD CONSTRAINT "CadenzaRoom_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRoomCourse" ADD CONSTRAINT "CadenzaRoomCourse_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRoomCourse" ADD CONSTRAINT "CadenzaRoomCourse_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "CadenzaRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRoomCourse" ADD CONSTRAINT "CadenzaRoomCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "CadenzaCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRoomBooking" ADD CONSTRAINT "CadenzaRoomBooking_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRoomBooking" ADD CONSTRAINT "CadenzaRoomBooking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CadenzaCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRoomBooking" ADD CONSTRAINT "CadenzaRoomBooking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "CadenzaRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaLessonPackage" ADD CONSTRAINT "CadenzaLessonPackage_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaEnrollment" ADD CONSTRAINT "CadenzaEnrollment_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaEnrollment" ADD CONSTRAINT "CadenzaEnrollment_lessonPackageId_fkey" FOREIGN KEY ("lessonPackageId") REFERENCES "CadenzaLessonPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaEnrollment" ADD CONSTRAINT "CadenzaEnrollment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CadenzaCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaLessonSession" ADD CONSTRAINT "CadenzaLessonSession_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaLessonSession" ADD CONSTRAINT "CadenzaLessonSession_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "CadenzaEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaLessonSession" ADD CONSTRAINT "CadenzaLessonSession_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "CadenzaInstructor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaLessonSession" ADD CONSTRAINT "CadenzaLessonSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "CadenzaRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaAttendance" ADD CONSTRAINT "CadenzaAttendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CadenzaLessonSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaAttendance" ADD CONSTRAINT "CadenzaAttendance_markedByPersonId_fkey" FOREIGN KEY ("markedByPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRescheduleRequest" ADD CONSTRAINT "CadenzaRescheduleRequest_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRescheduleRequest" ADD CONSTRAINT "CadenzaRescheduleRequest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CadenzaLessonSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRescheduleRequest" ADD CONSTRAINT "CadenzaRescheduleRequest_requestedByPersonId_fkey" FOREIGN KEY ("requestedByPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRescheduleRequest" ADD CONSTRAINT "CadenzaRescheduleRequest_reviewedByPersonId_fkey" FOREIGN KEY ("reviewedByPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaCourse" ADD CONSTRAINT "CadenzaCourse_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaCourse" ADD CONSTRAINT "CadenzaCourse_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CadenzaLessonPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaInstrumentType" ADD CONSTRAINT "CadenzaInstrumentType_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaItemCategory" ADD CONSTRAINT "CadenzaItemCategory_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaCoursePackage" ADD CONSTRAINT "CadenzaCoursePackage_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaCoursePackage" ADD CONSTRAINT "CadenzaCoursePackage_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "CadenzaCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaCoursePackage" ADD CONSTRAINT "CadenzaCoursePackage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CadenzaLessonPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaCourseMaterial" ADD CONSTRAINT "CadenzaCourseMaterial_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "CadenzaCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaInstructorCourse" ADD CONSTRAINT "CadenzaInstructorCourse_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaInstructorCourse" ADD CONSTRAINT "CadenzaInstructorCourse_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "CadenzaInstructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaInstructorCourse" ADD CONSTRAINT "CadenzaInstructorCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "CadenzaCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaAuditLog" ADD CONSTRAINT "CadenzaAuditLog_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaAuditLog" ADD CONSTRAINT "CadenzaAuditLog_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaInstrument" ADD CONSTRAINT "CadenzaInstrument_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaInstrument" ADD CONSTRAINT "CadenzaInstrument_itemCategoryId_fkey" FOREIGN KEY ("itemCategoryId") REFERENCES "CadenzaItemCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaInstrument" ADD CONSTRAINT "CadenzaInstrument_instrumentTypeId_fkey" FOREIGN KEY ("instrumentTypeId") REFERENCES "CadenzaInstrumentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRentalPackage" ADD CONSTRAINT "CadenzaRentalPackage_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRentalPackageItem" ADD CONSTRAINT "CadenzaRentalPackageItem_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRentalPackageItem" ADD CONSTRAINT "CadenzaRentalPackageItem_rentalPackageId_fkey" FOREIGN KEY ("rentalPackageId") REFERENCES "CadenzaRentalPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRental" ADD CONSTRAINT "CadenzaRental_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRental" ADD CONSTRAINT "CadenzaRental_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CadenzaCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRental" ADD CONSTRAINT "CadenzaRental_rentalPackageId_fkey" FOREIGN KEY ("rentalPackageId") REFERENCES "CadenzaRentalPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRentalItem" ADD CONSTRAINT "CadenzaRentalItem_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRentalItem" ADD CONSTRAINT "CadenzaRentalItem_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "CadenzaRental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRentalItem" ADD CONSTRAINT "CadenzaRentalItem_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "CadenzaInstrument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppMembershipRole" ADD CONSTRAINT "AppMembershipRole_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "AppMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppMembershipRole" ADD CONSTRAINT "AppMembershipRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppMembership" ADD CONSTRAINT "AppMembership_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppMembership" ADD CONSTRAINT "AppMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentType" ADD CONSTRAINT "AppointmentType_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySchedule" ADD CONSTRAINT "AvailabilitySchedule_appointmentTypeId_fkey" FOREIGN KEY ("appointmentTypeId") REFERENCES "AppointmentType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentSlot" ADD CONSTRAINT "AppointmentSlot_appointmentTypeId_fkey" FOREIGN KEY ("appointmentTypeId") REFERENCES "AppointmentType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentSlot" ADD CONSTRAINT "AppointmentSlot_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "AvailabilitySchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_appointmentTypeId_fkey" FOREIGN KEY ("appointmentTypeId") REFERENCES "AppointmentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "AppointmentSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "ApprovalPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalInstance" ADD CONSTRAINT "ApprovalInstance_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "ApprovalPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalInstance" ADD CONSTRAINT "ApprovalInstance_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "ApprovalInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ApprovalStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_actedByUserId_fkey" FOREIGN KEY ("actedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseParticipant" ADD CONSTRAINT "CaseParticipant_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CaseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseParticipant" ADD CONSTRAINT "CaseParticipant_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseRecord" ADD CONSTRAINT "CaseRecord_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseRecord" ADD CONSTRAINT "CaseRecord_caseTypeId_fkey" FOREIGN KEY ("caseTypeId") REFERENCES "CaseType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseRecord" ADD CONSTRAINT "CaseRecord_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStatusHistory" ADD CONSTRAINT "CaseStatusHistory_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CaseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStatusHistory" ADD CONSTRAINT "CaseStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardWidget" ADD CONSTRAINT "DashboardWidget_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "Dashboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequirement" ADD CONSTRAINT "DocumentRequirement_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequirement" ADD CONSTRAINT "DocumentRequirement_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "FormVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequirement" ADD CONSTRAINT "DocumentRequirement_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "WorkflowVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormVersion" ADD CONSTRAINT "FormVersion_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSection" ADD CONSTRAINT "FormSection_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "FormVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "FormVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "FormSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormOption" ADD CONSTRAINT "FormOption_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "FormField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "FormVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationEvent" ADD CONSTRAINT "IntegrationEvent_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRule" ADD CONSTRAINT "NotificationRule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "NotificationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "PaymentObligation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementDefinition" ADD CONSTRAINT "RequirementDefinition_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseRequirement" ADD CONSTRAINT "CaseRequirement_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CaseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseRequirement" ADD CONSTRAINT "CaseRequirement_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "RequirementDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaInstance" ADD CONSTRAINT "SlaInstance_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "SlaPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_caseId_appId_fkey" FOREIGN KEY ("caseId", "appId") REFERENCES "CaseRecord"("id", "appId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_replacedByTokenId_fkey" FOREIGN KEY ("replacedByTokenId") REFERENCES "RefreshToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowVersion" ADD CONSTRAINT "WorkflowVersion_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "WorkflowVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTransition" ADD CONSTRAINT "WorkflowTransition_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "WorkflowVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTransition" ADD CONSTRAINT "WorkflowTransition_fromStepId_fkey" FOREIGN KEY ("fromStepId") REFERENCES "WorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTransition" ADD CONSTRAINT "WorkflowTransition_toStepId_fkey" FOREIGN KEY ("toStepId") REFERENCES "WorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "WorkflowVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_currentStepId_fkey" FOREIGN KEY ("currentStepId") REFERENCES "WorkflowStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_startedByUserId_fkey" FOREIGN KEY ("startedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowHistory" ADD CONSTRAINT "WorkflowHistory_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WorkflowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowHistory" ADD CONSTRAINT "WorkflowHistory_fromStepId_fkey" FOREIGN KEY ("fromStepId") REFERENCES "WorkflowStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowHistory" ADD CONSTRAINT "WorkflowHistory_toStepId_fkey" FOREIGN KEY ("toStepId") REFERENCES "WorkflowStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowHistory" ADD CONSTRAINT "WorkflowHistory_transitionId_fkey" FOREIGN KEY ("transitionId") REFERENCES "WorkflowTransition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowHistory" ADD CONSTRAINT "WorkflowHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

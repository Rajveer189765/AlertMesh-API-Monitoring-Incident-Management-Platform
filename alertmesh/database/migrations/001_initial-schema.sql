CREATE EXTENSION IF NOT EXISTS pgcrypto;


CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);



CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,

    owner_id UUID NOT NULL,

    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',

    public_status_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    public_status_slug VARCHAR(100) UNIQUE,

    escalation_timeout_minutes INTEGER NOT NULL DEFAULT 5,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_project_owner
        FOREIGN KEY (owner_id)
        REFERENCES users(id),

    CONSTRAINT check_escalation_timeout
        CHECK (escalation_timeout_minutes > 0)
);



CREATE TABLE project_members (
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,

    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',

    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (project_id, user_id),

    FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT check_project_member_role
        CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER'))
);



CREATE TABLE project_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL,

    email VARCHAR(255) NOT NULL,

    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',

    token_hash TEXT NOT NULL,

    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,

    invited_by_user_id UUID NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    FOREIGN KEY (invited_by_user_id)
        REFERENCES users(id),

    CONSTRAINT check_invitation_role
        CHECK (role IN ('ADMIN', 'MEMBER'))
);



CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL,

    name VARCHAR(100) NOT NULL,
    description TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_service_name_per_project
        UNIQUE (project_id, name)
);



CREATE TABLE monitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    service_id UUID NOT NULL,

    name VARCHAR(100) NOT NULL,
    url TEXT NOT NULL,

    method VARCHAR(10) NOT NULL DEFAULT 'GET',

    expected_status_code INTEGER NOT NULL DEFAULT 200,

    timeout_ms INTEGER NOT NULL DEFAULT 5000,

    interval_seconds INTEGER NOT NULL DEFAULT 60,

    failure_threshold INTEGER NOT NULL DEFAULT 3,
    recovery_threshold INTEGER NOT NULL DEFAULT 2,

    enabled BOOLEAN NOT NULL DEFAULT TRUE,

    current_status VARCHAR(20) NOT NULL DEFAULT 'HEALTHY',

    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    consecutive_successes INTEGER NOT NULL DEFAULT 0,

    last_checked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (service_id)
        REFERENCES services(id)
        ON DELETE CASCADE,

    CONSTRAINT check_monitor_method
        CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),

    CONSTRAINT check_status_code
        CHECK (expected_status_code BETWEEN 100 AND 599),

    CONSTRAINT check_timeout
        CHECK (timeout_ms > 0),

    CONSTRAINT check_interval
        CHECK (interval_seconds > 0),

    CONSTRAINT check_failure_threshold
        CHECK (failure_threshold > 0),

    CONSTRAINT check_recovery_threshold
        CHECK (recovery_threshold > 0),

    CONSTRAINT check_monitor_status
        CHECK (current_status IN ('HEALTHY', 'DEGRADED', 'DOWN')),

    CONSTRAINT check_consecutive_failures
        CHECK (consecutive_failures >= 0),

    CONSTRAINT check_consecutive_successes
        CHECK (consecutive_successes >= 0)
);



CREATE TABLE monitor_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    monitor_id UUID NOT NULL,

    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    success BOOLEAN NOT NULL,

    status_code INTEGER,

    response_time_ms INTEGER,

    error_type VARCHAR(100),
    error_message TEXT,

    FOREIGN KEY (monitor_id)
        REFERENCES monitors(id)
        ON DELETE CASCADE,

    CONSTRAINT check_response_time
        CHECK (
            response_time_ms IS NULL
            OR response_time_ms >= 0
        ),

    CONSTRAINT check_check_status_code
        CHECK (
            status_code IS NULL
            OR status_code BETWEEN 100 AND 599
        )
);



CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL,
    monitor_id UUID NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',

    title VARCHAR(255) NOT NULL,

    assigned_to_user_id UUID,

    escalation_level INTEGER NOT NULL DEFAULT 1,

    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    acknowledged_at TIMESTAMPTZ,

    resolved_at TIMESTAMPTZ,

    resolved_by_user_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    FOREIGN KEY (monitor_id)
        REFERENCES monitors(id)
        ON DELETE CASCADE,

    FOREIGN KEY (assigned_to_user_id)
        REFERENCES users(id),

    FOREIGN KEY (resolved_by_user_id)
        REFERENCES users(id),

    CONSTRAINT check_incident_status
        CHECK (
            status IN (
                'OPEN',
                'ACKNOWLEDGED',
                'INVESTIGATING',
                'RESOLVED'
            )
        ),

    CONSTRAINT check_escalation_level
        CHECK (escalation_level >= 1)
);



CREATE TABLE incident_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    incident_id UUID NOT NULL,

    actor_user_id UUID,

    event_type VARCHAR(30) NOT NULL,

    message TEXT,

    metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE CASCADE,

    FOREIGN KEY (actor_user_id)
        REFERENCES users(id),

    CONSTRAINT check_event_type
        CHECK (
            event_type IN (
                'CREATED',
                'ASSIGNED',
                'ACKNOWLEDGED',
                'INVESTIGATING',
                'ESCALATED',
                'RESOLVED',
                'REOPENED'
            )
        )
);



CREATE TABLE on_call_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL,
    user_id UUID NOT NULL,

    day_of_week INTEGER NOT NULL,

    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    priority INTEGER NOT NULL DEFAULT 1,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT check_day_of_week
        CHECK (day_of_week BETWEEN 0 AND 6),

    CONSTRAINT check_priority
        CHECK (priority >= 1)
);



CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL,
    user_id UUID NOT NULL,

    incident_id UUID,

    channel VARCHAR(20) NOT NULL,

    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    read_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,

    error_message TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE SET NULL,

    CONSTRAINT check_notification_channel
        CHECK (channel IN ('IN_APP', 'EMAIL')),

    CONSTRAINT check_notification_status
        CHECK (status IN ('PENDING', 'SENT', 'FAILED'))
);



CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL,

    name VARCHAR(100) NOT NULL,

    secret_hash TEXT NOT NULL,

    endpoint_token TEXT NOT NULL UNIQUE,

    enabled BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE
);



CREATE INDEX idx_project_members_user
ON project_members(user_id);

CREATE INDEX idx_services_project
ON services(project_id);

CREATE INDEX idx_monitors_service
ON monitors(service_id);

CREATE INDEX idx_monitors_enabled
ON monitors(enabled);

CREATE INDEX idx_monitor_checks_monitor_checked
ON monitor_checks(monitor_id, checked_at DESC);

CREATE INDEX idx_incidents_project_status_created
ON incidents(project_id, status, created_at DESC);

CREATE INDEX idx_incidents_monitor_status
ON incidents(monitor_id, status);

CREATE INDEX idx_incident_events_incident_created
ON incident_events(incident_id, created_at);

CREATE INDEX idx_on_call_project_day
ON on_call_schedules(project_id, day_of_week, priority);

CREATE INDEX idx_notifications_user_read
ON notifications(user_id, read_at);

CREATE INDEX idx_notifications_incident
ON notifications(incident_id);
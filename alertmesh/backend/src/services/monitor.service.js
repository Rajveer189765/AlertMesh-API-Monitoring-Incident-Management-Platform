const pool = require("../config/db");

const createMonitor = async (userId, monitorData) => {
    const {
        serviceId,
        name,
        url,
        method,
        expectedStatusCode,
        timeoutMs,
        intervalSeconds,
        failureThreshold,
        recoveryThreshold
    } = monitorData;

    // Verify that the authenticated user owns or belongs to
    // the project containing this service.
    const accessResult = await pool.query(
        `SELECT s.id
         FROM services s
         JOIN projects p ON p.id = s.project_id
         LEFT JOIN project_members pm
             ON pm.project_id = p.id
            AND pm.user_id = $1
         WHERE s.id = $2
           AND (p.owner_id = $1 OR pm.user_id = $1)`,
        [userId, serviceId]
    );

    if (accessResult.rows.length === 0) {
        const error = new Error("Service not found or access denied");
        error.statusCode = 404;
        throw error;
    }

    const result = await pool.query(
        `INSERT INTO monitors (
            service_id,
            name,
            url,
            method,
            expected_status_code,
            timeout_ms,
            interval_seconds,
            failure_threshold,
            recovery_threshold
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
            serviceId,
            name,
            url,
            method,
            expectedStatusCode,
            timeoutMs,
            intervalSeconds,
            failureThreshold,
            recoveryThreshold
        ]
    );

    return result.rows[0];
};

const getMonitors = async (userId) => {
    const result = await pool.query(
        `SELECT m.*
         FROM monitors m
         JOIN services s ON s.id = m.service_id
         JOIN projects p ON p.id = s.project_id
         WHERE p.owner_id = $1
            OR EXISTS (
                SELECT 1
                FROM project_members pm
                WHERE pm.project_id = p.id
                  AND pm.user_id = $1
            )
         ORDER BY m.created_at DESC`,
        [userId]
    );

    return result.rows;
};

const getMonitorById = async (userId, monitorId) => {
    const result = await pool.query(
        `SELECT m.*
         FROM monitors m
         JOIN services s ON s.id = m.service_id
         JOIN projects p ON p.id = s.project_id
         WHERE m.id = $1
           AND (
               p.owner_id = $2
               OR EXISTS (
                   SELECT 1
                   FROM project_members pm
                   WHERE pm.project_id = p.id
                     AND pm.user_id = $2
               )
           )`,
        [monitorId, userId]
    );

    if (result.rows.length === 0) {
        const error = new Error("Monitor not found");
        error.statusCode = 404;
        throw error;
    }

    return result.rows[0];
};

const updateMonitor = async (userId, monitorId, monitorData) => {
    const {
        name,
        url,
        method,
        expectedStatusCode,
        timeoutMs,
        intervalSeconds,
        failureThreshold,
        recoveryThreshold,
        enabled
    } = monitorData;

    const accessResult = await pool.query(
        `SELECT m.id
         FROM monitors m
         JOIN services s ON s.id = m.service_id
         JOIN projects p ON p.id = s.project_id
         LEFT JOIN project_members pm
            ON pm.project_id = p.id
            AND pm.user_id = $1
         WHERE m.id = $2
           AND (p.owner_id = $1 OR pm.user_id = $1)`,
        [userId, monitorId]
    );

    if (accessResult.rows.length === 0) {
        const error = new Error("Monitor not found");
        error.statusCode = 404;
        throw error;
    }

    const result = await pool.query(
        `UPDATE monitors
         SET
            name = COALESCE($1, name),
            url = COALESCE($2, url),
            method = COALESCE($3, method),
            expected_status_code = COALESCE($4, expected_status_code),
            timeout_ms = COALESCE($5, timeout_ms),
            interval_seconds = COALESCE($6, interval_seconds),
            failure_threshold = COALESCE($7, failure_threshold),
            recovery_threshold = COALESCE($8, recovery_threshold),
            enabled = COALESCE($9, enabled),
            updated_at = NOW()
         WHERE id = $10
         RETURNING *`,
        [
            name ?? null,
            url ?? null,
            method ?? null,
            expectedStatusCode ?? null,
            timeoutMs ?? null,
            intervalSeconds ?? null,
            failureThreshold ?? null,
            recoveryThreshold ?? null,
            enabled ?? null,
            monitorId
        ]
    );

    return result.rows[0];
};

const deleteMonitor = async (userId, monitorId)=>{
    const result=await pool.query(
        `DELETE FROM monitors m
         USING services s, projects p
         WHERE m.id = $1
           AND s.id = m.service_id
           AND p.id = s.project_id
           AND (
               p.owner_id = $2
               OR EXISTS (
                   SELECT 1
                   FROM project_members pm
                   WHERE pm.project_id = p.id
                     AND pm.user_id = $2
               )
           )
         RETURNING m.*`,
         [monitorId, userId]
    );

    if(result.rows.length===0){
        const error = new Error("monitor not found");
        error.statusCode=404;
        throw error;
    }
    return result.rows[0];
}

module.exports = {
    createMonitor,
    getMonitors,
    getMonitorById,
    updateMonitor,
    deleteMonitor
};
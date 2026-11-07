const { createMonitor, getMonitors, getMonitorById, updateMonitor, deleteMonitor } = require("../services/monitor.service");
const { createMonitorSchema, updateMonitorSchema } = require("../validators/monitor.validator");

const create = async (req, res) => {
    const validation = createMonitorSchema.safeParse(req.body);

    if (!validation.success) {
        return res.status(400).json({
            success: false,
            message: "Invalid monitor data",
            errors: validation.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message
            }))
        });
    }

    try {
        const monitor = await createMonitor(
            req.user.id,
            validation.data
        );

        return res.status(201).json({
            success: true,
            message: "Monitor created successfully",
            monitor
        });
    } catch (error) {
        if (error.statusCode === 404) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        console.error("Create monitor error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};

const getAll = async (req, res) => {
    try {
        const monitors = await getMonitors(req.user.id);

        return res.status(200).json({
            success: true,
            count: monitors.length,
            monitors
        });
    } catch (error) {
        console.error("Get monitors error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};

const getById = async (req, res) => {
    try {
        const monitor = await getMonitorById(
            req.user.id,
            req.params.monitorId
        );

        return res.status(200).json({
            success: true,
            monitor
        });

    } catch (error) {
        if (error.statusCode === 404) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        console.error("Get monitor by ID error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};

const update = async (req, res) => {
    const validation = updateMonitorSchema.safeParse(req.body);

    if (!validation.success) {
        return res.status(400).json({
            success: false,
            message: "Invalid monitor data",
            errors: validation.error.issues.map(issue => ({
                field: issue.path.join("."),
                message: issue.message
            }))
        });
    }

    try {
        const monitor = await updateMonitor(
            req.user.id,
            req.params.monitorId,
            validation.data
        );

        return res.status(200).json({
            success: true,
            message: "Monitor updated successfully",
            monitor
        });

    } catch (error) {
        if (error.statusCode === 404) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        console.error("Update monitor error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};

const remove=async(req, res)=>{
    try{
        const monitor = await deleteMonitor(
            req.user.id,
            req.params.monitorId
        );
        return res.status(200).json({
            success: true,
            message: "Monitor deleted successfully",
            monitor
        });

    } catch(error){
        if(error.statusCode===404){
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        console.error("Delete monitor error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
}

module.exports = {
    create,
    getAll,
    getById,
    update,
    remove
};
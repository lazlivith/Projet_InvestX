const activityService = require('../services/activityService');

exports.getActivity = async (req, res) => {
    try {
        const userId = req.user.id;
        const activity = await activityService.getUserActivity(userId);

        res.json({
            success: true,
            data: activity
        });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la récupération de l'activité." });
    }
};
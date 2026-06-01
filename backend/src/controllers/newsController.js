const sentimentService = require('../services/sentimentService');

const analyzeNewsMetrics = async (req, res) => {
    try {
        const { text, ticker } = req.body;

        if (!text) {
            return res.status(400).json({ error: "Le champ texte est requis pour l'analyse NLP." });
        }

        // Exécution de notre chaîne de traitement hybride
        const analysis = await sentimentService.analyzeSentiment(text);

        return res.status(200).json({
            ticker: ticker ? ticker.toUpperCase() : 'GENERAL',
            timestamp: new Date(),
            analysis
        });

    } catch (error) {
        return res.status(500).json({ 
            error: "Erreur interne lors du traitement du signal NLP.", 
            details: error.message 
        });
    }
};

module.exports = {
    analyzeNewsMetrics
};

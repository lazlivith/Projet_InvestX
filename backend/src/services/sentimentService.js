const vader = require('vader-sentiment');

// Liste locale de Stop-Words financiers pour le nettoyage initial (NLP basique)
const STOP_WORDS = new Set([
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 
    'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'the', 'and', 'a', 'of', 'to'
]);

class SentimentService {
    /**
     * Pipeline NLP Local : Nettoyage et Tokenisation de l'article de presse
     */
    cleanText(text) {
        if (!text) return "";
        
        // 1. Passage en minuscules et suppression de la ponctuation / caractères spéciaux
        const cleanRaw = text.toLowerCase().replace(/[^\w\s]/g, '');
        
        // 2. Tokenisation par mot et filtrage des Stop-Words
        const tokens = cleanRaw.split(/\s+/);
        const filteredTokens = tokens.filter(word => word && !STOP_WORDS.has(word));
        
        // 3. Reconstitution d'un corps de texte dense à forte valeur sémantique
        return filteredTokens.join(' ');
    }

    /**
     * Classification et calcul de la polarité financière via VADER (100% Local)
     * @param {string} rawArticle - Le texte brut de l'actualité boursière
     */
    async analyzeSentiment(rawArticle) {
        try {
            // Étape NLP locale obligatoire
            const processedText = this.cleanText(rawArticle);

            if (!processedText || processedText.length < 10) {
                return { sentiment: 'NEUTRAL', score: 0.00 };
            }

            // Utilisation de VADER pour une vectorisation et classification locale
            const intensity = vader.SentimentIntensityAnalyzer.polarity_scores(processedText);
            
            // intensity contient { pos, neu, neg, compound }
            // compound est un score normalisé entre -1 (très négatif) et +1 (très positif)
            const score = intensity.compound;
            
            let sentiment = 'NEUTRAL';
            if (score >= 0.05) {
                sentiment = 'BULLISH';
            } else if (score <= -0.05) {
                sentiment = 'BEARISH';
            }
            
            return {
                originalLength: rawArticle.length,
                cleanedTextSnippet: processedText.substring(0, 100) + '...',
                sentiment: sentiment,
                score: parseFloat(score.toFixed(2))
            };

        } catch (error) {
            console.error("❌ Erreur lors du calcul NLP Sentiment :", error.message);
            // Fallback de sécurité résilient
            return { sentiment: 'NEUTRAL', score: 0.00, error: true };
        }
    }
}

module.exports = new SentimentService();

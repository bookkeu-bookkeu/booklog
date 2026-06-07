"""
Compatibility wrapper for the cleaned sentiment predictor.

The original Colab notebook code has been moved into
ai.predictors.sentiment so Django can import and run it safely.
"""

from ai.predictors.sentiment import (  # noqa: F401
    analyze_review_sentiment,
    analyze_text_sentiment,
    fallback_review_sentiment_from_rating,
)

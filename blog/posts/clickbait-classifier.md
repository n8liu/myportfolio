# From TF-IDF to BERT: Lessons from Clickbait Classifier

## The Anatomy of Clickbait

Clickbait headlines are engineered to exploit cognitive curiosity gaps. Whether withholding crucial details (*"You won't believe what happened next..."*), leveraging exaggerated superlatives (*"The most mind-blowing discovery ever..."*), or using emotionally manipulative punctuation, clickbait thrives in the gray area between informative journalism and sensationalism.

During my machine learning work, I wanted to explore how well modern transformer architectures can differentiate authentic news headlines from manipulative clickbait compared to classical statistical NLP methods.

## The Baseline: TF-IDF + Logistic Regression

Before jumping into heavy deep learning models, establishing a solid baseline is essential. I started by training a standard TF-IDF (Term Frequency-Inverse Document Frequency) vectorizer paired with a regularized Logistic Regression classifier across unigrams and bigrams:

* **Strength:** Extremely fast training (< 2 seconds) and high interpretability via feature importance coefficients. Obvious buzzwords (like "SHOCKING", "UNBELIEVABLE", "THIS REASON") were quickly flagged with large positive weights.
* **Weakness:** Suffered from a total blindness to word order and syntax. Phrasing like *"Why Scientists Are Shocked by New Battery Data"* (legitimate report) versus *"You Will Be Shocked by This Trick"* (clickbait) received similar token representations.
* **Baseline Performance:** Achieved ~0.75 F1 score and 82% accuracy on the test set.

## Fine-Tuning BERT for Sequence Classification

To capture bidirectional context, sentence structure, and subtle semantic cues, I fine-tuned `bert-base-uncased` on a curated dataset of over 18,000 labeled social news headlines using PyTorch and HuggingFace Transformers.

```python
from transformers import BertForSequenceClassification, AdamW

model = BertForSequenceClassification.from_pretrained(
    'bert-base-uncased',
    num_labels=2,
    hidden_dropout_prob=0.3
)
optimizer = AdamW(model.parameters(), lr=2e-5, weight_decay=0.01)
```

Key training configurations included:

* **Learning Rate Warmup:** Linear warmup over the first 10% of training steps followed by cosine decay, preventing destructive gradient updates to pre-trained weights.
* **Dropout Regularization:** Set hidden dropout to 0.3 to prevent overfitting on specific recurring publisher keywords.
* **Stratified Split:** Evaluated on a strictly held-out 20% test partition with balanced positive/negative clickbait distributions.

## Results & Error Analysis

The fine-tuned BERT model reached **0.89 F1** and **91% accuracy** on the held-out test set, representing a massive **+0.14 F1 point improvement** over the baseline:

| Model | Precision | Recall | F1 Score | Accuracy |
| :--- | :--- | :--- | :--- | :--- |
| TF-IDF + Logistic Reg. | 0.78 | 0.72 | 0.75 | 82.1% |
| **BERT (Fine-Tuned)** | **0.90** | **0.88** | **0.89** | **91.4%** |

Examining misclassified examples revealed intriguing edge cases:

* **Satire and Parody:** Headlines from satirical outlets often mimic sensationalist structures while discussing real events, occasionally tripping up the classifier.
* **Question-Formatted Headlines:** Legitimate scientific inquiries formatted as questions (*"Can Solar Geoengineering Reverse Warming?"*) were sometimes flagged due to structural similarity to baiting questions.

## Key Takeaways

Fine-tuning pre-trained language models shines brightest when syntactic nuance and context outweigh raw keyword frequency. The jump in performance demonstrated that understanding *how* words are structured together is critical when classifying subjective linguistic phenomena like clickbait.

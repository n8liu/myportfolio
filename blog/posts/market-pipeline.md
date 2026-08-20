# Building an Event-Driven Market Pipeline with Vector Search

## The Noise in Financial Streams

In financial intelligence, timing is everything—but volume is the enemy. When a major company reports quarterly earnings, announces an executive departure, or faces a regulatory inquiry, hundreds of news syndicates, RSS feeds, and social accounts publish nearly identical headlines within seconds.

Traditional keyword-based filtering breaks down quickly here. Exact-string matching misses reworded headlines, while basic keyword alerts flood analysts with overwhelming duplicate noise. To solve this, I designed an event-driven streaming pipeline that ingests raw financial news, extracts structured entities on the fly, and uses high-dimensional vector search to deduplicate breaking market stories into unified events.

## Pipeline Architecture Overview

The system operates as an asynchronous, event-driven pipeline composed of three distinct stages:

* **Ingestion & Normalization:** Real-time streaming consumers pull raw news feeds, clean boilerplate markup, and normalize timestamps and author metadata.
* **Zero-Shot Entity Extraction:** Lightweight transformer models parse unstructured headline and body text to extract structured financial entities (tickers, monetary figures, sentiment indicators, and event categories).
* **Semantic Deduplication & Clustering:** Dense vector embeddings are generated for incoming articles and queried against a rolling vector index to cluster related stories into a single canonical event.

## Why Lexical Matching Fails: The Power of Vector Embeddings

Consider two headlines published two minutes apart:

> "Federal Reserve increases benchmark rate by 25 basis points amidst inflation concerns."
>
> "Fed hikes interest rates 0.25% as price pressures persist."

Lexical approaches like Levenshtein edit distance or BM25 struggle because the token overlap is minimal (e.g., "increases" vs. "hikes", "25 basis points" vs. "0.25%", "inflation concerns" vs. "price pressures").

By transforming each headline into a dense vector embedding, semantic concepts are mapped to nearby coordinates in vector space. Measuring cosine similarity between the incoming document embedding `u` and existing cluster centroids `v` enables the system to detect identical events regardless of vocabulary variation:

```python
# Computing cosine similarity in embedding space
similarity = np.dot(u, v) / (np.linalg.norm(u) * np.linalg.norm(v))
if similarity >= SIMILARITY_THRESHOLD:
    merge_into_event_cluster(incoming_article, cluster_id)
```

## Dynamic Rolling Window Clustering

Market news has strong temporal locality: two stories about rate hikes from today belong to the same event, but a rate hike from six months ago does not. The pipeline implements a time-decayed vector index that clusters incoming articles within a sliding 6-to-12-hour window.

When an incoming article scores above the similarity threshold with an existing cluster, it is attached as an additional source citation. The canonical event's aggregate sentiment, confidence score, and key entities update incrementally in real time.

## Key Takeaways & What's Next

Building this pipeline reinforced several core principles in data engineering:

* **Decouple Extraction from Indexing:** Asynchronous message queues between entity extraction and vector indexing prevent embedding generation bottlenecks from dropping incoming stream events.
* **Index Sharding by Ticker:** Pre-filtering vector search candidate spaces by extracted ticker symbols drastically reduces nearest-neighbor search latency.

Next steps include experimenting with quantization techniques to reduce vector memory footprint and implementing automated real-time alert generation via webhooks.
